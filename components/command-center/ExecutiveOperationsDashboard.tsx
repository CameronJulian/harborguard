"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";

type ExecutiveHealth = {
  healthScore: number;
  healthLevel: string;
  totalVehicles: number;
  online: number;
  offline: number;
  moving: number;
  stopped: number;
  busy: number;
  available: number;
  sos: number;
  activeTrips: number;
  openAlerts: number;
  criticalAlerts: number;
  openIncidents: number;
};

type DispatcherResponse = {
  count: number;
};

type NotificationResponse = {
  unreadCount?: number;
  criticalCount?: number;
};

function healthColor(level: string) {
  if (level === "Critical") return "#dc2626";
  if (level === "Warning") return "#d97706";
  return "#16a34a";
}

export default function ExecutiveOperationsDashboard() {
  const [health, setHealth] = useState<ExecutiveHealth | null>(null);
  const [recommendationCount, setRecommendationCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [criticalNotifications, setCriticalNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadExecutiveDashboard() {
    try {
      const [healthResponse, recommendationsResponse, notificationsResponse] =
        await Promise.all([
          fetchWithAuth("/api/fleet/health", { method: "GET", cache: "no-store" }),
          fetchWithAuth("/api/dispatcher/recommendations", { method: "GET", cache: "no-store" }),
          fetchWithAuth("/api/command-center/notifications", { method: "GET", cache: "no-store" }),
        ]);

      const healthResult = await healthResponse.json();
      const recommendationsResult: DispatcherResponse = await recommendationsResponse.json();
      const notificationsResult: NotificationResponse = await notificationsResponse.json();

      if (healthResponse.ok) {
        setHealth(healthResult.health || null);
      }

      if (recommendationsResponse.ok) {
        setRecommendationCount(recommendationsResult.count || 0);
      }

      if (notificationsResponse.ok) {
        setUnreadNotifications(notificationsResult.unreadCount || 0);
        setCriticalNotifications(notificationsResult.criticalCount || 0);
      }
    } catch (error) {
      console.error("Executive dashboard load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExecutiveDashboard();

    const channel = supabase
      .channel("executive-operations-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_alerts" },
        () => loadExecutiveDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_locations" },
        () => loadExecutiveDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => loadExecutiveDashboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "command_center_notifications" },
        () => loadExecutiveDashboard()
      )
      .subscribe();

    const interval = setInterval(loadExecutiveDashboard, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ background: "#ffffff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 22, marginBottom: 24 }}>
        Loading executive operations dashboard...
      </div>
    );
  }

  if (!health) {
    return (
      <div style={{ background: "#ffffff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 22, marginBottom: 24 }}>
        Executive operations dashboard unavailable.
      </div>
    );
  }

  const metrics = [
    ["Fleet Health", `${health.healthScore}/100`],
    ["Online", health.online],
    ["Offline", health.offline],
    ["Active Trips", health.activeTrips],
    ["SOS", health.sos],
    ["Critical Alerts", health.criticalAlerts],
    ["Open Incidents", health.openIncidents],
    ["Recommendations", recommendationCount],
    ["Unread Notifications", unreadNotifications],
    ["Critical Notifications", criticalNotifications],
  ];

  return (
    <div
      style={{
        background: "#0f172a",
        color: "#ffffff",
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.20)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ color: "#93c5fd", fontWeight: 900, marginBottom: 6 }}>
            EXECUTIVE OPERATIONS DASHBOARD
          </div>
          <h1 style={{ margin: 0, fontSize: 34 }}>
            Command Center Overview
          </h1>
          <div style={{ color: "#cbd5e1", marginTop: 8 }}>
            Live fleet health, incidents, alerts, notifications, and dispatcher workload.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: healthColor(health.healthLevel), lineHeight: 1 }}>
            {health.healthScore}
          </div>
          <div style={{ color: "#cbd5e1", fontWeight: 800 }}>
            /100 {health.healthLevel}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 12,
        }}
      >
        {metrics.map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 900 }}>
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
