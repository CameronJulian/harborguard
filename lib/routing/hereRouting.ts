function secondsToDuration(seconds: number) {
  return `${Math.max(0, Math.round(seconds))}s`;
}

function recommendation(routes: any[]) {
  return routes.length > 1
    ? "HERE returned alternate route options. Compare travel time, traffic duration, and distance before rerouting."
    : "No alternate HERE route returned for this trip.";
}

export async function calculateHereRoutes(origin: any, destination: any) {
  if (!process.env.HERE_API_KEY) {
    throw new Error("HERE_API_KEY is not configured.");
  }

  const url =
    "https://router.hereapi.com/v8/routes" +
    `?transportMode=car` +
    `&origin=${Number(origin.lat)},${Number(origin.lng)}` +
    `&destination=${Number(destination.lat)},${Number(destination.lng)}` +
    `&return=summary,polyline,actions,instructions` +
    `&alternatives=3` +
    `&departureTime=any` +
    `&apikey=${process.env.HERE_API_KEY}`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.title || data?.error || "HERE Routing request failed.");
  }

  const routes = (data.routes || []).map((route: any, index: number) => {
    const sections = route.sections || [];
    const summary = sections.reduce(
      (total: any, section: any) => {
        total.distanceMeters += Number(section.summary?.length || 0);
        total.durationSeconds += Number(section.summary?.duration || 0);
        total.baseDurationSeconds += Number(section.summary?.baseDuration || section.summary?.duration || 0);
        return total;
      },
      { distanceMeters: 0, durationSeconds: 0, baseDurationSeconds: 0 }
    );

    return {
      index,
      label: index === 0 ? "Current best HERE route" : `HERE alternative route ${index}`,
      provider: "here_routing_v8",
      distanceMeters: summary.distanceMeters,
      duration: secondsToDuration(summary.durationSeconds),
      staticDuration: secondsToDuration(summary.baseDurationSeconds),
      durationSeconds: summary.durationSeconds,
      baseDurationSeconds: summary.baseDurationSeconds,
      trafficDelaySeconds: Math.max(0, summary.durationSeconds - summary.baseDurationSeconds),
      description: sections[0]?.arrival?.place?.location ? "HERE Routing v8 traffic-aware route" : null,
      encodedPolyline: sections[0]?.polyline || null,
      sections: sections.length,
    };
  });

  return {
    provider: "here_routing_v8",
    routes,
    recommendation: recommendation(routes),
  };
}
