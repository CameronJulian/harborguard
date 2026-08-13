import type {
  PedestrianContext,
} from "@/lib/road-context/pedestrianContextTypes";

export type BehaviorPedestrianContext =
  PedestrianContext;

export type ResolveBehaviorPedestrianContextInput = {
  latitude: number;
  longitude: number;
  harshBrakingCandidate: unknown | null;
  rapidAccelerationCandidate: unknown | null;
  harshCorneringCandidate: unknown | null;
  resolveContext: (input: {
    latitude: number;
    longitude: number;
  }) => Promise<BehaviorPedestrianContext | null>;
};

/**
 * Resolves municipal pedestrian-crossing context only
 * when a harsh-driving candidate exists.
 *
 * Context is explanatory telemetry evidence only.
 * Failure or absence of external context must not affect
 * candidate validity, alert creation, or risk scoring.
 */
export async function resolveBehaviorPedestrianContext({
  latitude,
  longitude,
  harshBrakingCandidate,
  rapidAccelerationCandidate,
  harshCorneringCandidate,
  resolveContext,
}: ResolveBehaviorPedestrianContextInput): Promise<BehaviorPedestrianContext | null> {
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
