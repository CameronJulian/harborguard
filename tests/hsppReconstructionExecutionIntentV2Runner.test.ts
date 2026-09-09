import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  HsppReconstructionExecutionIntentV2,
} from "../lib/hspp/readHsppReconstructionExecutionIntentsV2";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_V2_RUNNER_VERSION,
  runHsppReconstructionExecutionIntentV2,
  type HsppReconstructionExecutionIntentV2Dependencies,
} from "../lib/hspp/runHsppReconstructionExecutionIntentV2";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const CHILD_ID =
  "20000000-0000-4000-8000-000000000001";

const FIRST_ID =
  "30000000-0000-4000-8000-000000000001";

const SECOND_ID =
  "40000000-0000-4000-8000-000000000001";

const HISTORICAL_ID =
  FIRST_ID;

const REPLACEMENT_ID =
  SECOND_ID;


const supabase =
  {} as SupabaseClient;


type B07BClaimedIntent =
  Extract<
    Extract<
      HsppReconstructionExecutionIntentV2,
      {
        selectionSource:
          "B07B_DISCOVERY";
      }
    >,
    {
      persistenceState:
        "CLAIMED_NOT_PERSISTED";
    }
  >;


type ScheduledPairClaimedIntent =
  Extract<
    Extract<
      HsppReconstructionExecutionIntentV2,
      {
        selectionSource:
          "SCHEDULED_PAIR";
      }
    >,
    {
      persistenceState:
        "CLAIMED_NOT_PERSISTED";
    }
  >;


function baseIntent(
  overrides:
    Partial<B07BClaimedIntent> = {},
): B07BClaimedIntent {
  return {
    intentId:
      "50000000-0000-4000-8000-000000000001",

    organizationId:
      ORGANIZATION_ID,

    childAssemblyId:
      CHILD_ID,

    selectedFirstEvidenceId:
      FIRST_ID,

    selectedSecondEvidenceId:
      SECOND_ID,

    historicalEvidenceId:
      HISTORICAL_ID,

    historicalEvidenceIntegrityFingerprint:
      "historical-fingerprint",

    replacementEvidenceId:
      REPLACEMENT_ID,

    replacementEvidenceIntegrityFingerprint:
      "replacement-fingerprint",

    reservoirEligibilityPolicyVersion:
      "hspp-reservoir-eligibility-v1",

    reevaluationPolicyVersion:
      "hspp-reevaluation-v1",

    membershipPolicyVersion:
      "hspp-membership-v1",

    reconstructionPolicyVersion:
      "hspp-reconstruction-v1",

    reconstructionReason:
      "TEST",

    intentVersion:
      "hspp-reconstruction-execution-intent-v1",

    createdAt:
      "2026-09-02T12:00:00.000Z",

    selectionSource:
      "B07B_DISCOVERY",

    discoveryPolicyVersion:
      "hspp-reservoir-discovery-v1",

    pairSchedulingVersion:
      null,

    persistenceState:
      "CLAIMED_NOT_PERSISTED",

    reconstructionId:
      null,

    parentAssemblyId:
      null,

    assemblyState:
      null,

    sealedAt:
      null,

    ...overrides,
  };
}


function scheduledIntent(
  overrides:
    Partial<ScheduledPairClaimedIntent> = {},
): ScheduledPairClaimedIntent {
  const common =
    baseIntent();

  return {
    ...common,

    selectionSource:
      "SCHEDULED_PAIR",

    discoveryPolicyVersion:
      null,

    pairSchedulingVersion:
      "hspp-reservoir-pair-scheduling-v1",

    ...overrides,
  };
}

type Calls = {
  recovery: number;
  b07b: number;
  pair: number;
  execution: number;

  b07bInput:
    unknown[];

  pairInput:
    unknown[];

  executionInput:
    unknown[];
};


