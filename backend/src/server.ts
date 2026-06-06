import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { processFrame } from "./processFrame.js";
import { extractFrames } from "./frameExtractor.js";

const app = express();

/* ------------------------------- Middleware ------------------------------- */

app.use(morgan("tiny"));

// Minimal CORS.
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowAll = config.allowedOrigins.includes("*");
  if (allowAll) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Accept raw binary bodies (images / video) up to 25MB per request.
app.use(express.raw({ type: ["image/*", "application/octet-stream"], limit: "25mb" }));

/* -------------------------------- Routes ---------------------------------- */

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    mode: config.runpod.mode,
    maxConcurrency: config.maxConcurrency,
    fallbackToOriginal: config.fallbackToOriginal,
    uptimeSec: Math.round(process.uptime()),
  });
});

/**
 * POST /frame
 * Body: raw JPEG/PNG bytes (Content-Type: image/jpeg or application/octet-stream)
 * Query: ?ts=<number>  optional timestamp
 * Returns: the enhanced JPEG bytes.
 */
app.post("/frame", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const frame = req.body as Buffer;
    if (!Buffer.isBuffer(frame) || frame.length === 0) {
      return res.status(400).json({ error: "Empty body. Send raw image bytes." });
    }
    const ts = Number.parseInt(String(req.query.ts ?? Date.now()), 10);
    const result = await processFrame(frame, ts);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("X-Frame-Enhanced", String(result.enhanced));
    res.setHeader("X-Frame-Latency-Ms", String(result.latencyMs));
    if (result.error) res.setHeader("X-Frame-Error", encodeURIComponent(result.error));
    res.end(result.buffer);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /stream
 * Body: a raw video stream (any ffmpeg-readable container/codec).
 * Query: ?fps=15&scale=1280:-1
 * Returns: multipart/x-mixed-replace MJPEG stream of enhanced frames,
 *          which can be consumed directly by an <img> tag or OBS browser source.
 */
app.post("/stream", async (req: Request, res: Response) => {
  const boundary = "chapcamframe";
  const fps = Number.parseInt(String(req.query.fps ?? 15), 10);
  const scale = req.query.scale ? String(req.query.scale) : undefined;

  res.writeHead(200, {
    "Content-Type": `multipart/x-mixed-replace; boundary=${boundary}`,
    "Cache-Control": "no-cache, no-store",
    Connection: "close",
    Pragma: "no-cache",
  });

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const writeFrame = (jpeg: Buffer) => {
    if (closed) return;
    res.write(`--${boundary}\r\n`);
    res.write("Content-Type: image/jpeg\r\n");
    res.write(`Content-Length: ${jpeg.length}\r\n\r\n`);
    res.write(jpeg);
    res.write("\r\n");
  };

  try {
    await extractFrames(
      req,
      async (frame, index) => {
        if (closed) return;
        const result = await processFrame(frame, index * Math.round(1000 / fps));
        writeFrame(result.buffer);
      },
      { fps, scale, jpegQuality: config.outputJpegQuality },
    );
    if (!closed) res.end();
  } catch (err) {
    console.error("[/stream] pipeline error:", err);
    if (!closed) res.end();
  }
});

/* ----------------------------- Error handler ------------------------------ */

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[server] unhandled error:", message);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal proxy error", detail: message });
  }
});

/* --------------------------------- Boot ----------------------------------- */

const server = app.listen(config.port, () => {
  console.log(`[chapcam-video-proxy] listening on :${config.port} (mode=${config.runpod.mode})`);
});

// Graceful shutdown.
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`\n[chapcam-video-proxy] received ${sig}, shutting down...`);
    server.close(() => process.exit(0));
  });
}
