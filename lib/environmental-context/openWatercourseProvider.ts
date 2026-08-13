import {
  resolveCityOfCapeTownOpenWatercourseContext,
} from "./providers/cityOfCapeTownOpenWatercourse.ts";

import type {
  OpenWatercourseContext,
  ResolveOpenWatercourseContextParams,
} from "./openWatercourseTypes.ts";

/**
 * Provider-neutral environmental context boundary.
 *
 * Open-watercourse context is explanatory proximity context only.
 * Consumers must not interpret proximity alone as an active flood event.
 */
export async function resolveOpenWatercourseContext(
  params: ResolveOpenWatercourseContextParams
): Promise<OpenWatercourseContext | null> {
  try {
    return await resolveCityOfCapeTownOpenWatercourseContext(
      params
    );
  } catch (error) {
    console.warn(
      "[Open watercourse context] Provider unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export type {
  OpenWatercourseContext,
  ResolveOpenWatercourseContextParams,
} from "./openWatercourseTypes.ts";