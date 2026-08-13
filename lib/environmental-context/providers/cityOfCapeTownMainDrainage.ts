import {
  getPointToPolylineDistanceMeters,
} from "../../geo/getPointToPolylineDistanceMeters.ts";

import type {
  MainDrainageContext,
  ResolveMainDrainageContextParams,
} from "../mainDrainageTypes.ts";

const DEFAULT_SEARCH_RADIUS_METERS = 100;
const MAX_SEARCH_RADIUS_METERS = 500;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CANDIDATE_LIMIT = 25;

/**
 * City of Cape Town
 * Theme_Based/Wayleave_Infrastructure
 * MapServer Layer 21 - Stormwater - Integrated Main Drainage.
 */
const DEFAULT_CITY_MAIN_DRAINAGE_URL =
  "https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Wayleave_Infrastructure/MapServer/21/query";

type ArcGisPolylineGeometry = {
  paths?: unknown;
};

export type ArcGisMainDrainageFeature = {
  attributes?: {
    OBJECTID?: unknown;
    CM_ID?: unknown;
    LU_TYPE_CDE_KEY?: unknown;
    TYPE?: unknown;
    CRS_SCTN?: unknown;
    MTRL?: unknown;
    NMNL_DMTR?: unknown;
    INTL_DMTR?: unknown;
    WDTH?: unknown;
    HGHT?: unknown;
    UPST_INVT_LVL?: unknown;
    DWNS_INVT_LVL?: unknown;
    GRNT?: unknown;
    CRSG?: unknown;
    LINK_FCN?: unknown;
    INTG_URB_DRNG?: unknown;
    DATE_CNST?: unknown;
    LCTN_DSCR?: unknown;
    CTMT?: unknown;
    DSTR?: unknown;
    PLNG_RGN?: unknown;
    CMNT?: unknown;
    SAP_OBJ_TYPE?: unknown;
    SAP_DESCR?: unknown;
    SAP_USR_STS?: unknown;
    FIN_KEY?: unknown;
    SYNC_DATE?: unknown;
    OWNRSHP?: unknown;
    MNT_AUTH?: unknown;
  };

  geometry?: ArcGisPolylineGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisMainDrainageFeature[];

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

  const numberValue =
    Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function normalizeNonNegativeNumber(
  value: unknown
): number | null {
  const numberValue =
    normalizeNumber(value);

  if (
    numberValue === null ||
    numberValue < 0
  ) {
    return null;
  }

  return numberValue;
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

export function mapCityOfCapeTownMainDrainageFeature({
  feature,
  distanceMeters,
}: {
  feature: ArcGisMainDrainageFeature;
  distanceMeters: number;
}): MainDrainageContext | null {
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

  const assetType =
    normalizeString(
      attributes.TYPE
    );

  const crossSection =
    normalizeString(
      attributes.CRS_SCTN
    );

  const material =
    normalizeString(
      attributes.MTRL
    );

  const nominalDiameterMm =
    normalizeNonNegativeNumber(
      attributes.NMNL_DMTR
    );

  const internalDiameterMm =
    normalizeNonNegativeNumber(
      attributes.INTL_DMTR
    );

  const widthMm =
    normalizeNonNegativeNumber(
      attributes.WDTH
    );

  const heightMm =
    normalizeNonNegativeNumber(
      attributes.HGHT
    );

  const upstreamInvertLevel =
    normalizeNumber(
      attributes.UPST_INVT_LVL
    );

  const downstreamInvertLevel =
    normalizeNumber(
      attributes.DWNS_INVT_LVL
    );

  const gradient =
    normalizeNumber(
      attributes.GRNT
    );

  const crossing =
    normalizeString(
      attributes.CRSG
    );

  const linkFunction =
    normalizeString(
      attributes.LINK_FCN
    );

  const integratedUrbanDrainage =
    normalizeString(
      attributes.INTG_URB_DRNG
    );

  const dateConstructed =
    normalizeInteger(
      attributes.DATE_CNST
    );

  const locationDescription =
    normalizeString(
      attributes.LCTN_DSCR
    );

  const catchment =
    normalizeString(
      attributes.CTMT
    );

  const district =
    normalizeInteger(
      attributes.DSTR
    );

  const planningRegion =
    normalizeString(
      attributes.PLNG_RGN
    );

  const comment =
    normalizeString(
      attributes.CMNT
    );

  const sapObjectType =
    normalizeString(
      attributes.SAP_OBJ_TYPE
    );

  const sapDescription =
    normalizeString(
      attributes.SAP_DESCR
    );

  const sapUserStatus =
    normalizeInteger(
      attributes.SAP_USR_STS
    );

  const financialAssetKey =
    normalizeString(
      attributes.FIN_KEY
    );

  const syncDate =
    normalizeInteger(
      attributes.SYNC_DATE
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
    !assetType &&
    !locationDescription &&
    !catchment &&
    !sapDescription
  ) {
    return null;
  }

  return {
    provider:
      "city_of_cape_town",

    providerFeatureId,

    assetType,

    crossSection,

    material,

    nominalDiameterMm,

    internalDiameterMm,

    widthMm,

    heightMm,

    upstreamInvertLevel,

    downstreamInvertLevel,

    gradient,

    crossing,

    linkFunction,

    integratedUrbanDrainage,

    dateConstructed,

    locationDescription,

    catchment,

    district,

    planningRegion,

    comment,

    sapObjectType,

    sapDescription,

    sapUserStatus,

    financialAssetKey,

    syncDate,

    ownership,

    maintenanceAuthority,

    distanceMeters:
      Math.max(
        0,
        Math.round(distanceMeters)
      ),
  };
}

export function selectNearestCityMainDrainageFeature({
  latitude,
  longitude,
  features,
}: {
  latitude: number;
  longitude: number;
  features: ArcGisMainDrainageFeature[];
}): MainDrainageContext | null {
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
          mapCityOfCapeTownMainDrainageFeature({
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
              feature
                ?.attributes
                ?.OBJECTID
            ) ||
            Number.MAX_SAFE_INTEGER,
        };
      })
      .filter(
        (
          candidate
        ): candidate is {
          context: MainDrainageContext;
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
}: Required<ResolveMainDrainageContextParams>) {
  const baseUrl =
    process.env
      .CITY_OF_CAPE_TOWN_MAIN_DRAINAGE_URL
      ?.trim() ||
    DEFAULT_CITY_MAIN_DRAINAGE_URL;

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
        "LU_TYPE_CDE_KEY",
        "TYPE",
        "CRS_SCTN",
        "MTRL",
        "NMNL_DMTR",
        "INTL_DMTR",
        "WDTH",
        "HGHT",
        "UPST_INVT_LVL",
        "DWNS_INVT_LVL",
        "GRNT",
        "CRSG",
        "LINK_FCN",
        "INTG_URB_DRNG",
        "DATE_CNST",
        "LCTN_DSCR",
        "CTMT",
        "DSTR",
        "PLNG_RGN",
        "CMNT",
        "SAP_OBJ_TYPE",
        "SAP_DESCR",
        "SAP_USR_STS",
        "FIN_KEY",
        "SYNC_DATE",
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

export async function resolveCityOfCapeTownMainDrainageContext({
  latitude,
  longitude,
  searchRadiusMeters =
    DEFAULT_SEARCH_RADIUS_METERS,
}: ResolveMainDrainageContextParams): Promise<MainDrainageContext | null> {
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
          "[City main drainage context] ArcGIS request failed:",
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
          "[City main drainage context] ArcGIS returned an error:",
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

      return selectNearestCityMainDrainageFeature({
        latitude,
        longitude,
        features,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      "[City main drainage context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
