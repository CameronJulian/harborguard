import type {
  KoebergRadiiPlanningContext,
  ResolveKoebergRadiiPlanningContextParams,
} from "../koebergRadiiPlanningTypes.ts";

const DEFAULT_TIMEOUT_MS = 10_000;

const DEFAULT_CITY_KOEBERG_RADII_PLANNING_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Safety_Security/MapServer/4/query";

type ArcGisKoebergRadiiPlanningFeature = {
  attributes?: {
    OBJECTID?: unknown;
    DSTN?: unknown;
  };
};

type ArcGisQueryResponse = {
  features?: ArcGisKoebergRadiiPlanningFeature[];

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

function normalizePlanningDistanceKm(
  value: unknown
): number | null {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
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

export function mapCityOfCapeTownKoebergRadiiPlanningFeature(
  feature: ArcGisKoebergRadiiPlanningFeature
): KoebergRadiiPlanningContext | null {
  const attributes =
    feature?.attributes;

  if (!attributes) {
    return null;
  }

  const providerFeatureId =
    normalizeString(
      attributes.OBJECTID
    );

  if (!providerFeatureId) {
    return null;
  }

  const planningDistanceKm =
    normalizePlanningDistanceKm(
      attributes.DSTN
    );

  if (planningDistanceKm === null) {
    return null;
  }

  return {
    provider:
      "city_of_cape_town",

    providerFeatureId,

    planningDistanceKm,
  };
}

function buildQueryUrl({
  latitude,
  longitude,
}: ResolveKoebergRadiiPlanningContextParams) {
  const baseUrl =
    process.env
      .CITY_OF_CAPE_TOWN_KOEBERG_RADII_PLANNING_URL
      ?.trim() ||
    DEFAULT_CITY_KOEBERG_RADII_PLANNING_URL;

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
        "OBJECTID,DSTN",

      returnGeometry:
        "false",

      resultRecordCount:
        "25",
    });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Resolves the published City of Cape Town Koeberg Radii
 * Planning band containing a point.
 *
 * These are emergency-planning distance bands only. They do
 * not indicate an active nuclear incident, present radiological
 * conditions, evacuation status, or elevated real-time route
 * risk and must not directly modify HarborGuard risk scoring.
 */
export async function resolveCityOfCapeTownKoebergRadiiPlanningContext({
  latitude,
  longitude,
}: ResolveKoebergRadiiPlanningContextParams): Promise<KoebergRadiiPlanningContext | null> {
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
          "[City Koeberg radii planning context] ArcGIS request failed:",
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
          "[City Koeberg radii planning context] ArcGIS returned an error:",
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

      if (features.length === 0) {
        return null;
      }

      const mapped =
        features
          .map(
            mapCityOfCapeTownKoebergRadiiPlanningFeature
          )
          .filter(
            (
              context
            ): context is KoebergRadiiPlanningContext =>
              context !== null
          );

      if (mapped.length === 0) {
        return null;
      }

      mapped.sort(
        (first, second) => {
          const distanceDifference =
            first.planningDistanceKm -
            second.planningDistanceKm;

          if (distanceDifference !== 0) {
            return distanceDifference;
          }

          return first.providerFeatureId.localeCompare(
            second.providerFeatureId,
            undefined,
            {
              numeric: true,
            }
          );
        }
      );

      return mapped[0];
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      "[City Koeberg radii planning context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
