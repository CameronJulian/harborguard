"use client";

import { CSSProperties } from "react";
import AppShell from "@/components/AppShell";

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function TripsPage() {
  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Trips</h1>
        <p style={{ color: "#64748b" }}>
          Trip management page coming soon.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 24 }}>
        No trips dashboard has been configured yet.
      </div>
    </AppShell>
  );
}