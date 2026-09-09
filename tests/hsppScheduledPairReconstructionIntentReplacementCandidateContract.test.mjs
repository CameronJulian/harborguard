import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const filePath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "readHsppScheduledPairReconstructionIntentReplacementCandidate.ts",
  );

const source =
  fs.readFileSync(
    filePath,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );


test(
  "Q14ag33E2B defines one isolated scheduled-pair hydration boundary",
  () => {
    assert.match(
      source,
      /export\s+async\s+function\s+readHsppScheduledPairReconstructionIntentReplacementCandidate\s*\(/,
    );

    assert.match(
      source,
      /selectionSource:\s*"SCHEDULED_PAIR"/,
    );
  },
);


test(
  "Q14ag33E2B requires discovery provenance to remain null",
  () => {
    assert.match(
      source,
      /discoveryPolicyVersion:\s*null/,
    );

    assert.match(
      source,
      /if\s*\(\s*discoveryPolicyVersion\s*!==\s*null\s*\)/,
    );

    assert.doesNotMatch(
      source,
      /HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/,
    );
  },
);


test(
  "Q14ag33E2B binds the authoritative PAIR scheduling version",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION/,
    );

    assert.match(
      source,
      /pairSchedulingVersion\s*!==[\s\S]*?HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION/,
    );
  },
);


test(
  "Q14ag33E2B binds the authoritative B06A eligibility version",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION/,
    );

    assert.match(
      source,
      /reservoirEligibilityPolicyVersion\s*!==[\s\S]*?HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION/,
    );
  },
);


test(
  "Q14ag33E2B delegates exact hydration to the E2A producer-neutral async core",
  () => {
    assert.match(
      source,
      /await\s+readHsppReconstructionIntentReplacementCandidateCore\s*\(\s*\{/,
    );

    assert.doesNotMatch(
      source,
      /readHsppEvidenceForOperationalUse\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /read_hspp_evidence_assembly_membership_classifications/,
    );
  },
);


test(
  "Q14ag33E2B does not invoke the legacy B07B reader",
  () => {
    assert.doesNotMatch(
      source,
      /readHsppReconstructionIntentReplacementCandidate\s*\(\s*\{/,
    );
  },
);


test(
  "Q14ag33E2B performs no pair discovery or pair mutation",
  () => {
    assert.doesNotMatch(
      source,
      /readHsppReservoirPairPage\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /compareAndSwapHsppReservoirPair/,
    );

    assert.doesNotMatch(
      source,
      /\.insert\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.update\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.delete\s*\(/,
    );
  },
);


test(
  "Q14ag33E2B returns canonical scheduled-pair provenance",
  () => {
    assert.match(
      source,
      /selectionSource:\s*"SCHEDULED_PAIR"/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion:\s*null/,
    );

    assert.match(
      source,
      /pairSchedulingVersion:\s*HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION/,
    );

    assert.match(
      source,
      /reservoirEligibilityPolicyVersion:\s*HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION/,
    );
  },
);