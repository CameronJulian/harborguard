import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    new URL(
      "../app/api/hspp/cron/recovery/route.ts",
      import.meta.url
    ),
    "utf8"
  );

const routeStart =
  source.indexOf(
    "export async function GET"
  );

assert.ok(
  routeStart >= 0,
  "HSPP recovery GET route must exist"
);

const routeBody =
  source.slice(
    routeStart
  );


test(
  "HSPP recovery imports the shared scheduled-worker state helper",
  () => {
    assert.match(
      source,
      /import\s*\{\s*recordScheduledWorkerState\s*,?\s*\}\s*from\s*["']@\/lib\/server\/recordScheduledWorkerState["']/
    );

    const wrapperStart =
      source.indexOf(
        "async function recordHsppRecoveryWorkerState"
      );

    assert.ok(
      wrapperStart >= 0
    );

    const wrapper =
      source.slice(
        wrapperStart,
        routeStart
      );

    assert.match(
      wrapper,
      /workerKey:\s*["']hspp-recovery["']/
    );

    assert.match(
      wrapper,
      /await\s+recordScheduledWorkerState\s*\(/
    );
  }
);


test(
  "HSPP recovery starts worker health only after trusted organization validation",
  () => {
    const organizationValidation =
      routeBody.indexOf(
        "if (!organization)"
      );

    const trustedContext =
      routeBody.indexOf(
        "const trustedWorkerContext"
      );

    const contextPublish =
      routeBody.indexOf(
        "workerContext =",
        trustedContext
      );

    const started =
      routeBody.indexOf(
        '"started"',
        trustedContext
      );

    const recoveryCycle =
      routeBody.indexOf(
        "await runHsppAssemblyRecoveryCycle"
      );

    assert.ok(
      organizationValidation >= 0
    );

    assert.ok(
      trustedContext >
        organizationValidation
    );

    assert.ok(
      contextPublish >
        trustedContext
    );

    assert.ok(
      started >
        contextPublish
    );

    assert.ok(
      recoveryCycle >
        started
    );

    const startedCalls =
      routeBody.match(
        /recordHsppRecoveryWorkerState\s*\(\s*trustedWorkerContext\s*,\s*"started"\s*\)/g
      ) ?? [];

    assert.equal(
      startedCalls.length,
      1
    );
  }
);


test(
  "HSPP recovery records completion before its final HTTP response",
  () => {
    const sealedFailed =
      routeBody.indexOf(
        "const sealedFailed"
      );

    const succeeded =
      routeBody.indexOf(
        '"succeeded"',
        sealedFailed
      );

    const response =
      routeBody.indexOf(
        "return NextResponse.json({",
        succeeded
      );

    assert.ok(
      sealedFailed >= 0
    );

    assert.ok(
      succeeded >
        sealedFailed
    );

    assert.ok(
      response >
        succeeded
    );

    const succeededCalls =
      routeBody.match(
        /recordHsppRecoveryWorkerState\s*\(\s*trustedWorkerContext\s*,\s*"succeeded"\s*\)/g
      ) ?? [];

    assert.equal(
      succeededCalls.length,
      1
    );
  }
);


test(
  "HSPP recovery records worker failure only at the outer fatal boundary",
  () => {
    const failedCalls =
      routeBody.match(
        /recordHsppRecoveryWorkerState\s*\(\s*workerContext\s*,\s*"failed"\s*,\s*errorMessage\s*\(\s*error\s*\)\s*\)/g
      ) ?? [];

    assert.equal(
      failedCalls.length,
      1
    );

    const outerCatch =
      routeBody.lastIndexOf(
        "catch (error: unknown)"
      );

    assert.ok(
      outerCatch >= 0
    );

    const beforeOuterCatch =
      routeBody.slice(
        0,
        outerCatch
      );

    const outerSource =
      routeBody.slice(
        outerCatch
      );

    assert.doesNotMatch(
      beforeOuterCatch,
      /recordHsppRecoveryWorkerState\s*\(\s*workerContext\s*,\s*"failed"/
    );

    assert.match(
      outerSource,
      /if\s*\(\s*workerContext\s*\)[\s\S]*?recordHsppRecoveryWorkerState\s*\([\s\S]*?"failed"[\s\S]*?errorMessage\s*\(\s*error\s*\)/
    );

    assert.match(
      outerSource,
      /Sentry\.captureException\s*\(\s*error\s*,/
    );

    assert.match(
      outerSource,
      /status:\s*500/
    );
  }
);


test(
  "isolated HSPP subfailures do not become worker-fatal events",
  () => {
    for (const marker of [
      "Q14ag5 B07B failure isolation remains active",
      "Initial-H1 activation remains operationally isolated",
      "Q14ag32B deliberately propagates fatal consumer/read",
      "PAIR activation is an independently isolated lifecycle attempt",
    ]) {
      assert.match(
        source,
        new RegExp(
          marker.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
        )
      );
    }

    const outerCatch =
      routeBody.lastIndexOf(
        "catch (error: unknown)"
      );

    assert.ok(
      outerCatch >= 0
    );

    const beforeOuterCatch =
      routeBody.slice(
        0,
        outerCatch
      );

    assert.doesNotMatch(
      beforeOuterCatch,
      /recordHsppRecoveryWorkerState\s*\(\s*workerContext\s*,\s*"failed"/
    );
  }
);


test(
  "worker-state persistence remains non-authoritative to HSPP execution",
  () => {
    const wrapperStart =
      source.indexOf(
        "async function recordHsppRecoveryWorkerState"
      );

    assert.ok(
      wrapperStart >= 0
    );

    assert.ok(
      routeStart >
        wrapperStart
    );

    const wrapper =
      source.slice(
        wrapperStart,
        routeStart
      );

    assert.match(
      wrapper,
      /try\s*\{[\s\S]*?await recordScheduledWorkerState/
    );

    assert.match(
      wrapper,
      /catch\s*\(\s*workerStateError:\s*unknown\s*\)/
    );

    assert.match(
      wrapper,
      /boundary:\s*["']worker-state["']/
    );

    assert.match(
      wrapper,
      /console\.error\s*\(\s*["']\[hspp recovery cron worker-state\]["']/
    );

    assert.doesNotMatch(
      wrapper,
      /\b(?:leaseToken|leaseOwner|executionId|attemptId|processingState|completionState|retryIdentity)\b/
    );
  }
);


test(
  "pre-worker configuration failures cannot fabricate worker executions",
  () => {
    const trustedContext =
      routeBody.indexOf(
        "const trustedWorkerContext"
      );

    assert.ok(
      trustedContext >= 0
    );

    const beforeWorkerContext =
      routeBody.slice(
        0,
        trustedContext
      );

    assert.match(
      beforeWorkerContext,
      /CRON_SECRET is not configured/
    );

    assert.match(
      beforeWorkerContext,
      /Unauthorized cron request/
    );

    assert.match(
      beforeWorkerContext,
      /Supabase service-role configuration is incomplete/
    );

    assert.match(
      beforeWorkerContext,
      /HSPP_RECOVERY_ORGANIZATION_ID is not configured/
    );

    assert.match(
      beforeWorkerContext,
      /HSPP_RECOVERY_ORGANIZATION_ID does not match an organization/
    );

    assert.doesNotMatch(
      beforeWorkerContext,
      /recordHsppRecoveryWorkerState\s*\(/
    );
  }
);