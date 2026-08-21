import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_DECISION_VERSION,
  type HsppAssemblyDecisionReason,
  type HsppAssemblyDecisionState,
} from "../lib/hspp/evaluateHsppAssemblyDecision";

import {
  HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION,
  type HsppPersistedAssemblyDecision,
} from "../lib/hspp/persistHsppAssemblyDecision";

import {
  evaluateHsppAssemblyAuthority,
} from "../lib/hspp/evaluateHsppAssemblyAuthority";

function persistedDecision(
  state:
    HsppAssemblyDecisionState,
  reason:
    HsppAssemblyDecisionReason
): HsppPersistedAssemblyDecision {
  return {
    persistenceVersion:
      HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION,

    id:
      "decision-1",

    organizationId:
      "org-1",

    assemblyId:
      "assembly-1",

    scanVersion:
      "hspp-assembly-scan-v1",

    decisionPolicyVersion:
      HSPP_ASSEMBLY_DECISION_VERSION,

    decisionState:
      state,

    decisionReason:
      reason,

    decidedAt:
      "2026-08-21T10:00:00.000Z",

    authority:
      "NONE",
  };
}

test(
  "NOT_READY assembly is denied authority candidacy",
  () => {
    const input =
      persistedDecision(
        "NOT_READY",
        "ASSEMBLY_NOT_SCANNED"
      );

    const result =
      evaluateHsppAssemblyAuthority(
        input
      );

    assert.equal(
      result.state,
      "DENIED"
    );

    assert.equal(
      result.reason,
      "ASSEMBLY_NOT_READY"
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "CONFLICTED assembly is denied authority candidacy",
  () => {
    const result =
      evaluateHsppAssemblyAuthority(
        persistedDecision(
          "CONFLICTED",
          "CANONICAL_CONFLICT_PRESENT"
        )
      );

    assert.equal(
      result.state,
      "DENIED"
    );

    assert.equal(
      result.reason,
      "ASSEMBLY_CONFLICTED"
    );
  }
);

test(
  "UNRESOLVED assembly is denied authority candidacy",
  () => {
    const result =
      evaluateHsppAssemblyAuthority(
        persistedDecision(
          "UNRESOLVED",
          "NO_COMPARABLE_AGREEMENT"
        )
      );

    assert.equal(
      result.state,
      "DENIED"
    );

    assert.equal(
      result.reason,
      "ASSEMBLY_UNRESOLVED"
    );
  }
);

test(
  "CONSISTENT assembly becomes assessment candidate only",
  () => {
    const result =
      evaluateHsppAssemblyAuthority(
        persistedDecision(
          "CONSISTENT",
          "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
        )
      );

    assert.equal(
      result.state,
      "ASSESSMENT_CANDIDATE"
    );

    assert.equal(
      result.reason,
      "CONSISTENT_ASSEMBLY_CANDIDATE"
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "unsupported B11E persistence version fails closed",
  () => {
    const input = {
      ...persistedDecision(
        "CONSISTENT",
        "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
      ),

      persistenceVersion:
        "unsupported-persistence-version" as
          typeof HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION,
    };

    const result =
      evaluateHsppAssemblyAuthority(
        input
      );

    assert.equal(
      result.state,
      "DENIED"
    );

    assert.equal(
      result.reason,
      "UNSUPPORTED_PERSISTENCE_VERSION"
    );
  }
);

test(
  "unsupported B11D decision-policy version fails closed",
  () => {
    const input = {
      ...persistedDecision(
        "CONSISTENT",
        "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
      ),

      decisionPolicyVersion:
        "unsupported-decision-version",
    };

    const result =
      evaluateHsppAssemblyAuthority(
        input
      );

    assert.equal(
      result.state,
      "DENIED"
    );

    assert.equal(
      result.reason,
      "UNSUPPORTED_DECISION_POLICY_VERSION"
    );
  }
);

test(
  "non-NONE persisted authority fails closed",
  () => {
    const input = {
      ...persistedDecision(
        "CONSISTENT",
        "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
      ),

      authority:
        "UNSAFE" as "NONE",
    };

    const result =
      evaluateHsppAssemblyAuthority(
        input
      );

    assert.equal(
      result.state,
      "DENIED"
    );

    assert.equal(
      result.reason,
      "AUTHORITY_NOT_NONE"
    );
  }
);

test(
  "mismatched B11D state and reason fail closed",
  () => {
    const input =
      persistedDecision(
        "CONSISTENT",
        "CANONICAL_CONFLICT_PRESENT"
      );

    const result =
      evaluateHsppAssemblyAuthority(
        input
      );

    assert.equal(
      result.state,
      "DENIED"
    );

    assert.equal(
      result.reason,
      "INVALID_ASSEMBLY_DECISION_PROVENANCE"
    );
  }
);

test(
  "authority candidacy evaluation is deterministic and pure",
  () => {
    const input =
      persistedDecision(
        "CONSISTENT",
        "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
      );

    const before =
      structuredClone(
        input
      );

    const first =
      evaluateHsppAssemblyAuthority(
        input
      );

    const second =
      evaluateHsppAssemblyAuthority(
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