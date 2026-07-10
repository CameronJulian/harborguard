import type { RoadIncident } from "../types";

type Props = {
  incidents: RoadIncident[];
};

function incidentIcon(type: string) {
  if (type === "roadblock") return "Roadblock";
  if (type === "traffic_light_outage") return "Signal outage";
  if (type === "smash_grab_hotspot") return "Crime hotspot";
  return "Route incident";
}

export default function CommandCenterRouteThreatFeedSection({
  incidents,
}: Props) {
  return (
    <div
      style={{
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        borderRadius: 18,
        padding: 22,
        marginBottom: 24,
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 26 }}>
        Active Route Threat Feed
      </h2>

      {incidents.length === 0 ? (
        <div style={{ color: "#64748b" }}>
          No active route threats detected.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {incidents.slice(0, 6).map((incident) => (
            <div
              key={incident.id}
              style={{
                padding: 14,
                borderRadius: 14,
                background: "#ffffff",
                border: "1px solid #fdba74",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                {incidentIcon(incident.type)}: {incident.title}
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                Type: {incident.type.replaceAll("_", " ")} | Severity:{" "}
                {incident.severity.toUpperCase()} | Radius:{" "}
                {incident.radius_meters}m
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
