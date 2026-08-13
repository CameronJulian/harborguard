import type {
  PedestrianContext,
  ResolvePedestrianContextParams,
} from "@/lib/road-context/pedestrianContextTypes";

const EARTH_RADIUS_METERS = 6371e3;

const DEFAULT_SEARCH_RADIUS_METERS = 150;
const MAX_SEARCH_RADIUS_METERS = 250;
const MIN_SEARCH_RADIUS_METERS = 10;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CANDIDATE_LIMIT = 25;

const DEFAULT_PEDESTRIAN_CROSSING_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_12/FeatureServer/9/query";

type ArcGisPointGeometry = {
  x?: unknown;
  y?: unknown;
};

export type ArcGisPedestrianCrossingFeature = {
  attributes?: {
    OBJECTID?: unknown;
    GlobalID?: unknown;
    OWNRSHP?: unknown;
    SAP_USR_STS?: unknown;
    RAISED?: unknown;
  };

  geometry?: ArcGisPointGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisPedestrianCrossingFeature[];
  exceededTransferLimit?: boolean;
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

function normalizeString(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStatusCode(value: unknown): number | null {
  const statusCode = Number(value);
  return Number.isFinite(statusCode) ? statusCode : null;
}

function normalizeRaised(value: unknown): boolean | null {
  const raised = Number(value);

  if (!Number.isFinite(raised)) {
    return null;
  }

  if (raised === 1) {
    return true;
  }

  if (raised === 0) {
    return false;
  }

  return null;
}

function isValidCoordinate(latitude: number, longitude: number) {
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
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) {
  const firstLatitudeRadians =
    (first.latitude * Math.PI) / 180;

  const secondLatitudeRadians =
    (second.latitude * Math.PI) / 180;

  const latitudeDifferenceRadians =
    ((second.latitude - first.latitude) * Math.PI) / 180;

  const longitudeDifferenceRadians =
    ((second.longitude - first.longitude) * Math.PI) / 180;

  const haversineValue =
    Math.sin(latitudeDifferenceRadians / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDifferenceRadians / 2) ** 2;

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    )
  );
}

function normalizeRadius(searchRadiusMeters: unknown) {
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

function getLayerUrl() {
  return (
    process.env.CITY_OF_CAPE_TOWN_PEDESTRIAN_CROSSING_URL
      ?.trim() ||
    DEFAULT_PEDESTRIAN_CROSSING_URL
  );
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
  const params = new URLSearchParams({
    f: "json",
    geometry: `${longitude},${latitude}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(searchRadiusMeters),
    units: "esriSRUnit_Meter",
    outFields: [
      "OBJECTID",
      "GlobalID",
      "OWNRSHP",
      "SAP_USR_STS",
      "RAISED",
    ].join(","),
    returnGeometry: "true",
    resultRecordCount: String(DEFAULT_CANDIDATE_LIMIT),
  });

  return `${getLayerUrl()}?${params.toString()}`;
}

export function mapCityOfCapeTownPedestrianCrossingFeature({
  feature,
  distanceMeters,
}: {
  feature: ArcGisPedestrianCrossingFeature;
  distanceMeters: number;
}): PedestrianContext | null {
  const attributes = feature?.attributes;
  const longitude = Number(feature?.geometry?.x);
  const latitude = Number(feature?.geometry?.y);

  if (!attributes || !isValidCoordinate(latitude, longitude)) {
    return null;
  }

  const providerFeatureId =
    normalizeString(attributes.GlobalID) ??
    normalizeString(attributes.OBJECTID);

  if (!providerFeatureId) {
    return null;
  }

  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }

  return {
    provider: "city_of_cape_town",
    featureType: "pedestrian_crossing",
    providerFeatureId,
    ownership: normalizeString(attributes.OWNRSHP),
    statusCode: normalizeStatusCode(attributes.SAP_USR_STS),
    raised: normalizeRaised(attributes.RAISED),
    latitude,
    longitude,
    distanceMeters: Math.max(0, Math.round(distanceMeters)),
  };
}

export function selectNearestCityPedestrianCrossing({
  latitude,
  longitude,
  searchRadiusMeters,
  features,
}: {
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
  features: ArcGisPedestrianCrossingFeature[];
}): PedestrianContext | null {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  const candidates = features
    .map((feature) => {
      const featureLongitude = Number(feature?.geometry?.x);
      const featureLatitude = Number(feature?.geometry?.y);

      if (!isValidCoordinate(featureLatitude, featureLongitude)) {
        return null;
      }

      const distance = getPointDistanceMeters(
        { latitude, longitude },
        {
          latitude: featureLatitude,
          longitude: featureLongitude,
        }
      );

      if (!Number.isFinite(distance) || distance > searchRadiusMeters) {
        return null;
      }

      const context =
        mapCityOfCapeTownPedestrianCrossingFeature({
          feature,
          distanceMeters: distance,
        });

      if (!context) {
        return null;
      }

      return { context, distance };
    })
    .filter(
      (candidate): candidate is {
        context: PedestrianContext;
        distance: number;
      } => candidate !== null
    );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((first, second) => {
    const distanceDifference =
      first.distance - second.distance;

    if (Math.abs(distanceDifference) > 0.001) {
      return distanceDifference;
    }

    return first.context.providerFeatureId.localeCompare(
      second.context.providerFeatureId
    );
  });

  return candidates[0].context;
}

export async function resolveCityOfCapeTownPedestrianContext({
  latitude,
  longitude,
  searchRadiusMeters = DEFAULT_SEARCH_RADIUS_METERS,
}: ResolvePedestrianContextParams): Promise<PedestrianContext | null> {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  const radius = normalizeRadius(searchRadiusMeters);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      buildQueryUrl({
        latitude,
        longitude,
        searchRadiusMeters: radius,
      }),
      {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      console.warn(
        "[City pedestrian context] ArcGIS request failed:",
        response.status,
        response.statusText
      );

      return null;
    }

    const data =
      (await response.json()) as ArcGisQueryResponse;

    if (data?.error) {
      console.warn(
        "[City pedestrian context] ArcGIS returned an error:",
        data.error
      );

      return null;
    }

    return selectNearestCityPedestrianCrossing({
      latitude,
      longitude,
      searchRadiusMeters: radius,
      features: Array.isArray(data?.features)
        ? data.features
        : [],
    });
  } catch (error) {
    console.warn(
      "[City pedestrian context] lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  } finally {
    clearTimeout(timeout);
  }
}
