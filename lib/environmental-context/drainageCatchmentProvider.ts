import {
  resolveCityOfCapeTownDrainageCatchmentContext,
} from "./providers/cityOfCapeTownDrainageCatchment.ts";

import type {
  DrainageCatchmentContext,
  ResolveDrainageCatchmentContextParams,
} from "./drainageCatchmentTypes.ts";

/**
 * Provider-neutral drainage-catchment context boundary.
 *
 * Catchment membership is explanatory environmental context.
 * It does not itself imply active flooding, drainage failure,
 * or elevated route risk and must not directly modify scoring.
 */
export async function resolveDrainageCatchmentContext(
  params: ResolveDrainageCatchmentContextParams
): Promise<DrainageCatchmentContext | null> {
  try {
    return await resolveCityOfCapeTownDrainageCatchmentContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Drainage catchment context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  DrainageCatchmentContext,
  ResolveDrainageCatchmentContextParams,
} from "./drainageCatchmentTypes.ts";
