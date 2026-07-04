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
	
	const totalDistance =
  destination && latest
    ? Math.sqrt(
        Math.pow(destination.lat - latest.latitude, 2) +
        Math.pow(destination.lng - latest.longitude, 2)
      )
    : 0;

const travelledDistance =
  routePositions.length > 1
    ? routePositions.length - 1
    : 0;

const progress =
  totalDistance > 0
    ? Math.min(
        100,
        Math.round(
          (travelledDistance /
            (travelledDistance + totalDistance * 100)) *
            100
        )
      )
    : 0;

  const speedKmh = latest?.speed ? Math.round(Number(latest.speed)) : 0;

  const remainingKm =
    destination && latest
      ? Number((totalDistance * 111).toFixed(2))
      : null;

  const etaMinutes =
    remainingKm !== null && speedKmh > 0
      ? Math.max(1, Math.round((remainingKm / speedKmh) * 60))
      : null;

  const etaTime =
    etaMinutes !== null
      ? new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString()
      : "Calculating";

  const signalStatus = latest?.recorded_at
    ? "LIVE"
    : "WAITING";

  return (
    <div style={{ height: 360, borderRadius: 16, overflow: "hidden", border: "1px solid #cbd5e1", background: "#f8fafc", position: "relative" }}>
	<div
  style={{
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #dbeafe",
  }}
>
  <div
    style={{
      fontWeight: 700,
      marginBottom: 8,
    }}
  >
    Mission Progress
  </div>

  <div
    style={{
      height: 10,
      background: "#e5e7eb",
      borderRadius: 999,
      overflow: "hidden",
      marginBottom: 8,
    }}
  >
    <div
      style={{
        width: `${progress}%`,
        height: "100%",
        background: "#2563eb",
        transition: "width .4s ease",
      }}
    />
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
    }}
  >
    <span>{progress}% Complete</span>

    <span>
      {mission?.status ?? "Pending"}
    </span>
  </div>
</div>

      <div
        style={{
          marginBottom: 12,
          padding: 14,
          borderRadius: 12,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Dispatcher ETA & Arrival Intelligence
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, fontSize: 13 }}>
          <div><strong>Status:</strong> {mission?.status ?? "Pending"}</div>
          <div><strong>Signal:</strong> {signalStatus}</div>
          <div><strong>ETA:</strong> {etaMinutes !== null ? `${etaMinutes} min (${etaTime})` : "Calculating"}</div>
          <div><strong>Remaining:</strong> {remainingKm !== null ? `${remainingKm} km` : "Unknown"}</div>
          <div><strong>Speed:</strong> {speedKmh > 0 ? `${speedKmh} km/h` : "Unknown"}</div>
          <div><strong>Last GPS:</strong> {latest?.recorded_at ? new Date(latest.recorded_at).toLocaleTimeString() : "Waiting"}</div>
        </div>
      </div>

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
