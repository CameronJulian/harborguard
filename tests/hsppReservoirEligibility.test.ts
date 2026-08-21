import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHsppReservoirEligibility,
  HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
} from "../lib/hspp/evaluateHsppReservoirEligibility";

test("operationally allowed unassembled evidence is Reservoir eligible", () => {
  const decision = evaluateHsppReservoirEligibility({
    operationalUseDecision: {
      policyVersion: "hspp-operational-use-v1",
      allowed: true,
      reason: "operational_use_allowed",
    },
    hasAssemblyMembership: false,
  });

  assert.equal(
    decision.policyVersion,
    HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
  );

  assert.equal(decision.eligible, true);
  assert.equal(decision.reason, "RESERVOIR_ELIGIBLE");
});

test("already assembled evidence cannot enter the Reservoir", () => {
  const decision = evaluateHsppReservoirEligibility({
    operationalUseDecision: {
      policyVersion: "hspp-operational-use-v1",
      allowed: true,
      reason: "operational_use_allowed",
    },
    hasAssemblyMembership: true,
  });

  assert.equal(decision.eligible, false);
  assert.equal(decision.reason, "ALREADY_ASSEMBLED");
});

const deniedCases = [
  ["evidence_not_found", "EVIDENCE_NOT_FOUND"],
  ["integrity_not_verified", "INTEGRITY_NOT_VERIFIED"],
  ["validation_not_validated", "VALIDATION_NOT_VALIDATED"],
  ["assessment_missing", "ASSESSMENT_MISSING"],
  ["trust_not_operational", "TRUST_NOT_ELIGIBLE"],
  ["operational_not_eligible", "OPERATIONAL_NOT_ELIGIBLE"],
] as const;

for (const [operationalReason, reservoirReason] of deniedCases) {
  test(`Reservoir fails closed for ${operationalReason}`, () => {
    const decision = evaluateHsppReservoirEligibility({
      operationalUseDecision: {
        policyVersion: "hspp-operational-use-v1",
        allowed: false,
        reason: operationalReason,
      },
      hasAssemblyMembership: false,
    });

    assert.equal(decision.eligible, false);

    assert.equal(decision.reason, reservoirReason);
  });
}
