import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const path =
  "lib/hspp/runHsppPostPositiveRevalidationUnsuitabilityAssessment.ts";

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
  "authoritative runner composes only existing lease selection and Q14x-v2 boundaries",
  () => {
    for (const symbol of [
      "acquireHsppAssemblyAssessmentExecutionLease",
      "releaseHsppAssemblyAssessmentExecutionLease",
      "runHsppPostPositiveRevalidationSelection",
      "persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease",
    ]) {
      assert.ok(
        source.includes(
          symbol,
        ),
        "Missing authoritative boundary: " + symbol,
      );
    }
  },
);


test(
  "BUSY is a true short-circuit before selection persistence and release",
  () => {
    const busyIndex =
      executableSource.indexOf(
        'leaseAcquisition.state ===\n    "BUSY"',
      );

    const selectionIndex =
      executableSource.indexOf(
        "dependencies.selectRevalidation",
      );

    const persistenceIndex =
      executableSource.indexOf(
        "dependencies.persistUnsuitability",
      );

    const releaseIndex =
      executableSource.indexOf(
        "dependencies.releaseLease",
      );

    assert.ok(
      busyIndex >=
        0,
    );

    assert.ok(
      selectionIndex >
        busyIndex,
    );

    assert.ok(
      persistenceIndex >
        selectionIndex,
    );

    assert.ok(
      releaseIndex >
        persistenceIndex,
    );

    assert.match(
      executableSource,
      /branch:\s*"LEASE_BUSY"[\s\S]*selection:\s*null[\s\S]*checkpoint:\s*null[\s\S]*leaseRelease:\s*null/,
    );
  },
);


test(
  "runner confirms exact acquired caller-owned lease token",
  () => {
    assert.match(
      executableSource,
      /leaseAcquisition\.leaseToken\s*!==\s*leaseToken/,
    );

    assert.match(
      source,
      /exact caller-owned authority/,
    );
  },
);


test(
  "selection runs under acquired lease and only qualifying status can persist",
  () => {
    assert.match(
      executableSource,
      /await dependencies\.selectRevalidation\(\{/,
    );

    assert.match(
      executableSource,
      /selection\.status ===\s*"NO_CANDIDATES"/,
    );

    assert.match(
      executableSource,
      /selection\.status ===\s*"NO_QUALIFYING_REVALIDATION"/,
    );

    assert.match(
      executableSource,
      /selection\.status ===\s*"QUALIFYING_REVALIDATION_FOUND"/,
    );

    assert.match(
      executableSource,
      /await dependencies\.persistUnsuitability\(\{/,
    );
  },
);


test(
  "Q14x-v2 receives exact C plus selected R1 identity and caller-owned decidedAt",
  () => {
    for (const required of [
      "workItem.evidenceId",
      "workItem.integrityFingerprint",
      "selectedBasis.revalidationEvidenceId",
      "selectedBasis.revalidationIntegrityFingerprint",
      "selectedBasis.observedAt",
      "decidedAt",
      "leaseAcquisition.leaseToken",
    ]) {
      assert.ok(
        executableSource.includes(
          required,
        ),
        "Missing exact persistence identity: " + required,
      );
    }
  },
);


test(
  "persisted Q14v-v2 must bind exact prior positive checkpoint and canonical V2 authority",
  () => {
    assert.match(
      executableSource,
      /checkpoint\.priorPositiveCheckpointId\s*!==\s*workItem\.positiveCheckpointId/,
    );

    assert.ok(
      executableSource.includes(
        "HSPP_MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_VERSION",
      ),
    );

    assert.ok(
      executableSource.includes(
        "HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION",
      ),
    );

    assert.ok(
      executableSource.includes(
        "HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON",
      ),
    );
  },
);


test(
  "lease release occurs in finally and primary error remains authoritative",
  () => {
    assert.match(
      executableSource,
      /finally\s*\{[\s\S]*await dependencies\.releaseLease\(\{/,
    );

    assert.match(
      executableSource,
      /if \(primaryFailed\)\s*\{\s*throw primaryError;/,
    );

    assert.match(
      executableSource,
      /state:\s*"ERROR"[\s\S]*errorMessage/,
    );
  },
);


test(
  "runner owns no direct database clock UUID cessation Reservoir reconstruction or lifecycle-cycle authority",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\.from\s*\(|\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /Date\.now\(|new Date\s*\(|randomUUID/,
    );

    assert.doesNotMatch(
      executableSource,
      /persistHsppAssemblyMemberEffectiveCessation|runHsppReservoirReevaluation|runHsppReconstructionActivationCycle|runHsppPostPositiveLifecycleCycle/,
    );
  },
);
