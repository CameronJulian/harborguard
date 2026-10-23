"use client";

import { CSSProperties, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
  border: "1px solid #e5e7eb",
};

const metricStyle: CSSProperties = {
  fontSize: 48,
  fontWeight: 900,
  margin: "12px 0 0 0",
  color: "#0f172a",
};

const tableHeaderStyle: CSSProperties = {
  textAlign: "left",
  paddingBottom: 14,
  color: "#64748b",
  fontWeight: 700,
  fontSize: 14,
};

const tableCellStyle: CSSProperties = {
  padding: "18px 0",
  borderTop: "1px solid #e5e7eb",
  fontSize: 15,
};

const buttonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

type AdminOrganization = {
  id: string;
  name: string;
  plan: string | null;
  subscription_status: string | null;
  fleet_size: number | null;
  seats: number | null;
  trial_ends_at: string | null;
};
export default function AdminPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [organizationCount, setOrganizationCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [professionalCount, setProfessionalCount] = useState(0);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError || !session?.access_token) {
          router.replace("/");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (cancelled) return;

        if (
          profileError ||
          !profile ||
          !["platform_admin", "super_admin"].includes(profile.role)
        ) {
          router.replace("/dashboard");
          return;
        }

        const headers = {
          Authorization: `Bearer ${session.access_token}`,
        };

        const [metricsResponse, organizationsResponse] =
          await Promise.all([
            fetch("/api/admin/metrics", {
              headers,
              cache: "no-store",
            }),
            fetch("/api/admin/organizations", {
              headers,
              cache: "no-store",
            }),
          ]);

        if (cancelled) return;

        if (!metricsResponse.ok || !organizationsResponse.ok) {
          throw new Error("Protected admin API request failed");
        }

        const metricsPayload: unknown = await metricsResponse.json();
        const organizationsPayload: unknown =
          await organizationsResponse.json();

        if (cancelled) return;

        if (
          !metricsPayload ||
          typeof metricsPayload !== "object" ||
          !("success" in metricsPayload) ||
          metricsPayload.success !== true ||
          !("metrics" in metricsPayload) ||
          !metricsPayload.metrics ||
          typeof metricsPayload.metrics !== "object"
        ) {
          throw new Error("Invalid metrics response");
        }

        const metrics = metricsPayload.metrics as Record<string, unknown>;

        const counts = [
          metrics.organization_count,
          metrics.vehicle_count,
          metrics.incident_count,
          metrics.professional_count,
        ];

        if (
          counts.some(
            (count) =>
              typeof count !== "number" ||
              !Number.isSafeInteger(count) ||
              count < 0
          )
        ) {
          throw new Error("Invalid metric counts");
        }

        if (
          !organizationsPayload ||
          typeof organizationsPayload !== "object" ||
          !("success" in organizationsPayload) ||
          organizationsPayload.success !== true ||
          !("organizations" in organizationsPayload) ||
          !Array.isArray(organizationsPayload.organizations)
        ) {
          throw new Error("Invalid organizations response");
        }

        const rows: unknown[] = organizationsPayload.organizations;

        if (
          rows.some(
            (row) =>
              !row ||
              typeof row !== "object" ||
              !("id" in row) ||
              typeof row.id !== "string" ||
              !("name" in row) ||
              typeof row.name !== "string" ||
              !("plan" in row) ||
              (row.plan !== null && typeof row.plan !== "string") ||
              !("subscription_status" in row) ||
              (row.subscription_status !== null &&
                typeof row.subscription_status !== "string") ||
              !("fleet_size" in row) ||
              (row.fleet_size !== null &&
                typeof row.fleet_size !== "number") ||
              !("seats" in row) ||
              (row.seats !== null && typeof row.seats !== "number") ||
              !("trial_ends_at" in row) ||
              (row.trial_ends_at !== null &&
                typeof row.trial_ends_at !== "string")
          )
        ) {
          throw new Error("Invalid organization rows");
        }

        if (cancelled) return;

        setOrganizationCount(metrics.organization_count as number);
        setVehicleCount(metrics.vehicle_count as number);
        setIncidentCount(metrics.incident_count as number);
        setProfessionalCount(metrics.professional_count as number);
        setOrganizations(rows as AdminOrganization[]);
        setAuthorized(true);
      } catch {
        if (!cancelled) {
          setDashboardError("Unable to load protected platform dashboard.");
        }
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);
  if (checkingAccess) {
    return (
      <AppShell>
        <div style={cardStyle}>Checking admin access...</div>
      </AppShell>
    );
  }

  if (dashboardError) {
    return (
      <AppShell>
        <div style={cardStyle} role="alert">
          {dashboardError}
        </div>
      </AppShell>
    );
  }
  if (!authorized) return null;

  return (
    <AppShell>
      <div style={{ display: "grid", gap: 24 }}>
        <div
          style={{
            borderRadius: 30,
            padding: 36,
            background: "linear-gradient(135deg,#020617,#0f172a,#1e293b)",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.7, marginBottom: 14 }}>
            HARBORGUARD PLATFORM ADMIN
          </div>

          <h1 style={{ fontSize: 58, margin: 0, fontWeight: 900 }}>
            Enterprise Operations Console
          </h1>

          <p style={{ fontSize: 20, maxWidth: 900, lineHeight: 1.6, color: "#cbd5e1", marginTop: 20 }}>
            Centralized administration for organizations, subscriptions, fleet intelligence,
            AI incident monitoring, and operational platform oversight.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
          {[
            { title: "Organizations", value: organizationCount },
            { title: "Active Vehicles", value: vehicleCount },
            { title: "AI Incidents", value: incidentCount },
            { title: "Professional Accounts", value: professionalCount },
          ].map((item) => (
            <div key={item.title} style={cardStyle}>
              <div style={{ color: "#64748b", fontWeight: 700 }}>{item.title}</div>
              <div style={metricStyle}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 34 }}>Organization Management</h2>
              <p style={{ color: "#64748b" }}>Subscription and tenant oversight.</p>
            </div>

            <button
              style={buttonStyle}
              onClick={() => router.push("/admin/create-organization")}
            >
              Add Organization
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Organization</th>
                <th style={tableHeaderStyle}>Plan</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Vehicles</th>
                <th style={tableHeaderStyle}>Seats</th>
                <th style={tableHeaderStyle}>Trial Ends</th>
              </tr>
            </thead>

            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td style={tableCellStyle}>{organization.name}</td>
                  <td style={tableCellStyle}>{organization.plan}</td>
                  <td
                    style={{
                      ...tableCellStyle,
                      color:
                        organization.subscription_status === "active"
                          ? "#16a34a"
                          : "#d97706",
                      fontWeight: 700,
                    }}
                  >
                    {organization.subscription_status}
                  </td>
                  <td style={tableCellStyle}>{organization.fleet_size}</td>
                  <td style={tableCellStyle}>{organization.seats}</td>
                  <td style={tableCellStyle}>
                    {organization.trial_ends_at
                      ? new Date(organization.trial_ends_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
          {[
            { title: "Webhook Status", status: "Not verified" },
            { title: "AI Processing", status: "Not verified" },
            { title: "Notification Queue", status: "Not verified" },
            { title: "Supabase", status: "Not verified" },
          ].map((item) => (
            <div key={item.title} style={cardStyle}>
              <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 12 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#64748b" }}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
