import {
  resolveCityOfCapeTownRoadContext,
} from "@/lib/road-context/providers/cityOfCapeTown";

import type {
  ResolveRoadContextParams,
  RoadContext,
} from "@/lib/road-context/types";

/**
 * Provider-neutral road-context boundary.
 *
 * v1 currently uses the City of Cape Town TCT Road Centreline.
 *
 * Consumers should treat null as "no trustworthy external road
 * context available" and continue normal HarborGuard operation.
 *
 * Do NOT call this on every GPS telemetry sample.
 */
export async function resolveRoadContext(
  params: ResolveRoadContextParams
): Promise<RoadContext | null> {
  return resolveCityOfCapeTownRoadContext(
    params
  );
}

export type {
  ResolveRoadContextParams,
  RoadContext,
} from "@/lib/road-context/types";