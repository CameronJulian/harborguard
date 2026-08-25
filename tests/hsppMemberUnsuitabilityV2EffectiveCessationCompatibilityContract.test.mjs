import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const migrationPath =
  "supabase/migrations/20260825123000_allow_hspp_unsuitability_v2_effective_cessation.sql";

const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


function extractFunction(
  source,
  signature,
) {
  const signatureIndex =
    source.indexOf(
      signature,
    );

  assert.ok(
    signatureIndex >= 0,
    "Missing function signature: " + signature,
  );


  const start =
    source.lastIndexOf(
      "create or replace function",
      signatureIndex,
    );

  assert.ok(
    start >= 0,
  );


  const endMarker =
    "$function$;";

  const end =
    source.indexOf(
      endMarker,
      signatureIndex,
    );

  assert.ok(
    end >= 0,
  );


  return source.slice(
    start,
    end + endMarker.length,
  );
}


const q14ab =
  extractFunction(
    sql,
    "public.enforce_hspp_assembly_member_effective_cessation_insert()",
  );

const q14ac =
  extractFunction(
    sql,
    "public.persist_hspp_assembly_member_effective_cessation_under_lease(",
  );


function assertExactTwoFamilyBoundary(
  source,
) {
  assert.match(
    source,
    /if\s+not\s*\(/i,
  );


  assert.match(
    source,
    /checkpoint_version\s*=\s*[\s\S]*hspp-assembly-member-unsuitability-checkpoint-v1[\s\S]*unsuitability_policy_version\s*=\s*[\s\S]*hspp-post-positive-member-unsuitability-v1[\s\S]*revalidation_evidence_id\s+is\s+null[\s\S]*revalidation_integrity_fingerprint\s+is\s+null/i,
  );


  assert.match(
    source,
    /checkpoint_version\s*=\s*[\s\S]*hspp-assembly-member-unsuitability-checkpoint-v2[\s\S]*unsuitability_policy_version\s*=\s*[\s\S]*hspp-post-positive-member-unsuitability-v2[\s\S]*revalidation_evidence_id\s+is\s+not\s+null[\s\S]*revalidation_integrity_fingerprint\s+is\s+not\s+null/i,
  );


  const reasonMatches =
    source.match(
      /POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION/g,
    ) ?? [];

  assert.ok(
    reasonMatches.length >= 2,
  );
}


test(
  "compatibility migration is UTF-8 without BOM",
  () => {
    const raw =
      fs.readFileSync(
        migrationPath,
      );

    assert.notEqual(
      raw[0],
      0xef,
    );
  },
);


test(
  "migration replaces exactly Q14ab and Q14ac and no other function",
  () => {
    const functions =
      sql.match(
        /create\s+or\s+replace\s+function/gi,
      ) ?? [];

    assert.equal(
      functions.length,
      2,
    );

    assert.ok(
      sql.includes(
        "public.enforce_hspp_assembly_member_effective_cessation_insert()",
      ),
    );

    assert.ok(
      sql.includes(
        "public.persist_hspp_assembly_member_effective_cessation_under_lease(",
      ),
    );
  },
);


test(
  "Q14ab accepts only exact legacy V1 or exact R1 V2 Q14v families",
  () => {
    assertExactTwoFamilyBoundary(
      q14ab,
    );
  },
);


test(
  "Q14ac accepts only exact legacy V1 or exact R1 V2 Q14v families",
  () => {
    assertExactTwoFamilyBoundary(
      q14ac,
    );
  },
);


test(
  "Q14ac caller contract remains exact Q14v checkpoint identity only",
  () => {
    const returnsIndex =
      q14ac.indexOf(
        "returns table",
      );

    assert.ok(
      returnsIndex > 0,
    );


    const signature =
      q14ac.slice(
        0,
        returnsIndex,
      );


    for (const argument of [
      "p_organization_id uuid",
      "p_assembly_id uuid",
      "p_lease_token uuid",
      "p_unsuitability_checkpoint_id uuid",
    ]) {
      assert.ok(
        signature.includes(
          argument,
        ),
        "Missing unchanged Q14ac input: " + argument,
      );
    }


    assert.doesNotMatch(
      signature,
      /p_revalidation_/i,
    );
  },
);


test(
  "effective-cessation durable identity remains V1",
  () => {
    for (const source of [
      q14ab,
      q14ac,
    ]) {
      assert.match(
        source,
        /hspp-assembly-member-effective-cessation-v1/,
      );

      assert.match(
        source,
        /hspp-post-positive-effective-membership-cessation-v1/,
      );

      assert.doesNotMatch(
        source,
        /hspp-assembly-member-effective-cessation-v2|hspp-post-positive-effective-membership-cessation-v2/,
      );
    }
  },
);


test(
  "compatibility migration introduces no table-shape or privilege mutation",
  () => {
    const executableSql =
      sql.replace(
        /--.*$/gm,
        "",
      );

    assert.doesNotMatch(
      executableSql,
      /\balter\s+table\b|\bcreate\s+table\b|\bdrop\s+table\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /\bgrant\b|\brevoke\b/i,
    );
  },
);


test(
  "compatibility migration does not create lifecycle Reservoir reconstruction or R1-writer authority",
  () => {
    assert.doesNotMatch(
      sql,
      /runHsppPostPositiveRevalidationUnsuitabilityAssessment|runHsppReservoirReevaluation|runHsppReconstructionActivationCycle|persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease/,
    );
  },
);
