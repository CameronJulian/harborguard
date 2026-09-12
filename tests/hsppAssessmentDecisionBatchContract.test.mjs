import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260911180000_apply_hspp_assessment_decisions_batch.sql",
    "utf8"
  );

const helper =
  fs.readFileSync(
    "lib/hspp/applyHsppAssessmentDecisionsBatch.ts",
    "utf8"
  );

test(
  "batch RPC validates the complete JSON decision set before mutation",
  () => {
    assert.match(
      migration,
      /p_decisions jsonb/
    );

    assert.match(
      migration,
      /jsonb_typeof\(p_decisions\) <> 'array'/
    );

    assert.match(
      migration,
      /jsonb_array_length\(p_decisions\)/
    );

    assert.match(
      migration,
      /duplicate evidence identities/
    );

    const validationLoop =
      migration.indexOf(
        "-- Validate the complete batch before any mutation."
      );

    const update =
      migration.indexOf(
        "update\n      public.hspp_evidence"
      );

    assert.ok(validationLoop >= 0);
    assert.ok(update > validationLoop);
  }
);

test(
  "batch RPC preserves tenant evidence and fingerprint fencing",
  () => {
    assert.match(
      migration,
      /evidence\.organization_id\s*=\s*p_organization_id/
    );

    assert.match(
      migration,
      /evidence\.id\s*=\s*v_evidence_id/
    );

    assert.match(
      migration,
      /evidence\.integrity_fingerprint\s*=\s*v_integrity_fingerprint/
    );

    assert.match(
      migration,
      /if not found then/
    );

    assert.match(
      migration,
      /v_applied_count <> v_expected_count/
    );
  }
);

test(
  "batch RPC uses deterministic transaction locks and service role authority",
  () => {
    assert.match(
      migration,
      /pg_advisory_xact_lock/
    );

    assert.match(
      migration,
      /order by\s*1/
    );

    assert.match(
      migration,
      /security definer/
    );

    assert.match(
      migration,
      /grant execute[\s\S]*to\s+service_role/
    );

    assert.match(
      migration,
      /revoke all[\s\S]*authenticated[\s\S]*service_role/
    );
  }
);

test(
  "TypeScript batch boundary performs exactly one RPC",
  () => {
    const calls =
      helper.match(
        /\.rpc\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      1
    );

    assert.match(
      helper,
      /apply_hspp_assessment_decisions_batch/
    );

    assert.match(
      helper,
      /p_organization_id/
    );

    assert.match(
      helper,
      /p_decisions/
    );
  }
);

test(
  "TypeScript batch boundary verifies result cardinality and exact persisted values",
  () => {
    assert.match(
      helper,
      /data\.length !==\s*payload\.length/
    );

    assert.match(
      helper,
      /persisted result does not match the requested decision/
    );

    assert.match(
      helper,
      /duplicate evidence identities/
    );

    assert.match(
      helper,
      /integrityFingerprint/
    );
  }
);
