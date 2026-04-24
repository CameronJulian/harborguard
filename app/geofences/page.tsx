"use client";

import { CSSProperties, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Geofence = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  outline: "none",
  background: "#fff",
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 12,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 16px",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  padding: "12px 16px",
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLng, setCenterLng] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("");

  async function loadGeofences() {
    setLoading(true);

    try {
      const response = await fetch("/api/geofences", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load geofences.");
        return;
      }

      setGeofences(result.geofences || []);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message || "Failed to load geofences.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGeofences();
  }, []);

  async function handleCreate() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/geofences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          center_lat: Number(centerLat),
          center_lng: Number(centerLng),
          radius_meters: Number(radiusMeters),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to create geofence.");
        return;
      }

      setName("");
      setCenterLat("");
      setCenterLng("");
      setRadiusMeters("");
      setMessage("Geofence created successfully.");
      await loadGeofences();
    } catch (err: any) {
      setMessage(err.message || "Failed to create geofence.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleGeofence(id: string, isActive: boolean) {
    setMessage("");

    try {
      const response = await fetch("/api/geofences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          is_active: !isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to update geofence.");
        return;
      }

      setMessage("Geofence updated.");
      await loadGeofences();
    } catch (err: any) {
      setMessage(err.message || "Failed to update geofence.");
    }
  }

  async function deleteGeofence(id: string) {
    const confirmed = window.confirm("Delete this geofence?");
    if (!confirmed) return;

    setMessage("");

    try {
      const response = await fetch(`/api/geofences?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to delete geofence.");
        return;
      }

      setMessage("Geofence deleted.");
      await loadGeofences();
    } catch (err: any) {
      setMessage(err.message || "Failed to delete geofence.");
    }
  }

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>Geofence Management</h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Create and manage safe zones for ports, fisheries, depots, and restricted areas.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, margin: "0 0 16px 0" }}>Create Geofence</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr 1fr 180px",
            gap: 14,
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zone name"
            style={inputStyle}
          />

          <input
            value={centerLat}
            onChange={(e) => setCenterLat(e.target.value)}
            placeholder="Center latitude"
            style={inputStyle}
          />

          <input
            value={centerLng}
            onChange={(e) => setCenterLng(e.target.value)}
            placeholder="Center longitude"
            style={inputStyle}
          />

          <input
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
            placeholder="Radius meters"
            style={inputStyle}
          />

          <button
            onClick={handleCreate}
            style={primaryButtonStyle}
            disabled={saving}
          >
            {saving ? "Saving..." : "Create Zone"}
          </button>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 28, margin: 0 }}>Saved Geofences</h2>

          <button onClick={loadGeofences} style={secondaryButtonStyle}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div>Loading geofences...</div>
        ) : geofences.length === 0 ? (
          <div style={{ color: "#64748b" }}>No geofences created yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {geofences.map((zone) => (
              <div
                key={zone.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 18,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
                      {zone.name}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 14 }}>
                      Created: {formatDateTime(zone.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: zone.is_active ? "#dcfce7" : "#e5e7eb",
                      color: zone.is_active ? "#166534" : "#475569",
                      fontWeight: 800,
                    }}
                  >
                    {zone.is_active ? "Active" : "Disabled"}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ color: "#64748b", fontSize: 14 }}>Center Latitude</div>
                    <div style={{ fontWeight: 700 }}>{zone.center_lat}</div>
                  </div>

                  <div>
                    <div style={{ color: "#64748b", fontSize: 14 }}>Center Longitude</div>
                    <div style={{ fontWeight: 700 }}>{zone.center_lng}</div>
                  </div>

                  <div>
                    <div style={{ color: "#64748b", fontSize: 14 }}>Radius</div>
                    <div style={{ fontWeight: 700 }}>{zone.radius_meters} m</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => toggleGeofence(zone.id, zone.is_active)}
                    style={secondaryButtonStyle}
                  >
                    {zone.is_active ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => deleteGeofence(zone.id)}
                    style={{
                      ...secondaryButtonStyle,
                      border: "1px solid #fecaca",
                      color: "#b91c1c",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}