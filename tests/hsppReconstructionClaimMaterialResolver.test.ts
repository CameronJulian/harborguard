import assert from "node:assert/strict";
import test from "node:test";

import type {
  HsppReservoirCandidate,
} from "../lib/hspp/readHsppReservoirCandidates";

import type {
  RunHsppReservoirReevaluationResult,
} from "../lib/hspp/runHsppReservoirReevaluation";

import {
  HSPP_RECONSTRUCTION_CLAIM_MATERIAL_RESOLVER_VERSION,
  resolveHsppReconstructionClaimMaterial,
} from "../lib/hspp/resolveHsppReconstructionClaimMaterial";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const OTHER_ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000002";

const A =
  "20000000-0000-4000-8000-000000000001";

const B =
  "20000000-0000-4000-8000-000000000002";

const C =
  "20000000-0000-4000-8000-000000000003";

const C2 =
  "20000000-0000-4000-8000-000000000004";

const A_FP =
  "a".repeat(64);

const B_FP =
  "b".repeat(64);

const C_FP =
  "c".repeat(64);

const C2_FP =
  "d".repeat(64);

const MEMBERSHIP_POLICY =
  "hspp-assembly-membership-v1";


function candidate(
  evidenceId: string,
  membershipClassification:
    | "NEVER_ASSEMBLED"
    | "HISTORICAL_NOT_CURRENT"
    | "CURRENT_EFFECTIVE",
  {
    fingerprint =
      "e".repeat(64),

    persistedEvidenceId =
      evidenceId,

    persisted =
      true,
  }: {
    fingerprint?: string;
    persistedEvidenceId?: string;
    persisted?: boolean;
  } = {},
): HsppReservoirCandidate {
  return {
    evidenceId,

    operationalRead: {
      evidence:
        persisted
          ? {
              id:
                persistedEvidenceId,

              organizationId:
                ORGANIZATION_ID,

              integrityFingerprint:
                fingerprint,
            }
          : null,
    },

    hasAssemblyMembership:
      membershipClassification ===
      "CURRENT_EFFECTIVE",

    membershipClassification,

    reservoirDecision: {
      eligible:
        true,
    },
  } as unknown as HsppReservoirCandidate;
}


function pair(
  firstEvidenceId: string,
  secondEvidenceId: string,
  policyVersion:
    string =
      MEMBERSHIP_POLICY,
  eligible:
    boolean =
      true,
) {
  return {
    firstEvidenceId,

    secondEvidenceId,

    membershipDecision: {
      eligible,

      policyVersion,

      reason:
        "TEST_MEMBERSHIP",

      distanceMeters:
        null,

      timeDeltaMs:
        null,
    },
  };
}


function lifeguardResult({
  candidates,
  assemblyCandidates,
  state =
    "ASSEMBLY_CANDIDATE",
  organizationId =
    ORGANIZATION_ID,
  discoveryOrganizationId =
    ORGANIZATION_ID,
}: {
  candidates:
    HsppReservoirCandidate[];

  assemblyCandidates:
    ReturnType<typeof pair>[];

  state?:
    | "NO_COUNTERPART"
    | "MEMBERSHIP_DENIED"
    | "ASSEMBLY_CANDIDATE";

  organizationId?:
    string;

  discoveryOrganizationId?:
    string;
}): RunHsppReservoirReevaluationResult {
  return {
    runnerVersion:
      "hspp-reservoir-reevaluation-runner-v1",

    discoveryPolicyVersion:
      "hspp-reservoir-discovery-v1",

    reevaluationPolicyVersion:
      "hspp-reservoir-reevaluation-v1",

    organizationId,

    discovery: {
      policyVersion:
        "hspp-reservoir-discovery-v1",

      organizationId:
        discoveryOrganizationId,

      requestedLimit:
        100,

      candidates,
    },

    reevaluation: {
      policyVersion:
        "hspp-reservoir-reevaluation-v1",

      state,

      candidateCount:
        candidates.length,

      comparisonCount:
        assemblyCandidates.length,

      comparisonLimit:
        100,

      evaluations:
        assemblyCandidates,

      assemblyCandidates,
    },
  } as unknown as
    RunHsppReservoirReevaluationResult;
}


test(
  "Q14ag31S exposes the pure claim-material resolver version",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_CLAIM_MATERIAL_RESOLVER_VERSION,
      "hspp-reconstruction-claim-material-resolver-v1",
    );
  },
);


test(
  "Q14ag31S returns null for a consistent non-candidate B07B snapshot",
  () => {
    const result =
      resolveHsppReconstructionClaimMaterial({
        organizationId:
          ORGANIZATION_ID,

        reevaluationResult:
          lifeguardResult({
            candidates: [
              candidate(
                A,
                "NEVER_ASSEMBLED",
                {
                  fingerprint:
                    A_FP,
                },
              ),
            ],

            assemblyCandidates:
              [],

            state:
              "NO_COUNTERPART",
          }),
      });

    assert.equal(
      result,
      null,
    );
  },
);


