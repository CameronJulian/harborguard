import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  prepareVehicleLocationArchive,
} from "@/lib/fleet/prepareVehicleLocationArchive";

import {
  buildVehicleLocationArchiveObjectKey,
  persistVehicleLocationArchiveObject,
} from "@/lib/fleet/persistVehicleLocationArchiveObject";

import {
  verifyVehicleLocationArchiveObject,
} from "@/lib/fleet/verifyVehicleLocationArchiveObject";

const ARCHIVE_MANIFEST_TABLE =
  "vehicle_location_archive_manifests" as const;

type ArchiveManifestStatus =
  | "pending"
  | "verified"
  | "failed";

type ArchiveManifestIdentity = {
  id:
    string;

  status:
    ArchiveManifestStatus;
};

export type RunVehicleLocationArchiveLifecycleInput = {
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

export type RunVehicleLocationArchiveLifecycleResult = {
  manifestId:
    string;

  status:
    "verified";

  objectKey:
    string;

  sha256:
    string;

  rowCount:
    number;

  compressedByteCount:
    number;

  verifiedAt:
    string;
};

function errorMessage(
  error:
    unknown
): string {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message.trim();
  }

  if (
    typeof error === "string" &&
    error.trim().length > 0
  ) {
    return error.trim();
  }

  return "Vehicle location archive lifecycle failed.";
}

async function markArchiveManifestFailed(
  input: {
    supabase:
      SupabaseClient;

    manifestId:
      string;

    failureReason:
      string;
  }
): Promise<void> {
  const failedAt =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await input.supabase
      .from(
        ARCHIVE_MANIFEST_TABLE
      )
      .update({
        status:
          "failed",

        verified_at:
          null,

        failure_reason:
          input.failureReason,

        updated_at:
          failedAt,
      })
      .eq(
        "id",
        input.manifestId
      )
      .eq(
        "status",
        "pending"
      )
      .select(
        "id,status"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    !data ||
    data.status !== "failed"
  ) {
    throw new Error(
      "Archive manifest could not transition from pending to failed."
    );
  }
}

export async function runVehicleLocationArchiveLifecycle(
  input:
    RunVehicleLocationArchiveLifecycleInput
): Promise<
  RunVehicleLocationArchiveLifecycleResult
> {
  const prepared =
    await prepareVehicleLocationArchive({
      supabase:
        input.supabase,

      organizationId:
        input.organizationId,

      vehicleId:
        input.vehicleId,

      tripId:
        input.tripId,

      firstRecordedAt:
        input.firstRecordedAt,

      lastRecordedAt:
        input.lastRecordedAt,

      pageSize:
        input.pageSize,
    });

  const objectKey =
    buildVehicleLocationArchiveObjectKey(
      prepared.archive
    );

  /*
   * The pending manifest is deliberately created before any object upload.
   * It records the exact archive evidence that the subsequent immutable
   * storage and verification steps are expected to satisfy.
   */
  const {
    data: pendingManifest,
    error: pendingManifestError,
  } =
    await input.supabase
      .from(
        ARCHIVE_MANIFEST_TABLE
      )
      .insert({
        organization_id:
          prepared.archive.organizationId,

        vehicle_id:
          prepared.archive.vehicleId,

        trip_id:
          prepared.archive.tripId,

        archive_format:
          "jsonl_gzip",

        object_key:
          objectKey,

        first_recorded_at:
          prepared.archive.firstRecordedAt,

        last_recorded_at:
          prepared.archive.lastRecordedAt,

        row_count:
          prepared.archive.rowCount,

        sha256:
          prepared.archive.sha256,

        status:
          "pending",

        verified_at:
          null,

        failure_reason:
          null,
      })
      .select(
        "id,status"
      )
      .single();

  if (
    pendingManifestError ||
    !pendingManifest
  ) {
    throw new Error(
      "Unable to create pending vehicle location archive manifest: " +
        (
          pendingManifestError?.message ??
          "manifest row was not returned"
        )
    );
  }

  const manifest =
    pendingManifest as
      ArchiveManifestIdentity;

  if (
    manifest.status !==
    "pending"
  ) {
    throw new Error(
      "New vehicle location archive manifest did not enter pending state."
    );
  }

  try {
    const persisted =
      await persistVehicleLocationArchiveObject({
        supabase:
          input.supabase,

        archive:
          prepared.archive,
      });

    if (
      persisted.objectKey !==
      objectKey
    ) {
      throw new Error(
        "Persisted vehicle location archive object identity does not match the pending manifest."
      );
    }

    if (
      persisted.sha256 !==
      prepared.archive.sha256
    ) {
      throw new Error(
        "Persisted vehicle location archive checksum metadata does not match the pending manifest."
      );
    }

    const verified =
      await verifyVehicleLocationArchiveObject({
        supabase:
          input.supabase,

        objectKey:
          persisted.objectKey,

        expectedSha256:
          prepared.archive.sha256,

        expectedCompressedByteCount:
          prepared.archive.compressedByteCount,
      });

    if (
      verified.objectKey !==
      objectKey ||
      verified.sha256 !==
        prepared.archive.sha256 ||
      verified.compressedByteCount !==
        prepared.archive.compressedByteCount
    ) {
      throw new Error(
        "Verified vehicle location archive identity does not match the pending manifest evidence."
      );
    }

    const verifiedAt =
      new Date().toISOString();

    /*
     * Compare-and-set transition:
     *
     * Only the exact manifest that is still pending may become verified.
     * A previously verified/failed row therefore cannot be silently rewritten.
     */
    const {
      data: verifiedManifest,
      error: verifiedManifestError,
    } =
      await input.supabase
        .from(
          ARCHIVE_MANIFEST_TABLE
        )
        .update({
          status:
            "verified",

          verified_at:
            verifiedAt,

          failure_reason:
            null,

          updated_at:
            verifiedAt,
        })
        .eq(
          "id",
          manifest.id
        )
        .eq(
          "status",
          "pending"
        )
        .select(
          "id,status,verified_at"
        )
        .maybeSingle();

    if (verifiedManifestError) {
      throw verifiedManifestError;
    }

    const persistedVerifiedAt =
      verifiedManifest?.verified_at;

    const persistedVerifiedAtMs =
      typeof persistedVerifiedAt === "string"
        ? Date.parse(
            persistedVerifiedAt
          )
        : Number.NaN;

    const expectedVerifiedAtMs =
      Date.parse(
        verifiedAt
      );

    if (
      !verifiedManifest ||
      verifiedManifest.status !==
        "verified" ||
      !Number.isFinite(
        persistedVerifiedAtMs
      ) ||
      persistedVerifiedAtMs !==
        expectedVerifiedAtMs
    ) {
      throw new Error(
        "Archive manifest could not transition from pending to verified."
      );
    }

    return {
      manifestId:
        manifest.id,

      status:
        "verified",

      objectKey,

      sha256:
        prepared.archive.sha256,

      rowCount:
        prepared.archive.rowCount,

      compressedByteCount:
        verified.compressedByteCount,

      verifiedAt:
        persistedVerifiedAt,
    };
  }
  catch (error: unknown) {
    const failureReason =
      errorMessage(
        error
      );

    try {
      await markArchiveManifestFailed({
        supabase:
          input.supabase,

        manifestId:
          manifest.id,

        failureReason,
      });
    }
    catch (failureTransitionError) {
      throw new AggregateError(
        [
          error,
          failureTransitionError,
        ],
        "Vehicle location archive lifecycle failed and its pending manifest could not be marked failed."
      );
    }

    throw error;
  }
}
