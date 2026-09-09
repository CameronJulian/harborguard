import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const filePath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "readHsppReconstructionIntentReplacementCandidate.ts",
  );

const source =
  fs.readFileSync(
    filePath,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );


function between(
  startToken,
  endToken,
) {
  const start =
    source.indexOf(
      startToken,
    );

  assert.notEqual(
    start,
    -1,
    `missing start token: ${startToken}`,
  );

  const end =
    source.indexOf(
      endToken,
      start + startToken.length,
    );

  assert.notEqual(
    end,
    -1,
    `missing end token: ${endToken}`,
  );

  return source.slice(
    start,
    end,
  );
}


test(
  "Q14ag33E1 imports the authoritative B06A policy version",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION[\s\S]*?evaluateHsppReservoirEligibility/,
    );
  },
);


test(
  "Q14ag33E1 exposes one producer-neutral snapshot validator",
  () => {
    assert.match(
      source,
      /export\s+function\s+validateHsppReconstructionIntentReplacementCandidateCoreSnapshot\s*\(/,
    );

    assert.match(
      source,
      /reservoirEligibilityPolicyVersion:\s*string/,
    );
  },
);


test(
  "Q14ag33E1 core contains no B07B discovery authority",
  () => {
    const core =
      between(
        "export function validateHsppReconstructionIntentReplacementCandidateCoreSnapshot({",
        "export function validateHsppReconstructionIntentReplacementCandidateSnapshot({",
      );

    assert.doesNotMatch(
      core,
      /discoveryPolicyVersion/,
    );

    assert.doesNotMatch(
      core,
      /HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/,
    );
  },
);


test(
  "Q14ag33E1 core preserves NEVER_ASSEMBLED protection",
  () => {
    const core =
      between(
        "export function validateHsppReconstructionIntentReplacementCandidateCoreSnapshot({",
        "export function validateHsppReconstructionIntentReplacementCandidateSnapshot({",
      );

    assert.match(
      core,
      /expectedMembershipClassification\s*!==[\s\S]*?"NEVER_ASSEMBLED"/,
    );

    assert.match(
      core,
      /Durable reconstruction replacement must remain lifecycle-classified NEVER_ASSEMBLED/,
    );
  },
);


test(
  "Q14ag33E1 core preserves exact evidence identity organization and fingerprint protection",
  () => {
    const core =
      between(
        "export function validateHsppReconstructionIntentReplacementCandidateCoreSnapshot({",
        "export function validateHsppReconstructionIntentReplacementCandidateSnapshot({",
      );

    assert.match(
      core,
      /Persisted replacement evidence identity does not match the durable reconstruction intent/,
    );

    assert.match(
      core,
      /Persisted replacement evidence belongs to a different organization/,
    );

    assert.match(
      core,
      /Persisted replacement evidence fingerprint does not match the durable reconstruction intent/,
    );
  },
);


test(
  "Q14ag33E1 core binds durable B06A provenance to revalidated B06A authority",
  () => {
    const core =
      between(
        "export function validateHsppReconstructionIntentReplacementCandidateCoreSnapshot({",
        "export function validateHsppReconstructionIntentReplacementCandidateSnapshot({",
      );

    assert.match(
      core,
      /reservoirEligibilityPolicyVersion\s*!==[\s\S]*?HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION/,
    );

    assert.match(
      core,
      /reservoirDecision\.policyVersion\s*!==[\s\S]*?reservoirEligibilityPolicyVersion/,
    );

    assert.match(
      core,
      /if\s*\(\s*!reservoirDecision\.eligible\s*\)/,
    );
  },
);


test(
  "Q14ag33E1 preserves discovery-required legacy B07B public contract",
  () => {
    assert.match(
      source,
      /ValidateHsppReconstructionIntentReplacementCandidateSnapshotInput[\s\S]*?discoveryPolicyVersion:\s*string/,
    );
  },
);


test(
  "Q14ag33E1 preserves stale B07B discovery rejection",
  () => {
    const legacy =
      between(
        "export function validateHsppReconstructionIntentReplacementCandidateSnapshot({",
        "/**\n * Q14ag31H exact durable replacement-candidate hydration boundary.",
      );

    assert.match(
      legacy,
      /discoveryPolicyVersion\s*!==[\s\S]*?HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/,
    );

    assert.match(
      legacy,
      /Durable reconstruction intent discovery policy does not match the current Reservoir discovery authority/,
    );
  },
);


test(
  "Q14ag33E1 legacy B07B wrapper delegates common validation to the shared core",
  () => {
    const legacy =
      between(
        "export function validateHsppReconstructionIntentReplacementCandidateSnapshot({",
        "/**\n * Q14ag31H exact durable replacement-candidate hydration boundary.",
      );

    assert.match(
      legacy,
      /return\s+validateHsppReconstructionIntentReplacementCandidateCoreSnapshot\s*\(/,
    );

    assert.match(
      legacy,
      /reservoirEligibilityPolicyVersion:\s*HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION/,
    );
  },
);


test(
  "Q14ag33E1 adds no scheduled-pair execution authority",
  () => {
    assert.doesNotMatch(
      source,
      /HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION/,
    );

    assert.doesNotMatch(
      source,
      /readHsppReservoirPairPage/,
    );

    assert.doesNotMatch(
      source,
      /compareAndSwapHsppReservoirPair/,
    );

    assert.doesNotMatch(
      source,
      /"SCHEDULED_PAIR"/,
    );
  },
);