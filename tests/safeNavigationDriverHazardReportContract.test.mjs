import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8"
);

test(
  "Safe Navigation exposes a driver Report Hazard action",
  () => {
    assert.match(
      page,
      /Report Hazard/
    );

    assert.match(
      page,
      /Submit Hazard Report/
    );

    assert.match(
      page,
      /hg-driver-hazard-report/
    );
  }
);

test(
  "driver hazard reporting reuses Safe Navigation GPS",
  () => {
    assert.match(
      page,
      /latitude:\s*position\.lat/
    );

    assert.match(
      page,
      /longitude:\s*position\.lng/
    );

    assert.match(
      page,
      /!gpsActive/
    );

    assert.match(
      page,
      /gpsAccuracyPoor/
    );
  }
);

test(
  "driver reports use the hardened route safety report endpoint",
  () => {
    assert.match(
      page,
      /\/api\/route-safety\/report/
    );

    assert.match(
      page,
      /fetchWithAuth/
    );

    assert.match(
      page,
      /radius_meters:\s*500/
    );

    assert.match(
      page,
      /expires_hours:\s*6/
    );
  }
);

test(
  "driver report types stay inside the hardened API taxonomy",
  () => {
    for (
      const type of [
        "roadblock",
        "accident",
        "flooding",
        "traffic_light_outage",
        "protest",
        "vehicle_breakdown",
        "road_hazard",
        "police_activity",
        "smash_grab_hotspot",
      ]
    ) {
      assert.match(
        page,
        new RegExp(
          `value="${type}"`
        )
      );
    }

    assert.doesNotMatch(
      page,
      /value="crime"/
    );

    assert.doesNotMatch(
      page,
      /value="suspicious_activity"/
    );
  }
);

test(
  "duplicate response is surfaced honestly to the driver",
  () => {
    assert.match(
      page,
      /result\.duplicate/
    );

    assert.match(
      page,
      /similar hazard was already reported nearby/
    );
  }
);

test(
  "report UI explains unverified community trust state",
  () => {
    assert.match(
      page,
      /Community reports remain[\s\S]*unverified until confirmed/
    );
  }
);

test(
  "existing hazard confirmation customer action remains present",
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
  "existing safer-route offer remains present",
  () => {
    assert.match(
      page,
      /Alternative route available/
    );

    assert.match(
      page,
      /Take Alternative Route/
    );

    assert.match(
      page,
      /acceptSaferRouteOffer/
    );
  }
);

test(
  "navigation controls remain present",
  () => {
    assert.match(
      page,
      /Calculate Safe Route/
    );

    assert.match(
      page,
      /End Navigation/
    );

    assert.match(
      page,
      /Voice Guidance/
    );
  }
);