"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IncidentCommandDashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadIncidents() {
    const response = await fetchWithAuth("/api/incidents/command", {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (response.ok) {
      setIncidents(result.incidents || []);

      if (!selectedIncidentId && result.incidents?.[0]?.id) {
        setSelectedIncidentId(result.incidents[0].id);
      }
    }
  }

  async function loadActions(incidentId: string) {
    if (!incidentId) return;

    const response = await fetchWithAuth(`/api/incidents/command?incidentId=${incidentId}`, {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (response.ok) {
      setActions(result.actions || []);
    }
  }

  async function startWorkflow() {
    if (!selectedIncidentId) return;

    const response = await fetchWithAuth("/api/incidents/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: selectedIncidentId }),
    });

    const result = await response.json();

    if (response.ok) {
      setMessage(result.created ? "Incident command workflow started." : result.message);
      await loadActions(selectedIncidentId);
    } else {
      setMessage(result.error || "Failed to start workflow.");
    }
  }

  async function updateAction(actionId: string, status: string) {
    const response = await fetchWithAuth("/api/incidents/command", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, status }),
    });

    const result = await response.json();

    if (response.ok) {
      setMessage("Command action updated.");
      await loadActions(selectedIncidentId);
    } else {
      setMessage(result.error || "Failed to update action.");
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
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      loadActions(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId);

  return (
    <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff", marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Incident Command Center</h2>
      <div style={{ color: "#64748b", marginBottom: 16 }}>
        Response checklist and command workflow for active incidents.
      </div>

      {loading ? (
        <div>Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <div style={{ color: "#64748b" }}>No active incidents requiring command workflow.</div>
      ) : (
        <>
          <select
            value={selectedIncidentId}
            onChange={(event) => setSelectedIncidentId(event.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #cbd5e1", marginBottom: 12 }}
          >
            {incidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.incident_code || incident.id} - {incident.severity} - {incident.status}
              </option>
            ))}
          </select>

          {selectedIncident ? (
            <div style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 12 }}>
              <strong>{selectedIncident.incident_code || "Incident"}</strong>
              <div>{selectedIncident.summary || "No incident summary."}</div>
            </div>
          ) : null}

          <button
            onClick={startWorkflow}
            style={{ padding: "10px 14px", borderRadius: 12, background: "#0f172a", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer", marginBottom: 14 }}
          >
            Start / Load Command Workflow
          </button>

          {message ? <div style={{ marginBottom: 12, color: "#2563eb" }}>{message}</div> : null}

          <div style={{ display: "grid", gap: 10 }}>
            {actions.length === 0 ? (
              <div style={{ color: "#64748b" }}>No workflow actions loaded yet.</div>
            ) : (
              actions.map((action) => (
                <div key={action.id} style={{ padding: 12, borderRadius: 14, border: "1px solid #e5e7eb", background: action.status === "completed" ? "#f0fdf4" : "#fff7ed" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{label(action.action_type)}</strong>
                    <span>{action.status}</span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => updateAction(action.id, "completed")} style={{ padding: "7px 10px", borderRadius: 10, background: "#16a34a", color: "#fff", border: "none", fontWeight: 800 }}>
                      Complete
                    </button>
                    <button onClick={() => updateAction(action.id, "pending")} style={{ padding: "7px 10px", borderRadius: 10, background: "#64748b", color: "#fff", border: "none", fontWeight: 800 }}>
                      Reopen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
