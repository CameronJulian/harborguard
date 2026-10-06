import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "app/safe-navigation/page.tsx",
    "utf8"
  );

test(
  "SOS emergency support reuses existing Route Safety prediction context",
  () => {
    assert.match(
      page,
      /type RouteEmergencySupportContext = \{/
    );

    assert.match(
      page,
      /fireStationContext\?: RouteEmergencySupportContext\["fireStationContext"\]/
    );

    assert.match(
      page,
      /policeStationContext\?: RouteEmergencySupportContext\["policeStationContext"\]/
    );

    assert.match(
      page,
      /result\?\.fireStationContext \|\|[\s\S]*?result\?\.policeStationContext/
    );

    assert.match(
      page,
      /setRouteEmergencySupportContext\([\s\S]*?nextRouteEmergencySupportContext/
    );
  }
);

test(
  "SOS emergency support introduces no additional emergency-resource API request",
  () => {
    const predictionCalls =
      page.match(
        /"\/api\/route-safety\/predict"/g
      ) || [];

    assert.equal(
      predictionCalls.length,
      1
    );

    assert.doesNotMatch(
      page,
      /\/api\/fire-station/
    );

    assert.doesNotMatch(
      page,
      /\/api\/police-station/
    );

    assert.doesNotMatch(
      page,
      /\/api\/emergency-support/
    );
  }
);

test(
  "SOS emergency support appears only after server-confirmed SOS success path",
  () => {
    const start =
      page.indexOf(
        "async function sendEmergencySos()"
      );

    const end =
      page.indexOf(
        "async function searchDestination()",
        start
      );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const block =
      page.slice(
        start,
        end
      );

    const failure =
      block.indexOf(
        "if (!response.ok)"
      );

    const visibility =
      block.indexOf(
        "setSosEmergencySupportVisible(true)"
      );

    const close =
      block.indexOf(
        "setPanicConfirmOpen(false)",
        visibility
      );

    assert.ok(failure >= 0);
    assert.ok(visibility > failure);
    assert.ok(close > visibility);

    assert.match(
      block,
      /result\.skipped ===[\s\S]*?"duplicate_open_panic"[\s\S]*?setSosEmergencySupportVisible\(true\)/
    );
  }
);

test(
  "failed SOS does not expose emergency support",
  () => {
    const start =
      page.indexOf(
        "async function sendEmergencySos()"
      );

    const end =
      page.indexOf(
        "async function searchDestination()",
        start
      );

    const block =
      page.slice(
        start,
        end
      );

    const failureStart =
      block.indexOf(
        "if (!response.ok)"
      );

    const successVisibility =
      block.indexOf(
        "setSosEmergencySupportVisible(true)"
      );

    assert.ok(failureStart >= 0);
    assert.ok(successVisibility > failureStart);

    const failureBlock =
      block.slice(
        failureStart,
        successVisibility
      );

    assert.doesNotMatch(
      failureBlock,
      /setSosEmergencySupportVisible\(true\)/
    );
  }
);

test(
  "SOS emergency support explicitly avoids false dispatch claims",
  () => {
    assert.match(
      page,
      /aria-label="SOS emergency support"/
    );

    assert.match(
      page,
      /Nearby emergency resources/
    );

    assert.match(
      page,
      /Informational location context only\./
    );

    assert.match(
      page,
      /HarborGuard has not contacted these services\./
    );
  }
);

test(
  "SOS emergency support can show fire and police names and route-context distance",
  () => {
    assert.match(
      page,
      /<strong>Fire station:<\/strong>/
    );

    assert.match(
      page,
      /fireStationContext\.stationName/
    );

    assert.match(
      page,
      /fireStationContext\.stationClass/
    );

    assert.match(
      page,
      /fireStationContext[\s\S]*?distanceMeters/
    );

    assert.match(
      page,
      /<strong>Police station:<\/strong>/
    );

    assert.match(
      page,
      /policeStationContext\.stationName/
    );

    assert.match(
      page,
      /policeStationContext\.cluster/
    );

    assert.match(
      page,
      /policeStationContext[\s\S]*?distanceMeters/
    );
  }
);

test(
  "SOS remains independent of route GPS and emergency-resource availability",
  () => {
    const start =
      page.indexOf(
        "async function sendEmergencySos()"
      );

    const end =
      page.indexOf(
        "async function searchDestination()",
        start
      );

    const block =
      page.slice(
        start,
        end
      );

    assert.doesNotMatch(
      block,
      /if \(!gpsActive/
    );

    assert.doesNotMatch(
      block,
      /if \(!position/
    );

    assert.doesNotMatch(
      block,
      /if \(!routeEmergencySupportContext/
    );

    assert.doesNotMatch(
      block,
      /if \(!.*fireStationContext/
    );

    assert.doesNotMatch(
      block,
      /if \(!.*policeStationContext/
    );
  }
);

test(
  "Increment 36 SOS resource safety boundary remains intact after Increment 37",
  () => {
    const supportStart =
      page.indexOf(
        'aria-label="SOS emergency support"'
      );

    const confirmationStart =
      page.indexOf(
        'aria-label="Confirm Emergency SOS"',
        supportStart
      );

    assert.ok(supportStart >= 0);
    assert.ok(confirmationStart > supportStart);

    const supportBlock =
      page.slice(
        supportStart,
        confirmationStart
      );

    assert.match(
      supportBlock,
      /HarborGuard has not contacted these services\./
    );

    assert.match(
      supportBlock,
      /Published planning information only\./
    );

    assert.match(
      supportBlock,
      /does\s+not indicate an active nuclear emergency/
    );

    assert.match(
      supportBlock,
      /active\s+evacuation order/
    );
  }
);