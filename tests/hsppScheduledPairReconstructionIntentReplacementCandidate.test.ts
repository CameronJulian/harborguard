import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
} from "../lib/hspp/evaluateHsppReservoirEligibility";

import {
  HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,
} from "../lib/hspp/readHsppReservoirPairPage";

import {
  HSPP_SCHEDULED_PAIR_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION,
  readHsppScheduledPairReconstructionIntentReplacementCandidate,
} from "../lib/hspp/readHsppScheduledPairReconstructionIntentReplacementCandidate";


const dummySupabase =
  {} as SupabaseClient;

const validBase = {
  supabase:
    dummySupabase,

  organizationId:
    "00000000-0000-0000-0000-000000000001",

  replacementEvidenceId:
    "00000000-0000-0000-0000-000000000002",

  replacementEvidenceIntegrityFingerprint:
    "a".repeat(64),

  discoveryPolicyVersion:
    null,

  pairSchedulingVersion:
    HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

  reservoirEligibilityPolicyVersion:
    HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
} as const;


test(
  "Q14ag33E2B exposes the scheduled-pair reader version",
  () => {
    assert.equal(
      HSPP_SCHEDULED_PAIR_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION,
      "hspp-scheduled-pair-reconstruction-intent-replacement-candidate-reader-v1",
    );
  },
);


test(
  "Q14ag33E2B rejects fabricated discovery provenance before hydration",
  async () => {
    await assert.rejects(
      readHsppScheduledPairReconstructionIntentReplacementCandidate({
        ...validBase,

        discoveryPolicyVersion:
          "fabricated-discovery-version" as never,
      }),
      /must not expose fabricated discovery provenance/,
    );
  },
);


test(
  "Q14ag33E2B rejects stale pair-scheduling provenance before hydration",
  async () => {
    await assert.rejects(
      readHsppScheduledPairReconstructionIntentReplacementCandidate({
        ...validBase,

        pairSchedulingVersion:
          "stale-pair-scheduling-version",
      }),
      /does not match the current PAIR scheduling authority/,
    );
  },
);


test(
  "Q14ag33E2B rejects stale B06A provenance before hydration",
  async () => {
    await assert.rejects(
      readHsppScheduledPairReconstructionIntentReplacementCandidate({
        ...validBase,

        reservoirEligibilityPolicyVersion:
          "stale-reservoir-eligibility-version",
      }),
      /does not match the current B06A authority/,
    );
  },
);


test(
  "Q14ag33E2B valid provenance delegates to the E2A async hydration core",
  async () => {
    await assert.rejects(
      readHsppScheduledPairReconstructionIntentReplacementCandidate({
        ...validBase,
      }),
      /trusted service-role Supabase client is required/,
    );
  },
);