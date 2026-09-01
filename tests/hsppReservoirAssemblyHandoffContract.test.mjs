import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/persistHsppReservoirAssemblyCandidate.ts",
  "utf8",
);

const recoveryRouteSource = fs.readFileSync(
  "app/api/hspp/cron/recovery/route.ts",
  "utf8",
);

const neutralSnapshotSource = fs.readFileSync(
  "lib/hspp/createHsppReservoirDownstreamSnapshot.ts",
  "utf8",
);

const neutralCoreStart = source.indexOf(
  "export async function persistHsppReservoirAssemblyCandidateFromSnapshot",
);

const legacyWrapperStart = source.indexOf(
  "export async function persistHsppReservoirAssemblyCandidate(",
  neutralCoreStart + 1,
);

assert.ok(neutralCoreStart >= 0);
assert.ok(legacyWrapperStart > neutralCoreStart);

const neutralCoreSource = source.slice(
  neutralCoreStart,
  legacyWrapperStart,
);

const legacyWrapperSource = source.slice(
  legacyWrapperStart,
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

  assert.match(source, /selected\.membershipDecision\s*\.policyVersion/);
});

test("B07C2 selects at most the first deterministic assembly candidate", () => {
  assert.match(source, /assemblyCandidates\[0\]/);

  assert.doesNotMatch(source, /for\s*\([^)]*assemblyCandidates/);

  assert.doesNotMatch(source, /for\s+\([^)]*assemblyCandidates/);
});

test("B07C2 neutral core resolves immutable identities from neutral snapshot candidates", () => {
  assert.match(
    neutralCoreSource,
    /snapshot\.candidates/,
  );

  assert.doesNotMatch(
    neutralCoreSource,
    /\.discovery\b/,
  );

  assert.match(
    source,
    /operationalRead\s*\.evidence/,
  );

  assert.match(
    source,
    /integrityFingerprint/,
  );
});

