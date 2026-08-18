import {
  NextResponse,
} from "next/server";

import {
  requireOrganization,
  requireRole,
} from "@/lib/server-auth";

import {
  retireRouteRiskModel,
} from "@/lib/fleet/retireRouteRiskModel";

type RetirementBody = {
  registryId?: unknown;
  rationale?: unknown;
};

function errorStatus(
  error: unknown
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

  if (
    message.includes(
      "was not found or is not accessible"
    )
  ) {
    return 404;
  }

  if (
    message.includes(
      "must be active before retirement"
    ) ||
    message.includes(
      "missing prerequisite lifecycle attribution"
    ) ||
    message.includes(
      "contains incompatible lifecycle attribution"
    ) ||
    message.includes(
      "training artifact is unavailable"
    )
  ) {
    return 409;
  }

  return 500;
}

/**
 * Retires one explicit active route-risk model through the controlled
 * authenticated lifecycle helper.
 *
 * API boundary:
 *
 * - Requires an authenticated HarborGuard organization session.
 * - Requires owner/admin role.
 * - Uses the authenticated user's Supabase client.
 * - Requires an explicit model registry identity.
 * - Requires a nonblank human rationale.
 * - Delegates active-to-retired mutation to the controlled helper/RPC.
 * - Does not select or activate a replacement model.
 * - Does not reactivate a previously retired model.
 * - Does not perform automatic rollback.
 * - Does not trigger retraining.
 * - Does not read lifecycle state into Route Safety.
 * - Does not modify production Route Safety scoring, rerouting, escalation,
 *   or recommendation behavior.
 */
export async function POST(
  req: Request
) {
  try {
    const {
      supabase,
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

    const body =
      (await req.json()) as RetirementBody;

    const registryId =
      typeof body.registryId === "string"
        ? body.registryId.trim()
        : "";

    const rationale =
      typeof body.rationale === "string"
        ? body.rationale.trim()
        : "";

    if (!registryId) {
      return NextResponse.json(
        {
          error:
            "registryId is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (!rationale) {
      return NextResponse.json(
        {
          error:
            "rationale is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const result =
      await retireRouteRiskModel({
        supabase,
        registryId,
        rationale,
      });

    return NextResponse.json({
      success:
        true,

      retirement:
        result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to retire route-risk model.";

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status:
          errorStatus(error),
      }
    );
  }
}
