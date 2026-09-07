import {
  NextRequest,
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


const querySchema =
  z.object({
    status:
      z.enum([
        "pending",
        "verified",
        "failed",
      ]).optional(),

    pruneState:
      z.enum([
        "all",
        "unpruned",
        "pruned",
      ]).default(
        "all"
      ),

    vehicleId:
      z.string()
        .uuid()
        .optional(),

    page:
      z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    pageSize:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50),
  }).strict();


type ManifestRow = {
  id:
    string;

  vehicle_id:
    string;

  trip_id:
    string | null;

  first_recorded_at:
    string;

  last_recorded_at:
    string;

  row_count:
    number | string;

  status:
    "pending" | "verified" | "failed";

  verified_at:
    string | null;

  pruned_at:
    string | null;

  pruned_row_count:
    number | string | null;

  created_at:
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
 * Lists vehicle-location archive manifest metadata for one authenticated
 * organization.
 *
 * This boundary is intentionally read-only:
 *
 * - owner/admin only;
 * - organization scope comes from the authenticated session;
 * - service-role table access happens only after authorization;
 * - no archive object verification is performed here;
 * - no live telemetry reconstruction is performed here;
 * - no destructive executor or database RPC is callable here;
 * - already-completed prune records remain visible for operational history.
 */
export async function GET(
  request:
    NextRequest
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

    const rawQuery =
      Object.fromEntries(
        request.nextUrl.searchParams.entries()
      );

    const parsed =
      querySchema.safeParse(
        rawQuery
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid archive manifest list query.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      status,
      pruneState,
      vehicleId,
      page,
      pageSize,
    } =
      parsed.data;

    const from =
      (page - 1) *
      pageSize;

    const to =
      from +
      pageSize -
      1;

    /*
     * The archive manifest table is service-role-only.
     *
     * Authentication and owner/admin authorization have already succeeded.
     * Every manifest query is still explicitly scoped to organizationId.
     */
    let manifestQuery =
      supabaseAdmin
        .from(
          "vehicle_location_archive_manifests"
        )
        .select(
          "id,vehicle_id,trip_id,first_recorded_at,last_recorded_at,row_count,status,verified_at,pruned_at,pruned_row_count,created_at",
          {
            count:
              "exact",
          }
        )
        .eq(
          "organization_id",
          organizationId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (status) {
      manifestQuery =
        manifestQuery.eq(
          "status",
          status
        );
    }

    if (vehicleId) {
      manifestQuery =
        manifestQuery.eq(
          "vehicle_id",
          vehicleId
        );
    }

    if (pruneState === "pruned") {
      manifestQuery =
        manifestQuery.not(
          "pruned_at",
          "is",
          null
        );
    }
    else if (
      pruneState === "unpruned"
    ) {
      manifestQuery =
        manifestQuery.is(
          "pruned_at",
          null
        );
    }

    manifestQuery =
      manifestQuery.range(
        from,
        to
      );

    const {
      data: manifestData,
      error: manifestError,
      count,
    } =
      await manifestQuery;

    if (manifestError) {
      throw new Error(
        "Unable to list vehicle location archive manifests: " +
          manifestError.message
      );
    }

    const manifests =
      (
        manifestData ??
        []
      ) as ManifestRow[];

    const vehicleIds =
      Array.from(
        new Set(
          manifests.map(
            (manifest) =>
              manifest.vehicle_id
          )
        )
      );

    let vehicles:
      VehicleRow[] = [];

    if (vehicleIds.length > 0) {
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
            "organization_id",
            organizationId
          )
          .in(
            "id",
            vehicleIds
          );

      if (vehicleError) {
        throw new Error(
          "Unable to resolve archive manifest vehicle identities: " +
            vehicleError.message
        );
      }

      vehicles =
        (
          vehicleData ??
          []
        ) as VehicleRow[];
    }

    const vehicleById =
      new Map(
        vehicles.map(
          (vehicle) => [
            vehicle.id,
            vehicle,
          ]
        )
      );

    const items =
      manifests.map(
        (manifest) => {
          const vehicle =
            vehicleById.get(
              manifest.vehicle_id
            );

          return {
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

            firstRecordedAt:
              manifest.first_recorded_at,

            lastRecordedAt:
              manifest.last_recorded_at,

            rowCount:
              manifest.row_count,

            status:
              manifest.status,

            verifiedAt:
              manifest.verified_at,

            prunedAt:
              manifest.pruned_at,

            prunedRowCount:
              manifest.pruned_row_count,

            createdAt:
              manifest.created_at,
          };
        }
      );

    const total =
      count ?? 0;

    return NextResponse.json({
      items,

      pagination: {
        page,
        pageSize,
        total,

        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total /
                pageSize
              ),
      },

      filters: {
        status:
          status ?? null,

        pruneState,

        vehicleId:
          vehicleId ?? null,
      },
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
        "Vehicle location archive manifest list failed:",
        error
      );
    }

    return NextResponse.json(
      {
        error:
          status === 500
            ? "Failed to list vehicle location archive manifests."
            : message,
      },
      {
        status,
      }
    );
  }
}