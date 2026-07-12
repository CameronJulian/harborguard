import {
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";

export default function CommandCenterExecutiveWarRoomSection() {
  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader
        eyebrow="Executive Command"
        title="Executive AI War Room"
        description="A consolidated operational view of fleet readiness, active missions, incident pressure, and AI recommendations."
        actions={
          <StatusBadge
            label="Systems Operational"
            tone="success"
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
          value="94%"
          detail="Fleet and dispatch resources ready"
          tone="success"
        />

        <MetricCard
          label="Fleet Health"
          value="98%"
          detail="Vehicles reporting normally"
          tone="success"
        />

        <MetricCard
          label="AI Confidence"
          value="96%"
          detail="Current operational recommendations"
          tone="info"
        />

        <MetricCard
          label="Active Missions"
          value="7"
          detail="Five en route, two assigned"
          tone="info"
        />

        <MetricCard
          label="Critical Incidents"
          value="2"
          detail="Immediate operator attention required"
          tone="danger"
        />

        <MetricCard
          label="Mission Success"
          value="91%"
          detail="Completed within operational SLA"
          tone="success"
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns:
            "minmax(0, 1.45fr) minmax(280px, 0.75fr)",
        }}
      >
        <Panel
          title="Executive Situation Summary"
          description="AI-generated overview of the current operational environment."
        >
          <div
            style={{
              color: "#334155",
              fontSize: 15,
              lineHeight: 1.75,
            }}
          >
            Fleet readiness remains strong. Two critical incidents require
            active monitoring, while the majority of current missions are
            progressing within expected response times. Traffic pressure is
            elevated along the Cape Town corridor, but no widespread fleet
            disruption is currently detected.
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
              label="Readiness: High"
              tone="success"
            />

            <StatusBadge
              label="Incident Pressure: Medium"
              tone="warning"
            />

            <StatusBadge
              label="Traffic Risk: Elevated"
              tone="warning"
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
            Deploy the nearest available response vehicle to reinforce the
            Cape Town corridor and monitor the two critical incidents until
            their threat scores decrease.
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
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
