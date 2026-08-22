import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppAssemblyRecoveryCycle.ts",
  "utf8"
);

const executable = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

test("Q13f exposes one bounded higher-level recovery cycle", () => {
  assert.match(
    source,
    /export\s+async\s+function\s+runHsppAssemblyRecoveryCycle\s*\(/
  );

  assert.match(
    source,
    /HSPP_ASSEMBLY_RECOVERY_CYCLE_RUNNER_VERSION/
  );
});

test("Q13f composes the existing Q13b Q13c and Q13d7 boundaries", () => {
  assert.match(
    source,
    /readHsppAssemblyRecoveryWorkItems/
  );

  assert.match(
    source,
    /runHsppOpenAssemblyRecoverySealing/
  );

  assert.match(
    source,
    /runHsppSealedAssemblyRecoveryAssessment/
  );
});

test("Q13f performs exactly two recovery discoveries", () => {
  const calls =
    executable.match(
      /\breadHsppAssemblyRecoveryWorkItems\s*\(/g
    ) || [];

  assert.equal(
    calls.length,
    2
  );
});

test("Q13f snapshots both lifecycle states before the first recovery mutation", () => {
  const sealedDiscovery =
    executable.indexOf(
      'assemblyState:\n        "SEALED"'
    );

  const openDiscovery =
    executable.indexOf(
      'assemblyState:\n        "OPEN"'
    );

  const firstOpenMutation =
    executable.indexOf(
      "await runHsppOpenAssemblyRecoverySealing({"
    );

  assert.ok(
    sealedDiscovery >= 0
  );

  assert.ok(
    openDiscovery >= 0
  );

  assert.ok(
    firstOpenMutation >= 0
  );

  assert.ok(
    sealedDiscovery <
      openDiscovery
  );

  assert.ok(
    openDiscovery <
      firstOpenMutation
  );
});

test("Q13f processes only the pre-discovered SEALED snapshot after OPEN continuation", () => {
  const openMutation =
    executable.indexOf(
      "await runHsppOpenAssemblyRecoverySealing({"
    );

  const sealedAssessment =
    executable.indexOf(
      "await runHsppSealedAssemblyRecoveryAssessment({"
    );

  assert.ok(
    openMutation >= 0
  );

  assert.ok(
    sealedAssessment >= 0
  );

  assert.ok(
    openMutation <
      sealedAssessment
  );
});

test("Q13f isolates OPEN work-item failures as explicit results", () => {
  const openLoop =
    executable.indexOf(
      "of openDiscovery.workItems"
    );

  const sealedLoop =
    executable.indexOf(
      "of sealedDiscovery.workItems"
    );

  const segment =
    executable.slice(
      openLoop,
      sealedLoop
    );

  assert.match(
    segment,
    /\btry\s*\{/
  );

  assert.match(
    segment,
    /\bcatch\s*\(error\)/
  );

  assert.match(
    segment,
    /branch:\s*"OPEN_SEALED"/
  );

  assert.match(
    segment,
    /branch:\s*"OPEN_ERROR"/
  );
});

test("Q13f isolates SEALED work-item failures as explicit results", () => {
  const sealedLoop =
    executable.indexOf(
      "of sealedDiscovery.workItems"
    );

  const segment =
    executable.slice(
      sealedLoop
    );

  assert.match(
    segment,
    /\btry\s*\{/
  );

  assert.match(
    segment,
    /\bcatch\s*\(error\)/
  );

  assert.match(
    segment,
    /branch:\s*"SEALED_ASSESSMENT"/
  );

  assert.match(
    segment,
    /branch:\s*"SEALED_ERROR"/
  );
});

test("Q13f keeps assessment time and lease-token generation caller-owned", () => {
  assert.match(
    source,
    /createProposedAssessedAt\s*:\s*HsppAssemblyRecoveryAttemptValueFactory/
  );

  assert.match(
    source,
    /createLeaseToken\s*:\s*HsppAssemblyRecoveryAttemptValueFactory/
  );

  assert.match(
    source,
    /leaseSeconds\s*:\s*number/
  );

  assert.doesNotMatch(
    executable,
    /\brandomUUID\b/
  );

  assert.doesNotMatch(
    executable,
    /\bDate\.now\s*\(/
  );

  assert.doesNotMatch(
    executable,
    /\bnew\s+Date\s*\(/
  );

  assert.doesNotMatch(
    executable,
    /from\s+["'](?:node:)?crypto["']/
  );
});

test("Q13f does not bypass established database boundaries", () => {
  assert.doesNotMatch(
    executable,
    /\.from\s*\(/
  );

  assert.doesNotMatch(
    executable,
    /\.rpc\s*\(/
  );
});

test("Q13f creates no production execution wiring", () => {
  assert.doesNotMatch(
    executable,
    /NextResponse/
  );

  assert.doesNotMatch(
    executable,
    /CRON_SECRET/
  );

  assert.doesNotMatch(
    executable,
    /vercel/
  );
});