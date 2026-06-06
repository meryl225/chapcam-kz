import "dotenv/config";

/**
 * Centralized, validated environment configuration.
 * Throws early at boot if something critical is missing.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export type RunpodMode = "serverless" | "comfyui";

const runpodMode = optional("RUNPOD_MODE", "serverless") as RunpodMode;
if (runpodMode !== "serverless" && runpodMode !== "comfyui") {
  throw new Error(`RUNPOD_MODE must be "serverless" or "comfyui", got "${runpodMode}"`);
}

export const config = {
  port: int("PORT", 8787),
  allowedOrigins: optional("ALLOWED_ORIGINS", "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  runpod: {
    baseUrl: required("RUNPOD_BASE_URL").replace(/\/+$/, ""),
    mode: runpodMode,
    // API key is required for serverless, optional for a public pod proxy.
    apiKey: runpodMode === "serverless" ? required("RUNPOD_API_KEY") : optional("RUNPOD_API_KEY", ""),
    timeoutMs: int("RUNPOD_TIMEOUT_MS", 15000),
  },

  maxConcurrency: Math.max(1, int("MAX_CONCURRENCY", 2)),
  outputJpegQuality: int("OUTPUT_JPEG_QUALITY", 4),
  fallbackToOriginal: bool("FALLBACK_TO_ORIGINAL", true),
} as const;

export type AppConfig = typeof config;
