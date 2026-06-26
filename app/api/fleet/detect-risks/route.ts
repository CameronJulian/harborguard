import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { detectFleetRisks } from "@/lib/fleet/risk-detection";

export async function POST() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const result = await detectFleetRisks({
      supabase,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      createdCount: result.createdCount,
      alerts: result.alerts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Risk detection failed." },
      { status: 500 }
    );
  }
}
