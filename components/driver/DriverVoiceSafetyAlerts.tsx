"use client";

import { useEffect, useRef, useState } from "react";

type DriverVoiceSafetyAlertsProps = {
  alerts: any[];
  selectedRoute?: any | null;
};

function buildAlertMessage(alert: any) {
  const distance = alert.distance_meters
    ? `${Math.round(Number(alert.distance_meters))} meters away`
    : "nearby";

  const type = String(alert.type || "route safety alert").replace(/_/g, " ");

  return `Warning. ${alert.title || type}. ${distance}. ${type}. Stay alert and follow dispatcher instructions.`;
}

export default function DriverVoiceSafetyAlerts({
  alerts,
  selectedRoute,
}: DriverVoiceSafetyAlertsProps) {
  const [enabled, setEnabled] = useState(true);
  const [supported, setSupported] = useState(false);
  const lastSpokenAlertId = useRef<string | null>(null);
  const lastRouteId = useRef<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (!enabled || !supported || alerts.length === 0) return;

    const closest = alerts[0];
    if (!closest?.id || closest.id === lastSpokenAlertId.current) return;

    lastSpokenAlertId.current = closest.id;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(buildAlertMessage(closest))
    );
  }, [alerts, enabled, supported]);

  useEffect(() => {
    if (!enabled || !supported || !selectedRoute) return;

    const routeId =
      selectedRoute.id ||
      selectedRoute.label ||
      selectedRoute.description ||
      JSON.stringify(selectedRoute).slice(0, 40);

    if (routeId === lastRouteId.current) return;

    lastRouteId.current = routeId;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(
        `Safer route selected. Follow ${selectedRoute.description || selectedRoute.label || "the recommended route"}.`
      )
    );
  }, [selectedRoute, enabled, supported]);

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: enabled ? "#ecfdf5" : "#f8fafc",
        border: enabled ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>
            Voice Safety Alerts
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {supported
              ? enabled
                ? "Enabled. Route safety warnings will be spoken aloud."
                : "Muted. Visual warnings will still appear."
              : "Not supported in this browser."}
          </div>
        </div>

        <button
          type="button"
          disabled={!supported}
          onClick={() => {
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
            setEnabled((current) => !current);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            background: enabled ? "#16a34a" : "#ffffff",
            color: enabled ? "#ffffff" : "#334155",
            fontWeight: 900,
            cursor: supported ? "pointer" : "not-allowed",
          }}
        >
          {enabled ? "Voice On" : "Voice Off"}
        </button>
      </div>
    </div>
  );
}
