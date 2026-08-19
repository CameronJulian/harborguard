import {
  createHash,
} from "node:crypto";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  VEHICLE_LOCATION_ARCHIVE_BUCKET,
} from "@/lib/fleet/persistVehicleLocationArchiveObject";

export type VerifyVehicleLocationArchiveObjectInput = {
  supabase:
    SupabaseClient;

  objectKey:
    string;

  expectedSha256:
    string;

  expectedCompressedByteCount?:
    number;
};

export type VerifiedVehicleLocationArchiveObject = {
  bucket:
    typeof VEHICLE_LOCATION_ARCHIVE_BUCKET;

  objectKey:
    string;

  sha256:
    string;

  compressedByteCount:
    number;
};

function requireNonEmptyObjectKey(
  value: string
): string {
  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.endsWith("/") ||
    normalized.includes("\\") ||
    normalized.split("/").some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".."
    )
  ) {
    throw new Error(
      "Invalid vehicle location archive object key."
    );
  }

  return normalized;
}

function requireLowercaseSha256(
  value: string
): string {
  if (
    !/^[0-9a-f]{64}$/.test(
      value
    )
  ) {
    throw new Error(
      "Invalid expected vehicle location archive SHA-256."
    );
  }

  return value;
}

function requireExpectedByteCount(
  value:
    number | undefined
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      "Invalid expected vehicle location archive compressed byte count."
    );
  }

  return value;
}

export async function verifyVehicleLocationArchiveObject(
  input:
    VerifyVehicleLocationArchiveObjectInput
): Promise<
  VerifiedVehicleLocationArchiveObject
> {
  const objectKey =
    requireNonEmptyObjectKey(
      input.objectKey
    );

  const expectedSha256 =
    requireLowercaseSha256(
      input.expectedSha256
    );

  const expectedCompressedByteCount =
    requireExpectedByteCount(
      input.expectedCompressedByteCount
    );

  const {
    data,
    error,
  } =
    await input.supabase.storage
      .from(
        VEHICLE_LOCATION_ARCHIVE_BUCKET
      )
      .download(
        objectKey
      );

  if (error) {
    throw new Error(
      "Unable to download vehicle location archive object for verification: " +
        error.message
    );
  }

  if (data === null) {
    throw new Error(
      "Vehicle location archive verification returned no object data."
    );
  }

  const arrayBuffer =
    await data.arrayBuffer();

  const bytes =
    Buffer.from(
      arrayBuffer
    );

  if (
    expectedCompressedByteCount !== undefined &&
    bytes.byteLength !==
      expectedCompressedByteCount
  ) {
    throw new Error(
      "Vehicle location archive compressed byte count verification failed."
    );
  }

  const actualSha256 =
    createHash("sha256")
      .update(bytes)
      .digest("hex");

  if (
    actualSha256 !==
    expectedSha256
  ) {
    throw new Error(
      "Vehicle location archive SHA-256 verification failed."
    );
  }

  return {
    bucket:
      VEHICLE_LOCATION_ARCHIVE_BUCKET,

    objectKey,

    sha256:
      actualSha256,

    compressedByteCount:
      bytes.byteLength,
  };
}
