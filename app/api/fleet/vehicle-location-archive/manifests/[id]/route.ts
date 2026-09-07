import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  requireOrganization,
  requireRole,
} from "@/lib/server-auth";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import {
  assessVehicleLocationArchivePruningEligibility,
  type VehicleLocationArchivePruningIneligibleReason,
} from "@/lib/fleet/assessVehicleLocationArchivePruningEligibility";


const idSchema =
  z.string()
    .uuid();


type ManifestRow = {
  id:
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
    number | string;

  sha256:
    string;

  status:
    "pending" | "verified" | "failed";

  verified_at:
    string | null;

  failure_reason:
    string | null;

  pruned_at:
    string | null;

  pruned_row_count:
    number | string | null;

  created_at:
    string;

  updated_at:
    string;
};


type VehicleRow = {
  id:
    string;

  registration_number:
    string | null;

  nickname:
    string | null;
};


type DetailEligibility =
  | {
      state:
        "not_applicable";

      reason:
        "status_pending" | "status_failed";
    }
  | {
      state:
        "assessed";

      eligible:
        boolean;

      reason:
        VehicleLocationArchivePruningIneligibleReason | null;
    }
  | {
      state:
        "already_pruned";

      prunedAt:
        string;

      prunedRowCount:
        number | string;
    };


function errorStatus(
  error:
    unknown
): number {
  const message =
    error instanceof Error
      ? error.message
      : "";

  if (message === "Unauthorized") {
    return 401;
  }

  if (
    message === "Permission denied" ||
    message === "Organization not found." ||
    message === "Subscription inactive"
  ) {
    return 403;
  }

  return 500;
}


/**
 * Reads one vehicle-location archive manifest in operational detail.
 *
 * Boundaries:
 *
 * - GET only.
 * - Requires authenticated owner/admin access.
 * - Organization scope comes only from the authenticated session.
 * - Service-role table access occurs only after authorization.
 * - Full archive/live-evidence pruning eligibility is evaluated only for
 *   verified, unpruned manifests.
 * - Already-pruned manifests return durable completion evidence without
 *   reconstructing intentionally deleted live telemetry.
 * - Pending/failed manifests return eligibility as not applicable.
 * - This route performs no prune, delete, update, insert, upsert, archive
 *   download, signed URL creation, retention scheduling or audit-log write.
 */
export async function GET(
  _request:
    Request,
  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {
  try {
    const {
      organizationId,
      role,
    } =
      await requireOrganization();

    requireRole(
      role,
      [
        "owner",
        "admin",
      ]
    );

    const {
      id: rawId,
    } =
      await params;

    const parsedId =
      idSchema.safeParse(
        rawId
      );

    if (!parsedId.success) {
      return NextResponse.json(
        {
          error:
            "Archive manifest id must be a valid UUID.",
        },
        {
          status:
            400,
        }
      );
    }

    const manifestId =
      parsedId.data;

    const {
      data: manifestData,
      error: manifestError,
    } =
      await supabaseAdmin
        .from(
          "vehicle_location_archive_manifests"
        )
        .select(
          "id,vehicle_id,trip_id,archive_format,object_key,first_recorded_at,last_recorded_at,row_count,sha256,status,verified_at,failure_reason,pruned_at,pruned_row_count,created_at,updated_at"
        )
        .eq(
          "id",
          manifestId
        )
        .eq(
          "organization_id",
          organizationId
        )
        .maybeSingle();

    if (manifestError) {
      throw new Error(
        "Unable to read vehicle location archive manifest detail: " +
          manifestError.message
      );
    }

    if (!manifestData) {
      return NextResponse.json(
        {
          error:
            "Vehicle location archive manifest not found.",
        },
        {
          status:
            404,
        }
      );
    }

    const manifest =
      manifestData as ManifestRow;

    const {
      data: vehicleData,
      error: vehicleError,
    } =
      await supabaseAdmin
        .from(
          "vehicles"
        )
        .select(
          "id,registration_number,nickname"
        )
        .eq(
          "id",
          manifest.vehicle_id
        )
        .eq(
          "organization_id",
          organizationId
        )
        .maybeSingle();

    if (vehicleError) {
      throw new Error(
        "Unable to resolve archive manifest vehicle identity: " +
          vehicleError.message
      );
    }

    const vehicle =
      vehicleData as
        | VehicleRow
        | null;

    let eligibility:
      DetailEligibility;

    if (manifest.pruned_at !== null) {

      if (
        manifest.status !== "verified" ||
        manifest.pruned_row_count === null ||
        String(manifest.pruned_row_count) !==
          String(manifest.row_count)
      ) {
        throw new Error(
          "Vehicle location archive manifest contains inconsistent durable prune evidence."
        );
      }

      eligibility = {
        state:
          "already_pruned",

        prunedAt:
          manifest.pruned_at,

        prunedRowCount:
          manifest.pruned_row_count,
      };
    }
    else if (
      manifest.status === "verified"
    ) {
      const assessment =
        await assessVehicleLocationArchivePruningEligibility({
          supabase:
            supabaseAdmin,

          manifestId,
        });

      eligibility =
        assessment.eligible
          ? {
              state:
                "assessed",

              eligible:
                true,

              reason:
                null,
            }
          : {
              state:
                "assessed",

              eligible:
                false,

              reason:
                assessment.reason,
            };
    }
    else {
      eligibility = {
        state:
          "not_applicable",

        reason:
          manifest.status === "failed"
            ? "status_failed"
            : "status_pending",
      };
    }

    return NextResponse.json({
      manifest: {
        manifestId:
          manifest.id,

        vehicleId:
          manifest.vehicle_id,

        vehicleRegistration:
          vehicle?.registration_number ??
          null,

        vehicleNickname:
          vehicle?.nickname ??
          null,

        tripId:
          manifest.trip_id,

        archiveFormat:
          manifest.archive_format,

        objectKey:
          manifest.object_key,

        firstRecordedAt:
          manifest.first_recorded_at,

        lastRecordedAt:
          manifest.last_recorded_at,

        rowCount:
          manifest.row_count,

        sha256:
          manifest.sha256,

        status:
          manifest.status,

        verifiedAt:
          manifest.verified_at,

        failureReason:
          manifest.failure_reason,

        prunedAt:
          manifest.pruned_at,

        prunedRowCount:
          manifest.pruned_row_count,

        createdAt:
          manifest.created_at,

        updatedAt:
          manifest.updated_at,
      },

      eligibility,
    });
  }
  catch (error) {
    const status =
      errorStatus(
        error
      );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (status === 500) {
      console.error(
        "Vehicle location archive manifest detail failed:",
        error
      );
    }

    return NextResponse.json(
      {
        error:
          status === 500
            ? "Failed to read vehicle location archive manifest detail."
            : message,
      },
      {
        status,
      }
    );
  }
}