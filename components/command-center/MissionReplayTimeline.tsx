"use client";

type MissionReplayEvent = {
  id?: string;
  type?: string;
  title?: string;
  detail?: string;
  severity?: string;
  vehicleId?: string | null;
  createdAt?: string;
  timestamp?: string;
};

type MissionReplayTimelineProps = {
  events: MissionReplayEvent[];
  title?: string;
};

function eventTime(event: MissionReplayEvent) {
  return event.createdAt || event.timestamp || new Date().toISOString();
}

function eventColor(severity?: string) {
  const value = String(severity || "").toLowerCase();

  if (value.includes("critical")) return "#dc2626";
  if (value.includes("high")) return "#ea580c";
  if (value.includes("medium")) return "#d97706";
  return "#2563eb";
}

function eventLabel(type?: string) {
  return String(type || "mission_event")
    .replace(/_/g, " ")
    .toUpperCase();
}

export default function MissionReplayTimeline({
  events,
  title = "Mission Replay Timeline",
}: MissionReplayTimelineProps) {
  const sortedEvents = [...(events || [])].sort(
    (a, b) => new Date(eventTime(a)).getTime() - new Date(eventTime(b)).getTime()
  );

  return (
    <div
      style={{
        padding: 22,
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        marginBottom: 24,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 6px 0", fontSize: 26 }}>{title}</h2>
        <div style={{ color: "#64748b" }}>
          Synchronized operational replay of vehicle movement, alerts, incidents, road intelligence, and dispatcher actions.
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <div style={{ color: "#64748b" }}>No replay events available yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sortedEvents.map((event, index) => {
            const color = eventColor(event.severity);

            return (
              <div
                key={event.id || `${event.type}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "92px 1fr",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    color: "#334155",
                    fontSize: 13,
                    paddingTop: 4,
                  }}
                >
                  {new Date(eventTime(event)).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                <div
                  style={{
                    borderLeft: `5px solid ${color}`,
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color,
                      marginBottom: 6,
                    }}
                  >
                    {eventLabel(event.type)}
                  </div>

                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    {event.title || "Mission event"}
                  </div>

                  {event.detail && (
                    <div style={{ marginTop: 6, color: "#475569" }}>
                      {event.detail}
                    </div>
                  )}

                  {event.vehicleId && (
                    <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
                      Vehicle: {event.vehicleId}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
