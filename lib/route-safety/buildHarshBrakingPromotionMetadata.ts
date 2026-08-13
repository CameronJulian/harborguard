import type {
  BehaviorTrafficCalmingContext,
} from "@/lib/fleet/resolveBehaviorTrafficCalmingContext";
import type {
  HarshBrakingCorroborationResult,
} from "@/lib/fleet/harshBrakingCorroboration";

export type HarshBrakingPromotionCandidate = {
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  speedDropKmh: number;
  intervalSeconds: number;
  decelerationMps2: number;
};

export type BuildHarshBrakingPromotionMetadataInput = {
  vehicleId: string;
  tripId: string | null;
  candidate: HarshBrakingPromotionCandidate;
  corroboration: HarshBrakingCorroborationResult;
  trafficCalmingContext:
    | BehaviorTrafficCalmingContext
    | null;
};

/**
 * Builds explanatory route-intelligence metadata for
 * already-corroborated harsh-braking telemetry.
 *
 * Traffic-calming context is evidence only. This helper
 * does not determine corroboration, promotion eligibility,
 * confidence, verification counts, or road-risk scoring.
 */
export function buildHarshBrakingPromotionMetadata({
  vehicleId,
  tripId,
  candidate,
  corroboration,
  trafficCalmingContext,
}: BuildHarshBrakingPromotionMetadataInput) {
  return {
    telemetryType: "harsh_braking" as const,
    sourceVehicleId: vehicleId,
    tripId,
    candidate,
    trafficCalmingContext,
    corroboration: {
      thresholdMet:
        corroboration.thresholdMet,
      distinctVehicleCount:
        corroboration.distinctVehicleCount,
      distinctVehicleIds: [
        ...corroboration.distinctVehicleIds,
      ],
      otherVehicleIds: [
        ...corroboration.otherVehicleIds,
      ],
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
  };
}
