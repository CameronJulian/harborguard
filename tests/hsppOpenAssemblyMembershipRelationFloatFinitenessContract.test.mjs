import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260903164500_fix_hspp_open_membership_relation_float_finiteness.sql",
    "utf8",
  );


test(
  "AS38 replaces the same OPEN-child membership relation authority",
  () => {
    assert.match(
      migration,
      /create\s+or\s+replace\s+function\s+public\.persist_hspp_open_assembly_membership_relation/is,
    );
  },
);


test(
  "AS38 contains no executable double-precision isfinite call",
  () => {
    assert.doesNotMatch(
      migration,
      /^\s*(?:not\s+)?isfinite\s*\(/im,
    );
  },
);


test(
  "AS38 explicitly rejects NaN positive Infinity and negative Infinity",
  () => {
    assert.match(
      migration,
      /v_relation_distance\s*=\s*'NaN'::double precision/is,
    );

    assert.match(
      migration,
      /v_relation_distance\s*=\s*'Infinity'::double precision/is,
    );

    assert.match(
      migration,
      /v_relation_distance\s*=\s*'-Infinity'::double precision/is,
    );
  },
);


test(
  "AS38 retains non-negative distance validation",
  () => {
    assert.match(
      migration,
      /v_relation_distance\s*<\s*0/is,
    );

    assert.match(
      migration,
      /distanceMeters must be a non-negative finite number or null/,
    );
  },
);


test(
  "AS38 retains AS35 SQL qualification",
  () => {
    for (const required of [
      "hspp_evidence_assemblies as a",
      "a.organization_id",
      "hspp_evidence_assembly_membership_relations as r",
      "r.organization_id",
      "r.assembly_id",
      "hspp_evidence_assembly_members as m",
      "m.organization_id",
      "m.assembly_id",
      "m.evidence_id",
    ]) {
      assert.match(
        migration,
        new RegExp(
          required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      );
    }
  },
);


test(
  "AS38 preserves OPEN state and immutable retry semantics",
  () => {
    assert.match(
      migration,
      /v_assembly\.assembly_state\s*<>\s*'OPEN'/is,
    );

    assert.match(
      migration,
      /v_existing\.id\s+is\s+not\s+null/is,
    );

    assert.match(
      migration,
      /Existing HSPP assembly membership relation conflicts with this retry/,
    );
  },
);


test(
  "AS38 preserves service-role-only execution",
  () => {
    assert.match(
      migration,
      /revoke\s+all[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated/is,
    );

    assert.match(
      migration,
      /grant\s+execute[\s\S]*to\s+service_role/is,
    );
  },
);