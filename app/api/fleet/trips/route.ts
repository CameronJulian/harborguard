import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: trips, error } = await supabase
      .from("vehicle_trips")
      .select("*")
      .eq("organization_id", organizationId)
      .order("planned_departure", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const vehicleIds = [...new Set((trips || []).map((t) => t.vehicle_id))];

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname")
      .in("id", vehicleIds);

    const vehicleMap = new Map((vehicles || []).map((v) => [v.id, v]));

    return NextResponse.json({
      trips: (trips || []).map((trip) => ({
        ...trip,
        vehicle: vehicleMap.get(trip.vehicle_id) || null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load trips." },
      { status: 500 }
    );
  }
}