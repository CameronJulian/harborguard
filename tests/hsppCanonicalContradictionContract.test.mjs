import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/evaluateHsppCanonicalContradiction.ts",
    "utf8"
  );

test(
  "B11B3 defines an explicitly versioned canonical contradiction policy",
  () => {
    assert.match(
      source,
      /hspp-canonical-contradiction-v1/
    );
  }
);

test(
  "B11B3 compares provider-neutral canonical propositions",
  () => {
    for (const claim of [
      "roadBlocked",
      "trafficFlowImpacted",
      "laneRestriction",
      "roadworksPresent",
    ]) {
      assert.match(
        source,
        new RegExp(claim)
      );
    }
  }
);

test(
  "B11B3 supports AGREE UNKNOWN and CONFLICT",
  () => {
    assert.match(source, /"AGREE"/);
    assert.match(source, /"UNKNOWN"/);
    assert.match(source, /"CONFLICT"/);
  }
);

test(
  "UNKNOWN is not treated as false",
  () => {
    assert.match(
      source,
      /UNKNOWN is never interpreted as FALSE/
    );

    assert.match(
      source,
      /firstValue === "UNKNOWN"[\s\S]*secondValue === "UNKNOWN"/
    );
  }
);

test(
  "canonical conflict requires comparable conflicting claim",
  () => {
    assert.match(
      source,
      /comparison\.comparable[\s\S]*comparison\.outcome ===[\s\S]*"CONFLICT"/
    );
  }
);

test(
  "B11B3 separates no conflict from truth and authority",
  () => {
    assert.match(
      source,
      /NO_CANONICAL_CLAIM_CONFLICT is not corroboration/
    );

    assert.match(
      source,
      /NO_CANONICAL_CLAIM_CONFLICT is not physical-world truth/
    );

    assert.match(
      source,
      /grants no downstream Route Safety, Crowd or ML/
    );
  }
);

test(
  "B11B3 performs no persistence or protocol mutation",
  () => {
    assert.doesNotMatch(source, /\.from\s*\(/);
    assert.doesNotMatch(source, /\.insert\s*\(/);
    assert.doesNotMatch(source, /\.update\s*\(/);
    assert.doesNotMatch(source, /\.upsert\s*\(/);
    assert.doesNotMatch(source, /supabase/i);
  }
);
