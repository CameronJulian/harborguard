import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildFleetOptimization } from "@/lib/fleet/optimizationEngine";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const result = await buildFleetOptimization(supabase, organizationId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to optimize fleet dispatch." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
