import {
  NextResponse,
} from "next/server";

import {
  requireOrganization,
  requireRole,
} from "@/lib/server-auth";

import {
  startRouteRiskModelShadow,
} from "@/lib/fleet/startRouteRiskModelShadow";

type ShadowTransitionBody = {
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

  return 500;
}

/**
 * Starts the explicit shadow lifecycle phase for one approved
 * HarborGuard route-risk model.
 *
 * API boundary:
 *
 * - Requires an authenticated HarborGuard organization session.
 * - Requires owner/admin role.
 * - Uses the authenticated user's Supabase client.
 * - Requires an explicit model registry identity.
 * - Requires a nonblank human rationale.
 * - Delegates approved-to-shadow mutation to the controlled RPC helper.
 * - Does not approve a candidate.
 * - Does not perform shadow inference.
 * - Does not write shadow predictions.
 * - Does not activate or retire a model.
 * - Does not select production thresholds.
 * - Does not modify production Route Safety behavior.
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
      (await req.json()) as ShadowTransitionBody;

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
      await startRouteRiskModelShadow({
        supabase,
        registryId,
        rationale,
      });

    return NextResponse.json({
      success:
        true,

      shadow:
        result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start route-risk model shadow lifecycle.";

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
