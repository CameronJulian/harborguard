"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DispatchRule = {
  id?: string;
  alert_type: string;
  preferred_capabilities: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type ApiResponse = {
  success?: boolean;
  rules?: DispatchRule[];
  rule?: DispatchRule;
  error?: string;
};

const ALERT_TYPES = [
  {
    value: "panic",
    label: "Panic Alert",
    description: "Immediate emergency or driver panic activation.",
  },
  {
    value: "route_safety_threat",
    label: "Route Safety Threat",
    description: "A safety or security threat detected along the active route.",
  },
  {
    value: "geofence_breach",
    label: "Geofence Breach",
    description: "A vehicle entered or left a monitored geographic boundary.",
  },
  {
    value: "driver_fatigue",
    label: "Driver Fatigue",
    description: "Possible fatigue or driver wellness concern.",
  },
  {
    value: "long_stop",
    label: "Long Stop",
    description: "A vehicle remained stationary longer than expected.",
  },
  {
    value: "offline",
    label: "Vehicle Offline",
    description: "A vehicle or tracking device stopped reporting.",
  },
  {
    value: "route_deviation",
    label: "Route Deviation",
    description: "A vehicle moved away from its assigned route.",
  },
] as const;

const CAPABILITIES = [
  { value: "general", label: "General Response" },
  { value: "security", label: "Security" },
  { value: "medical", label: "Medical" },
  { value: "maintenance", label: "Maintenance" },
  { value: "fire", label: "Fire Response" },
  { value: "police", label: "Police" },
] as const;

const DEFAULT_CAPABILITIES: Record<string, string[]> = {
  panic: ["security", "police"],
  route_safety_threat: ["security", "police"],
  geofence_breach: ["security", "police"],
  driver_fatigue: ["medical", "general"],
  long_stop: ["maintenance", "general"],
  offline: ["maintenance", "general"],
  route_deviation: ["general"],
};

function createDefaultRules(): DispatchRule[] {
  return ALERT_TYPES.map((alertType) => ({
    alert_type: alertType.value,
    preferred_capabilities:
      DEFAULT_CAPABILITIES[alertType.value] ?? ["security"],
    is_active: true,
  }));
}

function formatAlertType(value: string) {
  const configured = ALERT_TYPES.find((item) => item.value === value);

  if (configured) {
    return configured.label;
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function mergeRules(apiRules: DispatchRule[]) {
  const apiRuleMap = new Map(
    apiRules.map((rule) => [rule.alert_type, rule]),
  );

  const defaults = createDefaultRules().map(
    (defaultRule) => apiRuleMap.get(defaultRule.alert_type) ?? defaultRule,
  );

  const knownTypes = new Set(defaults.map((rule) => rule.alert_type));
  const customRules = apiRules.filter(
    (rule) => !knownTypes.has(rule.alert_type),
  );

  return [...defaults, ...customRules];
}

export default function DispatchRulesPage() {
  const [rules, setRules] = useState<DispatchRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAlertType, setSavingAlertType] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const activeRuleCount = useMemo(
    () => rules.filter((rule) => rule.is_active).length,
    [rules],
  );

  const loadRules = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/dispatch-rules", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load dispatch rules.");
      }

      setRules(mergeRules(payload.rules ?? []));
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load dispatch rules.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  function updateRule(
    alertType: string,
    changes: Partial<DispatchRule>,
  ) {
    setRules((currentRules) =>
      currentRules.map((rule) =>
        rule.alert_type === alertType
          ? {
              ...rule,
              ...changes,
            }
          : rule,
      ),
    );
  }

  function toggleCapability(alertType: string, capability: string) {
    setRules((currentRules) =>
      currentRules.map((rule) => {
        if (rule.alert_type !== alertType) {
          return rule;
        }

        const currentlySelected =
          rule.preferred_capabilities.includes(capability);

        return {
          ...rule,
          preferred_capabilities: currentlySelected
            ? rule.preferred_capabilities.filter(
                (item) => item !== capability,
              )
            : [...rule.preferred_capabilities, capability],
        };
      }),
    );
  }

  async function saveRule(rule: DispatchRule) {
    if (rule.preferred_capabilities.length === 0) {
      setMessage({
        type: "error",
        text: `${formatAlertType(
          rule.alert_type,
        )} requires at least one preferred capability.`,
      });
      return;
    }

    setSavingAlertType(rule.alert_type);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/dispatch-rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alert_type: rule.alert_type,
          preferred_capabilities: rule.preferred_capabilities,
          is_active: rule.is_active,
        }),
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save dispatch rule.");
      }

      if (payload.rule) {
        updateRule(rule.alert_type, payload.rule);
      }

      setMessage({
        type: "success",
        text: `${formatAlertType(rule.alert_type)} was saved successfully.`,
      });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save dispatch rule.",
      });
    } finally {
      setSavingAlertType(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              HarborGuard Administration
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Dispatch Rules
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              Configure which vehicle capabilities HarborGuard should prefer
              when the dispatch copilot responds to each alert type.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRules()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh rules"}
          </button>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Configured alert types</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {rules.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Active rules</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {activeRuleCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Available capabilities</p>
            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {CAPABILITIES.length}
            </p>
          </div>
        </section>

        {message ? (
          <div
            role="status"
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-800 bg-emerald-950/60 text-emerald-300"
                : "border-red-800 bg-red-950/60 text-red-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-10 text-center text-slate-400">
            Loading dispatch rules...
          </div>
        ) : (
          <div className="space-y-5">
            {rules.map((rule) => {
              const configuredAlertType = ALERT_TYPES.find(
                (item) => item.value === rule.alert_type,
              );
              const isSaving = savingAlertType === rule.alert_type;

              return (
                <section
                  key={rule.alert_type}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/10"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {formatAlertType(rule.alert_type)}
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {configuredAlertType?.description ??
                          "Custom dispatch capability rule."}
                      </p>
                    </div>

                    <label className="flex cursor-pointer items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          rule.is_active
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>

                      <input
                        type="checkbox"
                        checked={rule.is_active}
                        onChange={(event) =>
                          updateRule(rule.alert_type, {
                            is_active: event.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                      />
                    </label>
                  </div>

                  <div className="px-5 py-5">
                    <p className="mb-4 text-sm font-semibold text-slate-200">
                      Preferred vehicle capabilities
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {CAPABILITIES.map((capability) => {
                        const checked =
                          rule.preferred_capabilities.includes(
                            capability.value,
                          );

                        return (
                          <label
                            key={capability.value}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                              checked
                                ? "border-cyan-600 bg-cyan-950/40 text-cyan-100"
                                : "border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleCapability(
                                  rule.alert_type,
                                  capability.value,
                                )
                              }
                              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                            />

                            <span className="text-sm font-medium">
                              {capability.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        {rule.preferred_capabilities.length} capability
                        {rule.preferred_capabilities.length === 1 ? "" : "ies"}{" "}
                        selected
                      </p>

                      <button
                        type="button"
                        onClick={() => void saveRule(rule)}
                        disabled={
                          isSaving ||
                          savingAlertType !== null ||
                          rule.preferred_capabilities.length === 0
                        }
                        className="inline-flex min-w-32 items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        {isSaving ? "Saving..." : "Save rule"}
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}