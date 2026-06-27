"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function severityColor(value?: string | null) {
  const severity = String(value || "").toLowerCase();
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#d97706";
  return "#16a34a";
}

export default function IncidentInvestigationTimeline() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [investigation, setInvestigation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadIncidents() {
    const response = await fetchWithAuth("/api/incidents/investigation", {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (response.ok) {
      setIncidents(result.incidents || []);

      if (!selectedIncidentId && result.incidents?.[0]?.id) {
        setSelectedIncidentId(result.incidents[0].id);
      }
    } else {
      setMessage(result.error || "Failed to load incidents.");
    }
  }

  async function loadInvestigation(incidentId: string) {
    if (!incidentId) return;

    const response = await fetchWithAuth(
      `/api/incidents/investigation?incidentId=${incidentId}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (response.ok) {
      setInvestigation(result.investigation || null);
    } else {
      setMessage(result.error || "Failed to load investigation timeline.");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        await loadIncidents();
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      loadInvestigation(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const timeline = investigation?.timeline || [];

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        background: "#fff",
        marginBottom: 18,
      }}
    >
      <h2 style={{ margin: "0 0 8px 0" }}>AI Incident Investigation Timeline</h2>

      <div style={{ color: "#64748b", marginBottom: 16 }}>
        Forensic timeline combining incidents, telemetry, alerts, command actions,
        notifications, route assignments, and emergency response events.
      </div>

      {loading ? (
        <div>Loading investigation data...</div>
      ) : incidents.length === 0 ? (
        <div style={{ color: "#64748b" }}>No incidents available for investigation.</div>
      ) : (
        <>
          <select
            value={selectedIncidentId}
            onChange={(event) => setSelectedIncidentId(event.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              marginBottom: 12,
            }}
          >
            {incidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.incident_code || incident.id} - {incident.severity} - {incident.status}
              </option>
            ))}
          </select>

          {message ? (
            <div style={{ marginBottom: 12, color: "#dc2626" }}>{message}</div>
          ) : null}

          {investigation ? (
            <>
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  marginBottom: 12,
                }}
              >
                <strong>Investigation Summary</strong>
                <div style={{ marginTop: 6 }}>{investigation.summary}</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {[
                  ["Total Events", investigation.eventCount],
                  ["High-Risk Events", investigation.criticalEventCount],
                  ["Vehicle", investigation.vehicleId || "-"],
                  ["Window Start", formatDateTime(investigation.window?.start)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
                    <div style={{ fontWeight: 900 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 10, maxHeight: 420, overflowY: "auto" }}>
                {timeline.length === 0 ? (
                  <div style={{ color: "#64748b" }}>
                    No investigation events found for this incident window.
                  </div>
                ) : (
                  timeline.map((event: any) => (
                    <div
                      key={event.id}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        background: "#ffffff",
                        borderLeft: `6px solid ${severityColor(event.severity)}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 6,
                        }}
                      >
                        <strong>{event.title}</strong>
                        <span style={{ color: "#64748b", fontSize: 13 }}>
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>

                      <div style={{ color: "#334155", marginBottom: 4 }}>
                        {event.detail}
                      </div>

                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        {event.category} · {event.severity}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{ color: "#64748b" }}>Select an incident to load investigation timeline.</div>
          )}
        </>
      )}
    </div>
  );
}
