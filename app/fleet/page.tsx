"use client";

import "leaflet/dist/leaflet.css";

import dynamic from "next/dynamic";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

type FleetAlert = {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  createdAt: string | null;
};

type FleetVehicle = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  driverId: string | null;
  driverName: string | null;
  isActive: boolean;
  isOffline: boolean;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number;
  heading: number;
  source: string | null;
  lastSeen: string | null;
  openAlerts: FleetAlert[];
};

type FleetResponse = {
  success: boolean;
  fleet: FleetVehicle[];
  summary: {
    totalVehicles: number;
    onlineVehicles: number;
    offlineVehicles: number;
    vehiclesWithAlerts: number;
  };
};

type VehicleLocationInsert = {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading: number | null;
  recorded_at: string | null;
  source: string | null;
};

const capeTownCenter: [number, number] = [-33.9249, 18.4241];

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: "0 0 8px 0",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

async function createVehicleIcon(status: "online" | "offline" | "alert") {
  const L = (await import("leaflet")).default;

  const color =
    status === "alert" ? "#dc2626" : status === "offline" ? "#64748b" : "#16a34a";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:18px;
        height:18px;
        border-radius:9999px;
        background:${color};
        border:3px solid white;
        box-shadow:0 0 0 2px rgba(15,23,42,0.12);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function computeOffline(lastSeen: string | null) {
  if (!lastSeen) return true;
  return Date.now() - new Date(lastSeen).getTime() > 15 * 60 * 1000;
}

export default function FleetDashboardPage() {
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [vehicleIcons, setVehicleIcons] = useState<Record<string, any>>({});
  const subscribedRef = useRef(false);

  async function loadFleet(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch("/api/fleet/live", {
        cache: "no-store",
      });

      const result = (await response.json()) as FleetResponse | { error: string };

      if (!response.ok) {
        setMessage("error" in result ? result.error : "Failed to load fleet data.");
        return;
      }

      setFleet((result as FleetResponse).fleet || []);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message || "Failed to load fleet data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFleet();
  }, []);

  const mapVehicles = useMemo(
    () =>
      fleet.filter(
        (vehicle) =>
          typeof vehicle.latitude === "number" &&
          typeof vehicle.longitude === "number"
      ),
    [fleet]
  );

  useEffect(() => {
    let cancelled = false;

    async function buildIcons() {
      const nextIcons: Record<string, any> = {};

      for (const vehicle of mapVehicles) {
        const markerStatus =
          vehicle.openAlerts.length > 0
            ? "alert"
            : vehicle.isOffline
              ? "offline"
              : "online";

        nextIcons[vehicle.id] = await createVehicleIcon(markerStatus);
      }

      if (!cancelled) {
        setVehicleIcons(nextIcons);
      }
    }

    if (mapVehicles.length > 0) {
      buildIcons();
    } else {
      setVehicleIcons({});
    }

    return () => {
      cancelled = true;
    };
  }, [mapVehicles]);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel("vehicle-location-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vehicle_locations",
        },
        (payload) => {
          const row = payload.new as VehicleLocationInsert;

          setFleet((current) => {
            const exists = current.some((vehicle) => vehicle.id === row.vehicle_id);

            if (!exists) {
              return current;
            }

            return current.map((vehicle) => {
              if (vehicle.id !== row.vehicle_id) return vehicle;

              return {
                ...vehicle,
                latitude: row.latitude,
                longitude: row.longitude,
                speedKmh: row.speed_kmh ?? 0,
                heading: row.heading ?? 0,
                source: row.source ?? null,
                lastSeen: row.recorded_at,
                isOffline: computeOffline(row.recorded_at),
              };
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFleet((current) =>
        current.map((vehicle) => {
          const isOffline = computeOffline(vehicle.lastSeen);
          if (vehicle.isOffline === isOffline) return vehicle;
          return { ...vehicle, isOffline };
        })
      );
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(() => {
    const totalVehicles = fleet.length;
    const onlineVehicles = fleet.filter((v) => !v.isOffline).length;
    const offlineVehicles = fleet.filter((v) => v.isOffline).length;
    const vehiclesWithAlerts = fleet.filter((v) => v.openAlerts.length > 0).length;

    return {
      totalVehicles,
      onlineVehicles,
      offlineVehicles,
      vehiclesWithAlerts,
    };
  }, [fleet]);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
        <h2 style={sectionTitleStyle}>Live Fleet Map</h2>
        <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
          Real-time monitoring of all bakkies across Cape Town routes, ports, and fisheries.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => loadFleet(true)}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {refreshing ? "Refreshing..." : "Reload Fleet"}
          </button>

          <div style={{ color: "#64748b", fontSize: 14 }}>
            Live updates enabled via Supabase Realtime
          </div>
        </div>

        {message ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Vehicles", value: summary.totalVehicles },
          { label: "Online", value: summary.onlineVehicles },
          { label: "Offline", value: summary.offlineVehicles },
          { label: "With Alerts", value: summary.vehiclesWithAlerts },
        ].map((item, index) => (
          <div key={index} style={{ ...cardStyle, padding: 24 }}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 6 }}>Fleet Map</h2>
            <p style={mutedTextStyle}>
              Green = online, grey = offline, red = active alert.
            </p>
          </div>

          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              height: 560,
            }}
          >
            {loading ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                Loading map...
              </div>
            ) : (
              <MapContainer
                center={capeTownCenter}
                zoom={10}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {mapVehicles.map((vehicle) => {
                  if (!vehicleIcons[vehicle.id]) return null;

                  return (
                    <Marker
                      key={vehicle.id}
                      position={[vehicle.latitude as number, vehicle.longitude as number]}
                      icon={vehicleIcons[vehicle.id]}
                    >
                      <Popup>
                        <div style={{ minWidth: 220 }}>
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>
                            {vehicle.nickname || vehicle.registrationNumber}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>Registration:</strong> {vehicle.registrationNumber}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>Driver:</strong> {vehicle.driverName || "-"}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>Speed:</strong> {vehicle.speedKmh || 0} km/h
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>Last Seen:</strong> {formatDateTime(vehicle.lastSeen)}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>Status:</strong>{" "}
                            {vehicle.openAlerts.length > 0
                              ? "Alert"
                              : vehicle.isOffline
                                ? "Offline"
                                : "Online"}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 8 }}>Live Vehicle Feed</h2>
            <p style={{ ...mutedTextStyle, marginBottom: 16 }}>
              Current status of every tracked bakkie.
            </p>

            <div style={{ display: "grid", gap: 12, maxHeight: 500, overflowY: "auto" }}>
              {fleet.length === 0 ? (
                <div style={{ color: "#64748b" }}>No vehicles found.</div>
              ) : (
                fleet.map((vehicle) => {
                  const statusText =
                    vehicle.openAlerts.length > 0
                      ? "Alert"
                      : vehicle.isOffline
                        ? "Offline"
                        : "Online";

                  const statusColor =
                    vehicle.openAlerts.length > 0
                      ? "#dc2626"
                      : vehicle.isOffline
                        ? "#64748b"
                        : "#16a34a";

                  return (
                    <div
                      key={vehicle.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 14,
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {vehicle.nickname || vehicle.registrationNumber}
                        </div>
                        <div style={{ color: statusColor, fontWeight: 800 }}>
                          {statusText}
                        </div>
                      </div>

                      <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                        <strong>Reg:</strong> {vehicle.registrationNumber}
                      </div>
                      <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                        <strong>Driver:</strong> {vehicle.driverName || "-"}
                      </div>
                      <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                        <strong>Speed:</strong> {vehicle.speedKmh || 0} km/h
                      </div>
                      <div style={{ color: "#334155", fontSize: 14, marginBottom: 4 }}>
                        <strong>Coords:</strong> {vehicle.latitude ?? "-"}, {vehicle.longitude ?? "-"}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        Last seen: {formatDateTime(vehicle.lastSeen)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 8 }}>Open Alerts</h2>
            <p style={{ ...mutedTextStyle, marginBottom: 16 }}>
              Vehicles needing immediate attention.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {fleet.flatMap((vehicle) =>
                vehicle.openAlerts.map((alert) => ({
                  vehicle,
                  alert,
                }))
              ).length === 0 ? (
                <div style={{ color: "#16a34a", fontWeight: 700 }}>
                  No active alerts.
                </div>
              ) : (
                fleet.flatMap((vehicle) =>
                  vehicle.openAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>
                        {vehicle.nickname || vehicle.registrationNumber}
                      </div>
                      <div style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 4 }}>
                        <strong>Type:</strong> {alert.alertType.replace(/_/g, " ")}
                      </div>
                      <div style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 4 }}>
                        <strong>Severity:</strong> {alert.severity}
                      </div>
                      <div style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 4 }}>
                        {alert.message}
                      </div>
                      <div style={{ color: "#991b1b", fontSize: 12 }}>
                        {formatDateTime(alert.createdAt)}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}