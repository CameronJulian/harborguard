"use client";

import { useState } from "react";
import { useRealtimeRefresh } from "@/lib/realtime/useRealtimeRefresh";
import { fetchWithAuth } from "@/lib/auth-fetch";

export default function FleetDigitalTwinDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadDigitalTwin() {
    try {
      const response = await fetchWithAuth("/api/fleet/digital-twin", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setData(result.digitalTwin);
      }
    } catch (error) {
      console.error("Failed to load Fleet Digital Twin:", error);
    } finally {
      setLoading(false);
    }
  }

  useRealtimeRefresh({
    tables: ["vehicle_locations", "vehicles", "vehicle_trips", "vehicle_alerts"],
    refresh: loadDigitalTwin,
    pollingMs: 30000,
  });

  if (loading) {
    return (
      <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff" }}>
        Loading Fleet Digital Twin...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff" }}>
        Fleet Digital Twin unavailable.
      </div>
    );
  }

  return (
    <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff", marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Fleet Digital Twin</h2>
      <div style={{ color: "#64748b", marginBottom: 16 }}>
        Live fleet-level intelligence, clustering, coverage, and threat exposure.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        {[
          ["Status", data.operationalStatus],
          ["Health Score", `${data.fleetHealthScore}/100`],
          ["Mapped Vehicles", data.mappedVehicles],
          ["Fleet Clusters", data.clusters?.length || 0],
          ["Lone Vehicles", data.loneVehicles?.length || 0],
          ["Threat Zones", data.risk?.activeThreatZones || 0],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <strong>AI Fleet Recommendations</strong>
        {(data.recommendations || []).map((item: string, index: number) => (
          <div key={index} style={{ padding: 10, borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a" }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

