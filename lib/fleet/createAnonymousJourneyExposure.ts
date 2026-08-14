import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateAnonymousJourneyExposureInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string;
};

type VehicleLocationPoint = {
  latitude: unknown;
  longitude: unknown;
  recorded_at: string | null;
};

type TraversalAccumulator = {
  segment_key: string;
  direction_bucket: number;
  hour_bucket: number;
  observed_date: string;
  trip_token: string;
  sample_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

function parseCoordinate(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function validCoordinate(
  latitude: number,
  longitude: number
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function segmentKey(
  latitude: number,
  longitude: number
): string {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
}

function movementBearingDegrees(
  previousLatitude: number,
  previousLongitude: number,
  latitude: number,
  longitude: number
): number {
  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const toDegrees = (radians: number) =>
    (radians * 180) / Math.PI;

  const previousLatRadians =
    toRadians(previousLatitude);

  const latitudeRadians =
    toRadians(latitude);

  const deltaLongitude =
    toRadians(longitude - previousLongitude);

  const y =
    Math.sin(deltaLongitude) *
    Math.cos(latitudeRadians);

  const x =
    Math.cos(previousLatRadians) *
      Math.sin(latitudeRadians) -
    Math.sin(previousLatRadians) *
      Math.cos(latitudeRadians) *
      Math.cos(deltaLongitude);

  const bearing =
    toDegrees(Math.atan2(y, x));

  return (bearing + 360) % 360;
}

function directionBucket(
  bearingDegrees: number
): number {
  return (
    Math.floor(
      ((bearingDegrees + 22.5) % 360) / 45
    ) % 8
  );
}

function anonymousTripToken(
  tripId: string
): string {
  return createHash("sha256")
    .update(
      `harborguard:crowd-segment-traversal:v1:${tripId}`
    )
    .digest("hex");
}

export async function createAnonymousJourneyExposure({
  supabase,
  organizationId,
  vehicleId,
  tripId,
}: CreateAnonymousJourneyExposureInput) {
  const { data: trip, error: tripError } =
    await supabase
      .from("vehicle_trips")
      .select(
        "id, vehicle_id, actual_departure, actual_arrival, status"
      )
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();

  if (tripError) {
    throw tripError;
  }

  if (
    !trip ||
    trip.status !== "delivered" ||
    !trip.actual_departure ||
    !trip.actual_arrival
  ) {
    return {
      created: 0,
      skipped: true,
      reason: "trip_not_delivered",
    };
  }

  const observationStartedAt =
    String(trip.actual_departure);

  const observationEndedAt =
    String(trip.actual_arrival);

  const { data: locations, error: locationsError } =
    await supabase
      .from("vehicle_locations")
      .select(
        "latitude, longitude, recorded_at"
      )
      .eq("organization_id", organizationId)
      .eq("vehicle_id", vehicleId)
      .eq("trip_id", tripId)
      .gte("recorded_at", observationStartedAt)
      .lte("recorded_at", observationEndedAt)
      .order("recorded_at", { ascending: true });

  if (locationsError) {
    throw locationsError;
  }

  const points = (
    (locations || []) as VehicleLocationPoint[]
  )
    .map((point) => {
      const latitude =
        parseCoordinate(point.latitude);

      const longitude =
        parseCoordinate(point.longitude);

      const recordedAt =
        point.recorded_at
          ? new Date(point.recorded_at)
          : null;

      if (
        latitude === null ||
        longitude === null ||
        !validCoordinate(latitude, longitude) ||
        !recordedAt ||
        Number.isNaN(recordedAt.getTime())
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
        recordedAt,
      };
    })
    .filter(
      (
        point
      ): point is {
        latitude: number;
        longitude: number;
        recordedAt: Date;
      } => point !== null
    );

  if (points.length < 2) {
    return {
      created: 0,
      skipped: true,
      reason: "insufficient_location_points",
    };
  }

  const tripToken =
    anonymousTripToken(tripId);

  const traversals =
    new Map<string, TraversalAccumulator>();

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    const previous = points[index - 1];
    const current = points[index];

    if (
      previous.latitude === current.latitude &&
      previous.longitude === current.longitude
    ) {
      continue;
    }

    const bearing =
      movementBearingDegrees(
        previous.latitude,
        previous.longitude,
        current.latitude,
        current.longitude
      );

    const direction =
      directionBucket(bearing);

    const key =
      segmentKey(
        current.latitude,
        current.longitude
      );

    const observedDate =
      current.recordedAt
        .toISOString()
        .slice(0, 10);

    const hourBucket =
      current.recordedAt.getUTCHours();

    const accumulatorKey =
      [
        key,
        direction,
        hourBucket,
        observedDate,
      ].join("|");

    const recordedAtIso =
      current.recordedAt.toISOString();

    const existing =
      traversals.get(accumulatorKey);

    if (existing) {
      existing.sample_count += 1;

      if (
        recordedAtIso <
        existing.first_seen_at
      ) {
        existing.first_seen_at =
          recordedAtIso;
      }

      if (
        recordedAtIso >
        existing.last_seen_at
      ) {
        existing.last_seen_at =
          recordedAtIso;
      }

      continue;
    }

    traversals.set(
      accumulatorKey,
      {
        segment_key: key,
        direction_bucket: direction,
        hour_bucket: hourBucket,
        observed_date: observedDate,
        trip_token: tripToken,
        sample_count: 1,
        first_seen_at: recordedAtIso,
        last_seen_at: recordedAtIso,
      }
    );
  }

  const rows =
    Array.from(traversals.values());

  if (rows.length === 0) {
    return {
      created: 0,
      skipped: true,
      reason: "no_movement_segments",
    };
  }

  const { error: upsertError } =
    await supabaseAdmin
      .from("crowd_segment_traversals")
      .upsert(rows, {
        onConflict:
          "trip_token,segment_key,direction_bucket,hour_bucket,observed_date",
        ignoreDuplicates: false,
      });

  if (upsertError) {
    throw upsertError;
  }

  const observedDates =
    rows
      .map((row) => row.observed_date)
      .sort();

  const startDate = observedDates[0];
  const endDate =
    observedDates[
      observedDates.length - 1
    ];

  const { error: aggregationError } =
    await supabaseAdmin.rpc(
      "aggregate_crowd_segment_exposure_stats",
      {
        p_start_date: startDate,
        p_end_date: endDate,
      }
    );

  if (aggregationError) {
    throw aggregationError;
  }

  return {
    created: rows.length,
    skipped: false,
  };
}
