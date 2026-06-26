"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";

type FleetHealth = {
  healthScore: number;
  healthLevel: string;
  totalVehicles: number;
  online: number;
  offline: number;
  moving: number;
  stopped: number;
  busy: number;
  available: number;
  sos: number;
  activeTrips: number;
  openAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  openIncidents: number;
  criticalIncidents: number;
  geofenceBreaches: number;
  averageVehicleScore: number;
};

type VehicleHealth = {
  id: string;
  nickname: string | null;
  registrationNumber: string | null;
  status: string;
  health: string;
  score: number;
  speedKmh: number;
  lastSeen: string | null;
  openAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
};

function levelColor(level: string) {
  if (level === "Critical") return "#dc2626";
  if (level === "Warning") return "#d97706";
  return "#16a34a";
}

export default function FleetHealthDashboard() {
  const [health, setHealth] = useState<FleetHealth | null>(null);
  const [vehicles, setVehicles] = useState<VehicleHealth[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadFleetHealth() {
    try {
      const response = await fetchWithAuth("/api/fleet/health", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setHealth(result.health || null);
        setVehicles(result.vehicles || []);
      } else {
        console.error("Fleet health failed:", result.error);
      }
    } catch (error) {
      console.error("Fleet health load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFleetHealth();

    const channel = supabase
      .channel("fleet-health-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_locations" },
        () => loadFleetHealth()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_alerts" },
        () => loadFleetHealth()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_trips" },
        () => loadFleetHealth()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => loadFleetHealth()
      )
      .subscribe();

    const interval = setInterval(loadFleetHealth, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          padding: 22,
          marginBottom: 24,
        }}
      >
        Loading fleet health...
      </div>
    );
  }

  if (!health) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          padding: 22,
          marginBottom: 24,
        }}
      >
        Fleet health unavailable.
      </div>
    );
  }

  const worstVehicles = vehicles.slice(0, 5);

  const metrics = [
    ["Total", health.totalVehicles],
    ["Online", health.online],
    ["Offline", health.offline],
    ["Moving", health.moving],
    ["Stopped", health.stopped],
    ["Busy", health.busy],
    ["Available", health.available],
    ["SOS", health.sos],
    ["Active Trips", health.activeTrips],
    ["Open Alerts", health.openAlerts],
    ["Critical Alerts", health.criticalAlerts],
    ["Open Incidents", health.openIncidents],
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        padding: 22,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 26, margin: "0 0 6px 0" }}>
            Fleet Health Dashboard
          </h2>
          <div style={{ color: "#64748b" }}>
            Live operational health across vehicles, alerts, trips, and incidents.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 46,
              fontWeight: 900,
              color: levelColor(health.healthLevel),
              lineHeight: 1,
            }}
          >
            {health.healthScore}
          </div>
          <div style={{ color: "#64748b", fontWeight: 800 }}>
            /100 {health.healthLevel}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {metrics.map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ margin: "0 0 10px 0" }}>Vehicles needing attention</h3>

        {worstVehicles.length === 0 ? (
          <div style={{ color: "#64748b" }}>No vehicles found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {worstVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div>
                  <strong>
                    {vehicle.registrationNumber || vehicle.nickname || vehicle.id}
                  </strong>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {vehicle.status} • {vehicle.openAlerts} open alerts
                  </div>
                </div>

                <div style={{ fontWeight: 800 }}>{vehicle.health}</div>

                <div
                  style={{
                    fontWeight: 900,
                    color: levelColor(vehicle.health),
                  }}
                >
                  {vehicle.score}/100
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
