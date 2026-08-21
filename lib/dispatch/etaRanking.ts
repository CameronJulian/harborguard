import { calculateHereRoutes } from "@/lib/routing/hereRouting";

type DispatchTarget = {
  latitude: number;
  longitude: number;
};

export async function rankFleetCandidatesByETA(
  candidates: any[],
  target: DispatchTarget,
  maxCandidates = 3,
) {
  const shortlisted = (candidates || [])
    .filter(
      (candidate) =>
        candidate?.latitude != null &&
        candidate?.longitude != null &&
        candidate?.status !== "offline",
    )
    .slice(0, maxCandidates);

  const rankedCandidates = await Promise.all(
    shortlisted.map(async (candidate, originalIndex) => {
      try {
        const routing = await calculateHereRoutes(
          {
            lat: Number(candidate.latitude),
            lng: Number(candidate.longitude),
          },
          {
            lat: Number(target.latitude),
            lng: Number(target.longitude),
          },
          [],
          "fastest",
        );

        const selectedRoute =
          routing.recommendedRoute || routing.routes?.[0] || null;

        if (!selectedRoute) {
          return {
            ...candidate,
            etaOriginalRank: originalIndex + 1,
            etaAvailable: false,
            etaDurationSeconds: null,
            etaDistanceMeters: null,
            etaTrafficDelaySeconds: null,
            etaRoutingProvider: routing.provider || null,
            etaRoute: null,
            etaRoutingError: "HERE returned no route.",
          };
        }

        return {
          ...candidate,
          etaOriginalRank: originalIndex + 1,
          etaAvailable: true,
          etaDurationSeconds: Number(selectedRoute.durationSeconds || 0),
          etaDistanceMeters: Number(selectedRoute.distanceMeters || 0),
          etaTrafficDelaySeconds: Number(
            selectedRoute.trafficDelaySeconds || 0,
          ),
          etaRoutingProvider:
            routing.provider || selectedRoute.provider || "here_routing_v8",
          etaRoute: selectedRoute,
          etaRoutingError: null,
        };
      } catch (error) {
        return {
          ...candidate,
          etaOriginalRank: originalIndex + 1,
          etaAvailable: false,
          etaDurationSeconds: null,
          etaDistanceMeters: null,
          etaTrafficDelaySeconds: null,
          etaRoutingProvider: null,
          etaRoute: null,
          etaRoutingError:
            error instanceof Error ? error.message : "HERE routing failed.",
        };
      }
    }),
  );

  return rankedCandidates.sort((a, b) => {
    if (a.etaAvailable && !b.etaAvailable) return -1;
    if (!a.etaAvailable && b.etaAvailable) return 1;

    if (a.etaAvailable && b.etaAvailable) {
      const durationDifference =
        Number(a.etaDurationSeconds) - Number(b.etaDurationSeconds);

      if (durationDifference !== 0) {
        return durationDifference;
      }
    }

    return Number(a.etaOriginalRank) - Number(b.etaOriginalRank);
  });
}
