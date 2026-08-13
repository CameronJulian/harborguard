import type {
  TrafficCalmingContext,
} from "@/lib/road-context/trafficCalmingTypes";

export type BehaviorTrafficCalmingContext =
  TrafficCalmingContext;

export type ResolveBehaviorTrafficCalmingContextInput = {
  latitude: number;
  longitude: number;
  harshBrakingCandidate: unknown | null;
  rapidAccelerationCandidate: unknown | null;
  harshCorneringCandidate: unknown | null;
  resolveContext: (input: {
    latitude: number;
    longitude: number;
  }) => Promise<BehaviorTrafficCalmingContext | null>;
};

/**
 * Resolves municipal traffic-calming context only when
 * a harsh-driving candidate exists.
 *
 * Context is explanatory telemetry evidence only.
 * Failure or absence of external context must not affect
 * candidate validity or alert creation.
 */
export async function resolveBehaviorTrafficCalmingContext({
  latitude,
  longitude,
  harshBrakingCandidate,
  rapidAccelerationCandidate,
  harshCorneringCandidate,
  resolveContext,
}: ResolveBehaviorTrafficCalmingContextInput): Promise<BehaviorTrafficCalmingContext | null> {
  const hasHarshDrivingCandidate =
    harshBrakingCandidate !== null ||
    rapidAccelerationCandidate !== null ||
    harshCorneringCandidate !== null;

  if (!hasHarshDrivingCandidate) {
    return null;
  }

  try {
    return await resolveContext({
      latitude,
      longitude,
    });
  } catch {
    return null;
  }
}
