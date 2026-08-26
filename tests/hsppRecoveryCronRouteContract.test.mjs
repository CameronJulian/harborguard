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


test(
  "Q13g recovery route is protected by HarborGuard cron authorization",
  () => {
    assert.match(
      source,
      /process\.env\.CRON_SECRET/
    );

    assert.match(
      source,
      /request\.headers\.get\(\s*"authorization"\s*\)/
    );

    assert.match(
      source,
      /`Bearer \$\{cronSecret\}`/
    );

    assert.match(
      source,
      /Unauthorized cron request/
    );
  }
);


test(
  "Q13g recovery route uses a non-persistent service-role Supabase client",
  () => {
    assert.match(
      source,
      /NEXT_PUBLIC_SUPABASE_URL/
    );

    assert.match(
      source,
      /SUPABASE_SERVICE_ROLE_KEY/
    );

    assert.match(
      source,
      /persistSession:\s*false/
    );

    assert.match(
      source,
      /autoRefreshToken:\s*false/
    );
  }
);


test(
  "Q13g recovery route uses one explicit server-controlled HSPP organization",
  () => {
    assert.match(
      source,
      /HSPP_RECOVERY_ORGANIZATION_ID/
    );

    assert.match(
      source,
      /\.from\(\s*"organizations"\s*\)/
    );

    assert.match(
      source,
      /\.select\(\s*"id"\s*\)/
    );

    assert.match(
      source,
      /\.eq\(\s*"id",\s*organizationId\s*\)/
    );

    assert.match(
      source,
      /\.maybeSingle\(\)/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"organizationId"\s*\)/
    );
  }
);


test(
  "Q13g requires an explicit recovery limit within the Q13b bound",
  () => {
    assert.match(
      source,
      /HSPP_RECOVERY_LIMIT/
    );

    assert.match(
      source,
      /HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT/
    );

    assert.match(
      source,
      /const HSPP_RECOVERY_LIMIT_MIN\s*=\s*1/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"limit"\s*\)/
    );
  }
);


test(
  "Q13g requires an explicit execution lease duration within the Q13e3 bound",
  () => {
    assert.match(
      source,
      /HSPP_RECOVERY_LEASE_SECONDS/
    );

    assert.match(
      source,
      /const HSPP_RECOVERY_LEASE_SECONDS_MIN\s*=\s*1/
    );

    assert.match(
      source,
      /const HSPP_RECOVERY_LEASE_SECONDS_MAX\s*=\s*3600/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"leaseSeconds"\s*\)/
    );
  }
);


test(
  "Q13g owns assessment-time and lease-token generation at the machine boundary",
  () => {
    assert.match(
      source,
      /from\s+"node:crypto"/
    );

    assert.match(
      source,
      /createProposedAssessedAt\(\)[\s\S]*new Date\(\)[\s\S]*\.toISOString\(\)/
    );

    assert.match(
      source,
      /createLeaseToken\(\)[\s\S]*randomUUID\(\)/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"proposedAssessedAt"\s*\)/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"leaseToken"\s*\)/
    );
  }
);


