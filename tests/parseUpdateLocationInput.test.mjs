import assert from "node:assert/strict";
import test from "node:test";

import {
  parseFleetTelemetryNumber,
  parseUpdateLocationInput,
} from "../lib/fleet/parseUpdateLocationInput.ts";

function validBody(overrides = {}) {
  return {
    vehicleId: "vehicle-123",
    latitude: -33.9249,
    longitude: 18.4241,
    ...overrides,
  };
}

test("parseFleetTelemetryNumber preserves numeric input", () => {
  assert.equal(parseFleetTelemetryNumber(42.5), 42.5);
  assert.equal(parseFleetTelemetryNumber(-1), -1);
});

test("parseFleetTelemetryNumber converts supported numeric strings", () => {
  assert.equal(parseFleetTelemetryNumber("42"), 42);
  assert.equal(parseFleetTelemetryNumber(" 42 "), 42);
  assert.equal(parseFleetTelemetryNumber("1e3"), 1000);
  assert.equal(parseFleetTelemetryNumber("0x10"), 16);
});

test("parseFleetTelemetryNumber rejects blank and malformed values as NaN", () => {
  assert.equal(
    Number.isNaN(parseFleetTelemetryNumber("")),
    true
  );
  assert.equal(
    Number.isNaN(parseFleetTelemetryNumber("   ")),
    true
  );
  assert.equal(
    Number.isNaN(parseFleetTelemetryNumber("12abc")),
    true
  );
  assert.equal(
    Number.isNaN(parseFleetTelemetryNumber(undefined)),
    true
  );
});

test("parseUpdateLocationInput rejects a missing or empty vehicleId", () => {
  assert.deepEqual(
    parseUpdateLocationInput({
      latitude: 1,
      longitude: 2,
    }),
    {
      ok: false,
      error: "vehicleId is required.",
    }
  );

  assert.deepEqual(
    parseUpdateLocationInput({
      vehicleId: "",
      latitude: 1,
      longitude: 2,
    }),
    {
      ok: false,
      error: "vehicleId is required.",
    }
  );
});

test("parseUpdateLocationInput accepts numeric-string coordinates", () => {
  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({
        latitude: "-33.9249",
        longitude: "18.4241",
      })
    ),
    {
      ok: true,
      value: {
        vehicleId: "vehicle-123",
        tripId: null,
        latitude: -33.9249,
        longitude: 18.4241,
        speedKmh: 0,
        heading: 0,
        source: "mobile",
        requestedStatus: undefined,
        recordedAt: undefined,
      },
    }
  );
});

test("parseUpdateLocationInput rejects non-finite coordinates", () => {
  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({ latitude: "Infinity" })
    ),
    {
      ok: false,
      error:
        "Valid latitude and longitude are required.",
    }
  );

  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({ longitude: "bad" })
    ),
    {
      ok: false,
      error:
        "Valid latitude and longitude are required.",
    }
  );
});

test("parseUpdateLocationInput accepts exact latitude boundaries", () => {
  assert.equal(
    parseUpdateLocationInput(
      validBody({ latitude: -90 })
    ).ok,
    true
  );

  assert.equal(
    parseUpdateLocationInput(
      validBody({ latitude: 90 })
    ).ok,
    true
  );
});

test("parseUpdateLocationInput rejects latitude outside its range", () => {
  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({ latitude: -90.0001 })
    ),
    {
      ok: false,
      error: "Latitude must be between -90 and 90.",
    }
  );

  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({ latitude: 90.0001 })
    ),
    {
      ok: false,
      error: "Latitude must be between -90 and 90.",
    }
  );
});

test("parseUpdateLocationInput accepts exact longitude boundaries", () => {
  assert.equal(
    parseUpdateLocationInput(
      validBody({ longitude: -180 })
    ).ok,
    true
  );

  assert.equal(
    parseUpdateLocationInput(
      validBody({ longitude: 180 })
    ).ok,
    true
  );
});

