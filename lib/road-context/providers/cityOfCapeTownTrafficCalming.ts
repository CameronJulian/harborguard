import type {
  ResolveTrafficCalmingContextParams,
  TrafficCalmingContext,
  TrafficCalmingFeatureType,
} from "@/lib/road-context/trafficCalmingTypes";


const EARTH_RADIUS_METERS = 6371e3;

const DEFAULT_SEARCH_RADIUS_METERS = 150;

const MAX_SEARCH_RADIUS_METERS = 250;

const MIN_SEARCH_RADIUS_METERS = 10;

const DEFAULT_TIMEOUT_MS = 10_000;

const DEFAULT_CANDIDATE_LIMIT = 25;

const DEFAULT_SPEED_BUMP_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_12/FeatureServer/7/query";

const DEFAULT_RAISED_INTERSECTION_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_12/FeatureServer/8/query";

type ArcGisPointGeometry = {
  x?: unknown;
  y?: unknown;
};

export type ArcGisTrafficCalmingFeature = {
  attributes?: {
    OBJECTID?: unknown;
    GlobalID?: unknown;
    OWNRSHP?: unknown;
    SAP_USR_STS?: unknown;
  };

  geometry?: ArcGisPointGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisTrafficCalmingFeature[];

  exceededTransferLimit?: boolean;

  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

type TrafficCalmingLayer = {
  featureType: TrafficCalmingFeatureType;
};

type TrafficCalmingLayerCandidates = {
  featureType: TrafficCalmingFeatureType;
  features: ArcGisTrafficCalmingFeature[];
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

function normalizeStatusCode(
  value: unknown
): number | null {
  const statusCode = Number(value);

  return Number.isFinite(statusCode)
    ? statusCode
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

function getPointDistanceMeters(
  first: {
    latitude: number;
    longitude: number;
  },
  second: {
    latitude: number;
    longitude: number;
  }
) {
  const firstLatitudeRadians =
    (first.latitude * Math.PI) / 180;

  const secondLatitudeRadians =
    (second.latitude * Math.PI) / 180;

  const latitudeDifferenceRadians =
    ((second.latitude - first.latitude) *
      Math.PI) /
    180;

  const longitudeDifferenceRadians =
    ((second.longitude - first.longitude) *
      Math.PI) /
    180;

  const haversineValue =
    Math.sin(
      latitudeDifferenceRadians / 2
    ) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(
        longitudeDifferenceRadians / 2
      ) ** 2;

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    )
  );
}

function normalizeRadius(
  searchRadiusMeters: unknown
) {
  return Math.min(
    MAX_SEARCH_RADIUS_METERS,
    Math.max(
      MIN_SEARCH_RADIUS_METERS,
      Math.round(
        Number(searchRadiusMeters) ||
          DEFAULT_SEARCH_RADIUS_METERS
      )
    )
  );
}

function getLayerUrl(
  featureType: TrafficCalmingFeatureType
) {
  if (featureType === "speed_bump") {
    return (
      process.env
        .CITY_OF_CAPE_TOWN_SPEED_BUMP_URL
        ?.trim() ||
      DEFAULT_SPEED_BUMP_URL
    );
  }

  return (
    process.env
      .CITY_OF_CAPE_TOWN_RAISED_INTERSECTION_URL
      ?.trim() ||
    DEFAULT_RAISED_INTERSECTION_URL
  );
}

function buildQueryUrl({
  featureType,
  latitude,
  longitude,
  searchRadiusMeters,
}: {
  featureType: TrafficCalmingFeatureType;
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
}) {
  const params =
    new URLSearchParams({
      f: "json",

      // ArcGIS point geometry uses X,Y =
      // longitude,latitude.
      geometry:
        `${longitude},${latitude}`,

      geometryType:
        "esriGeometryPoint",

      inSR: "4326",

      outSR: "4326",

      spatialRel:
        "esriSpatialRelIntersects",

      distance:
        String(searchRadiusMeters),

      units:
        "esriSRUnit_Meter",

      outFields: [
        "OBJECTID",
        "GlobalID",
        "OWNRSHP",
        "SAP_USR_STS",
      ].join(","),

      returnGeometry:
        "true",

      resultRecordCount:
        String(DEFAULT_CANDIDATE_LIMIT),
    });

  return (
    `${getLayerUrl(featureType)}` +
    `?${params.toString()}`
  );
}

export function mapCityOfCapeTownTrafficCalmingFeature({
  featureType,
  feature,
  distanceMeters,
}: {
  featureType: TrafficCalmingFeatureType;
  feature: ArcGisTrafficCalmingFeature;
  distanceMeters: number;
}): TrafficCalmingContext | null {
  const attributes =
    feature?.attributes;

  const longitude =
    Number(feature?.geometry?.x);

  const latitude =
    Number(feature?.geometry?.y);

  if (
    !attributes ||
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const providerFeatureId =
    normalizeString(
      attributes.GlobalID
    ) ??
    normalizeString(
      attributes.OBJECTID
    );

  if (!providerFeatureId) {
    return null;
  }

  if (
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    return null;
  }

  return {
    provider:
      "city_of_cape_town",

    featureType,

    providerFeatureId,

    ownership:
      normalizeString(
        attributes.OWNRSHP
      ),

    statusCode:
      normalizeStatusCode(
        attributes.SAP_USR_STS
      ),

    latitude,

    longitude,

    distanceMeters:
      Math.max(
        0,
        Math.round(distanceMeters)
      ),
  };
}

export function selectNearestCityTrafficCalmingFeature({
  latitude,
  longitude,
  searchRadiusMeters,
  layers,
}: {
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
  layers: TrafficCalmingLayerCandidates[];
}): TrafficCalmingContext | null {
  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const candidates =
    layers.flatMap((layer) =>
      layer.features
        .map((feature) => {
          const featureLongitude =
            Number(
              feature?.geometry?.x
            );

          const featureLatitude =
            Number(
              feature?.geometry?.y
            );

          if (
            !isValidCoordinate(
              featureLatitude,
              featureLongitude
            )
          ) {
            return null;
          }

          const distance =
            getPointDistanceMeters(
              {
                latitude,
                longitude,
              },
              {
                latitude:
                  featureLatitude,
                longitude:
                  featureLongitude,
              }
            );

          if (
            !Number.isFinite(distance) ||
            distance >
              searchRadiusMeters
          ) {
            return null;
          }

          const context =
            mapCityOfCapeTownTrafficCalmingFeature({
              featureType:
                layer.featureType,
              feature,
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
            context:
              TrafficCalmingContext;
            distance: number;
          } => candidate !== null
        )
    );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort(
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

      const featureTypeComparison =
        first.context.featureType
          .localeCompare(
            second.context.featureType
          );

      if (
        featureTypeComparison !== 0
      ) {
        return featureTypeComparison;
      }

      return (
        first.context
          .providerFeatureId
          .localeCompare(
            second.context
              .providerFeatureId
          )
      );
    }
  );

  return candidates[0].context;
}

async function queryTrafficCalmingLayer({
  layer,
  latitude,
  longitude,
  searchRadiusMeters,
}: {
  layer: TrafficCalmingLayer;
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
}): Promise<TrafficCalmingLayerCandidates> {
  const url =
    buildQueryUrl({
      featureType:
        layer.featureType,
      latitude,
      longitude,
      searchRadiusMeters,
    });

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      DEFAULT_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(url, {
        cache: "no-store",

        signal:
          controller.signal,

        headers: {
          Accept:
            "application/json",
        },
      });

    if (!response.ok) {
      console.warn(
        `[City traffic-calming context] ${layer.featureType} ArcGIS request failed:`,
        response.status,
        response.statusText
      );

      return {
        featureType:
          layer.featureType,
        features: [],
      };
    }

    const data =
      (await response.json()) as
        ArcGisQueryResponse;

    if (data?.error) {
      console.warn(
        `[City traffic-calming context] ${layer.featureType} ArcGIS returned an error:`,
        data.error
      );

      return {
        featureType:
          layer.featureType,
        features: [],
      };
    }

    return {
      featureType:
        layer.featureType,

      features:
        Array.isArray(
          data?.features
        )
          ? data.features
          : [],
    };
  } catch (error) {
    console.warn(
      `[City traffic-calming context] ${layer.featureType} lookup unavailable:`,
      error instanceof Error
        ? error.message
        : String(error)
    );

    return {
      featureType:
        layer.featureType,
      features: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveCityOfCapeTownTrafficCalmingContext({
  latitude,
  longitude,
  searchRadiusMeters =
    DEFAULT_SEARCH_RADIUS_METERS,
}: ResolveTrafficCalmingContextParams): Promise<TrafficCalmingContext | null> {
  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const radius =
    normalizeRadius(
      searchRadiusMeters
    );

  const layers:
    TrafficCalmingLayer[] = [
      {
        featureType:
          "speed_bump",
      },
      {
        featureType:
          "raised_intersection",
      },
    ];

  const results =
    await Promise.all(
      layers.map((layer) =>
        queryTrafficCalmingLayer({
          layer,
          latitude,
          longitude,
          searchRadiusMeters:
            radius,
        })
      )
    );

  return selectNearestCityTrafficCalmingFeature({
    latitude,
    longitude,
    searchRadiusMeters:
      radius,
    layers: results,
  });
}
