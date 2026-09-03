import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/claimHsppReconstructionExecutionIntentV2.ts",
    "utf8",
  );


test(
  "Q14ag34N wrapper owns only the successor claim RPC",
  () => {
    assert.match(
      source,
      /claim_hspp_reconstruction_execution_intent_v2/,
    );

    assert.match(
      source,
      /HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RPC/,
    );

    assert.doesNotMatch(
      source,
      /read_hspp_reservoir_pair_page/,
    );

    assert.doesNotMatch(
      source,
      /compare_and_swap_hspp_reservoir_pair_scan_state/,
    );
  },
);


test(
  "Q14ag34N wrapper models both producer provenance variants",
  () => {
    assert.match(
      source,
      /"B07B_DISCOVERY"/,
    );

    assert.match(
      source,
      /"SCHEDULED_PAIR"/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion[\s\S]*?string[\s\S]*?pairSchedulingVersion[\s\S]*?null/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion[\s\S]*?null[\s\S]*?pairSchedulingVersion[\s\S]*?string/,
    );
  },
);


test(
  "Q14ag34N wrapper maps B06A and producer-specific provenance into the RPC",
  () => {
    assert.match(
      source,
      /p_selection_source:\s*selectionSource/,
    );

    assert.match(
      source,
      /p_discovery_policy_version:\s*discoveryPolicyVersion/,
    );

    assert.match(
      source,
      /p_pair_scheduling_version:\s*pairSchedulingVersion/,
    );

    assert.match(
      source,
      /p_reservoir_eligibility_policy_version:\s*reservoirEligibilityPolicyVersion/,
    );

    assert.match(
      source,
      /p_reevaluation_policy_version:\s*reevaluationPolicyVersion/,
    );

    assert.match(
      source,
      /p_membership_policy_version:\s*membershipPolicyVersion/,
    );
  },
);


test(
  "Q14ag34N wrapper preserves canonical child recovery semantics",
  () => {
    assert.match(
      source,
      /idempotentRecovery/,
    );

    assert.match(
      source,
      /!idempotentRecovery[\s\S]*?childAssemblyId[\s\S]*?proposedChildAssemblyId/,
    );

    assert.doesNotMatch(
      source,
      /randomUUID/,
    );
  },
);