function dependencyHarness({
  recovered = false,
  b07bOrganizationId = ORGANIZATION_ID,
  b07bReplacementEvidenceId = REPLACEMENT_ID,
  pairOrganizationId = ORGANIZATION_ID,
  pairReplacementEvidenceId = REPLACEMENT_ID,
}: {
  recovered?: boolean;
  b07bOrganizationId?: string;
  b07bReplacementEvidenceId?: string;
  pairOrganizationId?: string;
  pairReplacementEvidenceId?: string;
} = {}) {
  const calls: Calls = {
    recovery: 0,
    b07b: 0,
    pair: 0,
    execution: 0,
    b07bInput: [],
    pairInput: [],
    executionInput: [],
  };

  const candidate = {
    evidenceId:
      REPLACEMENT_ID,
  } as never;

  const dependencies = {
    recoverDurableIntentCore:
      async () => {
        calls.recovery++;

        if (!recovered) {
          return null;
        }

        return {
          parentAssemblyId:
            "60000000-0000-4000-8000-000000000001",

          reconstructionId:
            "70000000-0000-4000-8000-000000000001",

          assemblyState:
            "SEALED",

          memberCount:
            2,
        };
      },

    readB07BReplacementCandidate:
      async (input: unknown) => {
        calls.b07b++;
        calls.b07bInput.push(
          input,
        );

        return {
          readerVersion:
            "test-b07b-reader",

          discoveryPolicyVersion:
            "hspp-reservoir-discovery-v1",

          organizationId:
            b07bOrganizationId,

          replacementEvidenceId:
            b07bReplacementEvidenceId,

          candidate,
        };
      },

    readScheduledPairReplacementCandidate:
      async (input: unknown) => {
        calls.pair++;
        calls.pairInput.push(
          input,
        );

        return {
          readerVersion:
            "test-pair-reader",

          discoveryPolicyVersion:
            null,

          pairSchedulingVersion:
            "hspp-reservoir-pair-scheduling-v1",

          reservoirEligibilityPolicyVersion:
            "hspp-reservoir-eligibility-v1",

          organizationId:
            pairOrganizationId,

          replacementEvidenceId:
            pairReplacementEvidenceId,

          candidate,
        };
      },

    runPostHydrationExecutionCore:
      async (input: unknown) => {
        calls.execution++;
        calls.executionInput.push(
          input,
        );

        return {
          state:
            "RECONSTRUCTION_PERSISTED",

          parentAssemblyId:
            "60000000-0000-4000-8000-000000000002",

          reconstructionId:
            "70000000-0000-4000-8000-000000000002",

          assemblyState:
            "OPEN",

          idempotentRecovery:
            false,

          memberCount:
            2,
        };
      },
  } as unknown as HsppReconstructionExecutionIntentV2Dependencies;

  return {
    calls,
    candidate,
    dependencies,
  };
}


test(
  "E3D2 recovery FOUND short-circuits all producer hydration and E3C2 execution",
  async () => {
    const harness =
      dependencyHarness({
        recovered:
          true,
      });

    const intent =
      scheduledIntent();

    const result =
      await runHsppReconstructionExecutionIntentV2(
        {
          supabase,
          intent,
        },
        harness.dependencies,
      );

    assert.equal(
      harness.calls.recovery,
      1,
    );

    assert.equal(
      harness.calls.b07b,
      0,
    );

    assert.equal(
      harness.calls.pair,
      0,
    );

    assert.equal(
      harness.calls.execution,
      0,
    );

    assert.equal(
      result.state,
      "RECONSTRUCTION_RECOVERED",
    );
  },
);


test(
  "E3D2 B07B_DISCOVERY calls only B07B exact hydration",
  async () => {
    const harness =
      dependencyHarness();

    await runHsppReconstructionExecutionIntentV2(
      {
        supabase,
        intent:
          baseIntent(),
      },
      harness.dependencies,
    );

    assert.equal(
      harness.calls.b07b,
      1,
    );

    assert.equal(
      harness.calls.pair,
      0,
    );
  },
);


