"use client";

import Link from "next/link";
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
  assigned_to: string | null;
  assigned_name?: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
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
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [message, setMessage] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  async function loadIncidents() {
   const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.user) return;

const { data: profile } = await supabase
  .from("profiles")
  .select("organization_id")
  .eq("id", session.user.id)
  .single();

if (!profile?.organization_id) return;

const { data } = await supabase
  .from("incidents")
  .select("id, incident_code, severity, status, summary, created_at, assigned_to, resolved_by, resolved_at, resolution_note")
  .eq("organization_id", profile.organization_id)
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

  async function assignIncident(id: string) {
    setMessage("");

    if (profiles.length === 0) {
      setMessage("No users available to assign.");
      return;
    }

    const options = profiles
      .map((person, index) => `${index + 1}. ${person.full_name || person.email || person.id}`)
      .join("\n");

    const choice = window.prompt(`Assign incident to:\n\n${options}\n\nEnter number:`);

    if (choice === null) return;

    const selectedIndex = Number(choice) - 1;
    const selectedProfile = profiles[selectedIndex];

    if (!selectedProfile) {
      setMessage("Invalid user selection.");
      return;
    }

    setAssigningId(id);

    const { error } = await supabase
      .from("incidents")
      .update({ assigned_to: selectedProfile.id })
      .eq("id", id);

    if (error) {
      setAssigningId(null);
      setMessage(error.message || "Failed to assign incident.");
      return;
    }

    await loadIncidents();
    setAssigningId(null);
    setMessage(`Incident assigned to ${selectedProfile.full_name || selectedProfile.email || selectedProfile.id}.`);
  }

  async function resolveIncident(id: string) {
    setMessage("");

    const resolutionNote = window.prompt(
      "Enter a resolution note for this incident:"
    );

    if (resolutionNote === null) return;

    if (!resolutionNote.trim()) {
      window.alert("Resolution note is required.");
      return;
    }

    if (!resolutionNote.trim()) {
      window.alert("Resolution note is required.");
      return;
    }

    setResolvingId(id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/incidents/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ id, resolutionNote }),
    });

    const result = await response.json();

    if (!response.ok) {
      setResolvingId(null);
      setMessage(result.error || "Failed to resolve incident.");
      return;
    }

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
                        <div>{incident.summary}</div>

                        {incident.status === "Resolved" && incident.resolution_note ? (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 10,
                              borderRadius: 10,
                              background: "#f0fdf4",
                              color: "#166534",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            Resolution note: {incident.resolution_note}
                          </div>
                        ) : null}
                      </td>

                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <Link
                            href={`/incidents/${incident.id}`}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 10,
                              border: "1px solid #cbd5e1",
                              color: "#0f172a",
                              textDecoration: "none",
                              fontWeight: 700,
                            }}
                          >
                            View
                          </Link>

                            {incident.status !== "Resolved" ? (
                              <button
                                onClick={() => assignIncident(incident.id)}
                                disabled={assigningId === incident.id}
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: 10,
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  color: "#0f172a",
                                  cursor: assigningId === incident.id ? "not-allowed" : "pointer",
                                  fontWeight: 700,
                                  opacity: assigningId === incident.id ? 0.7 : 1,
                                }}
                              >
                                {assigningId === incident.id ? "Assigning..." : "Assign"}
                              </button>
                            ) : null}

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
                        </div>
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

























