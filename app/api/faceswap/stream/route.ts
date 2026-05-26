import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runFaceSwapSync } from "@/lib/runpod";

// Real-time streaming face swap endpoint
// Optimized for low latency

const POINTS_PER_SECOND = 2;

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

    if (!source_image || !frames || !Array.isArray(frames)) {
      return NextResponse.json(
        { error: "source_image et frames (array) sont requis" },
        { status: 400 }
      );
    }

    // Estimate points needed (1 frame = 0.5 second approximately)
    const estimatedSeconds = frames.length * 0.5;
    const pointsNeeded = Math.ceil(estimatedSeconds * POINTS_PER_SECOND);

    // Check user points
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil utilisateur non trouve" },
        { status: 404 }
      );
    }

    if (profile.points < pointsNeeded) {
      return NextResponse.json(
        { 
          error: "Points insuffisants", 
          points_required: pointsNeeded, 
          points_available: profile.points,
          frames_processable: Math.floor(profile.points / POINTS_PER_SECOND / 0.5)
        },
        { status: 402 }
      );
    }

    // Process frames in parallel (batch of 4 for speed)
    const BATCH_SIZE = 4;
    const processedFrames: string[] = [];
    let totalProcessingTime = 0;

    for (let i = 0; i < frames.length; i += BATCH_SIZE) {
      const batch = frames.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (frame: string) => {
          const result = await runFaceSwapSync({
            source_image,
            target_image: frame,
            enhance_face: false, // Disabled for real-time speed
            face_restore: false,
          });
          return result;
        })
      );

      for (const result of batchResults) {
        processedFrames.push(result.output_image);
        totalProcessingTime += result.processing_time;
      }
    }

    // Calculate actual points used
    const actualPointsUsed = Math.ceil((totalProcessingTime / 1000) * POINTS_PER_SECOND);

    // Deduct points
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: profile.points - actualPointsUsed })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Points Update Error]", updateError);
    }

    // Log transaction
    await supabase.from("swap_transactions").insert({
      user_id: user.id,
      points_used: actualPointsUsed,
      frames_processed: frames.length,
      processing_time_ms: totalProcessingTime,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      processed_frames: processedFrames,
      frames_count: processedFrames.length,
      total_processing_time: totalProcessingTime,
      points_used: actualPointsUsed,
      points_remaining: profile.points - actualPointsUsed,
    });

  } catch (error) {
    console.error("[Stream FaceSwap Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
