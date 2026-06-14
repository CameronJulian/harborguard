"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  width: "100%",
  boxSizing: "border-box" as const,
};

const buttonStyle = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
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
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState("roadblock");
  const [severity, setSeverity] = useState("high");
  const [title, setTitle] = useState("Possible roadblock ahead");
  const [description, setDescription] = useState(
    "Reported road safety issue. Driver should proceed with caution."
  );
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("1500");
  const [expiresHours, setExpiresHours] = useState("6");

  const spokenAlerts = useRef<Set<string>>(new Set());

  function updateTitleForType(nextType: string) {
    setType(nextType);

    if (nextType === "roadblock") {
      setTitle("Possible roadblock ahead");
      setSeverity("high");
      setDescription("Reported roadblock on current route. Driver should consider alternate route.");
    } else if (nextType === "traffic_light_outage") {
      setTitle("Traffic lights not working");
      setSeverity("medium");
      setDescription("Reported robot outage at nearby intersection.");
    } else if (nextType === "smash_grab_hotspot") {
      setTitle("Known smash-and-grab hotspot");
      setSeverity("critical");
      setDescription("High-risk stop or intersection. Driver should remain alert and keep valuables out of sight.");
    } else {
      setTitle("Route safety alert");
      setSeverity("medium");
      setDescription("Reported road safety issue. Driver should proceed with caution.");
    }
  }

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
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(String(lat));
        setLongitude(String(lng));

        await fetchAlerts(lat, lng, "safety");
      },
      () => {
        setMessage("Location permission denied or unavailable.");
      }
    );
  }

  async function loadTestDurbanAlerts() {
    setLatitude("-29.8587");
    setLongitude("31.0218");
    await fetchAlerts(-29.8587, 31.0218, "test safety");
  }

  async function useCurrentLocationForReport() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setMessage("Current location added to report form.");
      },
      () => {
        setMessage("Could not get current location.");
      }
    );
  }

  async function handleCreateAlert(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetchWithAuth("/api/route-safety/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        title,
        description,
        severity,
        latitude,
        longitude,
        radius_meters: Number(radiusMeters),
        expires_hours: Number(expiresHours),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setSaving(false);
      setMessage(result.error || "Failed to create route safety alert.");
      return;
    }

    setMessage("Route safety alert created successfully.");

    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      await fetchAlerts(Number(latitude), Number(longitude), "safety");
    }

    setSaving(false);
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

      <div style={{ display: "flex", gap: 12, margin: "24px 0", flexWrap: "wrap" }}>
        <button onClick={loadSafetyAlerts} style={buttonStyle}>
          Refresh Safety Alerts
        </button>

        <button onClick={loadTestDurbanAlerts} style={buttonStyle}>
          Test Durban Alerts
        </button>

        <button onClick={useCurrentLocationForReport} style={{ ...buttonStyle, background: "#0f172a" }}>
          Use Current Location
        </button>
      </div>

      <p style={{ fontWeight: 700 }}>{message}</p>

      <form
        onSubmit={handleCreateAlert}
        style={{
          margin: "24px 0",
          padding: 24,
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Create Route Safety Alert</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <select value={type} onChange={(e) => updateTitleForType(e.target.value)} style={inputStyle}>
            <option value="roadblock">Roadblock</option>
            <option value="traffic_light_outage">Traffic Light Outage</option>
            <option value="smash_grab_hotspot">Smash-and-Grab Hotspot</option>
            <option value="accident">Accident</option>
            <option value="protest">Protest</option>
            <option value="high_risk_area">High Risk Area</option>
          </select>

          <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={inputStyle}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alert title" style={inputStyle} />
          <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" style={inputStyle} />
          <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" style={inputStyle} />
          <input value={radiusMeters} onChange={(e) => setRadiusMeters(e.target.value)} placeholder="Radius meters" style={inputStyle} />
          <input value={expiresHours} onChange={(e) => setExpiresHours(e.target.value)} placeholder="Expires in hours" style={inputStyle} />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          style={{
            ...inputStyle,
            minHeight: 90,
            marginTop: 14,
            fontFamily: "inherit",
          }}
        />

        <button type="submit" disabled={saving} style={{ ...buttonStyle, marginTop: 14 }}>
          {saving ? "Creating Alert..." : "Create Alert"}
        </button>
      </form>

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
