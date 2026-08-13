import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHarshBrakingPromotionMetadata,
} from "../lib/route-safety/buildHarshBrakingPromotionMetadata.ts";

function makeCorroboration() {
  return {
    thresholdMet: true,
    distinctVehicleCount: 3,
    distinctVehicleIds: ["vehicle-1", "vehicle-2", "vehicle-3"],
    otherVehicleIds: ["vehicle-2", "vehicle-3"],
    nearbyAlertCount: 4,
    radiusMeters: 150,
    timeWindowMinutes: 30,
    windowStartedAt: "2026-08-13T09:30:00.000Z",
    windowEndedAt: "2026-08-13T10:00:00.000Z",
  };
}

const candidate = {
  previousSpeedKmh: 72,
  currentSpeedKmh: 38,
  speedDropKmh: 34,
  intervalSeconds: 4,
  decelerationMps2: 3.2,
};

const trafficCalmingContext = {
  provider: "city_of_cape_town",
  featureType: "speed_bump",
  providerFeatureId: "7:123",
  ownership: "CCT",
  statusCode: 1,
  latitude: -33.9249,
  longitude: 18.4241,
  distanceMeters: 14,
};

test("preserves traffic-calming context in promotion metadata", () => {
  const metadata =
    buildHarshBrakingPromotionMetadata({
      vehicleId: "vehicle-1",
      tripId: "trip-1",
      candidate,
      corroboration: makeCorroboration(),
      trafficCalmingContext,
    });

  assert.deepEqual(
    metadata.trafficCalmingContext,
    trafficCalmingContext
  );
});

test("preserves null traffic-calming context", () => {
  const metadata =
    buildHarshBrakingPromotionMetadata({
      vehicleId: "vehicle-1",
      tripId: null,
      candidate,
      corroboration: makeCorroboration(),
      trafficCalmingContext: null,
    });

  assert.equal(
    metadata.trafficCalmingContext,
    null
  );
});

test("preserves existing telemetry metadata contract", () => {
  const corroboration = makeCorroboration();

  const metadata =
    buildHarshBrakingPromotionMetadata({
      vehicleId: "vehicle-1",
      tripId: "trip-1",
      candidate,
      corroboration,
      trafficCalmingContext,
    });

  assert.equal(
    metadata.telemetryType,
    "harsh_braking"
  );
  assert.equal(
    metadata.sourceVehicleId,
    "vehicle-1"
  );
  assert.equal(metadata.tripId, "trip-1");
  assert.deepEqual(metadata.candidate, candidate);
  assert.deepEqual(
    metadata.corroboration,
    corroboration
  );
});

test("copies corroboration vehicle arrays", () => {
  const corroboration = makeCorroboration();

  const metadata =
    buildHarshBrakingPromotionMetadata({
      vehicleId: "vehicle-1",
      tripId: "trip-1",
      candidate,
      corroboration,
      trafficCalmingContext,
    });

  assert.notEqual(
    metadata.corroboration.distinctVehicleIds,
    corroboration.distinctVehicleIds
  );

  assert.notEqual(
    metadata.corroboration.otherVehicleIds,
    corroboration.otherVehicleIds
  );

  assert.deepEqual(
    metadata.corroboration.distinctVehicleIds,
    corroboration.distinctVehicleIds
  );

  assert.deepEqual(
    metadata.corroboration.otherVehicleIds,
    corroboration.otherVehicleIds
  );
});
