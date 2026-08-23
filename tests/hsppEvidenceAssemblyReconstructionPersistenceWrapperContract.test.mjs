import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/persistHsppEvidenceAssemblyReconstruction.ts",
    "utf8",
  );


test(
  "Q14ag16A exposes one explicit low-level Q14h persistence wrapper",
  () => {
    assert.match(
      source,
      /HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_VERSION/,
    );

    assert.match(
      source,
      /hspp-evidence-assembly-reconstruction-persistence-v1/,
    );

    assert.match(
      source,
      /HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_RPC/,
    );

    assert.match(
      source,
      /persist_hspp_evidence_assembly_reconstruction/,
    );

    assert.match(
      source,
      /export\s+async\s+function\s+persistHsppEvidenceAssemblyReconstruction/,
    );
  },
);


test(
  "Q14ag16A requires caller-owned parent and child identities and never generates a UUID",
  () => {
    assert.match(
      source,
      /parentAssemblyId:\s*string/,
    );

    assert.match(
      source,
      /childAssemblyId:\s*string/,
    );

    assert.match(
      source,
      /parentAssemblyId\s*===\s*childAssemblyId/,
    );

    assert.doesNotMatch(
      source,
      /\brandomUUID\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /from\s+["'](?:node:)?crypto["']/,
    );

    assert.doesNotMatch(
      source,
      /from\s+["']uuid["']/,
    );
  },
);


test(
  "Q14ag16A sends only evidence identity and immutable fingerprint as Q14h member input",
  () => {
    assert.match(
      source,
      /p_members:\s*normalizedMembers\.map/,
    );

    assert.match(
      source,
      /evidenceId:\s*member\.evidenceId/,
    );

    assert.match(
      source,
      /integrityFingerprint:\s*member\.integrityFingerprint/,
    );

    assert.doesNotMatch(
      source,
      /membershipKind\s*:/,
    );

    assert.doesNotMatch(
      source,
      /sourceMembershipId\s*:/,
    );
  },
);


test(
  "Q14ag16A invokes Q14h exactly once with every required RPC argument",
  () => {
    const calls =
      source.match(
        /input\.supabase\.rpc\s*\(/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    for (
      const argument of [
        "p_organization_id",
        "p_parent_assembly_id",
        "p_child_assembly_id",
        "p_assembly_version",
        "p_membership_policy_version",
        "p_reconstruction_policy_version",
        "p_reconstruction_reason",
        "p_members",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `${argument}\\s*:`,
        ),
      );
    }
  },
);


test(
  "Q14ag16A validates final member identities fingerprints and duplicate safety before persistence",
  () => {
    assert.match(
      source,
      /input\.members\.length\s*<\s*2/,
    );

    assert.match(
      source,
      /SHA256_PATTERN/,
    );

    assert.match(
      source,
      /evidenceIds\.has/,
    );

    assert.match(
      source,
      /cannot contain duplicate evidence identities/,
    );
  },
);


test(
  "Q14ag16A validates exact Q14h identity metadata counts state and retry result",
  () => {
    assert.match(
      source,
      /returnedOrganizationId\s*!==\s*organizationId/,
    );

    assert.match(
      source,
      /returnedParentAssemblyId\s*!==\s*parentAssemblyId/,
    );

    assert.match(
      source,
      /returnedChildAssemblyId\s*!==\s*childAssemblyId/,
    );

    assert.match(
      source,
      /returnedAssemblyState\s*!==\s*"OPEN"/,
    );

    assert.match(
      source,
      /persistedMemberCount\s*!==\s*normalizedMembers\.length/,
    );

    assert.match(
      source,
      /retainedMemberCount\s*\+\s*originalMemberCount\s*!==\s*persistedMemberCount/,
    );

    assert.match(
      source,
      /removedChangeCount\s*\+\s*addedChangeCount\s*<\s*1/,
    );

    assert.match(
      source,
      /idempotentRecovery/,
    );
  },
);


test(
  "Q14ag16A does not become historical-context replacement or parent-selection authority",
  () => {
    assert.doesNotMatch(
      source,
      /read_hspp_historical_reconstruction_contexts/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppSealedEvidenceAssembly\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\brunHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bpersistHsppReservoirAssemblyCandidate\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/,
    );
  },
);


test(
  "Q14ag16A grants no seal assessment downstream cron or scheduling authority",
  () => {
    assert.doesNotMatch(
      source,
      /\bsealHspp/,
    );

    assert.doesNotMatch(
      source,
      /\bscanHspp/,
    );

    assert.doesNotMatch(
      source,
      /\bpersistHsppAssemblyDecision\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bNextRequest\b|\bNextResponse\b/,
    );

    assert.doesNotMatch(
      source,
      /\bcron\b.*\(/i,
    );
  },
);
