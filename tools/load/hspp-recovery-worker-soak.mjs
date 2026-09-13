import process from "node:process";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_ITERATIONS = 5;
const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 30000;

function fail(message) {
  console.error(`HSPP_WORKER_SOAK_REFUSED: ${message}`);
  process.exit(1);
}

function parseInteger(name, value, min, max) {
  const parsed = Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    fail(
      `${name} must be an integer between ${min} and ${max}`,
    );
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sorted, percentileValue) {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.ceil(
      (percentileValue / 100) * sorted.length,
    ) - 1,
  );

  return sorted[Math.max(index, 0)];
}

const baseUrl =
  process.env.HARBORGUARD_HSPP_WORKER_BASE_URL ??
  DEFAULT_BASE_URL;

let parsedBaseUrl;

try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  fail("HARBORGUARD_HSPP_WORKER_BASE_URL is not a valid URL");
}

const localHost =
  parsedBaseUrl.hostname === "127.0.0.1" ||
  parsedBaseUrl.hostname === "localhost" ||
  parsedBaseUrl.hostname === "::1";

if (!localHost) {
  fail("target must be localhost");
}

if (
  parsedBaseUrl.protocol !== "http:" &&
  parsedBaseUrl.protocol !== "https:"
) {
  fail("target protocol must be HTTP or HTTPS");
}

const cronSecret =
  process.env.HARBORGUARD_HSPP_WORKER_CRON_SECRET;

if (
  typeof cronSecret !== "string" ||
  cronSecret.trim().length === 0
) {
  fail("HARBORGUARD_HSPP_WORKER_CRON_SECRET is required");
}

const iterations = parseInteger(
  "HARBORGUARD_HSPP_WORKER_ITERATIONS",
  process.env.HARBORGUARD_HSPP_WORKER_ITERATIONS ??
    String(DEFAULT_ITERATIONS),
  1,
  20,
);

const intervalMs = parseInteger(
  "HARBORGUARD_HSPP_WORKER_INTERVAL_MS",
  process.env.HARBORGUARD_HSPP_WORKER_INTERVAL_MS ??
    String(DEFAULT_INTERVAL_MS),
  1000,
  60000,
);

const timeoutMs = parseInteger(
  "HARBORGUARD_HSPP_WORKER_TIMEOUT_MS",
  process.env.HARBORGUARD_HSPP_WORKER_TIMEOUT_MS ??
    String(DEFAULT_TIMEOUT_MS),
  1000,
  120000,
);

const endpoint =
  new URL(
    "/api/hspp/cron/recovery",
    parsedBaseUrl,
  ).toString();

console.log("");
console.log("==============================================");
console.log(" HARBORGUARD LOCAL HSPP RECOVERY WORKER SOAK");
console.log("==============================================");
console.log(`TARGET=${endpoint}`);
console.log(`TARGET_HOST=${parsedBaseUrl.hostname}`);
console.log(`LOCAL_TARGET=${localHost}`);
console.log(`ITERATIONS=${iterations}`);
console.log(`INTERVAL_MS=${intervalMs}`);
console.log(`TIMEOUT_MS=${timeoutMs}`);
console.log("CRON_SECRET_PRESENT=true");
console.log("CRON_SECRET_PRINTED=false");

const durations = [];
const statusCounts = new Map();

let successCount = 0;
let failureCount = 0;
let timeoutCount = 0;
let bodySuccessTrueCount = 0;
let bodySuccessFalseCount = 0;
let bodySuccessMissingCount = 0;

const startedAt = performance.now();

for (
  let iteration = 1;
  iteration <= iterations;
  iteration += 1
) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  const requestStart = performance.now();

  let status = 0;
  let responseBody = null;
  let requestSucceeded = false;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    status = response.status;

    statusCounts.set(
      status,
      (statusCounts.get(status) ?? 0) + 1,
    );

    const text = await response.text();

    if (text.length > 0) {
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = null;
      }
    }

    const bodySuccess =
      responseBody &&
      typeof responseBody === "object" &&
      Object.prototype.hasOwnProperty.call(
        responseBody,
        "success",
      )
        ? responseBody.success
        : undefined;

    if (bodySuccess === true) {
      bodySuccessTrueCount += 1;
    } else if (bodySuccess === false) {
      bodySuccessFalseCount += 1;
    } else {
      bodySuccessMissingCount += 1;
    }

    requestSucceeded =
      response.ok &&
      bodySuccess !== false;

    if (requestSucceeded) {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  } catch (error) {
    failureCount += 1;

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      timeoutCount += 1;
    }
  } finally {
    clearTimeout(timeout);
  }

  const duration =
    performance.now() - requestStart;

  durations.push(duration);

  console.log(
    [
      `ITERATION=${iteration}`,
      `HTTP_STATUS=${status}`,
      `SUCCESS=${requestSucceeded}`,
      `DURATION_MS=${duration.toFixed(2)}`,
    ].join(" "),
  );

  if (iteration < iterations) {
    await sleep(intervalMs);
  }
}

const totalDuration =
  performance.now() - startedAt;

const sortedDurations =
  [...durations].sort((a, b) => a - b);

const min =
  sortedDurations.length > 0
    ? sortedDurations[0]
    : 0;

const max =
  sortedDurations.length > 0
    ? sortedDurations[
        sortedDurations.length - 1
      ]
    : 0;

const p50 = percentile(sortedDurations, 50);
const p95 = percentile(sortedDurations, 95);
const p99 = percentile(sortedDurations, 99);

console.log("");
console.log("=== RESULT ===");
console.log(`REQUEST_COUNT=${durations.length}`);
console.log(`SUCCESS_COUNT=${successCount}`);
console.log(`FAILURE_COUNT=${failureCount}`);
console.log(`TIMEOUT_COUNT=${timeoutCount}`);

for (
  const [status, count] of
  [...statusCounts.entries()].sort(
    ([a], [b]) => a - b,
  )
) {
  console.log(
    `HTTP_STATUS_${status}_COUNT=${count}`,
  );
}

console.log(
  `BODY_SUCCESS_TRUE_COUNT=${bodySuccessTrueCount}`,
);

console.log(
  `BODY_SUCCESS_FALSE_COUNT=${bodySuccessFalseCount}`,
);

console.log(
  `BODY_SUCCESS_MISSING_COUNT=${bodySuccessMissingCount}`,
);

console.log(`MIN_MS=${min.toFixed(2)}`);
console.log(`P50_MS=${p50.toFixed(2)}`);
console.log(`P95_MS=${p95.toFixed(2)}`);
console.log(`P99_MS=${p99.toFixed(2)}`);
console.log(`MAX_MS=${max.toFixed(2)}`);

console.log(
  `TOTAL_DURATION_MS=${totalDuration.toFixed(2)}`,
);

const pass =
  durations.length === iterations &&
  successCount === iterations &&
  failureCount === 0 &&
  timeoutCount === 0 &&
  bodySuccessFalseCount === 0;

console.log(
  `HSPP_WORKER_SOAK=${pass ? "PASS" : "FAIL"}`,
);

console.log("CRON_SECRET_PRINTED=false");

if (!pass) {
  process.exitCode = 1;
}
