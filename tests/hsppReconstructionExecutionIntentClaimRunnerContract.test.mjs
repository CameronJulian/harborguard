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
    "../lib/hspp/runHsppReconstructionExecutionIntentClaim.ts",
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
  "Q14ag31U defines one explicitly versioned isolated producer runner",
  () => {
    assert.match(
      source,
      /hspp-reconstruction-execution-intent-claim-runner-v1/,
    );

    assert.match(
      source,
      /export\s+async\s+function\s+runHsppReconstructionExecutionIntentClaim\s*\(/,
    );

    assert.match(
      source,
      /RunHsppReservoirReevaluationResult/,
    );

    assert.match(
      source,
      /ClaimedHsppReconstructionExecutionIntent/,
    );
  },
);


test(
  "Q14ag31U accepts exactly the audited producer boundary inputs",
  () => {
    for (
      const field of
      [
        "supabase",
        "organizationId",
        "reevaluationResult",
        "proposedChildAssemblyId",
        "reconstructionPolicyVersion",
        "reconstructionReason",
      ]
    ) {
      assert.ok(
        source.includes(
          field,
        ),
        `missing producer input ${field}`,
      );
    }
  },
);


test(
  "Q14ag31U calls Q14ag31S exactly once before any durable claim",
  () => {
    const resolverCalls =
      executableSource.match(
        /\bresolveHsppReconstructionClaimMaterial\s*\(/g,
      ) ?? [];

    const claimCalls =
      executableSource.match(
        /\bclaimHsppReconstructionExecutionIntent\s*\(/g,
      ) ?? [];


    assert.equal(
      resolverCalls.length,
      1,
    );

    assert.equal(
      claimCalls.length,
      1,
    );


    const resolverIndex =
      executableSource.indexOf(
        "resolveHsppReconstructionClaimMaterial(",
      );

    const noClaimIndex =
      executableSource.indexOf(
        "if (!claimMaterial)",
      );

    const claimIndex =
      executableSource.indexOf(
        "claimHsppReconstructionExecutionIntent({",
      );


    assert.ok(
      resolverIndex >=
      0,
    );

    assert.ok(
      noClaimIndex >
      resolverIndex,
    );

    assert.ok(
      claimIndex >
      noClaimIndex,
    );
  },
);


test(
  "Q14ag31U maps the exact shared immutable claim material into Q14ag31B",
  () => {
    const mappings = [
      /organizationId\s*:\s*claimMaterial\.organizationId/,
      /selectedFirstEvidenceId\s*:\s*claimMaterial\.selectedFirstEvidenceId/,
      /selectedSecondEvidenceId\s*:\s*claimMaterial\.selectedSecondEvidenceId/,
      /historicalEvidenceId\s*:\s*claimMaterial\.historicalEvidenceId/,
      /historicalEvidenceIntegrityFingerprint\s*:\s*claimMaterial\.historicalEvidenceIntegrityFingerprint/,
      /replacementEvidenceId\s*:\s*claimMaterial\.replacementEvidenceId/,
      /replacementEvidenceIntegrityFingerprint\s*:\s*claimMaterial\.replacementEvidenceIntegrityFingerprint/,
      /discoveryPolicyVersion\s*:\s*claimMaterial\.discoveryPolicyVersion/,
      /reevaluationPolicyVersion\s*:\s*claimMaterial\.reevaluationPolicyVersion/,
      /membershipPolicyVersion\s*:\s*claimMaterial\.membershipPolicyVersion/,
      /proposedChildAssemblyId\s*,/,
      /reconstructionPolicyVersion\s*,/,
      /reconstructionReason\s*,/,
    ];


    for (
      const pattern of
      mappings
    ) {
      assert.match(
        executableSource,
        pattern,
      );
    }
  },
);


test(
  "Q14ag31U returns zero-claim before Q14ag31B when resolver returns null",
  () => {
    assert.match(
      executableSource,
      /if\s*\(\s*!claimMaterial\s*\)\s*\{/,
    );

    assert.match(
      executableSource,
      /state\s*:\s*"NO_RECONSTRUCTION_CLAIM"/,
    );

    assert.match(
      executableSource,
      /claim\s*:\s*null/,
    );
  },
);


test(
  "Q14ag31U surfaces the exact durable claim without replacing canonical child identity",
  () => {
    assert.match(
      executableSource,
      /const\s+claim\s*=\s*await\s+claimHsppReconstructionExecutionIntent\s*\(/,
    );

    assert.match(
      executableSource,
      /state\s*:\s*"RECONSTRUCTION_INTENT_CLAIMED"/,
    );

    assert.match(
      executableSource,
      /organizationId\s*:\s*claim\.organizationId/,
    );

    assert.match(
      executableSource,
      /\bclaim\s*,/,
    );

    assert.doesNotMatch(
      executableSource,
      /childAssemblyId\s*:\s*proposedChildAssemblyId/,
    );
  },
);


test(
  "Q14ag31U does not duplicate mutable discovery selection consumer or scheduling authority",
  () => {
    const forbidden = [
      /\brunHsppReservoirReevaluation\s*\(/,
      /\breadHsppReservoirCandidates\s*\(/,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
      /\bassemblyCandidates\b/,
      /\.sort\s*\(/,
      /\brandomUUID\s*\(/,
      /\bcrypto\.randomUUID\s*\(/,
      /\breadHsppReconstructionExecutionIntents\s*\(/,
      /\brunHsppReconstructionExecutionIntent\s*\(/,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
      /\brunHsppReservoirReconstruction\s*\(/,
      /\.rpc\s*\(/,
      /\.from\s*\(/,
      /\bNextRequest\b/,
      /\bNextResponse\b/,
      /\bschedule\s*\(/,
    ];


    for (
      const pattern of
      forbidden
    ) {
      assert.doesNotMatch(
        executableSource,
        pattern,
      );
    }
  },
);
