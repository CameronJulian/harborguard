import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cycle =
  fs.readFileSync(
    "lib/hspp/runHsppPostPositiveLifecycleCycle.ts",
    "utf8",
  );

test(
  "cycle composes only canonical discovery and the two closed single-item runners",
  () => {
    assert.match(
      cycle,
      /readHsppPostPositiveLifecycleWorkItems/,
    );

    assert.match(
      cycle,
      /runHsppPostPositiveMemberUnsuitabilityAssessment/,
    );

    assert.match(
      cycle,
      /runHsppPostPositiveMemberEffectiveCessation/,
    );
  },
);

test(
  "cycle exposes bounded scope lease and caller-owned attempt factories",
  () => {
    assert.match(
      cycle,
      /organizationId:\s*string/,
    );

    assert.match(
      cycle,
      /limit\?\s*:\s*number/,
    );

    assert.match(
      cycle,
      /leaseSeconds:\s*number/,
    );

    assert.match(
      cycle,
      /createObservedAt:\s*HsppPostPositiveLifecycleAttemptValueFactory/,
    );

    assert.match(
      cycle,
      /createDecidedAt:\s*HsppPostPositiveLifecycleAttemptValueFactory/,
    );

    assert.match(
      cycle,
      /createLeaseToken:\s*HsppPostPositiveLifecycleAttemptValueFactory/,
    );
  },
);

test(
  "cycle captures exactly one bounded lifecycle discovery snapshot",
  () => {
    const calls =
      cycle.match(
        /dependencies\.readWorkItems\s*\(/g,
      ) || [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      cycle,
      /organizationId:\s*normalizedOrganizationId/,
    );

    assert.match(
      cycle,
      /limit,/,
    );
  },
);

test(
  "cycle processes discovery snapshot sequentially without parallelism",
  () => {
    assert.match(
      cycle,
      /for\s*\(\s*const workItem\s*of discovery\.workItems\s*\)/,
    );

    assert.doesNotMatch(
      cycle,
      /Promise\.all/,
    );

    assert.doesNotMatch(
      cycle,
      /\bwhile\s*\(/,
    );
  },
);

test(
  "REEVALUATION_REQUIRED alone receives observation decision and lease factories",
  () => {
    assert.match(
      cycle,
      /workItem\.workState\s*===\s*"REEVALUATION_REQUIRED"/,
    );

    assert.match(
      cycle,
      /createObservedAt\(\s*workItem/,
    );

    assert.match(
      cycle,
      /createDecidedAt\(\s*workItem/,
    );

    assert.match(
      cycle,
      /createLeaseToken\(\s*workItem/,
    );

    assert.match(
      cycle,
      /dependencies\.runReevaluation/,
    );

    assert.match(
      cycle,
      /observedAt,/,
    );

    assert.match(
      cycle,
      /decidedAt,/,
    );
  },
);

test(
  "CESSATION_REQUIRED dispatches only lease identity into the closed cessation runner",
  () => {
    assert.match(
      cycle,
      /workItem\.workState\s*===\s*"CESSATION_REQUIRED"/,
    );

    assert.match(
      cycle,
      /dependencies\.runCessation/,
    );

    assert.match(
      cycle,
      /leaseToken,/,
    );

    assert.match(
      cycle,
      /leaseSeconds,/,
    );
  },
);

test(
  "cycle isolates work-item errors and preserves successful runner results",
  () => {
    assert.match(
      cycle,
      /"REEVALUATION_RESULT"/,
    );

    assert.match(
      cycle,
      /"REEVALUATION_ERROR"/,
    );

    assert.match(
      cycle,
      /"CESSATION_RESULT"/,
    );

    assert.match(
      cycle,
      /"CESSATION_ERROR"/,
    );

    assert.match(
      cycle,
      /cycleErrorMessage/,
    );
  },
);

test(
  "cycle owns no wall clock UUID direct database or lower lifecycle authority",
  () => {
    assert.doesNotMatch(
      cycle,
      /new Date\s*\(/,
    );

    assert.doesNotMatch(
      cycle,
      /Date\.now/,
    );

    assert.doesNotMatch(
      cycle,
      /randomUUID/,
    );

    assert.doesNotMatch(
      cycle,
      /\.rpc\(/,
    );

    assert.doesNotMatch(
      cycle,
      /\.from\(/,
    );

    assert.doesNotMatch(
      cycle,
      /runHsppReservoirReevaluation/,
    );

    assert.doesNotMatch(
      cycle,
      /readHsppReservoirCandidates/,
    );

    assert.doesNotMatch(
      cycle,
      /runHsppReconstructionActivationCycle/,
    );

    assert.doesNotMatch(
      cycle,
      /runHsppReservoirReconstruction/,
    );

    assert.doesNotMatch(
      cycle,
      /cron\/recovery/,
    );
  },
);

test(
  "cycle contains no internal retry or second lifecycle discovery",
  () => {
    assert.doesNotMatch(
      cycle,
      /\bretry\s*\(/,
    );

    assert.doesNotMatch(
      cycle,
      /setTimeout/,
    );

    const calls =
      cycle.match(
        /dependencies\.readWorkItems\s*\(/g,
      ) || [];

    assert.equal(
      calls.length,
      1,
    );
  },
);
