import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runner =
  fs.readFileSync(
    "lib/hspp/runHsppPostPositiveMemberEffectiveCessation.ts",
    "utf8",
  );

test(
  "cessation runner composes only the existing lease and Q14ac authorities",
  () => {
    assert.match(
      runner,
      /acquireHsppAssemblyAssessmentExecutionLease/,
    );

    assert.match(
      runner,
      /releaseHsppAssemblyAssessmentExecutionLease/,
    );

    assert.match(
      runner,
      /persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease/,
    );
  },
);

test(
  "cessation runner requires an already persisted CESSATION_REQUIRED Q14v work item",
  () => {
    assert.match(
      runner,
      /workItem\.workState\s*!==\s*"CESSATION_REQUIRED"/,
    );

    assert.match(
      runner,
      /workItem\.unsuitabilityCheckpointId\s*===\s*null/,
    );

    assert.match(
      runner,
      /workItem\.unsuitabilityObservedAt\s*===\s*null/,
    );

    assert.match(
      runner,
      /workItem\.unsuitabilityDecidedAt\s*===\s*null/,
    );
  },
);

test(
  "Q14ac receives only scope lease and persisted Q14v checkpoint identity",
  () => {
    assert.match(
      runner,
      /dependencies\.persistCessation/,
    );

    assert.match(
      runner,
      /organizationId:\s*workItem\.organizationId/,
    );

    assert.match(
      runner,
      /assemblyId:\s*workItem\.assemblyId/,
    );

    assert.match(
      runner,
      /leaseToken:\s*leaseAcquisition\.leaseToken/,
    );

    assert.match(
      runner,
      /unsuitabilityCheckpointId:\s*workItem\.unsuitabilityCheckpointId/,
    );
  },
);

test(
  "runner validates Q14ac database-derived historical identity",
  () => {
    assert.match(
      runner,
      /cessation\.evidenceId\s*!==\s*workItem\.evidenceId/,
    );

    assert.match(
      runner,
      /cessation\.integrityFingerprint\s*!==\s*workItem\.integrityFingerprint/,
    );

    assert.match(
      runner,
      /cessation\.historicalMembershipId\s*!==\s*workItem\.membershipId/,
    );

    assert.match(
      runner,
      /cessation\.unsuitabilityCheckpointId\s*!==\s*workItem\.unsuitabilityCheckpointId/,
    );

    assert.match(
      runner,
      /cessation\.ceasedAt\s*!==\s*workItem\.unsuitabilityDecidedAt/,
    );
  },
);

test(
  "cessation runner creates no post-positive time or UUID identity",
  () => {
    assert.doesNotMatch(
      runner,
      /randomUUID/,
    );

    assert.doesNotMatch(
      runner,
      /Date\.now/,
    );

    assert.doesNotMatch(
      runner,
      /new Date\s*\(/,
    );
  },
);

test(
  "cessation runner owns no direct database access",
  () => {
    assert.doesNotMatch(
      runner,
      /\.rpc\(/,
    );

    assert.doesNotMatch(
      runner,
      /\.from\(/,
    );

    assert.doesNotMatch(
      runner,
      /\.insert\(/,
    );

    assert.doesNotMatch(
      runner,
      /\.update\(/,
    );
  },
);

test(
  "cessation runner cannot evaluate Q14x discover Reservoir reconstruct or schedule",
  () => {
    assert.doesNotMatch(
      runner,
      /persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease/,
    );

    assert.doesNotMatch(
      runner,
      /\breadHsppPostPositiveLifecycleWorkItems\s*\(/,
    );

    assert.doesNotMatch(
      runner,
      /runHsppReservoirReevaluation/,
    );

    assert.doesNotMatch(
      runner,
      /runHsppReconstructionActivationCycle/,
    );

    assert.doesNotMatch(
      runner,
      /cron\/recovery/,
    );
  },
);

test(
  "runner acquires before Q14ac and releases in finally",
  () => {
    const acquire =
      runner.indexOf(
        "dependencies.acquireLease",
      );

    const persist =
      runner.indexOf(
        "dependencies.persistCessation",
      );

    const finallyIndex =
      runner.indexOf(
        "finally {",
      );

    const release =
      runner.indexOf(
        "dependencies.releaseLease",
      );

    assert.ok(
      acquire >= 0,
    );

    assert.ok(
      persist > acquire,
    );

    assert.ok(
      finallyIndex > acquire,
    );

    assert.ok(
      release > finallyIndex,
    );
  },
);
