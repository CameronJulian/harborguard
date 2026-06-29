import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function confidenceFor(index: number) {
  return Math.min(98, 72 + index * 4);
}

function statusFor(confidence: number, index: number) {
  if (index % 7 === 0) return "watchlist_review";
  if (confidence >= 90) return "verified";
  return "review";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname, is_active, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const detections = (vehicles || []).map((vehicle: any, index: number) => {
      const confidence = confidenceFor(index);
      const status = statusFor(confidence, index);

      return {
        id: `anpr-${vehicle.id}-${index}`,
        vehicleId: vehicle.id,
        plateNumber: vehicle.registration_number || "UNKNOWN",
        vehicleName: vehicle.registration_number || vehicle.id,
        nickname: vehicle.nickname || null,
        cameraName: `${vehicle.registration_number || "Vehicle"} ANPR Camera`,
        source: "HarborGuard Demo ANPR",
        confidence,
        status,
        watchlistMatch: status === "watchlist_review",
        detectedAt: new Date(Date.now() - index * 8 * 60 * 1000).toISOString(),
        location: index % 2 === 0 ? "Command route corridor" : "Depot access point",
        recommendedAction:
          status === "watchlist_review"
            ? "Review possible watchlist match and escalate if confirmed."
            : confidence >= 90
            ? "Plate verified. Continue monitoring."
            : "Review plate confidence and confirm vehicle identity.",
      };
    });

    const summary = {
      scannedPlates: detections.length,
      verified: detections.filter((item) => item.status === "verified").length,
      review: detections.filter((item) => item.status === "review").length,
      watchlist: detections.filter((item) => item.watchlistMatch).length,
      averageConfidence: detections.length
        ? Math.round(detections.reduce((sum, item) => sum + item.confidence, 0) / detections.length)
        : 0,
    };

    return NextResponse.json({
      success: true,
      summary,
      detections,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load ANPR dashboard." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
