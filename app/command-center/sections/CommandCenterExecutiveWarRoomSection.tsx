import {
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";

import type { RoadIncident } from "../types";

type FleetSummary = {
  total: number;
  mapped: number;
  moving: number;
  stopped: number;
  critical: number;
  offline: number;
  alerts: number;
  stops: number;
  roadThreats: number;
  roadblocks: number;
  smashGrab: number;
  trafficLights: number;
};

type OperationsSummary = {
  activeVehicles?: number;
  activeTrips?: number;
  highRiskRoutes?: number;
  driversRerouted?: number;
  panicAlertsToday?: number;
};

type Props = {
  operationsSummary: OperationsSummary | null;
  summary: FleetSummary;
  incidents: RoadIncident[];
  globalThreatScore: number;
  operationalStatus: string;
};

type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export default function CommandCenterExecutiveWarRoomSection({
  operationsSummary,
  summary,
  incidents,
  globalThreatScore,
  operationalStatus,
}: Props) {
  const operationalReadiness = Math.max(
    0,
    Math.min(
      100,
      100 -
        summary.critical * 10 -
        summary.offline * 5 -
        summary.alerts * 2
    )
  );

  const fleetHealth =
    summary.total > 0
      ? Math.round((summary.mapped / summary.total) * 100)
      : 100;

  const aiConfidence = Math.max(
    0,
    Math.min(100, 100 - globalThreatScore)
  );

  const activeMissions =
    operationsSummary?.activeTrips ?? 0;

  const criticalIncidents = incidents.filter(
    (incident) =>
      String(incident.severity).toLowerCase() ===
      "critical"
  ).length;

  const missionSuccess = Math.max(
    0,
    Math.min(
      100,
      100 -
        summary.alerts -
        summary.offline * 3 -
        criticalIncidents * 5
    )
  );

  const readinessTone: BadgeTone =
    operationalReadiness >= 80
      ? "success"
      : operationalReadiness >= 60
        ? "warning"
        : "danger";

  const incidentTone: BadgeTone =
    criticalIncidents > 0
      ? "danger"
      : incidents.length > 0
        ? "warning"
        : "success";

  const threatTone: BadgeTone =
    globalThreatScore >= 80
      ? "danger"
      : globalThreatScore >= 40
        ? "warning"
        : "success";

  const systemTone: BadgeTone =
    operationalStatus === "CRITICAL"
      ? "danger"
      : operationalStatus === "HIGH ALERT" ||
          operationalStatus === "ELEVATED"
        ? "warning"
        : "success";

  const situationSummary =
    `Fleet currently has ${summary.total} registered vehicles. ` +
    `${summary.moving} are moving, ${summary.stopped} are stopped, ` +
    `and ${summary.offline} are offline. ` +
    `${incidents.length} road incidents require monitoring. ` +
    `Overall operational status is ${operationalStatus}, ` +
    `with an AI threat score of ${globalThreatScore}%.`;

  const recommendation =
    globalThreatScore > 70
      ? "High threat activity has been detected. Dispatch additional response resources and review the highest-risk vehicles immediately."
      : criticalIncidents > 0
        ? "Critical incidents require attention. Assign the nearest available response vehicle and maintain active monitoring."
        : incidents.length > 0
          ? "Monitor active incidents while maintaining current fleet coverage and route readiness."
          : summary.offline > 0
            ? "Investigate offline vehicles and restore live tracking coverage before operational risk increases."
            : "Fleet operations are stable. Continue proactive monitoring and maintain current response coverage.";

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader
        eyebrow="Executive Command"
        title="Executive AI War Room"
        description="A consolidated operational view of fleet readiness, active missions, incident pressure, and AI recommendations."
        actions={
          <StatusBadge
            label={operationalStatus}
            tone={systemTone}
          />
        }
      />

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
          marginBottom: 20,
        }}
      >
        <MetricCard
          label="Operational Readiness"
          value={`${operationalReadiness}%`}
          detail="Fleet and dispatch resources ready"
          tone={
            operationalReadiness >= 80
              ? "success"
              : operationalReadiness >= 60
                ? "warning"
                : "danger"
          }
        />

        <MetricCard
          label="Fleet Health"
          value={`${fleetHealth}%`}
          detail={`${summary.mapped} of ${summary.total} vehicles reporting`}
          tone={
            fleetHealth >= 80
              ? "success"
              : fleetHealth >= 60
                ? "warning"
                : "danger"
          }
        />

        <MetricCard
          label="AI Confidence"
          value={`${aiConfidence}%`}
          detail={`Current threat score: ${globalThreatScore}%`}
          tone={
            globalThreatScore >= 70
              ? "danger"
              : globalThreatScore >= 40
                ? "warning"
                : "info"
          }
        />

        <MetricCard
          label="Active Missions"
          value={String(activeMissions)}
          detail={`${operationsSummary?.activeVehicles ?? summary.moving} active vehicles`}
          tone="info"
        />

        <MetricCard
          label="Critical Incidents"
          value={String(criticalIncidents)}
          detail={`${incidents.length} total incidents under monitoring`}
          tone={
            criticalIncidents > 0
              ? "danger"
              : incidents.length > 0
                ? "warning"
                : "success"
          }
        />

        <MetricCard
          label="Mission Success"
          value={`${missionSuccess}%`}
          detail={`${operationsSummary?.driversRerouted ?? 0} drivers rerouted today`}
          tone={
            missionSuccess >= 80
              ? "success"
              : missionSuccess >= 60
                ? "warning"
                : "danger"
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <Panel
          title="Executive Situation Summary"
          description="Live overview derived from current Command Center data."
        >
          <div
            style={{
              color: "#334155",
              fontSize: 15,
              lineHeight: 1.75,
            }}
          >
            {situationSummary}
          </div>

          <div
            style={{
              alignItems: "center",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 20,
              paddingTop: 18,
            }}
          >
            <StatusBadge
              label={`Readiness: ${operationalReadiness}%`}
              tone={readinessTone}
            />

            <StatusBadge
              label={`Incidents: ${incidents.length}`}
              tone={incidentTone}
            />

            <StatusBadge
              label={`Threat Score: ${globalThreatScore}%`}
              tone={threatTone}
            />
          </div>
        </Panel>

        <Panel
          title="AI Recommendation"
          description="Highest-priority operational action."
        >
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 16,
              color: "#1e3a8a",
              fontSize: 15,
              lineHeight: 1.7,
              padding: 18,
            }}
          >
            {recommendation}
          </div>

          <div style={{ marginTop: 18 }}>
            <StatusBadge
              label="Recommendation Ready"
              tone="info"
            />
          </div>
        </Panel>
      </div>
    </section>
  );
}
