import {
  ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

import {
  parseRouteRiskLogisticBaselineModel,
} from "@/lib/fleet/parseRouteRiskLogisticBaselineModel";

import type {
  RouteRiskModelArtifact,
} from "@/lib/fleet/routeRiskModelArtifact";

function requireRecord(
  value: unknown
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid route-risk model artifact: expected an object."
    );
  }

  return value as Record<string, unknown>;
}

/**
 * Parses one persisted HarborGuard route-risk model artifact through the
 * registered algorithm-specific parser.
 *
 * This is the generic persisted-model boundary for route-risk inference.
 * Adding a new algorithm requires explicit registration here rather than
 * silently accepting an unknown artifact.
 *
 * This helper performs no database access, scoring, persistence,
 * lifecycle mutation, threshold selection or Route Safety mutation.
 */
export function parseRouteRiskModelArtifact(
  value: unknown
): RouteRiskModelArtifact {
  const model =
    requireRecord(value);

  const algorithmVersion =
    model.algorithmVersion;

  switch (algorithmVersion) {
    case ROUTE_RISK_LOGISTIC_BASELINE_VERSION:
      return parseRouteRiskLogisticBaselineModel(
        value
      );

    default:
      throw new Error(
        "Unsupported route-risk model algorithm version."
      );
  }
}
