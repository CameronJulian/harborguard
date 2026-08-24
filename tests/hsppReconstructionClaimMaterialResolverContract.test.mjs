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
