export type VehicleCapability =
  | "general"
  | "security"
  | "medical"
  | "maintenance"
  | "fire"
  | "police";

const ALERT_CAPABILITY_MAP: Record<string, VehicleCapability[]> = {
  panic: ["security", "police"],
  route_safety_threat: ["security", "police"],
  geofence_breach: ["security", "police"],
  driver_fatigue: ["medical", "general"],
  long_stop: ["maintenance", "general"],
  offline: ["maintenance", "general"],
  route_deviation: ["general"],
};

export function preferredCapabilitiesForAlert(
  alertType: string | null | undefined,
): VehicleCapability[] {
  const normalizedAlertType = String(alertType || "")
    .trim()
    .toLowerCase();

  return ALERT_CAPABILITY_MAP[normalizedAlertType] || ["general"];
}

export function filterCandidatesByCapability(
  candidates: any[],
  alertType: string | null | undefined,
) {
  const preferredCapabilities =
    preferredCapabilitiesForAlert(alertType);

  const matchingCandidates = candidates.filter((candidate) =>
    preferredCapabilities.includes(
      String(candidate.vehicleType || "general")
        .trim()
        .toLowerCase() as VehicleCapability,
    ),
  );

  return matchingCandidates.length > 0
    ? matchingCandidates
    : candidates;
}