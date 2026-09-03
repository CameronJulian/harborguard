import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(
    path.join(repoRoot, relativePath),
    "utf8",
  );
}

function callCount(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

const q14h = read(
  "supabase/migrations/20260823060000_persist_hspp_evidence_assembly_reconstruction.sql",
);

const b07c3 = read(
  "supabase/migrations/20260823110800_fix_hspp_evidence_assembly_sealing_ambiguity.sql",
);

const recoveryReader = read(
  "lib/hspp/readHsppAssemblyRecoveryWorkItems.ts",
);

const openSealing = read(
  "lib/hspp/runHsppOpenAssemblyRecoverySealing.ts",
);

const sealedAssessment = read(
  "lib/hspp/runHsppSealedAssemblyRecoveryAssessment.ts",
);

const recoveryCycle = read(
  "lib/hspp/runHsppAssemblyRecoveryCycle.ts",
);

const sealedScan = read(
  "lib/hspp/runHsppSealedEvidenceAssemblyScan.ts",
);

const sealedReader = read(
  "lib/hspp/readHsppSealedEvidenceAssembly.ts",
);

const recoveryCron = read(
  "app/api/hspp/cron/recovery/route.ts",
);


test(
  "Q14ag29 Q14h persists reconstructed H2 as an ordinary OPEN assembly before reconstruction provenance",
  () => {
    assert.match(
      q14h,
      /insert\s+into\s+public\.hspp_evidence_assemblies\s*\([\s\S]*?id[\s\S]*?organization_id[\s\S]*?assembly_version[\s\S]*?membership_policy_version[\s\S]*?assembly_state[\s\S]*?\)\s*values\s*\([\s\S]*?p_child_assembly_id[\s\S]*?p_organization_id[\s\S]*?trim\s*\(\s*p_assembly_version\s*\)[\s\S]*?trim\s*\(\s*p_membership_policy_version\s*\)[\s\S]*?'OPEN'[\s\S]*?\)\s*;/i,
    );

    assert.match(
      q14h,
      /insert\s+into\s+public\.hspp_evidence_assembly_reconstructions/i,
    );

    const childAssemblyInsert =
      q14h.search(
        /insert\s+into\s+public\.hspp_evidence_assemblies\s*\(/i,
      );

    const reconstructionInsert =
      q14h.search(
        /insert\s+into\s+public\.hspp_evidence_assembly_reconstructions/i,
      );

    assert.ok(childAssemblyInsert >= 0);
    assert.ok(reconstructionInsert > childAssemblyInsert);
  },
);


test(
  "Q14ag29 Q13b discovers H2 by ordinary organization and assembly lifecycle state only",
  () => {
    assert.equal(
      callCount(
        recoveryReader,
        /\.from\s*\(\s*["']hspp_evidence_assemblies["']\s*\)/g,
      ),
      1,
    );

    assert.match(
      recoveryReader,
      /\.eq\s*\(\s*["']organization_id["']\s*,\s*normalizedOrganizationId\s*\)/,
    );

    assert.match(
      recoveryReader,
      /\.eq\s*\(\s*["']assembly_state["']\s*,\s*normalizedAssemblyState\s*\)/,
    );

    for (const forbidden of [
      "hspp_evidence_assembly_reconstructions",
      "parent_assembly_id",
      "child_assembly_id",
      "membership_kind",
      "source_membership_id",
    ]) {
      assert.equal(
        recoveryReader.includes(forbidden),
        false,
        `Q13b unexpectedly depends on reconstruction lineage field ${forbidden}.`,
      );
    }
  },
);


test(
  "Q14ag29 B07C3 seals any exact organization-scoped OPEN assembly without reconstruction origin knowledge",
  () => {
    assert.match(
      b07c3,
      /create\s+or\s+replace\s+function\s+public\.seal_hspp_evidence_assembly\s*\(/i,
    );

    assert.match(
      b07c3,
      /assembly\.organization_id\s*=\s*p_organization_id[\s\S]*?assembly\.id\s*=\s*p_assembly_id[\s\S]*?for\s+update/i,
    );

    assert.match(
      b07c3,
      /v_assembly\.assembly_state\s*<>\s*'OPEN'/i,
    );

    assert.match(
      b07c3,
      /assembly_state\s*=\s*'SEALED'/i,
    );

    for (const forbidden of [
      /hspp_evidence_assembly_reconstructions/i,
      /parent_assembly_id/i,
      /child_assembly_id/i,
      /membership_kind/i,
      /source_membership_id/i,
    ]) {
      assert.doesNotMatch(b07c3, forbidden);
    }
  },
);


test(
  "Q14ag29 Q13c accepts reconstructed H2 through the existing generic OPEN work-item contract",
  () => {
    assert.match(
      openSealing,
      /workItem:\s*HsppAssemblyRecoveryWorkItem/,
    );

    assert.match(
      openSealing,
      /workItem\.assemblyState\s*!==\s*"OPEN"/,
    );

    assert.match(
      openSealing,
      /workItem\.sealedAt\s*!==\s*null/,
    );

    assert.match(
      openSealing,
      /const\s+organizationId\s*=\s*requireNonBlank\s*\([\s\S]*?workItem\.organizationId/,
    );

    assert.match(
      openSealing,
      /const\s+assemblyId\s*=\s*requireNonBlank\s*\([\s\S]*?workItem\.assemblyId/,
    );

    assert.match(
      openSealing,
      /sealHsppEvidenceAssembly\s*\(\s*\{[\s\S]*?supabase[\s\S]*?organizationId[\s\S]*?assemblyId[\s\S]*?\}\s*\)/,
    );

    assert.doesNotMatch(
      openSealing,
      /reconstruction|parentAssembly|childAssembly|membershipKind|sourceMembership/i,
    );
  },
);


test(
  "Q14ag29 Q13d7 assesses reconstructed H2 by H2 assembly identity rather than H1 lineage",
  () => {
    assert.match(
      sealedAssessment,
      /workItem:\s*HsppAssemblyRecoveryWorkItem/,
    );

    assert.match(
      sealedAssessment,
      /workItem\.assemblyState\s*!==\s*"SEALED"/,
    );

    assert.match(
      sealedAssessment,
      /const\s+assemblyId\s*=\s*requireNonBlank\s*\([\s\S]*?workItem\.assemblyId/,
    );

    assert.match(
      sealedAssessment,
      /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting\s*\(\s*\{[\s\S]*?organizationId:\s*retryIdentity\.organizationId[\s\S]*?assemblyId:\s*retryIdentity\.assemblyId[\s\S]*?assessedAt:\s*retryIdentity\.assessedAt[\s\S]*?executionLease/,
    );

    assert.match(
      sealedAssessment,
      /recordHsppAssemblyAssessmentCompletionUnderExecutionLease\s*\(\s*\{[\s\S]*?organizationId:\s*retryIdentity\.organizationId[\s\S]*?assemblyId:\s*retryIdentity\.assemblyId/,
    );

    assert.doesNotMatch(
      sealedAssessment,
      /reconstruction|parentAssembly|childAssembly|parent_assembly_id|child_assembly_id/i,
    );
  },
);


test(
  "Q14ag29 sealed assessment reads and scans H2 itself with H2 immutable member fingerprints",
  () => {
    assert.match(
      sealedScan,
      /readHsppSealedEvidenceAssembly\s*\(\s*\{[\s\S]*?supabase:\s*input\.supabase[\s\S]*?organizationId:\s*input\.organizationId[\s\S]*?assemblyId:\s*input\.assemblyId[\s\S]*?\}\s*\)/,
    );

    assert.match(
      sealedScan,
      /scanHsppEvidenceAssembly\s*\(\s*read\.scanInput\s*\)/,
    );

    assert.match(
      sealedReader,
      /verifiedMembers\.push\s*\(\s*\{[\s\S]*?membershipId:\s*member\.membershipId[\s\S]*?evidenceId:\s*member\.evidenceId[\s\S]*?integrityFingerprint:\s*member\.integrityFingerprint[\s\S]*?memberOrdinal:\s*member\.memberOrdinal/,
    );

    assert.match(
      sealedReader,
      /scanInput:\s*\{[\s\S]*?assemblyId[\s\S]*?organizationId[\s\S]*?assemblyState:\s*"SEALED"/,
    );

    assert.doesNotMatch(
      sealedScan,
      /parentAssemblyId|childAssemblyId|parent_assembly_id|child_assembly_id/i,
    );
  },
);


test(
  "Q14ag29 Q13f preserves the cross-cycle OPEN seal then later SEALED assessment lifecycle",
  () => {
    assert.equal(
      callCount(
        recoveryCycle,
        /\breadHsppAssemblyRecoveryWorkItems\s*\(/g,
      ),
      2,
    );

    assert.equal(
      callCount(
        recoveryCycle,
        /\brunHsppOpenAssemblyRecoverySealing\s*\(/g,
      ),
      1,
    );

    assert.equal(
      callCount(
        recoveryCycle,
        /\brunHsppSealedAssemblyRecoveryAssessment\s*\(/g,
      ),
      1,
    );

    const sealedDiscoveryIndex =
      recoveryCycle.indexOf("const sealedDiscovery");

    const openDiscoveryIndex =
      recoveryCycle.indexOf("const openDiscovery");

    const firstOpenMutationIndex =
      recoveryCycle.indexOf(
        "await runHsppOpenAssemblyRecoverySealing",
      );

    assert.ok(sealedDiscoveryIndex >= 0);
    assert.ok(openDiscoveryIndex > sealedDiscoveryIndex);
    assert.ok(firstOpenMutationIndex > openDiscoveryIndex);

    assert.match(
      recoveryCycle,
      /No same-cycle SEALED rediscovery is permitted/i,
    );

    assert.match(
      recoveryCycle,
      /branch:\s*"OPEN_SEALED"/,
    );

    assert.match(
      recoveryCycle,
      /branch:\s*"SEALED_ASSESSMENT"/,
    );
  },
);


test(
  "Q14ag29 reconstruction provenance remains separate from generic seal and assessment authorities",
  () => {
    assert.match(
      q14h,
      /hspp_evidence_assembly_reconstructions/i,
    );

    assert.match(
      q14h,
      /membership_kind/i,
    );

    assert.match(
      q14h,
      /source_membership_id/i,
    );

    for (const [label, source] of [
      ["Q13b", recoveryReader],
      ["B07C3", b07c3],
      ["Q13c", openSealing],
      ["Q13d7", sealedAssessment],
    ]) {
      assert.doesNotMatch(
        source,
        /hspp_evidence_assembly_reconstructions/i,
        `${label} must not mutate or reinterpret reconstruction provenance.`,
      );
    }
  },
);


test(
  "Q14ag29 compatibility proof does not activate reconstruction in Q13f or recovery cron",
  () => {
    assert.doesNotMatch(
      recoveryCycle,
      /\brunHsppReservoirReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      recoveryCron,
      /\brunHsppReservoirReconstruction\s*\(/,
    );
  },
);


test(
  "Q14ag35 reconstructed OPEN children establish child-specific B11A2 before generic Q13c sealing",
  () => {
    const membershipIndex =
      recoveryCycle.indexOf(
        "await prepareHsppOpenAssemblyMembershipBeforeSealing",
      );

    const sealingIndex =
      recoveryCycle.indexOf(
        "await runHsppOpenAssemblyRecoverySealing",
      );

    assert.ok(
      membershipIndex >= 0,
      "Q13f must invoke the OPEN child B11A2 preparation boundary.",
    );

    assert.ok(
      sealingIndex > membershipIndex,
      "Child-specific B11A2 provenance must exist before Q13c sealing.",
    );

    assert.match(
      recoveryCycle,
      /membershipPreparation/,
    );
  },
);


test(
  "Q14ag35 preserves separate reconstruction B11A2 and Q13c authorities",
  () => {
    assert.doesNotMatch(
      q14h,
      /\bevaluateHsppAssemblyMembership\s*\(/,
    );

    assert.doesNotMatch(
      openSealing,
      /\bevaluateHsppAssemblyMembership\s*\(/,
    );

    assert.doesNotMatch(
      openSealing,
      /persist_hspp_open_assembly_membership_relation/,
    );
  },
);