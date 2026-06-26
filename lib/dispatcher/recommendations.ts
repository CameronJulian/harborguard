type RecommendationInput = {
  alertType?: string | null;
  severity?: string | null;
  message?: string | null;
  behavioralRisk?: string | null;
  intelligenceScore?: number | null;
};

export function buildDispatcherRecommendations(input: RecommendationInput) {
  const alertType = String(input.alertType || "").toLowerCase();
  const severity = String(input.severity || "").toLowerCase();
  const score = Number(input.intelligenceScore || 0);

  const actions: string[] = [];
  const reasons: string[] = [];

  if (alertType.includes("panic")) {
    actions.push("Contact driver immediately.");
    actions.push("Dispatch emergency response team.");
    actions.push("Escalate to control room supervisor.");
    actions.push("Monitor live location continuously.");
    reasons.push("Panic alert indicates immediate danger.");
  }

  if (alertType.includes("geofence")) {
    actions.push("Verify whether vehicle left approved route.");
    actions.push("Contact driver for confirmation.");
    actions.push("Review route replay.");
    reasons.push("Vehicle may have deviated from approved operating area.");
  }

  if (alertType.includes("offline")) {
    actions.push("Check tracker connectivity.");
    actions.push("Contact driver by phone.");
    actions.push("Verify last known location.");
    reasons.push("Offline vehicle may indicate signal loss, tampering, or power failure.");
  }

  if (alertType.includes("long_stop")) {
    actions.push("Contact driver to confirm safety.");
    actions.push("Check stop duration and location risk.");
    actions.push("Escalate if driver does not respond.");
    reasons.push("Vehicle has remained stationary beyond expected threshold.");
  }

  if (severity === "critical" || score >= 80) {
    actions.push("Prioritize this incident in the Command Center.");
    actions.push("Keep notification open until resolved.");
    reasons.push("Risk level is critical.");
  }

  if (actions.length === 0) {
    actions.push("Continue monitoring.");
    actions.push("Review latest vehicle telemetry.");
    reasons.push("No critical dispatcher action detected.");
  }

  return {
    priority: severity === "critical" || score >= 80 ? "Critical" : severity === "high" || score >= 60 ? "High" : "Normal",
    actions: Array.from(new Set(actions)),
    reasons: Array.from(new Set(reasons)),
  };
}
