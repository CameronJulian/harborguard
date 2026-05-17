"use client";

import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const pageStyle: CSSProperties = {
  fontFamily: "Inter, Arial, sans-serif",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
  minHeight: "100vh",
  color: "#0f172a",
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 15,
  background: "#fff",
  boxSizing: "border-box",
};

const primaryButtonStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

function saveSessionCookies(session: any) {
  if (!session?.access_token) return;

  document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;

  if (session.refresh_token) {
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
  }
}

function getRedirectPath() {
  if (typeof window === "undefined") return "/dashboard";

  const params = new URLSearchParams(window.location.search);
  return params.get("redirectedFrom") || "/dashboard";
}

export default function Home() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        saveSessionCookies(data.session);
        router.replace(getRedirectPath());
      }

      setAuthLoading(false);
    });
  }, [router]);

  async function handleSignUp(e: FormEvent) {
  e.preventDefault();

  setMessage("");

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
    });

  if (error) {
    setMessage(
      `Sign up failed: ${error.message}`
    );

    return;
  }

  const user = data.user;

  if (!user) {
    setMessage("User creation failed.");

    return;
  }

  const trialEndsAt = new Date(
    Date.now() +
      14 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: organization, error: orgError } =
    await supabase
      .from("organizations")
      .insert({
        name:
          email.split("@")[0] +
          "'s Organization",

        subscription_status:
          "trialing",

        subscription_plan:
          "starter",

        trial_ends_at:
          trialEndsAt,
      })
      .select()
      .single();

  if (orgError || !organization) {
    setMessage(
      `Organization creation failed: ${
        orgError?.message ||
        "Unknown error"
      }`
    );

    return;
  }

  const { error: profileError } =
    await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        role: "manager",
        organization_id:
          organization.id,
      });

  if (profileError) {
    setMessage(
      `Profile creation failed: ${profileError.message}`
    );

    return;
  }

  if (data.session) {
    saveSessionCookies(data.session);

    router.replace(
      getRedirectPath()
    );

    return;
  }

  setMessage(
    "Sign up successful. Check your email if confirmation is enabled."
  );
}

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Sign in failed: ${error.message}`);
      return;
    }

    saveSessionCookies(data.session);
    router.replace(getRedirectPath());
  }

  if (authLoading) {
    return (
      <main style={pageStyle}>
        <div style={{ paddingTop: 90, textAlign: "center" }}>
          <div style={{ ...cardStyle, padding: 36, maxWidth: 460, margin: "0 auto" }}>
            <h1 style={{ marginTop: 0, fontSize: 44 }}>HarborGuard</h1>
            <p style={mutedTextStyle}>Loading...</p>
          </div>
        </div>
      </main>
    );
  }
const isMobile =
  typeof window !== "undefined" &&
  window.innerWidth < 980;
  return (
    <main style={pageStyle}>
     <div
  style={{
    maxWidth: 1450,
    margin: "0 auto",
    padding: "70px 24px",
    display: "grid",
    gridTemplateColumns: isMobile
  ? "1fr"
  : "1.2fr 0.8fr",
    gap: 40,
    alignItems: "center",
    minHeight: "100vh",
  }}
>

<div>
  <div
    style={{
      display: "inline-flex",
      padding: "8px 14px",
      borderRadius: 999,
      background: "#dbeafe",
      color: "#1d4ed8",
      fontWeight: 700,
      marginBottom: 20,
    }}
  >
    AI Fleet Intelligence Platform
  </div>

  <h1
    style={{
      fontSize: 72,
      lineHeight: 1,
      margin: "0 0 24px 0",
      fontWeight: 900,
    }}
  >
    HarborGuard
  </h1>

  <p
    style={{
      fontSize: 24,
      color: "#475569",
      maxWidth: 720,
      lineHeight: 1.6,
      marginBottom: 32,
    }}
  >
    Enterprise-grade maritime fleet intelligence,
    predictive threat analytics, AI incident
    monitoring, route replay intelligence, and
    operational visibility for modern fish supply
    chain operations.
  </p>

  <div
    style={{
      display: "flex",
      gap: 16,
      marginBottom: 40,
    }}
  >
    <a
      href="/billing"
      style={{
        ...primaryButtonStyle,
        textDecoration: "none",
      }}
    >
      View Pricing
    </a>

    <a
      href="/dashboard"
      style={{
        ...secondaryButtonStyle,
        textDecoration: "none",
      }}
    >
      Live Demo
    </a>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 18,
      maxWidth: 800,
    }}
  >
    {[
      "AI Threat Detection",
      "Route Replay Intelligence",
      "Real-Time Fleet Monitoring",
      "Executive Reporting",
      "Mobile PWA Access",
      "Push Notifications",
    ].map((feature) => (
      <div
        key={feature}
        style={{
          ...cardStyle,
          padding: 20,
          fontWeight: 700,
        }}
      >
        ✓ {feature}
      </div>
    ))}
  </div>
</div>
        <div style={{ ...cardStyle, width: "100%", maxWidth: 500, padding: 36 }}>
          <div style={{ marginBottom: 28 }}>
            <h2
  style={{
    fontSize: 34,
    margin: "0 0 10px 0",
  }}
>
  Welcome Back
</h2>
            <p style={{ ...mutedTextStyle, fontSize: 20 }}>
              Access your HarborGuard command center.
            </p>
          </div>

          <form onSubmit={handleSignIn} style={{ display: "grid", gap: 14 }}>
            <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" style={primaryButtonStyle}>Sign In</button>
            <button type="button" onClick={handleSignUp} style={secondaryButtonStyle}>Sign Up</button>
          </form>

          {message ? (
            <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}>
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}