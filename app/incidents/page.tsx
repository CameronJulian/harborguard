"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
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

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  boxSizing: "border-box",
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
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

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

  const filteredIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSearch =
        !term ||
        (incident.incident_code || "").toLowerCase().includes(term) ||
        (incident.summary || "").toLowerCase().includes(term);

      const matchesSeverity =
        severityFilter === "All" || incident.severity === severityFilter;

      const matchesStatus =
        statusFilter === "All" || incident.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, search, severityFilter, statusFilter]);

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={sectionTitleStyle}>Incident Management</h2>
            <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
              Review flagged incidents and resolve them when handled.
            </p>
          </div>

          <div style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>
            Showing {filteredIncidents.length} of {incidents.length} incidents
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) 180px 180px",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <input
            style={inputStyle}
            placeholder="Search by incident code or summary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={inputStyle}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="All">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            style={inputStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
            <option value="Review">Review</option>
          </select>
        </div>

        {filteredIncidents.length === 0 ? (
          <p style={mutedTextStyle}>
            {incidents.length === 0
              ? "No incidents yet."
              : "No incidents match your current search or filters."}
          </p>
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
                {filteredIncidents.map((incident) => (
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