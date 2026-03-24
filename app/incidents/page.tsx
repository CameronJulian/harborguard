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

function severityLabel(severity: string | null) {
  if (severity === "High") return "🔴 Critical";
  if (severity === "Medium") return "🟠 Elevated";
  if (severity === "Low") return "🟢 Controlled";
  return "⚪ Standard";
}

function statusLabel(status: string | null) {
  if (status === "Open") return "🚨 Needs Action";
  if (status === "Resolved") return "✅ Closed";
  if (status === "Review") return "🟠 Under Review";
  return "ℹ️ Logged";
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [message, setMessage] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function loadIncidents() {
    const { data } = await supabase
      .from("incidents")
      .select("id, incident_code, severity, status, summary, created_at")
      .order("created_at", { ascending: false });

    setIncidents((data as IncidentRow[]) || []);
  }

  useEffect(() => {
    loadIncidents();

    const channel = supabase
      .channel("incidents-live-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => loadIncidents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function resolveIncident(id: string) {
    setMessage("");
    setResolvingId(id);

    const { error } = await supabase
      .from("incidents")
      .update({ status: "Resolved" })
      .eq("id", id);

    if (error) {
      setResolvingId(null);
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

    await loadIncidents();
    setResolvingId(null);
    setMessage("✅ Incident resolved successfully.");
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
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

                    <td
                      style={{
                        padding: 14,
                        borderBottom: "1px solid #f1f5f9",
                        color: statusColor(incident.severity),
                        fontWeight: 800,
                      }}
                    >
                      <div>{incident.severity}</div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                        {severityLabel(incident.severity)}
                      </div>
                    </td>

                    <td
                      style={{
                        padding: 14,
                        borderBottom: "1px solid #f1f5f9",
                        color: statusColor(incident.status),
                        fontWeight: 800,
                      }}
                    >
                      <div>{incident.status}</div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                        {statusLabel(incident.status)}
                      </div>
                    </td>

                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {incident.summary}
                    </td>

                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {incident.status !== "Resolved" ? (
                        <button
                          onClick={() => resolveIncident(incident.id)}
                          disabled={resolvingId === incident.id}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "none",
                            background: "#0f172a",
                            color: "#fff",
                            cursor: resolvingId === incident.id ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            opacity: resolvingId === incident.id ? 0.7 : 1,
                          }}
                        >
                          {resolvingId === incident.id ? "Resolving..." : "Resolve"}
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