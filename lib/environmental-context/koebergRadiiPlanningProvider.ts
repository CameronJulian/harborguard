import {
  resolveCityOfCapeTownKoebergRadiiPlanningContext,
} from "./providers/cityOfCapeTownKoebergRadiiPlanning.ts";

import type {
  KoebergRadiiPlanningContext,
  ResolveKoebergRadiiPlanningContextParams,
} from "./koebergRadiiPlanningTypes.ts";

/**
 * Provider-neutral Koeberg Radii Planning context.
 *
 * This represents published emergency-planning geography only.
 * It does not indicate an active emergency or current hazard
 * and must not directly modify route-risk scoring.
 */
export async function resolveKoebergRadiiPlanningContext(
  params: ResolveKoebergRadiiPlanningContextParams
): Promise<KoebergRadiiPlanningContext | null> {
  try {
    return await resolveCityOfCapeTownKoebergRadiiPlanningContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Koeberg radii planning context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  KoebergRadiiPlanningContext,
  ResolveKoebergRadiiPlanningContextParams,
} from "./koebergRadiiPlanningTypes.ts";
