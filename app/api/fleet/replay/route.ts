import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const vehicleId = url.searchParams.get("vehicleId");
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    let pointsQuery = supabase
      .from("vehicle_locations")
      .select(
        "id, vehicle_id, trip_id, latitude, longitude, speed_kmh, heading, recorded_at, source"
      )
      .eq("vehicle_id", vehicleId)
      .order("recorded_at", { ascending: true });

    let alertsQuery = supabase
      .from("vehicle_alerts")
      .select(
        "id, vehicle_id, trip_id, alert_type, severity, message, is_resolved, created_at, resolved_at, resolution_notes"
      )
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: true });

    if (start) {
      pointsQuery = pointsQuery.gte("recorded_at", start);
      alertsQuery = alertsQuery.gte("created_at", start);
    }

    if (end) {
      pointsQuery = pointsQuery.lte("recorded_at", end);
      alertsQuery = alertsQuery.lte("created_at", end);
    }

    const [{ data: points, error: pointsError }, { data: alerts, error: alertsError }, { data: vehicle, error: vehicleError }] =
      await Promise.all([
        pointsQuery,
        alertsQuery,
        supabase
          .from("vehicles")
          .select("id, nickname, registration_number, make, model")
          .eq("id", vehicleId)
          .maybeSingle(),
      ]);

    if (pointsError) {
      return NextResponse.json(
        { error: pointsError.message },
        { status: 500 }
      );
    }

    if (alertsError) {
      return NextResponse.json(
        { error: alertsError.message },
        { status: 500 }
      );
    }

    if (vehicleError) {
      return NextResponse.json(
        { error: vehicleError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle,
      pointCount: points?.length || 0,
      alertCount: alerts?.length || 0,
      points: points || [],
      alerts: alerts || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load route replay." },
      { status: 500 }
    );
  }
}