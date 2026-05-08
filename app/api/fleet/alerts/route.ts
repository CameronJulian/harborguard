import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function timelineTitle(alertType?: string | null) {
  return (alertType || "unknown_alert")
    .replace(/_/g, " ")
    .toUpperCase();
}

function severityWeight(severity?: string | null) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function generateNarrative(alert: any) {
  const type = alert.alert_type || "unknown";
  const severity = alert.severity || "low";
  const vehicle =
    alert.vehicle?.registration_number ||
    "Unknown Vehicle";

  let probableCause =
    "Operational anomaly detected.";

  let recommendedAction =
    "Monitor vehicle telemetry.";

  if (type.includes("speed")) {
    probableCause =
      "Driver exceeded recommended speed threshold.";
    recommendedAction =
      "Review driver behavior and enforce speed compliance.";
  }

  if (type.includes("panic")) {
    probableCause =
      "Possible hijacking, driver distress, or emergency activation.";
    recommendedAction =
      "Immediately contact driver and dispatch response team.";
  }

  if (type.includes("offline")) {
    probableCause =
      "Tracker connectivity interruption or power loss.";
    recommendedAction =
      "Verify device connectivity and inspect tracker hardware.";
  }

  if (type.includes("geofence")) {
    probableCause =
      "Vehicle entered or exited a restricted operational zone.";
    recommendedAction =
      "Review geofence activity and confirm route authorization.";
  }

  const riskNarrative = `${vehicle} triggered a ${severity.toUpperCase()} ${timelineTitle(
    type
  )} event. ${probableCause}`;

  return {
    summary: `${timelineTitle(type)} detected for ${vehicle}.`,
    probableCause,
    recommendedAction,
    riskNarrative,
  };
}

export async function GET() {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { data, error } = await supabase
      .from("vehicle_alerts")
      .select(`
        id,
        vehicle_id,
        trip_id,
        alert_type,
        severity,
        message,
        is_resolved,
        created_at,
        resolved_at,
        resolution_notes,
        organization_id,
        vehicle:vehicles (
          nickname,
          registration_number
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const alerts = (data || []).map(
      (alert: any) => ({
        ...alert,
        intelligence:
          generateNarrative(alert),
      })
    );

    const timelines = alerts.reduce(
      (acc: any, alert: any) => {
        const vehicleId =
          alert.vehicle_id || "unknown";

        if (!acc[vehicleId]) {
          acc[vehicleId] = {
            vehicleId,
            registrationNumber:
              alert.vehicle
                ?.registration_number ||
              "Unknown Vehicle",
            nickname:
              alert.vehicle?.nickname ||
              null,
            openAlerts: 0,
            resolvedAlerts: 0,
            maxSeverity:
              alert.severity || "low",
            escalationScore: 0,
            events: [],
          };
        }

        if (alert.is_resolved) {
          acc[vehicleId]
            .resolvedAlerts += 1;
        } else {
          acc[vehicleId]
            .openAlerts += 1;
        }

        const weight = severityWeight(
          alert.severity
        );

        acc[vehicleId]
          .escalationScore +=
          alert.is_resolved
            ? weight
            : weight * 2;

        if (
          weight >
          severityWeight(
            acc[vehicleId].maxSeverity
          )
        ) {
          acc[vehicleId].maxSeverity =
            alert.severity || "low";
        }

        acc[vehicleId].events.push({
          id: alert.id,
          title: timelineTitle(
            alert.alert_type
          ),
          alertType:
            alert.alert_type,
          severity:
            alert.severity || "low",
          message:
            alert.message ||
            "No message provided.",
          createdAt:
            alert.created_at,
          resolvedAt:
            alert.resolved_at,
          isResolved: Boolean(
            alert.is_resolved
          ),
          resolutionNotes:
            alert.resolution_notes ||
            null,

          intelligence:
            alert.intelligence,
        });

        return acc;
      },
      {}
    );

    const timelineList = Object.values(
      timelines
    ).sort(
      (a: any, b: any) =>
        b.escalationScore -
        a.escalationScore
    );

    return NextResponse.json({
      success: true,
      alerts,
      timelines: timelineList,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to load vehicle alerts.",
      },
      { status: 500 }
    );
  }
}