import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/scanHsppEvidenceAssembly.ts",
    "utf8"
  );

test(
  "B11C defines an explicitly versioned assembly scanner",
  () => {
    assert.match(
      source,
      /hspp-assembly-scan-v1/
    );

    assert.match(
      source,
      /scanHsppEvidenceAssembly/
    );
  }
);

test(
  "B11C requires a SEALED completed assembly",
  () => {
    assert.match(
      source,
      /input\.assemblyState !==[\s\S]*"SEALED"/
    );

    assert.match(
      source,
      /ASSEMBLY_NOT_SEALED/
    );
  }
);

test(
  "B11C requires multi-evidence before completed analysis",
  () => {
    assert.match(
      source,
      /members\.length < 2/
    );

    assert.match(
      source,
      /INSUFFICIENT_EVIDENCE/
    );

    assert.match(
      source,
      /INSUFFICIENT_MEMBERS/
    );
  }
);

test(
  "B11C verifies exact SHA-256 member identity",
  () => {
    assert.match(
      source,
      /\^\[0-9a-f\]\{64\}\$/
    );

    assert.match(
      source,
      /INVALID_MEMBER_IDENTITY/
    );
  }
);

test(
  "B11C requires deterministic contiguous member ordering",
  () => {
    assert.match(
      source,
      /member\.memberOrdinal !==[\s\S]*index \+ 1/
    );

    assert.match(
      source,
      /INVALID_MEMBER_ORDER/
    );
  }
);

test(
  "B11C rejects duplicate immutable evidence identities",
  () => {
    assert.match(
      source,
      /evidenceIds\.has/
    );

    assert.match(
      source,
      /DUPLICATE_MEMBER/
    );
  }
);

test(
  "B11C scans every unordered evidence pair",
  () => {
    assert.match(
      source,
      /firstIndex = 0/
    );

    assert.match(
      source,
      /secondIndex =[\s\S]*firstIndex \+ 1/
    );

    assert.match(
      source,
      /evaluateHsppCanonicalContradiction/
    );
  }
);

test(
  "B11C preserves AGREE UNKNOWN and CONFLICT separately",
  () => {
    assert.match(
      source,
      /comparison\.outcome ===[\s\S]*"CONFLICT"/
    );

    assert.match(
      source,
      /comparison\.outcome ===[\s\S]*"AGREE"/
    );

    assert.match(
      source,
      /canonicalUnknownCount/
    );
  }
);

test(
  "B11C does not turn no-conflict into corroboration",
  () => {
    assert.match(
      source,
      /no-conflict is not corroboration/i
    );

    assert.doesNotMatch(
      source,
      /corroborated:\s*true/i
    );
  }
);

test(
  "B11C grants no downstream authority",
  () => {
    assert.match(
      source,
      /authority:[\s\S]*"NONE"/
    );

    assert.match(
      source,
      /does not establish physical-world truth/
    );

    assert.match(
      source,
      /does not promote trust state/
    );

    assert.match(
      source,
      /grants no Route Safety authority/
    );

    assert.match(
      source,
      /grants no Crowd Intelligence authority/
    );

    assert.match(
      source,
      /grants no ML training or validation authority/
    );
  }
);

test(
  "B11C is pure and performs no database persistence",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.insert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.update\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.upsert\s*\(/
    );

    assert.doesNotMatch(
      source,
      /supabase/i
    );
  }
);