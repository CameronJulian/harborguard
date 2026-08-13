import type {
  RouteSafetyAlertRow,
} from "./types.ts";

export type RoadContextRoadNameResult = {
  roadName: string | null;
};

export type RoadContextResolver = (params: {
  latitude: number;
  longitude: number;
}) => Promise<RoadContextRoadNameResult | null>;

export type RoadContextEnrichmentResult = {
  rows: RouteSafetyAlertRow[];
  attempted: number;
  enriched: number;
  unavailable: number;
};

const DEFAULT_MAX_LOOKUPS = 5;

function hasRoadName(
  row: RouteSafetyAlertRow
) {
  return (
    typeof row.road_name === "string" &&
    row.road_name.trim().length > 0
  );
}

function isValidCoordinate(
  latitude: unknown,
  longitude: unknown
) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Optionally enrich normalized provider incidents with an
 * authoritative road name.
 *
 * Safety properties:
 *
 * - Never overwrites a road name supplied by HERE/TomTom.
 * - Never changes incident type, severity, geometry or status.
 * - Provider lookup failures leave the original incident unchanged.
 * - Lookups are sequential and capped to avoid hammering the
 *   external municipal ArcGIS service.
 */
export async function enrichRouteSafetyAlertsWithRoadContext(
  rows: RouteSafetyAlertRow[],
  resolveRoadContext: RoadContextResolver,
  options?: {
    maxLookups?: number;
  }
): Promise<RoadContextEnrichmentResult> {
  const requestedMaxLookups =
    Number(options?.maxLookups);

  const maxLookups = Number.isFinite(
    requestedMaxLookups
  )
    ? Math.min(
        20,
        Math.max(
          0,
          Math.floor(requestedMaxLookups)
        )
      )
    : DEFAULT_MAX_LOOKUPS;

  const enrichedRows = rows.map(
    (row) => ({ ...row })
  );

  let attempted = 0;
  let enriched = 0;
  let unavailable = 0;

  for (
    let index = 0;
    index < enrichedRows.length;
    index += 1
  ) {
    const row = enrichedRows[index];

    if (attempted >= maxLookups) {
      break;
    }

    if (hasRoadName(row)) {
      continue;
    }

    if (
      !isValidCoordinate(
        row.latitude,
        row.longitude
      )
    ) {
      continue;
    }

    attempted += 1;

    try {
      const context =
        await resolveRoadContext({
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        });

      const roadName =
        typeof context?.roadName === "string"
          ? context.roadName.trim()
          : "";

      if (!roadName) {
        unavailable += 1;
        continue;
      }

      enrichedRows[index] = {
        ...row,
        road_name: roadName,
      };

      enriched += 1;
    } catch {
      unavailable += 1;
    }
  }

  return {
    rows: enrichedRows,
    attempted,
    enriched,
    unavailable,
  };
}
