"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type VehicleAlert = {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  vehicle?: {
    nickname?: string | null;
    registration_number?: string | null;
  } | null;
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function severityColor(severity: string) {
  if (severity === "critical") return "#b91c1c";
  if (severity === "high") return "#dc2626";
  if (severity === "medium") return "#d97706";
  return "#2563eb";
}

export default function VehicleAlertsPage() {
  const [alerts, setAlerts] = useState<VehicleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function loadAlerts() {
    setLoading(true);
    try {
      const response = await fetch("/api/fleet/alerts", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load alerts.");
        return;
      }

      setAlerts(result.alerts || []);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function resolveAlert(alertId: string) {
    setResolvingId(alertId);
    setMessage("");

    try {
      const response = await fetch("/api/fleet/resolve-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alertId,
          resolutionNotes: notesById[alertId] || "Resolved from vehicle alerts page.",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to resolve alert.");
        return;
      }

      await loadAlerts();
      setNotesById((current) => ({ ...current, [alertId]: "" }));
      setMessage("Alert resolved successfully.");
    } catch (err: any) {
      setMessage(err.message || "Failed to resolve alert.");
    } finally {
      setResolvingId(null);
    }
  }

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "open"
            ? !alert.is_resolved
            : alert.is_resolved;

      const vehicleName =
        alert.vehicle?.nickname || alert.vehicle?.registration_number || "";

      const matchesSearch =
        search.trim() === ""
          ? true
          : `${vehicleName} ${alert.message} ${alert.alert_type} ${alert.severity}`
              .toLowerCase()
              .includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [alerts, filter, search]);

  const summary = useMemo(() => {
    return {
      total: alerts.length,
      open: alerts.filter((a) => !a.is_resolved).length,
      resolved: alerts.filter((a) => a.is_resolved).length,
      critical: alerts.filter((a) => a.severity === "critical" && !a.is_resolved).length,
    };
  }, [alerts]);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>Vehicle Alerts</h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Review panic, offline, long-stop, and other fleet safety alerts.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 18,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Alerts", value: summary.total },
          { label: "Open", value: summary.open },
          { label: "Resolved", value: summary.resolved },
          { label: "Critical Open", value: summary.critical },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: 22 }}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 220px 160px",
            gap: 14,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle, alert type, message..."
            style={inputStyle}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="open">Open Alerts</option>
            <option value="resolved">Resolved Alerts</option>
            <option value="all">All Alerts</option>
          </select>

          <button
            onClick={loadAlerts}
            style={{
              border: "none",
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
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

      <div style={{ display: "grid", gap: 18 }}>
        {loading ? (
          <div style={{ ...cardStyle, padding: 24 }}>Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ ...cardStyle, padding: 24 }}>No alerts found.</div>
        ) : (
          filteredAlerts.map((alert) => {
            const vehicleLabel =
              alert.vehicle?.nickname ||
              alert.vehicle?.registration_number ||
              alert.vehicle_id;

            return (
              <div
                key={alert.id}
                style={{
                  ...cardStyle,
                  padding: 22,
                  border: `1px solid ${alert.is_resolved ? "#d1fae5" : "#fee2e2"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
                      {vehicleLabel}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 14 }}>
                      Created: {formatDateTime(alert.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: alert.is_resolved ? "#dcfce7" : "#fee2e2",
                      color: alert.is_resolved ? "#166534" : severityColor(alert.severity),
                      fontWeight: 800,
                      textTransform: "capitalize",
                    }}
                  >
                    {alert.is_resolved ? "Resolved" : alert.severity}
                  </div>
                </div>

                <div style={{ marginBottom: 8, fontWeight: 700, textTransform: "capitalize" }}>
                  {alert.alert_type.replace(/_/g, " ")}
                </div>

                <div style={{ color: "#334155", marginBottom: 14 }}>
                  {alert.message}
                </div>

                {alert.is_resolved ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      Resolved: {formatDateTime(alert.resolved_at)}
                    </div>
                    <div style={{ color: "#166534" }}>
                      {alert.resolution_notes || "No notes provided."}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12 }}>
                    <input
                      value={notesById[alert.id] || ""}
                      onChange={(e) =>
                        setNotesById((current) => ({
                          ...current,
                          [alert.id]: e.target.value,
                        }))
                      }
                      placeholder="Resolution notes..."
                      style={inputStyle}
                    />

                    <button
                      onClick={() => resolveAlert(alert.id)}
                      disabled={resolvingId === alert.id}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        background: "#16a34a",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {resolvingId === alert.id ? "Resolving..." : "Resolve Alert"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}