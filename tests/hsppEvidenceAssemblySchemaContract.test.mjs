import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "supabase/migrations/20260821093000_create_hspp_evidence_assemblies.sql",
  "utf8"
);

test(
  "B11A1 creates assembly and membership identities",
  () => {
    assert.match(
      source,
      /create table public\.hspp_evidence_assemblies/
    );

    assert.match(
      source,
      /create table public\.hspp_evidence_assembly_members/
    );
  }
);

test(
  "assembly membership binds exact organization evidence and fingerprint identity",
  () => {
    assert.match(
      source,
      /foreign key\s*\(\s*organization_id,\s*evidence_id,\s*evidence_integrity_fingerprint\s*\)/s
    );

    assert.match(
      source,
      /references public\.hspp_evidence\s*\(\s*organization_id,\s*id,\s*integrity_fingerprint\s*\)/s
    );

    assert.match(
      source,
      /evidence_integrity_fingerprint ~\s*'\^\[0-9a-f\]\{64\}\$'/s
    );
  }
);

test(
  "assembly itself is organization scoped",
  () => {
    assert.match(
      source,
      /foreign key\s*\(\s*organization_id,\s*assembly_id\s*\)/s
    );

    assert.match(
      source,
      /references public\.hspp_evidence_assemblies\s*\(\s*organization_id,\s*id\s*\)/s
    );
  }
);

test(
  "assembly membership has deterministic non-duplicate ordering",
  () => {
    assert.match(
      source,
      /member_ordinal integer not null/
    );

    assert.match(
      source,
      /unique\s*\(\s*assembly_id,\s*member_ordinal\s*\)/s
    );

    assert.match(
      source,
      /unique\s*\(\s*assembly_id,\s*evidence_id\s*\)/s
    );
  }
);

test(
  "membership policy identity is explicitly versioned",
  () => {
    assert.match(
      source,
      /membership_policy_version text not null/
    );

    assert.match(
      source,
      /length\(trim\(membership_policy_version\)\) > 0/
    );
  }
);

test(
  "assembly has explicit OPEN to SEALED lifecycle",
  () => {
    assert.match(
      source,
      /assembly_state in\s*\(\s*'OPEN',\s*'SEALED'\s*\)/s
    );

    assert.match(
      source,
      /old\.assembly_state <> 'OPEN'[\s\S]*new\.assembly_state <> 'SEALED'/
    );

    assert.match(
      source,
      /permit only OPEN to SEALED transition/
    );

    assert.match(
      source,
      /SEALED HSPP evidence assemblies are immutable/
    );
  }
);

test(
  "assembly cannot seal without at least one member",
  () => {
    assert.match(
      source,
      /if not exists\s*\([\s\S]*from public\.hspp_evidence_assembly_members/
    );

    assert.match(
      source,
      /Cannot seal an HSPP evidence assembly without members/
    );
  }
);

test(
  "assembly membership closes permanently after sealing",
  () => {
    assert.match(
      source,
      /before insert[\s\S]*public\.hspp_evidence_assembly_members/
    );

    assert.match(
      source,
      /current_state <> 'OPEN'/
    );

    assert.match(
      source,
      /Cannot add evidence to a SEALED HSPP assembly/
    );
  }
);

test(
  "member admission serializes against assembly sealing",
  () => {
    assert.match(
      source,
      /select assembly_state[\s\S]*from public\.hspp_evidence_assemblies[\s\S]*for update;/
    );

    assert.match(
      source,
      /serializes member admission against OPEN -> SEALED/
    );

    assert.match(
      source,
      /current_state <> 'OPEN'/
    );
  }
);
test(
  "evidence membership itself remains immutable",
  () => {
    assert.match(
      source,
      /HSPP evidence assembly members are immutable and cannot be changed/
    );

    assert.match(
      source,
      /before update[\s\S]*public\.hspp_evidence_assembly_members/
    );

    assert.match(
      source,
      /before delete[\s\S]*public\.hspp_evidence_assembly_members/
    );
  }
);

test(
  "assembly identity and policy cannot change during sealing",
  () => {
    assert.match(
      source,
      /new\.organization_id is distinct from old\.organization_id/
    );

    assert.match(
      source,
      /new\.assembly_version is distinct from old\.assembly_version/
    );

    assert.match(
      source,
      /new\.membership_policy_version is distinct from old\.membership_policy_version/
    );

    assert.match(
      source,
      /new\.created_at is distinct from old\.created_at/
    );
  }
);

test(
  "assembly tables use organization-scoped access boundaries",
  () => {
    assert.match(
      source,
      /enable row level security/
    );

    assert.match(
      source,
      /profiles\.organization_id/
    );

    assert.match(
      source,
      /grant select, insert, update[\s\S]*public\.hspp_evidence_assemblies[\s\S]*to service_role/s
    );

    assert.match(
      source,
      /grant select, insert[\s\S]*public\.hspp_evidence_assembly_members[\s\S]*to service_role/s
    );
  }
);

test(
  "B11A1 grants no automatic event matching or downstream authority",
  () => {
    assert.match(
      source,
      /does NOT:[\s\S]*determine whether two observations describe the same physical event/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*perform spatial or temporal clustering/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*detect corroboration or contradiction/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*establish physical-world truth/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*change Route Safety scoring/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*create a master HSPP decision/i
    );
  }
);

test(
  "B11A1 does not modify existing HSPP evidence or Route Safety tables",
  () => {
    assert.doesNotMatch(
      source,
      /alter table public\.hspp_evidence\b/
    );

    assert.doesNotMatch(
      source,
      /insert into public\.hspp_evidence\b/
    );

    assert.doesNotMatch(
      source,
      /update public\.hspp_evidence\b/
    );

    assert.doesNotMatch(
      source,
      /route_safety_alerts/
    );

    assert.doesNotMatch(
      source,
      /route_safety_provider_observations/
    );
  }
);