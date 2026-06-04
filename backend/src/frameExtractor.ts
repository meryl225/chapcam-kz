import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable } from "node:stream";

/**
 * Turns an arbitrary incoming video stream (any container/codec ffmpeg can read)
 * into a sequence of individual JPEG frames by piping it through ffmpeg and
 * splitting the MJPEG output on JPEG SOI/EOI markers.
 *
 * Requires `ffmpeg` to be available on PATH (e.g. apt-get install ffmpeg, or the
 * ffmpeg-static package, or it ships inside most RunPod / Docker base images).
 */

const JPEG_SOI = Buffer.from([0xff, 0xd8]); // start of image
const JPEG_EOI = Buffer.from([0xff, 0xd9]); // end of image

export interface FrameExtractorOptions {
  /** Target frames-per-second to sample from the input. Default 15. */
  fps?: number;
  /** Output JPEG quality for ffmpeg (1-31, lower = better). Default 4. */
  jpegQuality?: number;
  /** Optional scale, e.g. "1280:-1" to cap width at 1280px. */
  scale?: string;
}

/**
 * @param input    A readable stream of encoded video (e.g. an HTTP request body).
 * @param onFrame  Async callback invoked for every extracted JPEG frame.
 *                 The returned promise is awaited to apply backpressure.
 * @param options  Sampling / encoding options.
 */
export async function extractFrames(
  input: Readable,
  onFrame: (frame: Buffer, index: number) => Promise<void> | void,
  options: FrameExtractorOptions = {},
): Promise<void> {
  const { fps = 15, jpegQuality = 4, scale } = options;

  const args = [
    "-loglevel", "error",
    "-i", "pipe:0",
    "-an", // drop audio
    "-r", String(fps),
    ...(scale ? ["-vf", `scale=${scale}`] : []),
    "-q:v", String(jpegQuality),
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "pipe:1",
  ];

  const ff: ChildProcessWithoutNullStreams = spawn("ffmpeg", args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderr = "";
  ff.stderr.on("data", (d: Buffer) => {
    stderr += d.toString();
  });

  // Pipe the incoming video into ffmpeg's stdin.
  input.pipe(ff.stdin);
  input.on("error", () => ff.stdin.destroy());
  ff.stdin.on("error", () => {
    /* EPIPE when ffmpeg exits early — safe to ignore */
  });

  let buffer = Buffer.alloc(0);
  let index = 0;
  const pending: Array<Promise<void> | void> = [];

  ff.stdout.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    // Extract every complete JPEG (SOI ... EOI) currently in the buffer.
    while (true) {
      const start = buffer.indexOf(JPEG_SOI);
      if (start === -1) break;
      const end = buffer.indexOf(JPEG_EOI, start + 2);
      if (end === -1) break;

      const frame = buffer.subarray(start, end + 2);
      buffer = buffer.subarray(end + 2);

      pending.push(onFrame(frame, index++));
    }
  });

  await new Promise<void>((resolve, reject) => {
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
    });
  });

  // Make sure all frame callbacks have settled before resolving.
  await Promise.allSettled(pending);
}
