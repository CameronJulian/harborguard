import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(
  new URL(
    "../app/safe-navigation/page.tsx",
    import.meta.url
  )
);

const source =
  fs.readFileSync(
    pagePath,
    "utf8"
  );

function incrementBlock() {
  const start =
    source.indexOf(
      "CUSTOMER INCREMENT #4"
    );

  assert.notEqual(
    start,
    -1,
    "Increment #4 marker must exist"
  );

  return source.slice(
    start,
    start + 7000
  );
}

test(
  "comparison baseline comes from the same current-position reroute response",
  () => {
    const block =
      incrementBlock();

    assert.match(
      block,
      /const baselineRoute[\s\S]*evaluatedCandidates\.find/
    );

    assert.match(
      block,
      /!entry\.materiallyDifferent/
    );

    assert.match(
      block,
      /entry\.materiallyDifferent/
    );

    assert.match(
      block,
      /baselineRoute,/
    );
  }
);

test(
  "alternative offer retains explicit customer acceptance",
  () => {
    assert.match(
      source,
      /function acceptSaferRouteOffer\(\)/
    );

    assert.match(
      source,
      /Take Alternative Route/
    );

    assert.match(
      source,
      /onClick=\{\s*acceptSaferRouteOffer\s*\}/
    );
  }
);

test(
  "comparison shows current path and alternative without auto switching",
  () => {
    assert.match(
      source,
      /Fresh comparison from your current position/
    );

    assert.match(
      source,
      />\s*Current path\s*</
    );

    assert.match(
      source,
      />\s*Alternative\s*</
    );

    assert.match(
      source,
      /durationLabel\(\s*saferRouteOffer\.baselineRoute\s*\)/
    );

    assert.match(
      source,
      /durationLabel\(\s*saferRouteOffer\.route\s*\)/
    );

    assert.match(
      source,
      /distanceLabel\(\s*saferRouteOffer\.baselineRoute\s*\)/
    );

    assert.match(
      source,
      /distanceLabel\(\s*saferRouteOffer\.route\s*\)/
    );
  }
);

test(
  "safety and risk are compared only when both routes contain values",
  () => {
    assert.match(
      source,
      /baselineRoute[\s\S]*\.safetyScore != null[\s\S]*saferRouteOffer\.route[\s\S]*\.safetyScore != null/
    );

    assert.match(
      source,
      /baselineRoute[\s\S]*\.riskScore != null[\s\S]*saferRouteOffer\.route[\s\S]*\.riskScore != null/
    );

    assert.match(
      source,
      /matchedRiskSegmentLabel\(\s*saferRouteOffer\.baselineRoute\s*\)/
    );

    assert.match(
      source,
      /matchedRiskSegmentLabel\(\s*saferRouteOffer\.route\s*\)/
    );
  }
);

test(
  "time delta is derived from route durations rather than invented",
  () => {
    assert.match(
      source,
      /function alternativeRouteTimeComparisonLabel/
    );

    assert.match(
      source,
      /routeDurationMinutes\(\s*baselineRoute\s*\)/
    );

    assert.match(
      source,
      /routeDurationMinutes\(\s*alternativeRoute\s*\)/
    );

    assert.match(
      source,
      /differenceMinutes/
    );
  }
);

test(
  "comparison copy does not claim the alternative is safer",
  () => {
    const comparisonStart =
      source.indexOf(
        'className="hg-alternative-route-comparison"'
      );

    assert.notEqual(
      comparisonStart,
      -1
    );

    const comparisonBlock =
      source.slice(
        comparisonStart,
        comparisonStart + 9000
      );

    assert.doesNotMatch(
      comparisonBlock,
      /\bsafer\b/i
    );

    assert.doesNotMatch(
      comparisonBlock,
      /lower risk/i
    );

    assert.doesNotMatch(
      comparisonBlock,
      /higher safety/i
    );

    assert.doesNotMatch(
      comparisonBlock,
      /recommended/i
    );
  }
);

test(
  "legacy fallback remains when no same-origin baseline route exists",
  () => {
    assert.match(
      source,
      /saferRouteOffer\.baselineRoute \?/
    );

    assert.match(
      source,
      /Estimated \$\{saferRouteOffer\.durationMinutes\} min from your current position/
    );

    assert.match(
      source,
      /Fresh route calculated from your current position/
    );
  }
);