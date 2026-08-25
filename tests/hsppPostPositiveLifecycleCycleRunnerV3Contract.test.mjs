import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cycle =
  fs.readFileSync(
    "lib/hspp/runHsppPostPositiveLifecycleCycleV3.ts",
    "utf8",
  );

const executable =
  cycle
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /\/\/.*$/gm,
      "",
    );


test(
  "Lifecycle V3 has independent version and runner identity",
  () => {
    assert.match(
      cycle,
      /HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_V3_VERSION/,
    );

    assert.match(
      cycle,
      /"hspp-post-positive-lifecycle-cycle-runner-v3"/,
    );

    assert.match(
      cycle,
      /runHsppPostPositiveLifecycleCycleV3/,
    );

    assert.match(
      cycle,
      /RunHsppPostPositiveLifecycleCycleV3Input/,
    );

    assert.match(
      cycle,
      /RunHsppPostPositiveLifecycleCycleV3Result/,
    );

    assert.match(
      cycle,
      /HsppPostPositiveLifecycleCycleV3Dependencies/,
    );

    assert.doesNotMatch(
      cycle,
      /LifecycleCycleV3V3/,
    );
  },
);


test(
  "Lifecycle V3 composes Authority V2 and existing cessation authority",
  () => {
    assert.match(
      cycle,
      /runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2/,
    );

    assert.match(
      cycle,
      /RunHsppPostPositiveRevalidationUnsuitabilityAssessmentV2Result/,
    );

    assert.doesNotMatch(
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
  "Lifecycle V3 removes caller observedAt and retains decision plus lease identity",
  () => {
    assert.doesNotMatch(
      cycle,
      /createObservedAt/,
    );

    assert.doesNotMatch(
      cycle,
      /const observedAt\s*=/,
    );

    assert.match(
      cycle,
      /createDecidedAt:\s*HsppPostPositiveLifecycleAttemptValueFactory/,
    );

    assert.match(
      cycle,
      /createLeaseToken:\s*HsppPostPositiveLifecycleAttemptValueFactory/,
    );

    assert.match(
      cycle,
      /createDecidedAt\(\s*workItem/,
    );

    assert.match(
      cycle,
      /createLeaseToken\(\s*workItem/,
    );
  },
);


test(
  "Lifecycle V3 Authority call carries no observedAt or candidate limit",
  () => {
    const start =
      cycle.indexOf(
        "await dependencies.runReevaluation({",
      );

    assert.notEqual(
      start,
      -1,
    );

    const end =
      cycle.indexOf(
        "});",
        start,
      );

    assert.notEqual(
      end,
      -1,
    );

    const call =
      cycle.slice(
        start,
        end + 3,
      );

    assert.match(call, /supabase,/);
    assert.match(call, /workItem,/);
    assert.match(call, /leaseToken,/);
    assert.match(call, /leaseSeconds,/);
    assert.match(call, /decidedAt,/);

    assert.doesNotMatch(
      call,
      /observedAt/,
    );

    assert.doesNotMatch(
      call,
      /\blimit\b/,
    );
  },
);


test(
  "Lifecycle V3 retains Authority V2 assessment without branch compatibility mapping",
  () => {
    assert.match(
      cycle,
      /assessment,/,
    );

    assert.doesNotMatch(
      executable,
      /assessment\.branch\s*===/,
    );

    assert.doesNotMatch(
      executable,
      /switch\s*\(\s*assessment\.branch/,
    );

    assert.doesNotMatch(
      executable,
      /"SUITABLE"/,
    );

    assert.doesNotMatch(
      executable,
      /"INDETERMINATE"/,
    );
  },
);


test(
  "Lifecycle V3 keeps one sequential discovery snapshot",
  () => {
    const reads =
      cycle.match(
        /dependencies\.readWorkItems\s*\(/g,
      ) || [];

    assert.equal(
      reads.length,
      1,
    );

    assert.match(
      cycle,
      /for\s*\(\s*const workItem\s*of discovery\.workItems\s*\)/,
    );

    assert.doesNotMatch(
      executable,
      /Promise\.all/,
    );

    assert.doesNotMatch(
      executable,
      /\bwhile\s*\(/,
    );

    assert.equal(
      (
        cycle.match(
          /dependencies\.runReevaluation\s*\(/g,
        ) || []
      ).length,
      1,
    );

    assert.equal(
      (
        cycle.match(
          /dependencies\.runCessation\s*\(/g,
        ) || []
      ).length,
      1,
    );
  },
);


test(
  "Lifecycle V3 preserves outer fair cursor CAS",
  () => {
    assert.match(
      cycle,
      /readHsppPostPositiveLifecycleFairWorkItemsV2/,
    );

    assert.match(
      cycle,
      /compareAndSwapHsppPostPositiveLifecycleScanState/,
    );

    assert.equal(
      (
        cycle.match(
          /dependencies\.advanceCursor\s*\(/g,
        ) || []
      ).length,
      1,
    );

    const loop =
      cycle.indexOf(
        "for (",
      );

    const cursor =
      cycle.indexOf(
        "await dependencies.advanceCursor(",
      );

    assert.ok(loop >= 0);
    assert.ok(cursor > loop);
  },
);


test(
  "Lifecycle V3 owns no direct DB clock UUID or reconstruction authority",
  () => {
    assert.doesNotMatch(executable, /\.rpc\s*\(/);
    assert.doesNotMatch(executable, /\.from\s*\(/);
    assert.doesNotMatch(executable, /\.insert\s*\(/);
    assert.doesNotMatch(executable, /\.update\s*\(/);
    assert.doesNotMatch(executable, /\.upsert\s*\(/);
    assert.doesNotMatch(executable, /\.delete\s*\(/);
    assert.doesNotMatch(executable, /new Date\s*\(/);
    assert.doesNotMatch(executable, /Date\.now\s*\(/);
    assert.doesNotMatch(executable, /randomUUID/);
    assert.doesNotMatch(
      executable,
      /persistHsppEvidenceAssemblyReconstruction/,
    );
  },
);
