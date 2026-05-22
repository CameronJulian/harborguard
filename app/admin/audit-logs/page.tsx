"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import PermissionGate from "@/components/auth/PermissionGate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuditLog = {
  id: string;
  action: string;
  target: string | null;
  metadata: any;
  created_at: string;
  organization_id: string;
  user_id: string | null;
};

const PAGE_SIZE = 25;

function getSeverity(action: string) {
  if (action.includes("panic")) return "critical";
  if (action.includes("incident")) return "high";
  if (action.includes("billing")) return "medium";
  if (action.includes("report")) return "low";
  return "info";
}

function severityClass(severity: string) {
  if (severity === "critical") return "bg-red-600 text-white";
  if (severity === "high") return "bg-orange-500 text-white";
  if (severity === "medium") return "bg-yellow-400 text-black";
  if (severity === "low") return "bg-blue-500 text-white";
  return "bg-slate-700 text-white";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);

    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  }

  const actions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action))).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase().trim();

    return logs.filter((log) => {
      const matchesAction =
        !actionFilter || log.action === actionFilter;

      const searchable = JSON.stringify(log).toLowerCase();

      const matchesSearch =
        !term || searchable.includes(term);

      return matchesAction && matchesSearch;
    });
  }, [logs, search, actionFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / PAGE_SIZE)
  );

  const paginatedLogs = filteredLogs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function exportCsv() {
    const rows = filteredLogs.map((log) => ({
      created_at: log.created_at,
      action: log.action,
      severity: getSeverity(log.action),
      organization_id: log.organization_id,
      user_id: log.user_id || "System",
      target: log.target || "",
      metadata: JSON.stringify(log.metadata || {}),
    }));

    const csv = [
      Object.keys(rows[0] || {}).join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "harborguard-audit-logs.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <PermissionGate
      permission="organization:manage"
      fallback={
        <div className="min-h-screen bg-slate-100 p-8">
          <div className="rounded-2xl bg-white p-10 shadow-sm">
            Only organization owners can view audit logs.
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-slate-900">
                Audit Logs
              </h1>

              <p className="mt-2 text-slate-600">
                Enterprise security and operational audit trail.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadAuditLogs}
                className="rounded-xl bg-black px-4 py-3 font-bold text-white"
              >
                Refresh
              </button>

              <button
                onClick={exportCsv}
                className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm lg:grid-cols-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search logs..."
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 shadow-sm">
              Loading audit logs...
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 shadow-sm">
              No audit logs found.
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedLogs.map((log) => {
                const severity = getSeverity(log.action);

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-black px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                            {log.action}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${severityClass(
                              severity
                            )}`}
                          >
                            {severity}
                          </span>

                          <span className="text-sm text-slate-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-700">
                          <p>
                            <span className="font-semibold">
                              Organization:
                            </span>{" "}
                            {log.organization_id}
                          </p>

                          <p>
                            <span className="font-semibold">User:</span>{" "}
                            {log.user_id || "System"}
                          </p>

                          <p>
                            <span className="font-semibold">Target:</span>{" "}
                            {log.target || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="mb-2 text-sm font-semibold text-slate-700">
                        Metadata
                      </div>

                      <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-green-400">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-40"
            >
              Previous
            </button>

            <div className="text-sm font-semibold text-slate-700">
              Page {page} of {totalPages}
            </div>

            <button
              disabled={page >= totalPages}
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}