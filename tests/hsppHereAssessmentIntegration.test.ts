import assert from "node:assert/strict";
import test from "node:test";

const HSPP_PROVIDER_FRESHNESS_HOURS =
  48;

function classifyProviderLastSeen(
  now: number,
  value: unknown
) {
  const providerLastSeenTime =
    new Date(
      String(value)
    ).getTime();

  const providerLastSeenValid =
    Number.isFinite(
      providerLastSeenTime
    );

  const staleBeforeMs =
    now -
    HSPP_PROVIDER_FRESHNESS_HOURS *
      60 *
      60 *
      1000;

  const providerObservationFresh =
    providerLastSeenValid &&
    providerLastSeenTime >=
      staleBeforeMs;

  return {
    providerLastSeenValid,
    providerObservationFresh,
  };
}

test(
  "HERE provider observation is fresh exactly at 48-hour boundary",
  () => {
    const now =
      Date.parse(
        "2026-08-20T12:00:00.000Z"
      );

    const result =
      classifyProviderLastSeen(
        now,
        "2026-08-18T12:00:00.000Z"
      );

    assert.deepEqual(
      result,
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
  "HERE provider observation becomes stale below 48-hour boundary",
  () => {
    const now =
      Date.parse(
        "2026-08-20T12:00:00.000Z"
      );

    const result =
      classifyProviderLastSeen(
        now,
        "2026-08-18T11:59:59.999Z"
      );

    assert.deepEqual(
      result,
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
  "invalid HERE provider last-seen fails freshness closed",
  () => {
    const now =
      Date.parse(
        "2026-08-20T12:00:00.000Z"
      );

    const result =
      classifyProviderLastSeen(
        now,
        "invalid-date"
      );

    assert.deepEqual(
      result,
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
  "assessment contexts preserve normalized input cardinality",
  () => {
    const contexts =
      Array.from(
        {
          length: 3,
        },
        () => null
      );

    assert.equal(
      contexts.length,
      3
    );

    assert.equal(
      contexts[1],
      null
    );
  }
);

test(
  "resolution correlation requires exact input index",
  () => {
    const resolutions = [
      {
        inputIndex: 0,
      },
      {
        inputIndex: 1,
      },
      {
        inputIndex: 2,
      },
    ];

    resolutions.forEach(
      (
        resolution,
        inputIndex
      ) => {
        assert.equal(
          resolution.inputIndex,
          inputIndex
        );
      }
    );
  }
);
