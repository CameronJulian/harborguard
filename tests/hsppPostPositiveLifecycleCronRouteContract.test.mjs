import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const root =
  process.cwd();

const routePath =
  path.join(
    root,
    "app/api/hspp/cron/post-positive-lifecycle/route.ts",
  );

const vercelPath =
  path.join(
    root,
    "vercel.json",
  );

const source =
  fs.readFileSync(
    routePath,
    "utf8",
  );

const vercel =
  fs.readFileSync(
    vercelPath,
    "utf8",
  );


test(
  "isolated post-positive lifecycle route has a strict serverless runtime boundary",
  () => {
    assert.match(
      source,
      /export const maxDuration\s*=\s*60/,
    );

    assert.match(
      source,
      /HSPP_POST_POSITIVE_LIFECYCLE_LIMIT\s*=\s*1/,
    );

    assert.match(
      source,
      /HSPP_POST_POSITIVE_EXECUTION_BUDGET_MS\s*=\s*40_000/,
    );

    assert.match(
      source,
      /HSPP_POST_POSITIVE_FETCH_TIMEOUT_MAX_MS\s*=\s*6_000/,
    );

    assert.match(
      source,
      /Date\.now\(\)\s*\+\s*HSPP_POST_POSITIVE_EXECUTION_BUDGET_MS/,
    );

    assert.match(
      source,
      /new AbortController\(\)/,
    );

    assert.match(
      source,
      /Math\.min\([\s\S]*HSPP_POST_POSITIVE_FETCH_TIMEOUT_MAX_MS[\s\S]*remainingMs/,
    );

    assert.match(
      source,
      /setTimeout\s*\(/,
    );

    assert.match(
      source,
      /global:\s*\{[\s\S]*fetch:\s*deadlineFetch/,
    );
  },
);


test(
  "isolated route delegates exactly once to the canonical post-positive lifecycle cycle",
  () => {
    const calls =
      source.match(
        /await\s+runHsppPostPositiveLifecycleCycle\s*\(/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      source,
      /limit:\s*HSPP_POST_POSITIVE_LIFECYCLE_LIMIT/,
    );

    assert.match(
      source,
      /leaseSeconds/,
    );

    assert.match(
      source,
      /createObservedAt\(\)[\s\S]*new Date\(\)[\s\S]*toISOString/,
    );

    assert.match(
      source,
      /createDecidedAt\(\)[\s\S]*new Date\(\)[\s\S]*toISOString/,
    );

    assert.match(
      source,
      /createLeaseToken\(\)[\s\S]*randomUUID\(\)/,
    );
  },
);


test(
  "isolated route retains trusted cron and environment authority",
  () => {
    assert.match(
      source,
      /process\.env\.CRON_SECRET/,
    );

    assert.match(
      source,
      /request\.headers\.get\([\s\S]*"authorization"/,
    );

    assert.match(
      source,
      /"Bearer "\s*\+\s*cronSecret/,
    );

    assert.match(
      source,
      /NEXT_PUBLIC_SUPABASE_URL/,
    );

    assert.match(
      source,
      /SUPABASE_SERVICE_ROLE_KEY/,
    );

    assert.match(
      source,
      /HSPP_RECOVERY_ORGANIZATION_ID/,
    );

    assert.match(
      source,
      /HSPP_RECOVERY_LEASE_SECONDS/,
    );

    assert.match(
      source,
      /HSPP_RECOVERY_LEASE_SECONDS_MIN\s*=\s*1/,
    );

    assert.match(
      source,
      /HSPP_RECOVERY_LEASE_SECONDS_MAX\s*=\s*3600/,
    );

    assert.doesNotMatch(
      source,
      /searchParams/,
    );

    assert.doesNotMatch(
      source,
      /process\.env\.HSPP_POST_POSITIVE_LIFECYCLE_LIMIT/,
    );
  },
);


test(
  "isolated route does not bypass lifecycle authority and is scheduled once daily before recovery",
  () => {
    for (
      const forbidden of
      [
        "persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease",
        "persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease",
        "compareAndSwapHsppPostPositiveLifecycleScanState",
        "readHsppPostPositiveLifecycleFairWorkItemsV2",
        "acquireHsppAssemblyAssessmentExecutionLease",
        "releaseHsppAssemblyAssessmentExecutionLease",
        "runHsppAssemblyRecoveryCycle",
        "runHsppReservoirReevaluation",
        "runHsppReconstructionActivationCycle",
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
      );
    }

    assert.match(
      vercel,
      /"path"\s*:\s*"\/api\/hspp\/cron\/recovery"/,
    );

    const cronConfig =
      JSON.parse(
        vercel,
      );

    const cronJobs =
      Array.isArray(
        cronConfig.crons,
      )
        ? cronConfig.crons
        : [];

    const recoveryJobs =
      cronJobs.filter(
        (job) =>
          job?.path ===
          "/api/hspp/cron/recovery",
      );

    const postPositiveJobs =
      cronJobs.filter(
        (job) =>
          job?.path ===
          "/api/hspp/cron/post-positive-lifecycle",
      );

    assert.deepEqual(
      recoveryJobs,
      [
        {
          path:
            "/api/hspp/cron/recovery",

          schedule:
            "0 3 * * *",
        },
      ],
    );

    assert.deepEqual(
      postPositiveJobs,
      [
        {
          path:
            "/api/hspp/cron/post-positive-lifecycle",

          schedule:
            "0 0 * * *",
        },
      ],
    );
  },
);
