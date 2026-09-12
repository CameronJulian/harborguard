import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const importer =
  fs.readFileSync(
    "lib/route-safety/providers/importHereIncidents.ts",
    "utf8"
  );

const wrapper =
  fs.readFileSync(
    "lib/hspp/persistRouteSafetyProviderObservationsBatch.ts",
    "utf8"
  );

const singleWriter =
  fs.readFileSync(
    "lib/hspp/persistRouteSafetyProviderObservation.ts",
    "utf8"
  );

const migration =
  fs.readFileSync(
    "supabase/migrations/20260912090000_persist_route_safety_provider_observations_batch.sql",
    "utf8"
  );

test(
  "HERE batches provider-observation misses before its evidence loop",
  () => {
    assert.match(
      importer,
      /persistRouteSafetyProviderObservationsBatch/
    );

    const prefetchIndex =
      importer.indexOf(
        "await prefetchRouteSafetyProviderObservations({"
      );

    const batchIndex =
      importer.indexOf(
        "await persistRouteSafetyProviderObservationsBatch({"
      );

    const evidencePrefetchIndex =
      importer.indexOf(
        "await prefetchHsppEvidenceForProviderObservations({"
      );

    const evidenceLoopMatch =
      /for\s*\(\s*let\s+inputIndex\s*=\s*0\s*;[\s\S]*?inputIndex\s*<\s*normalizedIncidents\.length\s*;[\s\S]*?inputIndex\s*\+=\s*1\s*\)/.exec(
        importer
      );

    const evidenceLoopIndex =
      evidenceLoopMatch?.index ?? -1;

    assert.ok(
      prefetchIndex >= 0,
      "HERE observation prefetch must remain present"
    );

    assert.ok(
      batchIndex > prefetchIndex,
      "HERE batch persistence must follow observation prefetch"
    );

    assert.ok(
      evidencePrefetchIndex > batchIndex,
      "HERE evidence prefetch must follow observation miss batching"
    );

    assert.ok(
      evidenceLoopIndex > evidencePrefetchIndex,
      "HERE sequential evidence processing must remain after prefetch"
    );
  }
);

test(
  "HERE no longer performs sequential single-row observation persistence",
  () => {
    assert.doesNotMatch(
      importer,
      /await\s+persistRouteSafetyProviderObservation\(/
    );

    assert.match(
      singleWriter,
      /export async function persistRouteSafetyProviderObservation\(/
    );
  }
);

test(
  "provider observation batch wrapper performs exactly one RPC boundary",
  () => {
    const calls =
      wrapper.match(
        /await\s+supabase\.rpc\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      1
    );

    assert.match(
      wrapper,
      /persist_route_safety_provider_observations_batch/
    );

    assert.match(
      wrapper,
      /unexpected persisted row count/
    );

    assert.match(
      wrapper,
      /does not match the requested immutable observation/
    );
  }
);

test(
  "provider observation batch preserves caller-owned receipt timestamps",
  () => {
    assert.match(
      importer,
      /receivedAt:\s*new Date\(\)\.toISOString\(\)/
    );

    assert.match(
      wrapper,
      /New provider observation batch receipt time does not match the caller-owned receipt time/
    );

    assert.match(
      migration,
      /received_at/
    );
  }
);

test(
  "provider observation batch RPC preserves database authority and immutable collision checks",
  () => {
    assert.match(
      migration,
      /security definer/i
    );

    assert.match(
      migration,
      /set search_path = public/i
    );

    assert.match(
      migration,
      /pg_advisory_xact_lock/i
    );

    assert.match(
      migration,
      /on conflict on constraint\s+route_safety_provider_observations_source_identity_unique/i
    );

    assert.match(
      migration,
      /observedAt does not match the existing immutable observation/i
    );

    assert.match(
      migration,
      /normalized payload does not match the existing immutable observation/i
    );
  }
);

test(
  "provider observation batch RPC is service-role only",
  () => {
    assert.match(
      migration,
      /revoke all[\s\S]*from[\s\S]*public,[\s\S]*anon,[\s\S]*authenticated,[\s\S]*service_role;/i
    );

    assert.match(
      migration,
      /grant execute[\s\S]*to[\s\S]*service_role;/i
    );
  }
);