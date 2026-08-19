import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  prepareVehicleLocationArchive,
} from "@/lib/fleet/prepareVehicleLocationArchive";

import {
  buildVehicleLocationArchiveObjectKey,
} from "@/lib/fleet/persistVehicleLocationArchiveObject";

import {
  verifyVehicleLocationArchiveObject,
} from "@/lib/fleet/verifyVehicleLocationArchiveObject";

const ARCHIVE_MANIFEST_TABLE =
  "vehicle_location_archive_manifests" as const;

type ArchiveManifestRow = {
  id:
    string;

  organization_id:
    string;

  vehicle_id:
    string;

  trip_id:
    string | null;

  archive_format:
    string;

  object_key:
    string;

  first_recorded_at:
    string;

  last_recorded_at:
    string;

  row_count:
    unknown;

  sha256:
    string;

  status:
    string;

  verified_at:
    string | null;

  failure_reason:
    string | null;
};

export type VehicleLocationArchivePruningIneligibleReason =
  | "manifest_not_found"
  | "manifest_not_verified"
  | "manifest_evidence_invalid"
  | "archive_object_verification_failed"
  | "live_evidence_unavailable"
  | "live_evidence_mismatch";

export type AssessVehicleLocationArchivePruningEligibilityInput = {
  supabase:
    SupabaseClient;

  manifestId:
    string;

  pageSize?:
    number;
};

export type VehicleLocationArchivePruningEligibility =
  | {
      eligible:
        false;

      manifestId:
        string;

      reason:
        VehicleLocationArchivePruningIneligibleReason;
    }
  | {
      eligible:
        true;

      manifestId:
        string;

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

      rowCount:
        number;

      objectKey:
        string;

      sha256:
        string;

      verifiedAt:
        string;
    };

function ineligible(
  manifestId:
    string,
  reason:
    VehicleLocationArchivePruningIneligibleReason
): VehicleLocationArchivePruningEligibility {
  return {
    eligible:
      false,

    manifestId,

    reason,
  };
}

function parsePositiveRowCount(
  value:
    unknown
): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function isLowercaseSha256(
  value:
    unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{64}$/.test(
      value
    )
  );
}

function isNonEmptyString(
  value:
    unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export async function assessVehicleLocationArchivePruningEligibility(
  input:
    AssessVehicleLocationArchivePruningEligibilityInput
): Promise<
  VehicleLocationArchivePruningEligibility
> {
  const manifestId =
    input.manifestId.trim();

  if (manifestId.length === 0) {
    throw new Error(
      "Vehicle location archive manifest id is required."
    );
  }

  const {
    data,
    error,
  } =
    await input.supabase
      .from(
        ARCHIVE_MANIFEST_TABLE
      )
      .select(
        [
          "id",
          "organization_id",
          "vehicle_id",
          "trip_id",
          "archive_format",
          "object_key",
          "first_recorded_at",
          "last_recorded_at",
          "row_count",
          "sha256",
          "status",
          "verified_at",
          "failure_reason",
        ].join(",")
      )
      .eq(
        "id",
        manifestId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to read vehicle location archive manifest for pruning eligibility: " +
        error.message
    );
  }

  if (!data) {
    return ineligible(
      manifestId,
      "manifest_not_found"
    );
  }

  const manifest =
    data as unknown as
      ArchiveManifestRow;

  if (
    manifest.status !==
      "verified"
  ) {
    return ineligible(
      manifestId,
      "manifest_not_verified"
    );
  }

  const expectedRowCount =
    parsePositiveRowCount(
      manifest.row_count
    );

  if (
    manifest.id !== manifestId ||
    !isNonEmptyString(
      manifest.organization_id
    ) ||
    !isNonEmptyString(
      manifest.vehicle_id
    ) ||
    manifest.archive_format !==
      "jsonl_gzip" ||
    !isNonEmptyString(
      manifest.object_key
    ) ||
    !isNonEmptyString(
      manifest.first_recorded_at
    ) ||
    !isNonEmptyString(
      manifest.last_recorded_at
    ) ||
    expectedRowCount === null ||
    !isLowercaseSha256(
      manifest.sha256
    ) ||
    !isNonEmptyString(
      manifest.verified_at
    ) ||
    manifest.failure_reason !==
      null
  ) {
    return ineligible(
      manifestId,
      "manifest_evidence_invalid"
    );
  }

  /*
   * Re-verify the immutable archive object before considering any
   * corresponding hot telemetry eligible for future pruning.
   *
   * This is intentionally read-only.
   */
  try {
    const verifiedObject =
      await verifyVehicleLocationArchiveObject({
        supabase:
          input.supabase,

        objectKey:
          manifest.object_key,

        expectedSha256:
          manifest.sha256,
      });

    if (
      verifiedObject.objectKey !==
        manifest.object_key ||
      verifiedObject.sha256 !==
        manifest.sha256
    ) {
      return ineligible(
        manifestId,
        "archive_object_verification_failed"
      );
    }
  }
  catch {
    return ineligible(
      manifestId,
      "archive_object_verification_failed"
    );
  }

  /*
   * Reconstruct the exact live evidence using only the verified
   * manifest's organization, vehicle, trip scope and time window.
   *
   * No caller-supplied organization/time widening is permitted.
   */
  let prepared:

    Awaited<
      ReturnType<
        typeof prepareVehicleLocationArchive
      >
    >;

  try {
    prepared =
      await prepareVehicleLocationArchive({
        supabase:
          input.supabase,

        organizationId:
          manifest.organization_id,

        vehicleId:
          manifest.vehicle_id,

        tripId:
          manifest.trip_id,

        firstRecordedAt:
          manifest.first_recorded_at,

        lastRecordedAt:
          manifest.last_recorded_at,

        pageSize:
          input.pageSize,
      });
  }
  catch {
    return ineligible(
      manifestId,
      "live_evidence_unavailable"
    );
  }

  const reconstructedObjectKey =
    buildVehicleLocationArchiveObjectKey(
      prepared.archive
    );

  /*
   * A verified manifest is necessary but not sufficient.
   *
   * Current hot evidence must still deterministically reproduce the
   * same ownership, scope, row count, time range, checksum and
   * content-addressed object identity.
   */
  if (
    prepared.archive.organizationId !==
      manifest.organization_id ||
    prepared.archive.vehicleId !==
      manifest.vehicle_id ||
    prepared.archive.tripId !==
      manifest.trip_id ||
    prepared.archive.firstRecordedAt !==
      manifest.first_recorded_at ||
    prepared.archive.lastRecordedAt !==
      manifest.last_recorded_at ||
    prepared.archive.rowCount !==
      expectedRowCount ||
    prepared.archive.sha256 !==
      manifest.sha256 ||
    reconstructedObjectKey !==
      manifest.object_key
  ) {
    return ineligible(
      manifestId,
      "live_evidence_mismatch"
    );
  }

  return {
    eligible:
      true,

    manifestId:
      manifest.id,

    organizationId:
      manifest.organization_id,

    vehicleId:
      manifest.vehicle_id,

    tripId:
      manifest.trip_id,

    firstRecordedAt:
      manifest.first_recorded_at,

    lastRecordedAt:
      manifest.last_recorded_at,

    rowCount:
      expectedRowCount,

    objectKey:
      manifest.object_key,

    sha256:
      manifest.sha256,

    verifiedAt:
      manifest.verified_at,
  };
}
