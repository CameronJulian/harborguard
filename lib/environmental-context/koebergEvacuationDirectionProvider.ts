import {
  resolveCityOfCapeTownKoebergEvacuationDirectionContext,
} from "./providers/cityOfCapeTownKoebergEvacuationDirections.ts";

import type {
  KoebergEvacuationDirectionContext,
  ResolveKoebergEvacuationDirectionContextParams,
} from "./koebergEvacuationDirectionTypes.ts";

/**
 * Provider-neutral Koeberg evacuation-direction context.
 *
 * This describes published emergency-planning route geometry.
 * It does not indicate an active evacuation order or present
 * emergency and must not directly modify route-risk scoring.
 */
export async function resolveKoebergEvacuationDirectionContext(
  params: ResolveKoebergEvacuationDirectionContextParams
): Promise<KoebergEvacuationDirectionContext | null> {
  try {
    return await resolveCityOfCapeTownKoebergEvacuationDirectionContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Koeberg evacuation direction context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  KoebergEvacuationDirection,
  KoebergEvacuationDirectionContext,
  KoebergEvacuationSourceLayerId,
  ResolveKoebergEvacuationDirectionContextParams,
} from "./koebergEvacuationDirectionTypes.ts";
