import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "app/safe-navigation/page.tsx",
    "utf8"
  );

test(
  "Safe Navigation has explicit vehicle context",
  () => {
    assert.match(
      page,
      /SafeNavigationVehicleOption/
    );

    assert.match(
      page,
      /safeNavigationVehicles/
    );

    assert.match(
      page,
      /selectedVehicleId/
    );
  }
);

test(
  "vehicle context uses authenticated organization fleet",
  () => {
    assert.match(
      page,
      /fetchWithAuth\([\s\S]*?"\/api\/fleet\/live"/
    );

    assert.match(
      page,
      /cache:\s*"no-store"/
    );
  }
);

test(
  "single authorized vehicle may auto-select",
  () => {
    assert.match(
      page,
      /fleet\.length === 1/
    );

    assert.match(
      page,
      /return fleet\[0\]\.id/
    );
  }
);

test(
  "multiple vehicles require explicit driver choice",
  () => {
    assert.match(
      page,
      /if \(fleet\.length === 1\)[\s\S]*?return fleet\[0\]\.id;[\s\S]*?return "";/
    );
  }
);

test(
  "existing vehicle remains selected only while authorized",
  () => {
    assert.match(
      page,
      /fleet\.some\([\s\S]*?vehicle\.id === current/
    );
  }
);

test(
  "active trip derives only from selected fleet vehicle",
  () => {
    assert.match(
      page,
      /selectedVehicle\?\.activeTrip\?\.id \|\| null/
    );
  }
);

test(
  "Safe Navigation renders explicit vehicle selector",
  () => {
    assert.match(
      page,
      /aria-label="Safe Navigation vehicle"/
    );

    assert.match(
      page,
      /Vehicle context/
    );

    assert.match(
      page,
      /Select vehicle/
    );
  }
);

test(
  "failed fleet load clears potentially stale vehicle identity",
  () => {
    assert.match(
      page,
      /if \(!response\.ok\) \{[\s\S]*?setSafeNavigationVehicles\(\[\]\);[\s\S]*?setSelectedVehicleId\(""\)/
    );

    assert.match(
      page,
      /catch \{[\s\S]*?setSafeNavigationVehicles\(\[\]\);[\s\S]*?setSelectedVehicleId\(""\)/
    );
  }
);

test(
  "Part A does not expose or call panic",
  () => {
    assert.doesNotMatch(
      page,
      /\/api\/fleet\/panic/
    );

    assert.doesNotMatch(
      page,
      /sendPanic/
    );

    assert.doesNotMatch(
      page,
      /Emergency SOS/
    );
  }
);

test(
  "vehicle context is not persisted in refresh route recovery",
  () => {
    const start =
      page.indexOf(
        "sessionStorage.setItem("
      );

    assert.ok(
      start >= 0,
      "refresh persistence payload not found"
    );

    const block =
      page.slice(
        start,
        start + 2000
      );

    assert.doesNotMatch(
      block,
      /selectedVehicleId/
    );

    assert.doesNotMatch(
      block,
      /selectedVehicleTripId/
    );

    assert.doesNotMatch(
      block,
      /safeNavigationVehicles/
    );
  }
);