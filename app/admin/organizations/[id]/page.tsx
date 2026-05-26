"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Organization = {
  id: string;
  name: string;
  plan?: string | null;
  subscription_status?: string | null;
  fleet_size?: number | null;
  created_at?: string | null;
  payfast_subscription_id?: string | null;
  next_billing_date?: string | null;
};

export default function OrganizationDetailPage() {
  const params = useParams();
  const organizationId = params?.id as string;

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [vehicleCount, setVehicleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (organizationId) {
      loadOrganization();
    }
  }, [organizationId]);

  async function loadOrganization() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (error) {
        throw error;
      }

      setOrganization(data);

      const { count } = await supabase
        .from("vehicles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("organization_id", organizationId);

      setVehicleCount(count || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load organization.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePlan(plan: string) {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          plan,
        })
        .eq("id", organizationId);

      if (error) {
        throw error;
      }

      await loadOrganization();

      alert("Organization updated.");
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function suspendOrganization() {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          subscription_status: "suspended",
        })
        .eq("id", organizationId);

      if (error) {
        throw error;
      }

      await loadOrganization();

      alert("Organization suspended.");
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div>Loading organization...</div>
      </AppShell>
    );
  }

  if (error || !organization) {
    return (
      <AppShell>
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 16,
            borderRadius: 12,
          }}
        >
          {error || "Organization not found."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        style={{
          display: "grid",
          gap: 24,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 32,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 24,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                {organization.name}
              </h1>

              <div
                style={{
                  color: "#64748b",
                }}
              >
                Organization ID: {organization.id}
              </div>
            </div>

            <div
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                background:
                  organization.subscription_status === "active"
                    ? "#dcfce7"
                    : "#fee2e2",
                color:
                  organization.subscription_status === "active"
                    ? "#166534"
                    : "#991b1b",
                fontWeight: 800,
                textTransform: "capitalize",
              }}
            >
              {organization.subscription_status || "inactive"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 20,
              marginBottom: 30,
            }}
          >
            <div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Current Plan
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  textTransform: "capitalize",
                }}
              >
                {organization.plan || "starter"}
              </div>
            </div>

            <div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Fleet Vehicles
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                }}
              >
                {vehicleCount}
              </div>
            </div>

            <div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Next Billing Date
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {organization.next_billing_date
                  ? new Date(
                      organization.next_billing_date
                    ).toLocaleDateString()
                  : "-"}
              </div>
            </div>

            <div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Created
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {organization.created_at
                  ? new Date(
                      organization.created_at
                    ).toLocaleDateString()
                  : "-"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => updatePlan("starter")}
              style={buttonStyle}
            >
              Set Starter
            </button>

            <button
              onClick={() => updatePlan("professional")}
              style={buttonStyle}
            >
              Set Professional
            </button>

            <button
              onClick={() => updatePlan("enterprise")}
              style={buttonStyle}
            >
              Set Enterprise
            </button>

            <button
              onClick={suspendOrganization}
              style={{
                ...buttonStyle,
                background: "#991b1b",
              }}
            >
              Suspend Organization
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const buttonStyle = {
  padding: "14px 20px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
} as const;