import {
  getPointToPolylineDistanceMeters,
} from "@/lib/geo/getPointToPolylineDistanceMeters";

const DEFAULT_MAXIMUM_AGE_MINUTES = 60;
const MAX_QUERY_ROWS = 500;
const MAX_FLOW_CORRIDORS = 20;

type TrafficFlowObservationRow = {
  provider_segment_id: string;
  provider_geometry: unknown;
  road_name: string | null;
  current_speed_kmh: number;
  free_flow_speed_kmh: number;
  congestion_percent: number;
  delay_minutes: number;
  confidence: number;
  jam_factor: number;
  observed_at: string;
};

export type LoadRecentTrafficFlowObservationsOptions = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maximumAgeMinutes?: number;
};

export type StoredTrafficFlowItem = {
  id: string;
  providerSegmentId: string;
  providerGeometry: unknown;
  road: string;
  currentSpeed: number;
  freeFlowSpeed: number;
  congestion: number;
  delayMinutes: number;
  confidence: number;
  jamFactor: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  source: "here_flow_stored";
  recommendedAction: string;
  observedAt: string;
  distanceMeters: number;
};

export type LoadRecentTrafficFlowObservationsResult = {
  rawCount: number;
  latestSegmentCount: number;
  flow: StoredTrafficFlowItem[];
};

function riskLevel(
  congestion: number
): StoredTrafficFlowItem["riskLevel"] {
  if (congestion >= 70) return "critical";
  if (congestion >= 40) return "high";
  if (congestion >= 20) return "medium";
  return "low";
}

function recommendation(congestion: number) {
  if (congestion >= 70) {
    return "Avoid corridor and prepare reroute.";
  }

  if (congestion >= 40) {
    return "Monitor ETA impact and consider alternate route.";
  }

  if (congestion >= 20) {
    return "Warn dispatcher of moderate delay.";
  }

  return "Traffic flow normal.";
}

function extractHereGeometryPaths(
  geometry: unknown
): [number, number][][] {
  if (
    !geometry ||
    typeof geometry !== "object"
  ) {
    return [];
  }

  const value = geometry as {
    links?: unknown;
  };

  if (!Array.isArray(value.links)) {
    return [];
  }

  return value.links.flatMap((link: any) => {
    if (!Array.isArray(link?.points)) {
      return [];
    }

    const path = link.points
      .filter(
        (point: any) =>
          Number.isFinite(Number(point?.lat)) &&
          Number.isFinite(Number(point?.lng))
      )
      .map(
        (point: any): [number, number] => [
          Number(point.lng),
          Number(point.lat),
        ]
      );

    return path.length > 0
      ? [path]
      : [];
  });
}

function finiteNumber(
  value: unknown,
  fallback = 0
) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
}

export async function loadRecentTrafficFlowObservations(
  supabase: any,
  organizationId: string,
  options: LoadRecentTrafficFlowObservationsOptions
): Promise<LoadRecentTrafficFlowObservationsResult> {
  const normalizedOrganizationId =
    organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new Error(
      "organizationId is required to load traffic-flow observations."
    );
  }

  const latitude = Number(options.latitude);
  const longitude = Number(options.longitude);
  const radiusMeters = Number(options.radiusMeters);

  const maximumAgeMinutes = Number(
    options.maximumAgeMinutes ??
      DEFAULT_MAXIMUM_AGE_MINUTES
  );

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0 ||
    !Number.isFinite(maximumAgeMinutes) ||
    maximumAgeMinutes <= 0
  ) {
    throw new Error(
      "Valid latitude, longitude, radiusMeters, and maximumAgeMinutes are required to load traffic-flow observations."
    );
  }

  const cutoff =
    new Date(
      Date.now() -
        maximumAgeMinutes * 60 * 1000
    ).toISOString();

  const {
    data,
    error,
  } = await supabase
    .from("traffic_flow_observations")
    .select(`
      provider_segment_id,
      provider_geometry,
      road_name,
      current_speed_kmh,
      free_flow_speed_kmh,
      congestion_percent,
      delay_minutes,
      confidence,
      jam_factor,
      observed_at
    `)
    .eq(
      "organization_id",
      normalizedOrganizationId
    )
    .eq("provider", "here")
    .gte("observed_at", cutoff)
    .order("observed_at", {
      ascending: false,
    })
    .limit(MAX_QUERY_ROWS);

  if (error) {
    throw error;
  }

  const rows =
    (data || []) as TrafficFlowObservationRow[];

  /*
   * Rows are ordered newest-first.
   *
   * Keep only the newest observation for each
   * provider segment before geographic filtering
   * so historical measurements are never treated
   * as simultaneous traffic conditions.
   */
  const latestBySegment =
    new Map<string, TrafficFlowObservationRow>();

  for (const row of rows) {
    const providerSegmentId =
      String(
        row.provider_segment_id || ""
      ).trim();

    if (
      !providerSegmentId ||
      latestBySegment.has(providerSegmentId)
    ) {
      continue;
    }

    latestBySegment.set(
      providerSegmentId,
      row
    );
  }

  const flow =
    Array.from(latestBySegment.values())
      .flatMap((row) => {
        const paths =
          extractHereGeometryPaths(
            row.provider_geometry
          );

        if (paths.length === 0) {
          return [];
        }

        const distanceMeters =
          getPointToPolylineDistanceMeters(
            {
              latitude,
              longitude,
            },
            paths
          );

        if (
          distanceMeters === null ||
          !Number.isFinite(distanceMeters) ||
          distanceMeters > radiusMeters
        ) {
          return [];
        }

        const providerSegmentId =
          String(
            row.provider_segment_id
          ).trim();

        const congestion = Math.max(
          0,
          Math.min(
            100,
            finiteNumber(
              row.congestion_percent
            )
          )
        );

        return [
          {
            id: providerSegmentId,
            providerSegmentId,
            providerGeometry:
              row.provider_geometry,
            road:
              row.road_name?.trim() ||
              "HERE road segment",
            currentSpeed: Math.max(
              0,
              finiteNumber(
                row.current_speed_kmh
              )
            ),
            freeFlowSpeed: Math.max(
              0,
              finiteNumber(
                row.free_flow_speed_kmh
              )
            ),
            congestion,
            delayMinutes: Math.max(
              0,
              finiteNumber(
                row.delay_minutes
              )
            ),
            confidence: Math.max(
              0,
              finiteNumber(
                row.confidence
              )
            ),
            jamFactor: Math.max(
              0,
              finiteNumber(
                row.jam_factor
              )
            ),
            riskLevel:
              riskLevel(congestion),
            source:
              "here_flow_stored" as const,
            recommendedAction:
              recommendation(congestion),
            observedAt:
              row.observed_at,
            distanceMeters:
              Math.round(distanceMeters),
          },
        ];
      })
      .sort(
        (first, second) =>
          second.congestion -
          first.congestion
      )
      .slice(
        0,
        MAX_FLOW_CORRIDORS
      );

  return {
    rawCount: rows.length,
    latestSegmentCount:
      latestBySegment.size,
    flow,
  };
}
