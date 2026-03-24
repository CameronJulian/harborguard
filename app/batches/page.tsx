"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
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

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
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

function statusColor(status: string | null) {
  if (status === "Flagged" || status === "Open") return "#dc2626";
  if (status === "Review") return "#d97706";
  if (status === "Normal" || status === "Resolved") return "#16a34a";
  return "#111827";
}

function riskLabel(status: string | null) {
  if (status === "Flagged") return "🔴 High Risk";
  if (status === "Review") return "🟠 Medium Risk";
  return "🟢 Low Risk";
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  async function loadBatches() {
    const { data } = await supabase
      .from("batches")
      .select("id, batch_code, vessel, species, catch_kg, dock_kg, storage_kg, status, created_at")
      .order("created_at", { ascending: false });

    setBatches((data as BatchRow[]) || []);
  }

  useEffect(() => {
    loadBatches();

    const channel = supabase
      .channel("batches-live-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "batches" },
        () => loadBatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredBatches = useMemo(() => {
    const term = search.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch =
        !term ||
        (batch.batch_code || "").toLowerCase().includes(term) ||
        (batch.vessel || "").toLowerCase().includes(term) ||
        (batch.species || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, search, statusFilter]);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 26 }}>
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
            <h2 style={sectionTitleStyle}>Recent Batches</h2>
            <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
              Latest recorded supply batches and risk status.
            </p>
          </div>

          <div style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>
            Showing {filteredBatches.length} of {batches.length} batches
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) 220px",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <input
            style={inputStyle}
            placeholder="Search by batch, vessel, or species"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={inputStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Normal">Normal</option>
            <option value="Review">Review</option>
            <option value="Flagged">Flagged</option>
          </select>
        </div>

        {filteredBatches.length === 0 ? (
          <p style={mutedTextStyle}>
            {batches.length === 0
              ? "No batches saved yet."
              : "No batches match your current search or filter."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  {["Batch", "Vessel", "Species", "Catch", "Dock", "Storage", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        borderBottom: "1px solid #e5e7eb",
                        color: "#64748b",
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                      {batch.batch_code}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {batch.vessel}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {batch.species}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {batch.catch_kg}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {batch.dock_kg}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {batch.storage_kg}
                    </td>
                    <td
                      style={{
                        padding: 14,
                        borderBottom: "1px solid #f1f5f9",
                        color: statusColor(batch.status),
                        fontWeight: 800,
                      }}
                    >
                      <div>{batch.status}</div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                        {riskLabel(batch.status)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}