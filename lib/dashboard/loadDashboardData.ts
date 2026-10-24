export type DashboardReadOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type DashboardFleetVehicle = {
  id: string;
  is_active?: boolean | null;
  registration_number?: string | null;
  registrationNumber?: string | null;
  nickname?: string | null;
  speed_kmh?: number | string | null;
  speedKmh?: number | string | null;
  maintenanceProfile?: { maintenanceRisk?: string | null } | null;
};

export type DashboardFleetTrip = { status?: string | null };

export type DashboardFleetAlert = {
  id: string;
  is_resolved?: boolean | null;
  severity?: string | null;
  alert_type?: string | null;
  created_at?: string | null;
  vehicle?: Pick<DashboardFleetVehicle, "registration_number" | "nickname"> | null;
};

// The deadline includes session lookup, the HTTP request and reading its body.
// Aborting fetch alone cannot settle an SDK session lookup that is still pending.
export async function readDashboardWithDeadline<T>(
  read: (signal: AbortSignal) => PromiseLike<T>,
  { signal: parentSignal, timeoutMs = 20_000 }: DashboardReadOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const cancelled = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort", () => reject(controller.signal.reason), { once: true }
    );
  });
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  if (parentSignal?.aborted) abortFromParent();

  const timer = setTimeout(() => {
    controller.abort(new DOMException("Dashboard request timed out.", "TimeoutError"));
  }, timeoutMs);

  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return read(controller.signal);
      }),
      cancelled,
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", abortFromParent);
    controller.abort();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function loadDashboardFleet(
  fetcher: (input: string, init: RequestInit) => Promise<Response>,
  options: DashboardReadOptions = {}
) {
  const [vehicleResult, tripResult, alertResult] = await readDashboardWithDeadline(
    signal => Promise.all([
      "/api/fleet/vehicles", "/api/fleet/trips", "/api/fleet/alerts",
    ].map(async path => {
      const response = await fetcher(path, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Fleet data could not be loaded.");
      return await response.json() as unknown;
    })),
    options
  );

  if (
    !isRecord(vehicleResult) || !Array.isArray(vehicleResult.vehicles) ||
    !isRecord(tripResult) || !Array.isArray(tripResult.trips) ||
    !isRecord(alertResult) || !Array.isArray(alertResult.alerts)
  ) {
    throw new Error("Invalid fleet API response structure.");
  }

  const subscription = isRecord(vehicleResult.subscription) ? vehicleResult.subscription : null;
  return {
    vehicles: vehicleResult.vehicles as DashboardFleetVehicle[],
    trips: tripResult.trips as DashboardFleetTrip[],
    alerts: (alertResult.alerts as DashboardFleetAlert[]).filter(alert => !alert.is_resolved),
    trialEndsAt: typeof subscription?.trial_ends_at === "string" ? subscription.trial_ends_at : null,
  };
}
