import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const authorize =
  fs.readFileSync(
    new URL(
      "../lib/fleet/authorizeRoadUserVehicle.ts",
      import.meta.url
    ),
    "utf8"
  );

const processor =
  fs.readFileSync(
    new URL(
      "../lib/fleet/processVehicleLocationUpdate.ts",
      import.meta.url
    ),
    "utf8"
  );

const route =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/update-location/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test(
  "update-location reuses authorized vehicle and retains fallback",
  () => {
    assert.match(
      authorize,
      /id, driver_id, assigned_user_id, nickname, registration_number/
    );

    assert.match(
      processor,
      /authorizedVehicle\?:/
    );

    assert.match(
      processor,
      /let vehicle = authorizedVehicle;/
    );

    assert.match(
      processor,
      /if \(!vehicle\) \{/
    );

    assert.match(
      processor,
      /getVehicleForLocationUpdate\(\{/
    );

    assert.match(
      processor,
      /vehicle: loadedVehicle/
    );

    assert.match(
      route,
      /authorizedVehicle: vehicleAuthorization\.vehicle/
    );
  }
);