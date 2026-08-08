export type UpdateLocationStatus =
  | "scheduled"
  | "en_route_to_port"
  | "collecting"
  | "en_route_to_fishery"
  | "delivered"
  | "cancelled"
  | "emergency";

export type UpdateLocationSource =
  | "mobile"
  | "hardware"
  | "manual";

export type UpdateLocationBody = {
  vehicleId?: string;
  tripId?: string | null;
  latitude?: number | string;
  longitude?: number | string;
  speedKmh?: number | string;
  heading?: number | string;
  source?: UpdateLocationSource;
  status?: UpdateLocationStatus;
  recordedAt?: string;
};

export type ParsedUpdateLocationInput = {
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  source: UpdateLocationSource;
  requestedStatus?: UpdateLocationStatus;
  recordedAt?: string;
};

export type ParseUpdateLocationInputResult =
  | {
      ok: true;
      value: ParsedUpdateLocationInput;
    }
  | {
      ok: false;
      error: string;
    };

export function parseFleetTelemetryNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    return Number(value);
  }

  return NaN;
}

export function parseUpdateLocationInput(
  body: UpdateLocationBody
): ParseUpdateLocationInputResult {
  const vehicleId = body.vehicleId;
  const tripId = body.tripId ?? null;
  const latitude = parseFleetTelemetryNumber(body.latitude);
  const longitude = parseFleetTelemetryNumber(body.longitude);

  const parsedSpeedKmh =
    parseFleetTelemetryNumber(body.speedKmh);

  const speedKmh =
    Number.isFinite(parsedSpeedKmh)
      ? parsedSpeedKmh
      : 0;

  const parsedHeading =
    parseFleetTelemetryNumber(body.heading);

  const heading =
    Number.isFinite(parsedHeading)
      ? parsedHeading
      : 0;

  const source =
    body.source || "mobile";

  const requestedStatus =
    body.status;

  let recordedAt: string | undefined;

  if (body.recordedAt !== undefined) {
    if (
      typeof body.recordedAt !== "string" ||
      body.recordedAt.trim() === ""
    ) {
      return {
        ok: false,
        error:
          "recordedAt must be a valid date-time string.",
      };
    }

    const parsedRecordedAt =
      new Date(body.recordedAt);

    if (
      Number.isNaN(
        parsedRecordedAt.getTime()
      )
    ) {
      return {
        ok: false,
        error:
          "recordedAt must be a valid date-time string.",
      };
    }

    recordedAt =
      parsedRecordedAt.toISOString();
  }

  if (!vehicleId) {
    return {
      ok: false,
      error: "vehicleId is required.",
    };
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      ok: false,
      error:
        "Valid latitude and longitude are required.",
    };
  }

  if (
    latitude < -90 ||
    latitude > 90
  ) {
    return {
      ok: false,
      error:
        "Latitude must be between -90 and 90.",
    };
  }

  if (
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      ok: false,
      error:
        "Longitude must be between -180 and 180.",
    };
  }

  return {
    ok: true,
    value: {
      vehicleId,
      tripId,
      latitude,
      longitude,
      speedKmh,
      heading,
      source,
      requestedStatus,
      recordedAt,
    },
  };
}
