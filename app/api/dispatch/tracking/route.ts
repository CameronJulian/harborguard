import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { createMissionTimelineEvent, missionStatusTimelineTitle } from "@/lib/dispatch/missionTimeline";
import { readHsppEvidenceForOperationalUse } from "@/lib/hspp/readHsppEvidenceForOperationalUse";

const ARRIVAL_RADIUS_METERS = 120;
const MOVING_SPEED_KMH = 5;

function toNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function distanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadius = 6371000;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const deltaLat = ((toLat - fromLat) * Math.PI) / 180;
  const deltaLng = ((toLng - fromLng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function etaMinutes(distance: number, speedKmh: number) {
  const safeSpeed = Math.max(speedKmh || 0, 10);
  return Math.round(((distance / 1000) / safeSpeed) * 60);
}

async function loadTracking(applyTransitions: boolean) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: missions, error: missionError } = await supabase
      .from("dispatch_missions")
      .select(`
        *,
        vehicles:assigned_vehicle_id (
          id,
          registration_number,
          nickname
        )
      `)
      .eq("organization_id", organizationId)
      .in("status", ["Accepted", "En Route", "Arrived", "In Progress"]);

    if (missionError) throw missionError;

    const { data: locations, error: locationError } = await supabase
      .from("vehicle_locations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false });

    if (locationError) throw locationError;

    const latest = new Map<string, any>();

    for (const location of locations || []) {
      if (!latest.has(location.vehicle_id)) {
        latest.set(location.vehicle_id, location);
      }
    }

    const tracking = [];

    for (const mission of missions || []) {
      const location = latest.get(mission.assigned_vehicle_id);
      if (!location) continue;

      const evidenceId =
        typeof location.hspp_evidence_id === "string"
          ? location.hspp_evidence_id.trim()
          : "";

      if (!evidenceId) {
        // Preserve existing behavior for unlinked legacy/mobile/manual telemetry.
      } else {
        const operationalRead =
          await readHsppEvidenceForOperationalUse({
            supabase,
            organizationId,
            evidenceId,
          });

        if (!operationalRead.decision.allowed) {
          const destinationLat =
            toNumber(mission.destination_lat);

          const destinationLng =
            toNumber(mission.destination_lng);

          const plannedDistanceMeters =
            toNumber(
              mission.route_data?.selectedRoute?.distanceMeters
            ) ||
            toNumber(
              mission.route_data?.selectedRoute?.length
            ) ||
            null;

          tracking.push({
            missionId: mission.id,
            vehicle:
              mission.vehicles?.registration_number ||
              mission.vehicles?.nickname ||
              mission.assigned_vehicle_id,
            status: mission.status,
            latitude: null,
            longitude: null,
            speedKmh: null,
            destination: {
              lat: destinationLat,
              lng: destinationLng,
            },
            remainingMeters: null,
            remainingKm: null,
            plannedDistanceMeters,
            progressPercent: null,
            etaMinutes: null,
            arrivalRadiusMeters:
              ARRIVAL_RADIUS_METERS,
            arrived: null,
            autoTransition: null,
            lastSeen: null,
          });

          continue;
        }
      }

      const currentLat = toNumber(location.latitude);
      const currentLng = toNumber(location.longitude);
      const destinationLat = toNumber(mission.destination_lat);
      const destinationLng = toNumber(mission.destination_lng);
      const speedKmh = toNumber(location.speed_kmh);

      const remainingMeters = Math.round(
        distanceMeters(currentLat, currentLng, destinationLat, destinationLng)
      );

      const plannedDistanceMeters =
        toNumber(mission.route_data?.selectedRoute?.distanceMeters) ||
        toNumber(mission.route_data?.selectedRoute?.length) ||
        remainingMeters;

      const completedMeters = Math.max(plannedDistanceMeters - remainingMeters, 0);

      const progressPercent =
        plannedDistanceMeters > 0
          ? Math.min(100, Math.max(0, Math.round((completedMeters / plannedDistanceMeters) * 100)))
          : 0;

      const eta = etaMinutes(remainingMeters, speedKmh);
      const arrived = remainingMeters <= ARRIVAL_RADIUS_METERS;

      let autoTransition: string | null = null;

      if (applyTransitions) {
        const previousStatus = mission.status;
        const update: any = {};

        if (
          previousStatus === "Accepted" &&
          speedKmh >= MOVING_SPEED_KMH
        ) {
          autoTransition = "En Route";
          update.status = "En Route";
        }

        if (
          previousStatus === "En Route" &&
          arrived
        ) {
          autoTransition = "Arrived";
          update.status = "Arrived";
          update.arrived_at =
            new Date().toISOString();
        }

        if (autoTransition) {
          const {
            data: transitionedMission,
            error: updateError,
          } = await supabase
            .from("dispatch_missions")
            .update(update)
            .eq(
              "organization_id",
              organizationId
            )
            .eq("id", mission.id)
            .eq(
              "status",
              previousStatus
            )
            .select("id, status")
            .maybeSingle();

          if (updateError) {
            console.error(
              "DISPATCH TRACKING AUTO-TRANSITION ERROR:",
              updateError.message
            );
            autoTransition = null;
          } else if (transitionedMission) {
            mission.status =
              transitionedMission.status;

            await createMissionTimelineEvent(
              supabase,
              {
                organizationId,
                missionId: mission.id,
                eventType: "status_change",
                title:
                  missionStatusTimelineTitle(
                    transitionedMission.status
                  ),
                detail:
                  `Mission status auto-transitioned from ${previousStatus} to ${transitionedMission.status}.`,
                actorId: null,
                source:
                  "dispatch_tracking_auto",
                metadata: {
                  fromStatus:
                    previousStatus,
                  toStatus:
                    transitionedMission.status,
                  speedKmh,
                  remainingMeters,
                  arrivalRadiusMeters:
                    ARRIVAL_RADIUS_METERS,
                },
              }
            );
          } else {
            autoTransition = null;
          }
        }
      }

      tracking.push({
        missionId: mission.id,
        vehicle:
          mission.vehicles?.registration_number ||
          mission.vehicles?.nickname ||
          mission.assigned_vehicle_id,
        status: mission.status,
        latitude: currentLat,
        longitude: currentLng,
        speedKmh,
        destination: {
          lat: destinationLat,
          lng: destinationLng,
        },
        remainingMeters,
        remainingKm: Number((remainingMeters / 1000).toFixed(2)),
        plannedDistanceMeters,
        progressPercent,
        etaMinutes: eta,
        arrivalRadiusMeters: ARRIVAL_RADIUS_METERS,
        arrived,
        autoTransition,
        lastSeen: location.recorded_at,
      });
    }

    return NextResponse.json({
      success: true,
      count: tracking.length,
      tracking,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Tracking failed." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
export async function GET() {
  return loadTracking(false);
}

export async function POST(
  request: Request
) {
  const contentType =
    request.headers.get("content-type") ||
    "";

  if (
    !contentType
      .toLowerCase()
      .startsWith("application/json")
  ) {
    return NextResponse.json(
      {
        error:
          "Content-Type application/json is required.",
      },
      {
        status: 415,
      }
    );
  }

  try {
    await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "A valid JSON request body is required.",
      },
      {
        status: 400,
      }
    );
  }

  return loadTracking(true);
}
