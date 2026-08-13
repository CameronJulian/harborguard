import {
  getDistanceMeters,
} from "../../geo/getDistanceMeters.ts";

import type {
  PoliceStationContext,
  ResolvePoliceStationContextParams,
} from "../policeStationTypes.ts";

const DEFAULT_SEARCH_RADIUS_METERS = 10_000;
const MAX_SEARCH_RADIUS_METERS = 25_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CANDIDATE_LIMIT = 100;

/**
 * City of Cape Town
 * Theme_Based/Safety_Security
 * MapServer Layer 7 - Police Stations.
 */
const DEFAULT_CITY_POLICE_STATIONS_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Safety_Security/MapServer/7/query";

export type ArcGisPoliceStationFeature = {
  attributes?: {
    OBJECTID?: unknown;
    STN?: unknown;
    CLST?: unknown;
    LAT?: unknown;
    LONG?: unknown;
  };

  geometry?: {
    x?: unknown;
    y?: unknown;
  };
};

type ArcGisQueryResponse = {
  features?: ArcGisPoliceStationFeature[];

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

function normalizeSearchRadiusMeters(
  value: unknown
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return DEFAULT_SEARCH_RADIUS_METERS;
  }

  return Math.min(
    parsed,
    MAX_SEARCH_RADIUS_METERS
  );
}

function getFeaturePoint(
  feature: ArcGisPoliceStationFeature
): {
  latitude: number;
  longitude: number;
} | null {
  const longitude =
    Number(
      feature?.geometry?.x
    );

  const latitude =
    Number(
      feature?.geometry?.y
    );

  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

export function mapCityOfCapeTownPoliceStationFeature({
  feature,
  distanceMeters,
}: {
  feature: ArcGisPoliceStationFeature;
  distanceMeters: number;
}): PoliceStationContext | null {
  const attributes =
    feature?.attributes;

  if (!attributes) {
    return null;
  }

  if (
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
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

    stationName:
      normalizeString(
        attributes.STN
      ),

    cluster:
      normalizeString(
        attributes.CLST
      ),

    distanceMeters:
      Math.max(
        0,
        Math.round(distanceMeters)
      ),
  };
}

/**
 * ArcGIS performs a bounded candidate query.
 *
 * HarborGuard calculates exact point-to-point distance locally
 * and selects the true nearest station. This avoids depending
 * on ArcGIS feature response order.
 */
export function selectCityOfCapeTownPoliceStationFeature({
  latitude,
  longitude,
  searchRadiusMeters,
  features,
}: {
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
  features: ArcGisPoliceStationFeature[];
}): PoliceStationContext | null {
  const candidates =
    features
      .map((feature) => {
        const stationPoint =
          getFeaturePoint(
            feature
          );

        if (!stationPoint) {
          return null;
        }

        const distanceMeters =
          getDistanceMeters(
            {
              latitude,
              longitude,
            },
            stationPoint
          );

        if (
          !Number.isFinite(
            distanceMeters
          ) ||
          distanceMeters < 0 ||
          distanceMeters >
            searchRadiusMeters
        ) {
          return null;
        }

        const context =
          mapCityOfCapeTownPoliceStationFeature({
            feature,
            distanceMeters,
          });

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

          exactDistanceMeters:
            distanceMeters,

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
          context: PoliceStationContext;
          exactDistanceMeters: number;
          objectId: number;
        } => candidate !== null
      );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort(
    (first, second) => {
      const distanceDifference =
        first.exactDistanceMeters -
        second.exactDistanceMeters;

      if (
        Math.abs(
          distanceDifference
        ) > 0.001
      ) {
        return distanceDifference;
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
  searchRadiusMeters,
}: {
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
}) {
  const baseUrl =
    process.env
      .CITY_OF_CAPE_TOWN_POLICE_STATIONS_URL
      ?.trim() ||
    DEFAULT_CITY_POLICE_STATIONS_URL;

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

      distance:
        String(
          searchRadiusMeters
        ),

      units:
        "esriSRUnit_Meter",

      outFields:
        [
          "OBJECTID",
          "STN",
          "CLST",
        ].join(","),

      returnGeometry:
        "true",

      outSR:
        "4326",

      resultRecordCount:
        String(
          DEFAULT_CANDIDATE_LIMIT
        ),
    });

  return `${baseUrl}?${params.toString()}`;
}

export async function resolveCityOfCapeTownPoliceStationContext({
  latitude,
  longitude,
  searchRadiusMeters =
    DEFAULT_SEARCH_RADIUS_METERS,
}: ResolvePoliceStationContextParams): Promise<PoliceStationContext | null> {
  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const normalizedSearchRadius =
    normalizeSearchRadiusMeters(
      searchRadiusMeters
    );

  const url =
    buildQueryUrl({
      latitude,
      longitude,
      searchRadiusMeters:
        normalizedSearchRadius,
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
          "[City police station context] ArcGIS request failed:",
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
          "[City police station context] ArcGIS returned an error:",
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

      return selectCityOfCapeTownPoliceStationFeature({
        latitude,
        longitude,
        searchRadiusMeters:
          normalizedSearchRadius,
        features,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      "[City police station context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
