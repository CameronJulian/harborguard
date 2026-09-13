const fail = (message) => {
  console.error(`SOAK_HARNESS_REFUSED: ${message}`);
  process.exit(1);
};

const parseInteger = (name, value, min, max) => {
  const parsed = Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsed) ||
    String(parsed) !== String(value).trim() ||
    parsed < min ||
    parsed > max
  ) {
    fail(`${name} must be an integer between ${min} and ${max}`);
  }

  return parsed;
};

const baseUrl =
  process.env.HARBORGUARD_SOAK_BASE_URL ??
  process.env.HARBORGUARD_LOAD_BASE_URL ??
  "";

const accessToken =
  process.env.HARBORGUARD_SOAK_ACCESS_TOKEN ??
  process.env.HARBORGUARD_LOAD_ACCESS_TOKEN ??
  "";

const concurrency = parseInteger(
  "HARBORGUARD_SOAK_CONCURRENCY",
  process.env.HARBORGUARD_SOAK_CONCURRENCY ?? "10",
  1,
  10,
);

const durationSeconds = parseInteger(
  "HARBORGUARD_SOAK_DURATION_SECONDS",
  process.env.HARBORGUARD_SOAK_DURATION_SECONDS ?? "60",
  10,
  300,
);

const intervalMs = parseInteger(
  "HARBORGUARD_SOAK_INTERVAL_MS",
  process.env.HARBORGUARD_SOAK_INTERVAL_MS ?? "1000",
  100,
  10000,
);

const timeoutMs = parseInteger(
  "HARBORGUARD_SOAK_TIMEOUT_MS",
  process.env.HARBORGUARD_SOAK_TIMEOUT_MS ?? "10000",
  1000,
  30000,
);

if (!baseUrl) {
  fail("HARBORGUARD_SOAK_BASE_URL or HARBORGUARD_LOAD_BASE_URL is required");
}

if (!accessToken) {
  fail("HARBORGUARD_SOAK_ACCESS_TOKEN or HARBORGUARD_LOAD_ACCESS_TOKEN is required");
}

let parsedBaseUrl;

try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  fail("Base URL is not a valid URL");
}

const allowedHosts = new Set(["127.0.0.1", "localhost"]);

if (!allowedHosts.has(parsedBaseUrl.hostname)) {
  fail("Soak testing is restricted to localhost / 127.0.0.1");
}

if (parsedBaseUrl.protocol !== "http:") {
  fail("Local soak target must use http");
}

const endpoint = new URL(
  "/api/fleet/telemetry-review-performance",
  parsedBaseUrl,
);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const percentile = (values, p) => {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );

  return sorted[Math.max(0, index)];
};

const statusCounts = new Map();
const latencies = [];

let requestCount = 0;
let successCount = 0;
let failureCount = 0;
let timeoutCount = 0;

const startedAt = performance.now();
const deadline = startedAt + durationSeconds * 1000;

console.log("");
console.log("==============================================");
console.log(" HARBORGUARD LOCAL TIMED SOAK");
console.log("==============================================");
console.log(`TARGET=${endpoint.toString()}`);
console.log(`TARGET_HOST=${endpoint.hostname}`);
console.log("LOCAL_TARGET=true");
console.log(`CONCURRENCY=${concurrency}`);
console.log(`DURATION_SECONDS=${durationSeconds}`);
console.log(`INTERVAL_MS=${intervalMs}`);
console.log(`TIMEOUT_MS=${timeoutMs}`);
console.log("TOKEN_PRESENT=true");
console.log("TOKEN_PRINTED=false");

const runWorker = async () => {
  while (performance.now() < deadline) {
    const requestStarted = performance.now();
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      const elapsed = performance.now() - requestStarted;

      requestCount += 1;
      latencies.push(elapsed);

      statusCounts.set(
        response.status,
        (statusCounts.get(response.status) ?? 0) + 1,
      );

      if (response.ok) {
        successCount += 1;
      } else {
        failureCount += 1;
      }

      await response.arrayBuffer();
    } catch (error) {
      const elapsed = performance.now() - requestStarted;

      requestCount += 1;
      failureCount += 1;
      latencies.push(elapsed);

      if (error?.name === "AbortError") {
        timeoutCount += 1;
      }
    } finally {
      clearTimeout(timer);
    }

    if (performance.now() < deadline) {
      await sleep(intervalMs);
    }
  }
};

await Promise.all(
  Array.from(
    { length: concurrency },
    () => runWorker(),
  ),
);

const finishedAt = performance.now();
const totalDurationMs = finishedAt - startedAt;

const min =
  latencies.length > 0
    ? Math.min(...latencies)
    : null;

const max =
  latencies.length > 0
    ? Math.max(...latencies)
    : null;

const p50 = percentile(latencies, 50);
const p95 = percentile(latencies, 95);
const p99 = percentile(latencies, 99);

console.log("");
console.log("=== RESULT ===");
console.log(`REQUEST_COUNT=${requestCount}`);
console.log(`SUCCESS_COUNT=${successCount}`);
console.log(`FAILURE_COUNT=${failureCount}`);
console.log(`TIMEOUT_COUNT=${timeoutCount}`);

for (
  const [status, count] of
  [...statusCounts.entries()].sort(
    (a, b) => a[0] - b[0],
  )
) {
  console.log(`HTTP_STATUS_${status}_COUNT=${count}`);
}

console.log(
  `MIN_MS=${min === null ? "NA" : min.toFixed(2)}`,
);

console.log(
  `P50_MS=${p50 === null ? "NA" : p50.toFixed(2)}`,
);

console.log(
  `P95_MS=${p95 === null ? "NA" : p95.toFixed(2)}`,
);

console.log(
  `P99_MS=${p99 === null ? "NA" : p99.toFixed(2)}`,
);

console.log(
  `MAX_MS=${max === null ? "NA" : max.toFixed(2)}`,
);

console.log(
  `TOTAL_DURATION_MS=${totalDurationMs.toFixed(2)}`,
);

console.log(
  `REQUESTS_PER_SECOND=${(
    requestCount /
    (totalDurationMs / 1000)
  ).toFixed(2)}`,
);

const passed =
  requestCount > 0 &&
  failureCount === 0 &&
  timeoutCount === 0 &&
  successCount === requestCount;

console.log(
  `SOAK_BASELINE=${passed ? "PASS" : "FAIL"}`,
);

if (!passed) {
  process.exitCode = 1;
}
