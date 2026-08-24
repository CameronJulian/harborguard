import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RECONSTRUCTION_ACTIVATION_POLICY_RESOLVER_VERSION,
  HSPP_RECONSTRUCTION_ACTIVATION_POLICY_VERSION,
  HSPP_RECONSTRUCTION_ACTIVATION_REASON,
  resolveHsppReconstructionActivationPolicy,
} from "../lib/hspp/resolveHsppReconstructionActivationPolicy";


test(
  "Q14ag31Z exposes the versioned activation-policy resolver authority",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_ACTIVATION_POLICY_RESOLVER_VERSION,
      "hspp-reconstruction-activation-policy-resolver-v1",
    );
  },
);


test(
  "Q14ag31Z promotes the canonical durable reconstruction lifecycle pair",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_ACTIVATION_POLICY_VERSION,
      "hspp-reconstruction-policy-v1",
    );


    assert.equal(
      HSPP_RECONSTRUCTION_ACTIVATION_REASON,
      "REPLACE_UNSUITABLE_MEMBER",
    );
  },
);


test(
  "Q14ag31Z resolves the exact immutable zero-input activation policy",
  () => {
    const policy =
      resolveHsppReconstructionActivationPolicy();


    assert.deepEqual(
      policy,
      {
        resolverVersion:
          "hspp-reconstruction-activation-policy-resolver-v1",

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "REPLACE_UNSUITABLE_MEMBER",
      },
    );


    assert.equal(
      Object.isFrozen(
        policy,
      ),
      true,
    );
  },
);


test(
  "Q14ag31Z is deterministic across repeated zero-input resolution",
  () => {
    const first =
      resolveHsppReconstructionActivationPolicy();

    const second =
      resolveHsppReconstructionActivationPolicy();


    assert.equal(
      first,
      second,
    );


    assert.equal(
      first.reconstructionPolicyVersion,
      second.reconstructionPolicyVersion,
    );


    assert.equal(
      first.reconstructionReason,
      second.reconstructionReason,
    );
  },
);
