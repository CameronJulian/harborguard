import {
  getPointToPolylineDistanceMeters,
} from "../../geo/getPointToPolylineDistanceMeters.ts";

import type {
  OpenWatercourseContext,
  ResolveOpenWatercourseContextParams,
} from "../openWatercourseTypes.ts";

const DEFAULT_SEARCH_RADIUS_METERS = 100;
const MAX_SEARCH_RADIUS_METERS = 500;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CANDIDATE_LIMIT = 25;

/**
 * City of Cape Town:
 * Theme_Based/Water_Dashboard_Background
 * Layer 1 - Stormwater Open Watercourse.
 */
const DEFAULT_CITY_OPEN_WATERCOURSE_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Water_Dashboard_Background/MapServer/1/query";

type ArcGisPolylineGeometry = {
  paths?: unknown;
};

export type ArcGisOpenWatercourseFeature = {
  attributes?: {
    OBJECTID?: unknown;
    CM_ID?: unknown;
    TYPE?: unknown;
    CHNL_MTRL?: unknown;
    FDPN_MTRL?: unknown;
    GRNT?: unknown;
    STS?: unknown;
    STRM_ORDR?: unknown;
    RVR_NAME?: unknown;
    OWC_CLS?: unknown;
    OWC_DSCR?: unknown;
    CTMT?: unknown;
    OWNRSHP?: unknown;
    MNT_AUTH?: unknown;
  };

  geometry?: ArcGisPolylineGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisOpenWatercourseFeature[];

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

function normalizeNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function normalizeInteger(
  value: unknown
): number | null {
  const numberValue =
    normalizeNumber(value);

  if (numberValue === null) {
    return null;
  }

  return Math.round(numberValue);
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

export function mapCityOfCapeTownOpenWatercourseFeature({
  feature,
  distanceMeters,
}: {
  feature: ArcGisOpenWatercourseFeature;
  distanceMeters: number;
}): OpenWatercourseContext | null {
  const attributes =
    feature?.attributes;

  if (
    !attributes ||
    !Number.isFinite(distanceMeters)
  ) {
    return null;
  }

  const providerFeatureId =
    normalizeString(
      attributes.CM_ID
    ) ??
    normalizeString(
      attributes.OBJECTID
    );

  const riverName =
    normalizeString(
      attributes.RVR_NAME
    );

  const watercourseType =
    normalizeString(
      attributes.TYPE
    );

  const classification =
    normalizeString(
      attributes.OWC_CLS
    );

  const description =
    normalizeString(
      attributes.OWC_DSCR
    );

  const channelMaterial =
    normalizeString(
      attributes.CHNL_MTRL
    );

  const floodplainMaterial =
    normalizeString(
      attributes.FDPN_MTRL
    );

  const gradient =
    normalizeNumber(
      attributes.GRNT
    );

  const status =
    normalizeString(
      attributes.STS
    );

  const streamOrder =
    normalizeInteger(
      attributes.STRM_ORDR
    );

  const catchment =
    normalizeString(
      attributes.CTMT
    );

  const ownership =
    normalizeString(
      attributes.OWNRSHP
    );

  const maintenanceAuthority =
    normalizeString(
      attributes.MNT_AUTH
    );

  if (
    !providerFeatureId &&
    !riverName &&
    !watercourseType &&
    !classification &&
    !description &&
    !catchment
  ) {
    return null;
  }

  return {
    provider:
      "city_of_cape_town",

    providerFeatureId,

    riverName,

    watercourseType,

    classification,

    description,

    channelMaterial,

    floodplainMaterial,

    gradient,

    status,

    streamOrder,

    catchment,

    ownership,

    maintenanceAuthority,

    distanceMeters:
      Math.max(
        0,
        Math.round(
          distanceMeters
        )
      ),
  };
}

export function selectNearestCityOpenWatercourseFeature({
  latitude,
  longitude,
  features,
}: {
  latitude: number;
  longitude: number;
  features: ArcGisOpenWatercourseFeature[];
}): OpenWatercourseContext | null {
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
          mapCityOfCapeTownOpenWatercourseFeature({
            feature,
            distanceMeters: distance,
          });

        if (!context) {
          return null;
        }

        return {
          context,
          distance,
          objectId:
            Number(
              feature?.attributes?.OBJECTID
            ) ||
            Number.MAX_SAFE_INTEGER,
        };
      })
      .filter(
        (
          candidate
        ): candidate is {
          context: OpenWatercourseContext;
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
        Math.abs(
          distanceDifference
        ) > 0.001
      ) {
        return distanceDifference;
      }

      const firstId =
        first.context
          .providerFeatureId ??
        "";

      const secondId =
        second.context
          .providerFeatureId ??
        "";

      const idComparison =
        firstId.localeCompare(
          secondId
        );

      if (idComparison !== 0) {
        return idComparison;
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
}: Required<ResolveOpenWatercourseContextParams>) {
  const baseUrl =
    process.env
      .CITY_OF_CAPE_TOWN_OPEN_WATERCOURSE_URL
      ?.trim() ||
    DEFAULT_CITY_OPEN_WATERCOURSE_URL;

  const params =
    new URLSearchParams({
      f: "json",

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

      outFields: [
        "OBJECTID",
        "CM_ID",
        "TYPE",
        "CHNL_MTRL",
        "FDPN_MTRL",
        "GRNT",
        "STS",
        "STRM_ORDR",
        "RVR_NAME",
        "OWC_CLS",
        "OWC_DSCR",
        "CTMT",
        "OWNRSHP",
        "MNT_AUTH",
      ].join(","),

      returnGeometry:
        "true",

      resultRecordCount:
        String(
          DEFAULT_CANDIDATE_LIMIT
        ),
    });

  return `${baseUrl}?${params.toString()}`;
}

export async function resolveCityOfCapeTownOpenWatercourseContext({
  latitude,
  longitude,
  searchRadiusMeters =
    DEFAULT_SEARCH_RADIUS_METERS,
}: ResolveOpenWatercourseContextParams): Promise<OpenWatercourseContext | null> {
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
      MAX_SEARCH_RADIUS_METERS,
      Math.max(
        10,
        Math.round(
          Number(
            searchRadiusMeters
          ) ||
          DEFAULT_SEARCH_RADIUS_METERS
        )
      )
    );

  const url =
    buildQueryUrl({
      latitude,
      longitude,
      searchRadiusMeters:
        radius,
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
          "[City open watercourse context] ArcGIS request failed:",
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
          "[City open watercourse context] ArcGIS returned an error:",
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

      return selectNearestCityOpenWatercourseFeature({
        latitude,
        longitude,
        features,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      "[City open watercourse context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}