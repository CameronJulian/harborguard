import type {
  HarshBrakingCorroborationResult,
} from "@/lib/fleet/harshBrakingCorroboration";

export type TelemetryObservationInput = {
  organizationId: string;
  latitude: number;
  longitude: number;
  corroboration: HarshBrakingCorroborationResult;
  occurredAt: string;
  sourceVehicleId: string;
};

export type TelemetryObservation = {
  organizationId: string;
  telemetryType: "harsh_braking";
  status: "candidate" | "corroborated";
  latitude: number;
  longitude: number;
  occurredAt: string;
  sourceVehicleId: string;
  thresholdMet: boolean;
  distinctVehicleCount: number;
  distinctVehicleIds: string[];
  otherVehicleIds: string[];
  nearbyAlertCount: number;
  radiusMeters: number;
  timeWindowMinutes: number;
  windowStartedAt: string;
  windowEndedAt: string;
};

function requireNonEmptyString(
  value: string,
  fieldName: string
) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function requireValidLatitude(latitude: number) {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("latitude is invalid.");
  }

  return latitude;
}

function requireValidLongitude(longitude: number) {
  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("longitude is invalid.");
  }

  return longitude;
}

function requireValidTimestamp(
  value: string,
  fieldName: string
) {
  requireNonEmptyString(value, fieldName);

  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return value;
}

export async function createTelemetryObservation(
  input: TelemetryObservationInput
): Promise<TelemetryObservation> {
  const organizationId =
    requireNonEmptyString(
      input.organizationId,
      "organizationId"
    );

  const sourceVehicleId =
    requireNonEmptyString(
      input.sourceVehicleId,
      "sourceVehicleId"
    );

  const latitude =
    requireValidLatitude(input.latitude);

  const longitude =
    requireValidLongitude(input.longitude);

  const occurredAt =
    requireValidTimestamp(
      input.occurredAt,
      "occurredAt"
    );

  const { corroboration } = input;

  return {
    organizationId,
    telemetryType: "harsh_braking",
    status: corroboration.thresholdMet
      ? "corroborated"
      : "candidate",
    latitude,
    longitude,
    occurredAt,
    sourceVehicleId,
    thresholdMet:
      corroboration.thresholdMet,
    distinctVehicleCount:
      corroboration.distinctVehicleCount,
    distinctVehicleIds: [
      ...corroboration.distinctVehicleIds,
    ],
    otherVehicleIds: [
      ...corroboration.otherVehicleIds,
    ],
    nearbyAlertCount:
      corroboration.nearbyAlertCount,
    radiusMeters:
      corroboration.radiusMeters,
    timeWindowMinutes:
      corroboration.timeWindowMinutes,
    windowStartedAt:
      corroboration.windowStartedAt,
    windowEndedAt:
      corroboration.windowEndedAt,
  };
}
