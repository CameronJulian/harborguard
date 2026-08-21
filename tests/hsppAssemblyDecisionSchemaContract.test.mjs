import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "supabase/migrations/20260821100000_create_hspp_assembly_decisions.sql",
    "utf8"
  );

test(
  "B11E1 defines a dedicated assembly-decision ledger",
  () => {
    assert.match(
      source,
      /create table public\.hspp_assembly_decisions/
    );

    assert.match(
      source,
      /id uuid primary key/
    );
  }
);

test(
  "decision provenance is tenant and assembly bound",
  () => {
    assert.match(
      source,
      /organization_id uuid not null/
    );

    assert.match(
      source,
      /assembly_id uuid not null/
    );

    assert.match(
      source,
      /foreign key\s*\([\s\S]*organization_id,[\s\S]*assembly_id[\s\S]*\)[\s\S]*references public\.hspp_evidence_assemblies/
    );
  }
);

test(
  "B11E1 persists scan and decision policy versions",
  () => {
    assert.match(
      source,
      /assembly_scan_version text not null/
    );

    assert.match(
      source,
      /assembly_decision_policy_version text not null/
    );
  }
);

test(
  "B11E1 persists exact B11D state and reason domains",
  () => {
    for (const state of [
      "NOT_READY",
      "CONFLICTED",
      "UNRESOLVED",
      "CONSISTENT",
    ]) {
      assert.match(
        source,
        new RegExp(`'${state}'`)
      );
    }

    for (const reason of [
      "ASSEMBLY_NOT_SCANNED",
      "INSUFFICIENT_EVIDENCE",
      "INVALID_SCAN_SUMMARY",
      "CANONICAL_CONFLICT_PRESENT",
      "NO_COMPARABLE_AGREEMENT",
      "CANONICAL_AGREEMENT_WITHOUT_CONFLICT",
    ]) {
      assert.match(
        source,
        new RegExp(`'${reason}'`)
      );
    }
  }
);

test(
  "decision state and reason are constrained together",
  () => {
    assert.match(
      source,
      /hspp_assembly_decisions_state_reason_consistent/
    );

    assert.match(
      source,
      /'CONFLICTED'[\s\S]*'CANONICAL_CONFLICT_PRESENT'/
    );

    assert.match(
      source,
      /'UNRESOLVED'[\s\S]*'NO_COMPARABLE_AGREEMENT'/
    );

    assert.match(
      source,
      /'CONSISTENT'[\s\S]*'CANONICAL_AGREEMENT_WITHOUT_CONFLICT'/
    );
  }
);

test(
  "B11E1 persists B11C aggregate scan provenance",
  () => {
    for (const field of [
      "member_count",
      "pair_count",
      "canonical_conflict_count",
      "canonical_agreement_count",
      "canonical_unknown_count",
      "has_canonical_conflict",
    ]) {
      assert.match(
        source,
        new RegExp(field)
      );
    }
  }
);

test(
  "B11E1 preserves exact scan and decision snapshots",
  () => {
    assert.match(
      source,
      /scan_summary jsonb not null/
    );

    assert.match(
      source,
      /decision_summary jsonb not null/
    );

    assert.match(
      source,
      /jsonb_typeof[\s\S]*scan_summary[\s\S]*'object'/
    );

    assert.match(
      source,
      /jsonb_typeof[\s\S]*decision_summary[\s\S]*'object'/
    );
  }
);

test(
  "B11E1 validates conflict-summary consistency",
  () => {
    assert.match(
      source,
      /hspp_assembly_decisions_conflict_flag_consistent/
    );

    assert.match(
      source,
      /has_canonical_conflict = true[\s\S]*canonical_conflict_count > 0/
    );

    assert.match(
      source,
      /has_canonical_conflict = false[\s\S]*canonical_conflict_count = 0/
    );
  }
);

test(
  "CONSISTENT requires agreement without conflict",
  () => {
    assert.match(
      source,
      /hspp_assembly_decisions_consistent_state_consistent/
    );

    assert.match(
      source,
      /canonical_conflict_count = 0[\s\S]*canonical_agreement_count > 0/
    );
  }
);

test(
  "UNRESOLVED preserves absence of comparable agreement",
  () => {
    assert.match(
      source,
      /hspp_assembly_decisions_unresolved_state_consistent/
    );

    assert.match(
      source,
      /canonical_conflict_count = 0[\s\S]*canonical_agreement_count = 0/
    );
  }
);

test(
  "assembly decisions are append-only",
  () => {
    assert.match(
      source,
      /HSPP assembly decisions are immutable and cannot be changed/
    );

    assert.match(
      source,
      /before update[\s\S]*hspp_assembly_decisions/
    );

    assert.match(
      source,
      /before delete[\s\S]*hspp_assembly_decisions/
    );
  }
);

test(
  "B11E1 explicitly grants no authority",
  () => {
    assert.match(
      source,
      /authority text not null[\s\S]*default 'NONE'/
    );

    assert.match(
      source,
      /authority = 'NONE'/
    );

    assert.match(
      source,
      /does not establish physical-world truth/
    );

    assert.match(
      source,
      /CONSISTENT does not by itself mean CORROBORATED, VERIFIED or physically true/
    );
  }
);

test(
  "B11E1 does not add trust or eligibility mutation fields",
  () => {
    assert.doesNotMatch(
      source,
      /\n\s*trust_state\s+/
    );

    assert.doesNotMatch(
      source,
      /\n\s*validation_state\s+/
    );

    assert.doesNotMatch(
      source,
      /\n\s*operational_eligible\s+/
    );

    assert.doesNotMatch(
      source,
      /\n\s*crowd_eligible\s+/
    );

    assert.doesNotMatch(
      source,
      /\n\s*training_eligible\s+/
    );

    assert.doesNotMatch(
      source,
      /\n\s*validation_eligible\s+/
    );
  }
);

test(
  "B11E1 enables tenant isolation infrastructure",
  () => {
    assert.match(
      source,
      /alter table[\s\S]*public\.hspp_assembly_decisions[\s\S]*enable row level security/
    );
  }
);