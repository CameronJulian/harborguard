"use client";

import { useMemo, useState } from "react";
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

const MissionMapAutoFollow = dynamic(
  () => import("@/components/dispatch/MissionMapAutoFollow"),
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
  mission?: any;
};

export default function MissionMap({ tracking, mission }: Props) {
  const [followVehicle, setFollowVehicle] = useState(true);
  const validTracking = tracking.filter(
    (point) =>
      typeof point.latitude === "number" &&
      typeof point.longitude === "number"
  );

  const latest = validTracking[0] || null;

  const destination =
    mission?.destination_lat && mission?.destination_lng
      ? {
          lat: Number(mission.destination_lat),
          lng: Number(mission.destination_lng),
        }
      : null;

  const center = useMemo<[number, number]>(() => {
    return latest
      ? [latest.latitude, latest.longitude]
      : [-33.9249, 18.4241];
  }, [latest]);

  const routePositions = validTracking
    .slice()
    .reverse()
    .map((point) => [point.latitude, point.longitude] as [number, number]);

  const latestPosition: [number, number] | null = latest
    ? [latest.latitude, latest.longitude]
    : null;

  return (
    <div style={{ height: 360, borderRadius: 16, overflow: "hidden", border: "1px solid #cbd5e1", background: "#f8fafc", position: "relative" }}>
      <MapContainer center={center} zoom={latest ? 15 : 10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MissionMapAutoFollow
          position={latestPosition}
          enabled={followVehicle}
          onUserMove={() => setFollowVehicle(false)}
        />

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#2563eb", weight: 4 }}
          />
        )}

        {latest && destination && (
          <Polyline
            positions={[
              [latest.latitude, latest.longitude],
              [destination.lat, destination.lng],
            ]}
            pathOptions={{ color: "#0f766e", weight: 3, dashArray: "8 8" }}
          />
        )}

        {destination && (
          <CircleMarker
            center={[destination.lat, destination.lng]}
            radius={9}
            pathOptions={{
              color: "#111827",
              fillColor: "#facc15",
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <strong>Mission Destination</strong>
              <br />
              Lat: {destination.lat}
              <br />
              Lng: {destination.lng}
            </Popup>
          </CircleMarker>
        )}

        {latest && (
          <>
          <CircleMarker
            center={[latest.latitude, latest.longitude]}
            radius={18}
            pathOptions={{
              color: "#93c5fd",
              fillColor: "#bfdbfe",
              fillOpacity: 0.35,
              weight: 2,
            }}
          />

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
          </>
        )}
      </MapContainer>

      {latest && (
        <>
        <button
          type="button"
          onClick={() => setFollowVehicle(true)}
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            zIndex: 500,
            padding: "8px 10px",
            borderRadius: 12,
            background: followVehicle ? "#2563eb" : "#ffffff",
            border: "1px solid #bfdbfe",
            color: followVehicle ? "#ffffff" : "#1d4ed8",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {followVehicle ? "Following Vehicle" : "Follow Vehicle"}
        </button>

        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            zIndex: 500,
            padding: "8px 10px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #dbeafe",
            fontSize: 12,
            fontWeight: 800,
            color: "#1d4ed8",
          }}
        >
          Live driver tracking - {latest.recorded_at ? new Date(latest.recorded_at).toLocaleTimeString() : "waiting"}
        </div>
        </>
      )}
    </div>
  );
}
