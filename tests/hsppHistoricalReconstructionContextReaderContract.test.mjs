import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/readHsppHistoricalReconstructionContexts.ts",
    "utf8",
  );


test(
  "Q14ag16C exposes one explicitly versioned Q14ag14 reader",
  () => {
    assert.match(
      source,
      /HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READER_VERSION/,
    );

    assert.match(
      source,
      /hspp-historical-reconstruction-context-reader-v1/,
    );

    assert.match(
      source,
      /HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READ_RPC/,
    );

    assert.match(
      source,
      /read_hspp_historical_reconstruction_contexts/,
    );

    assert.match(
      source,
      /export\s+async\s+function\s+readHsppHistoricalReconstructionContexts/,
    );
  },
);


test(
  "Q14ag16C preserves the 100-id bound before deterministic deduplication",
  () => {
    const boundIndex =
      source.indexOf(
        "evidenceIds.length > 100",
      );

    const setIndex =
      source.indexOf(
        "new Set<string>()",
      );

    assert.ok(
      boundIndex >= 0,
    );

    assert.ok(
      setIndex > boundIndex,
    );

    assert.match(
      source,
      /requestedSet\.has/,
    );

    assert.match(
      source,
      /requestedSet\.add/,
    );
  },
);


test(
  "Q14ag16C invokes Q14ag14 at most once with exact organization and evidence arguments",
  () => {
    const calls =
      source.match(
        /supabase\.rpc\s*\(/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      source,
      /p_organization_id\s*:\s*normalizedOrganizationId/,
    );

    assert.match(
      source,
      /p_evidence_ids\s*:\s*requestedEvidenceIds/,
    );
  },
);


test(
  "Q14ag16C explicitly preserves valid no-context evidence identities",
  () => {
    assert.match(
      source,
      /requestedEvidenceIds:\s*string\[\]/,
    );

    assert.match(
      source,
      /contexts:\s*HsppHistoricalReconstructionContext\[\]/,
    );

    assert.match(
      source,
      /noContextEvidenceIds:\s*string\[\]/,
    );

    assert.match(
      source,
      /requestedEvidenceIds\.filter/,
    );

    assert.match(
      source,
      /!contextByEvidenceId\.has/,
    );

    assert.match(
      source,
      /requestedEvidenceIds\.length\s*===\s*0/,
    );
  },
);


test(
  "Q14ag16C validates exact Q14ag14 reconstruction-context fields fail closed",
  () => {
    for (
      const signal of [
        "row.evidence_id",
        "row.historical_membership_id",
        "row.parent_assembly_id",
        "row.evidence_integrity_fingerprint",
        "row.parent_member_ordinal",
        "row.cessation_id",
        "row.unsuitability_checkpoint_id",
        "row.cessation_version",
        "row.cessation_policy_version",
        "row.cessation_reason",
        "row.ceased_at",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          signal.replace(
            ".",
            "\\.",
          ),
        ),
      );
    }

    assert.match(
      source,
      /SHA256_PATTERN/,
    );

    assert.match(
      source,
      /requirePositiveInteger/,
    );

    assert.match(
      source,
      /Date\.parse/,
    );
  },
);


test(
  "Q14ag16C rejects unexpected and duplicate returned evidence rows",
  () => {
    assert.match(
      source,
      /!requestedSet\.has/,
    );

    assert.match(
      source,
      /returned unexpected evidence/,
    );

    assert.match(
      source,
      /contextByEvidenceId\.has/,
    );

    assert.match(
      source,
      /returned duplicate evidence/,
    );
  },
);


test(
  "Q14ag16C documents the service-role-only read boundary",
  () => {
    assert.match(
      source,
      /service-role Supabase client/i,
    );

    assert.match(
      source,
      /Q14ag14 is service-role-only/i,
    );
  },
);


test(
  "Q14ag16C grants no parent selection reconstruction persistence or downstream authority",
  () => {
    assert.doesNotMatch(
      source,
      /persist_hspp_evidence_assembly_reconstruction/,
    );

    assert.doesNotMatch(
      source,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\breadHsppSealedEvidenceAssembly\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\brunHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bpersistHsppReservoirAssemblyCandidate\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\brandomUUID\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bsealHspp/,
    );

    assert.doesNotMatch(
      source,
      /\bNextRequest\b|\bNextResponse\b/,
    );
  },
);
