import type {
  DrainageCatchmentContext,
  ResolveDrainageCatchmentContextParams,
} from "../drainageCatchmentTypes.ts";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * City of Cape Town
 * Theme_Based/Basic_Services_Infrastructure
 * MapServer Layer 24 - Stormwater Drainage Catchment Region.
 */
const DEFAULT_CITY_DRAINAGE_CATCHMENT_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Basic_Services_Infrastructure/MapServer/24/query";

export type ArcGisDrainageCatchmentFeature = {
  attributes?: {
    OBJECTID?: unknown;
    RGN_ID?: unknown;
    CTMT_RGN?: unknown;
    AREA_KM2?: unknown;
  };
};

type ArcGisQueryResponse = {
  features?: ArcGisDrainageCatchmentFeature[];

  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

function normalizeString(
  value: unknown
): string | null {
  const normalized =
    String(value ?? "").trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function normalizeNonNegativeNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    Number(value);

  if (
    !Number.isFinite(normalized) ||
    normalized < 0
  ) {
    return null;
  }

  return normalized;
}

function isValidCoordinate(
  latitude: number,
  longitude: number
) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function mapCityOfCapeTownDrainageCatchmentFeature(
  feature: ArcGisDrainageCatchmentFeature
): DrainageCatchmentContext | null {
  const attributes =
    feature?.attributes;

  if (!attributes) {
    return null;
  }

  const providerFeatureId =
    normalizeString(
      attributes.RGN_ID
    ) ??
    normalizeString(
      attributes.OBJECTID
    );

  if (!providerFeatureId) {
    return null;
  }

  return {
    provider:
      "city_of_cape_town",

    providerFeatureId,

    catchmentRegion:
      normalizeString(
        attributes.CTMT_RGN
      ),

    areaKm2:
      normalizeNonNegativeNumber(
        attributes.AREA_KM2
      ),
  };
}

/**
 * Layer 24 normally resolves a point to one catchment.
 *
 * If the service ever returns more than one polygon, selection
 * remains deterministic by stable City region identity and then
 * OBJECTID rather than depending on ArcGIS response order.
 */
export function selectCityOfCapeTownDrainageCatchmentFeature(
  features: ArcGisDrainageCatchmentFeature[]
): DrainageCatchmentContext | null {
  const candidates =
    features
      .map((feature) => {
        const context =
          mapCityOfCapeTownDrainageCatchmentFeature(
            feature
          );

        if (!context) {
          return null;
        }

        const objectId =
          Number(
            feature
              ?.attributes
              ?.OBJECTID
          );

        return {
          context,

          objectId:
            Number.isFinite(objectId)
              ? objectId
              : Number.MAX_SAFE_INTEGER,
        };
      })
      .filter(
        (
          candidate
        ): candidate is {
          context: DrainageCatchmentContext;
          objectId: number;
        } => candidate !== null
      );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort(
    (first, second) => {
      const identityComparison =
        first.context
          .providerFeatureId
          .localeCompare(
            second.context
              .providerFeatureId
          );

      if (identityComparison !== 0) {
        return identityComparison;
      }

      return (
        first.objectId -
        second.objectId
      );
    }
  );

  return candidates[0].context;
}

function buildQueryUrl({
  latitude,
  longitude,
}: ResolveDrainageCatchmentContextParams) {
  const baseUrl =
    process.env
      .CITY_OF_CAPE_TOWN_DRAINAGE_CATCHMENT_URL
      ?.trim() ||
    DEFAULT_CITY_DRAINAGE_CATCHMENT_URL;

  const params =
    new URLSearchParams({
      f:
        "json",

      geometry:
        `${longitude},${latitude}`,

      geometryType:
        "esriGeometryPoint",

      inSR:
        "4326",

      spatialRel:
        "esriSpatialRelIntersects",

      outFields:
        "OBJECTID,RGN_ID,CTMT_RGN,AREA_KM2",

      returnGeometry:
        "false",

      resultRecordCount:
        "5",
    });

  return `${baseUrl}?${params.toString()}`;
}

export async function resolveCityOfCapeTownDrainageCatchmentContext({
  latitude,
  longitude,
}: ResolveDrainageCatchmentContextParams): Promise<DrainageCatchmentContext | null> {
  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const url =
    buildQueryUrl({
      latitude,
      longitude,
    });

  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        DEFAULT_TIMEOUT_MS
      );

    try {
      const response =
        await fetch(
          url,
          {
            cache:
              "no-store",

            signal:
              controller.signal,

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      if (!response.ok) {
        console.warn(
          "[City drainage catchment context] ArcGIS request failed:",
          response.status,
          response.statusText
        );

        return null;
      }

      const data =
        (await response.json()) as
          ArcGisQueryResponse;

      if (data?.error) {
        console.warn(
          "[City drainage catchment context] ArcGIS returned an error:",
          data.error
        );

        return null;
      }

      const features =
        Array.isArray(
          data?.features
        )
          ? data.features
          : [];

      return selectCityOfCapeTownDrainageCatchmentFeature(
        features
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      "[City drainage catchment context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
