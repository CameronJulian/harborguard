import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHsppAssemblyMembership,
  HSPP_ASSEMBLY_MAX_TIME_DELTA_MS,
} from "../lib/hspp/evaluateHsppAssemblyMembership";

type Input =
  Parameters<
    typeof evaluateHsppAssemblyMembership
  >[0];

const A64 = "a".repeat(64);
const B64 = "b".repeat(64);

function evidence(
  overrides: Partial<Input> = {}
): Input {
  return {
    organizationId: "org-1",
    evidenceId: "evidence-a",
    integrityFingerprint: A64,
    sourceClass: "external_intelligence",
    sourceProvider: "here",
    observedAt: "2026-08-21T06:00:00.000Z",
    latitude: -33.9249,
    longitude: 18.4241,
    eventType: "accident",
    ...overrides,
  };
}

function other(
  overrides: Partial<Input> = {}
): Input {
  return evidence({
    evidenceId: "evidence-b",
    integrityFingerprint: B64,
    sourceProvider: "tomtom",
    ...overrides,
  });
}

test(
  "compatible distinct-provider evidence is an admission candidate",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other()
      );

    assert.equal(result.eligible, true);
    assert.equal(result.reason, "ELIGIBLE");
    assert.ok(result.distanceMeters !== null);
    assert.equal(result.timeDeltaMs, 0);
  }
);

test(
  "blank organization identity fails closed",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence({
          organizationId: "   ",
        }),
        other()
      );

    assert.equal(result.eligible, false);
    assert.equal(
      result.reason,
      "INVALID_ORGANIZATION_ID"
    );
  }
);

test(
  "different organizations cannot assemble",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other({
          organizationId: "org-2",
        })
      );

    assert.equal(
      result.reason,
      "ORGANIZATION_MISMATCH"
    );
  }
);

test(
  "blank evidence identity fails closed",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence({
          evidenceId: "",
        }),
        other()
      );

    assert.equal(
      result.reason,
      "INVALID_EVIDENCE_ID"
    );
  }
);

test(
  "same immutable evidence cannot join itself",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other({
          evidenceId: "evidence-a",
        })
      );

    assert.equal(
      result.reason,
      "SAME_EVIDENCE"
    );
  }
);

test(
  "invalid fingerprint fails closed",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence({
          integrityFingerprint: "bad",
        }),
        other()
      );

    assert.equal(
      result.reason,
      "INVALID_FINGERPRINT"
    );
  }
);

test(
  "missing provider identity cannot prove cross-provider admission",
  () => {
    for (const sourceProvider of [
      null,
      "",
      "   ",
    ]) {
      const result =
        evaluateHsppAssemblyMembership(
          evidence({
            sourceProvider,
          }),
          other()
        );

      assert.equal(
        result.reason,
        "MISSING_PROVIDER"
      );
    }
  }
);

test(
  "same provider is not a B11A2 v1 cross-provider candidate",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other({
          sourceProvider: " HERE ",
        })
      );

    assert.equal(
      result.reason,
      "SAME_PROVIDER"
    );
  }
);

test(
  "source class comparison is normalized",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence({
          sourceClass:
            " External_Intelligence ",
        }),
        other()
      );

    assert.equal(
      result.reason,
      "ELIGIBLE"
    );
  }
);

test(
  "event type comparison is normalized",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence({
          eventType: " Accident ",
        }),
        other({
          eventType: "ACCIDENT",
        })
      );

    assert.equal(
      result.reason,
      "ELIGIBLE"
    );
  }
);

test(
  "different event types are rejected",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other({
          eventType: "road_closure",
        })
      );

    assert.equal(
      result.reason,
      "EVENT_TYPE_MISMATCH"
    );
  }
);

test(
  "exact temporal boundary is eligible",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other({
          observedAt:
            new Date(
              Date.parse(
                "2026-08-21T06:00:00.000Z"
              ) +
              HSPP_ASSEMBLY_MAX_TIME_DELTA_MS
            ).toISOString(),
        })
      );

    assert.equal(
      result.reason,
      "ELIGIBLE"
    );

    assert.equal(
      result.timeDeltaMs,
      HSPP_ASSEMBLY_MAX_TIME_DELTA_MS
    );
  }
);

test(
  "one millisecond beyond temporal boundary is rejected",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other({
          observedAt:
            new Date(
              Date.parse(
                "2026-08-21T06:00:00.000Z"
              ) +
              HSPP_ASSEMBLY_MAX_TIME_DELTA_MS +
              1
            ).toISOString(),
        })
      );

    assert.equal(
      result.reason,
      "TIME_WINDOW_EXCEEDED"
    );
  }
);

test(
  "invalid observation time fails closed",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence({
          observedAt: "not-a-time",
        }),
        other()
      );

    assert.equal(
      result.reason,
      "INVALID_OBSERVED_AT"
    );
  }
);

test(
  "invalid coordinates fail closed",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence({
          latitude: 91,
        }),
        other()
      );

    assert.equal(
      result.reason,
      "INVALID_COORDINATES"
    );
  }
);

test(
  "distant evidence is rejected",
  () => {
    const result =
      evaluateHsppAssemblyMembership(
        evidence(),
        other({
          latitude: -33.90,
          longitude: 18.50,
        })
      );

    assert.equal(
      result.reason,
      "DISTANCE_EXCEEDED"
    );
  }
);