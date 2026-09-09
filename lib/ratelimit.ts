import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

export const fleetLiveRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "10 s"),
  analytics: true,
});
export const fleetPanicRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "ratelimit:fleet-panic",
});

export const routeSafetyPredictRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
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
