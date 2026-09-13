import { performance } from "node:perf_hooks";

const baseUrl =
  process.env.HARBORGUARD_LOAD_BASE_URL ??
  "http://127.0.0.1:3000";

const accessToken =
  process.env.HARBORGUARD_LOAD_ACCESS_TOKEN ?? "";

const vehicleId =
  process.env.HARBORGUARD_LOAD_VEHICLE_ID ?? "";

const start =
  process.env.HARBORGUARD_LOAD_START ?? "";

const end =
  process.env.HARBORGUARD_LOAD_END ?? "";

const concurrency =
  Number.parseInt(
    process.env.HARBORGUARD_LOAD_CONCURRENCY ?? "1",
    10,
  );

const requestsPerWorker =
  Number.parseInt(
    process.env.HARBORGUARD_LOAD_REQUESTS_PER_WORKER ?? "1",
    10,
  );

const timeoutMs =
  Number.parseInt(
    process.env.HARBORGUARD_LOAD_TIMEOUT_MS ?? "10000",
    10,
  );

function fail(message) {
  console.error(`LOAD_HARNESS_REFUSED: ${message}`);
  process.exit(1);
}

function assertPositiveInteger(name, value, max) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    fail(`${name} must be an integer between 1 and ${max}`);
  }
}

let parsedBaseUrl;

try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  fail("HARBORGUARD_LOAD_BASE_URL is not a valid URL");
}

const allowedLocalHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
]);

if (!allowedLocalHosts.has(parsedBaseUrl.hostname)) {
  fail(
    `non-local target '${parsedBaseUrl.hostname}' is forbidden`,
  );
}

if (
  parsedBaseUrl.protocol !== "http:" &&
  parsedBaseUrl.protocol !== "https:"
) {
  fail("only HTTP or HTTPS local targets are allowed");
}

if (!accessToken.trim()) {
  fail("HARBORGUARD_LOAD_ACCESS_TOKEN is required");
}

assertPositiveInteger(
  "HARBORGUARD_LOAD_CONCURRENCY",
  concurrency,
  10,
);

assertPositiveInteger(
  "HARBORGUARD_LOAD_REQUESTS_PER_WORKER",
  requestsPerWorker,
  20,
);

assertPositiveInteger(
  "HARBORGUARD_LOAD_TIMEOUT_MS",
  timeoutMs,
  60000,
);

const endpoint =
  new URL(
    "/api/fleet/telemetry-review-performance",
    parsedBaseUrl,
  );

if (vehicleId.trim()) {
  endpoint.searchParams.set(
    "vehicleId",
    vehicleId.trim(),
  );
}

if (start.trim()) {
  endpoint.searchParams.set(
    "start",
    start.trim(),
  );
}

if (end.trim()) {
  endpoint.searchParams.set(
    "end",
    end.trim(),
  );
}

const totalRequests =
  concurrency * requestsPerWorker;

const results = [];

async function executeRequest(worker, requestNumber) {
  const controller = new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

  const started =
    performance.now();

  try {
    const response =
      await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

    const durationMs =
      performance.now() - started;

    await response.arrayBuffer();

    return {
      worker,
      requestNumber,
      status: response.status,
      ok: response.ok,
      durationMs,
      error: null,
    };
  } catch (error) {
    return {
      worker,
      requestNumber,
      status: 0,
      ok: false,
      durationMs: performance.now() - started,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runWorker(worker) {
  for (
    let requestNumber = 1;
    requestNumber <= requestsPerWorker;
    requestNumber += 1
  ) {
    results.push(
      await executeRequest(
        worker,
        requestNumber,
      ),
    );
  }
}

console.log("");
console.log(
  "==============================================",
);
console.log(
  " HARBORGUARD LOCAL LOAD BASELINE",
);
console.log(
  "==============================================",
);

console.log(`TARGET=${endpoint.origin}${endpoint.pathname}`);
console.log(`TARGET_HOST=${endpoint.hostname}`);
console.log(`LOCAL_TARGET=true`);
console.log(`CONCURRENCY=${concurrency}`);
console.log(
  `REQUESTS_PER_WORKER=${requestsPerWorker}`,
);
console.log(`TOTAL_REQUESTS=${totalRequests}`);
console.log(`TOKEN_PRESENT=true`);
console.log(`TOKEN_PRINTED=false`);
console.log(
  `VEHICLE_FILTER_PRESENT=${Boolean(vehicleId.trim())}`,
);
console.log(
  `START_FILTER_PRESENT=${Boolean(start.trim())}`,
);
console.log(
  `END_FILTER_PRESENT=${Boolean(end.trim())}`,
);

const runStarted =
  performance.now();

await Promise.all(
  Array.from(
    { length: concurrency },
    (_, index) => runWorker(index + 1),
  ),
);

const totalDurationMs =
  performance.now() - runStarted;

const durations =
  results
    .map((result) => result.durationMs)
    .sort((a, b) => a - b);

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }

  const index =
    Math.min(
      values.length - 1,
      Math.ceil(
        (percentileValue / 100) *
        values.length,
      ) - 1,
    );

  return values[index];
}

const successCount =
  results.filter(
    (result) => result.ok,
  ).length;

const failureCount =
  results.length - successCount;

const statusCounts =
  new Map();

for (const result of results) {
  const key = String(result.status);

  statusCounts.set(
    key,
    (statusCounts.get(key) ?? 0) + 1,
  );
}

console.log("");
console.log("=== RESULT ===");
console.log(`REQUEST_COUNT=${results.length}`);
console.log(`SUCCESS_COUNT=${successCount}`);
console.log(`FAILURE_COUNT=${failureCount}`);

for (
  const [status, count]
  of [...statusCounts.entries()].sort()
) {
  console.log(
    `HTTP_STATUS_${status}_COUNT=${count}`,
  );
}

console.log(
  `MIN_MS=${durations[0]?.toFixed(2) ?? "0.00"}`,
);

console.log(
  `P50_MS=${percentile(
    durations,
    50,
  ).toFixed(2)}`,
);

console.log(
  `P95_MS=${percentile(
    durations,
    95,
  ).toFixed(2)}`,
);

console.log(
  `MAX_MS=${durations[
    durations.length - 1
  ]?.toFixed(2) ?? "0.00"}`,
);

console.log(
  `TOTAL_DURATION_MS=${totalDurationMs.toFixed(2)}`,
);

console.log(
  `REQUESTS_PER_SECOND=${
    totalDurationMs > 0
      ? (
          (results.length * 1000) /
          totalDurationMs
        ).toFixed(2)
      : "0.00"
  }`,
);

if (failureCount > 0) {
  console.log("LOAD_BASELINE=FAIL");
  process.exitCode = 1;
} else {
  console.log("LOAD_BASELINE=PASS");
}
