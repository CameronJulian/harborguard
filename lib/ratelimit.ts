import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

type LazyRatelimitConfig =
  Omit<
    ConstructorParameters<typeof Ratelimit>[0],
    "redis"
  >;

type RatelimitLike = {
  limit: Ratelimit["limit"];
};

function createLazyRatelimit(
  config: LazyRatelimitConfig,
): RatelimitLike {
  let instance: Ratelimit | null = null;

  function getInstance(): Ratelimit {
    if (instance) {
      return instance;
    }

    const redis = getRedis();

    if (!redis) {
      throw new Error(
        "Upstash Redis is not configured.",
      );
    }

    instance = new Ratelimit({
      ...config,
      redis,
    });

    return instance;
  }

  return {
    limit(...args) {
      return getInstance().limit(...args);
    },
  };
}

export const ratelimit =
  createLazyRatelimit({
    limiter:
      Ratelimit.slidingWindow(
        10,
        "10 s",
      ),
    analytics: true,
  });

export const fleetLiveRatelimit =
  createLazyRatelimit({
    limiter:
      Ratelimit.slidingWindow(
        120,
        "10 s",
      ),
    analytics: true,
  });

export const fleetPanicRatelimit =
  createLazyRatelimit({
    limiter:
      Ratelimit.slidingWindow(
        10,
        "60 s",
      ),
    analytics: true,
    prefix: "ratelimit:fleet-panic",
  });

export const routeSafetyPredictRatelimit =
  createLazyRatelimit({
    limiter:
      Ratelimit.slidingWindow(
        10,
        "10 s",
      ),
    analytics: true,
  });
class LocalFleetPanicRatelimit {
  private readonly requests = new Map<string, number[]>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60_000;

  async limit(identifier: string) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const prior = this.requests.get(identifier) ?? [];
    const active = prior.filter((timestamp) => timestamp > windowStart);
    const success = active.length < this.maxRequests;

    if (success) {
      active.push(now);
    }

    this.requests.set(identifier, active);

    const oldest = active[0] ?? now;
    const reset = oldest + this.windowMs;

    return {
      success,
      limit: this.maxRequests,
      remaining: Math.max(
        0,
        this.maxRequests - active.length
      ),
      reset,
    };
  }
}

export const localFleetPanicRatelimit =
  new LocalFleetPanicRatelimit();

export function shouldUseLocalFleetPanicRatelimit(): boolean {
  return (
    process.env.HARBORGUARD_LOCAL_LOAD_TEST === "true"
  );
}

class LocalRouteSafetyPredictRatelimit {
  private readonly requests =
    new Map<string, number[]>();

  private readonly maxRequests = 10;

  private readonly windowMs = 10_000;

  async limit(
    key: string
  ): Promise<LocalRateLimitResult> {
    const now =
      Date.now();

    const cutoff =
      now - this.windowMs;

    const recent =
      (
        this.requests.get(key) ?? []
      ).filter(
        (timestamp) =>
          timestamp > cutoff
      );

    const success =
      recent.length <
      this.maxRequests;

    if (success) {
      recent.push(now);
    }

    if (recent.length > 0) {
      this.requests.set(
        key,
        recent
      );
    }
    else {
      this.requests.delete(key);
    }

    const reset =
      recent.length > 0
        ? recent[0] +
          this.windowMs
        : now +
          this.windowMs;

    return {
      success,
      limit:
        this.maxRequests,
      remaining:
        Math.max(
          0,
          this.maxRequests -
            recent.length
        ),
      reset,
      pending:
        Promise.resolve(),
    };
  }
}

export const localRouteSafetyPredictRatelimit =
  new LocalRouteSafetyPredictRatelimit();

export function shouldUseLocalRouteSafetyPredictRatelimit(): boolean {
  if (
    process.env
      .HARBORGUARD_LOCAL_LOAD_TEST !==
    "true"
  ) {
    return false;
  }

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    return false;
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return false;
  }

  try {
    const hostname =
      new URL(
        supabaseUrl
      ).hostname;

    return (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "::1"
    );
  }
  catch {
    return false;
  }
}

type LocalRateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<void>;
};

class LocalFleetLiveRatelimit {
  private readonly requests =
    new Map<string, number[]>();

  private readonly maxRequests = 120;

  private readonly windowMs = 10_000;

  async limit(
    key: string
  ): Promise<LocalRateLimitResult> {
    const now =
      Date.now();

    const cutoff =
      now - this.windowMs;

    const recent =
      (
        this.requests.get(key) ?? []
      ).filter(
        (timestamp) =>
          timestamp > cutoff
      );

    const success =
      recent.length <
      this.maxRequests;

    if (success) {
      recent.push(now);
    }

    if (recent.length > 0) {
      this.requests.set(
        key,
        recent
      );
    }
    else {
      this.requests.delete(key);
    }

    const reset =
      recent.length > 0
        ? recent[0] +
          this.windowMs
        : now +
          this.windowMs;

    return {
      success,
      limit:
        this.maxRequests,
      remaining:
        Math.max(
          0,
          this.maxRequests -
            recent.length
        ),
      reset,
      pending:
        Promise.resolve(),
    };
  }
}

export const localFleetLiveRatelimit =
  new LocalFleetLiveRatelimit();

export function shouldUseLocalFleetLiveRatelimit(): boolean {
  if (
    process.env
      .HARBORGUARD_LOCAL_LOAD_TEST !==
    "true"
  ) {
    return false;
  }

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    return false;
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return false;
  }

  try {
    const hostname =
      new URL(
        supabaseUrl
      ).hostname;

    return (
      hostname ===
        "127.0.0.1" ||
      hostname ===
        "localhost" ||
      hostname ===
        "::1"
    );
  }
  catch {
    return false;
  }
}
export const cspReportRatelimit =
  createLazyRatelimit({
    limiter:
      Ratelimit.slidingWindow(
        30,
        "60 s",
      ),
    analytics: true,
    prefix: "ratelimit:csp-report",
  });
