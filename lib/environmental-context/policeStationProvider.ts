import {
  resolveCityOfCapeTownPoliceStationContext,
} from "./providers/cityOfCapeTownPoliceStations.ts";

import type {
  PoliceStationContext,
  ResolvePoliceStationContextParams,
} from "./policeStationTypes.ts";

/**
 * Provider-neutral police-resource context.
 *
 * Police-station proximity is explanatory operational context.
 * It does not itself represent crime likelihood, incident
 * severity, police availability, response time, or route risk
 * and must not directly modify risk scoring.
 */
export async function resolvePoliceStationContext(
  params: ResolvePoliceStationContextParams
): Promise<PoliceStationContext | null> {
  try {
    return await resolveCityOfCapeTownPoliceStationContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Police station context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  PoliceStationContext,
  ResolvePoliceStationContextParams,
} from "./policeStationTypes.ts";
