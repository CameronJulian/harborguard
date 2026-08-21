import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,
  type HsppPersistedCorroboratedMemberAssessment,
} from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
} from "../lib/hspp/assessHsppCorroboratedMember";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  evaluateHsppCorroboratedOperationalAuthority,
} from "../lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

const fingerprint =
  "a".repeat(64);

function persisted():
  HsppPersistedCorroboratedMemberAssessment {
  return {
    persistenceVersion:
      HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    state:
      "CORROBORATED_ASSESSMENT_PERSISTED",

    organizationId:
      "org-1",

    assemblyId:
      "assembly-1",

    assemblyDecisionId:
      "assembly-decision-1",

    evidenceId:
      "evidence-a",

    integrityFingerprint:
      fingerprint,

    supportingEvidenceIds: [
      "evidence-b",
    ],

    independentSupportCount:
      1,

    assessmentPolicyVersion:
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState:
      "CORROBORATED",

    operationalEligible:
      false,

    applied: {
      evidenceId:
        "evidence-a",

      trustState:
        "CORROBORATED",

      operationalEligible:
        false,

      policyVersion:
        HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

      reason:
        "INDEPENDENT_CORROBORATION_ACCEPTED",

      assessedAt:
        "2026-08-21T10:45:00.000Z",
    },
  };
}

test(
  "persisted corroborated member becomes operational-authority candidate",
  () => {
    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        persisted()
      );

    assert.equal(
      decision.policyVersion,
      HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION
    );

    assert.equal(
      decision.state,
      "OPERATIONAL_AUTHORITY_CANDIDATE"
    );

    assert.equal(
      decision.reason,
      "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET"
    );

    assert.equal(
      decision.authority,
      "NONE"
    );
  }
);

test(
  "candidacy does not grant operational authority",
  () => {
    const input =
      persisted();

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      input.operationalEligible,
      false
    );

    assert.equal(
      decision.authority,
      "NONE"
    );

    assert.notEqual(
      decision.state,
      "OPERATIONAL_AUTHORITY_GRANTED"
    );
  }
);

test(
  "unsupported B11F6 persistence version is denied",
  () => {
    const input = {
      ...persisted(),

      persistenceVersion:
        "unsupported-version" as
          typeof HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.state,
      "OPERATIONAL_AUTHORITY_DENIED"
    );

    assert.equal(
      decision.reason,
      "UNSUPPORTED_PERSISTENCE_VERSION"
    );
  }
);

test(
  "unpersisted corroborated assessment is denied",
  () => {
    const input = {
      ...persisted(),

      state:
        "INVALID_STATE" as
          "CORROBORATED_ASSESSMENT_PERSISTED",
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.state,
      "OPERATIONAL_AUTHORITY_DENIED"
    );

    assert.equal(
      decision.reason,
      "CORROBORATED_ASSESSMENT_NOT_PERSISTED"
    );
  }
);

test(
  "blank tenant identity is denied",
  () => {
    const input = {
      ...persisted(),

      organizationId:
        "   ",
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "INCOMPLETE_PROVENANCE_IDENTITY"
    );
  }
);

test(
  "blank evidence identity is denied",
  () => {
    const input = {
      ...persisted(),

      evidenceId:
        "",
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "INCOMPLETE_PROVENANCE_IDENTITY"
    );
  }
);

test(
  "invalid immutable fingerprint is denied",
  () => {
    const input = {
      ...persisted(),

      integrityFingerprint:
        "INVALID",
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "INVALID_INTEGRITY_FINGERPRINT"
    );
  }
);

test(
  "unsupported B11F5 assessment policy is denied",
  () => {
    const input = {
      ...persisted(),

      assessmentPolicyVersion:
        "unsupported-version" as
          typeof HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "UNSUPPORTED_ASSESSMENT_POLICY"
    );
  }
);

test(
  "non-CORROBORATED trust is denied",
  () => {
    const input = {
      ...persisted(),

      trustState:
        "UNASSESSED" as
          "CORROBORATED",
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "TRUST_NOT_CORROBORATED"
    );
  }
);

test(
  "pre-existing operational authority is denied rather than blessed",
  () => {
    const input = {
      ...persisted(),

      operationalEligible:
        true as false,
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.state,
      "OPERATIONAL_AUTHORITY_DENIED"
    );

    assert.equal(
      decision.reason,
      "UPSTREAM_OPERATIONAL_AUTHORITY_PRESENT"
    );
  }
);

test(
  "zero independent support is denied",
  () => {
    const input = {
      ...persisted(),

      supportingEvidenceIds:
        [],

      independentSupportCount:
        0,
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "INVALID_SUPPORT_CARDINALITY"
    );
  }
);

test(
  "support cardinality mismatch is denied",
  () => {
    const input = {
      ...persisted(),

      independentSupportCount:
        2,
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "INVALID_SUPPORT_CARDINALITY"
    );
  }
);

test(
  "self-supporting provenance is denied",
  () => {
    const input = {
      ...persisted(),

      supportingEvidenceIds: [
        "evidence-a",
      ],
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "INVALID_SUPPORTER_IDENTITY"
    );
  }
);

test(
  "duplicate supporting identity is denied",
  () => {
    const input = {
      ...persisted(),

      supportingEvidenceIds: [
        "evidence-b",
        "evidence-b",
      ],

      independentSupportCount:
        2,
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.reason,
      "INVALID_SUPPORTER_IDENTITY"
    );
  }
);

test(
  "multiple independent supporters preserve candidacy deterministically",
  () => {
    const input = {
      ...persisted(),

      supportingEvidenceIds: [
        "evidence-c",
        "evidence-b",
      ],

      independentSupportCount:
        2,
    };

    const decision =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.equal(
      decision.state,
      "OPERATIONAL_AUTHORITY_CANDIDATE"
    );

    assert.deepEqual(
      decision.supportingEvidenceIds,
      [
        "evidence-b",
        "evidence-c",
      ]
    );
  }
);

test(
  "B11G2 is deterministic and does not mutate B11F6 input",
  () => {
    const input =
      persisted();

    const before =
      structuredClone(
        input
      );

    const first =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    const second =
      evaluateHsppCorroboratedOperationalAuthority(
        input
      );

    assert.deepEqual(
      first,
      second
    );

    assert.deepEqual(
      input,
      before
    );
  }
);