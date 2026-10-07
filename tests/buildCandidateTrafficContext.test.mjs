import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const modulePath =
  path.resolve(
    process.cwd(),
    "lib/traffic/buildCandidateTrafficContext.ts"
  );

const {
  buildCandidateTrafficContext,
} = await import(
  pathToFileURL(modulePath).href
);

test(
  "derives traffic delay from traffic-aware and base durations",
  () => {
    const result =
      buildCandidateTrafficContext({
        durationSeconds: 900,
        baseDurationSeconds: 600,
      });

    assert.equal(
      result.trafficDelaySeconds,
      300
    );

    assert.equal(
      result.trafficDelayRatio,
      0.5
    );

    assert.equal(
      result.source,
      "routing_summary"
    );
  }
);

test(
  "prefers the larger valid explicit delay",
  () => {
    const result =
      buildCandidateTrafficContext({
        durationSeconds: 900,
        baseDurationSeconds: 800,
        trafficDelaySeconds: 200,
      });

    assert.equal(
      result.trafficDelaySeconds,
      200
    );
  }
);

test(
  "summarizes stored congestion evidence",
  () => {
    const result =
      buildCandidateTrafficContext({
        observations: [
          {
            congestion: 20,
            jamFactor: 3,
            delayMinutes: 2,
            observedAt:
              "2026-10-07T07:00:00.000Z",
          },
          {
            congestion: 60,
            jamFactor: 7,
            delayMinutes: 5,
            observedAt:
              "2026-10-07T07:10:00.000Z",
          },
        ],
        nowMs:
          Date.parse(
            "2026-10-07T07:20:00.000Z"
          ),
        maximumAgeMinutes: 60,
      });

    assert.equal(
      result.storedObservationCount,
      2
    );

    assert.equal(
      result.maximumCongestionPercent,
      60
    );

    assert.equal(
      result.averageCongestionPercent,
      40
    );

    assert.equal(
      result.maximumJamFactor,
      7
    );

    assert.equal(
      result.totalStoredDelayMinutes,
      7
    );

    assert.equal(
      result.newestObservationAt,
      "2026-10-07T07:10:00.000Z"
    );

    assert.equal(
      result.trafficEvidenceFresh,
      true
    );

    assert.equal(
      result.source,
      "stored_observations"
    );
  }
);

test(
  "marks old stored observations as not fresh",
  () => {
    const result =
      buildCandidateTrafficContext({
        observations: [
          {
            congestion: 50,
            observedAt:
              "2026-10-07T05:00:00.000Z",
          },
        ],
        nowMs:
          Date.parse(
            "2026-10-07T07:00:00.000Z"
          ),
        maximumAgeMinutes: 60,
      });

    assert.equal(
      result.trafficEvidenceFresh,
      false
    );
  }
);

test(
  "combines routing summary and stored observations without external calls",
  () => {
    const result =
      buildCandidateTrafficContext({
        durationSeconds: 720,
        baseDurationSeconds: 600,
        observations: [
          {
            congestion: 30,
            jamFactor: 4,
            delayMinutes: 2,
            observedAt:
              "2026-10-07T07:55:00.000Z",
          },
        ],
        nowMs:
          Date.parse(
            "2026-10-07T08:00:00.000Z"
          ),
      });

    assert.equal(
      result.source,
      "combined"
    );

    assert.equal(
      result.trafficDelaySeconds,
      120
    );

    assert.equal(
      result.storedObservationCount,
      1
    );
  }
);

test(
  "fails closed to zero and none for malformed input",
  () => {
    const result =
      buildCandidateTrafficContext({
        durationSeconds: "bad",
        baseDurationSeconds: -5,
        trafficDelaySeconds: null,
        observations: [],
      });

    assert.equal(
      result.trafficDelaySeconds,
      0
    );

    assert.equal(
      result.trafficDelayRatio,
      0
    );

    assert.equal(
      result.storedObservationCount,
      0
    );

    assert.equal(
      result.maximumCongestionPercent,
      null
    );

    assert.equal(
      result.trafficEvidenceFresh,
      false
    );

    assert.equal(
      result.source,
      "none"
    );
  }
);
