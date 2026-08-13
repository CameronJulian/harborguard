import {
  resolveCityOfCapeTownTrafficCalmingContext,
} from "@/lib/road-context/providers/cityOfCapeTownTrafficCalming";

import type {
  ResolveTrafficCalmingContextParams,
  TrafficCalmingContext,
  TrafficCalmingFeatureType,
} from "@/lib/road-context/trafficCalmingTypes";

/**
 * Provider-neutral traffic-calming context boundary.
 *
 * v1 currently uses City of Cape Town municipal
 * speed-bump and raised-intersection datasets.
 *
 * Consumers should treat null as "no trustworthy
 * external traffic-calming context available" and
 * continue normal HarborGuard operation.
 *
 * This resolver is context-only. It does not change
 * telemetry detector validity or route-risk scoring.
 */
export async function resolveTrafficCalmingContext(
  params: ResolveTrafficCalmingContextParams
): Promise<TrafficCalmingContext | null> {
  return resolveCityOfCapeTownTrafficCalmingContext(
    params
  );
}

export type {
  ResolveTrafficCalmingContextParams,
  TrafficCalmingContext,
  TrafficCalmingFeatureType,
} from "@/lib/road-context/trafficCalmingTypes";
