import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page =
  fs.readFileSync(
    "app/safe-navigation/page.tsx",
    "utf8"
  );

test(
  "Emergency SOS has dedicated confirmation and sending state",
  () => {
    assert.match(
      page,
      /panicConfirmOpen/
    );

    assert.match(
      page,
      /panicSending/
    );

    assert.match(
      page,
      /panicMessage/
    );
  }
);

test(
  "Emergency SOS requires an explicitly selected vehicle",
  () => {
    const start =
      page.indexOf(
        "async function sendEmergencySos()"
      );

    assert.ok(start >= 0);

    const block =
      page.slice(
        start,
        start + 1800
      );

    assert.match(
      block,
      /if \(!selectedVehicleId\)/
    );

    assert.match(
      block,
      /Select the vehicle you are driving/
    );
  }
);

test(
  "Emergency SOS reuses the hardened fleet panic endpoint",
  () => {
    const start =
      page.indexOf(
        "async function sendEmergencySos()"
      );

    assert.ok(start >= 0);

    const block =
      page.slice(
        start,
        start + 3500
      );

    assert.match(
      block,
      /fetchWithAuth\([\s\S]*?"\/api\/fleet\/panic"/
    );

    assert.match(
      block,
      /method:\s*"POST"/
    );

    assert.match(
      block,
      /"Content-Type":[\s\S]*?"application\/json"/
    );
  }
);

test(
  "Emergency SOS sends selected vehicle and selected vehicle trip",
  () => {
    const start =
      page.indexOf(
        "async function sendEmergencySos()"
      );

    const block =
      page.slice(
        start,
        start + 3500
      );

    assert.match(
      block,
      /vehicleId:\s*selectedVehicleId/
    );

    assert.match(
      block,
      /tripId:\s*selectedVehicleTripId/
    );
  }
);

test(
  "opening Emergency SOS confirmation does not call panic API",
  () => {
    const ui =
      page.indexOf(
        'className="hg-emergency-sos"'
      );

    assert.ok(ui >= 0);

    const confirmation =
      page.indexOf(
        "setPanicConfirmOpen(true)",
        ui
      );

    const confirmButton =
      page.indexOf(
        "void sendEmergencySos();",
        confirmation
      );

    assert.ok(confirmation > ui);
    assert.ok(confirmButton > confirmation);
  }
);

test(
  "Emergency SOS requires a deliberate second confirmation action",
  () => {
    assert.match(
      page,
      /Confirm Emergency SOS/
    );

    assert.match(
      page,
      /Confirm SOS/
    );

    assert.match(
      page,
      /void sendEmergencySos\(\);/
    );

    assert.match(
      page,
      />\s*Cancel\s*</
    );
  }
);

test(
  "changing vehicle invalidates pending SOS confirmation",
  () => {
    const selector =
      page.indexOf(
        'aria-label="Safe Navigation vehicle"'
      );

    assert.ok(selector >= 0);

    const block =
      page.slice(
        selector,
        selector + 1400
      );

    assert.match(
      block,
      /setSelectedVehicleId/
    );

    assert.match(
      block,
      /setPanicConfirmOpen\(false\)/
    );

    assert.match(
      block,
      /setPanicMessage\(""\)/
    );
  }
);

test(
  "duplicate open panic is communicated as already active",
  () => {
    assert.match(
      page,
      /result\.skipped ===[\s\S]*?"duplicate_open_panic"/
    );

    assert.match(
      page,
      /Emergency SOS is already active for this vehicle/
    );
  }
);

test(
  "successful new panic gives explicit operations acknowledgement",
  () => {
    assert.match(
      page,
      /Emergency SOS sent\. HarborGuard operations has been alerted\./
    );

    assert.match(
      page,
      /setPanicConfirmOpen\(false\)/
    );
  }
);

test(
  "SOS is not gated on navigation route or browser GPS",
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
      /routes\.length/
    );
  }
);

test(
  "SOS failures do not falsely report success",
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

    assert.match(
      block,
      /if \(!response\.ok\)/
    );

    assert.match(
      block,
      /result\.error/
    );

    assert.match(
      block,
      /Could not confirm Emergency SOS/
    );
  }
);