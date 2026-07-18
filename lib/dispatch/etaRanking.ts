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
  const shortlisted = candidates
    .filter(
      (candidate) =>
        candidate.latitude != null &&
        candidate.longitude != null &&
        candidate.status !== "offline",
    )
    .slice(0, maxCandidates);

  const ranked = await Promise.all(
    shortlisted.map(async (candidate) => {
      try {
        const routing = await calculateHereRoutes(
          {
            lat: Number(candidate.latitude),
            lng: Number(candidate.longitude),
          },
          {
            lat: target.latitude,
            lng: target.longitude,
          },
        );

        const bestRoute = routing.routes?.[0] ?? null;

        return {
          ...candidate,
          eta: {
            provider: routing.provider,
            durationSeconds:
              bestRoute?.durationSeconds ?? Number.MAX_SAFE_INTEGER,
            duration: bestRoute?.duration ?? null,
            distanceMeters: bestRoute?.distanceMeters ?? null,
            trafficDelaySeconds: bestRoute?.trafficDelaySeconds ?? 0,
            selectedRoute: bestRoute,
            alternatives: routing.routes ?? [],
          },
        };
      } catch (error: any) {
        return {
          ...candidate,
          eta: {
            provider: "unavailable",
            durationSeconds: Number.MAX_SAFE_INTEGER,
            duration: null,
            distanceMeters: null,
            trafficDelaySeconds: null,
            selectedRoute: null,
            alternatives: [],
            error:
              error instanceof Error
                ? error.message
                : "HERE routing unavailable.",
          },
        };
      }
    }),
  );

  return ranked.sort((a, b) => a.eta.durationSeconds - b.eta.durationSeconds);
}
