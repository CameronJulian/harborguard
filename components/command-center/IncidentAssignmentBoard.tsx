"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Incident = {
  id: string;
  incident_code: string | null;
  severity: string | null;
  status: string | null;
  summary: string | null;
  created_at: string | null;
  assigned_to: string | null;
  assigned_name?: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
};

function severityColor(severity?: string | null) {
  const value = String(severity || "").toLowerCase();

  if (value === "critical") return "#dc2626";
  if (value === "high") return "#ea580c";
  if (value === "medium") return "#d97706";

  return "#2563eb";
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown time";
  return new Date(value).toLocaleString();
}

export default function IncidentAssignmentBoard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadBoard() {
    try {
      setMessage("");

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setMessage("Sign in to view incident assignments.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setMessage("No organization profile found.");
        setLoading(false);
        return;
      }

      const [incidentsResult, profilesResult] = await Promise.all([
        supabase
          .from("incidents")
          .select("id, incident_code, severity, status, summary, created_at, assigned_to")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
          .limit(30),

        supabase
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("organization_id", profile.organization_id)
          .order("full_name", { ascending: true }),
      ]);

      if (incidentsResult.error) throw incidentsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const profileRows = (profilesResult.data || []) as Profile[];
      const profileMap = new Map(
        profileRows.map((item) => [
          item.id,
          item.full_name || item.email || item.id,
        ])
      );

      const enriched = ((incidentsResult.data || []) as Incident[]).map((incident) => ({
        ...incident,
        assigned_name: incident.assigned_to
          ? profileMap.get(incident.assigned_to) || incident.assigned_to
          : undefined,
      }));

      setProfiles(profileRows);
      setIncidents(enriched);
    } catch (error: any) {
      setMessage(error.message || "Failed to load incident assignment board.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();

    const channel = supabase
      .channel("incident-assignment-board-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => loadBoard()
      )
      .subscribe();

    const interval = setInterval(loadBoard, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const grouped = useMemo(() => {
    const unresolved = incidents.filter(
      (incident) => String(incident.status || "").toLowerCase() !== "resolved"
    );

    return {
      unassigned: unresolved.filter((incident) => !incident.assigned_to),
      assigned: unresolved.filter((incident) => incident.assigned_to),
      resolved: incidents.filter(
        (incident) => String(incident.status || "").toLowerCase() === "resolved"
      ),
    };
  }, [incidents]);

  const workload = useMemo(() => {
    return profiles
      .map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.email || profile.id,
        count: incidents.filter(
          (incident) =>
            incident.assigned_to === profile.id &&
            String(incident.status || "").toLowerCase() !== "resolved"
        ).length,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [profiles, incidents]);

  const stats = [
    ["Unassigned", grouped.unassigned.length, "#dc2626"],
    ["Assigned", grouped.assigned.length, "#2563eb"],
    ["Resolved", grouped.resolved.length, "#16a34a"],
    ["Dispatchers", workload.length, "#7c3aed"],
  ];

  return (
    <section
      style={{
        padding: 22,
        borderRadius: 22,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#be123c", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            INCIDENT ASSIGNMENT BOARD
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Dispatcher Ownership
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Tracks unassigned, assigned, and resolved incidents using the existing assignment workflow.
          </div>
        </div>

        <Link
          href="/incidents"
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            background: "#be123c",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 900,
          }}
        >
          Open Incident Console →
        </Link>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading incident assignments...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {stats.map(([label, value, color]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4, color: String(color) }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <AssignmentColumn title="Unassigned" incidents={grouped.unassigned} />
            <AssignmentColumn title="Assigned" incidents={grouped.assigned} />
            <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 12px 0" }}>Dispatcher Workload</h3>

              {workload.length === 0 ? (
                <div style={{ color: "#64748b" }}>No active assigned workload.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {workload.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>{item.name}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function AssignmentColumn({
  title,
  incidents,
}: {
  title: string;
  incidents: Incident[];
}) {
  return (
    <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <h3 style={{ margin: "0 0 12px 0" }}>{title}</h3>

      {incidents.length === 0 ? (
        <div style={{ color: "#64748b" }}>No incidents in this lane.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, maxHeight: 360, overflowY: "auto" }}>
          {incidents.slice(0, 8).map((incident) => (
            <div key={incident.id} style={{ padding: 12, borderRadius: 14, background: "#ffffff", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <strong>{incident.incident_code || "Incident"}</strong>
                <span style={{ color: severityColor(incident.severity), fontWeight: 900 }}>
                  {incident.severity || "Unknown"}
                </span>
              </div>

              <div style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>
                {incident.summary || "No summary available."}
              </div>

              <div style={{ color: "#475569", marginTop: 8, fontSize: 12 }}>
                Status: {incident.status || "Open"}
              </div>

              <div style={{ color: "#475569", marginTop: 4, fontSize: 12 }}>
                Owner: {incident.assigned_name || "Unassigned"}
              </div>

              <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 12 }}>
                {formatDate(incident.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
