"use client";

import { fetchWithAuth } from "@/lib/auth-fetch";
import {
  loadDashboardFleet,
  readDashboardWithDeadline,
  type DashboardFleetVehicle,
  type DashboardFleetTrip,
  type DashboardFleetAlert,
} from "@/lib/dashboard/loadDashboardData";

import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import TrialBanner from "@/components/billing/TrialBanner";

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

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function DashboardPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [batchDataStatus, setBatchDataStatus] = useState<"loading" | "available" | "empty" | "unavailable">("loading");
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<DashboardFleetVehicle[]>([]);
  const [fleetTrips, setFleetTrips] = useState<DashboardFleetTrip[]>([]);
  const [fleetAlerts, setFleetAlerts] = useState<DashboardFleetAlert[]>([]);
  const [fleetDataStatus, setFleetDataStatus] = useState<"loading" | "available" | "empty" | "unavailable">("loading");
  const fleetRequestId = useRef(0);
  const dashboardReadController = useRef<AbortController | null>(null);
  const [routeSafetyAlerts, setRouteSafetyAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
const [trialEndsAt, setTrialEndsAt] =
  useState<string | null>(null);
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
    void loadAll();

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
      fleetRequestId.current += 1;
      dashboardReadController.current?.abort();
      supabase.removeChannel(batchChannel);
      supabase.removeChannel(incidentChannel);
    };
  }, []);


