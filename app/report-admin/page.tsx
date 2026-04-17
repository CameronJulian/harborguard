"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import RoleGuard from "@/components/RoleGuard";
import { supabase } from "@/lib/supabase";

type ReportDeliveryLogRow = {
  id: string;
  subscription_id: string | null;
  user_id: string | null;
  email: string;
  full_name: string | null;
  report_frequency: "daily" | "weekly";
  start_date: string;
  end_date: string;
  status: "success" | "failed";
  error_message: string | null;
  created_at: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
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

const dangerButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
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

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function ReportAdminPage() {
  const [logs, setLogs] = useState<ReportDeliveryLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [runningDaily, setRunningDaily] = useState(false);
  const [runningWeekly, setRunningWeekly] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [cleaningFailed, setCleaningFailed] = useState(false);

  async function loadLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("report_delivery_logs")
      .select(
        "id, subscription_id, user_id, email, full_name, report_frequency, start_date, end_date, status, error_message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      setMessage(`Failed to load admin data: ${error.message}`);
      setLoading(false);
      return;
    }

    setLogs((data as ReportDeliveryLogRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel("report-admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_delivery_logs" },
        () => loadLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function runReports(period: "daily" | "weekly") {
    setMessage("");

    if (period === "daily") setRunningDaily(true);
    if (period === "weekly") setRunningWeekly(true);

    try {
      const response = await fetch("/api/reports/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ period }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || `Failed to run ${period} reports.`);
        return;
      }

      setMessage(
        `${period} reports completed. Sent: ${result.successCount}, Failed: ${result.failedCount}`
      );
      await loadLogs();
    } catch (err: any) {
      setMessage(err.message || `Failed to run ${period} reports.`);
    } finally {
      if (period === "daily") setRunningDaily(false);
      if (period === "weekly") setRunningWeekly(false);
    }
  }

  async function retryFailedReports() {
    setRetryingFailed(true);
    setMessage("");

    try {
      const response = await fetch("/api/reports/retry", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to retry failed reports.");
        return;
      }

      setMessage(
        `Retry completed. Retried ${result.retried || 0} failed report(s). Success: ${result.successCount || 0}, Failed: ${result.failedCount || 0}`
      );
      await loadLogs();
    } catch (err: any) {
      setMessage(err.message || "Failed to retry failed reports.");
    } finally {
      setRetryingFailed(false);
    }
  }

  async function clearOldFailedLogs() {
    const confirmed = window.confirm(
      "Delete failed logs older than 1 day? This only removes historical failed records."
    );

    if (!confirmed) return;

    setCleaningFailed(true);
    setMessage("");

    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("report_delivery_logs")
        .delete()
        .eq("status", "failed")
        .lt("created_at", cutoff);

      if (error) {
        setMessage(`Failed to clean old failed logs: ${error.message}`);
        return;
      }

      setMessage("Old failed logs removed successfully.");
      await loadLogs();
    } catch (err: any) {
      setMessage(err.message || "Failed to clean old failed logs.");
    } finally {
      setCleaningFailed(false);
    }
  }

  const summary = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === "success").length;
    const failed = logs.filter((l) => l.status === "failed").length;

    const last24hCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const last24hLogs = logs.filter((l) => {
      if (!l.created_at) return false;
      return new Date(l.created_at).getTime() >= last24hCutoff;
    });

    const last24hSuccess = last24hLogs.filter((l) => l.status === "success").length;
    const last24hFailed = last24hLogs.filter((l) => l.status === "failed").length;
    const successRate =
      total > 0 ? ((success / total) * 100).toFixed(1) : "0.0";

    const lastRunAt = logs.length > 0 ? logs[0].created_at : null;

    return {
      total,
      success,
      failed,
      last24hLogs: last24hLogs.length,
      last24hSuccess,
      last24hFailed,
      successRate,
      lastRunAt,
    };
  }, [logs]);

  const failedRecipients = useMemo(() => {
    const map = new Map<string, number>();

    for (const log of logs) {
      if (log.status !== "failed") continue;
      map.set(log.email, (map.get(log.email) || 0) + 1);
    }

    return [...map.entries()]
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [logs]);

  const recentFailures = useMemo(
    () => logs.filter((l) => l.status === "failed").slice(0, 10),
    [logs]
  );

  const recentSuccesses = useMemo(
    () => logs.filter((l) => l.status === "success").slice(0, 10),
    [logs]
  );

  return (
    <AppShell>
      <RoleGuard allowedRoles={["admin", "manager"]}>
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

        <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>Report Admin Dashboard</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Trigger report runs manually, retry failures, and monitor delivery health.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              style={buttonStyle}
              onClick={() => runReports("daily")}
              disabled={runningDaily}
            >
              {runningDaily ? "Running Daily..." : "Run Daily Reports Now"}
            </button>

            <button
              style={secondaryButtonStyle}
              onClick={() => runReports("weekly")}
              disabled={runningWeekly}
            >
              {runningWeekly ? "Running Weekly..." : "Run Weekly Reports Now"}
            </button>

            <button
              style={secondaryButtonStyle}
              onClick={retryFailedReports}
              disabled={retryingFailed}
            >
              {retryingFailed ? "Retrying Failed..." : "Retry Failed Reports"}
            </button>

            <button
              style={dangerButtonStyle}
              onClick={clearOldFailedLogs}
              disabled={cleaningFailed}
            >
              {cleaningFailed ? "Cleaning..." : "Clear Old Failed Logs"}
            </button>

            <button style={secondaryButtonStyle} onClick={loadLogs}>
              Refresh Admin Data
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Total Logs", value: summary.total },
            { label: "Success", value: summary.success },
            { label: "Failed", value: summary.failed },
            { label: "Success Rate", value: `${summary.successRate}%` },
          ].map((item, index) => (
            <div key={index} style={{ ...cardStyle, padding: 24 }}>
              <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Last 24h Runs", value: summary.last24hLogs },
            { label: "Last 24h Success", value: summary.last24hSuccess },
            { label: "Last 24h Failed", value: summary.last24hFailed },
            { label: "Last Run", value: formatDateTime(summary.lastRunAt) },
          ].map((item, index) => (
            <div key={index} style={{ ...cardStyle, padding: 24 }}>
              <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>
                {item.label}
              </div>
              <div
                style={{
                  fontSize: index === 3 ? 18 : 30,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ ...cardStyle, padding: 26 }}>
            <h2 style={sectionTitleStyle}>Top Failed Recipients</h2>
            <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
              Recipients with the most failed report deliveries.
            </p>

            {failedRecipients.length === 0 ? (
              <p style={mutedTextStyle}>No failed recipients found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Email", "Failure Count"].map((h) => (
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
                    {failedRecipients.map((item) => (
                      <tr key={item.email}>
                        <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                          {item.email}
                        </td>
                        <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", color: "#dc2626", fontWeight: 800 }}>
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: 26 }}>
            <h2 style={sectionTitleStyle}>Recent Failures</h2>
            <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
              Latest failed report deliveries for investigation.
            </p>

            {recentFailures.length === 0 ? (
              <p style={mutedTextStyle}>No recent failures found.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {recentFailures.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>
                      {log.email}
                    </div>
                    <div style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 4 }}>
                      {log.report_frequency} • {log.start_date} → {log.end_date}
                    </div>
                    <div style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 4 }}>
                      {log.error_message || "Unknown failure"}
                    </div>
                    <div style={{ color: "#991b1b", fontSize: 12 }}>
                      {formatDateTime(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>Recent Successes</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Latest successful report deliveries.
          </p>

          {recentSuccesses.length === 0 ? (
            <p style={mutedTextStyle}>No recent successes found.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentSuccesses.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#166534", marginBottom: 6 }}>
                    {log.email}
                  </div>
                  <div style={{ color: "#166534", fontSize: 14, marginBottom: 4 }}>
                    {log.report_frequency} • {log.start_date} → {log.end_date}
                  </div>
                  <div style={{ color: "#166534", fontSize: 12 }}>
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Latest Report Runs</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Recent report delivery attempts across all recipients.
          </p>

          {loading ? (
            <p style={mutedTextStyle}>Loading report admin data...</p>
          ) : logs.length === 0 ? (
            <p style={mutedTextStyle}>No report activity found yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
                <thead>
                  <tr>
                    {[
                      "Recipient",
                      "Name",
                      "Frequency",
                      "Window",
                      "Status",
                      "Error",
                      "Created",
                    ].map((h) => (
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
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                        {log.email}
                      </td>
                      <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                        {log.full_name || "-"}
                      </td>
                      <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", textTransform: "capitalize" }}>
                        {log.report_frequency}
                      </td>
                      <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                        {log.start_date} → {log.end_date}
                      </td>
                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #f1f5f9",
                          color: log.status === "success" ? "#16a34a" : "#dc2626",
                          fontWeight: 800,
                          textTransform: "capitalize",
                        }}
                      >
                        {log.status}
                      </td>
                      <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", color: "#b91c1c" }}>
                        {log.error_message || "-"}
                      </td>
                      <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  );
}