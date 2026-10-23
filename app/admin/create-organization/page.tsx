"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export default function CreateOrganizationPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [plan, setPlan] = useState("starter");
  const [seats, setSeats] = useState("1");
  const [trialDays, setTrialDays] = useState("14");

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminAccess() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError || !session?.user) {
          router.replace("/");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (cancelled) return;

        if (error || !profile?.role) {
          router.replace("/dashboard");
          return;
        }

        const allowedRoles = ["platform_admin", "super_admin"];

        if (!allowedRoles.includes(profile.role)) {
          router.replace("/dashboard");
          return;
        }

        setAuthorized(true);
        setCheckingAccess(false);
      } catch {
        if (!cancelled) {
          router.replace("/dashboard");
        }
      }
    }

    void checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createOrganization() {
    if (loading || !authorized) return;

    const organizationName = name.trim();
    const fleet = Number(fleetSize || "0");
    const seatCount = Number(seats);
    const trialDuration = Number(trialDays);

    if (organizationName.length < 2 || organizationName.length > 150) {
      alert("Organization name must contain 2 to 150 characters.");
      return;
    }

    if (
      !Number.isInteger(fleet) ||
      fleet < 0 ||
      fleet > 100000 ||
      !Number.isInteger(seatCount) ||
      seatCount < 1 ||
      seatCount > 100000 ||
      !Number.isInteger(trialDuration) ||
      trialDuration < 1 ||
      trialDuration > 90
    ) {
      alert("Please enter valid fleet, seat and trial values.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        alert("Your session has expired. Please sign in again.");
        return;
      }

      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: organizationName,
          plan,
          fleet_size: fleet,
          seats: seatCount,
          trial_days: trialDuration,
        }),
        cache: "no-store",
      });

      const result: unknown = await response.json();

      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("success" in result) ||
        result.success !== true
      ) {
        if (response.status === 401) {
          alert("Your session has expired. Please sign in again.");
        } else if (response.status === 403) {
          alert("Platform administrator permission is required.");
        } else if (response.status === 400) {
          alert("Invalid organization details.");
        } else {
          alert("Failed to create organization.");
        }
        return;
      }

      alert("Organization created successfully.");
      router.push("/admin");
    } catch {
      alert("Failed to create organization.");
    } finally {
      setLoading(false);
    }
  }
  if (checkingAccess) {
    return (
      <AppShell>
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          Checking admin access...
        </div>
      </AppShell>
    );
  }

  if (!authorized) return null;

  return (
    <AppShell>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <div
          style={{
            borderRadius: 28,
            padding: 36,
            background:
              "linear-gradient(135deg,#020617,#0f172a,#1e293b)",
            color: "#fff",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              opacity: loading ? 0.7 : 1,
              marginBottom: 16,
            }}
          >
            ENTERPRISE TENANT PROVISIONING
          </div>

          <h1
            style={{
              fontSize: 52,
              margin: 0,
              fontWeight: 900,
            }}
          >
            Create Organization
          </h1>

          <p
            style={{
              color: "#cbd5e1",
              marginTop: 18,
              fontSize: 18,
              lineHeight: 1.6,
            }}
          >
            Provision a new HarborGuard organization,
            assign subscription plans, configure seats,
            and initialize onboarding.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            border: "1px solid #e5e7eb",
            display: "grid",
            gap: 24,
          }}
        >
          <div>
            <label style={labelStyle}>
              Organization Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Atlantic Fisheries"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Fleet Size
            </label>

            <input
              value={fleetSize}
              onChange={(e) => setFleetSize(e.target.value)}
              placeholder="25"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Subscription Plan
            </label>

            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              style={inputStyle}
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Seat Count
            </label>

            <input
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder="10"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Trial Duration (Days)
            </label>

            <input
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              placeholder="14"
              style={inputStyle}
            />
          </div>

          <button
            onClick={createOrganization}
            disabled={loading}
            style={{
              border: "none",
              borderRadius: 14,
              padding: "18px 24px",
              background:
                "linear-gradient(135deg,#2563eb,#06b6d4)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating Organization..." : "Create Organization"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
};
