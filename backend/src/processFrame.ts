import { config } from "./config.js";
import { enhanceFrame, RunpodError } from "./runpodClient.js";

/**
 * Result of processing a single frame.
 */
export interface ProcessedFrame {
  /** The enhanced frame bytes (or the original if we fell back). */
  buffer: Buffer;
  /** Timestamp passed through from the caller (ms or pts, your choice). */
  timestamp: number;
  /** True if RunPod enhanced it; false if we returned the original as fallback. */
  enhanced: boolean;
  /** Wall-clock time spent on this frame, in milliseconds. */
  latencyMs: number;
  /** Populated when enhancement failed and we fell back. */
  error?: string;
}

/* ----------------------------- Concurrency gate ---------------------------- */
/* A tiny semaphore so we never overwhelm the GPU with too many in-flight       */
/* frames. Backpressure: callers await a slot before hitting RunPod.            */

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < config.maxConcurrency) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function release(): void {
  active--;
  const next = waiters.shift();
  if (next) {
    active++;
    next();
  }
}

/* -------------------------------------------------------------------------- */

/**
 * Process one frame: send it to RunPod/ComfyUI for enhancement and return the
 * result. On failure, either falls back to the original frame (default) or
 * rethrows, depending on FALLBACK_TO_ORIGINAL.
 *
 * @param frameBuffer Raw encoded frame bytes (JPEG/PNG).
 * @param timestamp   Frame timestamp (ms or pts) used for ordering/telemetry.
 */
export async function processFrame(frameBuffer: Buffer, timestamp: number): Promise<ProcessedFrame> {
  const startedAt = Date.now();

  if (!frameBuffer || frameBuffer.length === 0) {
    throw new TypeError("processFrame: frameBuffer must be a non-empty Buffer");
  }

  await acquire();
  try {
    const enhanced = await enhanceFrame(frameBuffer, timestamp);
    return {
      buffer: enhanced,
      timestamp,
      enhanced: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    const message =
      err instanceof RunpodError
        ? `${err.message}${err.status ? ` [${err.status}]` : ""}`
        : err instanceof Error
          ? err.message
          : String(err);

    console.error(`[processFrame] enhancement failed @${timestamp}ms: ${message}`);

    if (config.fallbackToOriginal) {
      return {
        buffer: frameBuffer,
        timestamp,
        enhanced: false,
        latencyMs: Date.now() - startedAt,
        error: message,
      };
    }
    throw err;
  } finally {
    release();
  }
}
