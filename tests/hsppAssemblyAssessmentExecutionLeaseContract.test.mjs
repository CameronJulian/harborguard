import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    new URL(
      "../lib/hspp/hsppAssemblyAssessmentExecutionLease.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Q13e3 runtime owns exactly the three lease RPC boundaries",
  () => {
    assert.match(
      source,
      /acquire_hspp_assembly_assessment_execution_lease/,
    );

    assert.match(
      source,
      /renew_hspp_assembly_assessment_execution_lease/,
    );

    assert.match(
      source,
      /release_hspp_assembly_assessment_execution_lease/,
    );

    assert.equal(
      (source.match(/\.rpc\s*\(/g) ?? []).length,
      3,
    );
  },
);

test(
  "Q13e3 runtime has no direct table mutation path",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/,
    );
  },
);

test(
  "Q13e3 runtime does not execute assessment or completion",
  () => {
    assert.doesNotMatch(
      source,
      /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting/,
    );

    assert.doesNotMatch(
      source,
      /recordHsppAssemblyAssessmentCompletion/,
    );

    assert.doesNotMatch(
      source,
      /claimHsppAssemblyAssessmentRetryIdentity/,
    );
  },
);

test(
  "Q13e3 runtime does not generate lease ownership or wall clock",
  () => {
    assert.doesNotMatch(
      source,
      /randomUUID\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /Date\.now\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /new\s+Date\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /toISOString\s*\(/,
    );
  },
);

test(
  "Q13e3 runtime treats Date.parse only as persisted timestamp validation",
  () => {
    assert.match(
      source,
      /Date\.parse\s*\(/,
    );

    assert.match(
      source,
      /must be a valid persisted date-time string/,
    );
  },
);

test(
  "Q13e3 busy ownership never exposes another token",
  () => {
    assert.match(
      source,
      /BUSY HSPP execution lease must not expose the current owner token/,
    );

    assert.match(
      source,
      /leaseToken:\s*null/,
    );
  },
);

test(
  "Q13e3 exact-owner token is mandatory on acquire renew and release",
  () => {
    assert.match(
      source,
      /p_lease_token/,
    );

    assert.match(
      source,
      /exact caller-owned token/,
    );
  },
);

test(
  "Q13e3 runtime contains no mutable HSPP trust semantics",
  () => {
    assert.doesNotMatch(
      source,
      /operationalEligible/,
    );

    assert.doesNotMatch(
      source,
      /crowdEligible/,
    );

    assert.doesNotMatch(
      source,
      /trainingEligible/,
    );

    assert.doesNotMatch(
      source,
      /validationEligible/,
    );

    assert.doesNotMatch(
      source,
      /trustState/,
    );
  },
);
