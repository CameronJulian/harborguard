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
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function IncidentDetailsPage() {
  const params = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [resolver, setResolver] = useState<Profile | null>(null);
  const [assignee, setAssignee] = useState<Profile | null>(null);

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
    }

    loadIncident();
  }, [params.id]);

  if (!incident) {
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
            fontWeight: 700,
          }}
        >
          Back to Incidents
        </Link>Loading incident...</div>
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
            fontWeight: 700,
          }}
        >
          Back to Incidents
        </Link>
        <h1 style={{ marginBottom: 24 }}>
          Incident {incident.incident_code}
        </h1>

        <div style={{ marginBottom: 24 }}>
          <h2>Incident Information</h2>

          <p><strong>Status:</strong> {incident.status}</p>
          <p><strong>Severity:</strong> {incident.severity}</p>
          <p><strong>Created:</strong> {incident.created_at}</p>
          <p><strong>Batch ID:</strong> {incident.batch_id || "N/A"}</p>
          <p><strong>Assigned To:</strong> {assignee?.full_name || assignee?.email || incident.assigned_to || "N/A"}</p>
          <p><strong>Organization:</strong> {incident.organization_id}</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h2>Summary</h2>
          <p>{incident.summary}</p>
        </div>

        <div>
          <h2>Resolution</h2>

          <p><strong>Resolved By:</strong> {resolver?.full_name || resolver?.email || incident.resolved_by || "N/A"}</p>
          <p><strong>Resolved At:</strong> {incident.resolved_at || "N/A"}</p>
          <p>
            <strong>Resolution Note:</strong>{" "}
            {incident.resolution_note || "No resolution note"}
          </p>
        </div>
      </div>
    </AppShell>
  );
}





