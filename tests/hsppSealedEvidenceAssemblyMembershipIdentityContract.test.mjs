import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/readHsppSealedEvidenceAssembly.ts",
    "utf8",
  );


test(
  "Q14ag18A exposes exact immutable membership identity in verified SEALED-member metadata",
  () => {
    assert.match(
      source,
      /export type HsppSealedAssemblyVerifiedMemberMetadata = \{[\s\S]*?membershipId:\s*string;[\s\S]*?evidenceId:\s*string;/,
    );

    assert.match(
      source,
      /type AssemblyMemberRow = \{[\s\S]*?id:\s*unknown;[\s\S]*?evidence_id:\s*unknown;/,
    );
  },
);


test(
  "Q14ag18A reads the exact membership primary identity from persisted immutable membership",
  () => {
    assert.match(
      source,
      /\.from\("hspp_evidence_assembly_members"\)[\s\S]*?\.select\([\s\S]*?"id"[\s\S]*?"evidence_id"[\s\S]*?"evidence_integrity_fingerprint"[\s\S]*?"member_ordinal"/,
    );

    assert.match(
      source,
      /const membership = persistedMembers\.map\(\(row\) => \(\{[\s\S]*?membershipId:\s*requireString\(row\.id,\s*"member id"\)/,
    );
  },
);


test(
  "Q14ag18A carries membership identity through only the verified-member metadata projection",
  () => {
    assert.match(
      source,
      /verifiedMembers\.push\(\{[\s\S]*?membershipId:\s*member\.membershipId[\s\S]*?evidenceId:\s*member\.evidenceId/,
    );

    const membershipIdOccurrences =
      source.match(
        /\bmembershipId\b/g,
      ) ?? [];

    assert.equal(
      membershipIdOccurrences.length,
      4,
      "membershipId has four lexical occurrences across three semantic locations: metadata type, immutable normalization, and verified-member projection.",
    );

    const scanMemberPush =
      source.match(
        /\bmembers\.push\(\{([\s\S]*?)\n\s*\}\);/,
      );

    assert.ok(
      scanMemberPush,
      "Expected existing B11C scanInput member projection.",
    );

    assert.doesNotMatch(
      scanMemberPush[1],
      /\bmembershipId\b/,
      "Membership row identity must not alter the existing B11C scanInput contract.",
    );
  },
);


test(
  "Q14ag18A preserves the existing SEALED-reader authority boundary",
  () => {
    assert.match(
      source,
      /HSPP_SEALED_ASSEMBLY_READER_VERSION/,
    );

    assert.match(
      source,
      /hspp-sealed-assembly-reader-v1/,
    );

    assert.match(
      source,
      /assemblyState !== "SEALED"/,
    );

    assert.match(
      source,
      /\.order\("member_ordinal",\s*\{[\s\S]*?ascending:\s*true/,
    );

    assert.doesNotMatch(
      source,
      /\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
    );
  },
);


test(
  "Q14ag18A does not become historical-context reconstruction or scheduling authority",
  () => {
    assert.doesNotMatch(
      source,
      /readHsppHistoricalReconstructionContexts\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /persistHsppEvidenceAssemblyReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /persist_hspp_evidence_assembly_reconstruction/,
    );

    assert.doesNotMatch(
      source,
      /randomUUID\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bNextRequest\b|\bNextResponse\b/,
    );
  },
);
