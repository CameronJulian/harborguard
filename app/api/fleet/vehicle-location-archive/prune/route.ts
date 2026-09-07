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
  createAuditLog,
} from "@/lib/audit";

import {
  executeVehicleLocationArchivePrune,
} from "@/lib/fleet/executeVehicleLocationArchivePrune";


const CONFIRMATION =
  "PRUNE_VERIFIED_ARCHIVE" as const;


const requestSchema =
  z.object({
    manifestId:
      z.string().uuid(),

    confirmation:
      z.literal(
        CONFIRMATION
      ),
  }).strict();


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
 * Executes one explicit human-authorized vehicle-location archive prune.
 *
 * Security boundary:
 *
 * - POST only.
 * - Requires authenticated HarborGuard organization session.
 * - Requires owner/admin role.
 * - Client supplies no organization id.
 * - Client must supply one exact manifest UUID and confirmation phrase.
 * - Manifest ownership is checked with the service-role client only AFTER
 *   authentication and role authorization.
 * - Manifest lookup is scoped to the authenticated organization.
 * - The guarded executor performs the established archive/live-evidence
 *   eligibility assessment for an initial prune.
 * - The database remains the destructive authority.
 * - No batch mode, cron, schedule or retention duration exists here.
 */
export async function POST(
  req:
    Request
) {
  try {
    const {
      organizationId,
      user,
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

    let rawBody:
      unknown;

    try {
      rawBody =
        await req.json();
    }
    catch {
      return NextResponse.json(
        {
          error:
            "Request body must be valid JSON.",
        },
        {
          status:
            400,
        }
      );
    }

    const parsed =
      requestSchema.safeParse(
        rawBody
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "manifestId must be a UUID and confirmation must equal PRUNE_VERIFIED_ARCHIVE.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      manifestId,
    } =
      parsed.data;

    /*
     * The manifest table is service-role-only.
     *
     * Do not perform this lookup until authentication and owner/admin
     * authorization have succeeded.
     *
     * Organization scope comes only from the authenticated session.
     */
    const {
      data: manifest,
      error: manifestError,
    } =
      await supabaseAdmin
        .from(
          "vehicle_location_archive_manifests"
        )
        .select(
          "id,organization_id"
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
        "Unable to verify vehicle location archive manifest ownership: " +
          manifestError.message
      );
    }

    if (!manifest) {
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

    const result =
      await executeVehicleLocationArchivePrune({
        supabase:
          supabaseAdmin,

        manifestId,
      });

    if (!result.executed) {
      return NextResponse.json(
        {
          success:
            false,

          executed:
            false,

          manifestId:
            result.manifestId,

          reason:
            result.reason,
        },
        {
          status:
            409,
        }
      );
    }

    await createAuditLog({
      organizationId,

      userId:
        user?.id ?? null,

      action:
        "vehicle_location_archive.pruned",

      target:
        result.manifestId,

      metadata: {
        deletedRowCount:
          result.deletedRowCount,

        durableRetry:
          result.durableRetry,

        executionMode:
          "explicit_manual",
      },
    });

    return NextResponse.json({
      success:
        true,

      executed:
        true,

      manifestId:
        result.manifestId,

      deletedRowCount:
        result.deletedRowCount,

      durableRetry:
        result.durableRetry,
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
        "Manual vehicle location archive prune failed:",
        error
      );
    }

    return NextResponse.json(
      {
        error:
          status === 500
            ? "Failed to prune vehicle location archive."
            : message,
      },
      {
        status,
      }
    );
  }
}