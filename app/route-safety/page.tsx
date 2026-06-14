"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type SafetyAlert = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  distance_meters: number;
};

export default function RouteSafetyPage() {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [message, setMessage] = useState("Getting location...");

  async function loadSafetyAlerts() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setMessage(`Checking nearby safety alerts at ${lat}, ${lng}...`);

        const response = await fetchWithAuth(
          `/api/route-safety/nearby?lat=${lat}&lng=${lng}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Failed to load route safety alerts.");
          return;
        }

        setAlerts(result.alerts || []);
        setMessage(
          result.alerts?.length
            ? `${result.alerts.length} safety alert(s) nearby.`
            : "No nearby safety alerts."
        );
      },
      () => {
        setMessage("Location permission denied or unavailable.");
      }
    );
  }

  useEffect(() => {
    loadSafetyAlerts();

    const interval = setInterval(loadSafetyAlerts, 30000);

    async function loadTestDurbanAlerts() {
    const response = await fetchWithAuth(
      "/api/route-safety/nearby?lat=-29.8587&lng=31.0218",
      { cache: "no-store" }
    );

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to load test safety alerts.");
      return;
    }

    setAlerts(result.alerts || []);
    setMessage(
      result.alerts?.length
        ? `${result.alerts.length} test safety alert(s) nearby.`
        : "No test safety alerts found."
    );
  }

  return () => clearInterval(interval);
  }, []);

  async function loadTestDurbanAlerts() {
    const response = await fetchWithAuth(
      "/api/route-safety/nearby?lat=-29.8587&lng=31.0218",
      { cache: "no-store" }
    );

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to load test safety alerts.");
      return;
    }

    setAlerts(result.alerts || []);
    setMessage(
      result.alerts?.length
        ? `${result.alerts.length} test safety alert(s) nearby.`
        : "No test safety alerts found."
    );
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Route Safety Intelligence</h1>
      <p>Live roadblock, robot outage, and smash-and-grab hotspot alerts.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={loadSafetyAlerts}>
          Refresh Safety Alerts
        </button>

        <button onClick={loadTestDurbanAlerts}>
          Test Durban Alerts
        </button>
      </div>

      <p>{message}</p>

      <div style={{ display: "grid", gap: 16 }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background:
                alert.severity === "critical"
                  ? "#ffe5e5"
                  : alert.severity === "high"
                  ? "#fff3cd"
                  : "#f8fafc",
            }}
          >
            <h2>{alert.title}</h2>
            <p>
              <strong>Type:</strong> {alert.type}
            </p>
            <p>
              <strong>Severity:</strong> {alert.severity}
            </p>
            <p>
              <strong>Distance:</strong> {alert.distance_meters}m away
            </p>
            <p>{alert.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

