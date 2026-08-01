export function routeIncidentSeverityWeight(
  severity: string | null
) {
  if (severity === "critical") return 45;
  if (severity === "high") return 30;
  if (severity === "medium") return 18;
  return 10;
}

export function routeIncidentTypeWeight(
  type: string | null
) {
  switch (type) {
    case "smash_grab_hotspot":
      return 35;
    case "roadblock":
      return 30;
    case "road_closure":
      return 32;
    case "roadworks":
      return 16;
    case "congestion":
      return 12;
    case "lane_closure":
      return 14;
    case "collision":
      return 20;
    case "traffic_light_outage":
      return 18;
    case "weather_hazard":
      return 18;
    case "flooding":
      return 28;
    case "vehicle_breakdown":
      return 10;
    case "road_hazard":
      return 15;
    case "protest":
      return 28;
    default:
      return 12;
  }
}
