import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/evaluateHsppEvidenceContradiction.ts",
  "utf8"
);

test(
  "B11B defines an explicitly versioned contradiction policy",
  () => {
    assert.match(
      source,
      /HSPP_EVIDENCE_CONTRADICTION_POLICY_VERSION/
    );

    assert.match(
      source,
      /hspp-evidence-contradiction-v1/
    );
  }
);

test(
  "B11B defines AGREE UNKNOWN and CONFLICT claim outcomes",
  () => {
    assert.match(source, /"AGREE"/);
    assert.match(source, /"UNKNOWN"/);
    assert.match(source, /"CONFLICT"/);
  }
);

test(
  "B11B requires B11A2 membership eligibility before comparison",
  () => {
    assert.match(
      source,
      /if \(!membership\.eligible\)/
    );

    assert.match(
      source,
      /MEMBERSHIP_NOT_ELIGIBLE/
    );

    assert.match(
      source,
      /NOT_EVALUATED/
    );
  }
);

test(
  "event type is the v1 contradiction-authoritative claim",
  () => {
    assert.match(
      source,
      /claim: "event_type"/
    );

    assert.match(
      source,
      /comparable: true/
    );

    assert.match(
      source,
      /outcome: "CONFLICT"/
    );
  }
);

test(
  "missing event type becomes UNKNOWN rather than agreement",
  () => {
    assert.match(
      source,
      /firstValue === null[\s\S]*secondValue === null/
    );

    assert.match(
      source,
      /outcome: "UNKNOWN"/
    );
  }
);

test(
  "provider-specific claims are informational only in v1",
  () => {
    for (const claim of [
      "severity",
      "title",
      "description",
      "road_name",
      "road_from",
      "road_to",
    ]) {
      assert.match(
        source,
        new RegExp(`"${claim}"`)
      );
    }

    assert.match(
      source,
      /comparable: false/
    );
  }
);

test(
  "B11B does not persist or mutate protocol state",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.insert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.update\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.upsert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.delete\s*\(/
    );
  }
);

test(
  "B11B explicitly separates no-conflict from truth or corroboration",
  () => {
    assert.match(
      source,
      /UNKNOWN is not AGREE/
    );

    assert.match(
      source,
      /NO_CONFLICT is not corroboration/
    );

    assert.match(
      source,
      /NO_CONFLICT is not truth/
    );

    assert.match(
      source,
      /NO_CONFLICT grants no downstream authority/
    );
  }
);