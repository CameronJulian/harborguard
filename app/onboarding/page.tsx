"use client";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  const [organizationName, setOrganizationName] =
    useState("");

  const [fleetSize, setFleetSize] =
    useState("");

  const [vehicleName, setVehicleName] =
    useState("");

 async function completeSetup() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      alert("You are not logged in. Please sign in first.");
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", session.user.id)
        .single();

    if (profileError || !profile?.organization_id) {
      alert("Could not find your organization.");
      return;
    }

    const { error: orgError } = await supabase
      .from("organizations")
      .update({
        name: organizationName,
      })
      .eq("id", profile.organization_id);

    if (orgError) {
      alert(`Organization update failed: ${orgError.message}`);
      return;
    }

    router.push("/dashboard");
  } catch (err: any) {
    alert(err.message || "Setup failed.");
  }
}

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        padding: 40,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "#fff",
          padding: 40,
          borderRadius: 24,
          boxShadow:
            "0 20px 40px rgba(15,23,42,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: 42,
            marginBottom: 10,
            color: "#0f172a",
          }}
        >
          Welcome to HarborGuard
        </h1>

        <p
          style={{
            color: "#64748b",
            marginBottom: 40,
          }}
        >
          Configure your fleet intelligence
          workspace.
        </p>

        <div style={{ marginBottom: 24 }}>
          <label>Organization Name</label>

          <input
            value={organizationName}
            onChange={(e) =>
              setOrganizationName(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: 14,
              marginTop: 8,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label>Fleet Size</label>

          <input
            value={fleetSize}
            onChange={(e) =>
              setFleetSize(e.target.value)
            }
            placeholder="Example: 25 vehicles"
            style={{
              width: "100%",
              padding: 14,
              marginTop: 8,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div style={{ marginBottom: 32 }}>
          <label>First Vehicle Name</label>

          <input
            value={vehicleName}
            onChange={(e) =>
              setVehicleName(
                e.target.value
              )
            }
            placeholder="HG Vessel 01"
            style={{
              width: "100%",
              padding: 14,
              marginTop: 8,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <button
          onClick={completeSetup}
          style={{
            background:
              "linear-gradient(135deg,#2563eb,#06b6d4)",
            color: "#fff",
            border: "none",
            padding: "16px 28px",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
}