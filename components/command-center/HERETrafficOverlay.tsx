"use client";

import { CircleMarker, Popup } from "react-leaflet";

type HERETrafficOverlayProps = {
  incidents: any[];
  enabled: boolean;
};

function cleanLatLng(lat?: any, lng?: any): [number, number] | null {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return [latitude, longitude];
}

function trafficSeverityColor(incident: any) {
  const severity = String(incident.severity || incident.risk_level || "").toLowerCase();
  const type = String(
    incident.type ||
      incident.category ||
      incident.title ||
      incident.description ||
      ""
  ).toLowerCase();

  if (severity.includes("critical") || type.includes("closure") || type.includes("closed")) {
    return "#dc2626";
  }

  if (
    severity.includes("high") ||
    type.includes("accident") ||
    type.includes("construction") ||
    type.includes("crash")
  ) {
    return "#ea580c";
  }

  if (
    severity.includes("medium") ||
    type.includes("congestion") ||
    type.includes("traffic") ||
    type.includes("delay")
  ) {
    return "#f59e0b";
  }

  return "#2563eb";
}

function trafficLabel(incident: any) {
  return (
    incident.title ||
    incident.type ||
    incident.category ||
    incident.description ||
    "Traffic incident"
  );
}

export default function HERETrafficOverlay({
  incidents,
  enabled,
}: HERETrafficOverlayProps) {
  if (!enabled) return null;

  return (
    <>
      {(incidents || []).map((incident: any) => {
        const coords = cleanLatLng(incident.latitude, incident.longitude);
        if (!coords) return null;

        const color = trafficSeverityColor(incident);

        return (
          <CircleMarker
            key={`traffic-${incident.id}`}
            center={coords}
            radius={12}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.28,
              weight: 3,
            }}
          >
            <Popup>
              <strong>{trafficLabel(incident)}</strong>
              <br />
              {incident.description || incident.summary || "Live traffic incident"}
              <br />
              Severity: {incident.severity || incident.risk_level || "Unknown"}
              <br />
              Source: {incident.source || "HERE / Road Intelligence"}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
