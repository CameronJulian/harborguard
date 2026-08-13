import {
  resolveCityOfCapeTownMainDrainageContext,
} from "./providers/cityOfCapeTownMainDrainage.ts";

import type {
  MainDrainageContext,
  ResolveMainDrainageContextParams,
} from "./mainDrainageTypes.ts";

/**
 * Provider-neutral stormwater infrastructure context boundary.
 *
 * Main-drainage proximity is explanatory infrastructure context
 * only. It does not itself imply active flooding or drainage
 * failure and must not directly modify route-risk scoring.
 */
export async function resolveMainDrainageContext(
  params: ResolveMainDrainageContextParams
): Promise<MainDrainageContext | null> {
  try {
    return await resolveCityOfCapeTownMainDrainageContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Main drainage context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  MainDrainageContext,
  ResolveMainDrainageContextParams,
} from "./mainDrainageTypes.ts";
