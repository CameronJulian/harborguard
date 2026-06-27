"use client";

type DriverNavigationPanelProps = {
  currentLat: number | null;
  currentLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationName?: string | null;
};

function hasCoords(lat: number | null, lng: number | null) {
  return (
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function buttonStyle(background: string) {
  return {
    display: "inline-block",
    padding: "10px 12px",
    borderRadius: 12,
    background,
    color: "#ffffff",
    fontWeight: 900,
    textDecoration: "none",
    textAlign: "center" as const,
  };
}

export default function DriverNavigationPanel({
  currentLat,
  currentLng,
  destinationLat,
  destinationLng,
  destinationName,
}: DriverNavigationPanelProps) {
  const canNavigate =
    hasCoords(currentLat, currentLng) && hasCoords(destinationLat, destinationLng);

  const origin = `${currentLat},${currentLng}`;
  const destination = `${destinationLat},${destinationLng}`;

  const googleUrl = canNavigate
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&travelmode=driving`
    : "#";

  const wazeUrl = canNavigate
    ? `https://waze.com/ul?ll=${destinationLat},${destinationLng}&navigate=yes`
    : "#";

  const hereUrl = canNavigate
    ? `https://wego.here.com/directions/drive/${currentLat},${currentLng}/${destinationLat},${destinationLng}`
    : "#";

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1e3a8a",
        marginBottom: 18,
      }}
    >
      <h3 style={{ margin: "0 0 8px 0" }}>Driver Navigation</h3>

      <div style={{ marginBottom: 10 }}>
        Destination: <strong>{destinationName || "Assigned destination"}</strong>
      </div>

      {!canNavigate ? (
        <div style={{ color: "#64748b" }}>
          Waiting for live driver GPS and route destination coordinates.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
          }}
        >
          <a href={googleUrl} target="_blank" rel="noreferrer" style={buttonStyle("#2563eb")}>
            Google Maps
          </a>

          <a href={wazeUrl} target="_blank" rel="noreferrer" style={buttonStyle("#0ea5e9")}>
            Waze
          </a>

          <a href={hereUrl} target="_blank" rel="noreferrer" style={buttonStyle("#0f766e")}>
            HERE WeGo
          </a>
        </div>
      )}
    </div>
  );
}
