"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";

type DispatcherRecommendation = {
  alertId: string;
  vehicleName: string;
  alertType: string;
  severity: string;
  message: string;
  intelligenceScore: number | null;
  behavioralRisk: string | null;
  createdAt: string | null;
  recommendation: {
    priority: string;
    actions: string[];
    reasons: string[];
  };
};

function priorityColor(priority: string) {
  if (priority === "Critical") return "#dc2626";
  if (priority === "High") return "#d97706";
  return "#16a34a";
}

export default function DispatcherRecommendations() {
  const [items, setItems] = useState<DispatcherRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRecommendations() {
    try {
      const response = await fetchWithAuth("/api/dispatcher/recommendations", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setItems(result.recommendations || []);
      } else {
        console.error("Dispatcher recommendations failed:", result.error);
      }
    } catch (error) {
      console.error("Dispatcher recommendations load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecommendations();

    const channel = supabase
      .channel("dispatcher-recommendations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_alerts" },
        () => loadRecommendations()
      )
      .subscribe();

    const interval = setInterval(loadRecommendations, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        padding: 22,
        marginBottom: 24,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 6px 0", fontSize: 24 }}>
          Dispatcher Recommendations
        </h2>
        <div style={{ color: "#64748b" }}>
          Suggested operational actions based on active vehicle alerts.
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading recommendations...</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#64748b" }}>
          No active dispatcher recommendations.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.slice(0, 5).map((item) => (
            <div
              key={item.alertId}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 14,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong>{item.vehicleName}</strong>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {item.alertType?.replace(/_/g, " ")} • {item.severity}
                  </div>
                </div>

                <div
                  style={{
                    color: priorityColor(item.recommendation.priority),
                    fontWeight: 900,
                  }}
                >
                  {item.recommendation.priority}
                </div>
              </div>

              <div style={{ color: "#334155", marginBottom: 10 }}>
                {item.message}
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {item.recommendation.actions.slice(0, 4).map((action) => (
                  <div key={action} style={{ fontSize: 14 }}>
                    ✓ {action}
                  </div>
                ))}
              </div>

              {item.recommendation.reasons.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Reason: {item.recommendation.reasons[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
