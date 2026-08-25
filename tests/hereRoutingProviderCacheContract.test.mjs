import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const routing = fs.readFileSync(
  "lib/routing/hereRouting.ts",
  "utf8"
);

const cache = fs.readFileSync(
  "lib/routing/hereRoutingProviderCache.ts",
  "utf8"
);

const redis = fs.readFileSync(
  "lib/redis.ts",
  "utf8"
);

test(
  "HERE routing provider response uses shared Redis cache",
  () => {
    assert.match(
      routing,
      /buildHereRoutingProviderCacheKey/
    );

    assert.match(
      routing,
      /getCachedHereRoutingProviderResponse/
    );

    assert.match(
      routing,
      /cacheHereRoutingProviderResponse/
    );
  }
);

test(
  "HERE provider request only runs after cache lookup",
  () => {
    const cacheLookupIndex =
      routing.indexOf(
        "await getCachedHereRoutingProviderResponse("
      );

    const cacheMissIndex =
      routing.indexOf(
        "if (!data)"
      );

    const fetchIndex =
      routing.indexOf(
        "const response = await fetch("
      );

    assert.ok(cacheLookupIndex >= 0);
    assert.ok(cacheMissIndex > cacheLookupIndex);
    assert.ok(fetchIndex > cacheMissIndex);
  }
);

test(
  "HERE provider response is cached only after successful request",
  () => {
    const responseCheckIndex =
      routing.indexOf(
        "if (!response.ok)"
      );

    const cacheWriteIndex =
      routing.indexOf(
        "await cacheHereRoutingProviderResponse("
      );

    assert.ok(responseCheckIndex >= 0);
    assert.ok(cacheWriteIndex > responseCheckIndex);
  }
);

test(
  "HarborGuard route risk is recalculated after provider response",
  () => {
    const cacheReadIndex =
      routing.indexOf(
        "await getCachedHereRoutingProviderResponse("
      );

    const riskIndex =
      routing.indexOf(
        "scoreRouteRisk(routePoints, roadRiskSegments)"
      );

    assert.ok(cacheReadIndex >= 0);
    assert.ok(riskIndex > cacheReadIndex);
  }
);

test(
  "HERE routing provider cache has bounded TTL",
  () => {
    assert.match(
      cache,
      /HERE_ROUTING_CACHE_TTL_SECONDS\s*=\s*90/
    );

    assert.match(
      cache,
      /ex:\s*HERE_ROUTING_CACHE_TTL_SECONDS/
    );
  }
);

test(
  "HERE routing cache key includes normalized origin and destination",
  () => {
    assert.match(
      cache,
      /number\.toFixed\(5\)/
    );

    assert.match(
      cache,
      /originLatitude/
    );

    assert.match(
      cache,
      /originLongitude/
    );

    assert.match(
      cache,
      /destinationLatitude/
    );

    assert.match(
      cache,
      /destinationLongitude/
    );
  }
);

test(
  "shared Redis client fails open when Upstash is unavailable",
  () => {
    assert.match(
      redis,
      /UPSTASH_REDIS_REST_URL/
    );

    assert.match(
      redis,
      /UPSTASH_REDIS_REST_TOKEN/
    );

    assert.match(
      redis,
      /return null/
    );
  }
);
