type Props = {
  operationsSummary: any;
};

export default function CommandCenterFleetOperationsSnapshot({ operationsSummary }: Props) {
  return (
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
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
};