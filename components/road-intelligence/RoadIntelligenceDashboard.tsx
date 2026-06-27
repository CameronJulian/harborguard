"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type RoadIncident = {
  id: string;
  title: string;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  source?: string | null;
  description?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

const emptyForm = {
  title: "",
  type: "roadblock",
  severity: "medium",
  latitude: "",
  longitude: "",
  radius_meters: "500",
  source: "manual",
  description: "",
  expires_at: "",
};

function severityColor(severity: string) {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

export default function RoadIntelligenceDashboard() {
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadIncidents() {
    try {
      const response = await fetchWithAuth("/api/road-incidents", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setIncidents(result.incidents || []);
      } else {
        setMessage(result.error || "Failed to load road incidents.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load road incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  const stats = useMemo(() => {
    const active = incidents.filter((incident) => incident.is_active);
    return {
      total: incidents.length,
      active: active.length,
      critical: active.filter((incident) => incident.severity === "critical").length,
      high: active.filter((incident) => incident.severity === "high").length,
      medium: active.filter((incident) => incident.severity === "medium").length,
      inactive: incidents.filter((incident) => !incident.is_active).length,
    };
  }, [incidents]);

  async function createIncident(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetchWithAuth("/api/road-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          severity: form.severity,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radius_meters: Number(form.radius_meters),
          source: form.source,
          description: form.description,
          expires_at: form.expires_at || null,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to create road incident.");
        return;
      }

      setForm(emptyForm);
      setMessage("Road intelligence incident created.");
      await loadIncidents();
    } catch (error: any) {
      setMessage(error.message || "Failed to create road incident.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleIncident(incident: RoadIncident) {
    setMessage("");

    const response = await fetchWithAuth("/api/road-incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: incident.id,
        is_active: !incident.is_active,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to update incident.");
      return;
    }

    await loadIncidents();
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div
        style={{
          padding: 24,
          borderRadius: 22,
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: "#93c5fd", marginBottom: 8 }}>
          ROAD INTELLIGENCE
        </div>

        <h1 style={{ margin: 0, fontSize: 38 }}>Road Intelligence Console</h1>

        <div style={{ marginTop: 8, color: "#cbd5e1" }}>
          Manage roadblocks, congestion, construction, crime hotspots, closures, and traffic intelligence feeding Command Center.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
        {[
          ["Total", stats.total, "#0f172a"],
          ["Active", stats.active, "#16a34a"],
          ["Critical", stats.critical, "#dc2626"],
          ["High", stats.high, "#ea580c"],
          ["Medium", stats.medium, "#d97706"],
          ["Inactive", stats.inactive, "#64748b"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding: 18, borderRadius: 18, background: "#ffffff", border: "1px solid #e5e7eb" }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
            <div style={{ color: String(color), fontSize: 32, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <form
        onSubmit={createIncident}
        style={{
          padding: 22,
          borderRadius: 20,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          display: "grid",
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0 }}>Add Road Intelligence Incident</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />

          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }}>
            <option value="roadblock">Roadblock</option>
            <option value="accident">Accident</option>
            <option value="construction">Construction</option>
            <option value="congestion">Congestion</option>
            <option value="road_closure">Road Closure</option>
            <option value="smash_grab_hotspot">Crime Hotspot</option>
            <option value="traffic_light_outage">Traffic Light Outage</option>
            <option value="protest">Protest</option>
            <option value="flooding">Flooding</option>
          </select>

          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />

          <input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />

          <input placeholder="Radius meters" value={form.radius_meters} onChange={(e) => setForm({ ...form, radius_meters: e.target.value })} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />

          <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />

          <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />
        </div>

        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: 80, padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />

        <button type="submit" disabled={saving} style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: "#2563eb", color: "#ffffff", fontWeight: 900, cursor: "pointer" }}>
          {saving ? "Saving..." : "Add Incident"}
        </button>

        {message && <div style={{ color: message.includes("created") ? "#16a34a" : "#dc2626", fontWeight: 800 }}>{message}</div>}
      </form>

      <div style={{ padding: 22, borderRadius: 20, background: "#ffffff", border: "1px solid #e5e7eb" }}>
        <h2 style={{ marginTop: 0 }}>Active Road Intelligence</h2>

        {loading ? (
          <div>Loading road intelligence...</div>
        ) : incidents.length === 0 ? (
          <div style={{ color: "#64748b" }}>No road intelligence incidents found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {incidents.map((incident) => (
              <div
                key={incident.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: incident.is_active ? "#ffffff" : "#f8fafc",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {incident.title}
                    <span style={{ marginLeft: 8, color: severityColor(incident.severity) }}>
                      {incident.severity?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ color: "#64748b", marginTop: 4, fontSize: 14 }}>
                    {incident.type?.replaceAll("_", " ")} · {incident.latitude}, {incident.longitude} · Radius {incident.radius_meters}m · Source {incident.source || "unknown"}
                  </div>

                  {incident.description && (
                    <div style={{ color: "#475569", marginTop: 6 }}>{incident.description}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleIncident(incident)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: incident.is_active ? "#dc2626" : "#16a34a",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {incident.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
