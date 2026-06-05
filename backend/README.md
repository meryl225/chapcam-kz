# ChapCam Video Proxy

A lightweight Express service that:

1. Ingests an incoming video stream (or individual frames).
2. Extracts frames with ffmpeg.
3. Sends each frame to a RunPod (ComfyUI) endpoint to "enhance" it.
4. Streams the cleaned frames back as MJPEG.

> This service runs a long-lived process and spawns ffmpeg, so it **cannot run on Vercel**.
> Deploy it on RunPod, a VPS, or any Docker host. Your Next.js app on Vercel calls it over HTTP.

## Setup

```bash
cd backend
cp .env.example .env   # then fill in RUNPOD_BASE_URL / RUNPOD_API_KEY
npm install
npm run dev            # dev with hot reload (tsx)
# or
npm run build && npm start
```

`ffmpeg` must be installed on the host (`apt-get install ffmpeg`), or use the provided Dockerfile.

## Environment variables

| Variable              | Required | Default     | Description                                                        |
| --------------------- | -------- | ----------- | ------------------------------------------------------------------ |
| `PORT`                | no       | `8787`      | HTTP port.                                                         |
| `ALLOWED_ORIGINS`     | no       | `*`         | Comma-separated CORS allowlist.                                    |
| `RUNPOD_BASE_URL`     | yes      | —           | Serverless `…/v2/<id>` or pod proxy `https://<pod>-8188.proxy…`.   |
| `RUNPOD_MODE`         | no       | `serverless`| `serverless` (/runsync) or `comfyui` (/prompt + history polling). |
| `RUNPOD_API_KEY`      | serverless | —         | Bearer token. Required in serverless mode.                        |
| `RUNPOD_TIMEOUT_MS`   | no       | `15000`     | Per-frame timeout.                                                 |
| `MAX_CONCURRENCY`     | no       | `2`         | Max frames enhanced in parallel (GPU backpressure).               |
| `OUTPUT_JPEG_QUALITY` | no       | `4`         | ffmpeg `-q:v` for output frames (1-31, lower = better).           |
| `FALLBACK_TO_ORIGINAL`| no       | `true`      | On RunPod failure, pass the original frame through.               |

## Endpoints

### `GET /health`
Liveness + current config snapshot.

### `POST /frame`
Enhance a single frame.

```bash
curl -X POST "http://localhost:8787/frame?ts=0" \
  -H "Content-Type: image/jpeg" \
  --data-binary @frame.jpg --output enhanced.jpg
```

Response headers: `X-Frame-Enhanced`, `X-Frame-Latency-Ms`, `X-Frame-Error`.

### `POST /stream`
Pipe a video stream in, get an MJPEG stream of enhanced frames out.

```bash
ffmpeg -re -i input.mp4 -f mpegts pipe:1 \
  | curl -X POST "http://localhost:8787/stream?fps=15&scale=1280:-1" \
      -H "Content-Type: application/octet-stream" \
      --data-binary @- --output -
```

You can also point an `<img src="…/stream">` or an OBS Browser Source at it.

## Core function

`processFrame(frameBuffer: Buffer, timestamp: number): Promise<ProcessedFrame>`
in `src/processFrame.ts` is the heart of the service: it applies a concurrency
gate, calls RunPod, and falls back to the original frame on error.

## RunPod handler contract (serverless mode)

Your handler receives `{ input: { image: "<base64>", timestamp } }` and must
return `{ output: { image: "<base64>" } }` (or `{ output: { images: ["<base64>"] } }`).

For ComfyUI mode, edit `buildComfyWorkflow()` in `src/runpodClient.ts` to match
your exported workflow (API format) node IDs.
