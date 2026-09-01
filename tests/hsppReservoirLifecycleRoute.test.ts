import assert from "node:assert/strict";
import test from "node:test";

import {
  createHsppReservoirDownstreamSnapshotFromB07B,
} from "@/lib/hspp/createHsppReservoirDownstreamSnapshot";

import type {
  HsppReconstructionClaimMaterial,
} from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";

import {
  resolveHsppReservoirLifecycleRoute,
  resolveHsppReservoirLifecycleRouteFromSnapshot,
} from "@/lib/hspp/resolveHsppReservoirLifecycleRoute";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";


type Classification =
  | "NEVER_ASSEMBLED"
  | "HISTORICAL_NOT_CURRENT"
  | "CURRENT_EFFECTIVE";


const ORGANIZATION_ID =
  "org-1";

const FIRST_EVIDENCE_ID =
  "evidence-1";

const SECOND_EVIDENCE_ID =
  "evidence-2";


function makeResult(
  firstClassification:
    Classification,

  secondClassification:
    Classification,
): RunHsppReservoirReevaluationResult {
  return {
    organizationId:
      ORGANIZATION_ID,

    discovery: {
      organizationId:
        ORGANIZATION_ID,

      candidates: [
        {
          evidenceId:
            FIRST_EVIDENCE_ID,

          membershipClassification:
            firstClassification,
        },

        {
          evidenceId:
            SECOND_EVIDENCE_ID,

          membershipClassification:
            secondClassification,
        },
      ],
    },

    reevaluation: {
      state:
        "ASSEMBLY_CANDIDATE",

      assemblyCandidates: [
        {
          firstEvidenceId:
            FIRST_EVIDENCE_ID,

          secondEvidenceId:
            SECOND_EVIDENCE_ID,

          membershipDecision: {
            eligible:
              true,
          },
        },
      ],
    },
  } as unknown as
    RunHsppReservoirReevaluationResult;
}


function resolveBoth({
  result,
  reconstructionMaterial,
}: {
  result:
    RunHsppReservoirReevaluationResult;

  reconstructionMaterial:
    HsppReconstructionClaimMaterial | null;
}) {
  const legacy =
    resolveHsppReservoirLifecycleRoute({
      reevaluationResult:
        result,

      reconstructionMaterial,
    });


  const neutral =
    resolveHsppReservoirLifecycleRouteFromSnapshot({
      snapshot:
        createHsppReservoirDownstreamSnapshotFromB07B(
          result,
        ),

      reconstructionMaterial,
    });


  assert.deepEqual(
    neutral,
    legacy,
  );


  return {
    legacy,
    neutral,
  };
}


test(
  "legacy B07B wrapper and neutral core return identical fresh initial-assembly route",
  () => {
    const result =
      resolveBoth({
        result:
          makeResult(
            "NEVER_ASSEMBLED",
            "NEVER_ASSEMBLED",
          ),

        reconstructionMaterial:
          null,
      });


    assert.equal(
      result.legacy.state,
      "INITIAL_ASSEMBLY",
    );

    assert.equal(
      result.neutral.state,
      "INITIAL_ASSEMBLY",
    );
  },
);


test(
  "legacy B07B wrapper and neutral core preserve authorized reconstruction precedence",
  () => {
    const reconstructionMaterial =
      {
        organizationId:
          ORGANIZATION_ID,
      } as unknown as
        HsppReconstructionClaimMaterial;


    const result =
      resolveBoth({
        result:
          makeResult(
            "NEVER_ASSEMBLED",
            "NEVER_ASSEMBLED",
          ),

        reconstructionMaterial,
      });


    assert.equal(
      result.legacy.state,
      "RECONSTRUCTION",
    );

    assert.equal(
      result.neutral.state,
      "RECONSTRUCTION",
    );
  },
);


test(
  "historical plus fresh remains fail-closed for initial H1",
  () => {
    const result =
      resolveBoth({
        result:
          makeResult(
            "HISTORICAL_NOT_CURRENT",
            "NEVER_ASSEMBLED",
          ),

        reconstructionMaterial:
          null,
      });


    assert.equal(
      result.legacy.state,
      "NO_LIFECYCLE_WRITE",
    );

    assert.equal(
      result.neutral.state,
      "NO_LIFECYCLE_WRITE",
    );
  },
);


