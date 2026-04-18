import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PanicBody = {
  vehicleId?: string;
  tripId?: string | null;
  message?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PanicBody;

    const vehicleId = body.vehicleId;
    const tripId = body.tripId ?? null;
    const message =
      body.message?.trim() || "Driver triggered panic alert. Possible hijack or emergency.";

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, nickname, registration_number")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message || "Vehicle not found." },
        { status: 404 }
      );
    }

    const { error: alertError } = await supabase
      .from("vehicle_alerts")
      .insert({
        vehicle_id: vehicleId,
        trip_id: tripId,
        alert_type: "panic",
        severity: "critical",
        message,
        is_resolved: false,
      });

    if (alertError) {
      return NextResponse.json(
        { error: alertError.message },
        { status: 500 }
      );
    }

    const { data: activeTrip } = await supabase
      .from("vehicle_trips")
      .select("id, status")
      .eq("vehicle_id", vehicleId)
      .in("status", [
        "scheduled",
        "en_route_to_port",
        "collecting",
        "en_route_to_fishery",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeTrip) {
      await supabase
        .from("vehicle_trips")
        .update({ status: "emergency" })
        .eq("id", activeTrip.id);
    }

    return NextResponse.json({
      success: true,
      message: "Panic alert created successfully.",
      vehicle: {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
      },
      activeTripId: activeTrip?.id || tripId || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create panic alert." },
      { status: 500 }
    );
  }
}