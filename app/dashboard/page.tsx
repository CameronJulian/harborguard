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

  const openIncidents = useMemo(
    () => incidents.filter((i) => i.status === "Open").length,
    [incidents]
  );

  const chartData = [...batches]
    .reverse()
    .map((b) => ({
      name: b.batch_code?.slice(-4) || "N/A",
      catch: b.catch_kg || 0,
      storage: b.storage_kg || 0,
    }));

  const statusData = [
    { name: "Normal", value: batches.filter((b) => b.status === "Normal").length },
    { name: "Flagged", value: batches.filter((b) => b.status === "Flagged").length },
    { name: "Review", value: batches.filter((b) => b.status === "Review").length },
  ];

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

    const loss = catchValue - storageValue;
    const lossPercent = catchValue > 0 ? (loss / catchValue) * 100 : 0;

    let riskScore = 0;

    if (lossPercent > 20) riskScore += 50;
    else if (lossPercent > 10) riskScore += 25;
    else if (lossPercent > 5) riskScore += 10;

    if (catchValue > 1000) riskScore += 10;
    if (storageValue < dockValue) riskScore += 10;

    const historicalLosses = batches.map(
      (b) => Number(b.catch_kg || 0) - Number(b.storage_kg || 0)
    );
    const avgLoss =
      historicalLosses.length > 0
        ? historicalLosses.reduce((sum, v) => sum + v, 0) / historicalLosses.length
        : 0;

    if (avgLoss > 0 && loss > avgLoss * 2) {
      riskScore += 30;
    }

    const status =
      riskScore > 70 ? "Flagged" :
      riskScore > 30 ? "Review" :
      "Normal";

    const riskLevel =
      riskScore > 70 ? "High" :
      riskScore > 30 ? "Medium" :
      "Low";

    const batchCode = `BAT-${Date.now()}`;
    const qrCode = `HG-${batchCode}`;

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase.from("batches").insert({
      batch_code: batchCode,
      vessel,
      species,
      catch_kg: catchValue,
      dock_kg: dockValue,
      storage_kg: storageValue,
      handler_name: "Cameron Hendrick",
      handler_role: "manager",
      location: "Main Warehouse",
      notes: `AI risk score: ${riskScore}`,
      qr_code: qrCode,
      status,
      created_by: null,
    });

    if (error) {
      setLoading(false);
      setMessage(`Save failed: ${error.message}`);
      return;
    }

    if (status === "Flagged") {
      await supabase.from("incidents").insert({
        incident_code: `INC-${Date.now()}`,
        severity: "High",
        status: "Open",
        summary: `${loss}kg discrepancy detected for ${vessel} / ${species} (Risk Score: ${riskScore})`,
      });
    }

    await supabase.from("audit_logs").insert({
      actor_name: session?.user.email || "Unknown",
      action: "Created batch",
      batch_code: batchCode,
      risk: riskLevel,
    });

    setVessel("");
    setSpecies("");
    setCatchKg("");
    setDockKg("");
    setStorageKg("");
    setMessage(`Batch saved successfully. AI Risk Score: ${riskScore} (${riskLevel})`);
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Catch", value: `${totalCatch} kg` },
          { label: "Stored", value: `${totalStored} kg` },
          { label: "Open Incidents", value: openIncidents },
        ].map((item, index) => (
          <div key={index} style={{ ...cardStyle, padding: 26 }}>
            <div style={{ color: "#64748b", fontSize: 15, marginBottom: 12 }}>{item.label}</div>
            <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.45fr 1fr",
          gap: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Analytics</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Catch volume and storage behaviour across recent batches.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 20,
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 18,
                height: 340,
                background: "#fff",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20 }}>Catch vs Storage</h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="catch" stroke="#2563eb" strokeWidth={3} />
                  <Line type="monotone" dataKey="storage" stroke="#16a34a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 18,
                height: 340,
                background: "#fff",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20 }}>Status Distribution</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart
                  data={statusData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  barCategoryGap="25%"
                >
                  <XAxis dataKey="name" interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
    </AppShell>
  );
}