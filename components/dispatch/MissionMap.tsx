"use client";

type TrackingPoint = {
  latitude: number;
  longitude: number;
  recorded_at?: string;
};

type Props = {
  tracking: TrackingPoint[];
};

export default function MissionMap({
  tracking,
}: Props) {
  const latest =
    tracking.length > 0
      ? tracking[0]
      : null;

  return (
    <div
      style={{
        height: 360,
        borderRadius: 16,
        border: "1px solid #cbd5e1",
        background: "#f8fafc",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h3 style={{ marginBottom: 10 }}>
        Live Mission Map
      </h3>

      {latest ? (
        <>
          <div>
            Latitude:
            {" "}
            {latest.latitude}
          </div>

          <div>
            Longitude:
            {" "}
            {latest.longitude}
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#2563eb",
              fontWeight: 700,
            }}
          >
            Live GPS Connected
          </div>
        </>
      ) : (
        <div style={{ color: "#64748b" }}>
          Waiting for driver GPS...
        </div>
      )}
    </div>
  );
}
