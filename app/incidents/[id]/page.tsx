"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

type Incident = {
  id: string;
  incident_code: string | null;
  batch_id: string | null;
  severity: string | null;
  assigned_to: string | null;
  status: string | null;
  summary: string | null;
  created_at: string | null;
  organization_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  vehicle_alert_id?: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type EmergencyEvent = {
  id?: string;
  vehicle_alert_id: string | null;
  event_type: string | null;
  note: string | null;
  created_at: string | null;
  created_by?: string | null;
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function statusColor(status?: string | null) {
  if ((status || "").toLowerCase() === "open") return "#dc2626";
  if ((status || "").toLowerCase() === "resolved") return "#16a34a";
  return "#64748b";
}

function severityColor(severity?: string | null) {
  if ((severity || "").toLowerCase() === "critical") return "#dc2626";
  if ((severity || "").toLowerCase() === "high") return "#ea580c";
  if ((severity || "").toLowerCase() === "medium") return "#d97706";
  return "#2563eb";
}

export default function IncidentDetailsPage() {
  const params = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [resolver, setResolver] = useState<Profile | null>(null);
  const [assignee, setAssignee] = useState<Profile | null>(null);
  const [timeline, setTimeline] = useState<EmergencyEvent[]>([]);
  const [operatorNote, setOperatorNote] = useState("");

  useEffect(() => {
    async function loadIncident() {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", params.id)
        .single();

      setIncident(data);

      if (data?.assigned_to) {
        const { data: assignedProfile } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", data.assigned_to)
          .maybeSingle();

        setAssignee(assignedProfile);
      }

      if (data?.resolved_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", data.resolved_by)
          .maybeSingle();

        setResolver(profile);
      }

      if (data?.vehicle_alert_id) {
        const { data: events } = await supabase
          .from("emergency_response_events")
          .select("*")
          .eq("vehicle_alert_id", data.vehicle_alert_id)
          .order("created_at", { ascending: false });

        setTimeline(events || []);
      }
    }

    loadIncident();
  }, [params.id]);

  if (!incident) {
    return (
      <AppShell>
        <div style={{ padding: 24 }}>
          <Link href="/incidents" style={{ color: "#2563eb", fontWeight: 800 }}>
            Back to Incidents
          </Link>
          <p>Loading incident war room...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ padding: 24 }}>
        <Link
          href="/incidents"
          style={{
            display: "inline-block",
            marginBottom: 20,
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          Back to Incidents
        </Link>

        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
            background: "#0f172a",
            color: "#ffffff",
          }}
        >
          <div style={{ color: "#93c5fd", fontWeight: 900, marginBottom: 8 }}>
            SOC INCIDENT WAR ROOM
          </div>

          <h1 style={{ margin: 0, fontSize: 38 }}>
            {incident.incident_code || "Incident"}
          </h1>

          <p style={{ color: "#cbd5e1", fontSize: 16 }}>
            Live operational workspace for active response coordination.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "#1e293b" }}>
              Status:{" "}
              <strong style={{ color: statusColor(incident.status) }}>
                {incident.status || "Unknown"}
              </strong>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 12, background: "#1e293b" }}>
              Severity:{" "}
              <strong style={{ color: severityColor(incident.severity) }}>
                {incident.severity || "Unknown"}
              </strong>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 12, background: "#1e293b" }}>
              Created: <strong>{formatDateTime(incident.created_at)}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
          <div style={{ display: "grid", gap: 24 }}>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Incident Briefing</h2>
              <p style={{ fontSize: 16, lineHeight: 1.7 }}>
                {incident.summary || "No summary provided."}
              </p>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Response Timeline</h2>

              {timeline.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {timeline.map((event, index) => (
                    <div
                      key={`${event.event_type}-${event.created_at}-${index}`}
                      style={{
                        borderLeft: "4px solid #2563eb",
                        paddingLeft: 14,
                        paddingBottom: 8,
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        {(event.event_type || "event").replace(/_/g, " ").toUpperCase()}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        {formatDateTime(event.created_at)}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {event.note || "No timeline note provided."}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>
                  No emergency response timeline events linked to this incident yet.
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Operator Notes</h2>
              <textarea
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                placeholder="Add live response notes here..."
                style={{
                  width: "100%",
                  minHeight: 120,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(operatorNote);
                }}
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Copy Notes
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Command Details</h2>
              <p><strong>Assigned To:</strong> {assignee?.full_name || assignee?.email || incident.assigned_to || "Unassigned"}</p>
              <p><strong>Organization:</strong> {incident.organization_id}</p>
              <p><strong>Batch ID:</strong> {incident.batch_id || "N/A"}</p>
              <p><strong>Vehicle Alert ID:</strong> {incident.vehicle_alert_id || "N/A"}</p>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Response Actions</h2>

              <div style={{ display: "grid", gap: 10 }}>
                <Link
                  href="/command-center"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#2563eb",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 900,
                    textAlign: "center",
                  }}
                >
                  Open Command Center
                </Link>

                <Link
                  href="/vehicle-alerts"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    textDecoration: "none",
                    fontWeight: 900,
                    textAlign: "center",
                  }}
                >
                  View Vehicle Alerts
                </Link>

                <Link
                  href="/incidents"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    textDecoration: "none",
                    fontWeight: 900,
                    textAlign: "center",
                  }}
                >
                  Back to Incident Queue
                </Link>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Resolution</h2>
              <p><strong>Resolved By:</strong> {resolver?.full_name || resolver?.email || incident.resolved_by || "N/A"}</p>
              <p><strong>Resolved At:</strong> {formatDateTime(incident.resolved_at)}</p>
              <p><strong>Resolution Note:</strong> {incident.resolution_note || "No resolution note"}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
