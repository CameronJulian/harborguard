import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const path =
  "lib/hspp/persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease.ts";

const source =
  fs.readFileSync(
    path,
    "utf8",
  );

const executableSource =
  source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /\/\/.*$/gm,
      "",
    );


test(
  "Q14x-v2 TypeScript writer targets exactly the dormant R1-aware RPC",
  () => {
    assert.match(
      source,
      /"persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease"/,
    );

    assert.doesNotMatch(
      source,
      /"persist_hspp_member_unsuitability_checkpoint_under_lease"/,
    );
  },
);


test(
  "writer input carries exact C and exact R1 identity",
  () => {
    for (const field of [
      "organizationId",
      "assemblyId",
      "leaseToken",
      "evidenceId",
      "integrityFingerprint",
      "revalidationEvidenceId",
      "revalidationIntegrityFingerprint",
      "observedAt",
      "decidedAt",
    ]) {
      assert.ok(
        source.includes(
          field,
        ),
        `Missing Q14x-v2 writer field: ${field}`,
      );
    }
  },
);


test(
  "writer passes every exact Q14x-v2 RPC argument",
  () => {
    for (const argument of [
      "p_organization_id",
      "p_assembly_id",
      "p_lease_token",
      "p_evidence_id",
      "p_integrity_fingerprint",
      "p_revalidation_evidence_id",
      "p_revalidation_integrity_fingerprint",
      "p_observed_at",
      "p_decided_at",
    ]) {
      assert.ok(
        executableSource.includes(
          argument,
        ),
        `Missing exact RPC argument: ${argument}`,
      );
    }
  },
);


test(
  "writer accepts only checkpoint-v2 policy-v2 canonical authority",
  () => {
    assert.match(
      source,
      /hspp-assembly-member-unsuitability-checkpoint-v2/,
    );

    assert.match(
      source,
      /hspp-post-positive-member-unsuitability-v2/,
    );

    assert.match(
      source,
      /POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION/,
    );

    assert.doesNotMatch(
      source,
      /hspp-assembly-member-unsuitability-checkpoint-v1/,
    );

    assert.doesNotMatch(
      source,
      /hspp-post-positive-member-unsuitability-v1/,
    );
  },
);


test(
  "writer independently checks returned exact R1 persistence identity",
  () => {
    assert.match(
      source,
      /returnedRevalidationEvidenceId\.toLowerCase\(\)[\s\S]*normalizedRevalidationEvidenceId\.toLowerCase\(\)/,
    );

    assert.match(
      source,
      /returnedRevalidationFingerprint\s*!==[\s\S]*normalizedRevalidationFingerprint/,
    );

    assert.match(
      source,
      /returnedObservedAt\s*!==[\s\S]*normalizedObservedAt/,
    );

    assert.match(
      source,
      /returnedDecidedAt\s*!==[\s\S]*normalizedDecidedAt/,
    );
  },
);


test(
  "writer uses one RPC call and no direct table mutation",
  () => {
    const rpcCalls =
      executableSource.match(
        /\.rpc\s*\(/g,
      ) ?? [];

    assert.equal(
      rpcCalls.length,
      1,
    );

    assert.doesNotMatch(
      executableSource,
      /\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    );
  },
);


test(
  "writer owns no lease acquisition release selection cessation or reconstruction orchestration",
  () => {
    assert.doesNotMatch(
      executableSource,
      /acquireHsppAssemblyAssessmentExecutionLease|releaseHsppAssemblyAssessmentExecutionLease/,
    );

    assert.doesNotMatch(
      executableSource,
      /runHsppPostPositiveRevalidationSelection/,
    );

    assert.doesNotMatch(
      executableSource,
      /persistHsppAssemblyMemberEffectiveCessation/,
    );

    assert.doesNotMatch(
      executableSource,
      /runHsppReservoirReevaluation|runHsppReconstructionActivationCycle/,
    );

    assert.doesNotMatch(
      executableSource,
      /Date\.now\(|randomUUID/,
    );
  },
);
