import {
  NextResponse,
} from "next/server";

import {
  requireOrganization,
  requireRole,
} from "@/lib/server-auth";

import {
  decideRouteRiskModelCandidate,
  type RouteRiskModelCandidateDecision,
} from "@/lib/fleet/decideRouteRiskModelCandidate";

type CandidateDecisionBody = {
  registryId?: unknown;
  decision?: unknown;
  rationale?: unknown;
};

const VALID_DECISIONS =
  new Set<RouteRiskModelCandidateDecision>([
    "approved",
    "rejected",
  ]);

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
 * Applies one explicit human decision to one route-risk model candidate.
 *
 * API boundary:
 *
 * - Requires an authenticated HarborGuard organization session.
 * - Requires owner/admin role.
 * - Uses the authenticated user's Supabase client.
 * - Accepts only approved or rejected.
 * - Requires a nonblank rationale.
 * - Delegates lifecycle mutation to the controlled database RPC helper.
 * - Does not enter shadow mode.
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
      (await req.json()) as CandidateDecisionBody;

    const registryId =
      typeof body.registryId === "string"
        ? body.registryId.trim()
        : "";

    const decision =
      typeof body.decision === "string"
        ? body.decision.trim()
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

    if (
      !VALID_DECISIONS.has(
        decision as RouteRiskModelCandidateDecision
      )
    ) {
      return NextResponse.json(
        {
          error:
            "decision must be approved or rejected.",
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
      await decideRouteRiskModelCandidate({
        supabase,
        registryId,
        decision:
          decision as RouteRiskModelCandidateDecision,
        rationale,
      });

    return NextResponse.json({
      success:
        true,

      candidate:
        result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to decide route-risk model candidate.";

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
