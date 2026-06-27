type AutonomousInput = {
  alertType?: string | null;
  severity?: string | null;
  message?: string | null;
  intelligenceScore?: number | null;
  behavioralRisk?: string | null;
};

export function evaluateAutonomousOperation(input: AutonomousInput) {
  const alertType = String(input.alertType || "").toLowerCase();
  const severity = String(input.severity || "").toLowerCase();
  const score = Number(input.intelligenceScore || 0);

  const actions: string[] = [];
  const reasons: string[] = [];

  if (alertType.includes("panic") || alertType.includes("sos")) {
    actions.push("create_incident");
    actions.push("start_command_workflow");
    actions.push("notify_supervisor");
    actions.push("contact_driver");
    actions.push("monitor_live_location");
    reasons.push("Panic/SOS alert indicates possible immediate threat.");
  }

  if (severity === "critical" || score >= 85) {
    actions.push("create_incident");
    actions.push("start_command_workflow");
    actions.push("notify_supervisor");
    actions.push("prioritize_dispatcher_queue");
    reasons.push("Critical risk threshold reached.");
  }

  if (alertType.includes("geofence")) {
    actions.push("verify_route_deviation");
    actions.push("contact_driver");
    actions.push("review_route_replay");
    reasons.push("Vehicle may have left an approved operating area.");
  }

  if (alertType.includes("offline")) {
    actions.push("verify_tracker_connectivity");
    actions.push("contact_driver");
    actions.push("check_last_known_location");
    reasons.push("Offline tracker may indicate signal loss, tampering, or power failure.");
  }

  if (alertType.includes("long_stop")) {
    actions.push("contact_driver");
    actions.push("check_stop_location_risk");
    reasons.push("Vehicle remained stationary beyond expected threshold.");
  }

  const uniqueActions = Array.from(new Set(actions));
  const uniqueReasons = Array.from(new Set(reasons));

  const riskLevel =
    alertType.includes("panic") || alertType.includes("sos") || severity === "critical" || score >= 85
      ? "critical"
      : severity === "high" || score >= 65
      ? "high"
      : severity === "medium" || score >= 40
      ? "medium"
      : "low";

  return {
    riskLevel,
    shouldAct: uniqueActions.length > 0 && ["critical", "high"].includes(riskLevel),
    actions: uniqueActions,
    reasons: uniqueReasons.length > 0 ? uniqueReasons : ["No autonomous action required."],
  };
}
