import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "app/safe-navigation/page.tsx",
    "utf8"
  );

const resolve =
  fs.readFileSync(
    "app/api/route-safety/resolve/route.ts",
    "utf8"
  );

test(
  "No longer there is an explicit Safe Navigation action",
  () => {
    assert.match(
      page,
      /async function resolveActiveRouteSafetyHazard\(\)/
    );

    assert.match(
      page,
      /No longer there/
    );

    assert.match(
      page,
      /"\/api\/route-safety\/resolve"/
    );
  }
);

test(
  "resolution requires live route safety alert identity",
  () => {
    const start =
      page.indexOf(
        "async function resolveActiveRouteSafetyHazard"
      );

    const end =
      page.indexOf(
        "function acceptSaferRouteOffer",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const block =
      page.slice(start, end);

    assert.match(
      block,
      /routeSafetyAlertId/
    );

    assert.match(
      block,
      /body:\s*JSON\.stringify\(\{\s*alertId,\s*\}\)/
    );
  }
);

test(
  "resolve endpoint updates only organization's active alert",
  () => {
    assert.match(
      resolve,
      /\.from\("route_safety_alerts"\)/
    );

    assert.match(
      resolve,
      /status:\s*"resolved"/
    );

    assert.match(
      resolve,
      /\.eq\(\s*"organization_id",\s*organizationId\s*\)/
    );

    assert.match(
      resolve,
      /\.eq\("id",\s*alertId\)/
    );

    assert.match(
      resolve,
      /\.eq\("status",\s*"active"\)/
    );
  }
);

test(
  "resolution preserves source row",
  () => {
    assert.doesNotMatch(
      resolve,
      /\.delete\(\)/
    );

    assert.match(
      resolve,
      /\.update\(\{[\s\S]*status:\s*"resolved"/
    );
  }
);

test(
  "resolution does not manufacture positive intelligence",
  () => {
    assert.doesNotMatch(
      resolve,
      /verification_status:\s*"verified"/
    );

    assert.doesNotMatch(
      resolve,
      /verified_at:/
    );

    assert.doesNotMatch(
      resolve,
      /\.from\("route_intelligence"\)/
    );

    assert.doesNotMatch(
      resolve,
      /aggregate_road_risk_intelligence/
    );
  }
);

test(
  "successful resolution removes alert from local live threats",
  () => {
    const start =
      page.indexOf(
        "async function resolveActiveRouteSafetyHazard"
      );

    const end =
      page.indexOf(
        "function acceptSaferRouteOffer",
        start
      );

    const block =
      page.slice(start, end);

    assert.match(
      block,
      /setActiveRouteSafetyThreats/
    );

    assert.match(
      block,
      /\.filter\(/
    );

    assert.match(
      block,
      /routeSafetyAlertId/
    );
  }
);

test(
  "successful resolution cancels stale safer route offer",
  () => {
    const start =
      page.indexOf(
        "async function resolveActiveRouteSafetyHazard"
      );

    const end =
      page.indexOf(
        "function acceptSaferRouteOffer",
        start
      );

    const block =
      page.slice(start, end);

    assert.match(
      block,
      /saferRouteOfferAbortControllerRef\.current\?\.abort/
    );

    assert.match(
      block,
      /setSaferRouteOffer\(null\)/
    );
  }
);

test(
  "resolution remains retryable on failure",
  () => {
    assert.match(
      page,
      /Try clear again/
    );

    assert.match(
      page,
      /Could not clear hazard\./
    );
  }
);

test(
  "resolution is locally one-shot",
  () => {
    assert.match(
      page,
      /hazardResolutionInFlightRef/
    );

    assert.match(
      page,
      /resolvedHazardAlertIdsRef/
    );

    assert.match(
      page,
      /resolvedHazardAlertIdsRef\.current\.add/
    );
  }
);

test(
  "positive confirmation remains available",
  () => {
    assert.match(
      page,
      /Still there/
    );

    assert.match(
      page,
      /confirmActiveRouteSafetyHazard/
    );

    assert.match(
      page,
      /Thanks - hazard confirmed/
    );
  }
);

test(
  "hazard resolution does not replace navigation route state",
  () => {
    const start =
      page.indexOf(
        "async function resolveActiveRouteSafetyHazard"
      );

    const end =
      page.indexOf(
        "function acceptSaferRouteOffer",
        start
      );

    const block =
      page.slice(start, end);

    assert.doesNotMatch(
      block,
      /setSelectedRoute/
    );

    assert.doesNotMatch(
      block,
      /setRoutes/
    );

    assert.doesNotMatch(
      block,
      /setRoutingDestination/
    );

    assert.doesNotMatch(
      block,
      /setNavigationInstructions/
    );
  }
);