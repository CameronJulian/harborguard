"use client";

import dynamic from "next/dynamic";

const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

type RoadIncident = {
  id?: string;
  latitude: number;
  longitude: number;
  severity?: string | null;
  type?: string | null;
};

type FleetRiskHeatMapProps = {
  incidents: RoadIncident[];
  visible: boolean;
};

function isValidCoordinate(latitude: any, longitude: any) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function markerColor(incident: RoadIncident) {
  const severity = String(incident.severity || "").toLowerCase();
  const type = String(incident.type || "").toLowerCase();

  if (severity === "critical" || type === "smash_grab_hotspot") return "#dc2626";
  if (severity === "high" || type === "roadblock" || type === "road_closure") return "#ea580c";
  if (severity === "medium" || type === "accident") return "#d97706";
  return "#2563eb";
}

function markerRadius(incident: RoadIncident) {
  const severity = String(incident.severity || "").toLowerCase();

  if (severity === "critical") return 22;
  if (severity === "high") return 18;
  if (severity === "medium") return 14;
  return 10;
}

export default function FleetRiskHeatMap({
  incidents,
  visible,
}: FleetRiskHeatMapProps) {
  if (!visible || !incidents?.length) return null;

  const validIncidents = incidents.filter((incident) =>
    isValidCoordinate(incident.latitude, incident.longitude)
  );

  if (validIncidents.length === 0) return null;

  return (
    <>
      {validIncidents.map((incident, index) => {
        const color = markerColor(incident);

        return (
          <CircleMarker
            key={incident.id || `${incident.latitude}-${incident.longitude}-${index}`}
            center={[Number(incident.latitude), Number(incident.longitude)]}
            radius={markerRadius(incident)}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.28,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{String(incident.type || "Risk area").replace(/_/g, " ")}</strong>
              <br />
              Severity: {incident.severity || "unknown"}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
