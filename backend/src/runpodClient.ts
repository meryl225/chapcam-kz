import { request } from "undici";
import { config } from "./config.js";

/**
 * Thin client for RunPod. Supports two modes:
 *
 *  - "serverless": POST {baseUrl}/runsync with { input: { image, timestamp } }.
 *    Your handler is expected to return { output: { image: "<base64>" } }.
 *
 *  - "comfyui": POST {baseUrl}/prompt with a workflow that has the input image
 *    injected, then poll {baseUrl}/history/{id} until the result is ready.
 *    NOTE: the ComfyUI workflow graph is highly setup-specific, so this mode
 *    exposes a hook (buildComfyWorkflow) you should adapt to your own graph.
 */

export class RunpodError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "RunpodError";
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.runpod.apiKey) {
    headers["authorization"] = `Bearer ${config.runpod.apiKey}`;
  }
  return headers;
}

/**
 * Enhance a single frame and return the enhanced frame as a Buffer (JPEG/PNG bytes).
 */
export async function enhanceFrame(frame: Buffer, timestamp: number): Promise<Buffer> {
  if (config.runpod.mode === "serverless") {
    return enhanceServerless(frame, timestamp);
  }
  return enhanceComfyUI(frame, timestamp);
}

/* -------------------------------------------------------------------------- */
/* Serverless mode (/runsync)                                                  */
/* -------------------------------------------------------------------------- */

async function enhanceServerless(frame: Buffer, timestamp: number): Promise<Buffer> {
  const url = `${config.runpod.baseUrl}/runsync`;
  const body = JSON.stringify({
    input: {
      image: frame.toString("base64"),
      timestamp,
    },
  });

  const res = await request(url, {
    method: "POST",
    headers: authHeaders(),
    body,
    headersTimeout: config.runpod.timeoutMs,
    bodyTimeout: config.runpod.timeoutMs,
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const text = await res.body.text().catch(() => "");
    throw new RunpodError(`RunPod /runsync failed (${res.statusCode})`, res.statusCode, text);
  }

  const json = (await res.body.json()) as {
    status?: string;
    output?: { image?: string; images?: string[] };
    error?: unknown;
  };

  if (json.error) {
    throw new RunpodError("RunPod returned an error", res.statusCode, json.error);
  }

  const b64 = json.output?.image ?? json.output?.images?.[0];
  if (!b64) {
    throw new RunpodError("RunPod response did not contain an output image", res.statusCode, json);
  }

  return Buffer.from(stripDataUrl(b64), "base64");
}

/* -------------------------------------------------------------------------- */
/* ComfyUI mode (/prompt + /history polling)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Build the ComfyUI prompt graph for a given input image.
 * Adapt this to match the node IDs of YOUR exported workflow (API format).
 * The example below assumes a "LoadImageFromBase64"-style node with id "1".
 */
function buildComfyWorkflow(frameBase64: string): unknown {
  return {
    prompt: {
      "1": {
        class_type: "ETN_LoadImageBase64",
        inputs: { image: frameBase64 },
      },
      // ... your enhancement nodes here ...
      // The final SaveImage node id is referenced below when reading history.
    },
  };
}

async function enhanceComfyUI(frame: Buffer, _timestamp: number): Promise<Buffer> {
  const promptUrl = `${config.runpod.baseUrl}/prompt`;
  const workflow = buildComfyWorkflow(frame.toString("base64"));

  const submit = await request(promptUrl, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(workflow),
    headersTimeout: config.runpod.timeoutMs,
    bodyTimeout: config.runpod.timeoutMs,
  });

  if (submit.statusCode < 200 || submit.statusCode >= 300) {
    const text = await submit.body.text().catch(() => "");
    throw new RunpodError(`ComfyUI /prompt failed (${submit.statusCode})`, submit.statusCode, text);
  }

  const { prompt_id: promptId } = (await submit.body.json()) as { prompt_id?: string };
  if (!promptId) {
    throw new RunpodError("ComfyUI did not return a prompt_id", submit.statusCode);
  }

  // Poll history until the result is available or we time out.
  const deadline = Date.now() + config.runpod.timeoutMs;
  while (Date.now() < deadline) {
    const histRes = await request(`${config.runpod.baseUrl}/history/${promptId}`, {
      method: "GET",
      headers: authHeaders(),
    });

    if (histRes.statusCode === 200) {
      const history = (await histRes.body.json()) as Record<string, any>;
      const entry = history[promptId];
      const images: Array<{ filename: string; subfolder: string; type: string }> = entry
        ? Object.values(entry.outputs ?? {}).flatMap((o: any) => o.images ?? [])
        : [];

      if (images.length > 0) {
        const img = images[0];
        const viewUrl =
          `${config.runpod.baseUrl}/view?filename=${encodeURIComponent(img.filename)}` +
          `&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`;
        const viewRes = await request(viewUrl, { method: "GET", headers: authHeaders() });
        if (viewRes.statusCode === 200) {
          return Buffer.from(await viewRes.body.arrayBuffer());
        }
      }
    } else {
      await histRes.body.dump();
    }

    await sleep(150);
  }

  throw new RunpodError("ComfyUI result timed out", undefined);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function stripDataUrl(b64: string): string {
  const comma = b64.indexOf(",");
  return b64.startsWith("data:") && comma !== -1 ? b64.slice(comma + 1) : b64;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