const trialDaysRemaining = trialEndsAt
  ? Math.max(
      0,
      Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    )
  : null;
  async function loadAll() {
    const requestId = ++fleetRequestId.current;
    dashboardReadController.current?.abort();
    const controller = new AbortController();
    dashboardReadController.current = controller;
    const options = { signal: controller.signal };
    const isCurrent = () =>
      requestId === fleetRequestId.current && !controller.signal.aborted;

    setFleetDataStatus("loading");
    setBatchDataStatus("loading");

    // Fleet requests do not depend on the supply-chain or profile reads.
    const fleetLoad = loadDashboardFleet(fetchWithAuth, options)
      .then(snapshot => {
        if (!isCurrent()) return;
        setFleetVehicles(snapshot.vehicles);
        setFleetTrips(snapshot.trips);
        setFleetAlerts(snapshot.alerts);
        setFleetDataStatus(snapshot.vehicles.length ? "available" : "empty");
        if (snapshot.trialEndsAt) setTrialEndsAt(snapshot.trialEndsAt);
      })
      .catch(() => {
        if (!isCurrent()) return;
        setFleetVehicles([]);
        setFleetTrips([]);
        setFleetAlerts([]);
        setFleetDataStatus("unavailable");
      });

    async function loadOrganizationData() {
      try {
        const { authenticated, profile } = await readDashboardWithDeadline(
          async signal => {
            const { data: { session } } = await supabase.auth.getSession();
            signal.throwIfAborted();
            if (!session?.user) return { authenticated: false, profile: null };

            const { data, error } = await supabase
              .from("profiles")
              .select("organization_id")
              .eq("id", session.user.id)
              .abortSignal(signal)
              .single();
            if (error) throw error;
            return { authenticated: true, profile: data };
          },
          options
        );
        if (!isCurrent()) return;
        if (!authenticated) throw new Error("Unauthorized");

        if (!profile?.organization_id) {
          setBatches([]);
          setBatchDataStatus("unavailable");
          window.location.replace("/onboarding");
          return;
        }

        // Each panel publishes its result as soon as its own read completes.
        const batchLoad = readDashboardWithDeadline(signal => supabase
          .from("batches")
          .select("id, batch_code, vessel, species, catch_kg, dock_kg, storage_kg, status, created_at")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
          .abortSignal(signal), options)
          .then(({ data, error }) => {
            if (!isCurrent()) return;
            if (error || !Array.isArray(data)) throw new Error("Batch data unavailable");
            setBatches(data as BatchRow[]);
            setBatchDataStatus(data.length ? "available" : "empty");
          })
          .catch(() => {
            if (!isCurrent()) return;
            setBatches([]);
            setBatchDataStatus("unavailable");
          });

        const incidentLoad = readDashboardWithDeadline(signal => supabase
          .from("incidents")
          .select("id, incident_code, severity, status, summary, created_at")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
          .abortSignal(signal), options)
          .then(({ data, error }) => {
            if (isCurrent()) setIncidents(!error && Array.isArray(data) ? data as IncidentRow[] : []);
          })
          .catch(() => { if (isCurrent()) setIncidents([]); });

        const routeLoad = readDashboardWithDeadline(signal => supabase
          .from("route_safety_alerts")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .abortSignal(signal), options)
          .then(({ data, error }) => {
            if (isCurrent()) setRouteSafetyAlerts(!error && Array.isArray(data) ? data : []);
          })
          .catch(() => { if (isCurrent()) setRouteSafetyAlerts([]); });

        await Promise.all([batchLoad, incidentLoad, routeLoad]);
      } catch {
        if (!isCurrent()) return;
        setBatches([]);
        setBatchDataStatus("unavailable");
        setIncidents([]);
        setRouteSafetyAlerts([]);
      }
    }

    await Promise.all([fleetLoad, loadOrganizationData()]);
    if (dashboardReadController.current === controller) {
      dashboardReadController.current = null;
    }
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
  const operationalReadiness = useMemo(() => {
    if (fleetAlerts.some((alert) => alert.severity === "critical")) return 0;
    if (fleetAlerts.some((alert) => alert.severity === "high")) return 25;
    if (fleetAlerts.length > 0) return 50;
    return 100;
  }, [fleetAlerts]);

const readinessStatus =
  fleetDataStatus === "loading"
    ? "LOADING"
    : fleetDataStatus === "unavailable"
    ? "DATA UNAVAILABLE"
    : fleetDataStatus === "empty"
    ? "INSUFFICIENT DATA"
    :
  operationalReadiness >= 85
    ? "OPTIMAL"
    : operationalReadiness >= 70
    ? "STABLE"
    : operationalReadiness >= 50
    ? "ELEVATED"
    : "CRITICAL";

const aiOperationalNarrative = useMemo(() => {
  if (fleetDataStatus === "loading") {
    return "Fleet monitoring information is loading. Operational readiness cannot yet be determined.";
  }
  if (fleetDataStatus === "unavailable") {
    return "Fleet monitoring data could not be verified. Operational readiness is unavailable.";
  }
  if (fleetDataStatus === "empty") {
    return "No vehicles are registered for this organization. There is insufficient fleet data to calculate operational readiness.";
  }
  if (operationalReadiness < 50) {
    return "AI systems detected elevated operational instability requiring immediate intervention.";
  }

  if (operationalReadiness < 70) {
    return "Fleet operations show moderate risk indicators and require enhanced monitoring.";
  }

  if (operationalReadiness < 85) {
    return "Fleet operations remain stable with manageable operational risk.";
  }

  return "Fleet operations are currently performing within optimal intelligence thresholds.";
}, [operationalReadiness, fleetDataStatus]);

const executiveRiskIndex = useMemo(() => {
  if (fleetAlerts.some((alert) => alert.severity === "critical")) return 100;
  if (fleetAlerts.some((alert) => alert.severity === "high")) return 75;
  if (fleetAlerts.length > 0) return 50;
  return 0;
}, [fleetAlerts]);

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

    const response = await fetchWithAuth("/api/batches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
	<TrialBanner
  trialEndsAt={trialEndsAt}
/>
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
      {fleetDataStatus === "unavailable" || batchDataStatus === "unavailable" ? (
        <div role="status" style={{ ...cardStyle, padding: 16, marginBottom: 20 }}>
          <p style={{ marginTop: 0 }}>Some dashboard data could not be loaded. Try again.</p>
          <button type="button" onClick={() => { void loadAll(); }} style={primaryButtonStyle}>
            Retry loading data
          </button>
        </div>
      ) : null}
<div
  style={{
    marginBottom: 24,
    borderRadius: 24,
    padding: 28,
    background:
      operationalReadiness < 50
        ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
        : operationalReadiness < 70
        ? "linear-gradient(135deg,#9a3412,#c2410c)"
        : "linear-gradient(135deg,#0f172a,#1e293b)",
    color: "#fff",
    boxShadow:
      "0 25px 50px rgba(15,23,42,0.35)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 20,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 14,
          opacity: 0.8,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        EXECUTIVE AI WAR-ROOM
      </div>

      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {readinessStatus}
      </div>

      <div
        style={{
          marginTop: 14,
          maxWidth: 700,
          fontSize: 16,
          lineHeight: 1.6,
          opacity: 0.92,
        }}
      >
        {aiOperationalNarrative}
      </div>
    </div>

    <div
      style={{
        textAlign: "right",
      }}
    >
      <div
        style={{
          fontSize: 13,
          opacity: 0.75,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        OPERATIONAL READINESS
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {fleetDataStatus === "available" ? operationalReadiness : "—"}
      </div>

      <div
        style={{
          fontSize: 15,
          opacity: 0.85,
        }}
      >
        {fleetDataStatus === "available" ? "/100 AI Score" : "Score unavailable"}
      </div>
    </div>
  </div>

  <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    marginBottom: 32,
  }}
>
  {[
    {
      label: "Active Vehicles",
      value: fleetDataStatus === "available"
        ? fleetVehicles.filter((v) => v.is_active).length
        : "—",
    },
    {
      label: "Active Trips",
      value: fleetDataStatus === "available"
        ? fleetTrips.filter((trip) => trip.status === "active" || trip.status === "emergency").length
        : "—",
    },
    {
      label: "Open Fleet Alerts",
      value: fleetDataStatus === "available" ? fleetAlerts.length : "—",
    },
    {
      label: "AI Threat Score",
      value: fleetDataStatus === "available"
        ? `${fleetAlerts.some((alert) => alert.severity === "critical") ? 100 : fleetAlerts.some((alert) => alert.severity === "high") ? 75 : fleetAlerts.length > 0 ? 50 : 0}%`
        : "—",
    },
  ].map((metric) => (
    <div
      key={metric.label}
      style={{
        background: "#fff",
        borderRadius: 24,
        padding: 24,
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          color: "#64748b",
          marginBottom: 10,
          fontSize: 14,
        }}
      >
        {metric.label}
      </div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 900,
        }}
      >
        <span style={{ color: "#020617", WebkitTextFillColor: "#020617" }}>{String(metric.value)}</span>
      </div>
    </div>
  ))}
</div>
<div
  style={{
    background: "#fff",
    borderRadius: 24,
    padding: 24,
    border: "1px solid #e2e8f0",
    marginBottom: 32,
  }}
>
  <h2
    style={{
      marginTop: 0,
      marginBottom: 20,
      fontSize: 28,
    }}
  >
    Live Fleet Activity
  </h2>

  <div style={{ display: "grid", gap: 16 }}>
    {fleetVehicles.slice(0, 6).map((vehicle) => (
      <div
        key={vehicle.id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 18,
          borderRadius: 18,
          background: "#f8fafc",
        }}
      >
        <div>
          <div style={{ fontWeight: 800 }}>
            {vehicle.registration_number || vehicle.registrationNumber || vehicle.nickname || "Unknown Vehicle"}
          </div>

          <div
            style={{
              color: "#64748b",
              marginTop: 4,
            }}
          >
            {vehicle.nickname || "Live fleet vehicle"}
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {Number(vehicle.speed_kmh || vehicle.speedKmh || 0)} km/h
          </div>

          <div
            style={{
              marginTop: 4,
              color:
                (vehicle.maintenanceProfile?.maintenanceRisk || "Low").toLowerCase() === "high"
                  ? "#dc2626"
                  : (vehicle.maintenanceProfile?.maintenanceRisk || "Low").toLowerCase() === "medium"
                  ? "#ca8a04"
                  : "#16a34a",
              fontWeight: 700,
            }}
          >
            {(vehicle.maintenanceProfile?.maintenanceRisk || "Low").toUpperCase()} RISK
          </div>
        </div>
      </div>
    ))}
  </div>
</div>

<div
  style={{
      display: "grid",
      gridTemplateColumns:
        isMobile
          ? "1fr"
          : "repeat(4,minmax(0,1fr))",
      gap: 18,
      marginTop: 28,
    }}
  >
    {[
      {
        label: "Executive Threat Index",
        value: fleetDataStatus === "available" ? `${executiveRiskIndex}/100` : "—",
      },
      {
        label: "Open Fleet Alerts", value: fleetDataStatus === "available" ? fleetAlerts.length : "—",
      },
      {
        label: "Flagged Operations",
        value: batchDataStatus === "available" ? flaggedCount : "—",
      },
      {
        label: "Average Loss %",
        value: batchDataStatus === "available"
          ? `${formatOneDecimal(averageLossPercent)}%`
          : "—",
      },
    ].map((item, index) => (
      <div
        key={index}
        style={{
          background:
            "rgba(255,255,255,0.08)",
          border:
            "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 13,
            opacity: 0.8,
            marginBottom: 10,
          }}
        >
          {item.label}
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: 900,
          }}
        >
          {item.value}
        </div>
      </div>
    ))}
  </div>
