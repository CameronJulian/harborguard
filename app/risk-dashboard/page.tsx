"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type FleetVehicle = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  driverName?: string | null;
  isActive?: boolean;
  isOffline?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  speedKmh?: number | null;
  lastSeen?: string | null;
  openAlerts?: FleetAlert[];
};

type FleetAlert = {
  id?: string;
  vehicle_id?: string;
  alert_type?: string | null;
  severity?: string | null;
  message?: string | null;
  is_resolved?: boolean;
  created_at?: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatAlertType(value?: string | null) {
  return (value || "unknown_alert").replace(/_/g, " ").toUpperCase();
}

function riskLabel(vehicle: FleetVehicle) {
  const alerts = vehicle.openAlerts || [];
  if (alerts.some((a) => a.severity === "critical")) return "Critical";
  if (alerts.length > 0) return "Alert";
  if (vehicle.isOffline) return "Offline";
  return "Normal";
}

function riskColor(label: string) {
  if (label === "Critical") return "#dc2626";
  if (label === "Alert") return "#ea580c";
  if (label === "Offline") return "#64748b";
  return "#16a34a";
}

function severityToColor(severity?: string | null) {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

export default function RiskDashboardPage() {
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadFleet() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/fleet/live", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load fleet risk data.");
        return;
      }

      setFleet(result.fleet || []);
    } catch (err: any) {
      setMessage(err.message || "Failed to load fleet risk data.");
    } finally {
      setLoading(false);
    }
  }

  async function runRiskDetection() {
    setMessage("Running risk detection...");

    try {
      const response = await fetch("/api/fleet/detect-risks", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Risk detection failed.");
        return;
      }

      setMessage(
        `Risk detection complete. New alerts created: ${
          result.createdCount || 0
        }`
      );
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Risk detection failed.");
    }
  }

  useEffect(() => {
    loadFleet();

    const interval = setInterval(loadFleet, 15000);
    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    const totalVehicles = fleet.length;
    const offlineVehicles = fleet.filter((v) => v.isOffline).length;
    const vehiclesWithAlerts = fleet.filter(
      (v) => (v.openAlerts || []).length > 0
    ).length;
    const criticalVehicles = fleet.filter((v) =>
      (v.openAlerts || []).some((a) => a.severity === "critical")
    ).length;

    return {
      totalVehicles,
      normalVehicles: Math.max(
        totalVehicles - vehiclesWithAlerts - offlineVehicles,
        0
      ),
      offlineVehicles,
      vehiclesWithAlerts,
      criticalVehicles,
    };
  }, [fleet]);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>
          Fleet Risk Dashboard
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Live operational view of vehicles, active risks, critical alerts, and
          replay actions.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Vehicles",
            value: summary.totalVehicles,
            color: "#0f172a",
          },
          {
            label: "Normal",
            value: summary.normalVehicles,
            color: "#16a34a",
          },
          {
            label: "Offline",
            value: summary.offlineVehicles,
            color: "#64748b",
          },
          {
            label: "With Alerts",
            value: summary.vehiclesWithAlerts,
            color: "#ea580c",
          },
          {
            label: "Critical",
            value: summary.criticalVehicles,
            color: "#dc2626",
          },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: 20 }}>
            <div
              style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}
            >
              {item.label}
            </div>
            <div
              style={{ fontSize: 34, fontWeight: 900, color: item.color }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={loadFleet}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              background: "#fff",
              padding: "12px 16px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <button
            onClick={runRiskDetection}
            style={{
              border: "none",
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              padding: "12px 16px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Run Risk Detection
          </button>

          <div style={{ color: "#64748b", fontSize: 14 }}>
            Auto-refreshes every 15 seconds.
          </div>
        </div>

        {message ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>

      <div style={{ ...cardStyle, padding: 24 }}>
        <h2 style={{ fontSize: 28, margin: "0 0 18px 0" }}>
          Live Risk Register
        </h2>

        {loading ? (
          <div>Loading risk data...</div>
        ) : fleet.length === 0 ? (
          <div style={{ color: "#64748b" }}>No vehicles found.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {fleet.map((vehicle) => {
              const label = riskLabel(vehicle);
              const color = riskColor(label);
              const alerts = vehicle.openAlerts || [];

              return (
                <div
                  key={vehicle.id}
                  style={{
                    border: `1px solid ${
                      label === "Normal" ? "#e5e7eb" : "#fecaca"
                    }`,
                    borderRadius: 16,
                    padding: 18,
                    background: label === "Critical" ? "#fff7f7" : "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1fr 220px",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>
                        {vehicle.nickname || vehicle.registrationNumber}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Reg: {vehicle.registrationNumber}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Driver: {vehicle.driverName || "-"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Risk
                      </div>
                      <div style={{ fontWeight: 900, color }}>{label}</div>
                    </div>

                    <div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Speed
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {vehicle.speedKmh ?? 0} km/h
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        Last Seen
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {formatDateTime(vehicle.lastSeen)}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        Coords:{" "}
                        {typeof vehicle.latitude === "number" &&
                        typeof vehicle.longitude === "number"
                          ? `${vehicle.latitude}, ${vehicle.longitude}`
                          : "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Link
                        href={`/route-replay?vehicleId=${vehicle.id}&autoplay=1`}
                        style={{
                          textDecoration: "none",
                          borderRadius: 12,
                          background: "#2563eb",
                          color: "#fff",
                          padding: "10px 12px",
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        Replay
                      </Link>

                      <Link
                        href="/vehicle-alerts"
                        style={{
                          textDecoration: "none",
                          borderRadius: 12,
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          padding: "10px 12px",
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        Alerts
                      </Link>
                    </div>
                  </div>

                  {alerts.length > 0 ? (
                    <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                      {alerts.map((alert, index) => (
                        <div
                          key={alert.id || `${vehicle.id}-alert-${index}`}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <strong
                            style={{
                              color: severityToColor(alert.severity),
                            }}
                          >
                            {formatAlertType(alert.alert_type)}
                          </strong>{" "}
                          — {alert.message || "No alert message provided."}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}