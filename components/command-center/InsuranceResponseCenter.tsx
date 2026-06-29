"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type InsurancePackage = {
  id: string;
  incidentCode: string;
  severity: string;
  status: string;
  summary: string;
  score: number;
  readinessLevel: string;
  evidence: Record<string, boolean>;
  evidenceCount: number;
  missingEvidence: string[];
  relatedAlertType: string | null;
  vehicleId: string | null;
  recommendedAction: string;
  createdAt: string | null;
};

function readinessColor(level: string) {
  if (level === "claim_ready") return "#16a34a";
  if (level === "evidence_review") return "#d97706";
  return "#2563eb";
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function InsuranceResponseCenter() {
  const [packages, setPackages] = useState<InsurancePackage[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadInsurance() {
    try {
      setMessage("");

      const response = await fetchWithAuth("/api/command-center/insurance", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load Insurance Response Center.");
        return;
      }

      setSummary(result.summary);
      setPackages(result.packages || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load Insurance Response Center.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInsurance();
    const interval = setInterval(loadInsurance, 30000);
    return () => clearInterval(interval);
  }, []);

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
          <div style={{ color: "#0f766e", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            INSURANCE RESPONSE CENTER
          </div>

          <h2 style={{ margin: 0, fontSize: 28 }}>
            Claim Readiness & Evidence Packages
          </h2>

          <div style={{ color: "#64748b", marginTop: 6 }}>
            Combines incidents, telemetry, dashcam, CCTV, ANPR, and alerts into claim-ready evidence packages.
          </div>
        </div>

        <button
          type="button"
          onClick={loadInsurance}
          style={{
            height: "fit-content",
            padding: "10px 14px",
            borderRadius: 12,
            border: "0",
            background: "#0f766e",
            color: "#ffffff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh Insurance
        </button>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading insurance response center...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              ["Open Packages", summary?.openPackages || 0],
              ["Claim Ready", summary?.claimReady || 0],
              ["Evidence Review", summary?.evidenceReview || 0],
              ["Monitoring", summary?.monitoring || 0],
              ["Avg Readiness", `${summary?.averageReadiness || 0}%`],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {packages.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              No insurance response packages are required right now.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {packages.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>{item.incidentCode}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {item.summary}
                      </div>
                    </div>

                    <div style={{ color: readinessColor(item.readinessLevel), fontWeight: 900 }}>
                      {formatLabel(item.readinessLevel).toUpperCase()} · {item.score}%
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {Object.entries(item.evidence).map(([key, value]) => (
                      <span
                        key={key}
                        style={{
                          padding: "6px 9px",
                          borderRadius: 999,
                          background: value ? "#dcfce7" : "#fee2e2",
                          color: value ? "#166534" : "#991b1b",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {value ? "✓" : "×"} {formatLabel(key)}
                      </span>
                    ))}
                  </div>

                  {item.missingEvidence.length > 0 && (
                    <div style={{ color: "#d97706", marginTop: 10 }}>
                      Missing evidence: {item.missingEvidence.map(formatLabel).join(", ")}
                    </div>
                  )}

                  <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 800 }}>
                    Recommended action: {item.recommendedAction}
                  </div>

                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                    Severity: {item.severity} · Status: {item.status} · Related alert: {item.relatedAlertType || "none"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
