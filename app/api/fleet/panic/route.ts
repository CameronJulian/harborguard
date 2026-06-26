import { NextResponse } from "next/server";
import webpush from "web-push";
import { requireOrganization } from "@/lib/server-auth";
import { createCommandCenterNotification } from "@/lib/command-center/notifications";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:cameron@healthsystems.co.za",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
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
    const { supabase, organizationId } = await requireOrganization();

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
      .eq("organization_id", organizationId)
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
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: activeTrip } = await supabase
      .from("vehicle_trips")
      .select("id, status")
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", organizationId)
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
        organization_id: organizationId,
      })
      .select()
      .single();

    if (alertError) {
      return NextResponse.json({ error: alertError.message }, { status: 500 });
    }

    const { error: incidentError } = await supabase
      .from("incidents")
      .insert({
        incident_code: `INC-${Date.now()}`,
        severity: "Critical",
        status: "Open",
        summary: `PANIC activated for ${vehicle.registration_number}. ${panicMessage}`,
        assigned_to: null,
        organization_id: organizationId,
        vehicle_alert_id: insertedAlert?.id ?? null,
      });

    if (incidentError) {
      console.error("Failed to create panic incident:", incidentError);
    }

    const { error: timelineError } = await supabase
      .from("emergency_response_events")
      .insert({
        vehicle_alert_id: insertedAlert.id,
        event_type: "panic_activated",
        note: panicMessage,
        created_by: null,
      });

    if (timelineError) {
      console.error("Emergency response timeline insert failed:", timelineError);
      return NextResponse.json(
        { error: timelineError.message },
        { status: 500 }
      );
    }

    await createCommandCenterNotification({
      supabase,
      organizationId,
      vehicleId,
      title: "Panic alert triggered",
      message: `PANIC activated for ${vehicle.registration_number}. ${panicMessage}`,
      severity: "critical",
      type: "panic",
      source: "fleet_panic",
      metadata: {
        vehicleAlertId: insertedAlert.id,
        tripId: finalTripId,
        latestLocation,
      },
    });

    if (activeTrip && activeTrip.status !== "emergency") {
      await supabase
        .from("vehicle_trips")
        .update({ status: "emergency" })
        .eq("id", activeTrip.id)
        .eq("organization_id", organizationId);
    }      let notificationResult: unknown = {
        skipped: "legacy_notify_alert_disabled_direct_push_enabled"
      };
      let notificationError: string | null = null;

    try {
      const { data: pushSubscriptions, error: pushSubscriptionError } =
        await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh_key, auth_key")
          .eq("organization_id", organizationId)
          .eq("is_active", true);

      if (pushSubscriptionError) {
        console.error("Panic push subscription lookup failed:", pushSubscriptionError);
      }

      if (pushSubscriptions && pushSubscriptions.length > 0) {
        await Promise.all(
          pushSubscriptions.map(async (subscription) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: subscription.p256dh_key,
                    auth: subscription.auth_key,
                  },
                },
                JSON.stringify({
                  title: "HarborGuard Driver Panic Alert",
                  body: `PANIC activated for ${vehicle.registration_number}. ${panicMessage}`,
                  icon: "/icon.png",
                  url: "/command-center",
                })
              );
            } catch (pushSendError: any) {
              console.error("Panic push send failed:", pushSendError);

              if (pushSendError?.statusCode === 404 || pushSendError?.statusCode === 410) {
                await supabase
                  .from("push_subscriptions")
                  .update({ is_active: false })
                  .eq("id", subscription.id);
              }
            }
          })
        );
      }
    } catch (pushError) {
      console.error("Panic push notification failed:", pushError);
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
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create panic alert.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}











