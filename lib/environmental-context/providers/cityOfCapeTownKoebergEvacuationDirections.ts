import {
  getPointToPolylineDistanceMeters,
} from "../../geo/getPointToPolylineDistanceMeters.ts";

import type {
  KoebergEvacuationDirection,
  KoebergEvacuationDirectionContext,
  KoebergEvacuationSourceLayerId,
  ResolveKoebergEvacuationDirectionContextParams,
} from "../koebergEvacuationDirectionTypes.ts";

const DEFAULT_SEARCH_RADIUS_METERS = 10_000;
const MAX_SEARCH_RADIUS_METERS = 25_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CANDIDATE_LIMIT = 100;

const DEFAULT_CITY_KOEBERG_EVACUATION_NORTH_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Safety_Security/MapServer/0/query";

const DEFAULT_CITY_KOEBERG_EVACUATION_SOUTH_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Safety_Security/MapServer/1/query";

const DEFAULT_CITY_KOEBERG_EVACUATION_EAST_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Safety_Security/MapServer/2/query";

type ArcGisPolylineGeometry = {
  paths?: unknown;
};

export type ArcGisKoebergEvacuationFeature = {
  attributes?: {
    OBJECTID?: unknown;
    NAME?: unknown;
    TYPE?: unknown;
  };

  geometry?: ArcGisPolylineGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisKoebergEvacuationFeature[];

  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

type LayerDefinition = {
  layerId: KoebergEvacuationSourceLayerId;
  direction: KoebergEvacuationDirection;
  defaultUrl: string;
  environmentVariable:
    | "CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_NORTH_URL"
    | "CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_SOUTH_URL"
    | "CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_EAST_URL";
};

const LAYERS: LayerDefinition[] = [
  {
    layerId: 0,
    direction: "north",
    defaultUrl:
      DEFAULT_CITY_KOEBERG_EVACUATION_NORTH_URL,
    environmentVariable:
      "CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_NORTH_URL",
  },
  {
    layerId: 1,
    direction: "south",
    defaultUrl:
      DEFAULT_CITY_KOEBERG_EVACUATION_SOUTH_URL,
    environmentVariable:
      "CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_SOUTH_URL",
  },
  {
    layerId: 2,
    direction: "east",
    defaultUrl:
      DEFAULT_CITY_KOEBERG_EVACUATION_EAST_URL,
    environmentVariable:
      "CITY_OF_CAPE_TOWN_KOEBERG_EVACUATION_EAST_URL",
  },
];

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

  const radius =
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_SEARCH_RADIUS_METERS;

  return Math.min(
    MAX_SEARCH_RADIUS_METERS,
    Math.max(
      100,
      Math.round(radius)
    )
  );
}

function getLayerBaseUrl(
  layer: LayerDefinition
) {
  const override =
    process.env[
      layer.environmentVariable
    ]?.trim();

  return override || layer.defaultUrl;
}

function buildLayerQueryUrl({
  layer,
  latitude,
  longitude,
  searchRadiusMeters,
}: {
  layer: LayerDefinition;
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
}) {
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

      outSR:
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
        "OBJECTID,NAME,TYPE",

      returnGeometry:
        "true",

      resultRecordCount:
        String(
          DEFAULT_CANDIDATE_LIMIT
        ),
    });

  return `${getLayerBaseUrl(layer)}?${params.toString()}`;
}

export function mapCityOfCapeTownKoebergEvacuationFeature({
  layerId,
  direction,
  feature,
  distanceMeters,
}: {
  layerId: KoebergEvacuationSourceLayerId;
  direction: KoebergEvacuationDirection;
  feature: ArcGisKoebergEvacuationFeature;
  distanceMeters: number;
}): KoebergEvacuationDirectionContext | null {
  const attributes =
    feature?.attributes;

  if (
    !attributes ||
    !Number.isFinite(distanceMeters)
  ) {
    return null;
  }

  const objectId =
    normalizeString(
      attributes.OBJECTID
    );

  if (!objectId) {
    return null;
  }

  return {
    provider:
      "city_of_cape_town",

    providerFeatureId:
      `${layerId}:${objectId}`,

    sourceLayerId:
      layerId,

    direction,

    routeName:
      normalizeString(
        attributes.NAME
      ),

    routeType:
      normalizeString(
        attributes.TYPE
      ),

    distanceMeters:
      Math.max(
        0,
        Math.round(
          distanceMeters
        )
      ),
  };
}

