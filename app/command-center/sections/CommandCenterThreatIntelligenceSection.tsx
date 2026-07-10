type ThreatItem = {
  registrationNumber: string;
  nickname?: string | null;
  level: string;
  probability: number;
  speed: number;
  openAlerts: number;
  criticalAlerts: number;
  nearIncident: boolean;
  isOffline: boolean;
};

type Props = {
  threatFeed: ThreatItem[];
};

export default function CommandCenterThreatIntelligenceSection({
  threatFeed,
}: Props) {
  const criticalThreatCount = threatFeed.filter(
    (threat) => threat.level === "Critical"
  ).length;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 24,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 30, margin: 0 }}>
            AI Threat Intelligence
          </h2>

          <div style={{ color: "#64748b", marginTop: 4 }}>
            Predictive operational threat monitoring.
          </div>
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderRadius: 9999,
            background: "#fee2e2",
            color: "#b91c1c",
            fontWeight: 900,
          }}
        >
          {criticalThreatCount} Critical Threats
        </div>
      </div>

      {threatFeed.length === 0 ? (
        <div style={{ color: "#64748b" }}>
          No predictive threats detected.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {threatFeed.slice(0, 5).map((threat, index) => (
            <div
              key={`${threat.registrationNumber}-${index}`}
              style={{
                borderRadius: 16,
                padding: 18,
                border:
                  threat.level === "Critical"
                    ? "2px solid #dc2626"
                    : threat.level === "High"
                    ? "2px solid #ea580c"
                    : "1px solid #e5e7eb",
                background:
                  threat.level === "Critical"
                    ? "#fff5f5"
                    : threat.level === "High"
                    ? "#fff7ed"
                    : "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>
                    {threat.registrationNumber}
                  </div>

                  <div style={{ color: "#64748b" }}>
                    {threat.nickname || "Fleet Vehicle"}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    Threat Probability
                  </div>

                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 900,
                      color:
                        threat.level === "Critical"
                          ? "#dc2626"
                          : threat.level === "High"
                          ? "#ea580c"
                          : threat.level === "Medium"
                          ? "#d97706"
                          : "#16a34a",
                    }}
                  >
                    {threat.probability}%
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gap: 6,
                  color: "#475569",
                  fontSize: 14,
                }}
              >
                <div>• Speed: {threat.speed} km/h</div>
                <div>• Open Alerts: {threat.openAlerts}</div>
                <div>• Critical Alerts: {threat.criticalAlerts}</div>
                <div>
                  • Near Incident Zone: {threat.nearIncident ? "Yes" : "No"}
                </div>
                <div>• Offline: {threat.isOffline ? "Yes" : "No"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
