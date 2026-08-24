import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runner =
  fs.readFileSync(
    "lib/hspp/runHsppPostPositiveMemberUnsuitabilityAssessment.ts",
    "utf8",
  );

test(
  "runner composes only canonical audited authorities",
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
      /readAndVerifyHsppEvidence/,
    );

    assert.match(
      runner,
      /evaluateHsppPostPositiveMemberUnsuitability/,
    );

    assert.match(
      runner,
      /persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease/,
    );
  },
);

test(
  "runner accepts caller-owned time lease identity and duration",
  () => {
    assert.match(
      runner,
      /leaseToken:\s*string/,
    );

    assert.match(
      runner,
      /leaseSeconds:\s*number/,
    );

    assert.match(
      runner,
      /observedAt:\s*string/,
    );

    assert.match(
      runner,
      /decidedAt:\s*string/,
    );

    assert.doesNotMatch(
      runner,
      /randomUUID/,
    );

    assert.doesNotMatch(
      runner,
      /new Date\s*\(/,
    );
  },
);

test(
  "runner remains one-work-item only and does not discover or schedule",
  () => {
    assert.doesNotMatch(
      runner,
      /\breadHsppPostPositiveLifecycleWorkItems\s*\(/,
    );

    assert.doesNotMatch(
      runner,
      /runHsppAssemblyRecoveryCycle/,
    );

    assert.doesNotMatch(
      runner,
      /cron\/recovery/,
    );

    assert.doesNotMatch(
      runner,
      /HSPP_RECOVERY_/,
    );
  },
);

test(
  "runner owns no direct database access",
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
  "runner cannot perform cessation reservoir or reconstruction",
  () => {
    assert.doesNotMatch(
      runner,
      /persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease/,
    );

    assert.doesNotMatch(
      runner,
      /runHsppReservoirReevaluation/,
    );

    assert.doesNotMatch(
      runner,
      /readHsppReservoirCandidates/,
    );

    assert.doesNotMatch(
      runner,
      /runHsppReconstructionActivationCycle/,
    );

    assert.doesNotMatch(
      runner,
      /runHsppReservoirReconstruction/,
    );
  },
);

test(
  "runner acquires before read evaluate persist and releases in finally",
  () => {
    const acquire =
      runner.indexOf(
        "dependencies.acquireLease",
      );

    const read =
      runner.indexOf(
        "dependencies.readEvidence",
      );

    const evaluate =
      runner.indexOf(
        "dependencies.evaluate",
      );

    const persist =
      runner.indexOf(
        "dependencies.persistUnsuitability",
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
      read > acquire,
    );

    assert.ok(
      evaluate > read,
    );

    assert.ok(
      persist > evaluate,
    );

    assert.ok(
      finallyIndex > acquire,
    );

    assert.ok(
      release > finallyIndex,
    );
  },
);

test(
  "only UNSUITABLE receives Q14v authority and prior Q14p identity is checked",
  () => {
    assert.match(
      runner,
      /decision\.state\s*===\s*"SUITABLE"/,
    );

    assert.match(
      runner,
      /decision\.state\s*===\s*"INDETERMINATE"/,
    );

    assert.match(
      runner,
      /decision\.state\s*===\s*"UNSUITABLE"/,
    );

    assert.match(
      runner,
      /decision\.persistenceReason\s*!==\s*HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON/,
    );

    assert.match(
      runner,
      /checkpoint\.priorPositiveCheckpointId\s*!==\s*workItem\.positiveCheckpointId/,
    );
  },
);

test(
  "Q14x mapping uses evaluator identity time and the acquired lease token",
  () => {
    assert.match(
      runner,
      /organizationId:\s*decision\.organizationId/,
    );

    assert.match(
      runner,
      /assemblyId:\s*decision\.assemblyId/,
    );

    assert.match(
      runner,
      /leaseToken:\s*leaseAcquisition\.leaseToken/,
    );

    assert.match(
      runner,
      /evidenceId:\s*decision\.evidenceId/,
    );

    assert.match(
      runner,
      /integrityFingerprint:\s*decision\.integrityFingerprint/,
    );

    assert.match(
      runner,
      /observedAt:\s*decision\.observedAt/,
    );

    assert.match(
      runner,
      /decidedAt:\s*decision\.decidedAt/,
    );
  },
);
