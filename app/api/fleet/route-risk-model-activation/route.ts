import {
  NextResponse,
} from "next/server";

import {
  requireOrganization,
  requireRole,
} from "@/lib/server-auth";

import {
  activateRouteRiskModel,
} from "@/lib/fleet/activateRouteRiskModel";

type ActivationBody = {
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

  /*
   * The controlled database lifecycle RPC owns exact model lookup and
   * lifecycle-transition validation. Application code does not duplicate
   * that authority.
   */
  if (
    message.includes(
      "was not found or is not accessible"
    )
  ) {
    return 404;
  }

  if (
    message.includes(
      "must be in shadow lifecycle status before activation"
    ) ||
    message.includes(
      "missing prerequisite lifecycle attribution"
    ) ||
    message.includes(
      "contains incompatible lifecycle attribution"
    ) ||
    message.includes(
      "training artifact is unavailable"
    ) ||
    message.includes(
      "existing active route-risk model"
    )
  ) {
    return 409;
  }

  return 500;
}

/**
 * Applies one explicit authenticated human activation decision to one
 * route-risk shadow model.
 *
 * API boundary:
 *
 * - Requires an authenticated HarborGuard organization session.
 * - Requires owner/admin role.
 * - Uses the authenticated user's Supabase client.
 * - Requires an explicit model registry identity.
 * - Requires a nonblank human rationale.
 * - Delegates shadow-to-active mutation to the controlled activation helper.
 * - May expose the incumbent model retired atomically by the database RPC.
 * - Does not calculate promotion readiness.
 * - Does not automatically choose a model to activate.
 * - Does not trigger retraining.
 * - Does not select production thresholds.
 * - Does not read the active model into Route Safety.
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
      (await req.json()) as ActivationBody;

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
      await activateRouteRiskModel({
        supabase,
        registryId,
        rationale,
      });

    return NextResponse.json({
      success:
        true,

      activation:
        result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to activate route-risk model.";

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
