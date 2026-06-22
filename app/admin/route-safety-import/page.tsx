"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

export default function RouteSafetyImportPage() {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function importCsv() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetchWithAuth("/api/route-safety/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
        },
        body: csv,
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message || "Import failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Route Safety CSV Import</h1>

      <p>Paste route safety alerts CSV below, then import.</p>

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={12}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 12,
          fontFamily: "monospace",
        }}
        placeholder="type,title,description,latitude,longitude,radius_meters,severity,source,expires_at"
      />

      <button
        onClick={importCsv}
        disabled={loading || !csv.trim()}
        style={{
          marginTop: 16,
          padding: "12px 20px",
          borderRadius: 8,
          border: "none",
          background: "#2563eb",
          color: "white",
          fontWeight: 700,
        }}
      >
        {loading ? "Importing..." : "Import CSV"}
      </button>

      {result && (
        <pre style={{ marginTop: 20, padding: 16, background: "#f3f4f6" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
