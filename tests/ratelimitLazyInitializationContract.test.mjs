import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const rateLimitSource = fs.readFileSync(
  new URL(
    "../lib/ratelimit.ts",
    import.meta.url,
  ),
  "utf8",
);

const redisSource = fs.readFileSync(
  new URL(
    "../lib/redis.ts",
    import.meta.url,
  ),
  "utf8",
);

test(
  "rate limit module does not construct Redis at module scope",
  () => {
    assert.doesNotMatch(
      rateLimitSource,
      /import\s+\{\s*Redis\s*\}\s+from\s+["']@upstash\/redis["']/,
    );

    assert.doesNotMatch(
      rateLimitSource,
      /const\s+redis\s*=\s*new\s+Redis\s*\(/,
    );

    assert.match(
      rateLimitSource,
      /import\s+\{\s*getRedis\s*\}\s+from\s+["']@\/lib\/redis["']/,
    );
  },
);

test(
  "rate limit instances are created lazily",
  () => {
    assert.match(
      rateLimitSource,
      /function\s+createLazyRatelimit\s*\(/,
    );

    assert.doesNotMatch(
      rateLimitSource,
      /export\s+const\s+\w+\s*=\s*new\s+Ratelimit\s*\(/,
    );

    assert.match(
      rateLimitSource,
      /instance\s*=\s*new\s+Ratelimit\s*\(/,
    );
  },
);

test(
  "existing exported rate limit APIs remain available",
  () => {
    for (const name of [
      "ratelimit",
      "fleetLiveRatelimit",
      "fleetPanicRatelimit",
      "routeSafetyPredictRatelimit",
      "cspReportRatelimit",
    ]) {
      assert.match(
        rateLimitSource,
        new RegExp(
          `export\\s+const\\s+${name}\\s*=`,
        ),
      );
    }
  },
);

test(
  "Redis helper rejects missing placeholder and non-https configuration",
  () => {
    assert.match(
      redisSource,
      /UPSTASH_REDIS_REST_URL/,
    );

    assert.match(
      redisSource,
      /UPSTASH_REDIS_REST_TOKEN/,
    );

    assert.match(
      redisSource,
      /\^\\\[\.\*\\\]\$/,
    );

    assert.match(
      redisSource,
      /parsedUrl\.protocol\s*!==\s*["']https:["']/,
    );
  },
);
