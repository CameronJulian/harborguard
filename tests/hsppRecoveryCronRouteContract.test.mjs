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
  "Q13g creates no scheduler or H1 to H2 reconstruction authority",
  () => {
    assert.match(
      source,
      /does not schedule itself/
    );

    assert.match(
      source,
      /does not implement H1 -> H2 reconstruction/
    );

    assert.doesNotMatch(
      source,
      /vercel\.json/
    );
  }
);
test(
  "Q14ag5 activates one bounded B07B shadow evaluation after Q13f recovery",
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
  "Q14ag5 keeps B07C2 Reservoir persistence dormant",
  () => {
    assert.doesNotMatch(
      source,
      /\bpersistHsppReservoirAssemblyCandidate\s*\(/
    );

    assert.match(
      source,
      /does not invoke B07C2 or persist Reservoir assembly candidates/
    );
  }
);


test(
  "Q14ag5 isolates B07B shadow failure from Q13f recovery",
  () => {
    assert.match(
      source,
      /const reservoir\s*=[\s\S]*?try\s*\{[\s\S]*?await runHsppReservoirReevaluation[\s\S]*?catch\s*\(\s*error:\s*unknown\s*\)/
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
  "Q14ag5 exposes only bounded Reservoir shadow summary fields",
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
      /reservoir,\s*[\r\n]+\s*outcomes:/
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
