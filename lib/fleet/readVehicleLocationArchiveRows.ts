import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  VehicleLocationArchiveInputRow,
} from "@/lib/fleet/buildVehicleLocationArchiveObject";

const DEFAULT_PAGE_SIZE =
  1000;

const MAX_PAGE_SIZE =
  5000;

export type ReadVehicleLocationArchiveRowsInput = {
  supabase:
    SupabaseClient;

  organizationId:
    string;

  vehicleId:
    string;

  tripId:
    string | null;

  firstRecordedAt:
    string;

  lastRecordedAt:
    string;

  pageSize?:
    number;
};

type VehicleLocationArchiveDatabaseRow = {
  id:
    string;

  organization_id:
    string;

  vehicle_id:
    string;

  trip_id:
    string | null;

  latitude:
    number | string;

  longitude:
    number | string;

  speed_kmh:
    number | string | null;

  heading:
    number | string | null;

  recorded_at:
    string;
};

function requireNonEmptyString(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (normalized.length === 0) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-empty string.`
    );
  }

  return normalized;
}

function requireIsoTimestamp(
  value: string,
  fieldName: string
): string {
  const normalized =
    requireNonEmptyString(
      value,
      fieldName
    );

  const timestamp =
    Date.parse(
      normalized
    );

  if (Number.isNaN(timestamp)) {
    throw new Error(
      `Invalid ${fieldName}: expected a timestamp.`
    );
  }

  return new Date(
    timestamp
  ).toISOString();
}

function resolvePageSize(
  pageSize:
    number | undefined
): number {
  if (pageSize === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (
    !Number.isInteger(pageSize) ||
    pageSize <= 0 ||
    pageSize > MAX_PAGE_SIZE
  ) {
    throw new Error(
      `Invalid pageSize: expected an integer between 1 and ${MAX_PAGE_SIZE}.`
    );
  }

  return pageSize;
}

function requireDatabaseRow(
  value:
    unknown
): VehicleLocationArchiveDatabaseRow {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      "Invalid vehicle location archive row."
    );
  }

  return value as
    VehicleLocationArchiveDatabaseRow;
}

export async function readVehicleLocationArchiveRows(
  input:
    ReadVehicleLocationArchiveRowsInput
): Promise<
  VehicleLocationArchiveInputRow[]
> {
  const organizationId =
    requireNonEmptyString(
      input.organizationId,
      "organizationId"
    );

  const vehicleId =
    requireNonEmptyString(
      input.vehicleId,
      "vehicleId"
    );

  const tripId =
    input.tripId === null
      ? null
      : requireNonEmptyString(
          input.tripId,
          "tripId"
        );

  const firstRecordedAt =
    requireIsoTimestamp(
      input.firstRecordedAt,
      "firstRecordedAt"
    );

  const lastRecordedAt =
    requireIsoTimestamp(
      input.lastRecordedAt,
      "lastRecordedAt"
    );

  if (
    firstRecordedAt >
    lastRecordedAt
  ) {
    throw new Error(
      "Invalid archive window: firstRecordedAt must not be after lastRecordedAt."
    );
  }

  const pageSize =
    resolvePageSize(
      input.pageSize
    );

  const rows:
    VehicleLocationArchiveInputRow[] =
      [];

  let cursorRecordedAt:
    string | undefined;

  let cursorId:
    string | undefined;

  while (true) {
    let query =
      input.supabase
        .from(
          "vehicle_locations"
        )
        .select(
          [
            "id",
            "organization_id",
            "vehicle_id",
            "trip_id",
            "latitude",
            "longitude",
            "speed_kmh",
            "heading",
            "recorded_at",
          ].join(",")
        )
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "vehicle_id",
          vehicleId
        )
        .gte(
          "recorded_at",
          firstRecordedAt
        )
        .lte(
          "recorded_at",
          lastRecordedAt
        )
        .order(
          "recorded_at",
          {
            ascending: true,
          }
        )
        .order(
          "id",
          {
            ascending: true,
          }
        )
        .limit(
          pageSize
        );

    query =
      tripId === null
        ? query.is(
            "trip_id",
            null
          )
        : query.eq(
            "trip_id",
            tripId
          );

    if (
      cursorRecordedAt !== undefined &&
      cursorId !== undefined
    ) {
      query =
        query.or(
          [
            `recorded_at.gt.${cursorRecordedAt}`,
            [
              `recorded_at.eq.${cursorRecordedAt}`,
              `id.gt.${cursorId}`,
            ].join(","),
          ].join(",")
        );
    }

    const {
      data,
      error,
    } =
      await query;

    if (error) {
      throw new Error(
        "Unable to read vehicle location archive rows: " +
          error.message
      );
    }

    const page =
      Array.isArray(data)
        ? data.map(
            requireDatabaseRow
          )
        : [];

    for (const row of page) {
      rows.push({
        id:
          row.id,

        organization_id:
          row.organization_id,

        vehicle_id:
          row.vehicle_id,

        trip_id:
          row.trip_id,

        latitude:
          row.latitude,

        longitude:
          row.longitude,

        speed_kmh:
          row.speed_kmh,

        heading:
          row.heading,

        recorded_at:
          row.recorded_at,
      });
    }

    if (
      page.length <
      pageSize
    ) {
      break;
    }

    const finalRow =
      page[
        page.length - 1
      ];

    cursorRecordedAt =
      finalRow.recorded_at;

    cursorId =
      finalRow.id;
  }

  return rows;
}
