"use client";

import { CSSProperties, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type IncidentRow = {
  id: string;
  incident_code: string | null;
  severity: string | null;
  status: string | null;
  summary: string | null;
  created_at: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: "0 0 8px 0",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

function statusColor(status: string | null) {
  if (status === "Flagged" || status === "Open") return "#dc2626";
  if (status === "Review") return "#d97706";
  if (status === "Normal" || status === "Resolved") return "#16a34a";
  return "#111827";
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadIncidents();
  }, []);

  async function loadIncidents() {
    const { data } = await supabase
      .from("incidents")
      .select("id, incident_code, severity, status, summary, created_at")
      .order("created_at", { ascending: false });

    setIncidents((data as IncidentRow[]) || []);
  }

  async function resolveIncident(id: string) {
    const { error } = await supabase
      .from("incidents")
      .update({ status: "Resolved" })
      .eq("id", id);

    if (error) {
      setMessage(`Resolve failed: ${error.message}`);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await supabase.from("audit_logs").insert({
      actor_name: session?.user.email || "Unknown",
      action: "Resolved incident",
      batch_code: null,
      risk: "Low",
    });

    setMessage("Incident resolved.");
    await loadIncidents();
  }

  return (
    <AppShell>
      {message ? (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ ...cardStyle, padding: 26 }}>
        <h2 style={sectionTitleStyle}>Incident Management</h2>
        <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
          Review flagged incidents and resolve them when handled.
        </p>

        {incidents.length === 0 ? (
          <p style={mutedTextStyle}>No incidents yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  {["Incident", "Severity", "Status", "Summary", "Action"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        borderBottom: "1px solid #e5e7eb",
                        color: "#64748b",
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                      {incident.incident_code}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>{incident.severity}</td>
                    <td
                      style={{
                        padding: 14,
                        borderBottom: "1px solid #f1f5f9",
                        color: statusColor(incident.status),
                        fontWeight: 800,
                      }}
                    >
                      {incident.status}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>{incident.summary}</td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {incident.status !== "Resolved" ? (
                        <button
                          onClick={() => resolveIncident(incident.id)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "none",
                            background: "#0f172a",
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Resolve
                        </button>
                      ) : (
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}