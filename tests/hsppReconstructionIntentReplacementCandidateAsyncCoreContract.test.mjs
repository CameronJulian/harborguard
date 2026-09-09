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
  "Q14ag33E2A exposes one producer-neutral async hydration core",
  () => {
    assert.match(
      source,
      /export\s+async\s+function\s+readHsppReconstructionIntentReplacementCandidateCore\s*\(/,
    );

    assert.match(
      source,
      /ReadHsppReconstructionIntentReplacementCandidateCoreInput/,
    );

    assert.match(
      source,
      /reservoirEligibilityPolicyVersion:\s*string/,
    );
  },
);


test(
  "Q14ag33E2A async core owns no discovery or pair-scheduling provenance",
  () => {
    const core =
      between(
        "export async function readHsppReconstructionIntentReplacementCandidateCore({",
        "/**\n * Q14ag31H exact durable replacement-candidate hydration boundary.",
      );

    assert.doesNotMatch(
      core,
      /discoveryPolicyVersion/,
    );

    assert.doesNotMatch(
      core,
      /HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/,
    );

    assert.doesNotMatch(
      core,
      /HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION/,
    );

    assert.doesNotMatch(
      core,
      /SCHEDULED_PAIR/,
    );
  },
);


test(
  "Q14ag33E2A async core performs the exact existing operational evidence read",
  () => {
    const core =
      between(
        "export async function readHsppReconstructionIntentReplacementCandidateCore({",
        "/**\n * Q14ag31H exact durable replacement-candidate hydration boundary.",
      );

    assert.match(
      core,
      /readHsppEvidenceForOperationalUse\s*\(\s*\{/,
    );

    assert.match(
      core,
      /evidenceId:\s*replacementEvidenceId/,
    );
  },
);


test(
  "Q14ag33E2A async core performs the exact existing membership classification read",
  () => {
    const core =
      between(
        "export async function readHsppReconstructionIntentReplacementCandidateCore({",
        "/**\n * Q14ag31H exact durable replacement-candidate hydration boundary.",
      );

    assert.match(
      core,
      /"read_hspp_evidence_assembly_membership_classifications"/,
    );

    assert.match(
      core,
      /p_organization_id:\s*organizationId/,
    );
  },
);


test(
  "Q14ag33E2A async core delegates authority to the Q14ag33E1 pure core",
  () => {
    const core =
      between(
        "export async function readHsppReconstructionIntentReplacementCandidateCore({",
        "/**\n * Q14ag31H exact durable replacement-candidate hydration boundary.",
      );

    assert.match(
      core,
      /validateHsppReconstructionIntentReplacementCandidateCoreSnapshot\s*\(\s*\{/,
    );

    assert.match(
      core,
      /reservoirEligibilityPolicyVersion/,
    );
  },
);


test(
  "Q14ag33E2A legacy B07B reader keeps discovery validation before delegation",
  () => {
    const legacyStart =
      source.indexOf(
        "export async function readHsppReconstructionIntentReplacementCandidate({",
      );

    assert.notEqual(
      legacyStart,
      -1,
    );

    const legacy =
      source.slice(
        legacyStart,
      );

    const discoveryGate =
      legacy.indexOf(
        "HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION",
      );

    const delegate =
      legacy.indexOf(
        "readHsppReconstructionIntentReplacementCandidateCore({",
      );

    assert.ok(
      discoveryGate >= 0,
    );

    assert.ok(
      delegate > discoveryGate,
    );
  },
);


test(
  "Q14ag33E2A legacy B07B reader passes current B06A authority into the shared core",
  () => {
    const legacyStart =
      source.indexOf(
        "export async function readHsppReconstructionIntentReplacementCandidate({",
      );

    const legacy =
      source.slice(
        legacyStart,
      );

    assert.match(
      legacy,
      /reservoirEligibilityPolicyVersion:\s*HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION/,
    );
  },
);


test(
  "Q14ag33E2A legacy B07B wrapper no longer duplicates common IO",
  () => {
    const legacyStart =
      source.indexOf(
        "export async function readHsppReconstructionIntentReplacementCandidate({",
      );

    const legacy =
      source.slice(
        legacyStart,
      );

    assert.doesNotMatch(
      legacy,
      /readHsppEvidenceForOperationalUse\s*\(/,
    );

    assert.doesNotMatch(
      legacy,
      /read_hspp_evidence_assembly_membership_classifications/,
    );
  },
);


test(
  "Q14ag33E2A adds no scheduled-pair execution authority",
  () => {
    assert.doesNotMatch(
      source,
      /HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION/,
    );

    assert.doesNotMatch(
      source,
      /SCHEDULED_PAIR/,
    );

    assert.doesNotMatch(
      source,
      /readHsppReservoirPairPage/,
    );

    assert.doesNotMatch(
      source,
      /compareAndSwapHsppReservoirPair/,
    );
  },
);