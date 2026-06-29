"use client";

import Link from "next/link";

function isoOffset(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

const windows = [
  {
    label: "Replay Last 30 Minutes",
    description: "Quick review of recent alerts, movement, route actions, and notifications.",
    href: `/fleet-time-machine?start=${encodeURIComponent(isoOffset(30))}`,
  },
  {
    label: "Replay Last Hour",
    description: "Best for incident review, escalation checks, and dispatcher handovers.",
    href: `/fleet-time-machine?start=${encodeURIComponent(isoOffset(60))}`,
  },
  {
    label: "Replay Last Shift",
    description: "Review the last 8 hours of fleet activity and command-center events.",
    href: `/fleet-time-machine?start=${encodeURIComponent(isoOffset(480))}`,
  },
];

export default function AuditPlayback() {
  return (
    <section
      style={{
        padding: 22,
        borderRadius: 22,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#7c3aed", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            AUDIT PLAYBACK
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Operations Replay Center
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Launch historical playback using the existing Fleet Time Machine engine.
          </div>
        </div>

        <Link
          href="/fleet-time-machine"
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            background: "#7c3aed",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 900,
          }}
        >
          Open Fleet Time Machine →
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {windows.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "block",
              padding: 16,
              borderRadius: 16,
              border: "1px solid #ddd6fe",
              background: "#faf5ff",
              textDecoration: "none",
              color: "#1f2937",
            }}
          >
            <strong style={{ color: "#6d28d9" }}>{item.label}</strong>
            <p style={{ margin: "8px 0 0 0", color: "#64748b", lineHeight: 1.5 }}>
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
