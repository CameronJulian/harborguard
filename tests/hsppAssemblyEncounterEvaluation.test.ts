import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_ENCOUNTER_EVALUATION_VERSION,
  evaluateHsppAssemblyEncounter,
  type HsppAssemblyEncounterSnapshot,
} from "../lib/hspp/evaluateHsppAssemblyEncounter";


function member(
  evidenceId: string,
  ordinal: number,
  fingerprintCharacter: string,
) {
  return {
    membershipId:
      `membership-${evidenceId}`,

    evidenceId,

    integrityFingerprint:
      fingerprintCharacter.repeat(
        64,
      ),

    memberOrdinal:
      ordinal,

    sourceProvider:
      "encounter-test",

    sourceClass:
      "external_intelligence",

    observedAt:
      "2026-09-03T18:00:00.000Z",

    integrityStatus:
      "MATCH" as const,

    validationState:
      "VALID",
  };
}


function assembly(
  assemblyId: string,
  evidence:
    ReturnType<typeof member>[],
): HsppAssemblyEncounterSnapshot {
  return {
    organizationId:
      "11111111-1111-4111-8111-111111111111",

    assemblyId,

    members:
      evidence,
  };
}


test(
  "assembly encounter proposes only evidence absent from the opposite assembly and grants no authority",
  () => {
    const shared =
      "00000000-0000-4000-8000-000000000001";

    const firstOnly =
      "00000000-0000-4000-8000-000000000002";

    const secondOnly =
      "00000000-0000-4000-8000-000000000003";

    const result =
      evaluateHsppAssemblyEncounter({
        firstAssembly:
          assembly(
            "assembly-a",
            [
              member(
                shared,
                0,
                "a",
              ),

              member(
                firstOnly,
                1,
                "b",
              ),
            ],
          ),

        secondAssembly:
          assembly(
            "assembly-b",
            [
              member(
                shared,
                0,
                "a",
              ),

              member(
                secondOnly,
                1,
                "c",
              ),
            ],
          ),
      });

    assert.equal(
      result.policyVersion,
      HSPP_ASSEMBLY_ENCOUNTER_EVALUATION_VERSION,
    );

    assert.equal(
      result.state,
      "ENCOUNTER_CANDIDATE",
    );

    assert.equal(
      result.authority,
      "NONE",
    );

    assert.equal(
      result.candidateCount,
      2,
    );

    assert.deepEqual(
      result.candidates.map(
        (candidate) => ({
          source:
            candidate.sourceAssemblyId,

          target:
            candidate.targetAssemblyId,

          evidenceId:
            candidate.evidenceId,
        }),
      ),
      [
        {
          source:
            "assembly-a",

          target:
            "assembly-b",

          evidenceId:
            firstOnly,
        },

        {
          source:
            "assembly-b",

          target:
            "assembly-a",

          evidenceId:
            secondOnly,
        },
      ],
    );

    assert.equal(
      result.candidates.some(
        (candidate) =>
          candidate.evidenceId ===
          shared,
      ),
      false,
    );
  },
);


test(
  "identical assembly evidence passes the encounter with NO_MATCH",
  () => {
    const a =
      "00000000-0000-4000-8000-000000000001";

    const b =
      "00000000-0000-4000-8000-000000000002";

    const result =
      evaluateHsppAssemblyEncounter({
        firstAssembly:
          assembly(
            "assembly-a",
            [
              member(
                a,
                0,
                "a",
              ),

              member(
                b,
                1,
                "b",
              ),
            ],
          ),

        secondAssembly:
          assembly(
            "assembly-b",
            [
              member(
                a,
                0,
                "a",
              ),

              member(
                b,
                1,
                "b",
              ),
            ],
          ),
      });

    assert.equal(
      result.state,
      "NO_MATCH",
    );

    assert.equal(
      result.candidateCount,
      0,
    );

    assert.deepEqual(
      result.candidates,
      [],
    );

    assert.equal(
      result.authority,
      "NONE",
    );
  },
);


test(
  "encounter rejects cross-organization assemblies",
  () => {
    const first =
      assembly(
        "assembly-a",
        [
          member(
            "00000000-0000-4000-8000-000000000001",
            0,
            "a",
          ),
        ],
      );

    const second = {
      ...assembly(
        "assembly-b",
        [
          member(
            "00000000-0000-4000-8000-000000000002",
            0,
            "b",
          ),
        ],
      ),

      organizationId:
        "22222222-2222-4222-8222-222222222222",
    };

    assert.throws(
      () =>
        evaluateHsppAssemblyEncounter({
          firstAssembly:
            first,

          secondAssembly:
            second,
        }),
      /same organization/i,
    );
  },
);


test(
  "encounter rejects self encounter",
  () => {
    const first =
      assembly(
        "assembly-a",
        [
          member(
            "00000000-0000-4000-8000-000000000001",
            0,
            "a",
          ),
        ],
      );

    const second =
      assembly(
        "assembly-a",
        [
          member(
            "00000000-0000-4000-8000-000000000002",
            0,
            "b",
          ),
        ],
      );

    assert.throws(
      () =>
        evaluateHsppAssemblyEncounter({
          firstAssembly:
            first,

          secondAssembly:
            second,
        }),
      /cannot encounter itself/i,
    );
  },
);


test(
  "encounter fails closed when supplied member integrity is not MATCH",
  () => {
    const first =
      assembly(
        "assembly-a",
        [
          {
            ...member(
              "00000000-0000-4000-8000-000000000001",
              0,
              "a",
            ),

            integrityStatus:
              "MISMATCH" as unknown as "MATCH",
          },
        ],
      );

    const second =
      assembly(
        "assembly-b",
        [
          member(
            "00000000-0000-4000-8000-000000000002",
            0,
            "b",
          ),
        ],
      );

    assert.throws(
      () =>
        evaluateHsppAssemblyEncounter({
          firstAssembly:
            first,

          secondAssembly:
            second,
        }),
      /integrity MATCH/i,
    );
  },
);