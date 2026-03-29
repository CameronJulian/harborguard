"use client";

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
  const [exportingPdf, setExportingPdf] = useState(false);

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

  const filteredBatches = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    return batches.filter((batch) => {
      if (!batch.created_at) return false;
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
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
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
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
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
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto auto auto",
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

          <button style={secondaryButtonStyle} onClick={exportBatchesCsv}>
            Export Batches CSV
          </button>

          <button style={secondaryButtonStyle} onClick={exportIncidentsCsv}>
            Export Incidents CSV
          </button>

          <button style={buttonStyle} onClick={exportAnalyticsPdf} disabled={exportingPdf}>
            {exportingPdf ? "Exporting PDF..." : "Export PDF Report"}
          </button>
        </div>
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