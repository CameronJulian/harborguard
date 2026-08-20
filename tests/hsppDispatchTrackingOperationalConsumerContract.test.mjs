import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    new URL(
      "../app/api/dispatch/tracking/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "Dispatch Tracking uses the centralized HSPP operational-read boundary",
  () => {
    assert.match(
      route,
      /readHsppEvidenceForOperationalUse/
    );
  }
);

test(
  "Dispatch Tracking reads HSPP identity with latest vehicle locations",
  () => {
    assert.match(
      route,
      /hspp_evidence_id/
    );
  }
);

test(
  "Dispatch Tracking preserves unlinked legacy telemetry behavior",
  () => {
    assert.match(
      route,
      /if\s*\(\s*!evidenceId\s*\)/
    );
  }
);

test(
  "Dispatch Tracking evaluates linked HSPP evidence",
  () => {
    assert.match(
      route,
      /await\s+readHsppEvidenceForOperationalUse\s*\(/
    );

    assert.match(
      route,
      /operationalRead\.decision\.allowed/
    );
  }
);

test(
  "HSPP denial is checked before telemetry calculations",
  () => {
    const denialIndex =
      route.indexOf(
        "operationalRead.decision.allowed"
      );

    const latitudeIndex =
      route.indexOf(
        "const currentLat"
      );

    assert.notEqual(denialIndex, -1);
    assert.notEqual(latitudeIndex, -1);
    assert.ok(denialIndex < latitudeIndex);
  }
);

test(
  "denied Dispatch Tracking telemetry cannot auto-transition missions",
  () => {
    const denialIndex =
      route.indexOf(
        "operationalRead.decision.allowed"
      );

    const transitionIndex =
      route.indexOf(
        'mission.status === "Accepted"'
      );

    const updateIndex =
      route.indexOf(
        '.from("dispatch_missions")',
        transitionIndex
      );

    assert.ok(denialIndex >= 0);
    assert.ok(transitionIndex > denialIndex);
    assert.ok(updateIndex > transitionIndex);
  }
);

test(
  "denied Dispatch Tracking telemetry preserves mission visibility",
  () => {
    assert.match(
      route,
      /tracking\.push\s*\(/
    );

    assert.match(
      route,
      /missionId:\s*mission\.id/
    );

    assert.match(
      route,
      /status:\s*mission\.status/
    );
  }
);

test(
  "denied Dispatch Tracking telemetry suppresses telemetry-derived fields",
  () => {
    assert.match(
      route,
      /latitude:\s*null/
    );

    assert.match(
      route,
      /longitude:\s*null/
    );

    assert.match(
      route,
      /speedKmh:\s*null/
    );

    assert.match(
      route,
      /remainingMeters:\s*null/
    );

    assert.match(
      route,
      /progressPercent:\s*null/
    );

    assert.match(
      route,
      /etaMinutes:\s*null/
    );

    assert.match(
      route,
      /lastSeen:\s*null/
    );
  }
);

test(
  "HSPP-007I preserves Dispatch Tracking top-level response shape",
  () => {
    assert.match(
      route,
      /success:\s*true/
    );

    assert.match(
      route,
      /count:\s*tracking\.length/
    );

    assert.match(
      route,
      /tracking/
    );
  }
);
