import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION,
  validateHsppReconstructionIntentReplacementCandidateSnapshot,
} from "../lib/hspp/readHsppReconstructionIntentReplacementCandidate";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const REPLACEMENT_EVIDENCE_ID =
  "22222222-2222-4222-8222-222222222222";

const OTHER_EVIDENCE_ID =
  "33333333-3333-4333-8333-333333333333";

const DISCOVERY_POLICY_VERSION =
  "hspp-reservoir-discovery-v1";

const FINGERPRINT =
  "a".repeat(64);

const OTHER_FINGERPRINT =
  "b".repeat(64);


function operationalRead(
  options: {
    evidenceId?: string;
    organizationId?: string;
    fingerprint?: string;
    allowed?: boolean;
    reason?: string;
    evidence?: boolean;
  } = {},
) {
  const {
    evidenceId =
      REPLACEMENT_EVIDENCE_ID,
    organizationId =
      ORGANIZATION_ID,
    fingerprint =
      FINGERPRINT,
    allowed =
      true,
    reason =
      "operational_eligible",
    evidence =
      true,
  } = options;

  return {
    readResult: {},

    decision: {
      allowed,
      reason,
    },

    evidence:
      evidence
        ? {
            id:
              evidenceId,

            organizationId,

            integrityFingerprint:
              fingerprint,
          }
        : null,
  } as any;
}


function validInput() {
  return {
    organizationId:
      ORGANIZATION_ID,

    replacementEvidenceId:
      REPLACEMENT_EVIDENCE_ID,

    replacementEvidenceIntegrityFingerprint:
      FINGERPRINT,

    discoveryPolicyVersion:
      DISCOVERY_POLICY_VERSION,

    operationalRead:
      operationalRead(),

    membershipClassificationRow: {
      evidence_id:
        REPLACEMENT_EVIDENCE_ID,

      has_historical_membership:
        false,

      has_current_effective_membership:
        false,

      membership_classification:
        "NEVER_ASSEMBLED",
    },
  };
}


test(
  "Q14ag31H exposes the exact reader version",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION,
      "hspp-reconstruction-intent-replacement-candidate-reader-v1",
    );
  },
);


test(
  "Q14ag31H hydrates the exact immutable NEVER_ASSEMBLED replacement",
  () => {
    const result =
      validateHsppReconstructionIntentReplacementCandidateSnapshot(
        validInput(),
      );

    assert.equal(
      result.evidenceId,
      REPLACEMENT_EVIDENCE_ID,
    );

    assert.equal(
      result.membershipClassification,
      "NEVER_ASSEMBLED",
    );

    assert.equal(
      result.hasAssemblyMembership,
      false,
    );

    assert.equal(
      result.reservoirDecision.eligible,
      true,
    );

    assert.equal(
      result.reservoirDecision.reason,
      "RESERVOIR_ELIGIBLE",
    );

    assert.equal(
      result.operationalRead.evidence?.integrityFingerprint,
      FINGERPRINT,
    );
  },
);


test(
  "Q14ag31H rejects historical replacement membership",
  () => {
    const input =
      validInput();

    input.membershipClassificationRow = {
      evidence_id:
        REPLACEMENT_EVIDENCE_ID,

      has_historical_membership:
        true,

      has_current_effective_membership:
        false,

      membership_classification:
        "HISTORICAL_NOT_CURRENT",
    };

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /NEVER_ASSEMBLED/,
    );
  },
);


test(
  "Q14ag31H rejects current-effective replacement membership",
  () => {
    const input =
      validInput();

    input.membershipClassificationRow = {
      evidence_id:
        REPLACEMENT_EVIDENCE_ID,

      has_historical_membership:
        true,

      has_current_effective_membership:
        true,

      membership_classification:
        "CURRENT_EFFECTIVE",
    };

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /NEVER_ASSEMBLED/,
    );
  },
);


test(
  "Q14ag31H rejects inconsistent lifecycle classification",
  () => {
    const input =
      validInput();

    input.membershipClassificationRow = {
      evidence_id:
        REPLACEMENT_EVIDENCE_ID,

      has_historical_membership:
        false,

      has_current_effective_membership:
        false,

      membership_classification:
        "HISTORICAL_NOT_CURRENT",
    };

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /inconsistent lifecycle state/,
    );
  },
);


test(
  "Q14ag31H rejects a persisted evidence identity mismatch",
  () => {
    const input =
      validInput();

    input.operationalRead =
      operationalRead({
        evidenceId:
          OTHER_EVIDENCE_ID,
      });

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /identity does not match/,
    );
  },
);


test(
  "Q14ag31H rejects an organization mismatch",
  () => {
    const input =
      validInput();

    input.operationalRead =
      operationalRead({
        organizationId:
          "44444444-4444-4444-8444-444444444444",
      });

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /different organization/,
    );
  },
);


test(
  "Q14ag31H rejects a durable fingerprint mismatch",
  () => {
    const input =
      validInput();

    input.operationalRead =
      operationalRead({
        fingerprint:
          OTHER_FINGERPRINT,
      });

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /fingerprint does not match/,
    );
  },
);


test(
  "Q14ag31H rejects a non-lowercase SHA-256 fingerprint",
  () => {
    const input =
      validInput();

    input.replacementEvidenceIntegrityFingerprint =
      FINGERPRINT.toUpperCase();

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /lowercase SHA-256/,
    );
  },
);


test(
  "Q14ag31H rejects missing persisted operational evidence",
  () => {
    const input =
      validInput();

    input.operationalRead =
      operationalRead({
        evidence:
          false,
      });

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /no persisted operational evidence/,
    );
  },
);


test(
  "Q14ag31H rejects replacement evidence no longer Reservoir eligible",
  () => {
    const input =
      validInput();

    input.operationalRead =
      operationalRead({
        allowed:
          false,

        reason:
          "operational_not_eligible",
      });

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /no longer Reservoir eligible/,
    );
  },
);


test(
  "Q14ag31H rejects stale discovery-policy provenance",
  () => {
    const input =
      validInput();

    input.discoveryPolicyVersion =
      "hspp-reservoir-discovery-v0";

    assert.throws(
      () =>
        validateHsppReconstructionIntentReplacementCandidateSnapshot(
          input,
        ),
      /discovery policy/,
    );
  },
);
