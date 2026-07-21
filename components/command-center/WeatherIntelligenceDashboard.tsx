"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";

type WeatherRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

type WeatherSnapshot = {
  latitude: number;
  longitude: number;
  observedAt: string;
  temperatureC: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  precipitationMm: number | null;
  visibilityKm: number | null;
  weatherCode: number | null;
  riskLevel: WeatherRiskLevel;
  riskReasons: string[];
};

type WeatherResponse = {
  success: boolean;
  provider: string;
  weather: WeatherSnapshot;
  generatedAt: string;
  error?: string;
};

const CAPE_TOWN_LATITUDE = -33.9249;
const CAPE_TOWN_LONGITUDE = 18.4241;

function riskColor(level: WeatherRiskLevel) {
  if (level === "critical") return "#dc2626";
  if (level === "high") return "#ea580c";
  if (level === "medium") return "#d97706";
  return "#16a34a";
}

function formatNumber(
  value: number | null,
  suffix: string,
  decimals = 1
) {
  if (value === null) {
    return "Unavailable";
  }

  return `${value.toFixed(decimals)} ${suffix}`;
}

function weatherDescription(code: number | null) {
  if (code === null) return "Weather condition unavailable";

  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";

  return `Weather code ${code}`;
}

export default function WeatherIntelligenceDashboard() {
  const [weather, setWeather] =
    useState<WeatherSnapshot | null>(null);

  const [provider, setProvider] =
    useState("openmeteo");

  const [generatedAt, setGeneratedAt] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  async function loadWeather() {
    try {
      setMessage("");

      const params = new URLSearchParams({
        latitude: String(CAPE_TOWN_LATITUDE),
        longitude: String(CAPE_TOWN_LONGITUDE),
      });

      const response = await fetchWithAuth(
        `/api/weather/current?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as WeatherResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to load weather intelligence."
        );
      }

      setWeather(result.weather);
      setProvider(result.provider || "openmeteo");
      setGeneratedAt(result.generatedAt || null);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load weather intelligence.";

      console.error(
        "Weather intelligence load failed:",
        errorMessage
      );

      setMessage(errorMessage);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: [],
    refresh: loadWeather,
    pollingMs: 300000,
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
        Loading weather intelligence...
      </div>
    );
  }

  if (!weather) {
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
        <h2 style={{ margin: "0 0 8px 0" }}>
          Weather Intelligence
        </h2>

        <div style={{ color: "#b91c1c" }}>
          {message || "Weather intelligence unavailable."}
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadWeather();
          }}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#0f766e",
            color: "#ffffff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = [
    [
      "Temperature",
      formatNumber(weather.temperatureC, "°C"),
    ],
    [
      "Wind Speed",
      formatNumber(weather.windSpeedKph, "km/h"),
    ],
    [
      "Wind Gusts",
      formatNumber(weather.windGustKph, "km/h"),
    ],
    [
      "Precipitation",
      formatNumber(weather.precipitationMm, "mm"),
    ],
    [
      "Visibility",
      formatNumber(weather.visibilityKm, "km"),
    ],
    [
      "Condition",
      weatherDescription(weather.weatherCode),
    ],
  ];

  const color = riskColor(weather.riskLevel);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid #e5e7eb",
        boxShadow:
          "0 12px 32px rgba(15, 23, 42, 0.08)",
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
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 26,
              margin: "0 0 6px 0",
            }}
          >
            Weather Intelligence
          </h2>

          <div style={{ color: "#64748b" }}>
            Live environmental risk for Cape Town fleet
            operations.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 999,
              background: `${color}18`,
              color,
              border: `1px solid ${color}55`,
              fontSize: 13,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            {weather.riskLevel} risk
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#64748b",
              fontSize: 12,
            }}
          >
            Provider: {provider}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {metrics.map(([label, value]) => (
          <div
            key={label}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginTop: 5,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 16,
          border: `1px solid ${color}44`,
          background: `${color}0d`,
        }}
      >
        <h3
          style={{
            margin: "0 0 10px 0",
            color,
          }}
        >
          Operational assessment
        </h3>

        <div
          style={{
            display: "grid",
            gap: 7,
          }}
        >
          {weather.riskReasons.map(
            (reason, index) => (
              <div
                key={`${reason}-${index}`}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  color: "#334155",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color,
                    fontWeight: 900,
                  }}
                >
                  •
                </span>

                <span>{reason}</span>
              </div>
            )
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 14,
          color: "#64748b",
          fontSize: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          Observed:{" "}
          {new Date(
            weather.observedAt
          ).toLocaleString()}
        </span>

        <span>
          Updated:{" "}
          {generatedAt
            ? new Date(generatedAt).toLocaleString()
            : "Unknown"}
        </span>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadWeather();
          }}
          style={{
            border: "0",
            background: "transparent",
            color: "#0f766e",
            padding: 0,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh weather
        </button>
      </div>
    </div>
  );
}