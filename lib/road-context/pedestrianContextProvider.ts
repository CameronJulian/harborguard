import {
  resolveCityOfCapeTownPedestrianContext,
} from "@/lib/road-context/providers/cityOfCapeTownPedestrianContext";

import type {
  PedestrianContext,
  ResolvePedestrianContextParams,
} from "@/lib/road-context/pedestrianContextTypes";

/**
 * Provider-neutral pedestrian context boundary.
 *
 * v1 currently uses the City of Cape Town
 * Pedestrian Crossing dataset.
 *
 * Consumers should treat null as "no trustworthy
 * external pedestrian context available" and continue
 * normal HarborGuard operation.
 *
 * This resolver is context-only. It does not change
 * telemetry detector validity or route-risk scoring.
 */
export async function resolvePedestrianContext(
  params: ResolvePedestrianContextParams
): Promise<PedestrianContext | null> {
  return resolveCityOfCapeTownPedestrianContext(params);
}

export type {
  PedestrianContext,
  ResolvePedestrianContextParams,
} from "@/lib/road-context/pedestrianContextTypes";
