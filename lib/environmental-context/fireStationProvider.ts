import {
  resolveCityOfCapeTownFireStationContext,
} from "./providers/cityOfCapeTownFireStations.ts";

import type {
  FireStationContext,
  ResolveFireStationContextParams,
} from "./fireStationTypes.ts";

/**
 * Provider-neutral emergency-response resource context.
 *
 * Fire-station proximity is explanatory operational context.
 * It does not itself represent incident severity, emergency
 * response time, resource availability, or route risk and
 * must not directly modify risk scoring.
 */
export async function resolveFireStationContext(
  params: ResolveFireStationContextParams
): Promise<FireStationContext | null> {
  try {
    return await resolveCityOfCapeTownFireStationContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Fire station context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  FireStationContext,
  ResolveFireStationContextParams,
} from "./fireStationTypes.ts";
