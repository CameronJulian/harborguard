import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const genericDecision =
  fs.readFileSync(
    new URL(
      "../lib/hspp/hsppAssessmentDecision.ts",
      import.meta.url
    ),
    "utf8"
  );

const traccarAssessment =
  fs.readFileSync(
    new URL(
      "../lib/hspp/assessHsppTraccarEvidence.ts",
      import.meta.url
    ),
    "utf8"
  );

const persistence =
  fs.readFileSync(
    new URL(
      "../lib/hspp/applyHsppAssessmentDecision.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "HSPP exposes a source-agnostic assessment decision contract",
  () => {
    assert.match(
      genericDecision,
      /export type HsppAssessmentDecision/
    );

    assert.match(
      genericDecision,
      /trustState:\s*HsppTrustState/
    );

    assert.match(
      genericDecision,
      /operationalEligible:\s*boolean/
    );

    assert.match(
      genericDecision,
      /crowdEligible:\s*boolean/
    );

    assert.match(
      genericDecision,
      /trainingEligible:\s*boolean/
    );

    assert.match(
      genericDecision,
      /validationEligible:\s*boolean/
    );

    assert.match(
      genericDecision,
      /policyVersion:\s*string/
    );

    assert.match(
      genericDecision,
      /reason:\s*string/
    );
  }
);

test(
  "Traccar assessment remains a provider-specific specialization",
  () => {
    assert.match(
      traccarAssessment,
      /HsppAssessmentDecision/
    );

    assert.match(
      traccarAssessment,
      /HSPP_TRACCAR_ASSESSMENT_POLICY_VERSION/
    );

    assert.match(
      traccarAssessment,
      /"plausibility_passed"/
    );
  }
);

test(
  "assessment persistence no longer depends on Traccar result types",
  () => {
    assert.match(
      persistence,
      /assessment:\s*HsppAssessmentDecision/
    );

    assert.doesNotMatch(
      persistence,
      /HsppTraccarAssessmentResult/
    );

    assert.doesNotMatch(
      persistence,
      /assessHsppTraccarEvidence/
    );
  }
);

test(
  "generic assessment persistence supports the full HSPP trust-state domain",
  () => {
    assert.match(
      persistence,
      /trustState:\s*HsppTrustState/
    );

    assert.match(
      persistence,
      /data\.trust_state as HsppTrustState/
    );
  }
);

test(
  "HSPP-008A1 does not authorize Crowd or ML usage",
  () => {
    assert.doesNotMatch(
      genericDecision,
      /crowdEligible:\s*true/
    );

    assert.doesNotMatch(
      genericDecision,
      /trainingEligible:\s*true/
    );

    assert.doesNotMatch(
      genericDecision,
      /validationEligible:\s*true/
    );
  }
);
