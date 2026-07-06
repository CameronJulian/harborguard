import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadANPRDetections } from "@/lib/anpr/provider";

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

    const result = await loadANPRDetections(vehicles || []);
    const detections = result.detections;

    const summary = {
      scannedPlates: detections.length,
      verified: detections.filter((item) => item.status === "verified").length,
      review: detections.filter((item) => item.status === "review").length,
      watchlist: detections.filter((item) => item.watchlistMatch).length,
      averageConfidence: detections.length
        ? Math.round(detections.reduce((sum, item) => sum + item.confidence, 0) / detections.length)
        : 0,
      provider: result.provider,
    };

    return NextResponse.json({
      success: true,
      summary,
      detections,
      provider: result.provider,
      generatedAt: result.generatedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load ANPR dashboard." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
