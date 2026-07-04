import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { id } = await params;

    const { data, error } = await supabase
      .from("mission_tracking")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("mission_id", id)
      .order("recorded_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      tracking: data ?? [],
    });

  } catch (error:any) {
    return NextResponse.json(
      { error: error.message || "Failed to load mission tracking." },
      { status: error.message==="Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { id } = await params;

    const body = await req.json();

    const { data, error } = await supabase
      .from("mission_tracking")
      .insert({
        organization_id: organizationId,
        mission_id: id,
        vehicle_id: body.vehicleId ?? null,
        latitude: body.latitude,
        longitude: body.longitude,
        speed: body.speed ?? null,
        heading: body.heading ?? null,
        accuracy: body.accuracy ?? null,
        battery_level: body.batteryLevel ?? null,
        is_moving: body.isMoving ?? null,
        metadata: body.metadata ?? {}
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      tracking: data
    });

  } catch (error:any) {
    return NextResponse.json(
      { error: error.message || "Failed to save tracking." },
      { status: error.message==="Unauthorized" ? 401 : 500 }
    );
  }
}