"use client";

import { CSSProperties, useEffect, useState } from "react";
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

export default function AdminPage() {
  const [organizationCount, setOrganizationCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [professionalCount, setProfessionalCount] = useState(0);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    const { count: orgs } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true });

    const { count: vehicles } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true });

    const { count: incidents } = await supabase
      .from("incidents")
      .select("*", { count: "exact", head: true });

    const { count: professional } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("subscription_plan", "professional");

    setOrganizationCount(orgs || 0);
    setVehicleCount(vehicles || 0);
    setIncidentCount(incidents || 0);
    setProfessionalCount(professional || 0);
  }

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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 20,
          }}
        >
          {[
            { title: "Organizations", value: organizationCount },
            { title: "Active Vehicles", value: vehicleCount },
            { title: "AI Incidents", value: incidentCount },
            { title: "Professional Accounts", value: professionalCount },
          ].map((item) => (
            <div key={item.title} style={cardStyle}>
              <div style={{ color: "#64748b", fontWeight: 700 }}>
                {item.title}
              </div>

              <div style={metricStyle}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 34 }}>
                Organization Management
              </h2>

              <p style={{ color: "#64748b" }}>
                Subscription and tenant oversight.
              </p>
            </div>

            <button style={buttonStyle}>
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
              {[
                {
                  org: "Atlantic Fisheries",
                  plan: "Professional",
                  status: "Active",
                  vehicles: 42,
                  seats: 12,
                  trial: "—",
                },
                {
                  org: "BlueWave Logistics",
                  plan: "Starter",
                  status: "Trialing",
                  vehicles: 8,
                  seats: 4,
                  trial: "14 Days",
                },
                {
                  org: "Oceanic Supply Co",
                  plan: "Enterprise",
                  status: "Active",
                  vehicles: 91,
                  seats: 28,
                  trial: "—",
                },
              ].map((row) => (
                <tr key={row.org}>
                  <td style={tableCellStyle}>{row.org}</td>
                  <td style={tableCellStyle}>{row.plan}</td>
                  <td
                    style={{
                      ...tableCellStyle,
                      color: row.status === "Active" ? "#16a34a" : "#d97706",
                      fontWeight: 700,
                    }}
                  >
                    {row.status}
                  </td>
                  <td style={tableCellStyle}>{row.vehicles}</td>
                  <td style={tableCellStyle}>{row.seats}</td>
                  <td style={tableCellStyle}>{row.trial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 20,
          }}
        >
          {[
            { title: "Webhook Status", status: "Operational" },
            { title: "AI Processing", status: "Stable" },
            { title: "Notification Queue", status: "Healthy" },
            { title: "Supabase", status: "Connected" },
          ].map((item) => (
            <div key={item.title} style={cardStyle}>
              <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 12 }}>
                {item.title}
              </div>

              <div style={{ fontSize: 32, fontWeight: 900, color: "#16a34a" }}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}