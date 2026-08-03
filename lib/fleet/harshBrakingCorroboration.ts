const DEFAULT_TIME_WINDOW_MINUTES = 15;
const DEFAULT_RADIUS_METERS = 150;
const DEFAULT_MINIMUM_DISTINCT_VEHICLES = 2;

type HarshBrakingAlertRow = {
  id: string;
  vehicle_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
};

export type HarshBrakingCorroborationParams = {
  supabase: any;
  organizationId: string;
  currentVehicleId: string;
  latitude: number;
  longitude: number;
  occurredAt?: string;
  timeWindowMinutes?: number;
  radiusMeters?: number;
  minimumDistinctVehicles?: number;
};

export type NearbyHarshBrakingMatch = {
  alertId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  distanceMeters: number;
};

export type HarshBrakingCorroborationResult = {
  thresholdMet: boolean;
  timeWindowMinutes: number;
  radiusMeters: number;
  minimumDistinctVehicles: number;
  distinctVehicleCount: number;
  distinctVehicleIds: string[];
  otherVehicleIds: string[];
  nearbyAlertCount: number;
  nearbyAlerts: NearbyHarshBrakingMatch[];
  windowStartedAt: string;
  windowEndedAt: string;
};

function getDistanceMeters(
  first: {
    latitude: number;
    longitude: number;
  },
  second: {
    latitude: number;
    longitude: number;
  }
) {
  const earthRadiusMeters = 6371e3;

  const firstLatitudeRadians =
    (first.latitude * Math.PI) / 180;

  const secondLatitudeRadians =
    (second.latitude * Math.PI) / 180;

  const latitudeDifferenceRadians =
    ((second.latitude - first.latitude) * Math.PI) /
    180;

  const longitudeDifferenceRadians =
    ((second.longitude - first.longitude) *
      Math.PI) /
    180;

  const haversineValue =
    Math.sin(latitudeDifferenceRadians / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDifferenceRadians / 2) ** 2;

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    )
  );
}

function requirePositiveNumber(
  value: number,
  parameterName: string
) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `${parameterName} must be a positive number.`
    );
  }

  return value;
}

export async function findHarshBrakingCorroboration({
  supabase,
  organizationId,
  currentVehicleId,
  latitude,
  longitude,
  occurredAt = new Date().toISOString(),
  timeWindowMinutes =
    DEFAULT_TIME_WINDOW_MINUTES,
  radiusMeters = DEFAULT_RADIUS_METERS,
  minimumDistinctVehicles =
    DEFAULT_MINIMUM_DISTINCT_VEHICLES,
}: HarshBrakingCorroborationParams): Promise<HarshBrakingCorroborationResult> {
  if (!organizationId.trim()) {
    throw new Error("organizationId is required.");
  }

  if (!currentVehicleId.trim()) {
    throw new Error("currentVehicleId is required.");
  }

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("latitude is invalid.");
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("longitude is invalid.");
  }

  requirePositiveNumber(
    timeWindowMinutes,
    "timeWindowMinutes"
  );

  requirePositiveNumber(
    radiusMeters,
    "radiusMeters"
  );

  requirePositiveNumber(
    minimumDistinctVehicles,
    "minimumDistinctVehicles"
  );

  const windowEndedAtDate = new Date(occurredAt);

  if (
    !Number.isFinite(windowEndedAtDate.getTime())
  ) {
    throw new Error("occurredAt is invalid.");
  }

  const windowStartedAt = new Date(
    windowEndedAtDate.getTime() -
      timeWindowMinutes * 60 * 1000
  ).toISOString();

  const windowEndedAt =
    windowEndedAtDate.toISOString();

  const {
    data: recentAlerts,
    error: recentAlertsError,
  } = await supabase
    .from("vehicle_alerts")
    .select(`
      id,
      vehicle_id,
      latitude,
      longitude,
      created_at
    `)
    .eq("organization_id", organizationId)
    .eq("alert_type", "harsh_braking")
    .not("vehicle_id", "is", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .not("created_at", "is", null)
    .gte("created_at", windowStartedAt)
    .lte("created_at", windowEndedAt)
    .order("created_at", {
      ascending: false,
    });

  if (recentAlertsError) {
    throw recentAlertsError;
  }

  const nearbyAlerts: NearbyHarshBrakingMatch[] =
    (
      (recentAlerts || []) as HarshBrakingAlertRow[]
    )
      .map(
        (
          alert
        ): NearbyHarshBrakingMatch | null => {
          const alertLatitude = Number(
            alert.latitude
          );

          const alertLongitude = Number(
            alert.longitude
          );

          if (
            !alert.id ||
            !alert.vehicle_id ||
            !alert.created_at ||
            !Number.isFinite(alertLatitude) ||
            !Number.isFinite(alertLongitude)
          ) {
            return null;
          }

          const distanceMeters =
            getDistanceMeters(
              {
                latitude,
                longitude,
              },
              {
                latitude: alertLatitude,
                longitude: alertLongitude,
              }
            );

          if (
            !Number.isFinite(distanceMeters) ||
            distanceMeters > radiusMeters
          ) {
            return null;
          }

          return {
            alertId: String(alert.id),
            vehicleId: String(
              alert.vehicle_id
            ),
            latitude: alertLatitude,
            longitude: alertLongitude,
            createdAt: String(
              alert.created_at
            ),
            distanceMeters: Math.round(
              distanceMeters
            ),
          };
        }
      )
      .filter(
        (
          alert
        ): alert is NearbyHarshBrakingMatch =>
          alert !== null
      );

  const distinctVehicleIds = Array.from(
    new Set(
      nearbyAlerts.map(
        (alert) => alert.vehicleId
      )
    )
  ).sort();

  const otherVehicleIds =
    distinctVehicleIds.filter(
      (vehicleId) =>
        vehicleId !== currentVehicleId
    );

  return {
    thresholdMet:
      distinctVehicleIds.length >=
      minimumDistinctVehicles,
    timeWindowMinutes,
    radiusMeters,
    minimumDistinctVehicles,
    distinctVehicleCount:
      distinctVehicleIds.length,
    distinctVehicleIds,
    otherVehicleIds,
    nearbyAlertCount: nearbyAlerts.length,
    nearbyAlerts,
    windowStartedAt,
    windowEndedAt,
  };
}
