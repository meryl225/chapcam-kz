/**
 * RunPod API Integration for ChapCam Face Swap
 * Uses InsightFace model for high-quality face swapping
 */

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

interface FaceSwapInput {
  source_image: string; // Base64 encoded source face image
  target_image: string; // Base64 encoded target frame
  enhance_face?: boolean;
  face_restore?: boolean;
}

interface FaceSwapOutput {
  output_image: string; // Base64 encoded result
  processing_time: number;
  status: string;
}

interface RunPodJob {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  output?: FaceSwapOutput;
  error?: string;
}

/**
 * Submit a face swap job to RunPod
 */
export async function submitFaceSwapJob(input: FaceSwapInput): Promise<string> {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not configured");
  }
  
  if (!RUNPOD_ENDPOINT_ID) {
    throw new Error("RUNPOD_ENDPOINT_ID is not configured");
  }

  const response = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          source_image: input.source_image,
          target_image: input.target_image,
          enhance_face: input.enhance_face ?? true,
          face_restore: input.face_restore ?? true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RunPod API error: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Submit a synchronous face swap job (waits for result)
 */
export async function runFaceSwapSync(input: FaceSwapInput): Promise<FaceSwapOutput> {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not configured");
  }
  
  if (!RUNPOD_ENDPOINT_ID) {
    throw new Error("RUNPOD_ENDPOINT_ID is not configured");
  }

  const response = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          source_image: input.source_image,
          target_image: input.target_image,
          enhance_face: input.enhance_face ?? true,
          face_restore: input.face_restore ?? true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RunPod API error: ${error}`);
  }

  const data = await response.json();
  
  if (data.status === "FAILED") {
    throw new Error(data.error || "Face swap failed");
  }

  return data.output;
}

/**
 * Check the status of a face swap job
 */
export async function checkJobStatus(jobId: string): Promise<RunPodJob> {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not configured");
  }
  
  if (!RUNPOD_ENDPOINT_ID) {
    throw new Error("RUNPOD_ENDPOINT_ID is not configured");
  }

  const response = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RunPod API error: ${error}`);
  }

  return response.json();
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<void> {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not configured");
  }
  
  if (!RUNPOD_ENDPOINT_ID) {
    throw new Error("RUNPOD_ENDPOINT_ID is not configured");
  }

  await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/cancel/${jobId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
    }
  );
}

/**
 * Stream face swap for real-time processing
 * Processes frames in batches for efficiency
 */
export async function streamFaceSwap(
  sourceImage: string,
  frames: string[],
  onProgress: (processedFrame: string, index: number) => void
): Promise<void> {
  const BATCH_SIZE = 4; // Process 4 frames at a time
  
  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (frame, batchIndex) => {
      const result = await runFaceSwapSync({
        source_image: sourceImage,
        target_image: frame,
        enhance_face: false, // Disable for speed in real-time
        face_restore: false,
      });
      
      return { result, index: i + batchIndex };
    });
    
    const results = await Promise.all(promises);
    
    for (const { result, index } of results) {
      onProgress(result.output_image, index);
    }
  }
}

/**
 * Health check for RunPod endpoint
 */
export async function checkEndpointHealth(): Promise<boolean> {
  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/health`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${RUNPOD_API_KEY}`,
        },
      }
    );
    
    return response.ok;
  } catch {
    return false;
  }
}
