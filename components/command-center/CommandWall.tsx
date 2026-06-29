"use client";

import Link from "next/link";

const screens = [
  {
    title: "Fleet Map Wall",
    description: "Use the full Command Center map view for live vehicle tracking, route safety, and geofence monitoring.",
    href: "/command-center?wall=map",
    status: "Live",
  },
  {
    title: "Mission Control Wall",
    description: "Monitor mission queue, supervisor escalations, AI recommendations, and active incident workflows.",
    href: "/command-center?wall=missions",
    status: "Operational",
  },
  {
    title: "Timeline Wall",
    description: "Display operations timeline, incident investigation, route replay, and fleet activity history.",
    href: "/command-center?wall=timeline",
    status: "Realtime",
  },
  {
    title: "Executive KPI Wall",
    description: "Show fleet health, predictive incidents, prescriptive response plans, and shift summaries.",
    href: "/command-center?wall=kpis",
    status: "Dashboard",
  },
];

export default function CommandWall() {
  return (
    <section
      style={{
        padding: 22,
        borderRadius: 22,
        background: "#020617",
        color: "#ffffff",
        border: "1px solid #1e293b",
        marginBottom: 24,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#38bdf8", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
          MULTI-SCREEN COMMAND WALL
        </div>

        <h2 style={{ margin: 0, fontSize: 28 }}>Operations Wallboard Layout</h2>

        <div style={{ color: "#94a3b8", marginTop: 6 }}>
          Open HarborGuard on multiple monitors and assign each screen a dedicated command-center role.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {screens.map((screen, index) => (
          <Link
            key={screen.title}
            href={screen.href}
            target="_blank"
            style={{
              display: "block",
              textDecoration: "none",
              color: "#ffffff",
              padding: 18,
              borderRadius: 18,
              background: "#0f172a",
              border: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: "#1e293b",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  color: "#38bdf8",
                }}
              >
                {index + 1}
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#bae6fd",
                  background: "#082f49",
                  padding: "6px 9px",
                  borderRadius: 999,
                  height: "fit-content",
                }}
              >
                {screen.status}
              </span>
            </div>

            <h3 style={{ margin: "14px 0 8px 0", fontSize: 19 }}>
              {screen.title}
            </h3>

            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.5 }}>
              {screen.description}
            </p>

            <div style={{ marginTop: 14, color: "#38bdf8", fontWeight: 900 }}>
              Open screen →
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
