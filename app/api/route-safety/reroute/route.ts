import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  calculateRoutesWithProvider,
  normalizeRoutingProvider,
} from "@/lib/routing/routingProviderSelector";
import {
  buildCandidateTrafficContext,
} from "@/lib/traffic/buildCandidateTrafficContext";
import {
  loadLatestStoredTrafficFlowObservations,
  type LatestStoredTrafficFlowObservation,
} from "@/lib/traffic/loadRecentTrafficFlowObservations";
import {
  matchStoredTrafficObservationsToRoute,
} from "@/lib/traffic/matchStoredTrafficObservationsToRoute";

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const body = await req.json();
    const {
      origin,
      destination,
      routingProfile = "safest",
    } = body;

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json(
        { error: "origin.lat, origin.lng, destination.lat and destination.lng are required." },
        { status: 400 }
      );
    }

    const {
      data: roadRiskSegments,
      error: roadRiskError,
    } = await supabase
      .from("road_risk_segments")
      .select(`
        id,
        latitude,
        longitude,
        radius_meters,
        risk_score,

collision_count,
crime_count,
roadblock_count,
traffic_signal_count,
other_event_count,

road_closure_count,
roadworks_count,
congestion_count,
lane_closure_count,
weather_hazard_count,
flooding_count,
vehicle_breakdown_count,
road_hazard_count,
protest_count,

verification_count,
last_event_at
      `)
      .eq("organization_id", organizationId);

    if (roadRiskError) {
      return NextResponse.json(
        { error: roadRiskError.message },
        { status: 500 }
      );
    }
    const routingProvider =
      normalizeRoutingProvider(
        process.env.ROUTING_PROVIDER,
      );

    const result =
      await calculateRoutesWithProvider(
        {
          origin,
          destination,
          roadRiskSegments:
            roadRiskSegments ?? [],
          routingProfile,
        },
        routingProvider,
      );



    let storedTrafficObservations:
      LatestStoredTrafficFlowObservation[] =
        [];

    try {
      const storedTraffic =
        await loadLatestStoredTrafficFlowObservations(
          supabase,
          organizationId,
          {
            maximumAgeMinutes: 60,
          },
        );

      storedTrafficObservations =
        storedTraffic.observations;
    } catch {
      /*
       * Stored traffic enrichment is advisory only.
       *
       * A traffic-observation read failure must not
       * prevent Safe Navigation from returning routes.
       * The CandidateTrafficContext will simply fall
       * back to routing-summary evidence.
       */
      storedTrafficObservations = [];
    }

    const withCandidateTrafficContext =
      (route: any) => {
        if (!route) {
          return route;
        }

        const matchedStoredTraffic =
          matchStoredTrafficObservationsToRoute(
            route.routePoints,
            storedTrafficObservations,
          );

        return {
          ...route,
          candidateTrafficContext:
            buildCandidateTrafficContext({
              durationSeconds:
                route.durationSeconds,
              baseDurationSeconds:
                route.baseDurationSeconds,
              trafficDelaySeconds:
                route.trafficDelaySeconds,
              observations:
                matchedStoredTraffic.map(
                  (observation) => ({
                    congestion:
                      observation.congestion,
                    jamFactor:
                      observation.jamFactor,
                    delayMinutes:
                      observation.delayMinutes,
                    observedAt:
                      observation.observedAt,
                  }),
                ),
              maximumAgeMinutes: 60,
            }),
        };
      };

    const routes =
      Array.isArray(result?.routes)
        ? result.routes.map(
            withCandidateTrafficContext
          )
        : [];

    const recommendedRoute =
      withCandidateTrafficContext(
        result?.recommendedRoute ?? null
      );

    return NextResponse.json({
      success: true,
      ...result,
      routes,
      recommendedRoute,
    });
  } catch (error: unknown) {
    const errorName =
      error instanceof Error
        ? error.name
        : "";

    const errorMessage =
      error instanceof Error
        ? error.message
        : "";

    if (errorName === "TimeoutError") {
      return NextResponse.json(
        {
          error:
            "Routing provider timed out. Please try again.",
        },
        {
          status: 504,
        },
      );
    }

    if (errorMessage === "Unauthorized") {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          errorMessage ||
          "Route calculation failed.",
      },
      {
        status: 500,
      },
    );
  }
}
