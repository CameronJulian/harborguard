import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  fileURLToPath,
} from "node:url";


const here =
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );


const sourcePath =
  path.resolve(
    here,
    "../lib/hspp/resolveHsppReconstructionClaimMaterial.ts",
  );


const source =
  fs.readFileSync(
    sourcePath,
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
  "Q14ag31S defines one explicitly versioned pure claim-material resolver",
  () => {
    assert.match(
      source,
      /hspp-reconstruction-claim-material-resolver-v1/,
    );

    assert.match(
      source,
      /export\s+function\s+resolveHsppReconstructionClaimMaterial\s*\(/,
    );

    assert.match(
      source,
      /RunHsppReservoirReevaluationResult/,
    );
  },
);


test(
  "Q14ag31S exposes the exact immutable durable-claim material",
  () => {
    for (
      const field of
      [
        "selectedFirstEvidenceId",
        "selectedSecondEvidenceId",
        "historicalCandidate",
        "replacementCandidate",
        "historicalEvidenceId",
        "historicalEvidenceIntegrityFingerprint",
        "replacementEvidenceId",
        "replacementEvidenceIntegrityFingerprint",
        "discoveryPolicyVersion",
        "reevaluationPolicyVersion",
        "membershipPolicyVersion",
      ]
    ) {
      assert.ok(
        source.includes(
          field,
        ),
        `missing shared claim-material field ${field}`,
      );
    }
  },
);


test(
  "Q14ag31S preserves deterministic B07A ordering and original pair orientation",
  () => {
    assert.match(
      executableSource,
      /for\s*\(\s*const\s+selected\s+of\s+assemblyCandidates\s*\)/,
    );

    assert.doesNotMatch(
      executableSource,
      /assemblyCandidates\.sort\s*\(/,
    );

    assert.match(
      executableSource,
      /selectedEvidenceIds\s*:\s*\[\s*firstEvidenceId\s*,\s*secondEvidenceId\s*,?\s*\]/,
    );

    assert.match(
      executableSource,
      /selectedFirstEvidenceId\s*:\s*firstEvidenceId/,
    );

    assert.match(
      executableSource,
      /selectedSecondEvidenceId\s*:\s*secondEvidenceId/,
    );
  },
);


test(
  "Q14ag31S preserves exact reconstruction lifecycle roles and membership policy provenance",
  () => {
    assert.match(
      executableSource,
      /"HISTORICAL_NOT_CURRENT"/,
    );

    assert.match(
      executableSource,
      /"NEVER_ASSEMBLED"/,
    );

    assert.match(
      executableSource,
      /selected\.membershipDecision\.policyVersion/,
    );

    assert.match(
      executableSource,
      /selected\.membershipDecision\.eligible\s*!==\s*true/,
    );
  },
);


test(
  "Q14ag31S resolves exact discovery identity and validates immutable fingerprints",
  () => {
    assert.match(
      executableSource,
      /matches\.length\s*!==\s*1/,
    );

    assert.match(
      executableSource,
      /candidate\?\.operationalRead\?\.evidence/,
    );

    assert.match(
      executableSource,
      /evidence\.id\s*!==\s*candidate\.evidenceId/,
    );

    assert.ok(
      source.includes(
        "^[0-9a-f]{64}$",
      ),
    );

    assert.match(
      executableSource,
      /historicalEvidenceIntegrityFingerprint/,
    );

    assert.match(
      executableSource,
      /replacementEvidenceIntegrityFingerprint/,
    );
  },
);


test(
  "Q14ag31S has no database mutation UUID claim execution reconstruction or scheduling authority",
  () => {
    const forbidden = [
      ".rpc(",
      ".from(",
      "readHsppReservoirCandidates(",
      "evaluateHsppReservoirReevaluation(",
      "claimHsppReconstructionExecutionIntent(",
      "runHsppReconstructionExecutionIntent(",
      "runHsppReservoirReconstruction(",
      "persistHsppEvidenceAssemblyReconstruction(",
      "persist_hspp_evidence_assembly_reconstruction",
      "randomUUID(",
      "crypto.randomUUID(",
      "NextRequest",
      "NextResponse",
      "schedule(",
      "sealHspp",
      "applyHspp",
    ];

    for (
      const value of
      forbidden
    ) {
      assert.equal(
        executableSource.includes(
          value,
        ),
        false,
        `pure claim-material resolver crossed forbidden boundary: ${value}`,
      );
    }
  },
);
/*
 * NEUTRAL_RECONSTRUCTION_SELECTION_CONTRACT_V1
 */
test(
  "Q14ag31S separates producer-neutral reconstruction selection from legacy B07B durable provenance",
  () => {
    const neutralFunctionName =
      "export function resolveHsppReconstructionSelectionMaterialFromSnapshot";

    const legacyFunctionName =
      "export function resolveHsppReconstructionClaimMaterial";


    const neutralStart =
      source.indexOf(
        neutralFunctionName,
      );

    const legacyStart =
      source.indexOf(
        legacyFunctionName,
      );


    assert.ok(
      neutralStart >=
        0,
      "neutral reconstruction selection core is missing",
    );

    assert.ok(
      legacyStart >
        neutralStart,
      "legacy B07B wrapper must remain after the neutral selection core",
    );


    /*
     * The legacy wrapper has its own JSDoc immediately before the legacy
     * function declaration. Do not include that producer-specific comment
     * when inspecting the neutral function body.
     */
    const legacyCommentStart =
      source.lastIndexOf(
        "\n/**",
        legacyStart,
      );

    const neutralEnd =
      legacyCommentStart >= neutralStart
        ? legacyCommentStart
        : legacyStart;

    const neutralSource =
      source.slice(
        neutralStart,
        neutralEnd,
      );

    const legacySource =
      source.slice(
        legacyStart,
      );


    assert.match(
      source,
      /ResolveHsppReconstructionSelectionMaterialFromSnapshotInput[\s\S]*?snapshot\s*:\s*HsppReservoirDownstreamSnapshot/,
    );

    assert.match(
      source,
      /export\s+type\s+HsppReconstructionSelectionMaterial/,
    );


    assert.doesNotMatch(
      neutralSource,
      /RunHsppReservoirReevaluationResult/,
    );

    assert.doesNotMatch(
      neutralSource,
      /\breevaluationResult\b/,
    );

    assert.doesNotMatch(
      neutralSource,
      /\.discovery\b/,
    );

    assert.doesNotMatch(
      neutralSource,
      /\bdiscoveryPolicyVersion\b/,
    );


    assert.match(
      neutralSource,
      /snapshot\?*\.organizationId/,
    );

    assert.match(
      neutralSource,
      /snapshot\?*\.candidates/,
    );

    assert.match(
      neutralSource,
      /snapshot\?*\.reevaluation/,
    );

    assert.match(
      neutralSource,
      /reevaluation[\s\S]*?policyVersion/,
    );


    assert.match(
      neutralSource,
      /"HISTORICAL_NOT_CURRENT"/,
    );

    assert.match(
      neutralSource,
      /"NEVER_ASSEMBLED"/,
    );

    assert.match(
      neutralSource,
      /selected\.membershipDecision\.eligible\s*!==\s*true/,
    );

    assert.match(
      neutralSource,
      /selected\.membershipDecision\.policyVersion/,
    );


    assert.match(
      legacySource,
      /result\?\.discoveryPolicyVersion/,
    );

    assert.match(
      legacySource,
      /result\?\.reevaluationPolicyVersion/,
    );

    assert.match(
      legacySource,
      /createHsppReservoirDownstreamSnapshotFromB07B\s*\(/,
    );


    assert.equal(
      (
        legacySource.match(
          /resolveHsppReconstructionSelectionMaterialFromSnapshot\s*\(/g,
        ) ??
        []
      ).length,
      1,
      "legacy B07B wrapper must delegate semantic selection exactly once",
    );


    assert.match(
      legacySource,
      /discoveryPolicyVersion/,
    );


    assert.doesNotMatch(
      neutralSource,
      /\.rpc\s*\(/,
    );

    assert.doesNotMatch(
      neutralSource,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      neutralSource,
      /compareAndSwap/,
    );

    assert.doesNotMatch(
      neutralSource,
      /expectedCursor|proposedCursor|pairPage/,
    );
  },
);
/*
 * NEUTRAL_RECONSTRUCTION_ELIGIBILITY_PROVENANCE_CONTRACT_V1
 */
test(
  "Q14ag31S carries producer-neutral B06A Reservoir eligibility provenance",
  () => {
    const neutralFunctionName =
      "export function resolveHsppReconstructionSelectionMaterialFromSnapshot";

    const legacyFunctionName =
      "export function resolveHsppReconstructionClaimMaterial";

    const neutralStart =
      source.indexOf(
        neutralFunctionName,
      );

    const legacyStart =
      source.indexOf(
        legacyFunctionName,
      );

    assert.ok(
      neutralStart >= 0,
      "neutral selection core is missing",
    );

    assert.ok(
      legacyStart > neutralStart,
      "legacy wrapper must remain after the neutral core",
    );

    const legacyCommentStart =
      source.lastIndexOf(
        "\n/**",
        legacyStart,
      );

    const neutralEnd =
      legacyCommentStart >= neutralStart
        ? legacyCommentStart
        : legacyStart;

    const neutralSource =
      source.slice(
        neutralStart,
        neutralEnd,
      );

    assert.match(
      source,
      /HsppReconstructionSelectionMaterial[\s\S]*?reservoirEligibilityPolicyVersion\s*:\s*string/,
    );

    assert.match(
      neutralSource,
      /historicalCandidate[\s\S]*?\.reservoirDecision/,
    );

    assert.match(
      neutralSource,
      /replacementCandidate[\s\S]*?\.reservoirDecision/,
    );

    assert.match(
      neutralSource,
      /historicalReservoirDecision[\s\S]*?eligible\s*!==\s*true/,
    );

    assert.match(
      neutralSource,
      /replacementReservoirDecision[\s\S]*?eligible\s*!==\s*true/,
    );

    assert.match(
      neutralSource,
      /historicalReservoirEligibilityPolicyVersion[\s\S]*?!==[\s\S]*?replacementReservoirEligibilityPolicyVersion/,
    );

    assert.match(
      neutralSource,
      /const\s+reservoirEligibilityPolicyVersion\s*=\s*historicalReservoirEligibilityPolicyVersion/,
    );

    assert.match(
      neutralSource,
      /reservoirEligibilityPolicyVersion\s*,/,
    );

    assert.doesNotMatch(
      neutralSource,
      /\bdiscoveryPolicyVersion\b/,
    );

    assert.doesNotMatch(
      neutralSource,
      /HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/,
    );

    assert.doesNotMatch(
      neutralSource,
      /\bschedulingVersion\b|\bpairPage\b|expectedCursor|proposedCursor/,
    );

    assert.doesNotMatch(
      neutralSource,
      /\.rpc\s*\(|\.from\s*\(/,
    );
  },
);
