import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const vehicleId = req.nextUrl.searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("route_assignments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("vehicle_id", vehicleId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment: data?.[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch route assignment." },
      { status: 500 }
    );
  }
}
