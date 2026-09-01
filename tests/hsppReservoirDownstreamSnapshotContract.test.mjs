import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/createHsppReservoirDownstreamSnapshot.ts",
    "utf8",
  );


test(
  "neutral downstream snapshot exposes exactly the three semantic fields",
  () => {
    assert.match(
      source,
      /organizationId:[\s\S]*candidates:[\s\S]*reevaluation:/,
    );

    assert.match(
      source,
      /return\s*\{\s*organizationId,\s*candidates,\s*reevaluation,\s*\}/s,
    );
  },
);


test(
  "B07B adapter sources semantic fields only from discovery organization/candidates and reevaluation",
  () => {
    assert.match(
      source,
      /createHsppReservoirDownstreamSnapshotFromB07B/,
    );

    assert.match(
      source,
      /organizationId:[\s\S]*result\.discovery[\s\S]*\.organizationId/s,
    );

    assert.match(
      source,
      /candidates:[\s\S]*result\.discovery[\s\S]*\.candidates/s,
    );

    assert.match(
      source,
      /reevaluation:\s*[\r\n]+\s*result\.reevaluation/,
    );
  },
);


test(
  "scheduled-pair adapter sources organization/candidates/reevaluation without fabricating discovery",
  () => {
    assert.match(
      source,
      /createHsppReservoirDownstreamSnapshotFromScheduledPairs/,
    );

    assert.match(
      source,
      /organizationId:[\s\S]*result\.pairPage[\s\S]*\.organizationId/s,
    );

    assert.match(
      source,
      /candidates:\s*[\r\n]+\s*result\.eligibleEvidence/,
    );

    assert.match(
      source,
      /reevaluation:\s*[\r\n]+\s*result\.reevaluation/,
    );

    assert.doesNotMatch(
      source,
      /\bdiscovery\s*:\s*\{/,
    );
  },
);


test(
  "neutral snapshot does not carry scheduler-specific state",
  () => {
    for (
      const forbidden of
      [
        /\bexpectedCursor\s*:/,
        /\bproposedCursor\s*:/,
        /\bnextCursor\s*:/,
        /\brawEvidenceCount\s*:/,
        /\bschedulingVersion\s*:/,
        /\bdiscoveryPolicyVersion\s*:/,
        /\bpairPage\s*:/,
        /\bendpointEvidenceIds\s*:/,
      ]
    ) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }
  },
);


test(
  "neutral snapshot module is pure and has no database/cursor/persistence authority",
  () => {
    for (
      const forbidden of
      [
        /SupabaseClient/,
        /\.rpc\s*\(/,
        /\.from\s*\(/,
        /\.insert\s*\(/,
        /\.update\s*\(/,
        /\.upsert\s*\(/,
        /\.delete\s*\(/,
        /compareAndSwapHsppReservoir/,
        /persistHsppReservoirAssemblyCandidate\s*\(/,
        /persistHsppEvidenceAssembly\s*\(/,
        /resolveHsppReservoirLifecycleRoute\s*\(/,
      ]
    ) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }

    assert.match(
      source,
      /deliberately pure/i,
    );

    assert.match(
      source,
      /no database reads or writes/i,
    );

    assert.match(
      source,
      /no scan-state mutation/i,
    );

    assert.match(
      source,
      /no assembly persistence/i,
    );

    assert.match(
      source,
      /no trust, corroboration or downstream authority transition/i,
    );
  },
);