"use client";

import dynamic from "next/dynamic";

const HeatmapLayer = dynamic<any>(
  () => import("react-leaflet-heatmap-layer-v3"),
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

function intensityForIncident(incident: RoadIncident) {
  const severity = String(incident.severity || "").toLowerCase();
  const type = String(incident.type || "").toLowerCase();

  if (severity === "critical") return 1;
  if (severity === "high") return 0.8;
  if (type === "smash_grab_hotspot") return 0.95;
  if (type === "road_closure") return 0.9;
  if (type === "roadblock") return 0.75;
  if (type === "accident") return 0.7;
  if (type === "construction") return 0.55;
  if (type === "congestion") return 0.5;
  if (severity === "medium") return 0.45;

  return 0.3;
}

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

export default function FleetRiskHeatMap({
  incidents,
  visible,
}: FleetRiskHeatMapProps) {
  if (!visible || !incidents?.length) return null;

  const points = incidents
    .filter((incident) => isValidCoordinate(incident.latitude, incident.longitude))
    .map((incident) => ({
      lat: Number(incident.latitude),
      lng: Number(incident.longitude),
      intensity: intensityForIncident(incident),
    }));

  if (points.length === 0) return null;

  return (
    <HeatmapLayer
      points={points}
      longitudeExtractor={(point: any) => point.lng}
      latitudeExtractor={(point: any) => point.lat}
      intensityExtractor={(point: any) => point.intensity}
      radius={34}
      blur={24}
      max={1}
    />
  );
}
