import {
  resolveCityOfCapeTownKoebergProtectiveActionZoneContext,
} from "./providers/cityOfCapeTownKoebergProtectiveActionZone.ts";

import type {
  KoebergProtectiveActionZoneContext,
  ResolveKoebergProtectiveActionZoneContextParams,
} from "./koebergProtectiveActionZoneTypes.ts";

/**
 * Provider-neutral Koeberg Protective Action Zone context.
 *
 * This represents published emergency-planning geography only.
 * It does not indicate an active emergency or current hazard
 * and must not directly modify route-risk scoring.
 */
export async function resolveKoebergProtectiveActionZoneContext(
  params: ResolveKoebergProtectiveActionZoneContextParams
): Promise<KoebergProtectiveActionZoneContext | null> {
  try {
    return await resolveCityOfCapeTownKoebergProtectiveActionZoneContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Koeberg PAZ context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  KoebergProtectiveActionZoneContext,
  ResolveKoebergProtectiveActionZoneContextParams,
} from "./koebergProtectiveActionZoneTypes.ts";
