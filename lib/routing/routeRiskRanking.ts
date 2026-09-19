import { calculateDistanceMeters } from "@/lib/utils/command-center";
import { historicalRoadRiskRecencyWeight } from "@/lib/routing/roadRiskRecency";

export type RoutePoint = [
  number,
  number,
];

export type RoutingProfile =
  | "safest"
  | "fastest"
  | "balanced";

export function normalizeRoutingProfile(
  value: unknown,
): RoutingProfile {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    normalized === "fastest" ||
    normalized === "balanced"
  ) {
    return normalized;
  }

  return "safest";
}

export function scoreRouteRisk(
  routePoints: RoutePoint[],
  roadRiskSegments: any[],
) {
  const matchedSegments =
    roadRiskSegments.filter(
      (segment) => {
        const latitude =
          Number(segment?.latitude);

        const longitude =
          Number(segment?.longitude);

        const radiusMeters =
          Math.max(
            0,
            Number(
              segment?.radius_meters,
            ) || 0,
          );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          radiusMeters <= 0
        ) {
          return false;
        }

        return routePoints.some(
          ([
            routeLatitude,
            routeLongitude,
          ]) => {
            return (
              calculateDistanceMeters(
                routeLatitude,
                routeLongitude,
                latitude,
                longitude,
              ) <= radiusMeters
            );
          },
        );
      },
    );

  const now =
    Date.now();

  const scoredSegments =
    matchedSegments.map(
      (segment) => {
        const baseRisk =
          Math.max(
            0,
            Number(
              segment?.risk_score,
            ) || 0,
          );

        const verificationCount =
          Math.max(
            0,
            Number(
              segment?.verification_count,
            ) || 0,
          );

        const recencyWeight =
          historicalRoadRiskRecencyWeight(
            segment?.last_event_at,
            now,
          );

        const verificationWeight =
          Math.min(
            1.25,
            1 +
              verificationCount *
                0.02,
          );

        return {
          ...segment,
          weightedRisk:
            baseRisk *
            recencyWeight *
            verificationWeight,
          verificationCount,
        };
      },
    );

  const totalRiskScore =
    scoredSegments.reduce(
      (
        total,
        segment,
      ) =>
        total +
        segment.weightedRisk,
      0,
    );

  const highestRiskScore =
    scoredSegments.reduce(
      (
        highest,
        segment,
      ) =>
        Math.max(
          highest,
          segment.weightedRisk,
        ),
      0,
    );

  const verificationCount =
    scoredSegments.reduce(
      (
        total,
        segment,
      ) =>
        total +
        segment.verificationCount,
      0,
    );

  const normalizedRiskScore =
    Math.min(
      100,
      Math.round(
        totalRiskScore,
      ),
    );

  const safetyScore =
    Math.max(
      0,
      100 -
        normalizedRiskScore,
    );

  return {
    matchedSegmentCount:
      matchedSegments.length,

    matchedSegmentIds:
      matchedSegments
        .map(
          (segment) =>
            segment?.id,
        )
        .filter(Boolean),

    totalRiskScore,
    normalizedRiskScore,
    highestRiskScore,
    verificationCount,
    safetyScore,
  };
}

export function rankRoutes<
  T extends {
    durationSeconds?: unknown;
    safetyScore?: unknown;
    index?: unknown;
    [key: string]: unknown;
  },
>(
  routes: T[],
  profile: RoutingProfile,
) {
  const durations =
    routes
      .map(
        (route) =>
          Number(
            route?.durationSeconds ||
              0,
          ),
      )
      .filter(
        (duration) =>
          duration > 0,
      );

  const fastestDuration =
    durations.length > 0
      ? Math.min(
          ...durations,
        )
      : 0;

  return [...routes]
    .map(
      (route) => {
        const safetyScore =
          Math.max(
            0,
            Math.min(
              100,
              Number(
                route
                  ?.safetyScore ||
                  0,
              ),
            ),
          );

        const durationSeconds =
          Math.max(
            0,
            Number(
              route
                ?.durationSeconds ||
                0,
            ),
          );

        const durationScore =
          fastestDuration > 0 &&
          durationSeconds > 0
            ? Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    (
                      fastestDuration /
                      durationSeconds
                    ) * 100,
                  ),
                ),
              )
            : 0;

        const profileScore =
          profile === "fastest"
            ? durationScore
            : profile ===
                "balanced"
              ? Math.round(
                  safetyScore *
                    0.7 +
                    durationScore *
                    0.3,
                )
              : safetyScore;

        return {
          ...route,
          routingProfile:
            profile,
          durationScore,
          profileScore,
        };
      },
    )
    .sort(
      (
        firstRoute,
        secondRoute,
      ) => {
        if (
          profile ===
          "fastest"
        ) {
          const durationDifference =
            Number(
              firstRoute
                ?.durationSeconds ||
                0,
            ) -
            Number(
              secondRoute
                ?.durationSeconds ||
                0,
            );

          if (
            durationDifference !==
            0
          ) {
            return durationDifference;
          }

          const safetyDifference =
            Number(
              secondRoute
                ?.safetyScore ||
                0,
            ) -
            Number(
              firstRoute
                ?.safetyScore ||
                0,
            );

          if (
            safetyDifference !==
            0
          ) {
            return safetyDifference;
          }
        }
        else if (
          profile ===
          "balanced"
        ) {
          const profileDifference =
            Number(
              secondRoute
                ?.profileScore ||
                0,
            ) -
            Number(
              firstRoute
                ?.profileScore ||
                0,
            );

          if (
            profileDifference !==
            0
          ) {
            return profileDifference;
          }

          const safetyDifference =
            Number(
              secondRoute
                ?.safetyScore ||
                0,
            ) -
            Number(
              firstRoute
                ?.safetyScore ||
                0,
            );

          if (
            safetyDifference !==
            0
          ) {
            return safetyDifference;
          }
        }
        else {
          const safetyDifference =
            Number(
              secondRoute
                ?.safetyScore ||
                0,
            ) -
            Number(
              firstRoute
                ?.safetyScore ||
                0,
            );

          if (
            safetyDifference !==
            0
          ) {
            return safetyDifference;
          }

          const durationDifference =
            Number(
              firstRoute
                ?.durationSeconds ||
                0,
            ) -
            Number(
              secondRoute
                ?.durationSeconds ||
                0,
            );

          if (
            durationDifference !==
            0
          ) {
            return durationDifference;
          }
        }

        return (
          Number(
            firstRoute
              ?.index ||
              0,
          ) -
          Number(
            secondRoute
              ?.index ||
              0,
          )
        );
      },
    )
    .map(
      (
        route,
        position,
      ) => ({
        ...route,
        rank:
          position + 1,
        isRecommended:
          position === 0,
      }),
    );
}
