"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";

type WeatherSnapshot = {
  temperatureC: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  precipitationMm: number | null;
  visibilityKm: number | null;
  weatherCode: number | null;
  riskScore: number;
  riskLevel: string;
  riskReasons: string[];
};

type WeatherSummary = {
  affectedVehicles: number;
  severeWeatherVehicles: number;
  warnings: string[];
};
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
  weatherSummary?: WeatherSummary;
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
  weather?: WeatherSnapshot | null;
  weatherPenalty?: number;
};

function levelColor(level: string) {
  if (level === "Critical") return "#dc2626";
  if (level === "Warning") return "#d97706";
  return "#16a34a";
}
function weatherRiskColor(level?: string) {
  if (level === "critical") return "#dc2626";
  if (level === "high") return "#ea580c";
  if (level === "medium") return "#d97706";
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

  useRealtimeRefresh({
    tables: [
      "vehicle_locations",
      "vehicle_alerts",
      "vehicle_trips",
      "incidents",
    ],
    refresh: loadFleetHealth,
    pollingMs: 60000,
  });

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
    [
      "Weather Affected",
      health.weatherSummary?.affectedVehicles ?? 0,
    ],
    [
      "Severe Weather",
      health.weatherSummary?.severeWeatherVehicles ?? 0,
    ],
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

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            marginBottom: 10,
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px 0" }}>
              Weather Impact
            </h3>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              Live weather risk affecting active fleet vehicles.
            </div>
          </div>

          <div
            style={{
              fontWeight: 900,
              color:
                (health.weatherSummary?.severeWeatherVehicles ?? 0) > 0
                  ? "#dc2626"
                  : (health.weatherSummary?.affectedVehicles ?? 0) > 0
                    ? "#d97706"
                    : "#16a34a",
            }}
          >
            {(health.weatherSummary?.severeWeatherVehicles ?? 0) > 0
              ? "Severe conditions"
              : (health.weatherSummary?.affectedVehicles ?? 0) > 0
                ? "Weather impact detected"
                : "No significant impact"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Affected vehicles
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              {health.weatherSummary?.affectedVehicles ?? 0}
            </div>
          </div>

          <div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Severe weather vehicles
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color:
                  (health.weatherSummary?.severeWeatherVehicles ?? 0) > 0
                    ? "#dc2626"
                    : "#0f172a",
              }}
            >
              {health.weatherSummary?.severeWeatherVehicles ?? 0}
            </div>
          </div>

          <div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Provider warnings
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              {health.weatherSummary?.warnings?.length ?? 0}
            </div>
          </div>
        </div>

        {(health.weatherSummary?.warnings?.length ?? 0) > 0 ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontSize: 13,
            }}
          >
            {health.weatherSummary?.warnings?.[0]}
          </div>
        ) : null}
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

                  {vehicle.weather ? (
                    <div
                      style={{
                        color: weatherRiskColor(
                          vehicle.weather.riskLevel
                        ),
                        fontSize: 13,
                        fontWeight: 800,
                        marginTop: 4,
                      }}
                    >
                      Weather: {vehicle.weather.riskLevel}
                      {" • "}
                      {vehicle.weather.temperatureC ?? "-"}°C
                      {" • "}
                      penalty {vehicle.weatherPenalty ?? 0}
                    </div>
                  ) : (
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      Weather data unavailable
                    </div>
                  )}

                  {vehicle.weather?.riskReasons?.length ? (
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      {vehicle.weather.riskReasons
                        .slice(0, 2)
                        .join(" • ")}
                    </div>
                  ) : null}
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