test(
  "Q13g delegates lifecycle execution to the Q13f recovery cycle",
  () => {
    assert.match(
      source,
      /runHsppAssemblyRecoveryCycle/
    );

    assert.match(
      source,
      /await\s+runHsppAssemblyRecoveryCycle\s*\(/
    );

    assert.match(
      source,
      /organizationId,[\s\S]*limit:[\s\S]*recoveryLimit,[\s\S]*leaseSeconds/
    );
  }
);


test(
  "Q13g returns bounded summaries instead of serializing internal recovery state directly",
  () => {
    assert.match(
      source,
      /const openResults\s*=[\s\S]*cycle\.openResults\.map/
    );

    assert.match(
      source,
      /const sealedResults\s*=[\s\S]*cycle\.sealedResults\.map/
    );

    assert.match(
      source,
      /assemblyId:[\s\S]*result\.workItem\.assemblyId/
    );

    assert.match(
      source,
      /branch:[\s\S]*result\.branch/
    );

    assert.match(
      source,
      /results:\s*\{[\s\S]*open:[\s\S]*openResults,[\s\S]*sealed:[\s\S]*sealedResults/
    );

    assert.doesNotMatch(
      source,
      /leaseToken:\s*result/
    );
  }
);


test(
  "Q13g remains scheduler-free and delegates H1 to H2 reconstruction activation",
  () => {
    assert.match(
      source,
      /does not schedule itself/
    );

    assert.match(
      source,
      /delegates H1 -> H2 reconstruction activation to Q14ag32B/
    );

    assert.match(
      source,
      /does not implement H1 -> H2 reconstruction logic itself/
    );

    assert.match(
      source,
      /runHsppReconstructionActivationCycle/
    );

    assert.doesNotMatch(
      source,
      /vercel\.json/
    );
  }
);
test(
  "Q14ag5 preserves one bounded B07B evaluation after Q13f recovery",
  () => {
    const q13fIndex =
      source.indexOf(
        "await runHsppAssemblyRecoveryCycle"
      );

    const b07bIndex =
      source.indexOf(
        "await runHsppReservoirReevaluation"
      );

    assert.ok(q13fIndex >= 0);

    assert.ok(
      b07bIndex > q13fIndex
    );

    const calls =
      source.match(
        /await\s+runHsppReservoirReevaluation\s*\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      1
    );

    assert.match(
      source,
      /runHsppReservoirReevaluation\s*\(\s*\{[\s\S]*?supabase,[\s\S]*?organizationId,[\s\S]*?limit:\s*recoveryLimit,[\s\S]*?\}\s*\)/
    );
  }
);


test(
  "Q14ag5 activates B07C2 only behind deterministic lifecycle routing",
  () => {
    assert.match(
      source,
      /\bresolveHsppReconstructionClaimMaterial\s*\(/
    );

    assert.match(
      source,
      /\bresolveHsppReservoirLifecycleRoute\s*\(/
    );

    assert.match(
      source,
      /route\.state\s*!==[\s\S]*?"INITIAL_ASSEMBLY"/
    );

    const calls =
      source.match(
        /await\s+persistHsppReservoirAssemblyCandidate\s*\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      1
    );

    const reconstructionMaterialIndex =
      source.indexOf(
        "resolveHsppReconstructionClaimMaterial({"
      );

    const lifecycleRouteIndex =
      source.indexOf(
        "resolveHsppReservoirLifecycleRoute({"
      );

    const b07c2Index =
      source.indexOf(
        "await persistHsppReservoirAssemblyCandidate({"
      );

    assert.ok(
      reconstructionMaterialIndex >=
        0
    );

    assert.ok(
      lifecycleRouteIndex >
        reconstructionMaterialIndex
    );

    assert.ok(
      b07c2Index >
        lifecycleRouteIndex
    );
  }
);


test(
  "Q14ag5 isolates B07B failure from Q13f recovery",
  () => {
    assert.match(
      source,
      /const reservoirRun\s*=[\s\S]*?try\s*\{[\s\S]*?await runHsppReservoirReevaluation[\s\S]*?catch\s*\(\s*error:\s*unknown\s*\)/
    );

    assert.match(
      source,
      /status:\s*"EVALUATED"\s+as const/
    );

    assert.match(
      source,
      /status:\s*"ERROR"\s+as const/
    );

    assert.match(
      source,
      /error:\s*errorMessage\s*\(\s*error\s*\)/
    );
  }
);


test(
  "Q14ag5 exposes only bounded Reservoir summary fields",
  () => {
    for (const field of [
      "runnerVersion",
      "discoveryPolicyVersion",
      "reevaluationPolicyVersion",
      "discovered",
      "reevaluationState",
      "assemblyCandidateCount",
    ]) {
      assert.match(
        source,
        new RegExp(`\\b${field}\\b`)
      );
    }

    assert.match(
      source,
      /reservoir,\s*[\r\n]+\s*lifecycle,\s*[\r\n]+\s*outcomes:/
    );

    assert.doesNotMatch(
      source,
      /\breservoir:\s*lifeguard\b/
    );

    assert.doesNotMatch(
      source,
      /\bselectedEvidenceIds\b/
    );

    assert.doesNotMatch(
      source,
      /\boperationalRead\b/
    );
  }
);

const q14ag32dExecutableSource =
  source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    )
    .replace(
      /\/\/.*$/gm,
      ""
    );


test(
  "Q14ag32D executes Q13f then one B07B snapshot then at most one Q14ag32B activation",
  () => {
    const q13fIndex =
      q14ag32dExecutableSource.indexOf(
        "await runHsppAssemblyRecoveryCycle"
      );

    const b07bIndex =
      q14ag32dExecutableSource.indexOf(
        "await runHsppReservoirReevaluation"
      );

    const activationIndex =
      q14ag32dExecutableSource.indexOf(
        "await runHsppReconstructionActivationCycle"
      );

    assert.ok(
      q13fIndex >= 0
    );

    assert.ok(
      b07bIndex >
        q13fIndex
    );

    assert.ok(
      activationIndex >
        b07bIndex
    );

    const b07bCalls =
      q14ag32dExecutableSource.match(
        /await\s+runHsppReservoirReevaluation\s*\(/g
      ) ?? [];

    const activationCalls =
      q14ag32dExecutableSource.match(
        /await\s+runHsppReconstructionActivationCycle\s*\(/g
      ) ?? [];

    assert.equal(
      b07bCalls.length,
      1
    );

    assert.equal(
      activationCalls.length,
      1
    );
  }
);


test(
  "Q14ag32D passes the same retained B07B snapshot and a cron-owned proposed child UUID",
  () => {
    assert.match(
      source,
      /const\s+reconstructionSnapshot\s*=\s*reservoirRun\.reevaluationResult/
    );

    assert.match(
      source,
      /runHsppReconstructionActivationCycle\s*\(\s*\{[\s\S]*?supabase,[\s\S]*?organizationId,[\s\S]*?reevaluationResult:\s*reconstructionSnapshot,[\s\S]*?proposedChildAssemblyId:\s*randomUUID\s*\(\s*\)/
    );

    const uuidCalls =
      q14ag32dExecutableSource.match(
        /\brandomUUID\s*\(/g
      ) ?? [];

    assert.equal(
      uuidCalls.length,
      2
    );
  }
);


test(
  "Q14ag32D never bypasses the outer activation orchestrator",
  () => {
    for (
      const functionName of
      [
        "runHsppReconstructionExecutionIntentClaim",
        "runHsppReconstructionExecutionIntentCycle",
        "runHsppReconstructionExecutionIntent",
        "persistHsppEvidenceAssemblyReconstruction",
      ]
    ) {
      assert.doesNotMatch(
        q14ag32dExecutableSource,
        new RegExp(
          `\\b${functionName}\\s*\\(`
        )
      );
    }
  }
);


test(
  "Q14ag32D skips activation when B07B cannot provide a real snapshot",
  () => {
    assert.match(
      source,
      /reevaluationResult:\s*null/
    );

    assert.match(
      source,
      /const\s+reconstructionSnapshot\s*=\s*reservoirRun\.reevaluationResult/
    );

    assert.match(
      source,
      /reconstructionSnapshot\s*===\s*null[\s\S]*?"SKIPPED_NO_B07B_SNAPSHOT"/
    );

    assert.match(
      source,
      /Q14ag32D also refuses to fabricate a B07B snapshot/
    );
  }
);


test(
  "Q14ag32D isolates fatal Q14ag32B errors without changing completed Q13f HTTP success",
  () => {
    assert.match(
      source,
      /const\s+reconstruction\s*=[\s\S]*?runHsppReconstructionActivationCycle[\s\S]*?catch\s*\(\s*error:\s*unknown\s*\)[\s\S]*?status:\s*"ERROR"\s+as\s+const[\s\S]*?error:\s*errorMessage\s*\(\s*error\s*\)/
    );

    assert.match(
      source,
      /success:\s*openFailed\s*===\s*0\s*&&\s*sealedFailed\s*===\s*0/
    );
  }
);


test(
  "Q14ag32D exposes only a bounded reconstruction summary",
  () => {
    for (
      const field of
      [
        "status",
        "runnerVersion",
        "producerSuccess",
        "producerState",
        "consumerState",
        "consumerSelectedCount",
        "consumerSucceededCount",
        "consumerFailedCount",
        "consumerHasMore",
        "error",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `\\b${field}\\b`
        )
      );
    }

    const responseStart =
      source.lastIndexOf(
        "return NextResponse.json({"
      );

    assert.ok(
      responseStart >=
        0
    );

    const outerCatch =
      source.indexOf(
        "\n  catch (error: unknown) {",
        responseStart
      );

    assert.ok(
      outerCatch >
        responseStart
    );

    const response =
      source.slice(
        responseStart,
        outerCatch
      );

    assert.match(
      response,
      /\breservoir\s*,/
    );

    assert.match(
      response,
      /\breconstruction\s*,/
    );

    for (
      const forbidden of
      [
        /reevaluationResult/,
        /reconstructionSnapshot/,
        /activationPolicy/,
        /\bproducer\s*:/,
        /\bconsumer\s*:/,
        /\bclaim\s*:/,
        /\bintents\s*:/,
        /\.outcomes\b/,
      ]
    ) {
      assert.doesNotMatch(
        response,
        forbidden
      );
    }
  }
);
