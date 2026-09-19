import {
  Ratelimit,
} from "@upstash/ratelimit";

import {
  getRedis,
} from "@/lib/redis";

export type HereCostSurface =
  | "traffic-flow"
  | "traffic-incidents"
  | "destination-search"
  | "routing"
  | "speed-limit";

export type HereCostGuardResult = {
  allowed: boolean;
  configured: boolean;
  surface: HereCostSurface;
  limit: number;
  remaining: number | null;
  reset: number | null;
  reason:
    | "allowed"
    | "redis-unavailable"
    | "budget-exhausted"
    | "guard-error";
};

type HereCostSurfacePolicy = {
  environmentVariable: string;
  defaultDailyLimit: number;
};

const HERE_COST_POLICIES:
  Record<
    HereCostSurface,
    HereCostSurfacePolicy
  > = {
    "traffic-flow": {
      environmentVariable:
        "HERE_TRAFFIC_FLOW_DAILY_LIMIT",
      defaultDailyLimit: 100,
    },

    "traffic-incidents": {
      environmentVariable:
        "HERE_TRAFFIC_INCIDENTS_DAILY_LIMIT",
      defaultDailyLimit: 25,
    },

    "destination-search": {
      environmentVariable:
        "HERE_DESTINATION_SEARCH_DAILY_LIMIT",
      defaultDailyLimit: 250,
    },

    routing: {
      environmentVariable:
        "HERE_ROUTING_DAILY_LIMIT",
      defaultDailyLimit: 250,
    },

    "speed-limit": {
      environmentVariable:
        "HERE_SPEED_LIMIT_DAILY_LIMIT",
      defaultDailyLimit: 250,
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

export function getHereCostDailyLimit(
  surface: HereCostSurface,
): number {
  const policy =
    HERE_COST_POLICIES[surface];

  return parsePositiveInteger(
    process.env[
      policy.environmentVariable
    ],
    policy.defaultDailyLimit,
  );
}

export function getHereCostGuardPrefix(
  surface: HereCostSurface,
): string {
  return [
    "harborguard",
    "here-cost-guard",
    "v1",
    surface,
  ].join(":");
}

const limiterBySurface =
  new Map<
    HereCostSurface,
    {
      limit: number;
      limiter: Ratelimit;
    }
  >();

function getLimiter(
  surface: HereCostSurface,
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
    getHereCostDailyLimit(surface);

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
        getHereCostGuardPrefix(
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

export async function reserveHereProviderRequest(
  surface: HereCostSurface,
): Promise<HereCostGuardResult> {
  const limit =
    getHereCostDailyLimit(surface);

  const entry =
    getLimiter(surface);

  /*
   * Cost safety is deliberately fail-closed.
   *
   * If HarborGuard cannot reach the shared Redis
   * counter, it cannot prove that the configured
   * HERE budget still has capacity.
   *
   * Paid provider calls must therefore not proceed.
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
      "HERE cost guard failed:",
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
