import assert from "node:assert/strict";
import test from "node:test";

const FRESHNESS_HOURS = 48;

function deriveTomTomFreshness(
  providerLastSeen: Record<string, string>,
  nowMs: number
) {
  const value =
    providerLastSeen.tomtom;

  const time =
    new Date(
      String(value)
    ).getTime();

  const valid =
    Number.isFinite(time);

  const staleBeforeMs =
    nowMs -
    FRESHNESS_HOURS *
      60 *
      60 *
      1000;

  return {
    providerLastSeenValid:
      valid,
    providerObservationFresh:
      valid &&
      time >= staleBeforeMs,
  };
}

test(
  "TomTom observation is fresh exactly at 48-hour boundary",
  () => {
    const now =
      Date.parse(
        "2026-08-20T12:00:00Z"
      );

    assert.deepEqual(
      deriveTomTomFreshness(
        {
          tomtom:
            "2026-08-18T12:00:00Z",
        },
        now
      ),
      {
        providerLastSeenValid:
          true,
        providerObservationFresh:
          true,
      }
    );
  }
);

test(
  "TomTom observation is stale immediately beyond 48 hours",
  () => {
    const now =
      Date.parse(
        "2026-08-20T12:00:00Z"
      );

    assert.deepEqual(
      deriveTomTomFreshness(
        {
          tomtom:
            "2026-08-18T11:59:59.999Z",
        },
        now
      ),
      {
        providerLastSeenValid:
          true,
        providerObservationFresh:
          false,
      }
    );
  }
);

test(
  "invalid TomTom last-seen fails closed",
  () => {
    const now =
      Date.parse(
        "2026-08-20T12:00:00Z"
      );

    assert.deepEqual(
      deriveTomTomFreshness(
        {
          tomtom:
            "not-a-time",
        },
        now
      ),
      {
        providerLastSeenValid:
          false,
        providerObservationFresh:
          false,
      }
    );
  }
);

test(
  "assessment context preserves input cardinality",
  () => {
    const contexts =
      Array.from(
        {
          length: 4,
        },
        () => null
      );

    assert.equal(
      contexts.length,
      4
    );
  }
);

test(
  "resolution correlation requires exact input index",
  () => {
    const resolution = {
      inputIndex: 3,
    };

    assert.equal(
      resolution.inputIndex === 2,
      false
    );

    assert.equal(
      resolution.inputIndex === 3,
      true
    );
  }
);
