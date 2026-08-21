import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppCanonicalClaims,
} from "../lib/hspp/buildHsppCanonicalClaims";

test(
  "road closure positively asserts road blocked",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "road_closure",
      });

    assert.equal(
      claims.roadBlocked.value,
      "TRUE"
    );

    assert.equal(
      claims.roadBlocked.basis,
      "EVENT_TYPE"
    );
  }
);

test(
  "roadblock positively asserts road blocked",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "roadblock",
      });

    assert.equal(
      claims.roadBlocked.value,
      "TRUE"
    );
  }
);

test(
  "lane closure positively asserts lane restriction",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "lane_closure",
      });

    assert.equal(
      claims.laneRestriction.value,
      "TRUE"
    );
  }
);

test(
  "roadworks positively assert roadworks present",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "roadworks",
      });

    assert.equal(
      claims.roadworksPresent.value,
      "TRUE"
    );
  }
);

test(
  "congestion positively asserts traffic-flow impact",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "congestion",
      });

    assert.equal(
      claims.trafficFlowImpacted.value,
      "TRUE"
    );
  }
);

test(
  "event type normalization is case and whitespace insensitive",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          " ROAD_CLOSURE ",
      });

    assert.equal(
      claims.normalizedEventType,
      "road_closure"
    );

    assert.equal(
      claims.roadBlocked.value,
      "TRUE"
    );
  }
);

test(
  "accident does not imply that the road is open",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "accident",
      });

    assert.equal(
      claims.roadBlocked.value,
      "UNKNOWN"
    );
  }
);

test(
  "congestion does not imply road closure",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "congestion",
      });

    assert.equal(
      claims.roadBlocked.value,
      "UNKNOWN"
    );

    assert.equal(
      claims.trafficFlowImpacted.value,
      "TRUE"
    );
  }
);

test(
  "missing event type produces only unknown canonical claims",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          null,
      });

    assert.equal(
      claims.normalizedEventType,
      null
    );

    for (const claim of [
      claims.roadBlocked,
      claims.trafficFlowImpacted,
      claims.laneRestriction,
      claims.roadworksPresent,
    ]) {
      assert.equal(
        claim.value,
        "UNKNOWN"
      );

      assert.equal(
        claim.basis,
        "NO_AUTHORIZED_BASIS"
      );
    }
  }
);

test(
  "unknown event type fails closed",
  () => {
    const claims =
      buildHsppCanonicalClaims({
        eventType:
          "future_provider_type",
      });

    assert.equal(
      claims.roadBlocked.value,
      "UNKNOWN"
    );

    assert.equal(
      claims.trafficFlowImpacted.value,
      "UNKNOWN"
    );

    assert.equal(
      claims.laneRestriction.value,
      "UNKNOWN"
    );

    assert.equal(
      claims.roadworksPresent.value,
      "UNKNOWN"
    );
  }
);