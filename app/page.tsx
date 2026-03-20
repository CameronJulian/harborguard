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

export default function Home() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
      setAuthLoading(false);
    });
  }, [router]);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(`Sign up failed: ${error.message}`);
      return;
    }

    setMessage("Sign up successful. You can now sign in if email confirmation is off.");
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(`Sign in failed: ${error.message}`);
      return;
    }

    router.replace("/dashboard");
  }

  if (authLoading) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 1450,
            margin: "0 auto",
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 90,
            textAlign: "center",
          }}
        >
          <div style={{ ...cardStyle, padding: 36, maxWidth: 460, margin: "0 auto" }}>
            <h1 style={{ marginTop: 0, fontSize: 44 }}>HarborGuard</h1>
            <p style={mutedTextStyle}>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 1450,
          margin: "0 auto",
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 70,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ ...cardStyle, width: "100%", maxWidth: 500, padding: 36 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 52, margin: "0 0 10px 0", lineHeight: 1.02 }}>
              HarborGuard
            </h1>
            <p style={{ ...mutedTextStyle, fontSize: 20 }}>
              Sign in to access the Fish Supply Chain Monitoring System.
            </p>
          </div>

          <form onSubmit={handleSignIn} style={{ display: "grid", gap: 14 }}>
            <input
              style={inputStyle}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" style={primaryButtonStyle}>
              Sign In
            </button>
            <button type="button" onClick={handleSignUp} style={secondaryButtonStyle}>
              Sign Up
            </button>
          </form>

          {message ? (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 12,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
              }}
            >
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}