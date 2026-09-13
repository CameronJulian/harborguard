"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { StatusBadge } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type HsppWorkerStatus =
  | "unknown"
  | "healthy"
  | "stale";

type HsppHealthResponse = {
  success: true;
  worker: {
    key: string;
    stateRecorded: boolean;
    status: HsppWorkerStatus;
    scheduleIntervalHours: number;
    staleGraceHours: number;
    staleAfterHours: number;
    successfulAgeMs: number | null;
    lastStartedAt: string | null;
    lastSuccessfulAt: string | null;
    lastFailureAt: string | null;
    lastFailureMessage: string | null;
    metadata: Record<string, unknown> | null;
    updatedAt: string | null;
  };
};

type ApiErrorResponse = {
  error: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }

  return date.toLocaleString();
}

function formatAge(value: number | null) {
  if (value === null) return "Not available";

  const hours =
    value /
    (60 * 60 * 1000);

  if (hours < 1) {
    return `${Math.max(
      0,
      Math.round(
        value /
        (60 * 1000)
      )
    )} min`;
  }

  return `${Math.round(hours * 10) / 10} h`;
}

function statusLabel(
  status: HsppWorkerStatus
) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "stale":
      return "Stale";
    case "unknown":
      return "Unknown";
  }
}

function statusTone(
  status: HsppWorkerStatus
): "success" | "warning" | "neutral" {
  switch (status) {
    case "healthy":
      return "success";
    case "stale":
      return "warning";
    case "unknown":
      return "neutral";
  }
}

export default function OperationsHealthPage() {
  const router = useRouter();

  const [
    checkingAccess,
    setCheckingAccess,
  ] =
    useState(true);

  const [
    authorized,
    setAuthorized,
  ] =
    useState(false);

  const [
    health,
    setHealth,
  ] =
    useState<
      HsppHealthResponse["worker"] |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    void initializePage();
  }, []);

  async function initializePage() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/");
      return;
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select("role")
        .eq(
          "id",
          session.user.id
        )
        .single();

    if (
      profileError ||
      !profile?.role
    ) {
      router.replace("/dashboard");
      return;
    }

    const allowedRoles = [
      "owner",
      "admin",
    ];

    if (
      !allowedRoles.includes(
        profile.role
      )
    ) {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);
    setCheckingAccess(false);

    await loadHsppHealth();
  }

  async function loadHsppHealth() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/hspp/health",
          {
            cache: "no-store",
          }
        );

      const result =
        (await response.json()) as
          | HsppHealthResponse
          | ApiErrorResponse;

      if (!response.ok) {
        setHealth(null);

        setError(
          "error" in result
            ? result.error
            : "Failed to load HSPP recovery worker health."
        );

        return;
      }

      setHealth(
        (
          result as
            HsppHealthResponse
        ).worker
      );

      setError("");
    }
    catch (
      caughtError: unknown
    ) {
      setHealth(null);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load HSPP recovery worker health."
      );
    }
    finally {
      setLoading(false);
    }
  }

  if (checkingAccess) {
    return (
      <AppShell>
        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius: 20,
            padding: 24,
          }}
        >
          Checking operations-health access...
        </div>
      </AppShell>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <AppShell>
      <div
        style={{
          display: "grid",
          gap: 24,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div>
          <div
            style={{
              color: "#64748b",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform:
                "uppercase",
            }}
          >
            Organization Operations
          </div>

          <h1
            style={{
              color: "#0f172a",
              fontSize: 36,
              margin:
                "8px 0 6px",
            }}
          >
            Operations Health
          </h1>

          <p
            style={{
              color: "#64748b",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 760,
            }}
          >
            Operational visibility for
            organization-scoped HarborGuard
            background services.
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius: 20,
            boxShadow:
              "0 8px 24px rgba(15,23,42,0.06)",
            padding: 24,
          }}
        >
          <div
            style={{
              alignItems: "flex-start",
              display: "flex",
              gap: 16,
              justifyContent:
                "space-between",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  color: "#0f172a",
                  fontSize: 22,
                  margin: 0,
                }}
              >
                HSPP Recovery Worker
              </h2>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.5,
                  margin:
                    "6px 0 0",
                }}
              >
                Daily recovery lifecycle
                worker for the current
                organization.
              </p>
            </div>

            {health ? (
              <StatusBadge
                label={
                  statusLabel(
                    health.status
                  )
                }
                tone={
                  statusTone(
                    health.status
                  )
                }
              />
            ) : null}
          </div>

          {error ? (
            <div
              style={{
                background:
                  "#fef2f2",
                border:
                  "1px solid #fecaca",
                borderRadius: 12,
                color: "#b91c1c",
                marginTop: 20,
                padding: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          {loading ? (
            <div
              style={{
                color: "#64748b",
                marginTop: 20,
              }}
            >
              Loading HSPP recovery
              worker health...
            </div>
          ) : null}

          {!loading &&
          !error &&
          health ? (
            <>
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(220px,1fr))",
                  marginTop: 24,
                }}
              >
                <div>
                  <strong>
                    State recorded
                  </strong>
                  <div>
                    {health.stateRecorded
                      ? "Yes"
                      : "No"}
                  </div>
                </div>

                <div>
                  <strong>
                    Last successful
                  </strong>
                  <div>
                    {formatDateTime(
                      health.lastSuccessfulAt
                    )}
                  </div>
                </div>

                <div>
                  <strong>
                    Successful age
                  </strong>
                  <div>
                    {formatAge(
                      health.successfulAgeMs
                    )}
                  </div>
                </div>

                <div>
                  <strong>
                    Stale threshold
                  </strong>
                  <div>
                    {
                      health.staleAfterHours
                    }{" "}
                    hours
                  </div>
                </div>

                <div>
                  <strong>
                    Schedule interval
                  </strong>
                  <div>
                    {
                      health.scheduleIntervalHours
                    }{" "}
                    hours
                  </div>
                </div>

                <div>
                  <strong>
                    Grace period
                  </strong>
                  <div>
                    {
                      health.staleGraceHours
                    }{" "}
                    hours
                  </div>
                </div>

                <div>
                  <strong>
                    Last started
                  </strong>
                  <div>
                    {formatDateTime(
                      health.lastStartedAt
                    )}
                  </div>
                </div>

                <div>
                  <strong>
                    Last failure
                  </strong>
                  <div>
                    {formatDateTime(
                      health.lastFailureAt
                    )}
                  </div>
                </div>
              </div>

              {health.lastFailureMessage ? (
                <div
                  style={{
                    background:
                      "#fff7ed",
                    border:
                      "1px solid #fed7aa",
                    borderRadius: 12,
                    color: "#9a3412",
                    marginTop: 20,
                    padding: 14,
                  }}
                >
                  <strong>
                    Last failure message:
                  </strong>{" "}
                  {
                    health.lastFailureMessage
                  }
                </div>
              ) : null}

              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginTop: 20,
                }}
              >
                Worker status is based on
                the last successful
                execution. The current
                policy marks the worker
                stale after{" "}
                {
                  health.staleAfterHours
                }{" "}
                hours.
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void loadHsppHealth();
            }}
            disabled={loading}
            style={{
              background:
                loading
                  ? "#e2e8f0"
                  : "#0f172a",
              border: "none",
              borderRadius: 10,
              color:
                loading
                  ? "#64748b"
                  : "#ffffff",
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 700,
              marginTop: 22,
              padding:
                "10px 14px",
            }}
          >
            {loading
              ? "Refreshing..."
              : "Refresh health"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
