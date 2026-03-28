"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type BatchRow = {
  id: string;
  batch_code: string | null;
  vessel: string | null;
  species: string | null;
  catch_kg: number | null;
  dock_kg: number | null;
  storage_kg: number | null;
  status: string | null;
  created_at: string | null;
};

type IncidentRow = {
  id: string;
  incident_code: string | null;
  severity: string | null;
  status: string | null;
  summary: string | null;
  created_at: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 15,
  background: "#fff",
  boxSizing: "border-box",
};

const primaryButtonStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: "0 0 8px 0",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  marginBottom: 6,
  display: "block",
  fontWeight: 600,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Math.round(value));
}

function formatOneDecimal(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export default function DashboardPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [vessel, setVessel] = useState("");
  const [species, setSpecies] = useState("");
  const [catchKg, setCatchKg] = useState("");
  const [dockKg, setDockKg] = useState("");
  const [storageKg, setStorageKg] = useState("");

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 980);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    loadAll();

    const batchChannel = supabase
      .channel("batches-realtime-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "batches" },
        () => {
          loadAll();
        }
      )
      .subscribe();

    const incidentChannel = supabase
      .channel("incidents-realtime-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => {
          loadAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(batchChannel);
      supabase.removeChannel(incidentChannel);
    };
  }, []);

  async function loadAll() {
    const { data: batchData } = await supabase
      .from("batches")
      .select("id, batch_code, vessel, species, catch_kg, dock_kg, storage_kg, status, created_at")
      .order("created_at", { ascending: false });

    const { data: incidentData } = await supabase
      .from("incidents")
      .select("id, incident_code, severity, status, summary, created_at")
      .order("created_at", { ascending: false });

    setBatches((batchData as BatchRow[]) || []);
    setIncidents((incidentData as IncidentRow[]) || []);
  }

  const totalCatch = useMemo(
    () => batches.reduce((sum, b) => sum + Number(b.catch_kg || 0), 0),
    [batches]
  );

  const totalStored = useMemo(
    () => batches.reduce((sum, b) => sum + Number(b.storage_kg || 0), 0),
    [batches]
  );

  const totalLoss = useMemo(
    () =>
      batches.reduce(
        (sum, b) => sum + (Number(b.catch_kg || 0) - Number(b.storage_kg || 0)),
        0
      ),
    [batches]
  );

  const averageLossPerBatch = useMemo(
    () => (batches.length ? totalLoss / batches.length : 0),
    [batches, totalLoss]
  );

  const averageLossPercent = useMemo(() => {
    if (!batches.length) return 0;
    const values = batches.map((b) => {
      const catchKgValue = Number(b.catch_kg || 0);
      const storageKgValue = Number(b.storage_kg || 0);
      if (catchKgValue <= 0) return 0;
      return ((catchKgValue - storageKgValue) / catchKgValue) * 100;
    });
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [batches]);

  const openIncidents = useMemo(
    () => incidents.filter((i) => i.status === "Open").length,
    [incidents]
  );

  const flaggedCount = useMemo(
    () => batches.filter((b) => b.status === "Flagged").length,
    [batches]
  );

  const highRiskBatches = useMemo(
    () => batches.filter((b) => b.status === "Flagged"),
    [batches]
  );

  const recentHighRisk = useMemo(
    () => highRiskBatches.slice(0, 3),
    [highRiskBatches]
  );

  const topRiskyVessel = useMemo(() => {
    const vesselMap: Record<string, number> = {};

    for (const batch of batches) {
      const vesselName = batch.vessel || "Unknown";
      if (batch.status === "Flagged") {
        vesselMap[vesselName] = (vesselMap[vesselName] || 0) + 1;
      }
    }

    const top = Object.entries(vesselMap).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]} (${top[1]})` : "No flagged vessels";
  }, [batches]);

  const trendData = useMemo(
    () =>
      [...batches]
        .reverse()
        .map((b) => {
          const catchValue = Number(b.catch_kg || 0);
          const storageValue = Number(b.storage_kg || 0);
          const loss = catchValue - storageValue;

          return {
            name: b.batch_code?.slice(-4) || "N/A",
            catch: catchValue,
            storage: storageValue,
            loss,
            anomaly: b.status === "Flagged" ? loss : 0,
          };
        }),
    [batches]
  );

  const statusData = [
    { name: "Normal", value: batches.filter((b) => b.status === "Normal").length },
    { name: "Flagged", value: batches.filter((b) => b.status === "Flagged").length },
    { name: "Review", value: batches.filter((b) => b.status === "Review").length },
  ];

  const vesselRiskData = useMemo(() => {
    const vesselMap: Record<
      string,
      { vessel: string; flagged: number; review: number; normal: number }
    > = {};

    for (const batch of batches) {
      const vesselName = batch.vessel || "Unknown";

      if (!vesselMap[vesselName]) {
        vesselMap[vesselName] = {
          vessel: vesselName,
          flagged: 0,
          review: 0,
          normal: 0,
        };
      }

      if (batch.status === "Flagged") vesselMap[vesselName].flagged += 1;
      else if (batch.status === "Review") vesselMap[vesselName].review += 1;
      else vesselMap[vesselName].normal += 1;
    }

    return Object.values(vesselMap)
      .sort((a, b) => b.flagged - a.flagged || b.review - a.review)
      .slice(0, 6);
  }, [batches]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!vessel || !species || !catchKg || !dockKg || !storageKg) {
      setMessage("Please fill in all fields.");
      return;
    }

    const catchValue = Number(catchKg);
    const dockValue = Number(dockKg);
    const storageValue = Number(storageKg);

    if (
      Number.isNaN(catchValue) ||
      Number.isNaN(dockValue) ||
      Number.isNaN(storageValue)
    ) {
      setMessage("Catch, Dock, and Storage must be numbers.");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/batches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        vessel,
        species,
        catchKg: catchValue,
        dockKg: dockValue,
        storageKg: storageValue,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setLoading(false);
      setMessage(result.error || "Failed to save batch.");
      return;
    }

    setVessel("");
    setSpecies("");
    setCatchKg("");
    setDockKg("");
    setStorageKg("");

    await loadAll();

    setMessage(
      `Batch saved successfully. AI Risk Score: ${result.riskScore} (${result.riskLevel})`
    );
    setLoading(false);
  }

  return (
    <AppShell>
      {message ? (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
          }}
        >
          {message}
        </div>
      ) : null}

      {recentHighRisk.length > 0 && (
        <div
          onClick={() => {
            window.location.href = "/incidents";
          }}
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 14,
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          🚨 {recentHighRisk.length} high-risk batch{recentHighRisk.length > 1 ? "es" : ""} detected
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500 }}>
            {recentHighRisk.map((b) => b.batch_code).join(", ")}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            Click to view incidents
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Catch", value: `${formatNumber(totalCatch)} kg` },
          { label: "Stored", value: `${formatNumber(totalStored)} kg` },
          { label: "Open Incidents", value: formatNumber(openIncidents) },
          { label: "Flagged Batches", value: formatNumber(flaggedCount) },
        ].map((item, index) => (
          <div key={index} style={{ ...cardStyle, padding: 26 }}>
            <div style={{ color: "#64748b", fontSize: 15, marginBottom: 12 }}>{item.label}</div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>Average Loss / Batch</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{formatOneDecimal(averageLossPerBatch)} kg</div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>Average Loss %</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{formatOneDecimal(averageLossPercent)}%</div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>Top Risky Vessel</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{topRiskyVessel}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.45fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Performance Trend</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Track catch, storage, and actual loss across recent batches.
          </p>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 18,
              height: 360,
              background: "#fff",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "anomaly") return [`${value} kg`, "Flagged Loss"];
                    if (name === "loss") return [`${value} kg`, "Loss"];
                    if (name === "catch") return [`${value} kg`, "Catch"];
                    if (name === "storage") return [`${value} kg`, "Storage"];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="catch" stroke="#2563eb" strokeWidth={3} />
                <Line type="monotone" dataKey="storage" stroke="#16a34a" strokeWidth={3} />
                <Line type="monotone" dataKey="loss" stroke="#f59e0b" strokeWidth={3} />
                <Line
                  type="monotone"
                  dataKey="anomaly"
                  stroke="#dc2626"
                  strokeWidth={4}
                  dot={{ r: 6, stroke: "#dc2626", strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Create Batch</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Capture a new fish supply batch for monitoring.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={labelStyle}>Vessel</label>
              <input
                style={inputStyle}
                placeholder="Vessel"
                value={vessel}
                onChange={(e) => setVessel(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Species</label>
              <input
                style={inputStyle}
                placeholder="Species"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Catch kg</label>
              <input
                style={inputStyle}
                placeholder="Catch kg"
                value={catchKg}
                onChange={(e) => setCatchKg(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Dock kg</label>
              <input
                style={inputStyle}
                placeholder="Dock kg"
                value={dockKg}
                onChange={(e) => setDockKg(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Storage kg</label>
              <input
                style={inputStyle}
                placeholder="Storage kg"
                value={storageKg}
                onChange={(e) => setStorageKg(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} style={primaryButtonStyle}>
              {loading ? "Saving..." : "Save Batch"}
            </button>
          </form>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Status Distribution</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Monitor the mix of normal, review, and flagged batches.
          </p>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 18,
              height: 340,
              background: "#fff",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Vessel Risk Profile</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Compare which vessels are producing the most risk events.
          </p>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 18,
              height: 340,
              background: "#fff",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vesselRiskData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="vessel" type="category" width={90} />
                <Tooltip />
                <Legend />
                <Bar dataKey="flagged" stackId="a" fill="#dc2626" />
                <Bar dataKey="review" stackId="a" fill="#f59e0b" />
                <Bar dataKey="normal" stackId="a" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}