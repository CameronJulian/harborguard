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

function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PanicBody;

    const vehicleId = String(body.vehicleId || "").trim();
    const requestedTripId = body.tripId ? String(body.tripId).trim() : null;
    const panicMessage =
      body.message?.trim() ||
      "Driver triggered panic alert. Possible hijack or emergency.";

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
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message || "Vehicle not found." },
        { status: 404 }
      );
    }

    const { data: latestLocation } = await supabase
      .from("vehicle_locations")
      .select("latitude, longitude, recorded_at")
      .eq("vehicle_id", vehicleId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: activeTrip } = await supabase
      .from("vehicle_trips")
      .select("id, status")
      .eq("vehicle_id", vehicleId)
      .in("status", [
        "scheduled",
        "en_route_to_port",
        "collecting",
        "en_route_to_fishery",
        "emergency",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const finalTripId = requestedTripId || activeTrip?.id || null;

    const { data: insertedAlert, error: alertError } = await supabase
      .from("vehicle_alerts")
      .insert({
        vehicle_id: vehicleId,
        trip_id: finalTripId,
        alert_type: "panic",
        severity: "critical",
        message: panicMessage,
        is_resolved: false,
      })
      .select()
      .single();

    if (alertError) {
      return NextResponse.json(
        { error: alertError.message },
        { status: 500 }
      );
    }

    if (activeTrip && activeTrip.status !== "emergency") {
      await supabase
        .from("vehicle_trips")
        .update({ status: "emergency" })
        .eq("id", activeTrip.id);
    }

    let notificationResult: any = null;
    let notificationError: string | null = null;

    try {
      const notifyResponse = await fetch(`${getBaseUrl(req)}/api/fleet/notify-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleNickname: vehicle.nickname,
          registrationNumber: vehicle.registration_number,
          alertType: "panic",
          severity: "critical",
          message: panicMessage,
          lastLatitude: latestLocation?.latitude ?? null,
          lastLongitude: latestLocation?.longitude ?? null,
        }),
      });

      notificationResult = await notifyResponse.json().catch(() => null);

      if (!notifyResponse.ok) {
        notificationError =
          notificationResult?.error || "Panic alert created, but notification failed.";
      }
    } catch (err: any) {
      notificationError =
        err.message || "Panic alert created, but notification failed.";
    }

    return NextResponse.json({
      success: true,
      message: "Panic alert created successfully.",
      vehicle: {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
      },
      alert: insertedAlert,
      activeTripId: finalTripId,
      notification: {
        sent: !notificationError,
        result: notificationResult,
        error: notificationError,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create panic alert." },
      { status: 500 }
    );
  }
}