export function selectNearestCityOfCapeTownKoebergEvacuationFeature({
  latitude,
  longitude,
  candidates,
}: {
  latitude: number;
  longitude: number;
  candidates: Array<{
    layerId: KoebergEvacuationSourceLayerId;
    direction: KoebergEvacuationDirection;
    feature: ArcGisKoebergEvacuationFeature;
  }>;
}): KoebergEvacuationDirectionContext | null {
  const mapped =
    candidates
      .map((candidate) => {
        const distance =
          getPointToPolylineDistanceMeters(
            {
              latitude,
              longitude,
            },
            candidate
              .feature
              ?.geometry
              ?.paths
          );

        if (
          distance === null ||
          !Number.isFinite(distance)
        ) {
          return null;
        }

        const context =
          mapCityOfCapeTownKoebergEvacuationFeature({
            layerId:
              candidate.layerId,

            direction:
              candidate.direction,

            feature:
              candidate.feature,

            distanceMeters:
              distance,
          });

        if (!context) {
          return null;
        }

        return {
          context,
          distance,
        };
      })
      .filter(
        (
          candidate
        ): candidate is {
          context: KoebergEvacuationDirectionContext;
          distance: number;
        } =>
          candidate !== null
      );

  if (mapped.length === 0) {
    return null;
  }

  mapped.sort(
    (first, second) => {
      const distanceDifference =
        first.distance -
        second.distance;

      if (
        Math.abs(
          distanceDifference
        ) > 0.001
      ) {
        return distanceDifference;
      }

      return first.context.providerFeatureId.localeCompare(
        second.context.providerFeatureId,
        undefined,
        {
          numeric: true,
        }
      );
    }
  );

  return mapped[0].context;
}

async function resolveLayerCandidates({
  layer,
  latitude,
  longitude,
  searchRadiusMeters,
}: {
  layer: LayerDefinition;
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
}): Promise<
  Array<{
    layerId: KoebergEvacuationSourceLayerId;
    direction: KoebergEvacuationDirection;
    feature: ArcGisKoebergEvacuationFeature;
  }>
> {
  const url =
    buildLayerQueryUrl({
      layer,
      latitude,
      longitude,
      searchRadiusMeters,
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
          `[City Koeberg evacuation ${layer.direction}] ArcGIS request failed:`,
          response.status,
          response.statusText
        );

        return [];
      }

      const data =
        (await response.json()) as
          ArcGisQueryResponse;

      if (data?.error) {
        console.warn(
          `[City Koeberg evacuation ${layer.direction}] ArcGIS returned an error:`,
          data.error
        );

        return [];
      }

      const features =
        Array.isArray(
          data?.features
        )
          ? data.features
          : [];

      return features.map(
        (feature) => ({
          layerId:
            layer.layerId,

          direction:
            layer.direction,

          feature,
        })
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      `[City Koeberg evacuation ${layer.direction}] Lookup unavailable:`,
      error instanceof Error
        ? error.message
        : String(error)
    );

    return [];
  }
}

/**
 * Resolves the nearest published City of Cape Town Koeberg
 * evacuation-direction line across the North, South and East
 * source layers.
 *
 * ArcGIS is used to obtain nearby candidate geometry. Exact
 * nearest distance is then calculated locally against the
 * returned EPSG:4326 polylines.
 *
 * This is emergency-planning context only. It does not indicate
 * an active evacuation order, radiological event, emergency,
 * road closure, or present route danger and must not directly
 * modify HarborGuard risk scoring.
 */
export async function resolveCityOfCapeTownKoebergEvacuationDirectionContext({
  latitude,
  longitude,
  searchRadiusMeters =
    DEFAULT_SEARCH_RADIUS_METERS,
}: ResolveKoebergEvacuationDirectionContextParams): Promise<KoebergEvacuationDirectionContext | null> {
  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const radius =
    normalizeSearchRadiusMeters(
      searchRadiusMeters
    );

  const layerResults =
    await Promise.all(
      LAYERS.map(
        (layer) =>
          resolveLayerCandidates({
            layer,
            latitude,
            longitude,
            searchRadiusMeters:
              radius,
          })
      )
    );

  const candidates =
    layerResults.flat();

  if (candidates.length === 0) {
    return null;
  }

  return selectNearestCityOfCapeTownKoebergEvacuationFeature({
    latitude,
    longitude,
    candidates,
  });
}
