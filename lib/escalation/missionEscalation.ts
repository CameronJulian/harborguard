export type MissionEscalationResult = {
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  reasons: string[];
  actions: string[];
};

export function buildMissionEscalation(options: {
  missionStatus?: string;
  etaDelay?: number;
  congestion?: number;
  behavioralRisk?: number;
  intelligenceScore?: number;
}) {
  const reasons: string[] = [];
  const actions: string[] = [];

  let score = 0;

  if ((options.etaDelay ?? 0) >= 20) {
    score += 25;
    reasons.push("Vehicle ETA exceeds acceptable delay.");
    actions.push("Notify dispatcher.");
  }

  if ((options.congestion ?? 0) >= 70) {
    score += 20;
    reasons.push("Heavy traffic congestion detected.");
    actions.push("Recommend alternate route.");
  }

  if ((options.behavioralRisk ?? 0) >= 75) {
    score += 30;
    reasons.push("Driver behavioral risk is elevated.");
    actions.push("Review driver behaviour.");
  }

  if ((options.intelligenceScore ?? 0) >= 85) {
    score += 30;
    reasons.push("Threat intelligence indicates elevated operational risk.");
    actions.push("Escalate to supervisor.");
  }

  if (options.missionStatus === "Cancelled") {
    score += 40;
    reasons.push("Mission has been cancelled.");
    actions.push("Dispatch replacement vehicle.");
  }

  score = Math.min(score, 100);

  let severity: MissionEscalationResult["severity"] = "low";

  if (score >= 80)
    severity = "critical";
  else if (score >= 60)
    severity = "high";
  else if (score >= 30)
    severity = "medium";

  return {
    severity,
    score,
    reasons,
    actions,
  };
}
