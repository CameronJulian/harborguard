import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveProviderQualityState,
} from "../lib/route-safety/deriveProviderQualityState";

test("empty provider state produces canonical zero state", () => {
  const result = deriveProviderQualityState({
    providerLastSeen: {},
    primarySource: "here_traffic",
    primarySourceBaseConfidence: 65,
  });

  assert.deepEqual(result, {
    providerSources: [],
    providerLastSeen: {},
    providerConfirmationCount: 0,
    providerConfidence: 0,
  });
});

test("single provider uses source base confidence", () => {
  const result = deriveProviderQualityState({
    providerLastSeen: {
      here_traffic: "2026-08-20T12:00:00.000Z",
    },
    primarySource: "here_traffic",
    primarySourceBaseConfidence: 65,
  });

  assert.deepEqual(result.providerSources, [
    "here_traffic",
  ]);
  assert.equal(result.providerConfirmationCount, 1);
  assert.equal(result.providerConfidence, 65);
});

test("two providers use corroboration confidence formula", () => {
  const result = deriveProviderQualityState({
    providerLastSeen: {
      here_traffic: "2026-08-20T12:00:00.000Z",
      tomtom: "2026-08-20T12:01:00.000Z",
    },
    primarySource: "here_traffic",
    primarySourceBaseConfidence: 65,
  });

  assert.equal(result.providerConfirmationCount, 2);
  assert.equal(result.providerConfidence, 80);
});

test("three providers cap according to existing formula", () => {
  const result = deriveProviderQualityState({
    providerLastSeen: {
      here_traffic: "2026-08-20T12:00:00.000Z",
      tomtom: "2026-08-20T12:01:00.000Z",
      third: "2026-08-20T12:02:00.000Z",
    },
    primarySource: "here_traffic",
    primarySourceBaseConfidence: 65,
  });

  assert.equal(result.providerConfirmationCount, 3);
  assert.equal(result.providerConfidence, 100);
});

test("stale providers are removed using caller supplied boundary", () => {
  const result = deriveProviderQualityState({
    providerLastSeen: {
      here_traffic: "2026-08-18T11:59:59.000Z",
      tomtom: "2026-08-20T12:00:00.000Z",
    },
    primarySource: "tomtom",
    primarySourceBaseConfidence: 70,
    staleBefore: "2026-08-18T12:00:00.000Z",
  });

  assert.deepEqual(result.providerSources, [
    "tomtom",
  ]);
  assert.equal(result.providerConfirmationCount, 1);
  assert.equal(result.providerConfidence, 70);
});

test("all stale providers produce canonical zero state", () => {
  const result = deriveProviderQualityState({
    providerLastSeen: {
      here_traffic: "2026-08-18T11:00:00.000Z",
      tomtom: "2026-08-18T11:30:00.000Z",
    },
    primarySource: "here_traffic",
    primarySourceBaseConfidence: 65,
    staleBefore: "2026-08-18T12:00:00.000Z",
  });

  assert.equal(result.providerConfirmationCount, 0);
  assert.equal(result.providerConfidence, 0);
  assert.deepEqual(result.providerSources, []);
  assert.deepEqual(result.providerLastSeen, {});
});

test("invalid provider timestamps are excluded", () => {
  const result = deriveProviderQualityState({
    providerLastSeen: {
      here_traffic: "not-a-date",
      tomtom: "2026-08-20T12:00:00.000Z",
    },
    primarySource: "tomtom",
    primarySourceBaseConfidence: 70,
  });

  assert.deepEqual(result.providerSources, [
    "tomtom",
  ]);
});

test("invalid base confidence fails closed", () => {
  assert.throws(
    () => deriveProviderQualityState({
      providerLastSeen: {},
      primarySource: "here_traffic",
      primarySourceBaseConfidence: 101,
    }),
    /between 0 and 100/
  );
});

test("invalid stale boundary fails closed", () => {
  assert.throws(
    () => deriveProviderQualityState({
      providerLastSeen: {},
      primarySource: "here_traffic",
      primarySourceBaseConfidence: 65,
      staleBefore: "invalid",
    }),
    /staleBefore must be a valid timestamp/
  );
});

test(
  "explicit active provider set can exclude historical last-seen providers",
  () => {
    const result =
      deriveProviderQualityState({
        providerLastSeen: {
          here_traffic:
            "2026-08-20T12:00:00.000Z",
          tomtom:
            "2026-08-19T12:00:00.000Z",
        },

        providerSources: [
          "here_traffic",
        ],

        primarySource:
          "here_traffic",

        primarySourceBaseConfidence:
          65,
      });

    assert.deepEqual(
      result.providerSources,
      ["here_traffic"]
    );

    assert.equal(
      result.providerConfirmationCount,
      1
    );

    assert.equal(
      result.providerConfidence,
      65
    );

    assert.deepEqual(
      result.providerLastSeen,
      {
        here_traffic:
          "2026-08-20T12:00:00.000Z",
        tomtom:
          "2026-08-19T12:00:00.000Z",
      }
    );
  }
);

test(
  "freshness removes stale members from explicit active provider set",
  () => {
    const result =
      deriveProviderQualityState({
        providerLastSeen: {
          here_traffic:
            "2026-08-20T12:00:00.000Z",
          tomtom:
            "2026-08-18T11:59:59.000Z",
        },

        providerSources: [
          "here_traffic",
          "tomtom",
        ],

        primarySource:
          "here_traffic",

        primarySourceBaseConfidence:
          65,

        staleBefore:
          "2026-08-18T12:00:00.000Z",
      });

    assert.deepEqual(
      result.providerSources,
      ["here_traffic"]
    );

    assert.deepEqual(
      result.providerLastSeen,
      {
        here_traffic:
          "2026-08-20T12:00:00.000Z",
      }
    );

    assert.equal(
      result.providerConfirmationCount,
      1
    );

    assert.equal(
      result.providerConfidence,
      65
    );
  }
);