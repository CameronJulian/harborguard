type OperationsTimelineEvent = {
  id: string;
  createdAt: string;
  title: string;
  detail: string;
  severity?: string | null;
  vehicleId?: string | null;
};

type Props = {
  operationsTimeline: OperationsTimelineEvent[];
};

export default function CommandCenterLiveOperationsTimeline({
  operationsTimeline,
}: Props) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 22,
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 26, margin: "0 0 14px 0" }}>
        Live Operations Timeline
      </h2>

      {operationsTimeline.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {operationsTimeline.map((event) => (
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
  );
}