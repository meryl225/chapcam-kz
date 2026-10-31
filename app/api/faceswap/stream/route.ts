import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFaceSwapSync } from "@/lib/runpod";

// Real-time streaming face swap endpoint
// Optimized for low latency

const POINTS_PER_SECOND = 2;

type Admin = ReturnType<typeof createAdminClient>;

async function adjustPoints(admin: Admin, userId: string, delta: number) {
  const { data, error } = await admin.rpc("adjust_profile_points", {
    p_user_id: userId,
    p_delta: delta,
  });
  if (error) throw new Error(`adjust_profile_points: ${error.message}`);
  return data as number | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { source_image, frames } = body;

    if (!source_image || !frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: "source_image et frames (array) sont requis" },
        { status: 400 }
      );
    }

    // Estimate points needed (1 frame = 0.5 second approximately)
    const estimatedSeconds = frames.length * 0.5;
    const pointsReserved = Math.ceil(estimatedSeconds * POINTS_PER_SECOND);

    const admin = createAdminClient();

    // Reserve the estimated cost atomically BEFORE calling the GPU.
    let balanceAfterReserve: number | null;
    try {
      balanceAfterReserve = await adjustPoints(admin, user.id, -pointsReserved);
    } catch (e) {
      console.error("[Stream Debit Error]", e);
      return NextResponse.json(
        { error: "Erreur lors de la deduction des points" },
        { status: 500 }
      );
    }

    if (balanceAfterReserve === null) {
      const { data: profile } = await admin
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .maybeSingle();
      const available = profile?.points ?? 0;
      return NextResponse.json(
        {
          error: "Points insuffisants",
          points_required: pointsReserved,
          points_available: available,
          frames_processable: Math.floor(available / POINTS_PER_SECOND / 0.5),
        },
        { status: 402 }
      );
    }

    const processedFrames: string[] = [];
    let totalProcessingTime = 0;

    try {
      // Process frames in parallel (batch of 4 for speed)
      const BATCH_SIZE = 4;
      for (let i = 0; i < frames.length; i += BATCH_SIZE) {
        const batch = frames.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map((frame: string) =>
            runFaceSwapSync({
              source_image,
              target_image: frame,
              enhance_face: false, // Disabled for real-time speed
              face_restore: false,
            })
          )
        );

        for (const result of batchResults) {
          processedFrames.push(result.output_image);
          totalProcessingTime += result.processing_time;
        }
      }
    } catch (swapError) {
      await adjustPoints(admin, user.id, pointsReserved).catch((e) =>
        console.error("[Stream Refund Error]", e)
      );
      throw swapError;
    }

    // Settle against the reservation: refund unused points, or charge the extra if available.
    const actualPointsUsed = Math.ceil((totalProcessingTime / 1000) * POINTS_PER_SECOND);
    let pointsUsed = pointsReserved;
    let pointsRemaining = balanceAfterReserve;
    const difference = pointsReserved - actualPointsUsed;

    if (difference !== 0) {
      const settled = await adjustPoints(admin, user.id, difference).catch((e) => {
        console.error("[Stream Settle Error]", e);
        return null;
      });
      if (settled !== null) {
        pointsUsed = actualPointsUsed;
        pointsRemaining = settled;
      }
    }

    // Log transaction
    await admin.from("swap_transactions").insert({
      user_id: user.id,
      points_used: pointsUsed,
      frames_processed: frames.length,
      processing_time_ms: totalProcessingTime,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      processed_frames: processedFrames,
      frames_count: processedFrames.length,
      total_processing_time: totalProcessingTime,
      points_used: pointsUsed,
      points_remaining: pointsRemaining,
    });
  } catch (error) {
    console.error("[Stream FaceSwap Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
