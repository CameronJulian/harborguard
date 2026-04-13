"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  children: ReactNode;
  allowedRoles: Array<"admin" | "manager" | "viewer">;
};

type ProfileRow = {
  id: string;
  role: "admin" | "manager" | "viewer";
  full_name: string | null;
  email?: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
  maxWidth: 560,
  margin: "60px auto",
  padding: 28,
};

export default function RoleGuard({ children, allowedRoles }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setMessage("Unable to load your access profile.");
        setAllowed(false);
        setChecking(false);
        return;
      }

      const profile = data as ProfileRow;

      if (!allowedRoles.includes(profile.role)) {
        setMessage("You do not have permission to view this page.");
        setAllowed(false);
        setChecking(false);
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkAccess();
  }, [allowedRoles, router]);

  if (checking) {
    return (
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Checking access...</h2>
        <p style={{ color: "#64748b", marginBottom: 0 }}>
          Please wait while HarborGuard verifies your permissions.
        </p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: "#b91c1c" }}>Access Restricted</h2>
        <p style={{ color: "#64748b" }}>
          {message || "You do not have permission to access this page."}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}