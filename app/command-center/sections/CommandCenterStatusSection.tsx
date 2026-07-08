type CommandCenterStatusSectionProps = {
  operationalStatus: string;
  globalThreatScore: number;
  topThreatVehicles: any[];
};

export default function CommandCenterStatusSection({
  operationalStatus,
  globalThreatScore,
  topThreatVehicles,
}: CommandCenterStatusSectionProps) {
  return (
    <div
      style={{
        padding: 24,
        marginBottom: 24,
        borderRadius: 20,
        background:
          globalThreatScore >= 80
            ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
            : globalThreatScore >= 60
            ? "linear-gradient(135deg,#9a3412,#c2410c)"
            : "linear-gradient(135deg,#0f172a,#1e293b)",
        color: "#fff",
      }}
    >
      <h2 style={{ margin: 0 }}>{operationalStatus}</h2>
      <div style={{ fontSize: 64, fontWeight: 900 }}>{globalThreatScore}</div>

      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {topThreatVehicles.map((threat, index) => (
          <div key={index}>
            {threat.registrationNumber} — {threat.probability}%
          </div>
        ))}
      </div>
    </div>
  );
}