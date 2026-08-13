import type {
  ResolveRoadContextParams,
  RoadContext,
} from "@/lib/road-context/types";


type XYCoordinate = [number, number];

const EARTH_RADIUS_METERS = 6_371_000;

function isFiniteXYCoordinate(
  coordinate: unknown
): coordinate is XYCoordinate {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(Number(coordinate[0])) &&
    Number.isFinite(Number(coordinate[1]))
  );
}

function toLocalMeters(
  longitude: number,
  latitude: number,
  referenceLatitude: number
) {
  const latitudeRadians =
    (referenceLatitude * Math.PI) / 180;

  return {
    x:
      (longitude * Math.PI / 180) *
      EARTH_RADIUS_METERS *
      Math.cos(latitudeRadians),

    y:
      (latitude * Math.PI / 180) *
      EARTH_RADIUS_METERS,
  };
}

function getPointToSegmentDistanceMeters(
  latitude: number,
  longitude: number,
  start: XYCoordinate,
  end: XYCoordinate
): number | null {
  if (
    !isFiniteXYCoordinate(start) ||
    !isFiniteXYCoordinate(end)
  ) {
    return null;
  }

  const pointLocal = toLocalMeters(
    longitude,
    latitude,
    latitude
  );

  const startLocal = toLocalMeters(
    Number(start[0]),
    Number(start[1]),
    latitude
  );

  const endLocal = toLocalMeters(
    Number(end[0]),
    Number(end[1]),
    latitude
  );

  const dx = endLocal.x - startLocal.x;
  const dy = endLocal.y - startLocal.y;

  const lengthSquared =
    dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const distanceX =
      pointLocal.x - startLocal.x;

    const distanceY =
      pointLocal.y - startLocal.y;

    return Math.sqrt(
      distanceX * distanceX +
      distanceY * distanceY
    );
  }

  const projection =
    (
      (pointLocal.x - startLocal.x) * dx +
      (pointLocal.y - startLocal.y) * dy
    ) /
    lengthSquared;

  const clampedProjection =
    Math.max(
      0,
      Math.min(1, projection)
    );

  const nearestX =
    startLocal.x +
    clampedProjection * dx;

  const nearestY =
    startLocal.y +
    clampedProjection * dy;

  const distanceX =
    pointLocal.x - nearestX;

  const distanceY =
    pointLocal.y - nearestY;

  return Math.sqrt(
    distanceX * distanceX +
    distanceY * distanceY
  );
}

function getPointToPolylineDistanceMeters(
  point: {
    latitude: number;
    longitude: number;
  },
  paths: unknown
): number | null {
  if (!Array.isArray(paths)) {
    return null;
  }

  let minimumDistance: number | null = null;

  for (const path of paths) {
    if (!Array.isArray(path)) {
      continue;
    }

    const coordinates =
      path.filter(isFiniteXYCoordinate);

    if (coordinates.length === 1) {
      const pointLocal = toLocalMeters(
        point.longitude,
        point.latitude,
        point.latitude
      );

      const roadLocal = toLocalMeters(
        Number(coordinates[0][0]),
        Number(coordinates[0][1]),
        point.latitude
      );

      const distance =
        Math.sqrt(
          (pointLocal.x - roadLocal.x) ** 2 +
          (pointLocal.y - roadLocal.y) ** 2
        );

      if (
        minimumDistance === null ||
        distance < minimumDistance
      ) {
        minimumDistance = distance;
      }

      continue;
    }

    for (
      let index = 0;
      index < coordinates.length - 1;
      index += 1
    ) {
      const distance =
        getPointToSegmentDistanceMeters(
          point.latitude,
          point.longitude,
          coordinates[index],
          coordinates[index + 1]
        );

      if (
        distance !== null &&
        (
          minimumDistance === null ||
          distance < minimumDistance
        )
      ) {
        minimumDistance = distance;
      }
    }
  }

  return minimumDistance;
}
const DEFAULT_SEARCH_RADIUS_METERS = 75;

const DEFAULT_TIMEOUT_MS = 10_000;

const DEFAULT_CANDIDATE_LIMIT = 10;

/**
 * City of Cape Town Transport Road Centreline.
 */
const DEFAULT_CITY_ROAD_CENTRELINE_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_6/FeatureServer/8/query";

type ArcGisPolylineGeometry = {
  paths?: unknown;
};

