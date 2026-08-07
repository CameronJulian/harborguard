"use client";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import TrialBanner from "@/components/billing/TrialBanner";
import PremiumGate from "@/components/PremiumGate";

import { CSSProperties, useEffect, useMemo, useState } from "react";
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
import { fetchWithAuth } from "@/lib/auth-fetch";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
type VehicleOption = {
  id: string;
  nickname: string | null;
  registration_number: string | null;
};

type RoutePredictionPerformance = {
  totalEvaluations: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
};

type RoutePredictionPerformanceResponse = {
  success: boolean;
  performance: RoutePredictionPerformance;
};
type RoutePredictionThresholdAnalysis = {
  threshold: number;
  performance: RoutePredictionPerformance;
};

type RoutePredictionThresholdAnalysisResponse = {
  success: boolean;
  analysis: RoutePredictionThresholdAnalysis[];
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
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

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Math.round(value));
}

function formatOneDecimal(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}
function formatPerformancePercent(value: number | null) {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

export default function AnalyticsPage() {
	


  const [isMobile, setIsMobile] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [routePredictionPerformance, setRoutePredictionPerformance] =
    useState<RoutePredictionPerformance | null>(null);
  const [routePredictionFleetPerformance, setRoutePredictionFleetPerformance] =
    useState<RoutePredictionPerformance | null>(null);
  const [routePredictionPerformanceLoading, setRoutePredictionPerformanceLoading] =
    useState(false);
  const [routePredictionPerformanceError, setRoutePredictionPerformanceError] =
    useState("");
  const [routePredictionThresholdAnalysis, setRoutePredictionThresholdAnalysis] =
    useState<RoutePredictionThresholdAnalysis[]>([]);
  const [routePredictionThresholdAnalysisLoading, setRoutePredictionThresholdAnalysisLoading] =
    useState(false);
  const [routePredictionThresholdAnalysisError, setRoutePredictionThresholdAnalysisError] =
    useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
 const {
  premiumAllowed,
  subscriptionLoaded,
  subscription,
} = usePremiumAccess();
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(toDateInputValue(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(toDateInputValue(today));

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 980);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    loadAll();
    loadVehicles();

    const batchChannel = supabase
      .channel("analytics-batches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "batches" },
        () => loadAll()
      )
      .subscribe();

    const incidentChannel = supabase
      .channel("analytics-incidents-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => loadAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(batchChannel);
      supabase.removeChannel(incidentChannel);
    };
  }, []);
  async function loadVehicles() {
    try {
      const response = await fetchWithAuth("/api/fleet/vehicles", {
        cache: "no-store",
      });

      const result = (await response.json()) as
        | { success: boolean; vehicles: VehicleOption[] }
        | { error?: string };

      if (!response.ok) {
        setVehicles([]);
        return;
      }

      setVehicles(
        "vehicles" in result && Array.isArray(result.vehicles)
          ? result.vehicles
          : []
      );
    } catch {
      setVehicles([]);
    }
  }

  async function loadRoutePredictionThresholdAnalysis() {
    setRoutePredictionThresholdAnalysisLoading(true);
    setRoutePredictionThresholdAnalysisError("");

    try {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59.999`);

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      if (selectedVehicleId) {
        params.set("vehicleId", selectedVehicleId);
      }

      const response = await fetchWithAuth(
        `/api/fleet/route-prediction-threshold-analysis?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as
          | RoutePredictionThresholdAnalysisResponse
          | { error?: string };

      if (!response.ok) {
        setRoutePredictionThresholdAnalysis([]);
        setRoutePredictionThresholdAnalysisError(
          "error" in result && result.error
            ? result.error
            : "Failed to load route prediction threshold analysis."
        );
        return;
      }

      setRoutePredictionThresholdAnalysis(
        (result as RoutePredictionThresholdAnalysisResponse).analysis
      );
    } catch (error: unknown) {
      setRoutePredictionThresholdAnalysis([]);
      setRoutePredictionThresholdAnalysisError(
        error instanceof Error
          ? error.message
          : "Failed to load route prediction threshold analysis."
      );
    } finally {
      setRoutePredictionThresholdAnalysisLoading(false);
    }
  }
  async function loadRoutePredictionPerformance() {
    setRoutePredictionPerformanceLoading(true);
    setRoutePredictionPerformanceError("");

    try {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59.999`);

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      if (selectedVehicleId) {
        params.set("vehicleId", selectedVehicleId);
      }

      const response = await fetchWithAuth(
        `/api/fleet/route-prediction-performance?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as
          | RoutePredictionPerformanceResponse
          | { error?: string };

      if (!response.ok) {
        setRoutePredictionPerformance(null);
        setRoutePredictionFleetPerformance(null);
        setRoutePredictionPerformanceError(
          "error" in result && result.error
            ? result.error
            : "Failed to load route prediction performance."
        );
        return;
      }

      setRoutePredictionPerformance(
        (result as RoutePredictionPerformanceResponse).performance
      );

      if (selectedVehicleId) {
        try {
          const fleetParams = new URLSearchParams({
            start: start.toISOString(),
            end: end.toISOString(),
          });

          const fleetResponse = await fetchWithAuth(
            `/api/fleet/route-prediction-performance?${fleetParams.toString()}`,
            {
              cache: "no-store",
            }
          );

          const fleetResult =
            (await fleetResponse.json()) as
              | RoutePredictionPerformanceResponse
              | { error?: string };

          if (fleetResponse.ok) {
            setRoutePredictionFleetPerformance(
              (fleetResult as RoutePredictionPerformanceResponse).performance
            );
          } else {
            setRoutePredictionFleetPerformance(null);
          }
        } catch {
          setRoutePredictionFleetPerformance(null);
        }
      } else {
        setRoutePredictionFleetPerformance(null);
      }
    } catch (error: unknown) {
      setRoutePredictionPerformance(null);
      setRoutePredictionPerformanceError(
        error instanceof Error
          ? error.message
          : "Failed to load route prediction performance."
      );
    } finally {
      setRoutePredictionPerformanceLoading(false);
    }
  }

  async function loadAll() {
   const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.user) return;

const { data: profile } = await supabase
  .from("profiles")
  .select("organization_id")
  .eq("id", session.user.id)
  .single();





const { data: batchData } = await supabase
  .from("batches")
  .select(
    "id, batch_code, vessel, species, catch_kg, dock_kg, storage_kg, status, created_at"
  )
  .eq("organization_id", profile!.organization_id)
  .order("created_at", { ascending: false });

const { data: incidentData } = await supabase
  .from("incidents")
  .select("id, incident_code, severity, status, summary, created_at")
  .eq("organization_id", profile!.organization_id)
  .order("created_at", { ascending: false });

    setBatches((batchData as BatchRow[]) || []);
    setIncidents((incidentData as IncidentRow[]) || []);
  }
  useEffect(() => {
    loadRoutePredictionPerformance();
    loadRoutePredictionThresholdAnalysis();
  }, [startDate, endDate, selectedVehicleId]);

  const selectedVehicleLabel = useMemo(() => {
    const vehicle = vehicles.find(
      (entry) => entry.id === selectedVehicleId
    );

    if (!vehicle) {
      return "Selected vehicle";
    }

    if (vehicle.nickname && vehicle.registration_number) {
      return `${vehicle.nickname} (${vehicle.registration_number})`;
    }

    return (
      vehicle.nickname ||
      vehicle.registration_number ||
      "Selected vehicle"
    );
  }, [vehicles, selectedVehicleId]);

  const routePredictionThresholdChartData = useMemo(
    () =>
      routePredictionThresholdAnalysis.map((entry) => ({
        threshold: entry.threshold,
        precision:
          entry.performance.precision === null
            ? null
            : Number((entry.performance.precision * 100).toFixed(1)),
        recall:
          entry.performance.recall === null
            ? null
            : Number((entry.performance.recall * 100).toFixed(1)),
      })),
    [routePredictionThresholdAnalysis]
  );
  const routePredictionThresholdEvaluationCount =
    routePredictionThresholdAnalysis[0]?.performance.totalEvaluations ?? 0;

  const routePredictionThresholdComparison = useMemo(
    () =>
      [30, 35, 40]
        .map((threshold) =>
          routePredictionThresholdAnalysis.find(
            (entry) => entry.threshold === threshold
          )
        )
        .filter(
          (entry): entry is RoutePredictionThresholdAnalysis =>
            entry !== undefined
        ),
    [routePredictionThresholdAnalysis]
  );

  const routePredictionProductionThreshold =
    routePredictionThresholdComparison.find(
      (entry) => entry.threshold === 35
    );

  const filteredBatches = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    const testKeywords = [
      "audit-trail-test",
      "final-prod-test",
      "final-resolution-test",
      "resolution-note-test",
      "incident-flagged-test",
      "incident-test-ocean-only",
      "test brand new batch creation",
      "test new batch",
      "vessel test for batch",
      "new test for inci",
      "new test to see incident",
      "test for deployment",
      "new vessel test",
      "demo vessel",
      "ocean test vessel",
    ];

    return batches.filter((batch) => {
      if (!batch.created_at) return false;

      const vesselName = String(batch.vessel || "").toLowerCase();
      const batchCode = String(batch.batch_code || "").toLowerCase();

      const isTestBatch = testKeywords.some(
        (keyword) =>
          vesselName.includes(keyword) || batchCode.includes(keyword)
      );

      if (isTestBatch) return false;

      const created = new Date(batch.created_at);
      return created >= start && created <= end;
    });
  }, [batches, startDate, endDate]);

  const filteredIncidents = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    return incidents.filter((incident) => {
      if (!incident.created_at) return false;
      const created = new Date(incident.created_at);
      return created >= start && created <= end;
    });
  }, [incidents, startDate, endDate]);

  const totalCatch = useMemo(
    () => filteredBatches.reduce((sum, b) => sum + Number(b.catch_kg || 0), 0),
    [filteredBatches]
  );

  const totalStored = useMemo(
    () => filteredBatches.reduce((sum, b) => sum + Number(b.storage_kg || 0), 0),
    [filteredBatches]
  );

  const totalLoss = useMemo(
    () =>
      filteredBatches.reduce(
        (sum, b) => sum + (Number(b.catch_kg || 0) - Number(b.storage_kg || 0)),
        0
      ),
    [filteredBatches]
  );

  const flaggedCount = useMemo(
    () => filteredBatches.filter((b) => b.status === "Flagged").length,
    [filteredBatches]
  );

  const reviewCount = useMemo(
    () => filteredBatches.filter((b) => b.status === "Review").length,
    [filteredBatches]
  );

  const openIncidents = useMemo(
    () => filteredIncidents.filter((i) => i.status === "Open").length,
    [filteredIncidents]
  );

  const avgLossPercent = useMemo(() => {
    if (!filteredBatches.length) return 0;
    const values = filteredBatches.map((b) => {
      const catchValue = Number(b.catch_kg || 0);
      const storageValue = Number(b.storage_kg || 0);
      if (catchValue <= 0) return 0;
      return ((catchValue - storageValue) / catchValue) * 100;
    });
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [filteredBatches]);

  const trendData = useMemo(
    () =>
      [...filteredBatches]
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
          };
        }),
    [filteredBatches]
  );

  const vesselData = useMemo(() => {
    const map: Record<string, { vessel: string; totalLoss: number; totalCatch: number }> = {};

    for (const b of filteredBatches) {
      const vessel = b.vessel || "Unknown";
      const catchValue = Number(b.catch_kg || 0);
      const storageValue = Number(b.storage_kg || 0);
      const loss = catchValue - storageValue;

      if (!map[vessel]) {
        map[vessel] = { vessel, totalLoss: 0, totalCatch: 0 };
      }

      map[vessel].totalLoss += loss;
      map[vessel].totalCatch += catchValue;
    }

    return Object.values(map)
      .map((item) => ({
        ...item,
        lossPercent: item.totalCatch > 0 ? (item.totalLoss / item.totalCatch) * 100 : 0,
      }))
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, 8);
  }, [filteredBatches]);

  const statusData = useMemo(
    () => [
      { name: "Normal", value: filteredBatches.filter((b) => b.status === "Normal").length },
      { name: "Review", value: filteredBatches.filter((b) => b.status === "Review").length },
      { name: "Flagged", value: filteredBatches.filter((b) => b.status === "Flagged").length },
    ],
    [filteredBatches]
  );
  function exportBatchesCsv() {
    const headers = [
      "Batch Code",
      "Vessel",
      "Species",
      "Catch Kg",
      "Dock Kg",
      "Storage Kg",
      "Status",
      "Created At",
    ];

    const rows = filteredBatches.map((b) => [
      b.batch_code ?? "",
      b.vessel ?? "",
      b.species ?? "",
      b.catch_kg ?? "",
      b.dock_kg ?? "",
      b.storage_kg ?? "",
      b.status ?? "",
      b.created_at ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `harborguard-batches-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportIncidentsCsv() {
    const headers = [
      "Incident Code",
      "Severity",
      "Status",
      "Summary",
      "Created At",
    ];

    const rows = filteredIncidents.map((i) => [
      i.incident_code ?? "",
      i.severity ?? "",
      i.status ?? "",
      i.summary ?? "",
      i.created_at ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `harborguard-incidents-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function sendEmailReport() {
    setSendingEmail(true);

    try {
      const response = await fetch("/api/reports/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          email: "cameronhendrick17@gmail.com",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Failed to send email report.");
        return;
      }

      alert("Email report sent successfully.");
    } finally {
      setSendingEmail(false);
    }
  }

  function exportAnalyticsPdf() {
    setExportingPdf(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("HarborGuard Analytics Report", 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Reporting Period: ${startDate} to ${endDate}`, 14, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

      doc.setDrawColor(220, 226, 232);
      doc.line(14, 34, pageWidth - 14, 34);

      autoTable(doc, {
        startY: 40,
        head: [["Metric", "Value"]],
        body: [
          ["Total Catch", `${formatNumber(totalCatch)} kg`],
          ["Total Stored", `${formatNumber(totalStored)} kg`],
          ["Total Loss", `${formatNumber(totalLoss)} kg`],
          ["Open Incidents", formatNumber(openIncidents)],
          ["Flagged Batches", formatNumber(flaggedCount)],
          ["Review Batches", formatNumber(reviewCount)],
          ["Average Loss %", `${formatOneDecimal(avgLossPercent)}%`],
          ["Filtered Batches", formatNumber(filteredBatches.length)],
          ["Filtered Incidents", formatNumber(filteredIncidents.length)],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 10 },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Batch Code", "Vessel", "Species", "Catch", "Storage", "Status", "Created"]],
        body: filteredBatches.slice(0, 20).map((b) => [
          b.batch_code ?? "",
          b.vessel ?? "",
          b.species ?? "",
          String(b.catch_kg ?? ""),
          String(b.storage_kg ?? ""),
          b.status ?? "",
          formatDisplayDate(b.created_at),
        ]),
        theme: "striped",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 8 },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Incident Code", "Severity", "Status", "Summary", "Created"]],
        body: filteredIncidents.slice(0, 20).map((i) => [
          i.incident_code ?? "",
          i.severity ?? "",
          i.status ?? "",
          i.summary ?? "",
          formatDisplayDate(i.created_at),
        ]),
        theme: "striped",
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 8 },
      });

      doc.save(`harborguard-analytics-${startDate}-to-${endDate}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }
if (subscriptionLoaded && !premiumAllowed) {
  return (
    <AppShell>
	<TrialBanner
  trialEndsAt={subscription?.trial_ends_at}
/>
      <PremiumGate
        title="Advanced Analytics"
        description="Upgrade to HarborGuard Professional to unlock executive analytics, vessel intelligence, reporting exports, and operational insights."
        currentPlan={subscription?.plan}
        trialEndsAt={subscription?.trial_ends_at}
      />
    </AppShell>
  );
}
  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={sectionTitleStyle}>Analytics</h2>
            <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
              Explore performance over a selected date range and export the results.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr minmax(180px, 1fr) auto auto auto auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Start Date</div>
            <input
              style={inputStyle}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>End Date</div>
            <input
              style={inputStyle}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>


          <div>
            <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Vehicle</div>
            <select
              style={inputStyle}
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
            >
              <option value="">All vehicles</option>
              {vehicles.map((vehicle) => {
                const label =
                  vehicle.nickname && vehicle.registration_number
                    ? `${vehicle.nickname} (${vehicle.registration_number})`
                    : vehicle.nickname ||
                      vehicle.registration_number ||
                      "Unnamed vehicle";

                return (
                  <option key={vehicle.id} value={vehicle.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <button style={secondaryButtonStyle} onClick={exportBatchesCsv}>
            Export Batches CSV
          </button>

          <button style={secondaryButtonStyle} onClick={exportIncidentsCsv}>
            Export Incidents CSV
          </button>

          <button style={secondaryButtonStyle} onClick={sendEmailReport} disabled={sendingEmail}>
            {sendingEmail ? "Sending Email..." : "Send Email Report"}
          </button>

          <button style={buttonStyle} onClick={exportAnalyticsPdf} disabled={exportingPdf}>
            {exportingPdf ? "Exporting PDF..." : "Export PDF Report"}
          </button>
        </div>
      </div>
      <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={sectionTitleStyle}>Route Prediction Performance</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
            Completed-trip prediction quality for the selected reporting period.
          </p>
        </div>

        {routePredictionPerformanceLoading ? (
          <div style={{ color: "#64748b" }}>
            Loading prediction performance...
          </div>
        ) : routePredictionPerformanceError ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
            }}
          >
            {routePredictionPerformanceError}
          </div>
        ) : !routePredictionPerformance ||
          routePredictionPerformance.totalEvaluations === 0 ? (
          <div style={{ color: "#64748b" }}>
            No completed route prediction evaluations exist for this period yet.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  isMobile
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {[
                {
                  label: "Evaluations",
                  value: formatNumber(
                    routePredictionPerformance.totalEvaluations
                  ),
                },
                {
                  label: "Accuracy",
                  value: formatPerformancePercent(
                    routePredictionPerformance.accuracy
                  ),
                },
                {
                  label: "Precision",
                  value: formatPerformancePercent(
                    routePredictionPerformance.precision
                  ),
                },
                {
                  label: "Recall",
                  value: formatPerformancePercent(
                    routePredictionPerformance.recall
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 20,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 14,
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 800,
                      lineHeight: 1.1,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {selectedVehicleId &&
            routePredictionFleetPerformance &&
            routePredictionFleetPerformance.totalEvaluations > 0 ? (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 18,
                  marginBottom: 16,
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: "#0f172a" }}>
                      Selected Vehicle vs Fleet
                    </strong>
                    <div
                      style={{
                        ...mutedTextStyle,
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      {selectedVehicleLabel} compared with all vehicles
                      for the same reporting period.
                    </div>
                  </div>

                  <div
                    style={{
                      ...mutedTextStyle,
                      fontSize: 12,
                    }}
                  >
                    Vehicle evaluations: {formatNumber(
                      routePredictionPerformance.totalEvaluations
                    )} · Fleet evaluations: {formatNumber(
                      routePredictionFleetPerformance.totalEvaluations
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    {
                      label: "Accuracy",
                      vehicleValue: routePredictionPerformance.accuracy,
                      fleetValue: routePredictionFleetPerformance.accuracy,
                    },
                    {
                      label: "Precision",
                      vehicleValue: routePredictionPerformance.precision,
                      fleetValue: routePredictionFleetPerformance.precision,
                    },
                    {
                      label: "Recall",
                      vehicleValue: routePredictionPerformance.recall,
                      fleetValue: routePredictionFleetPerformance.recall,
                    },
                  ].map((item) => {
                    const deltaPercentagePoints =
                      item.vehicleValue !== null &&
                      item.fleetValue !== null
                        ? (item.vehicleValue - item.fleetValue) * 100
                        : null;

                    return (
                      <div
                        key={item.label}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            ...mutedTextStyle,
                            fontSize: 12,
                            marginBottom: 5,
                          }}
                        >
                          {item.label}
                        </div>
                        <strong style={{ color: "#0f172a" }}>
                          {formatPerformancePercent(item.vehicleValue)}
                        </strong>
                        <div
                          style={{
                            ...mutedTextStyle,
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          Fleet: {formatPerformancePercent(item.fleetValue)}
                          {deltaPercentagePoints === null
                            ? ""
                            : " | " +
                              (deltaPercentagePoints >= 0 ? "+" : "") +
                              deltaPercentagePoints.toFixed(1) +
                              " pp"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  isMobile
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  label: "True Positive",
                  value: formatNumber(
                    routePredictionPerformance.truePositive
                  ),
                },
                {
                  label: "False Positive",
                  value: formatNumber(
                    routePredictionPerformance.falsePositive
                  ),
                },
                {
                  label: "False Negative",
                  value: formatNumber(
                    routePredictionPerformance.falseNegative
                  ),
                },
                {
                  label: "True Negative",
                  value: formatNumber(
                    routePredictionPerformance.trueNegative
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 18,
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={sectionTitleStyle}>
              Route Prediction Threshold Analysis
            </h2>
            <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
              Historical precision and recall across candidate thresholds for the selected reporting period.
            </p>
          </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#334155",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Evaluations: {formatNumber(routePredictionThresholdEvaluationCount)}
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#334155",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Current production threshold: 35
        </div>
      </div>
        </div>

        {routePredictionThresholdAnalysisLoading ? (
          <div style={{ color: "#64748b" }}>
            Loading threshold analysis...
          </div>
        ) : routePredictionThresholdAnalysisError ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
            }}
          >
            {routePredictionThresholdAnalysisError}
          </div>
        ) : routePredictionThresholdChartData.length === 0 ? (
          <div style={{ color: "#64748b" }}>
            No completed route prediction evaluations exist for threshold analysis in this period yet.
          </div>
        ) : (
          <>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 18,
                height: 380,
                background: "#fff",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={routePredictionThresholdChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="threshold"
                    domain={[0, 100]}
                    type="number"
                    tickCount={11}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      value === null || value === undefined
                        ? "-"
                        : `${Number(value).toFixed(1)}%`,
                      name === "precision" ? "Precision" : "Recall",
                    ]}
                    labelFormatter={(value) =>
                      `Threshold ${value}${
                        Number(value) === 35
                          ? " (current production)"
                          : ""
                      }`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="precision"
                    name="Precision"
                    connectNulls={false}
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="recall"
                    name="Recall"
                    connectNulls={false}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {routePredictionThresholdComparison.map((entry) => {
                const isProductionThreshold = entry.threshold === 35;

                const precisionDeltaPercentagePoints =
                  !isProductionThreshold &&
                  entry.performance.precision !== null &&
                  routePredictionProductionThreshold?.performance.precision !== null &&
                  routePredictionProductionThreshold?.performance.precision !== undefined
                    ? (
                        entry.performance.precision -
                        routePredictionProductionThreshold.performance.precision
                      ) * 100
                    : null;

                const recallDeltaPercentagePoints =
                  !isProductionThreshold &&
                  entry.performance.recall !== null &&
                  routePredictionProductionThreshold?.performance.recall !== null &&
                  routePredictionProductionThreshold?.performance.recall !== undefined
                    ? (
                        entry.performance.recall -
                        routePredictionProductionThreshold.performance.recall
                      ) * 100
                    : null;

                return (
                  <div
                    key={entry.threshold}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: isProductionThreshold
                        ? "2px solid #334155"
                        : "1px solid #e5e7eb",
                      background: isProductionThreshold
                        ? "#f8fafc"
                        : "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <strong style={{ color: "#0f172a" }}>
                        Threshold {entry.threshold}
                      </strong>

                      {isProductionThreshold ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 7px",
                            borderRadius: 999,
                            background: "#e2e8f0",
                            color: "#334155",
                          }}
                        >
                          Production
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            ...mutedTextStyle,
                            fontSize: 12,
                            marginBottom: 3,
                          }}
                        >
                          Precision
                        </div>
                        <strong style={{ color: "#0f172a" }}>
                          {entry.performance.precision === null
                            ? "-"
                            : `${(
                                entry.performance.precision * 100
                              ).toFixed(1)}%`}
                        </strong>
                    {precisionDeltaPercentagePoints !== null ? (
                      <div
                        style={{
                          ...mutedTextStyle,
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        vs production: {precisionDeltaPercentagePoints >= 0 ? "+" : ""}
                        {precisionDeltaPercentagePoints.toFixed(1)} pp
                      </div>
                    ) : null}
                      </div>

                      <div>
                        <div
                          style={{
                            ...mutedTextStyle,
                            fontSize: 12,
                            marginBottom: 3,
                          }}
                        >
                          Recall
                        </div>
                        <strong style={{ color: "#0f172a" }}>
                          {entry.performance.recall === null
                            ? "-"
                            : `${(
                                entry.performance.recall * 100
                              ).toFixed(1)}%`}
                        </strong>
                    {recallDeltaPercentagePoints !== null ? (
                      <div
                        style={{
                          ...mutedTextStyle,
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        vs production: {recallDeltaPercentagePoints >= 0 ? "+" : ""}
                        {recallDeltaPercentagePoints.toFixed(1)} pp
                      </div>
                    ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 6,
          }}
        >
          <p
            style={{
              ...mutedTextStyle,
              margin: 0,
              fontSize: 13,
            }}
          >
            This chart is based on {formatNumber(routePredictionThresholdEvaluationCount)} completed route prediction evaluations in the selected period. Smaller evaluation sets provide more limited evidence and should be interpreted cautiously.
          </p>

          <p
            style={{
              ...mutedTextStyle,
              margin: 0,
              fontSize: 13,
            }}
          >
            Analysis only. HarborGuard does not automatically recommend or apply a production threshold from this chart.
          </p>
        </div>
          </>
        )}
      </div>

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
          { label: "Total Stored", value: `${formatNumber(totalStored)} kg` },
          { label: "Total Loss", value: `${formatNumber(totalLoss)} kg` },
          { label: "Open Incidents", value: formatNumber(openIncidents) },
        ].map((item, index) => (
          <div key={index} style={{ ...cardStyle, padding: 24 }}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>{item.label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Flagged Batches", value: formatNumber(flaggedCount) },
          { label: "Review Batches", value: formatNumber(reviewCount) },
          { label: "Average Loss %", value: `${formatOneDecimal(avgLossPercent)}%` },
          { label: "Filtered Batches", value: formatNumber(filteredBatches.length) },
        ].map((item, index) => (
          <div key={index} style={{ ...cardStyle, padding: 24 }}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>{item.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Trend Over Time</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Catch, storage, and loss across the selected period.
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
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="catch" stroke="#2563eb" strokeWidth={3} />
                <Line type="monotone" dataKey="storage" stroke="#16a34a" strokeWidth={3} />
                <Line type="monotone" dataKey="loss" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Status Mix</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Distribution of normal, review, and flagged batches.
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
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 26 }}>
        <h2 style={sectionTitleStyle}>Vessel Loss Ranking</h2>
        <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
          Compare vessels by total loss and loss percentage in the selected range.
        </p>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            height: 400,
            background: "#fff",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vesselData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="vessel" type="category" width={100} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "totalLoss") return [`${value} kg`, "Total Loss"];
                  if (name === "lossPercent") return [`${Number(value).toFixed(1)}%`, "Loss %"];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="totalLoss" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  );
}
