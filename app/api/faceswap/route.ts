import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFaceSwapSync, submitFaceSwapJob, checkJobStatus } from "@/lib/runpod";

// Points cost: 2 points = 1 second of swap
const POINTS_PER_FRAME = 2;

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
    const { source_image, target_image, mode = "sync" } = body;

    if (!source_image || !target_image) {
      return NextResponse.json(
        { error: "source_image et target_image sont requis" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Atomic server-side debit: concurrent requests cannot spend the same points twice.
    let pointsRemaining: number | null;
    try {
      pointsRemaining = await adjustPoints(admin, user.id, -POINTS_PER_FRAME);
    } catch (e) {
      console.error("[FaceSwap Debit Error]", e);
      return NextResponse.json(
        { error: "Erreur lors de la deduction des points" },
        { status: 500 }
      );
    }

    if (pointsRemaining === null) {
      const { data: profile } = await admin
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .maybeSingle();
      return NextResponse.json(
        { error: "Points insuffisants", points_required: POINTS_PER_FRAME, points_available: profile?.points ?? 0 },
        { status: 402 }
      );
    }

    // Log the swap transaction
    await admin.from("swap_transactions").insert({
      user_id: user.id,
      points_used: POINTS_PER_FRAME,
      status: "processing",
    });

    try {
      if (mode === "async") {
        const jobId = await submitFaceSwapJob({
          source_image,
          target_image,
          enhance_face: true,
          face_restore: true,
        });

        return NextResponse.json({
          success: true,
          job_id: jobId,
          points_remaining: pointsRemaining,
        });
      }

      const result = await runFaceSwapSync({
        source_image,
        target_image,
        enhance_face: true,
        face_restore: true,
      });

      await admin
        .from("swap_transactions")
        .update({ status: "completed" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      return NextResponse.json({
        success: true,
        output_image: result.output_image,
        processing_time: result.processing_time,
        points_remaining: pointsRemaining,
      });
    } catch (swapError) {
      // The swap never ran: give the points back so a failure is never billed.
      await adjustPoints(admin, user.id, POINTS_PER_FRAME).catch((e) =>
        console.error("[FaceSwap Refund Error]", e)
      );
      throw swapError;
    }
  } catch (error) {
    console.error("[FaceSwap API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

// Check job status
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json(
        { error: "job_id est requis" },
        { status: 400 }
      );
    }

    const status = await checkJobStatus(jobId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("[FaceSwap Status Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