type ArcGisRoadFeature = {
  attributes?: {
    OBJECTID?: unknown;
    ROAD_NAME?: unknown;
    SL_RCL_KEY?: unknown;
    TO_DRCT?: unknown;
    FROM_DRCT?: unknown;
    PROW_CLSF_CODE?: unknown;
    SPD_LMT?: unknown;
    SPD_LMT_SRC?: unknown;
    SURF_TYPE?: unknown;
    MNT_AUTH?: unknown;
    OWNRSHP?: unknown;
  };

  geometry?: ArcGisPolylineGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisRoadFeature[];

  exceededTransferLimit?: boolean;

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

function normalizeSpeedLimit(
  value: unknown
): number | null {
  const speedLimit = Number(value);

  if (
    !Number.isFinite(speedLimit) ||
    speedLimit <= 0 ||
    speedLimit > 200
  ) {
    return null;
  }

  return speedLimit;
}

function normalizeDirection(
  toDirection: unknown,
  fromDirection: unknown
): string | null {
  const to = normalizeString(toDirection);
  const from = normalizeString(fromDirection);

  if (to && from && to !== from) {
    return `${from} / ${to}`;
  }

  return to ?? from;
}

export function mapCityOfCapeTownRoadFeature(
  feature: ArcGisRoadFeature,
  distanceMeters: number | null = null
): RoadContext | null {
  const attributes = feature?.attributes;

  if (!attributes) {
    return null;
  }

  const providerSegmentId =
    normalizeString(attributes.SL_RCL_KEY) ??
    normalizeString(attributes.OBJECTID);

  const roadName =
    normalizeString(attributes.ROAD_NAME);

  const roadClassification =
    normalizeString(
      attributes.PROW_CLSF_CODE
    );

  const speedLimitKph =
    normalizeSpeedLimit(
      attributes.SPD_LMT
    );

  const speedLimitSource =
    normalizeString(
      attributes.SPD_LMT_SRC
    );

  const direction =
    normalizeDirection(
      attributes.TO_DRCT,
      attributes.FROM_DRCT
    );

  const surfaceType =
    normalizeString(
      attributes.SURF_TYPE
    );

  const maintenanceAuthority =
    normalizeString(
      attributes.MNT_AUTH
    );

  const ownership =
    normalizeString(
      attributes.OWNRSHP
    );

  if (
    !providerSegmentId &&
    !roadName &&
    !roadClassification &&
    speedLimitKph === null &&
    !surfaceType
  ) {
    return null;
  }

  return {
    provider: "city_of_cape_town",
    providerSegmentId,
    roadName,
    roadClassification,
    speedLimitKph,
    speedLimitSource,
    direction,
    surfaceType,
    maintenanceAuthority,
    ownership,
    distanceMeters:
      distanceMeters === null
        ? null
        : Math.max(
            0,
            Math.round(distanceMeters)
          ),
  };
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

function buildQueryUrl({
  latitude,
  longitude,
  searchRadiusMeters,
}: Required<ResolveRoadContextParams>) {
  const baseUrl =
    process.env
      .CITY_OF_CAPE_TOWN_ROAD_CENTRELINE_URL
      ?.trim() ||
    DEFAULT_CITY_ROAD_CENTRELINE_URL;

  const params =
    new URLSearchParams({
      f: "json",

      // ArcGIS uses X,Y = longitude,latitude.
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
        "ROAD_NAME",
        "SL_RCL_KEY",
        "TO_DRCT",
        "FROM_DRCT",
        "PROW_CLSF_CODE",
        "SPD_LMT",
        "SPD_LMT_SRC",
        "SURF_TYPE",
        "MNT_AUTH",
        "OWNRSHP",
      ].join(","),

      returnGeometry: "true",

      resultRecordCount:
        String(DEFAULT_CANDIDATE_LIMIT),
    });

  return `${baseUrl}?${params.toString()}`;
}

export function selectNearestCityRoadFeature({
  latitude,
  longitude,
  features,
}: {
  latitude: number;
  longitude: number;
  features: ArcGisRoadFeature[];
}): RoadContext | null {
  const candidates =
    features
      .map((feature) => {
        const distance =
          getPointToPolylineDistanceMeters(
            {
              latitude,
              longitude,
            },
            feature?.geometry?.paths
          );

        if (
          distance === null ||
          !Number.isFinite(distance)
        ) {
          return null;
        }

        const context =
          mapCityOfCapeTownRoadFeature(
            feature,
            distance
          );

        if (!context) {
          return null;
        }

        return {
          context,
          distance,
          objectId:
            Number(
              feature?.attributes?.OBJECTID
            ) || Number.MAX_SAFE_INTEGER,
        };
      })
      .filter(
        (
          candidate
        ): candidate is {
          context: RoadContext;
          distance: number;
          objectId: number;
        } => candidate !== null
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
        Math.abs(distanceDifference) >
        0.001
      ) {
        return distanceDifference;
      }

      const firstSegmentId =
        first.context.providerSegmentId ??
        "";

      const secondSegmentId =
        second.context.providerSegmentId ??
        "";

      const segmentComparison =
        firstSegmentId.localeCompare(
          secondSegmentId
        );

      if (segmentComparison !== 0) {
        return segmentComparison;
      }

      return (
        first.objectId -
        second.objectId
      );
    }
  );

  return candidates[0].context;
}

export async function resolveCityOfCapeTownRoadContext({
  latitude,
  longitude,
  searchRadiusMeters =
    DEFAULT_SEARCH_RADIUS_METERS,
}: ResolveRoadContextParams): Promise<RoadContext | null> {
  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const radius =
    Math.min(
      250,
      Math.max(
        10,
        Math.round(
          Number(searchRadiusMeters) ||
            DEFAULT_SEARCH_RADIUS_METERS
        )
      )
    );

  const url = buildQueryUrl({
    latitude,
    longitude,
    searchRadiusMeters: radius,
  });

  try {
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
          "[City road context] ArcGIS request failed:",
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
          "[City road context] ArcGIS returned an error:",
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

      if (
        features.length === 0
      ) {
        return null;
      }

      return selectNearestCityRoadFeature({
        latitude,
        longitude,
        features,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      "[City road context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}