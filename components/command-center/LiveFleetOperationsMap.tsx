"use client";

import { useMemo, useState } from "react";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";
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
import { fetchWithAuth } from "@/lib/auth-fetch";

type TrackingItem = {
  missionId: string;
  vehicle: string;
  status: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  destination: { lat: number; lng: number };
  remainingKm: number;
  progressPercent: number;
  etaMinutes: number;
  arrived: boolean;
  autoTransition: string | null;
  lastSeen: string;
};

function statusColor(status: string) {
  if (status === "Arrived") return "#16a34a";
  if (status === "En Route") return "#2563eb";
  if (status === "In Progress") return "#7c3aed";
  return "#ea580c";
}

export default function LiveFleetOperationsMap() {
  const [tracking, setTracking] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTracking() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/dispatch/tracking", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load operations map.");
        return;
      }

      setTracking(result.tracking || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load operations map.");
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: [
      "vehicle_locations",
      "dispatch_missions",
      "route_assignments",
      "vehicle_trips",
    ],
    refresh: loadTracking,
    pollingMs: 15000,
  });

  const center = useMemo<[number, number]>(() => {
    const first = tracking.find((item) => item.latitude && item.longitude);
    return first ? [first.latitude, first.longitude] : [-33.9249, 18.4241];
  }, [tracking]);

  return (
    <section style={{ padding: 22, borderRadius: 22, background: "#ffffff", border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#0369a1", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            LIVE FLEET OPERATIONS MAP
          </div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Active Mission Map</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            Visualizes live vehicle position, destination, route line, ETA, mission progress, and arrival state.
          </div>
        </div>

        <button
          type="button"
          onClick={loadTracking}
          disabled={loading}
          style={{ height: "fit-content", padding: "10px 14px", borderRadius: 12, border: 0, background: "#0369a1", color: "#ffffff", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Refreshing..." : "Refresh Map"}
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      <div style={{ height: 520, borderRadius: 18, overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {tracking.map((item) => {
            const color = statusColor(item.status);
            const vehiclePosition: [number, number] = [item.latitude, item.longitude];
            const destinationPosition: [number, number] = [item.destination.lat, item.destination.lng];

            return (
              <div key={item.missionId}>
                <Polyline positions={[vehiclePosition, destinationPosition]} pathOptions={{ color, weight: 4 }} />

                <CircleMarker center={vehiclePosition} radius={10} pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}>
                  <Popup>
                    <strong>{item.vehicle}</strong>
                    <br />
                    Status: {item.status}
                    <br />
                    Progress: {item.progressPercent}%
                    <br />
                    Remaining: {item.remainingKm} km
                    <br />
                    ETA: {item.etaMinutes} min
                    <br />
                    Speed: {item.speedKmh} km/h
                  </Popup>
                </CircleMarker>

                <CircleMarker center={destinationPosition} radius={8} pathOptions={{ color: "#111827", fillColor: item.arrived ? "#16a34a" : "#facc15", fillOpacity: 0.9 }}>
                  <Popup>
                    <strong>Destination</strong>
                    <br />
                    Mission #{item.missionId.slice(0, 8)}
                    <br />
                    {item.arrived ? "Vehicle arrived" : "Vehicle en route"}
                  </Popup>
                </CircleMarker>
              </div>
            );
          })}
        </MapContainer>
      </div>

      <div style={{ color: "#64748b", fontSize: 13, marginTop: 10 }}>
        Showing {tracking.length} active mission(s). Map refreshes every 15 seconds.
      </div>
    </section>
  );
}