</div>
      {routeSafetyAlerts.length > 0 && (
        <div
          onClick={() => {
            window.location.href = "/route-safety";
          }}
          style={{
            marginBottom: 20,
            padding: 18,
            borderRadius: 14,
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🚧 Route Safety Intelligence
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500 }}>
            Active Route Threats: {routeSafetyAlerts.length}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
            {routeSafetyAlerts
              .slice(0, 3)
              .map((alert) => alert.title)
              .join(" • ")}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            Click to open Route Safety
          </div>
        </div>
      )}

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
          { label: "Total Catch", value: batchDataStatus === "available" ? `${formatNumber(totalCatch)} kg` : "—" },
          { label: "Stored", value: batchDataStatus === "available" ? `${formatNumber(totalStored)} kg` : "—" },
          { label: "Open Fleet Alerts", value: fleetDataStatus === "available" ? formatNumber(fleetAlerts.length) : "—" },
          { label: "Flagged Batches", value: batchDataStatus === "available" ? formatNumber(flaggedCount) : "—" },
        ].map((item, index) => (
          <div key={index} style={{ ...cardStyle, padding: 26 }}>
            <div style={{ color: "#64748b", fontSize: 15, marginBottom: 12 }}>{item.label}</div>
            <div
  style={{
    fontSize: 38,
    fontWeight: 800,
    lineHeight: 1.1,
    color: "#0f172a",
  }}
>
  {item.value}
</div>
          </div>
        ))}
      </div>