test(
  "Q14ag31S preserves B07A order and chooses the first reconstruction lifecycle pair",
  () => {
    const result =
      resolveHsppReconstructionClaimMaterial({
        organizationId:
          ORGANIZATION_ID,

        reevaluationResult:
          lifeguardResult({
            candidates: [
              candidate(
                A,
                "NEVER_ASSEMBLED",
                {
                  fingerprint:
                    A_FP,
                },
              ),

              candidate(
                B,
                "NEVER_ASSEMBLED",
                {
                  fingerprint:
                    B_FP,
                },
              ),

              candidate(
                C,
                "HISTORICAL_NOT_CURRENT",
                {
                  fingerprint:
                    C_FP,
                },
              ),

              candidate(
                C2,
                "NEVER_ASSEMBLED",
                {
                  fingerprint:
                    C2_FP,
                },
              ),
            ],

            assemblyCandidates: [
              pair(
                A,
                B,
              ),

              pair(
                C,
                C2,
              ),
            ],
          }),
      });

    assert.ok(
      result,
    );

    assert.deepEqual(
      result.selectedEvidenceIds,
      [
        C,
        C2,
      ],
    );

    assert.equal(
      result.selectedFirstEvidenceId,
      C,
    );

    assert.equal(
      result.selectedSecondEvidenceId,
      C2,
    );

    assert.equal(
      result.historicalEvidenceId,
      C,
    );

    assert.equal(
      result.replacementEvidenceId,
      C2,
    );

    assert.equal(
      result.historicalCandidate.evidenceId,
      C,
    );

    assert.equal(
      result.replacementCandidate.evidenceId,
      C2,
    );

    assert.equal(
      result.historicalEvidenceIntegrityFingerprint,
      C_FP,
    );

    assert.equal(
      result.replacementEvidenceIntegrityFingerprint,
      C2_FP,
    );

    assert.equal(
      result.membershipPolicyVersion,
      MEMBERSHIP_POLICY,
    );

    assert.equal(
      result.discoveryPolicyVersion,
      "hspp-reservoir-discovery-v1",
    );

    assert.equal(
      result.reevaluationPolicyVersion,
      "hspp-reservoir-reevaluation-v1",
    );
  },
);


test(
  "Q14ag31S normalizes historical and replacement roles without changing reverse B07A orientation",
  () => {
    const result =
      resolveHsppReconstructionClaimMaterial({
        organizationId:
          ORGANIZATION_ID,

        reevaluationResult:
          lifeguardResult({
            candidates: [
              candidate(
                C,
                "HISTORICAL_NOT_CURRENT",
                {
                  fingerprint:
                    C_FP,
                },
              ),

              candidate(
                C2,
                "NEVER_ASSEMBLED",
                {
                  fingerprint:
                    C2_FP,
                },
              ),
            ],

            assemblyCandidates: [
              pair(
                C2,
                C,
              ),
            ],
          }),
      });

    assert.ok(
      result,
    );

    assert.deepEqual(
      result.selectedEvidenceIds,
      [
        C2,
        C,
      ],
    );

    assert.equal(
      result.selectedFirstEvidenceId,
      C2,
    );

    assert.equal(
      result.selectedSecondEvidenceId,
      C,
    );

    assert.equal(
      result.historicalEvidenceId,
      C,
    );

    assert.equal(
      result.replacementEvidenceId,
      C2,
    );

    assert.equal(
      result.historicalEvidenceIntegrityFingerprint,
      C_FP,
    );

    assert.equal(
      result.replacementEvidenceIntegrityFingerprint,
      C2_FP,
    );
  },
);


test(
  "Q14ag31S fails closed when a selected evidence id resolves to duplicate discovery candidates",
  () => {
    assert.throws(
      () =>
        resolveHsppReconstructionClaimMaterial({
          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                  {
                    fingerprint:
                      C2_FP,
                  },
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
        }),
      /must resolve to exactly one discovery candidate/,
    );
  },
);


test(
  "Q14ag31S rejects selected evidence with no persisted immutable evidence record",
  () => {
    assert.throws(
      () =>
        resolveHsppReconstructionClaimMaterial({
          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                  {
                    persisted:
                      false,
                  },
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
        }),
      /has no persisted evidence/,
    );
  },
);


test(
  "Q14ag31S rejects persisted evidence identity mismatch",
  () => {
    assert.throws(
      () =>
        resolveHsppReconstructionClaimMaterial({
          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                  {
                    fingerprint:
                      C2_FP,

                    persistedEvidenceId:
                      A,
                  },
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
        }),
      /evidence identity does not match discovery identity/,
    );
  },
);


test(
  "Q14ag31S requires lowercase SHA-256 immutable fingerprints",
  () => {
    assert.throws(
      () =>
        resolveHsppReconstructionClaimMaterial({
          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                  {
                    fingerprint:
                      "D".repeat(64),
                  },
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
        }),
      /lowercase SHA-256 immutable integrity fingerprint/,
    );
  },
);


test(
  "Q14ag31S rejects an ineligible row inside B07A assemblyCandidates",
  () => {
    assert.throws(
      () =>
        resolveHsppReconstructionClaimMaterial({
          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                  {
                    fingerprint:
                      C2_FP,
                  },
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                  MEMBERSHIP_POLICY,
                  false,
                ),
              ],
            }),
        }),
      /eligible membership decision/,
    );
  },
);


test(
  "Q14ag31S rejects blank selected membership policy provenance",
  () => {
    assert.throws(
      () =>
        resolveHsppReconstructionClaimMaterial({
          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            lifeguardResult({
              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                  {
                    fingerprint:
                      C2_FP,
                  },
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                  "   ",
                ),
              ],
            }),
        }),
      /selected\.membershipDecision\.policyVersion/,
    );
  },
);


test(
  "Q14ag31S rejects B07B organization mismatch before producing claim material",
  () => {
    assert.throws(
      () =>
        resolveHsppReconstructionClaimMaterial({
          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            lifeguardResult({
              organizationId:
                OTHER_ORGANIZATION_ID,

              candidates: [
                candidate(
                  C,
                  "HISTORICAL_NOT_CURRENT",
                  {
                    fingerprint:
                      C_FP,
                  },
                ),

                candidate(
                  C2,
                  "NEVER_ASSEMBLED",
                  {
                    fingerprint:
                      C2_FP,
                  },
                ),
              ],

              assemblyCandidates: [
                pair(
                  C,
                  C2,
                ),
              ],
            }),
        }),
      /runner organization does not match/,
    );
  },
);
