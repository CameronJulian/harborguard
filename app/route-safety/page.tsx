"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type SafetyAlert = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  distance_meters: number;
};

const alertIcons: Record<string, string> = {
  roadblock: "🚧",
  traffic_light_outage: "🚦",
  smash_grab_hotspot: "🚨",
  accident: "⚠️",
  protest: "⚠️",
  high_risk_area: "🛡️",
};

function alertLabel(type: string) {
  return type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getWarningMessage(alert: SafetyAlert) {
  if (alert.type === "roadblock") {
    return "Warning. Roadblock reported ahead. Alternative route may be required.";
  }

  if (alert.type === "traffic_light_outage") {
    return "Warning. Traffic lights are reported not working ahead.";
  }

  if (alert.type === "smash_grab_hotspot") {
    return "Warning. Known smash and grab hotspot ahead. Remain alert.";
  }

  return `Warning. ${alert.title} ahead.`;
}

export default function RouteSafetyPage() {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [message, setMessage] = useState("Getting location...");
  const spokenAlerts = useRef<Set<string>>(new Set());

  async function notifyDriver(alert: SafetyAlert) {
    const warning = getWarningMessage(alert);

    if (!spokenAlerts.current.has(alert.id)) {
      spokenAlerts.current.add(alert.id);

      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(warning);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }

      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(alert.title, {
            body: `${alertLabel(alert.type)} - ${alert.distance_meters}m away`,
          });
        } else if (Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      }
    }
  }

  async function fetchAlerts(lat: number, lng: number, label = "safety") {
    const response = await fetchWithAuth(
      `/api/route-safety/nearby?lat=${lat}&lng=${lng}`,
      { cache: "no-store" }
    );

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to load route safety alerts.");
      return;
    }

    const nextAlerts = result.alerts || [];
    setAlerts(nextAlerts);

    setMessage(
      nextAlerts.length
        ? `${nextAlerts.length} ${label} alert(s) nearby.`
        : `No nearby ${label} alerts.`
    );

    for (const alert of nextAlerts) {
      if (
        alert.severity === "critical" ||
        alert.severity === "high" ||
        alert.distance_meters <= 1000
      ) {
        await notifyDriver(alert);
      }
    }
  }

  async function loadSafetyAlerts() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await fetchAlerts(
          position.coords.latitude,
          position.coords.longitude,
          "safety"
        );
      },
      () => {
        setMessage("Location permission denied or unavailable.");
      }
    );
  }

  async function loadTestDurbanAlerts() {
    await fetchAlerts(-29.8587, 31.0218, "test safety");
  }

  useEffect(() => {
    loadSafetyAlerts();

    const interval = setInterval(loadSafetyAlerts, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 38, marginBottom: 8 }}>
        Route Safety Intelligence
      </h1>

      <p style={{ color: "#64748b", fontSize: 18 }}>
        Live roadblock, robot outage, and smash-and-grab hotspot alerts.
      </p>

      <div style={{ display: "flex", gap: 12, margin: "24px 0" }}>
        <button onClick={loadSafetyAlerts}>
          Refresh Safety Alerts
        </button>

        <button onClick={loadTestDurbanAlerts}>
          Test Durban Alerts
        </button>
      </div>

      <p style={{ fontWeight: 700 }}>{message}</p>

      <div style={{ display: "grid", gap: 18 }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              border: "1px solid #dbe3ef",
              borderRadius: 18,
              padding: 22,
              background:
                alert.severity === "critical"
                  ? "#fee2e2"
                  : alert.severity === "high"
                  ? "#fef3c7"
                  : "#f8fafc",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {alertIcons[alert.type] || "⚠️"} {alert.title}
            </h2>

            <p><strong>Type:</strong> {alertLabel(alert.type)}</p>
            <p><strong>Severity:</strong> {alert.severity.toUpperCase()}</p>
            <p><strong>Distance:</strong> {alert.distance_meters}m away</p>
            <p>{alert.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
