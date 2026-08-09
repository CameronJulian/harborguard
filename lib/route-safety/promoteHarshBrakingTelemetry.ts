import type {
  HarshBrakingCorroborationResult,
} from "@/lib/fleet/harshBrakingCorroboration";

export type PromoteHarshBrakingTelemetryInput = {
  supabase: any;
  organizationId: string;
  vehicleAlertId: string;
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  occurredAt: string;
  candidate: {
    previousSpeedKmh: number;
    currentSpeedKmh: number;
    speedDropKmh: number;
    intervalSeconds: number;
    decelerationMps2: number;
  };
  corroboration: HarshBrakingCorroborationResult;
};

export type PromoteHarshBrakingTelemetryResult = {
  promoted: boolean;
  routeIntelligenceId: string | null;
  roadRiskAggregated: boolean;
};

export async function promoteHarshBrakingTelemetry({
  supabase,
  organizationId,
  vehicleAlertId,
  vehicleId,
  tripId,
  latitude,
  longitude,
  occurredAt,
  candidate,
  corroboration,
}: PromoteHarshBrakingTelemetryInput): Promise<PromoteHarshBrakingTelemetryResult> {
  if (!corroboration.thresholdMet) {
    return {
      promoted: false,
      routeIntelligenceId: null,
      roadRiskAggregated: false,
    };
  }

  const {
    data: routeIntelligence,
    error: intelligenceError,
  } = await supabase
    .from("route_intelligence")
    .upsert(
      {
        organization_id: organizationId,
        source: "fleet_telemetry",
        source_record_id: vehicleAlertId,
        event_type: "harsh_braking",
        severity: "medium",
        confidence: Math.min(
          100,
          50 +
            Math.max(
              0,
              corroboration.distinctVehicleCount - 1
            ) * 15
        ),
        latitude,
        longitude,
        road_name: null,
        route_segment: null,
        weather_risk: null,
        traffic_risk: null,
        verified: true,
        verification_count:
          corroboration.distinctVehicleCount,
        metadata: {
          telemetryType: "harsh_braking",
          sourceVehicleId: vehicleId,
          tripId,
          candidate,
          corroboration: {
            thresholdMet:
              corroboration.thresholdMet,
            distinctVehicleCount:
              corroboration.distinctVehicleCount,
            distinctVehicleIds:
              corroboration.distinctVehicleIds,
            otherVehicleIds:
              corroboration.otherVehicleIds,
            nearbyAlertCount:
              corroboration.nearbyAlertCount,
            radiusMeters:
              corroboration.radiusMeters,
            timeWindowMinutes:
              corroboration.timeWindowMinutes,
            windowStartedAt:
              corroboration.windowStartedAt,
            windowEndedAt:
              corroboration.windowEndedAt,
          },
        },
        updated_at: occurredAt,
      },
      {
        onConflict:
          "organization_id,source,source_record_id",
      }
    )
    .select("id")
    .single();

  if (intelligenceError) {
    throw intelligenceError;
  }

  const {
    error: aggregationError,
  } = await supabase.rpc(
    "aggregate_road_risk_intelligence",
    {
      p_organization_id: organizationId,
      p_route_intelligence_id:
        routeIntelligence.id,
      p_event_type: "harsh_braking",
      p_latitude: latitude,
      p_longitude: longitude,
      p_event_at: occurredAt,
    }
  );

  if (aggregationError) {
    throw aggregationError;
  }

  return {
    promoted: true,
    routeIntelligenceId:
      routeIntelligence.id,
    roadRiskAggregated: true,
  };
}
