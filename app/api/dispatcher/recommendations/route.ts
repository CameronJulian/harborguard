import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildDispatchCopilot } from "@/lib/dispatch/copilot";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const copilot = await buildDispatchCopilot(supabase, organizationId);

    return NextResponse.json({
      success: true,
      count: copilot.recommendations.length,
      ...copilot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load dispatcher recommendations." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
