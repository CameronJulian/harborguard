import {
  createHash,
} from "node:crypto";

import {
  gzipSync,
  gunzipSync,
} from "node:zlib";

export const VEHICLE_LOCATION_ARCHIVE_OBJECT_VERSION =
  "harborguard-vehicle-location-archive-v1" as const;

export const VEHICLE_LOCATION_ARCHIVE_FORMAT =
  "jsonl_gzip" as const;

export type VehicleLocationArchiveInputRow = {
  id: string;
  organization_id: string;
  vehicle_id: string;
  trip_id: string | null;
  latitude: number | string;
  longitude: number | string;
  speed_kmh: number | string | null;
  heading: number | string | null;
  recorded_at: string;
};

export type VehicleLocationArchiveCanonicalRow = {
  version:
    typeof VEHICLE_LOCATION_ARCHIVE_OBJECT_VERSION;

  id: string;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;

  latitude: number;
  longitude: number;
  speedKmh: number | null;
  heading: number | null;

  recordedAt: string;
};

export type VehicleLocationArchiveObject = {
  version:
    typeof VEHICLE_LOCATION_ARCHIVE_OBJECT_VERSION;

  archiveFormat:
    typeof VEHICLE_LOCATION_ARCHIVE_FORMAT;

  organizationId: string;
  vehicleId: string;
  tripId: string | null;

  firstRecordedAt: string;
  lastRecordedAt: string;

  rowCount: number;

  sha256: string;

  uncompressedByteCount: number;
  compressedByteCount: number;

  bytes: Buffer;
};

function requireNonEmptyString(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-empty string.`
    );
  }

  return value.trim();
}

function optionalNonEmptyString(
  value: unknown,
  fieldName: string
): string | null {
  if (value === null) {
    return null;
  }

  return requireNonEmptyString(
    value,
    fieldName
  );
}

function requireFiniteNumber(
  value: unknown,
  fieldName: string
): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" &&
          value.trim().length > 0
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    throw new Error(
      `Invalid ${fieldName}: expected a finite number.`
    );
  }

  return numeric;
}

function optionalFiniteNumber(
  value: unknown,
  fieldName: string
): number | null {
  if (value === null) {
    return null;
  }

  return requireFiniteNumber(
    value,
    fieldName
  );
}

function requireIsoTimestamp(
  value: unknown,
  fieldName: string
): string {
  const raw =
    requireNonEmptyString(
      value,
      fieldName
    );

  const milliseconds =
    Date.parse(raw);

  if (Number.isNaN(milliseconds)) {
    throw new Error(
      `Invalid ${fieldName}: expected a timestamp.`
    );
  }

  return new Date(
    milliseconds
  ).toISOString();
}

function compareCanonicalRows(
  left: VehicleLocationArchiveCanonicalRow,
  right: VehicleLocationArchiveCanonicalRow
): number {
  const byRecordedAt =
    left.recordedAt.localeCompare(
      right.recordedAt
    );

  if (byRecordedAt !== 0) {
    return byRecordedAt;
  }

  return left.id.localeCompare(
    right.id
  );
}

function canonicalizeRow(
  row: VehicleLocationArchiveInputRow
): VehicleLocationArchiveCanonicalRow {
  return {
    version:
      VEHICLE_LOCATION_ARCHIVE_OBJECT_VERSION,

    id:
      requireNonEmptyString(
        row.id,
        "row.id"
      ),

    organizationId:
      requireNonEmptyString(
        row.organization_id,
        "row.organization_id"
      ),

    vehicleId:
      requireNonEmptyString(
        row.vehicle_id,
        "row.vehicle_id"
      ),

    tripId:
      optionalNonEmptyString(
        row.trip_id,
        "row.trip_id"
      ),

    latitude:
      requireFiniteNumber(
        row.latitude,
        "row.latitude"
      ),

    longitude:
      requireFiniteNumber(
        row.longitude,
        "row.longitude"
      ),

    speedKmh:
      optionalFiniteNumber(
        row.speed_kmh,
        "row.speed_kmh"
      ),

    heading:
      optionalFiniteNumber(
        row.heading,
        "row.heading"
      ),

    recordedAt:
      requireIsoTimestamp(
        row.recorded_at,
        "row.recorded_at"
      ),
  };
}

function assertSingleArchiveScope(
  rows: readonly VehicleLocationArchiveCanonicalRow[]
) {
  if (rows.length === 0) {
    throw new Error(
      "Vehicle location archive requires at least one row."
    );
  }

  const first =
    rows[0];

  for (const row of rows) {
    if (
      row.organizationId !==
      first.organizationId
    ) {
      throw new Error(
        "Vehicle location archive cannot span organizations."
      );
    }

    if (
      row.vehicleId !==
      first.vehicleId
    ) {
      throw new Error(
        "Vehicle location archive cannot span vehicles."
      );
    }

    if (
      row.tripId !==
      first.tripId
    ) {
      throw new Error(
        "Vehicle location archive cannot mix trip scopes."
      );
    }
  }
}

function serializeJsonLines(
  rows: readonly VehicleLocationArchiveCanonicalRow[]
): Buffer {
  const text =
    rows
      .map(
        (row) =>
          JSON.stringify(row)
      )
      .join("\n") +
    "\n";

  return Buffer.from(
    text,
    "utf8"
  );
}

export function buildVehicleLocationArchiveObject(
  inputRows: readonly VehicleLocationArchiveInputRow[]
): VehicleLocationArchiveObject {
  const rows =
    inputRows
      .map(canonicalizeRow)
      .sort(compareCanonicalRows);

  assertSingleArchiveScope(
    rows
  );

  const uncompressed =
    serializeJsonLines(
      rows
    );

  /*
   * Determinism is enforced by the archive regression contract:
   * identical canonical input must produce identical gzip bytes.
   *
   * Keep gzip configuration limited to properties supported by
   * the project's Node ZlibOptions type contract.
   */
  const bytes =
    gzipSync(
      uncompressed,
      {
        level: 9,
      }
    );

  const sha256 =
    createHash("sha256")
      .update(bytes)
      .digest("hex");

  const first =
    rows[0];

  const last =
    rows[
      rows.length - 1
    ];

  return {
    version:
      VEHICLE_LOCATION_ARCHIVE_OBJECT_VERSION,

    archiveFormat:
      VEHICLE_LOCATION_ARCHIVE_FORMAT,

    organizationId:
      first.organizationId,

    vehicleId:
      first.vehicleId,

    tripId:
      first.tripId,

    firstRecordedAt:
      first.recordedAt,

    lastRecordedAt:
      last.recordedAt,

    rowCount:
      rows.length,

    sha256,

    uncompressedByteCount:
      uncompressed.byteLength,

    compressedByteCount:
      bytes.byteLength,

    bytes,
  };
}

export function readVehicleLocationArchiveJsonLines(
  archiveBytes: Buffer
): VehicleLocationArchiveCanonicalRow[] {
  const raw =
    gunzipSync(
      archiveBytes
    ).toString("utf8");

  const lines =
    raw
      .split("\n")
      .filter(
        (line) =>
          line.length > 0
      );

  return lines.map(
    (line) =>
      JSON.parse(
        line
      ) as VehicleLocationArchiveCanonicalRow
  );
}
