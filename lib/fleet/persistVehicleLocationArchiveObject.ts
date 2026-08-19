import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  VehicleLocationArchiveObject,
} from "@/lib/fleet/buildVehicleLocationArchiveObject";

export const VEHICLE_LOCATION_ARCHIVE_BUCKET =
  "vehicle-location-archives" as const;

export type PersistVehicleLocationArchiveObjectInput = {
  supabase:
    SupabaseClient;

  archive:
    VehicleLocationArchiveObject;
};

export type PersistedVehicleLocationArchiveObject = {
  bucket:
    typeof VEHICLE_LOCATION_ARCHIVE_BUCKET;

  objectKey:
    string;

  sha256:
    string;

  compressedByteCount:
    number;
};

function requireLowercaseSha256(
  value: string
): string {
  if (
    !/^[0-9a-f]{64}$/.test(
      value
    )
  ) {
    throw new Error(
      "Invalid vehicle location archive SHA-256."
    );
  }

  return value;
}

function requirePathSegment(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized === "." ||
    normalized === ".."
  ) {
    throw new Error(
      `Invalid ${fieldName} archive path segment.`
    );
  }

  return normalized;
}

export function buildVehicleLocationArchiveObjectKey(
  archive:
    VehicleLocationArchiveObject
): string {
  const organizationId =
    requirePathSegment(
      archive.organizationId,
      "organizationId"
    );

  const vehicleId =
    requirePathSegment(
      archive.vehicleId,
      "vehicleId"
    );

  const tripScope =
    archive.tripId === null
      ? "unlinked"
      : requirePathSegment(
          archive.tripId,
          "tripId"
        );

  const sha256 =
    requireLowercaseSha256(
      archive.sha256
    );

  return [
    archive.version,
    organizationId,
    vehicleId,
    tripScope,
    `${sha256}.jsonl.gz`,
  ].join("/");
}

export async function persistVehicleLocationArchiveObject(
  input:
    PersistVehicleLocationArchiveObjectInput
): Promise<
  PersistedVehicleLocationArchiveObject
> {
  const objectKey =
    buildVehicleLocationArchiveObjectKey(
      input.archive
    );

  const payload =
    new Uint8Array(
      input.archive.bytes
    );

  const {
    error,
  } =
    await input.supabase.storage
      .from(
        VEHICLE_LOCATION_ARCHIVE_BUCKET
      )
      .upload(
        objectKey,
        payload,
        {
          contentType:
            "application/gzip",

          cacheControl:
            "31536000",

          upsert:
            false,
        }
      );

  if (error) {
    throw new Error(
      "Unable to persist vehicle location archive object: " +
        error.message
    );
  }

  return {
    bucket:
      VEHICLE_LOCATION_ARCHIVE_BUCKET,

    objectKey,

    sha256:
      input.archive.sha256,

    compressedByteCount:
      input.archive.compressedByteCount,
  };
}
