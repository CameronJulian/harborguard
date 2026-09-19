import {
  Ratelimit,
} from "@upstash/ratelimit";

import {
  getRedis,
} from "@/lib/redis";

export type TomTomCostSurface =
  | "routing";

export type TomTomCostGuardResult = {
  allowed: boolean;
  configured: boolean;
  surface: TomTomCostSurface;
  limit: number;
  remaining: number | null;
  reset: number | null;
  reason:
    | "allowed"
    | "redis-unavailable"
    | "budget-exhausted"
    | "guard-error";
};

type TomTomCostSurfacePolicy = {
  environmentVariable: string;
  defaultDailyLimit: number;
};

const TOMTOM_COST_POLICIES:
  Record<
    TomTomCostSurface,
    TomTomCostSurfacePolicy
  > = {
    routing: {
      environmentVariable:
        "TOMTOM_ROUTING_DAILY_LIMIT",
      defaultDailyLimit: 100,
    },
  };

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed =
    Number.parseInt(
      String(value ?? "").trim(),
      10,
    );

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

export function getTomTomCostDailyLimit(
  surface: TomTomCostSurface,
): number {
  const policy =
    TOMTOM_COST_POLICIES[surface];

  return parsePositiveInteger(
    process.env[
      policy.environmentVariable
    ],
    policy.defaultDailyLimit,
  );
}

export function getTomTomCostGuardPrefix(
  surface: TomTomCostSurface,
): string {
  return [
    "harborguard",
    "tomtom-cost-guard",
    "v1",
    surface,
  ].join(":");
}

const limiterBySurface =
  new Map<
    TomTomCostSurface,
    {
      limit: number;
      limiter: Ratelimit;
    }
  >();

function getLimiter(
  surface: TomTomCostSurface,
): {
  limit: number;
  limiter: Ratelimit;
} | null {
  const redis =
    getRedis();

  if (!redis) {
    return null;
  }

  const dailyLimit =
    getTomTomCostDailyLimit(
      surface,
    );

  const existing =
    limiterBySurface.get(surface);

  if (
    existing &&
    existing.limit === dailyLimit
  ) {
    return existing;
  }

  const limiter =
    new Ratelimit({
      redis,
      limiter:
        Ratelimit.fixedWindow(
          dailyLimit,
          "1 d",
        ),
      analytics: true,
      prefix:
        getTomTomCostGuardPrefix(
          surface,
        ),
    });

  const entry = {
    limit: dailyLimit,
    limiter,
  };

  limiterBySurface.set(
    surface,
    entry,
  );

  return entry;
}

export async function reserveTomTomProviderRequest(
  surface: TomTomCostSurface,
): Promise<TomTomCostGuardResult> {
  const limit =
    getTomTomCostDailyLimit(
      surface,
    );

  const entry =
    getLimiter(surface);

  /*
   * Paid TomTom provider calls fail closed.
   *
   * If HarborGuard cannot prove remaining shared
   * budget through Redis, it must not spend.
   */
  if (!entry) {
    return {
      allowed: false,
      configured: false,
      surface,
      limit,
      remaining: null,
      reset: null,
      reason: "redis-unavailable",
    };
  }

  try {
    const result =
      await entry.limiter.limit(
        "global",
      );

    return {
      allowed: result.success,
      configured: true,
      surface,
      limit: result.limit,
      remaining:
        result.remaining,
      reset:
        result.reset,
      reason:
        result.success
          ? "allowed"
          : "budget-exhausted",
    };
  }
  catch (error) {
    console.warn(
      "TomTom cost guard failed:",
      {
        surface,
        error,
      },
    );

    return {
      allowed: false,
      configured: true,
      surface,
      limit,
      remaining: null,
      reset: null,
      reason: "guard-error",
    };
  }
}
