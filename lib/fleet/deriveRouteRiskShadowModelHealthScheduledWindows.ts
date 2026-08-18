import "server-only";

export const ROUTE_RISK_MODEL_HEALTH_WINDOW_ENVIRONMENT_KEYS =
  {
    policyVersion:
      "ROUTE_RISK_MODEL_HEALTH_WINDOW_POLICY_VERSION",

    referenceWindowDays:
      "ROUTE_RISK_MODEL_HEALTH_REFERENCE_WINDOW_DAYS",

    recentWindowDays:
      "ROUTE_RISK_MODEL_HEALTH_RECENT_WINDOW_DAYS",
  } as const;

export type RouteRiskModelHealthWindowEnvironment =
  Readonly<
    Record<
      string,
      string | undefined
    >
  >;

export type RouteRiskShadowModelHealthScheduledWindows = {
  policyVersion: string;

  anchorUtcDayStart: Date;

  referenceStart: Date;
  referenceEnd: Date;

  recentStart: Date;
  recentEnd: Date;
};

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

function requireConfiguredValue(
  environment:
    RouteRiskModelHealthWindowEnvironment,
  key: string
): string {
  const raw =
    environment[key];

  if (
    typeof raw !== "string" ||
    !raw.trim()
  ) {
    throw new Error(
      `${key} is not configured.`
    );
  }

  return raw.trim();
}

function parsePositiveInteger(
  environment:
    RouteRiskModelHealthWindowEnvironment,
  key: string
): number {
  const raw =
    requireConfiguredValue(
      environment,
      key
    );

  const value =
    Number(raw);

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${key} must be a positive integer.`
    );
  }

  return value;
}

function requireValidDate(
  value: Date,
  fieldName: string
): Date {
  if (
    !(value instanceof Date) ||
    Number.isNaN(
      value.getTime()
    )
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a valid Date.`
    );
  }

  return value;
}

function startOfUtcDay(
  value: Date
): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    )
  );
}

/**
 * Derives deterministic completed-UTC-day windows for scheduled descriptive
 * route-risk shadow model-health observation.
 *
 * Important semantics:
 *
 * - The current partial UTC day is never included.
 * - The recent window is the configured number of immediately preceding
 *   complete UTC days.
 * - The reference window is the configured number of complete UTC days
 *   immediately preceding the recent window.
 * - Both windows are inclusive because the current model-health readers use
 *   gte/lte timestamp predicates.
 * - A one-millisecond boundary separates reference and recent windows so one
 *   evaluation cannot be counted in both windows.
 * - Every invocation during the same UTC day derives identical timestamps,
 *   preserving immutable observation retry identity.
 *
 * This helper does NOT:
 *
 * - inspect evidence counts;
 * - define statistical sufficiency;
 * - define promotion thresholds;
 * - classify drift or degradation;
 * - trigger retraining;
 * - mutate model lifecycle state;
 * - modify production Route Safety.
 */
export function deriveRouteRiskShadowModelHealthScheduledWindows({
  environment = process.env,
  now = new Date(),
}: {
  environment?:
    RouteRiskModelHealthWindowEnvironment;

  now?: Date;
} = {}): RouteRiskShadowModelHealthScheduledWindows {
  const normalizedNow =
    requireValidDate(
      now,
      "now"
    );

  const keys =
    ROUTE_RISK_MODEL_HEALTH_WINDOW_ENVIRONMENT_KEYS;

  const policyVersion =
    requireConfiguredValue(
      environment,
      keys.policyVersion
    );

  const referenceWindowDays =
    parsePositiveInteger(
      environment,
      keys.referenceWindowDays
    );

  const recentWindowDays =
    parsePositiveInteger(
      environment,
      keys.recentWindowDays
    );

  const anchorUtcDayStart =
    startOfUtcDay(
      normalizedNow
    );

  const recentEnd =
    new Date(
      anchorUtcDayStart.getTime() - 1
    );

  const recentStart =
    new Date(
      anchorUtcDayStart.getTime() -
        recentWindowDays *
          MILLISECONDS_PER_DAY
    );

  const referenceEnd =
    new Date(
      recentStart.getTime() - 1
    );

  const referenceStart =
    new Date(
      recentStart.getTime() -
        referenceWindowDays *
          MILLISECONDS_PER_DAY
    );

  return {
    policyVersion,

    anchorUtcDayStart,

    referenceStart,
    referenceEnd,

    recentStart,
    recentEnd,
  };
}
