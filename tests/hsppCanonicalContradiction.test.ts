import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppCanonicalClaims,
  type HsppCanonicalClaimSet,
} from "../lib/hspp/buildHsppCanonicalClaims";

import {
  compareHsppCanonicalClaim,
  evaluateHsppCanonicalContradiction,
} from "../lib/hspp/evaluateHsppCanonicalContradiction";

test(
  "same positive canonical proposition agrees",
  () => {
    const first =
      buildHsppCanonicalClaims({
        eventType: "road_closure",
      });

    const second =
      buildHsppCanonicalClaims({
        eventType: "roadblock",
      });

    const decision =
      evaluateHsppCanonicalContradiction(
        first,
        second
      );

    const roadBlocked =
      decision.comparisons.find(
        (comparison) =>
          comparison.claim ===
          "roadBlocked"
      );

    assert.ok(roadBlocked);

    assert.equal(
      roadBlocked.outcome,
      "AGREE"
    );

    assert.equal(
      roadBlocked.comparable,
      true
    );

    assert.equal(
      decision.contradictory,
      false
    );
  }
);

test(
  "different raw event types do not automatically conflict",
  () => {
    const first =
      buildHsppCanonicalClaims({
        eventType: "road_closure",
      });

    const second =
      buildHsppCanonicalClaims({
        eventType: "roadblock",
      });

    const decision =
      evaluateHsppCanonicalContradiction(
        first,
        second
      );

    assert.equal(
      decision.contradictory,
      false
    );

    assert.equal(
      decision.reason,
      "NO_CANONICAL_CLAIM_CONFLICT"
    );
  }
);

test(
  "unknown canonical proposition remains unknown",
  () => {
    const first =
      buildHsppCanonicalClaims({
        eventType: "accident",
      });

    const second =
      buildHsppCanonicalClaims({
        eventType: "road_closure",
      });

    const comparison =
      compareHsppCanonicalClaim(
        "roadBlocked",
        first.roadBlocked,
        second.roadBlocked
      );

    assert.equal(
      comparison.firstValue,
      "UNKNOWN"
    );

    assert.equal(
      comparison.secondValue,
      "TRUE"
    );

    assert.equal(
      comparison.outcome,
      "UNKNOWN"
    );

    assert.equal(
      comparison.comparable,
      false
    );
  }
);

test(
  "unknown does not become false or contradiction",
  () => {
    const first =
      buildHsppCanonicalClaims({
        eventType: "accident",
      });

    const second =
      buildHsppCanonicalClaims({
        eventType: "roadworks",
      });

    const decision =
      evaluateHsppCanonicalContradiction(
        first,
        second
      );

    assert.equal(
      decision.contradictory,
      false
    );
  }
);

test(
  "explicit true versus false canonical values conflict",
  () => {
    const first =
      buildHsppCanonicalClaims({
        eventType: "road_closure",
      });

    const second:
      HsppCanonicalClaimSet = {
        ...buildHsppCanonicalClaims({
          eventType: "unknown",
        }),

        roadBlocked: {
          value: "FALSE",
          basis: "EVENT_TYPE",
        },
      };

    const decision =
      evaluateHsppCanonicalContradiction(
        first,
        second
      );

    const roadBlocked =
      decision.comparisons.find(
        (comparison) =>
          comparison.claim ===
          "roadBlocked"
      );

    assert.ok(roadBlocked);

    assert.equal(
      roadBlocked.outcome,
      "CONFLICT"
    );

    assert.equal(
      roadBlocked.comparable,
      true
    );

    assert.equal(
      decision.contradictory,
      true
    );

    assert.equal(
      decision.reason,
      "CANONICAL_CLAIM_CONFLICT"
    );
  }
);

test(
  "canonical comparison is deterministic",
  () => {
    const first =
      buildHsppCanonicalClaims({
        eventType: "roadworks",
      });

    const second =
      buildHsppCanonicalClaims({
        eventType: "congestion",
      });

    assert.deepEqual(
      evaluateHsppCanonicalContradiction(
        first,
        second
      ),
      evaluateHsppCanonicalContradiction(
        first,
        second
      )
    );
  }
);
