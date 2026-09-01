import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const pagePath = path.join(
  process.cwd(),
  "lib",
  "hspp",
  "readHsppReservoirPairPage.ts",
);

const casPath = path.join(
  process.cwd(),
  "lib",
  "hspp",
  "compareAndSwapHsppReservoirPairScanState.ts",
);

const pageSource =
  fs.readFileSync(
    pagePath,
    "utf8",
  );

const casSource =
  fs.readFileSync(
    casPath,
    "utf8",
  );


test("pair page wrapper owns exactly one scheduling RPC", () => {
  assert.equal(
    (
      pageSource.match(
        /\.rpc\s*\(/g,
      ) ?? []
    ).length,
    1,
  );

  assert.match(
    pageSource,
    /read_hspp_reservoir_pair_page/,
  );

  assert.doesNotMatch(
    pageSource,
    /\.from\s*\(/,
  );
});


test("pair page wrapper preserves the explicit 100-pair ceiling", () => {
  assert.match(
    pageSource,
    /HSPP_RESERVOIR_PAIR_MAX_LIMIT\s*=\s*100/,
  );

  assert.match(
    pageSource,
    /limit\s*>\s*HSPP_RESERVOIR_PAIR_MAX_LIMIT/,
  );
});


test("pair page wrapper validates canonical pair ordering and scheduling version", () => {
  assert.match(
    pageSource,
    /hspp-reservoir-pair-scheduling-v1/,
  );

  assert.match(
    pageSource,
    /firstEvidenceId\s*<\s*secondEvidenceId/,
  );

  assert.match(
    pageSource,
    /proposed cursor must equal the final scheduled pair/i,
  );
});


test("pair page wrapper remains scheduling-only", () => {
  assert.doesNotMatch(
    pageSource,
    /evaluateHsppReservoirEligibility/,
  );

  assert.doesNotMatch(
    pageSource,
    /evaluateHsppAssemblyMembership/,
  );

  assert.doesNotMatch(
    pageSource,
    /persistHsppEvidenceAssembly/,
  );

  assert.doesNotMatch(
    pageSource,
    /readHsppReservoirCandidates/,
  );
});


test("pair CAS wrapper owns exactly one CAS RPC", () => {
  assert.equal(
    (
      casSource.match(
        /\.rpc\s*\(/g,
      ) ?? []
    ).length,
    1,
  );

  assert.match(
    casSource,
    /compare_and_swap_hspp_reservoir_pair_scan_state/,
  );

  assert.doesNotMatch(
    casSource,
    /\.from\s*\(/,
  );
});


test("pair CAS wrapper recognizes all optimistic concurrency states", () => {
  for (
    const status of
    [
      "CREATED",
      "STALE",
      "NO_CHANGE",
      "ADVANCED",
    ]
  ) {
    assert.match(
      casSource,
      new RegExp(
        `"${status}"`,
      ),
    );
  }
});


test("pair CAS fails closed for non-stale cursor mismatch", () => {
  assert.match(
    casSource,
    /normalizedStatus\s*!==\s*"STALE"/,
  );

  assert.match(
    casSource,
    /proposed cursor as current/i,
  );
});


test("pair scheduling wrappers do not alter B07A or membership semantics", () => {
  const combined =
    `${pageSource}\n${casSource}`;

  assert.doesNotMatch(
    combined,
    /evaluateHsppReservoirReevaluation/,
  );

  assert.doesNotMatch(
    combined,
    /evaluateHsppAssemblyMembership/,
  );

  assert.doesNotMatch(
    combined,
    /HSPP_ASSEMBLY_MAX_TIME_DELTA_MS/,
  );

  assert.doesNotMatch(
    combined,
    /HSPP_ASSEMBLY_MAX_DISTANCE_METERS/,
  );
});