test("parseUpdateLocationInput rejects longitude outside its range", () => {
  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({ longitude: -180.0001 })
    ),
    {
      ok: false,
      error:
        "Longitude must be between -180 and 180.",
    }
  );

  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({ longitude: 180.0001 })
    ),
    {
      ok: false,
      error:
        "Longitude must be between -180 and 180.",
    }
  );
});

test("parseUpdateLocationInput preserves finite speed and heading", () => {
  const result = parseUpdateLocationInput(
    validBody({
      speedKmh: "54.5",
      heading: "725",
    })
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.value.speedKmh, 54.5);
    assert.equal(result.value.heading, 725);
  }
});

test("parseUpdateLocationInput preserves currently allowed negative speed", () => {
  const result = parseUpdateLocationInput(
    validBody({ speedKmh: -5 })
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.value.speedKmh, -5);
  }
});

test("parseUpdateLocationInput defaults missing or invalid speed and heading to zero", () => {
  const missing = parseUpdateLocationInput(validBody());

  assert.equal(missing.ok, true);

  if (missing.ok) {
    assert.equal(missing.value.speedKmh, 0);
    assert.equal(missing.value.heading, 0);
  }

  const invalid = parseUpdateLocationInput(
    validBody({
      speedKmh: "bad",
      heading: "Infinity",
    })
  );

  assert.equal(invalid.ok, true);

  if (invalid.ok) {
    assert.equal(invalid.value.speedKmh, 0);
    assert.equal(invalid.value.heading, 0);
  }
});

test("parseUpdateLocationInput defaults source and tripId", () => {
  const result = parseUpdateLocationInput(validBody());

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.value.source, "mobile");
    assert.equal(result.value.tripId, null);
  }
});

test("parseUpdateLocationInput preserves supplied trip, source, and status", () => {
  const result = parseUpdateLocationInput(
    validBody({
      tripId: "trip-456",
      source: "hardware",
      status: "collecting",
    })
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.value.tripId, "trip-456");
    assert.equal(result.value.source, "hardware");
    assert.equal(
      result.value.requestedStatus,
      "collecting"
    );
  }
});

test("parseUpdateLocationInput leaves omitted recordedAt undefined", () => {
  const result = parseUpdateLocationInput(validBody());

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.value.recordedAt, undefined);
  }
});

test("parseUpdateLocationInput rejects empty and invalid recordedAt", () => {
  for (const recordedAt of ["", "   ", "not-a-date"]) {
    assert.deepEqual(
      parseUpdateLocationInput(
        validBody({ recordedAt })
      ),
      {
        ok: false,
        error:
          "recordedAt must be a valid date-time string.",
      }
    );
  }
});

test("parseUpdateLocationInput rejects non-string recordedAt at runtime", () => {
  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({ recordedAt: 123 })
    ),
    {
      ok: false,
      error:
        "recordedAt must be a valid date-time string.",
    }
  );
});

test("parseUpdateLocationInput normalizes valid recordedAt to ISO", () => {
  const result = parseUpdateLocationInput(
    validBody({
      recordedAt: "2026-08-13T12:15:30+02:00",
    })
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(
      result.value.recordedAt,
      "2026-08-13T10:15:30.000Z"
    );
  }
});

test("parseUpdateLocationInput preserves the complete success shape", () => {
  assert.deepEqual(
    parseUpdateLocationInput(
      validBody({
        tripId: "trip-456",
        speedKmh: 31.5,
        heading: 181,
        source: "manual",
        status: "delivered",
        recordedAt: "2026-08-13T10:15:30Z",
      })
    ),
    {
      ok: true,
      value: {
        vehicleId: "vehicle-123",
        tripId: "trip-456",
        latitude: -33.9249,
        longitude: 18.4241,
        speedKmh: 31.5,
        heading: 181,
        source: "manual",
        requestedStatus: "delivered",
        recordedAt: "2026-08-13T10:15:30.000Z",
      },
    }
  );
});