<div
  style={{
    background: "#fff",
    borderRadius: 24,
    padding: 24,
    border: "1px solid #e2e8f0",
  }}
>
  <h2
    style={{
      marginTop: 0,
      marginBottom: 20,
      fontSize: 28,
    }}
  >
    AI Threat Alerts
  </h2>

  <div style={{ display: "grid", gap: 16 }}>
    {fleetAlerts.slice(0, 6).map((alert) => (
      <div
        key={alert.id}
        style={{
          borderRadius: 18,
          padding: 18,
          background:
            alert.severity === "critical"
              ? "#fef2f2"
              : alert.severity === "high"
              ? "#fff7ed"
              : "#eff6ff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 800 }}>
            {(alert.alert_type || "unknown_alert").replace(/_/g, " ").toUpperCase()}
          </div>

          <div
            style={{
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {alert.severity}
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#64748b",
          }}
        >
          {alert.vehicle?.registration_number || alert.vehicle?.nickname || "Unknown Vehicle"} - {formatDateTime(alert.created_at)}
        </div>
      </div>
    ))}
  </div>
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
          <div style={{ fontSize: 32, fontWeight: 800 }}>{batchDataStatus === "available" ? `${formatOneDecimal(averageLossPerBatch)} kg` : "—"}</div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>Average Loss %</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{batchDataStatus === "available" ? `${formatOneDecimal(averageLossPercent)}%` : "—"}</div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>Top Risky Vessel</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{batchDataStatus === "available" ? topRiskyVessel : "—"}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1.45fr) minmax(0, 1fr)",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 26, minWidth: 0 }}>
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
            {batchDataStatus !== "available" || trendData.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 15,
                }}
              >
                {batchDataStatus === "loading"
  ? "Loading batch performance data..."
  : batchDataStatus === "unavailable"
    ? "Batch performance data could not be verified."
    : "No batch performance data is available yet."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 300 }}>
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
            )}
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
          gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
          gap: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 26, minWidth: 0 }}>
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
            {batchDataStatus !== "available" || batches.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 15,
                }}
              >
                {batchDataStatus === "loading"
  ? "Loading batch status data..."
  : batchDataStatus === "unavailable"
    ? "Batch status data could not be verified."
    : "No batch status data is available yet."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 300 }}>
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
            )}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 26, minWidth: 0 }}>
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
            {batchDataStatus !== "available" || vesselRiskData.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 15,
                }}
              >
                {batchDataStatus === "loading"
  ? "Loading vessel risk data..."
  : batchDataStatus === "unavailable"
    ? "Vessel risk data could not be verified."
    : "No vessel risk data is available yet."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 300 }}>
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
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}




























