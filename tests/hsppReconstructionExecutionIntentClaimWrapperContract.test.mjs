import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/claimHsppReconstructionExecutionIntent.ts",
    "utf8",
  );


const executableSource =
  source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /\/\/.*$/gm,
      "",
    );


test(
  "Q14ag31B exposes one explicitly versioned durable-intent claim wrapper",
  () => {
    assert.match(
      source,
      /HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_WRAPPER_VERSION/,
    );

    assert.match(
      source,
      /hspp-reconstruction-execution-intent-claim-wrapper-v1/,
    );

    assert.match(
      source,
      /HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION/,
    );

    assert.match(
      source,
      /hspp-reconstruction-execution-intent-v1/,
    );

    assert.match(
      source,
      /export async function claimHsppReconstructionExecutionIntent/,
    );
  },
);


test(
  "Q14ag31B calls only the Q14ag31A claim-or-recover RPC",
  () => {
    assert.match(
      source,
      /claim_hspp_reconstruction_execution_intent/,
    );

    const rpcCalls =
      source.match(
        /\.rpc\s*\(/g,
      ) ?? [];

    assert.equal(
      rpcCalls.length,
      1,
    );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/,
    );
  },
);


test(
  "Q14ag31B maps the exact thirteen immutable claim arguments",
  () => {
    const required = [
      "p_organization_id:",
      "p_proposed_child_assembly_id:",
      "p_selected_first_evidence_id:",
      "p_selected_second_evidence_id:",
      "p_historical_evidence_id:",
      "p_historical_evidence_integrity_fingerprint:",
      "p_replacement_evidence_id:",
      "p_replacement_evidence_integrity_fingerprint:",
      "p_discovery_policy_version:",
      "p_reevaluation_policy_version:",
      "p_membership_policy_version:",
      "p_reconstruction_policy_version:",
      "p_reconstruction_reason:",
    ];

    for (const token of required) {
      assert.equal(
        source.includes(token),
        true,
        `missing Q14ag31B RPC mapping: ${token}`,
      );
    }
  },
);


test(
  "Q14ag31B validates exactly one returned durable intent row",
  () => {
    assert.match(
      source,
      /Array\.isArray\(data\)/,
    );

    assert.match(
      source,
      /data\.length\s*!==\s*1/,
    );

    assert.match(
      source,
      /exactly one row/,
    );
  },
);


test(
  "Q14ag31B validates immutable evidence and policy provenance echoes",
  () => {
    const required = [
      "selected_first_evidence_id",
      "selected_second_evidence_id",
      "historical_evidence_id",
      "historical_evidence_integrity_fingerprint",
      "replacement_evidence_id",
      "replacement_evidence_integrity_fingerprint",
      "discovery_policy_version",
      "reevaluation_policy_version",
      "membership_policy_version",
      "reconstruction_policy_version",
      "reconstruction_reason",
    ];

    for (const field of required) {
      assert.equal(
        source.includes(field),
        true,
        `missing immutable echo validation surface: ${field}`,
      );
    }

    assert.match(
      source,
      /requireExactEcho/,
    );
  },
);


test(
  "Q14ag31B exposes the database-selected canonical child identity",
  () => {
    assert.match(
      source,
      /proposedChildAssemblyId:\s*string/,
    );

    assert.match(
      source,
      /childAssemblyId:\s*string/,
    );

    assert.match(
      source,
      /idempotentRecovery:\s*boolean/,
    );

    assert.match(
      source,
      /!idempotentRecovery/,
    );

    assert.match(
      source,
      /childAssemblyId\s*!==\s*[\r\n\s]*proposedChildAssemblyId/,
    );
  },
);


test(
  "Q14ag31B validates the exact Q14ag31A intent version",
  () => {
    assert.match(
      source,
      /intentVersion\s*!==[\s\S]*HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION/,
    );
  },
);


test(
  "Q14ag31B preserves original pair orientation while requiring exact role membership",
  () => {
    assert.match(
      source,
      /selectedFirstEvidenceId/,
    );

    assert.match(
      source,
      /selectedSecondEvidenceId/,
    );

    assert.match(
      source,
      /historicalEvidenceId/,
    );

    assert.match(
      source,
      /replacementEvidenceId/,
    );

    assert.match(
      source,
      /selectedPair\.has/,
    );
  },
);


test(
  "Q14ag31B contains no UUID generation or reconstruction execution authority",
  () => {
    const forbidden = [
      "randomUUID(",
      "crypto.randomUUID(",
      "persistHsppEvidenceAssemblyReconstruction(",
      "runHsppReservoirReconstruction(",
      "planHsppEvidenceAssemblyReconstructionMembers(",
      "readHsppHistoricalReconstructionContexts(",
      "readHsppEvidenceAssemblyReconstructionRecovery(",
      "sealHsppEvidenceAssembly(",
      "runHsppSealedAssemblyRecoveryAssessment(",
      "runHsppReservoirReevaluation(",
    ];

    for (const token of forbidden) {
      assert.equal(
        source.includes(token),
        false,
        `forbidden Q14ag31B authority present: ${token}`,
      );
    }
  },
);


test(
  "Q14ag31B creates no API cron polling or scheduling surface",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\bNextRequest\b|\bNextResponse\b|setInterval\s*\(|setTimeout\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /cron|scheduler|queue/i,
    );
  },
);

