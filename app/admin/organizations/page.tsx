"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Organization = {
  id: string;
  name: string;
  plan?: string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  fleet_size?: number | null;
  created_at?: string | null;
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setOrganizations(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            Organizations
          </h1>

          <p
            style={{
              color: "#64748b",
            }}
          >
            Manage SaaS tenants, plans, billing, and onboarding.
          </p>
        </div>

        <Link
          href="/admin/create-organization"
          style={{
            padding: "14px 22px",
            borderRadius: 12,
            background: "#2563eb",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Create Organization
        </Link>
      </div>

      {loading ? (
        <div>Loading organizations...</div>
      ) : error ? (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 16,
            borderRadius: 12,
          }}
        >
          {error}
        </div>
      ) : organizations.length === 0 ? (
        <div>No organizations found.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          {organizations.map((org) => (
            <div
              key={org.id}
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 24,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                    }}
                  >
                    {org.name}
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    Organization ID: {org.id}
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {org.plan || org.subscription_plan || "starter"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    Subscription Status
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      textTransform: "capitalize",
                    }}
                  >
                    {org.subscription_status || "inactive"}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    Fleet Size
                  </div>

                  <div style={{ fontWeight: 700 }}>
                    {org.fleet_size || 0}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    Created
                  </div>

                  <div style={{ fontWeight: 700 }}>
                    {org.created_at
                      ? new Date(org.created_at).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
              </div>

              <Link
                href={`/admin/organizations/${org.id}`}
                style={{
                  display: "inline-block",
                  padding: "12px 18px",
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Open Organization
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}