test("B07C2 performs no persistence when there is no assembly candidate", () => {
  assert.match(neutralCoreSource, /snapshot\.reevaluation\.state\s*!==\s*"ASSEMBLY_CANDIDATE"/);

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

// PERSISTENCE_NEUTRALIZATION_CONTRACT_V1

test(
  "producer-neutral B07C2 core consumes only the neutral semantic snapshot",
  () => {
    assert.match(
      source,
      /HsppReservoirDownstreamSnapshot/,
    );

    assert.match(
      neutralCoreSource,
      /snapshot\.organizationId/,
    );

    assert.match(
      neutralCoreSource,
      /snapshot\.candidates/,
    );

    assert.match(
      neutralCoreSource,
      /snapshot\.reevaluation/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /\.discovery\b/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /RunHsppReservoirReevaluationResult/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /createHsppReservoirDownstreamSnapshotFromB07B/,
    );
  },
);


test(
  "legacy B07B wrapper preserves runner/discovery organization provenance before adapting",
  () => {
    assert.match(
      legacyWrapperSource,
      /const result\s*=\s*[\s\S]*?input\.lifeguardResult/,
    );

    assert.match(
      legacyWrapperSource,
      /result\.organizationId[\s\S]*?\.trim\(\)/,
    );

    assert.match(
      legacyWrapperSource,
      /lifeguardResult\.organizationId is required/,
    );

    assert.match(
      legacyWrapperSource,
      /result\.discovery[\s\S]*?\.organizationId\s*!==[\s\S]*?organizationId/,
    );

    assert.match(
      legacyWrapperSource,
      /discovery organization does not match the runner organization/i,
    );

    assert.doesNotMatch(
      legacyWrapperSource,
      /result\.discovery\.candidates/,
    );
  },
);


test(
  "legacy wrapper is the only B07B adaptation point",
  () => {
    const adapterCalls =
      legacyWrapperSource.match(
        /createHsppReservoirDownstreamSnapshotFromB07B\s*\(/g,
      ) ?? [];


    assert.equal(
      adapterCalls.length,
      1,
    );


    assert.match(
      legacyWrapperSource,
      /persistHsppReservoirAssemblyCandidateFromSnapshot\s*\(/,
    );


    assert.doesNotMatch(
      neutralCoreSource,
      /createHsppReservoirDownstreamSnapshotFromB07B/,
    );
  },
);


test(
  "generic B07C1 persistence remains exactly one call and lives only in the neutral core",
  () => {
    const allCalls =
      source.match(
        /await\s+persistHsppEvidenceAssembly\s*\(/g,
      ) ?? [];


    const coreCalls =
      neutralCoreSource.match(
        /await\s+persistHsppEvidenceAssembly\s*\(/g,
      ) ?? [];


    assert.equal(
      allCalls.length,
      1,
    );

    assert.equal(
      coreCalls.length,
      1,
    );

    assert.doesNotMatch(
      legacyWrapperSource,
      /persistHsppEvidenceAssembly\s*\(/,
    );
  },
);


test(
  "neutral B07C2 core preserves first deterministic candidate and membership provenance",
  () => {
    assert.match(
      neutralCoreSource,
      /assemblyCandidates\[0\]/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /for\s*\([^)]*assemblyCandidates/,
    );

    assert.match(
      neutralCoreSource,
      /selected\.membershipDecision[\s\S]*?\.policyVersion/,
    );

    assert.match(
      neutralCoreSource,
      /membershipRelation:\s*\{/,
    );

    assert.match(
      neutralCoreSource,
      /firstEvidenceId:[\s\S]*?selected\.firstEvidenceId/,
    );

    assert.match(
      neutralCoreSource,
      /secondEvidenceId:[\s\S]*?selected\.secondEvidenceId/,
    );

    assert.match(
      neutralCoreSource,
      /membershipReason:[\s\S]*?selected\.membershipDecision[\s\S]*?\.reason/,
    );

    assert.match(
      neutralCoreSource,
      /distanceMeters:[\s\S]*?selected\.membershipDecision[\s\S]*?\.distanceMeters/,
    );

    assert.match(
      neutralCoreSource,
      /timeDeltaMs:[\s\S]*?selected\.membershipDecision[\s\S]*?\.timeDeltaMs/,
    );
  },
);


test(
  "neutral B07C2 core preserves lifecycle and immutable-evidence guards",
  () => {
    const lifecycleGuards =
      neutralCoreSource.match(
        /requireInitialAssemblyLifecycle\(\s*(?:firstCandidate|secondCandidate)\s*\)/g,
      ) ?? [];


    assert.equal(
      lifecycleGuards.length,
      2,
    );


    const persistenceMemberCalls =
      neutralCoreSource.match(
        /requirePersistenceMember\s*\(\s*(?:firstCandidate|secondCandidate)\s*,?\s*\)/g,
      ) ?? [];


    assert.equal(
      persistenceMemberCalls.length,
      2,
    );


    assert.match(
      source,
      /candidate\.membershipClassification\s*!==[\s\S]*?"NEVER_ASSEMBLED"/,
    );

    assert.match(
      source,
      /HISTORICAL_NOT_CURRENT/,
    );

    assert.match(
      source,
      /CURRENT_EFFECTIVE/,
    );

    assert.match(
      source,
      /identity mismatch/,
    );

    assert.match(
      source,
      /immutable integrity fingerprint/,
    );
  },
);


test(
  "neutral B07C2 core owns no discovery, scheduling, membership rerun or direct database read",
  () => {
    assert.doesNotMatch(
      neutralCoreSource,
      /\.discovery\b/,
    );

    assert.doesNotMatch(
      source,
      /\brunHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppReservoirCandidates\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bevaluateHsppAssemblyMembership\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /compareAndSwapHsppReservoir/,
    );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.select\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bfetch\s*\(/,
    );
  },
);


test(
  "scheduled-pair adapter exists for future direct neutral B07C2 use",
  () => {
    assert.match(
      neutralSnapshotSource,
      /createHsppReservoirDownstreamSnapshotFromScheduledPairs/,
    );

    assert.match(
      neutralSnapshotSource,
      /candidates:[\s\S]*?result\.eligibleEvidence/,
    );

    assert.match(
      neutralSnapshotSource,
      /reevaluation:[\s\S]*?result\.reevaluation/,
    );
  },
);


test(
  "recovery cron retains the existing legacy B07C2 call signature",
  () => {
    assert.match(
      recoveryRouteSource,
      /await\s+persistHsppReservoirAssemblyCandidate\s*\(\s*\{[\s\S]*?supabase,[\s\S]*?lifeguardResult:[\s\S]*?lifecycleSnapshot/,
    );

    assert.doesNotMatch(
      recoveryRouteSource,
      /persistHsppReservoirAssemblyCandidateFromSnapshot/,
    );

    assert.doesNotMatch(
      recoveryRouteSource,
      /createHsppReservoirDownstreamSnapshotFromScheduledPairs/,
    );
  },
);