test(
  "E3D2 SCHEDULED_PAIR calls only scheduled-pair exact hydration",
  async () => {
    const harness =
      dependencyHarness();

    await runHsppReconstructionExecutionIntentV2(
      {
        supabase,
        intent:
          scheduledIntent(),
      },
      harness.dependencies,
    );

    assert.equal(
      harness.calls.b07b,
      0,
    );

    assert.equal(
      harness.calls.pair,
      1,
    );
  },
);


test(
  "E3D2 B07B identity mismatch fails before common execution",
  async () => {
    const harness =
      dependencyHarness({
        b07bReplacementEvidenceId:
          HISTORICAL_ID,
      });

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntentV2(
          {
            supabase,
            intent:
              baseIntent(),
          },
          harness.dependencies,
        ),
      /different evidence identity/,
    );

    assert.equal(
      harness.calls.execution,
      0,
    );
  },
);


test(
  "E3D2 scheduled-pair identity mismatch fails before common execution",
  async () => {
    const harness =
      dependencyHarness({
        pairOrganizationId:
          "10000000-0000-4000-8000-000000000099",
      });

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntentV2(
          {
            supabase,
            intent:
              scheduledIntent(),
          },
          harness.dependencies,
        ),
      /different organization/,
    );

    assert.equal(
      harness.calls.execution,
      0,
    );
  },
);


test(
  "E3D2 valid B07B candidate reaches E3C2 exactly once",
  async () => {
    const harness =
      dependencyHarness();

    await runHsppReconstructionExecutionIntentV2(
      {
        supabase,
        intent:
          baseIntent(),
      },
      harness.dependencies,
    );

    assert.equal(
      harness.calls.execution,
      1,
    );

    assert.equal(
      harness.calls.executionInput.length,
      1,
    );
  },
);


test(
  "E3D2 valid scheduled-pair candidate reaches E3C2 exactly once",
  async () => {
    const harness =
      dependencyHarness();

    await runHsppReconstructionExecutionIntentV2(
      {
        supabase,
        intent:
          scheduledIntent(),
      },
      harness.dependencies,
    );

    assert.equal(
      harness.calls.execution,
      1,
    );

    assert.equal(
      harness.calls.executionInput.length,
      1,
    );
  },
);


test(
  "E3D2 successor result preserves immutable selection provenance",
  async () => {
    const harness =
      dependencyHarness();

    const intent =
      scheduledIntent();

    const result =
      await runHsppReconstructionExecutionIntentV2(
        {
          supabase,
          intent,
        },
        harness.dependencies,
      );

    assert.equal(
      result.runnerVersion,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_V2_RUNNER_VERSION,
    );

    assert.equal(
      result.selectionSource,
      "SCHEDULED_PAIR",
    );

    assert.equal(
      result.discoveryPolicyVersion,
      null,
    );

    assert.equal(
      result.pairSchedulingVersion,
      intent.pairSchedulingVersion,
    );

    assert.equal(
      result.reservoirEligibilityPolicyVersion,
      intent.reservoirEligibilityPolicyVersion,
    );

    assert.equal(
      result.selectedFirstEvidenceId,
      FIRST_ID,
    );

    assert.equal(
      result.selectedSecondEvidenceId,
      SECOND_ID,
    );
  },
);


test(
  "E3D2 injected execution has no reader cycle scheduler or claim authority",
  async () => {
    const harness =
      dependencyHarness();

    await runHsppReconstructionExecutionIntentV2(
      {
        supabase,
        intent:
          scheduledIntent(),
      },
      harness.dependencies,
    );

    assert.equal(
      harness.calls.recovery,
      1,
    );

    assert.equal(
      harness.calls.pair,
      1,
    );

    assert.equal(
      harness.calls.execution,
      1,
    );

    assert.equal(
      harness.calls.b07b,
      0,
    );
  },
);