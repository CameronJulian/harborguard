import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8"
);

test(
  "safer-route decision intelligence uses only comparable route scores",
  () => {
    assert.match(
      source,
      /function saferRouteDecisionIntelligence\(/
    );

    assert.match(
      source,
      /baselineRoute\?\.safetyScore/
    );

    assert.match(
      source,
      /alternativeRoute\?\.safetyScore/
    );

    assert.match(
      source,
      /baselineRoute\?\.riskScore/
    );

    assert.match(
      source,
      /alternativeRoute\?\.riskScore/
    );

    assert.match(
      source,
      /Number\.isFinite\(baselineSafety\)/
    );

    assert.match(
      source,
      /Number\.isFinite\(alternativeSafety\)/
    );

    assert.match(
      source,
      /Number\.isFinite\(baselineRisk\)/
    );

    assert.match(
      source,
      /Number\.isFinite\(alternativeRisk\)/
    );
  }
);

test(
  "recommendation requires both higher safety and lower risk",
  () => {
    assert.match(
      source,
      /safetyImprovement > 0/
    );

    assert.match(
      source,
      /riskReduction > 0/
    );
  }
);

test(
  "customer sees quantified safety improvement and risk reduction",
  () => {
    assert.match(
      source,
      /Safer route recommended/
    );

    assert.match(
      source,
      /Safety \+/
    );

    assert.match(
      source,
      /Risk -/
    );

    assert.match(
      source,
      /hg-safer-route-decision-intelligence/
    );
  }
);

test(
  "neutral alternative presentation remains available",
  () => {
    assert.match(
      source,
      /Alternative route available/
    );
  }
);

test(
  "existing travel-time comparison remains intact",
  () => {
    assert.match(
      source,
      /alternativeRouteTimeComparisonLabel\(/
    );

    assert.match(
      source,
      /min longer than the current-path estimate/
    );

    assert.match(
      source,
      /min faster than the current-path estimate/
    );
  }
);

test(
  "driver retains explicit route control",
  () => {
    assert.match(
      source,
      /Take Alternative Route/
    );

    assert.match(
      source,
      /Keep Current Route/
    );

    assert.match(
      source,
      /function keepCurrentRoute\(\)[\s\S]*?setSaferRouteOffer\(null\)/
    );

    assert.match(
      source,
      /onClick=\{keepCurrentRoute\}/
    );
  }
);

test(
  "decision intelligence makes no unverified threat-avoidance claim",
  () => {
    assert.doesNotMatch(
      source,
      /Avoids the (?:active )?(?:threat|danger)/i
    );

    assert.doesNotMatch(
      source,
      /Avoids the high-risk area/i
    );
  }
);

test(
  "route acceptance remains deliberate",
  () => {
    assert.match(
      source,
      /function acceptSaferRouteOffer\(\)/
    );

    assert.match(
      source,
      /Take Alternative Route/
    );

    assert.doesNotMatch(
      source,
      /useEffect\([\s\S]{0,500}acceptSaferRouteOffer\(\)/
    );
  }
);