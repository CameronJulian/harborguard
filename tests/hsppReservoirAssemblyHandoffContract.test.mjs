import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/persistHsppReservoirAssemblyCandidate.ts",
  "utf8",
);

test("B07C2 is an explicitly versioned handoff boundary", () => {
  assert.match(source, /HSPP_RESERVOIR_ASSEMBLY_HANDOFF_VERSION/);

  assert.match(source, /hspp-reservoir-assembly-handoff-v1/);
});

test("B07C2 consumes an already-computed B07B result", () => {
  assert.match(source, /RunHsppReservoirReevaluationResult/);

  assert.match(source, /input\.lifeguardResult/);

  assert.doesNotMatch(source, /\brunHsppReservoirReevaluation\s*\(/);

  assert.doesNotMatch(source, /\breadHsppReservoirCandidates\s*\(/);
});

test("B07C2 does not rerun B11A2 membership evaluation", () => {
  assert.doesNotMatch(source, /\bevaluateHsppAssemblyMembership\s*\(/);

  assert.match(source, /selected\.membershipDecision\.policyVersion/);
});

test("B07C2 selects at most the first deterministic assembly candidate", () => {
  assert.match(source, /assemblyCandidates\[0\]/);

  assert.doesNotMatch(source, /for\s*\([^)]*assemblyCandidates/);

  assert.doesNotMatch(source, /for\s+\([^)]*assemblyCandidates/);
});

test("B07C2 resolves immutable identities from existing discovery candidates", () => {
  assert.match(source, /result\.discovery\.candidates/);

  assert.match(source, /operationalRead\.evidence/);

  assert.match(source, /integrityFingerprint/);
});

test("B07C2 performs no persistence when there is no assembly candidate", () => {
  assert.match(source, /state !== "ASSEMBLY_CANDIDATE"/);

  assert.match(source, /"NO_ASSEMBLY_CANDIDATE"/);
});

test(
  "B07C2 requires both selected candidates to be NEVER_ASSEMBLED before generic B07C1 persistence",
  () => {
    assert.match(
      source,
      /candidate\.membershipClassification\s*!==\s*"NEVER_ASSEMBLED"/,
    );

    assert.match(
      source,
      /HISTORICAL_NOT_CURRENT/,
    );

    assert.match(
      source,
      /CURRENT_EFFECTIVE/,
    );

    const lifecycleGuards =
      source.match(
        /requireInitialAssemblyLifecycle\(\s*(?:firstCandidate|secondCandidate)\s*\)/g,
      ) ?? [];

    assert.equal(
      lifecycleGuards.length,
      2,
    );

    const secondCandidateIndex =
      source.indexOf(
        "const secondCandidate = requireCandidate(",
      );

    const firstGuardIndex =
      source.indexOf(
        "requireInitialAssemblyLifecycle(firstCandidate);",
      );

    const secondGuardIndex =
      source.indexOf(
        "requireInitialAssemblyLifecycle(secondCandidate);",
      );

    const membersIndex =
      source.indexOf(
        "const members = [",
      );

    const persistenceIndex =
      source.indexOf(
        "await persistHsppEvidenceAssembly({",
      );

    assert.ok(
      secondCandidateIndex >= 0,
    );

    assert.ok(
      firstGuardIndex > secondCandidateIndex,
    );

    assert.ok(
      secondGuardIndex > firstGuardIndex,
    );

    assert.ok(
      membersIndex > secondGuardIndex,
    );

    assert.ok(
      persistenceIndex > membersIndex,
    );
  },
);

test(
  "B07C2 lifecycle guard does not rerun discovery classification or reconstruction",
  () => {
    assert.doesNotMatch(
      source,
      /\.rpc\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /read_hspp_evidence_assembly_membership_classifications/,
    );

    assert.doesNotMatch(
      source,
      /read_hspp_current_effective_assembly_memberships/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppReservoirCandidates\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bevaluateHsppReservoirEligibility\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /persistHsppEvidenceAssemblyReconstruction/,
    );
  },
);

test("B07C2 invokes the existing B07C1 persistence primitive exactly once", () => {
  const calls = source.match(/await\s+persistHsppEvidenceAssembly\s*\(/g) ?? [];

  assert.equal(calls.length, 1);
});

test("B07C2 has no direct database or network read implementation", () => {
  assert.doesNotMatch(source, /\.from\s*\(/);

  assert.doesNotMatch(source, /\.select\s*\(/);

  assert.doesNotMatch(source, /\bfetch\s*\(/);
});

test("B07C2 grants no later HSPP authority", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /seal an evidence assembly/);

  assert.match(source, /scan an evidence assembly/);

  assert.match(source, /create an assembly decision/);

  assert.match(source, /modify evidence trust/);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);
});

test("B07C2 introduces no API cron or scheduling boundary", () => {
  const forbidden = [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bCRON_SECRET\b/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});
