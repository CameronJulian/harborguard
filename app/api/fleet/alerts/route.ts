import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getOrganizationId(accessToken: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (error || !data?.organization_id) {
    throw new Error("Organization not found.");
  }

  return data.organization_id;
}

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

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization");

    const cookieHeader =
      request.headers.get("cookie") || "";

    const cookieToken = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) =>
        cookie.startsWith("sb-access-token=")
      )
      ?.replace("sb-access-token=", "");

    const accessToken =
      authHeader?.replace("Bearer ", "") ||
      (cookieToken
        ? decodeURIComponent(cookieToken)
        : undefined);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId =
      await getOrganizationId(accessToken);

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

    const alerts = data || [];

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