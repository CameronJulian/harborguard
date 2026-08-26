import assert from "node:assert/strict";
import test from "node:test";

import type { HsppReconstructionClaimMaterial } from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";
import {
  resolveHsppReservoirLifecycleRoute,
} from "@/lib/hspp/resolveHsppReservoirLifecycleRoute";
import type { RunHsppReservoirReevaluationResult } from "@/lib/hspp/runHsppReservoirReevaluation";

type Classification =
  | "NEVER_ASSEMBLED"
  | "HISTORICAL_NOT_CURRENT"
  | "CURRENT_EFFECTIVE";

const FIRST_EVIDENCE_ID =
  "evidence-1";

const SECOND_EVIDENCE_ID =
  "evidence-2";

function makeResult(
  firstClassification: Classification,
  secondClassification: Classification,
): RunHsppReservoirReevaluationResult {
  return {
    organizationId:
      "org-1",

    discovery: {
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
  } as unknown as RunHsppReservoirReevaluationResult;
}

test(
  "fresh NEVER_ASSEMBLED pair routes to initial assembly",
  () => {
    const result =
      resolveHsppReservoirLifecycleRoute({
        reevaluationResult:
          makeResult(
            "NEVER_ASSEMBLED",
            "NEVER_ASSEMBLED",
          ),
        reconstructionMaterial:
          null,
      });

    assert.equal(
      result.state,
      "INITIAL_ASSEMBLY",
    );
  },
);

test(
  "authorized reconstruction material has precedence over a fresh pair",
  () => {
    const reconstructionMaterial =
      {
        organizationId:
          "org-1",
      } as unknown as HsppReconstructionClaimMaterial;

    const result =
      resolveHsppReservoirLifecycleRoute({
        reevaluationResult:
          makeResult(
            "NEVER_ASSEMBLED",
            "NEVER_ASSEMBLED",
          ),
        reconstructionMaterial,
      });

    assert.equal(
      result.state,
      "RECONSTRUCTION",
    );
  },
);

test(
  "historical plus fresh cannot enter initial H1 without reconstruction authority",
  () => {
    const result =
      resolveHsppReservoirLifecycleRoute({
        reevaluationResult:
          makeResult(
            "HISTORICAL_NOT_CURRENT",
            "NEVER_ASSEMBLED",
          ),
        reconstructionMaterial:
          null,
      });

    assert.equal(
      result.state,
      "NO_LIFECYCLE_WRITE",
    );
  },
);

test(
  "CURRENT_EFFECTIVE evidence cannot enter initial H1",
  () => {
    const result =
      resolveHsppReservoirLifecycleRoute({
        reevaluationResult:
          makeResult(
            "CURRENT_EFFECTIVE",
            "NEVER_ASSEMBLED",
          ),
        reconstructionMaterial:
          null,
      });

    assert.equal(
      result.state,
      "NO_LIFECYCLE_WRITE",
    );
  },
);

test(
  "non-candidate B07B state routes to no lifecycle write",
  () => {
    const input =
      makeResult(
        "NEVER_ASSEMBLED",
        "NEVER_ASSEMBLED",
      );

    (
      input.reevaluation as unknown as {
        state: string;
        assemblyCandidates: unknown[];
      }
    ).state =
      "NO_ASSEMBLY_CANDIDATE";

    (
      input.reevaluation as unknown as {
        state: string;
        assemblyCandidates: unknown[];
      }
    ).assemblyCandidates =
      [];

    const result =
      resolveHsppReservoirLifecycleRoute({
        reevaluationResult:
          input,
        reconstructionMaterial:
          null,
      });

    assert.equal(
      result.state,
      "NO_LIFECYCLE_WRITE",
    );
  },
);

test(
  "selected identity missing from B07B discovery fails closed",
  () => {
    const input =
      makeResult(
        "NEVER_ASSEMBLED",
        "NEVER_ASSEMBLED",
      );

    (
      input.reevaluation
        .assemblyCandidates[0] as unknown as {
          secondEvidenceId: string;
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
  },
);

test(
  "reconstruction material from another organization fails closed",
  () => {
    const reconstructionMaterial =
      {
        organizationId:
          "other-org",
      } as unknown as HsppReconstructionClaimMaterial;

    assert.throws(
      () =>
        resolveHsppReservoirLifecycleRoute({
          reevaluationResult:
            makeResult(
              "NEVER_ASSEMBLED",
              "NEVER_ASSEMBLED",
            ),
          reconstructionMaterial,
        }),
      /organization does not match/,
    );
  },
);
