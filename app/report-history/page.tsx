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

const primaryButtonStyle: CSSProperties = {
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

const smallDangerButtonStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
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

function statusColor(status: "success" | "failed") {
  return status === "success" ? "#16a34a" : "#dc2626";
}

export default function ReportHistoryPage() {
  const [logs, setLogs] = useState<ReportDeliveryLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | "daily" | "weekly">("all");
  const [emailFilter, setEmailFilter] = useState("");

  async function loadLogs() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("report_delivery_logs")
      .select(
        "id, subscription_id, user_id, email, full_name, report_frequency, start_date, end_date, status, error_message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setMessage(`Failed to load report history: ${error.message}`);
      setLoading(false);
      return;
    }

    setLogs((data as ReportDeliveryLogRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel("report-delivery-logs-live")
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

  async function retryFailedReports() {
    setRetrying(true);
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

      const retriedCount =
        typeof result.retried === "number"
          ? result.retried
          : Array.isArray(result.results)
            ? result.results.length
            : 0;

      setMessage(`Retry completed. Retried ${retriedCount} failed report(s).`);
      await loadLogs();
    } catch (err: any) {
      setMessage(err.message || "Failed to retry failed reports.");
    } finally {
      setRetrying(false);
    }
  }

  async function retryOne(logId: string) {
    setRetryingId(logId);
    setMessage("");

    try {
      const response = await fetch("/api/reports/retry-one", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(result.error || "Failed to retry this report.");
        return;
      }

      setMessage("Report retried successfully.");
      await loadLogs();
    } catch (err: any) {
      setMessage(err.message || "Failed to retry this report.");
    } finally {
      setRetryingId(null);
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesStatus =
        statusFilter === "all" ? true : log.status === statusFilter;

      const matchesFrequency =
        frequencyFilter === "all" ? true : log.report_frequency === frequencyFilter;

      const matchesEmail =
        emailFilter.trim() === ""
          ? true
          : log.email.toLowerCase().includes(emailFilter.trim().toLowerCase());

      return matchesStatus && matchesFrequency && matchesEmail;
    });
  }, [logs, statusFilter, frequencyFilter, emailFilter]);

  const summary = useMemo(() => {
    return {
      total: filteredLogs.length,
      success: filteredLogs.filter((log) => log.status === "success").length,
      failed: filteredLogs.filter((log) => log.status === "failed").length,
      daily: filteredLogs.filter((log) => log.report_frequency === "daily").length,
      weekly: filteredLogs.filter((log) => log.report_frequency === "weekly").length,
    };
  }, [filteredLogs]);

  const hasFailedLogs = filteredLogs.some((log) => log.status === "failed");

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
          <h2 style={sectionTitleStyle}>Reports History</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            View scheduled report delivery history, successes, and failures.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 180px 180px auto auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Search by Email</div>
              <input
                style={inputStyle}
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Status</div>
              <select
                style={inputStyle}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "success" | "failed")
                }
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Frequency</div>
              <select
                style={inputStyle}
                value={frequencyFilter}
                onChange={(e) =>
                  setFrequencyFilter(e.target.value as "all" | "daily" | "weekly")
                }
              >
                <option value="all">All</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <button onClick={loadLogs} style={primaryButtonStyle}>
              Refresh
            </button>

            <button
              onClick={retryFailedReports}
              disabled={retrying || !hasFailedLogs}
              style={{
                ...secondaryButtonStyle,
                opacity: retrying || !hasFailedLogs ? 0.6 : 1,
                cursor: retrying || !hasFailedLogs ? "not-allowed" : "pointer",
              }}
            >
              {retrying ? "Retrying..." : "Retry Failed"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Total Logs", value: summary.total },
            { label: "Success", value: summary.success },
            { label: "Failed", value: summary.failed },
            { label: "Daily", value: summary.daily },
            { label: "Weekly", value: summary.weekly },
          ].map((item, index) => (
            <div key={index} style={{ ...cardStyle, padding: 24 }}>
              <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Delivery Log</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Latest report sends across all subscribed recipients.
          </p>

          {loading ? (
            <p style={mutedTextStyle}>Loading report history...</p>
          ) : filteredLogs.length === 0 ? (
            <p style={mutedTextStyle}>No delivery logs found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1320 }}>
                <thead>
                  <tr>
                    {[
                      "Recipient",
                      "Name",
                      "Frequency",
                      "Window",
                      "Status",
                      "Error",
                      "Sent At",
                      "Actions",
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
                  {filteredLogs.map((log) => (
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
                          color: statusColor(log.status),
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

                      <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                        {log.status === "failed" ? (
                          <button
                            onClick={() => retryOne(log.id)}
                            disabled={retryingId === log.id}
                            style={{
                              ...smallDangerButtonStyle,
                              opacity: retryingId === log.id ? 0.6 : 1,
                              cursor: retryingId === log.id ? "not-allowed" : "pointer",
                            }}
                          >
                            {retryingId === log.id ? "Retrying..." : "Retry"}
                          </button>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>-</span>
                        )}
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