"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (!error && data) {
      setLogs(data);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900">
            Audit Logs
          </h1>

          <p className="mt-2 text-slate-600">
            Enterprise security and operational audit trail.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 shadow-sm">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 shadow-sm">
            No audit logs found.
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-black px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                        {log.action}
                      </span>

                      <span className="text-sm text-slate-500">
                        {new Date(
                          log.created_at
                        ).toLocaleString()}
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
                        <span className="font-semibold">
                          User:
                        </span>{" "}
                        {log.user_id || "System"}
                      </p>

                      <p>
                        <span className="font-semibold">
                          Target:
                        </span>{" "}
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
                    {JSON.stringify(
                      log.metadata,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}