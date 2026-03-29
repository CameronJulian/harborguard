"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties } from "react";

type Props = {
  email?: string | null;
  onSignOut: () => void;
  isMobile?: boolean;
  onNavigate?: () => void;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

export default function Sidebar({ email, onSignOut, isMobile, onNavigate }: Props) {
  const pathname = usePathname();

  function navStyle(href: string): CSSProperties {
    const active = pathname === href;
    return {
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "14px 16px",
      borderRadius: 14,
      border: active ? "1px solid #bfdbfe" : "1px solid transparent",
      background: active ? "#dbeafe" : "transparent",
      color: active ? "#1d4ed8" : "#111827",
      fontWeight: active ? 800 : 600,
      textDecoration: "none",
      fontSize: 15,
    };
  }

  return (
    <aside
      style={{
        ...cardStyle,
        padding: 24,
        alignSelf: "start",
        position: isMobile ? "static" : "sticky",
        top: 20,
      }}
    >
      {!isMobile && (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 36, lineHeight: 1.05, margin: "0 0 8px 0" }}>
            HarborGuard
          </h1>
          <p style={{ ...mutedTextStyle, fontSize: 16 }}>
            Fish Supply Chain Monitoring System
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
        <Link href="/dashboard" style={navStyle("/dashboard")} onClick={onNavigate}>
          Dashboard
        </Link>

        <Link href="/analytics" style={navStyle("/analytics")} onClick={onNavigate}>
          Analytics
        </Link>

        <Link href="/batches" style={navStyle("/batches")} onClick={onNavigate}>
          Recent Batches
        </Link>

        <Link href="/incidents" style={navStyle("/incidents")} onClick={onNavigate}>
          Incident Management
        </Link>
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 18 }}>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
          Signed in as
        </div>
        <div style={{ fontWeight: 700, wordBreak: "break-word", marginBottom: 12 }}>
          {email || "Unknown"}
        </div>
        <button
          onClick={onSignOut}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#111827",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}