test(
  "CURRENT_EFFECTIVE evidence remains fail-closed for initial H1",
  () => {
    const result =
      resolveBoth({
        result:
          makeResult(
            "CURRENT_EFFECTIVE",
            "NEVER_ASSEMBLED",
          ),

        reconstructionMaterial:
          null,
      });


    assert.equal(
      result.legacy.state,
      "NO_LIFECYCLE_WRITE",
    );

    assert.equal(
      result.neutral.state,
      "NO_LIFECYCLE_WRITE",
    );
  },
);


test(
  "non-candidate reevaluation remains a no-write route through both entry points",
  () => {
    const input =
      makeResult(
        "NEVER_ASSEMBLED",
        "NEVER_ASSEMBLED",
      );


    (
      input.reevaluation as unknown as {
        state:
          string;

        assemblyCandidates:
          unknown[];
      }
    ).state =
      "NO_ASSEMBLY_CANDIDATE";


    (
      input.reevaluation as unknown as {
        state:
          string;

        assemblyCandidates:
          unknown[];
      }
    ).assemblyCandidates =
      [];


    const result =
      resolveBoth({
        result:
          input,

        reconstructionMaterial:
          null,
      });


    assert.equal(
      result.legacy.state,
      "NO_LIFECYCLE_WRITE",
    );

    assert.equal(
      result.neutral.state,
      "NO_LIFECYCLE_WRITE",
    );
  },
);


test(
  "selected identity missing from current candidates remains fail-closed",
  () => {
    const input =
      makeResult(
        "NEVER_ASSEMBLED",
        "NEVER_ASSEMBLED",
      );


    (
      input.reevaluation
        .assemblyCandidates[0] as unknown as {
        secondEvidenceId:
          string;
      }
    ).secondEvidenceId =
      "missing-evidence";


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRoute({
          reevaluationResult:
            input,

          reconstructionMaterial:
            null,
        }),

      /was not found in discovery candidates/,
    );


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRouteFromSnapshot({
          snapshot:
            createHsppReservoirDownstreamSnapshotFromB07B(
              input,
            ),

          reconstructionMaterial:
            null,
        }),

      /was not found in discovery candidates/,
    );
  },
);


test(
  "reconstruction organization guard remains fail-closed through both entry points",
  () => {
    const input =
      makeResult(
        "NEVER_ASSEMBLED",
        "NEVER_ASSEMBLED",
      );


    const reconstructionMaterial =
      {
        organizationId:
          "other-org",
      } as unknown as
        HsppReconstructionClaimMaterial;


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRoute({
          reevaluationResult:
            input,

          reconstructionMaterial,
        }),

      /organization does not match/,
    );


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRouteFromSnapshot({
          snapshot:
            createHsppReservoirDownstreamSnapshotFromB07B(
              input,
            ),

          reconstructionMaterial,
        }),

      /organization does not match/,
    );
  },
);


test(
  "eligible membership decision remains mandatory for initial assembly",
  () => {
    const input =
      makeResult(
        "NEVER_ASSEMBLED",
        "NEVER_ASSEMBLED",
      );


    (
      input.reevaluation
        .assemblyCandidates[0]
        .membershipDecision as unknown as {
        eligible:
          boolean;
      }
    ).eligible =
      false;


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRoute({
          reevaluationResult:
            input,

          reconstructionMaterial:
            null,
        }),

      /must preserve an eligible membership decision/,
    );


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRouteFromSnapshot({
          snapshot:
            createHsppReservoirDownstreamSnapshotFromB07B(
              input,
            ),

          reconstructionMaterial:
            null,
        }),

      /must preserve an eligible membership decision/,
    );
  },
);


test(
  "ASSEMBLY_CANDIDATE state without an assembly candidate remains fail-closed",
  () => {
    const input =
      makeResult(
        "NEVER_ASSEMBLED",
        "NEVER_ASSEMBLED",
      );


    (
      input.reevaluation as unknown as {
        assemblyCandidates:
          unknown[];
      }
    ).assemblyCandidates =
      [];


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRoute({
          reevaluationResult:
            input,

          reconstructionMaterial:
            null,
        }),

      /must expose at least one assembly candidate/,
    );


    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRouteFromSnapshot({
          snapshot:
            createHsppReservoirDownstreamSnapshotFromB07B(
              input,
            ),

          reconstructionMaterial:
            null,
        }),

      /must expose at least one assembly candidate/,
    );
  },
);