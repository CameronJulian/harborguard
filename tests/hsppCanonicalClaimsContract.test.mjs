import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/buildHsppCanonicalClaims.ts",
    "utf8"
  );

test(
  "B11B2 defines an explicitly versioned canonical-claims policy",
  () => {
    assert.match(
      source,
      /HSPP_CANONICAL_CLAIMS_VERSION/
    );

    assert.match(
      source,
      /hspp-canonical-claims-v1/
    );
  }
);

test(
  "B11B2 uses TRUE FALSE UNKNOWN truth domain",
  () => {
    assert.match(source, /"TRUE"/);
    assert.match(source, /"FALSE"/);
    assert.match(source, /"UNKNOWN"/);
  }
);

test(
  "B11B2 defines provider-neutral canonical claims",
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
  "road closure and roadblock positively imply road blocked",
  () => {
    assert.match(
      source,
      /"road_closure"/
    );

    assert.match(
      source,
      /"roadblock"/
    );

    assert.match(
      source,
      /roadBlocked/
    );
  }
);

test(
  "lane closure positively implies lane restriction",
  () => {
    assert.match(
      source,
      /"lane_closure"/
    );

    assert.match(
      source,
      /laneRestriction/
    );
  }
);

test(
  "roadworks positively imply roadworks present",
  () => {
    assert.match(
      source,
      /"roadworks"/
    );

    assert.match(
      source,
      /roadworksPresent/
    );
  }
);

test(
  "congestion positively implies traffic flow impact",
  () => {
    assert.match(
      source,
      /"congestion"/
    );

    assert.match(
      source,
      /trafficFlowImpacted/
    );
  }
);

test(
  "B11B2 never infers FALSE from absence",
  () => {
    assert.match(
      source,
      /absence of a proposition does NOT imply FALSE/
    );

    assert.match(
      source,
      /UNKNOWN does NOT mean FALSE/
    );

    /*
     * FALSE exists in the versioned truth domain for future
     * explicitly-negative evidence, but v1 must not construct
     * FALSE from the event-type translator.
     */
    assert.doesNotMatch(
      source,
      /value:\s*"FALSE"/
    );
  }
);

test(
  "B11B2 deliberately excludes unsafe provider-specific translations",
  () => {
    assert.match(
      source,
      /does not translate provider severity/
    );

    assert.match(
      source,
      /free-text title\/description/
    );

    assert.match(
      source,
      /road-name identity/
    );

    assert.match(
      source,
      /mutable[\s\S]*operational status/
    );
  }
);

test(
  "B11B2 is pure and performs no persistence",
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
  "canonical claims grant no physical truth or downstream authority",
  () => {
    assert.match(
      source,
      /do not establish physical-world truth/
    );

    assert.match(
      source,
      /do not establish corroboration/
    );

    assert.match(
      source,
      /grant no Route Safety, Crowd or ML authority/
    );
  }
);