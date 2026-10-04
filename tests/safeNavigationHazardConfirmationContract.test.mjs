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

const predictPath = fileURLToPath(
  new URL(
    "../app/api/route-safety/predict/route.ts",
    import.meta.url
  )
);

const page =
  fs.readFileSync(
    pagePath,
    "utf8"
  );

const predict =
  fs.readFileSync(
    predictPath,
    "utf8"
  );

test(
  "live route-safety alerts receive explicit verifiable identity",
  () => {
    assert.match(
      predict,
      /const currentAlertThreatInputs/
    );

    assert.match(
      predict,
      /route_safety_alert_id:\s*alert\.id/
    );

    assert.match(
      predict,
      /routeSafetyAlertId:\s*[\s\S]*?alert\.route_safety_alert_id\s*\?\?\s*[\s\S]*?null/
    );
  }
);

test(
  "historical threat identities are not promoted to route-safety alert ids",
  () => {
    const historicalStart =
      predict.indexOf(
        "const historicalThreatInputs"
      );

    const currentStart =
      predict.indexOf(
        "const currentAlertThreatInputs"
      );

    assert.ok(
      historicalStart >= 0
    );

    assert.ok(
      currentStart > historicalStart
    );

    const historicalBlock =
      predict.slice(
        historicalStart,
        currentStart
      );

    assert.doesNotMatch(
      historicalBlock,
      /route_safety_alert_id/
    );
  }
);

test(
  "Safe Navigation exposes dedicated route-safety alert identity",
  () => {
    assert.match(
      page,
      /routeSafetyAlertId\?:\s*string\s*\|\s*null/
    );
  }
);

test(
  "hazard confirmation is explicit customer action",
  () => {
    assert.match(
      page,
      /async function confirmActiveRouteSafetyHazard\(\)/
    );

    assert.match(
      page,
      /"\/api\/route-safety\/verify"/
    );

    assert.match(
      page,
      /body:\s*JSON\.stringify\(\{\s*alertId,\s*\}\)/
    );

    assert.match(
      page,
      /Still there/
    );
  }
);

test(
  "confirmation UI exists only for a verifiable live alert",
  () => {
    const uiStart =
      page.indexOf(
        'className="hg-hazard-confirmation"'
      );

    assert.notEqual(
      uiStart,
      -1
    );

    const beforeUi =
      page.slice(
        Math.max(0, uiStart - 500),
        uiStart
      );

    assert.match(
      beforeUi,
      /routeSafetyAlertId/
    );
  }
);

test(
  "successful confirmation is locally deduplicated",
  () => {
    assert.match(
      page,
      /hazardConfirmationInFlightRef/
    );

    assert.match(
      page,
      /confirmedHazardAlertIdsRef/
    );

    assert.match(
      page,
      /Thanks - hazard confirmed/
    );
  }
);

test(
  "failed confirmation is retryable",
  () => {
    assert.match(
      page,
      /Could not confirm hazard\./
    );

    assert.match(
      page,
      /Try again/
    );
  }
);

test(
  "hazard confirmation does not change route navigation",
  () => {
    const start =
      page.indexOf(
        "async function confirmActiveRouteSafetyHazard"
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
      page.slice(
        start,
        end
      );

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