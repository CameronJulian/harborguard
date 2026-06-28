"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

import NotificationCenter from "@/components/command-center/NotificationCenter";
import FleetMissionQueue from "@/components/command-center/FleetMissionQueue";
import DispatcherRecommendations from "@/components/command-center/DispatcherRecommendations";
import SupervisorEscalationCenter from "@/components/command-center/SupervisorEscalationCenter";
import FleetHealthDashboard from "@/components/command-center/FleetHealthDashboard";

export default function MobileDispatcherPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setAuthorized(Boolean(session?.access_token));
      setSessionReady(true);
    }

    checkSession();
  }, []);

  if (!sessionReady) {
    return (
      <AppShell>
        <main style={{ padding: 24 }}>Loading mobile dispatcher...</main>
      </AppShell>
    );
  }

  if (!authorized) {
    return (
      <AppShell>
        <main style={{ padding: 24 }}>
          <h1>Mobile Dispatcher</h1>
          <p>Please sign in before opening the mobile dispatcher console.</p>
          <Link href="/">Go to login</Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main
        style={{
          background: "#0f172a",
          minHeight: "100vh",
          color: "white",
          padding: 16,
          display: "grid",
          gap: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
            Mobile Dispatcher
          </h1>

          <div style={{ color: "#94a3b8", marginTop: 6 }}>
            HarborGuard Mobile Operations Console
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/command-center" style={{ color: "#93c5fd" }}>
            Full Command Center
          </Link>

          <Link href="/fleet" style={{ color: "#93c5fd" }}>
            Fleet
          </Link>

          <Link href="/incidents" style={{ color: "#93c5fd" }}>
            Incidents
          </Link>
        </div>

        <FleetHealthDashboard />

        <FleetMissionQueue />

        <DispatcherRecommendations />

        <NotificationCenter />

        <SupervisorEscalationCenter />
      </main>
    </AppShell>
  );
}
