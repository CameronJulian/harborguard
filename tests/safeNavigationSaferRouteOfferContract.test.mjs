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

test(
  "safer route discovery reuses the trusted reroute endpoint",
  () => {
    assert.match(
      source,
      /\/api\/route-safety\/reroute/
    );

    assert.match(
      source,
      /saferRouteOfferRequestIdRef/
    );

    assert.match(
      source,
      /saferRouteOfferAbortControllerRef/
    );
  }
);

test(
  "offer discovery is not owned by each GPS position tick",
  () => {
    const start =
      source.indexOf(
        "One meaningful active-route threat may trigger one background"
      );

    assert.notEqual(
      start,
      -1
    );

    const end =
      source.indexOf(
        "function acceptSaferRouteOffer",
        start
      );

    assert.ok(
      end > start
    );

    const block =
      source.slice(
        start,
        end
      );

    const dependencyStart =
      block.lastIndexOf("}, [");

    assert.notEqual(
      dependencyStart,
      -1
    );

    const dependencies =
      block.slice(
        dependencyStart
      );

    assert.doesNotMatch(
      dependencies,
      /\bposition\b/
    );

    assert.match(
      block,
      /latestNavigationPositionRef\.current/
    );
  }
);

test(
  "background discovery does not change active navigation",
  () => {
    const start =
      source.indexOf(
        "One meaningful active-route threat may trigger one background"
      );

    const end =
      source.indexOf(
        "function acceptSaferRouteOffer",
        start
      );

    const block =
      source.slice(
        start,
        end
      );

    assert.doesNotMatch(
      block,
      /setRoutes\(\s*\[\s*candidate/
    );

    assert.doesNotMatch(
      block,
      /setNavigationInstructions\(\s*instructionsForRoute\(\s*candidate/
    );
  }
);

test(
  "candidate must materially diverge from the active route",
  () => {
    assert.match(
      source,
      /function routeMateriallyDiffersFromActiveRoute/
    );

    assert.match(
      source,
      /projection\.distanceFromRouteMeters\s*>\s*75/
    );

    assert.match(
      source,
      /return divergentSamples >= 2/
    );
  }
);

test(
  "customer acceptance is explicit",
  () => {
    assert.match(
      source,
      /Take Alternative Route/
    );

    assert.match(
      source,
      /function acceptSaferRouteOffer\(\)/
    );

    assert.match(
      source,
      /onClick=\{\s*acceptSaferRouteOffer\s*\}/
    );
  }
);

test(
  "accepted offer becomes active navigation",
  () => {
    const start =
      source.indexOf(
        "function acceptSaferRouteOffer"
      );

    const block =
      source.slice(
        start,
        start + 5000
      );

    assert.match(
      block,
      /setRoutes\(\s*\[\s*acceptedRoute\s*,?\s*\]\s*\)/
    );

    assert.match(
      block,
      /instructionsForRoute\(\s*acceptedRoute\s*\)/
    );
  }
);

test(
  "end navigation invalidates and clears the offer",
  () => {
    const start =
      source.indexOf(
        "function endNavigation()"
      );

    const end =
      source.indexOf(
        "async function searchDestination()",
        start
      );

    assert.ok(
      end > start
    );

    const block =
      source.slice(
        start,
        end
      );

    assert.match(
      block,
      /saferRouteOfferRequestIdRef\.current \+= 1/
    );

    assert.match(
      block,
      /saferRouteOfferAbortControllerRef\.current\?\.abort\(\)/
    );

    assert.match(
      block,
      /setSaferRouteOffer\(null\)/
    );
  }
);

test(
  "customer messaging does not invent a risk-score delta",
  () => {
    assert.match(
      source,
      /Alternative route available/
    );

    assert.match(
      source,
      /Estimated \$\{saferRouteOffer\.durationMinutes\} min from your current position/
    );

    assert.doesNotMatch(
      source,
      /Risk\s+\d+\s*(?:->|→)\s*\d+/
    );
  }
);
test(
  "evaluates all returned routes before suppressing an offer",
  () => {
    assert.match(
      source,
      /const candidatePool =/
    );

    assert.match(
      source,
      /candidatePool\.map/
    );

    assert.match(
      source,
      /evaluatedCandidates\.find/
    );

    assert.match(
      source,
      /entry\.materiallyDifferent/
    );

    assert.doesNotMatch(
      source,
      /const candidate =\s*nextRoutes\[0\]/
    );
  }
);
test(
  "does not use unsupported safer-route customer claims",
  () => {
    assert.doesNotMatch(
      source,
      /Alternative safer route available/
    );

    assert.doesNotMatch(
      source,
      /Take Safer Route/
    );

    assert.doesNotMatch(
      source,
      /Safer alternative selected/
    );

    assert.match(
      source,
      /Alternative route available/
    );

    assert.match(
      source,
      /Take Alternative Route/
    );

    assert.match(
      source,
      /Alternative route selected/
    );
  }
);