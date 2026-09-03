import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const boundaryPath =
  "lib/hspp/prepareHsppOpenAssemblyMembershipBeforeSealing.ts";

const source =
  fs.readFileSync(
    boundaryPath,
    "utf8",
  );


test(
  "AS26B reads the existing OPEN assembly and exact immutable membership",
  () => {
    assert.match(
      source,
      /\.from\("hspp_evidence_assemblies"\)/,
    );

    assert.match(
      source,
      /\.from\(\s*"hspp_evidence_assembly_members"/s,
    );

    assert.match(
      source,
      /assembly\.assembly_state\s*!==\s*"OPEN"/,
    );

    assert.match(
      source,
      /members\.length\s*!==\s*2/,
    );
  },
);


test(
  "AS26B integrity-verifies both child evidence records before B11A2",
  () => {
    assert.match(
      source,
      /readAndVerifyHsppEvidenceBatch/,
    );

    assert.match(
      source,
      /firstResult\.verification\.status\s*!==\s*"MATCH"/s,
    );

    assert.match(
      source,
      /secondResult\.verification\.status\s*!==\s*"MATCH"/s,
    );

    assert.match(
      source,
      /membership-bound integrity fingerprint/,
    );
  },
);


test(
  "AS26B evaluates the existing deterministic B11A2 policy",
  () => {
    assert.match(
      source,
      /evaluateHsppAssemblyMembership\s*\(\s*firstEvidence\s*,\s*secondEvidence\s*,?\s*\)/s,
    );

    assert.match(
      source,
      /decision\.policyVersion\s*!==\s*membershipPolicyVersion/s,
    );

    assert.match(
      source,
      /!decision\.eligible/,
    );

    assert.match(
      source,
      /decision\.reason\s*!==\s*"ELIGIBLE"/s,
    );
  },
);


test(
  "AS26B persists only the already-computed eligible child relation through AS26A",
  () => {
    assert.match(
      source,
      /\.rpc\(\s*"persist_hspp_open_assembly_membership_relation"/s,
    );

    assert.match(
      source,
      /membershipEligible:\s*true/,
    );

    assert.match(
      source,
      /membershipPolicyVersion:\s*decision\.policyVersion/s,
    );

    assert.match(
      source,
      /membershipReason:\s*decision\.reason/s,
    );

    assert.match(
      source,
      /distanceMeters:\s*decision\.distanceMeters/s,
    );

    assert.match(
      source,
      /timeDeltaMs:\s*decision\.timeDeltaMs/s,
    );
  },
);


test(
  "AS26B does not absorb reconstruction sealing or SEALED assessment authority",
  () => {
    for (const forbidden of [
      "persistHsppEvidenceAssemblyReconstruction",
      "runHsppOpenAssemblyRecoverySealing",
      "sealHsppEvidenceAssembly",
      "runHsppSealedAssemblyRecoveryAssessment",
      "scanHsppEvidenceAssembly",
    ]) {
      assert.doesNotMatch(
        source,
        new RegExp(
          `\\b${forbidden}\\b`,
        ),
      );
    }
  },
);


test(
  "AS26B exposes the idempotent persistence result without fabricating trust authority",
  () => {
    assert.match(
      source,
      /idempotentRecovery/,
    );

    assert.doesNotMatch(
      source,
      /trustState\s*=/,
    );

    assert.doesNotMatch(
      source,
      /Route Safety authority is granted/,
    );
  },
);