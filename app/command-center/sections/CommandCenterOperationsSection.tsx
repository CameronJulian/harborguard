type CommandCenterOperationsSectionProps = {
  operationsSummary: any | null;
  operationsTimeline: any[];
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function CommandCenterOperationsSection({
  operationsSummary,
  operationsTimeline,
}: CommandCenterOperationsSectionProps) {
  return (
    <>
      <div style={{ ...cardStyle, padding: 22, marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, margin: "0 0 14px 0" }}>
          Fleet Operations Snapshot
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
          }}
        >
          {[
            ["Active Vehicles", operationsSummary?.activeVehicles ?? 0],
            ["Active Trips", operationsSummary?.activeTrips ?? 0],
            ["High-Risk Routes", operationsSummary?.highRiskRoutes ?? 0],
            ["Drivers Rerouted", operationsSummary?.driversRerouted ?? 0],
            ["Panic Alerts Today", operationsSummary?.panicAlertsToday ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: 16,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                {label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 22, marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, margin: "0 0 14px 0" }}>
          Live Operations Timeline
        </h2>

        {operationsTimeline.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {operationsTimeline.map((event: any) => (
              <div
                key={event.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background:
                    event.severity === "critical"
                      ? "#fef2f2"
                      : event.severity === "high"
                      ? "#fff7ed"
                      : "#f8fafc",
                  border:
                    event.severity === "critical"
                      ? "1px solid #fecaca"
                      : event.severity === "high"
                      ? "1px solid #fed7aa"
                      : "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                  {new Date(event.createdAt).toLocaleString()}
                </div>
                <div style={{ fontWeight: 900, marginTop: 4 }}>
                  {event.title}
                </div>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
                  {event.detail}
                </div>
                {event.vehicleId ? (
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                    Vehicle: {event.vehicleId}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#64748b" }}>
            No operational events in the last 24 hours.
          </div>
        )}
      </div>
    </>
  );
}