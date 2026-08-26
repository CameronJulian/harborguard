import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260826120000_add_azure_maps_traffic_source.sql",
    "utf8"
  );

test(
  "Azure Maps source registration is additive and dormant",
  () => {
    assert.match(
      migration,
      /'azure_maps_traffic'/
    );

    assert.match(
      migration,
      /'Azure Maps Traffic'/
    );

    assert.match(
      migration,
      /'commercial'/
    );

    assert.match(
      migration,
      /'live'/
    );

    assert.match(
      migration,
      /false,[\s\S]*false,[\s\S]*70/
    );

    assert.match(
      migration,
      /"incidents"/
    );

    assert.match(
      migration,
      /"closures"/
    );

    assert.match(
      migration,
      /"hazards"/
    );

    assert.match(
      migration,
      /"api_version":\s*"2025-01-01"/
    );

    assert.match(
      migration,
      /on conflict \(source_key\) do nothing/
    );
  }
);

test(
  "Azure Maps migration does not alter provider constraints or lifecycle state",
  () => {
    assert.doesNotMatch(
      migration,
      /alter table/
    );

    assert.doesNotMatch(
      migration,
      /hspp_evidence_assembl/
    );

    assert.doesNotMatch(
      migration,
      /hspp_assembly_member/
    );

    assert.doesNotMatch(
      migration.replace(
        /^\s*--.*$/gm,
        ""
      ),
      /\bcron\b/i
    );
  }
);
