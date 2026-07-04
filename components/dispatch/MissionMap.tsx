"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);

const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

type TrackingPoint = {
  id?: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  recorded_at?: string;
};

type Props = {
  tracking: TrackingPoint[];
};

export default function MissionMap({ tracking }: Props) {
  const validTracking = tracking.filter(
    (point) =>
      typeof point.latitude === "number" &&
      typeof point.longitude === "number"
  );

  const latest = validTracking[0] || null;

  const center = useMemo<[number, number]>(() => {
    return latest
      ? [latest.latitude, latest.longitude]
      : [-33.9249, 18.4241];
  }, [latest]);

  const routePositions = validTracking
    .slice()
    .reverse()
    .map((point) => [point.latitude, point.longitude] as [number, number]);

  return (
    <div style={{ height: 360, borderRadius: 16, overflow: "hidden", border: "1px solid #cbd5e1", background: "#f8fafc" }}>
      <MapContainer center={center} zoom={latest ? 15 : 10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#2563eb", weight: 4 }}
          />
        )}

        {latest && (
          <CircleMarker
            center={[latest.latitude, latest.longitude]}
            radius={10}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>Live Driver Position</strong>
              <br />
              Lat: {latest.latitude}
              <br />
              Lng: {latest.longitude}
              <br />
              Speed: {latest.speed ?? "Unknown"}
              <br />
              Accuracy: {latest.accuracy ?? "Unknown"}
              <br />
              Last update: {latest.recorded_at ? new Date(latest.recorded_at).toLocaleString() : "Unknown"}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
