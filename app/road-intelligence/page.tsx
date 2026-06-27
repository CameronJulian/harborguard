"use client";

import AppShell from "@/components/AppShell";
import RoadIntelligenceDashboard from "@/components/road-intelligence/RoadIntelligenceDashboard";

export default function RoadIntelligencePage() {
  return (
    <AppShell>
      <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
        <RoadIntelligenceDashboard />
      </main>
    </AppShell>
  );
}
