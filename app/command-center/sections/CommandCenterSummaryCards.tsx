type CommandCenterSummaryCardsProps = {
  summary: any;
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function CommandCenterSummaryCards({
  summary,
}: CommandCenterSummaryCardsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
        gap: 16,
        marginBottom: 24,
      }}
    >
      {[
        { label: "Total", value: summary.total, color: "#0f172a" },
        { label: "Mapped", value: summary.mapped, color: "#2563eb" },
        { label: "Moving", value: summary.moving, color: "#16a34a" },
        { label: "Stopped", value: summary.stopped, color: "#7c3aed" },
        { label: "Stops", value: summary.stops, color: "#7c3aed" },
        { label: "Alerts", value: summary.alerts, color: "#d97706" },
        { label: "Critical", value: summary.critical, color: "#dc2626" },
        { label: "Offline", value: summary.offline, color: "#64748b" },
        { label: "Road Threats", value: summary.roadThreats, color: "#ea580c" },
        { label: "Roadblocks", value: summary.roadblocks, color: "#d97706" },
        { label: "Smash & Grab", value: summary.smashGrab, color: "#dc2626" },
        { label: "Robot Outages", value: summary.trafficLights, color: "#7c3aed" },
      ].map((item) => (
        <div key={item.label} style={{ ...cardStyle, padding: 18 }}>
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
            {item.label}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: item.color }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}