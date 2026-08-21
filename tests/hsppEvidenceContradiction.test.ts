import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHsppEvidenceContradiction,
} from "../lib/hspp/evaluateHsppEvidenceContradiction";

import type {
  HsppAssemblyMembershipDecision,
} from "../lib/hspp/evaluateHsppAssemblyMembership";

const eligibleMembership:
  HsppAssemblyMembershipDecision = {
    policyVersion:
      "hspp-assembly-membership-v1",

    eligible: true,
    reason: "ELIGIBLE",
    distanceMeters: 100,
    timeDeltaMs: 1_000,
  };

const ineligibleMembership:
  HsppAssemblyMembershipDecision = {
    policyVersion:
      "hspp-assembly-membership-v1",

    eligible: false,
    reason: "DISTANCE_EXCEEDED",
    distanceMeters: 2_000,
    timeDeltaMs: 1_000,
  };

test(
  "ineligible assembly pair is not contradiction-evaluated",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        ineligibleMembership,
        {
          eventType: "accident",
        },
        {
          eventType: "roadworks",
        }
      );

    assert.equal(
      decision.state,
      "NOT_EVALUATED"
    );

    assert.equal(
      decision.contradictory,
      false
    );

    assert.deepEqual(
      decision.comparisons,
      []
    );
  }
);

test(
  "equal normalized event types agree",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        eligibleMembership,
        {
          eventType: " Accident ",
        },
        {
          eventType: "ACCIDENT",
        }
      );

    assert.equal(
      decision.state,
      "NO_CONFLICT"
    );

    assert.equal(
      decision.comparisons[0].outcome,
      "AGREE"
    );
  }
);

test(
  "different event types create contradiction",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        eligibleMembership,
        {
          eventType: "accident",
        },
        {
          eventType: "roadworks",
        }
      );

    assert.equal(
      decision.state,
      "CONFLICT"
    );

    assert.equal(
      decision.contradictory,
      true
    );

    assert.equal(
      decision.reason,
      "COMPARABLE_CLAIM_CONFLICT"
    );

    assert.equal(
      decision.comparisons[0].outcome,
      "CONFLICT"
    );
  }
);

test(
  "missing event type is UNKNOWN rather than agreement",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        eligibleMembership,
        {
          eventType: null,
        },
        {
          eventType: "accident",
        }
      );

    assert.equal(
      decision.state,
      "NO_CONFLICT"
    );

    assert.equal(
      decision.comparisons[0].outcome,
      "UNKNOWN"
    );
  }
);

test(
  "severity disagreement is not contradiction-authoritative in v1",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        eligibleMembership,
        {
          eventType: "accident",
          severity: "critical",
        },
        {
          eventType: "accident",
          severity: "low",
        }
      );

    const severity =
      decision.comparisons.find(
        (comparison) =>
          comparison.claim ===
          "severity"
      );

    assert.ok(severity);

    assert.equal(
      severity.outcome,
      "UNKNOWN"
    );

    assert.equal(
      severity.comparable,
      false
    );

    assert.equal(
      decision.contradictory,
      false
    );
  }
);

test(
  "different titles do not create v1 contradiction",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        eligibleMembership,
        {
          eventType: "accident",
          title: "Crash on Main Road",
        },
        {
          eventType: "accident",
          title: "Traffic incident",
        }
      );

    assert.equal(
      decision.contradictory,
      false
    );

    const title =
      decision.comparisons.find(
        (comparison) =>
          comparison.claim ===
          "title"
      );

    assert.ok(title);

    assert.equal(
      title.outcome,
      "UNKNOWN"
    );
  }
);

test(
  "road-name disagreement remains UNKNOWN in v1",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        eligibleMembership,
        {
          eventType: "accident",
          roadName: "N2",
        },
        {
          eventType: "accident",
          roadName: "Settlers Way",
        }
      );

    const roadName =
      decision.comparisons.find(
        (comparison) =>
          comparison.claim ===
          "road_name"
      );

    assert.ok(roadName);

    assert.equal(
      roadName.outcome,
      "UNKNOWN"
    );

    assert.equal(
      roadName.comparable,
      false
    );
  }
);

test(
  "no-conflict result does not require informational claims to agree",
  () => {
    const decision =
      evaluateHsppEvidenceContradiction(
        eligibleMembership,
        {
          eventType: "accident",
          severity: "high",
          title: "A",
          description: "A",
          status: "active",
          roadName: "Road A",
        },
        {
          eventType: "accident",
          severity: "low",
          title: "B",
          description: "B",
          status: "inactive",
          roadName: "Road B",
        }
      );

    assert.equal(
      decision.state,
      "NO_CONFLICT"
    );

    assert.equal(
      decision.contradictory,
      false
    );
  }
);