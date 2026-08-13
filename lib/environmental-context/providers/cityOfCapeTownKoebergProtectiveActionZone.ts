import type {
  KoebergProtectiveActionZoneContext,
  ResolveKoebergProtectiveActionZoneContextParams,
} from "../koebergProtectiveActionZoneTypes.ts";

const DEFAULT_TIMEOUT_MS = 10_000;

const DEFAULT_CITY_KOEBERG_PROTECTIVE_ACTION_ZONE_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Safety_Security/MapServer/3/query";

type ArcGisProtectiveActionZoneFeature = {
  attributes?: {
    OBJECTID?: unknown;
    ZONE_NMBR?: unknown;
  };
};

type ArcGisQueryResponse = {
  features?: ArcGisProtectiveActionZoneFeature[];

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

export function mapCityOfCapeTownKoebergProtectiveActionZoneFeature(
  feature: ArcGisProtectiveActionZoneFeature
): KoebergProtectiveActionZoneContext | null {
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

  return {
    provider:
      "city_of_cape_town",

    providerFeatureId,

    zoneNumber:
      normalizeString(
        attributes.ZONE_NMBR
      ),
  };
}

function buildQueryUrl({
  latitude,
  longitude,
}: ResolveKoebergProtectiveActionZoneContextParams) {
  const baseUrl =
    process.env
      .CITY_OF_CAPE_TOWN_KOEBERG_PROTECTIVE_ACTION_ZONE_URL
      ?.trim() ||
    DEFAULT_CITY_KOEBERG_PROTECTIVE_ACTION_ZONE_URL;

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
        "OBJECTID,ZONE_NMBR",

      returnGeometry:
        "false",

      resultRecordCount:
        "10",
    });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Resolves City of Cape Town Koeberg Protective Action Zone
 * membership for a point.
 *
 * This is emergency-planning context only. Membership in a
 * published planning zone does not indicate an active nuclear
 * incident, present radiological conditions, or elevated
 * real-time route risk and therefore must not directly modify
 * HarborGuard risk scoring.
 */
export async function resolveCityOfCapeTownKoebergProtectiveActionZoneContext({
  latitude,
  longitude,
}: ResolveKoebergProtectiveActionZoneContextParams): Promise<KoebergProtectiveActionZoneContext | null> {
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
          "[City Koeberg PAZ context] ArcGIS request failed:",
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
          "[City Koeberg PAZ context] ArcGIS returned an error:",
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
            mapCityOfCapeTownKoebergProtectiveActionZoneFeature
          )
          .filter(
            (
              context
            ): context is KoebergProtectiveActionZoneContext =>
              context !== null
          );

      if (mapped.length === 0) {
        return null;
      }

      mapped.sort(
        (first, second) =>
          first.providerFeatureId.localeCompare(
            second.providerFeatureId,
            undefined,
            {
              numeric: true,
            }
          )
      );

      return mapped[0];
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      "[City Koeberg PAZ context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
