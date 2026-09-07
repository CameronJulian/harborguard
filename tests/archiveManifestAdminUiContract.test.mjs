import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    new URL(
      "../app/admin/archive-manifests/page.tsx",
      import.meta.url
    ),
    "utf8"
  );


test(
  "archive admin page uses authenticated HarborGuard APIs only",
  () => {
    assert.match(
      source,
      /fetchWithAuth/
    );

    assert.match(
      source,
      /\/api\/fleet\/vehicle-location-archive\/manifests/
    );

    assert.match(
      source,
      /\/api\/fleet\/vehicle-location-archive\/prune/
    );

    assert.doesNotMatch(
      source,
      /supabaseAdmin/
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*"vehicle_location_archive_manifests"/
    );
  }
);


test(
  "list uses server filtering and pagination",
  () => {
    assert.match(
      source,
      /URLSearchParams/
    );

    assert.match(
      source,
      /params\.set\(\s*"page"/
    );

    assert.match(
      source,
      /params\.set\(\s*"pageSize"/
    );

    assert.match(
      source,
      /params\.set\(\s*"pruneState"/
    );

    assert.match(
      source,
      /params\.set\(\s*"status"/
    );

    assert.match(
      source,
      /params\.set\(\s*"vehicleId"/
    );
  }
);


test(
  "detail uses the certified single-manifest endpoint",
  () => {
    assert.match(
      source,
      /manifests\/\$\{encodeURIComponent\(manifestId\)\}/
    );
  }
);


test(
  "client does not independently calculate pruning eligibility",
  () => {
    assert.match(
      source,
      /detail\?\.eligibility\.state ===[\s\S]*"assessed"/
    );

    assert.match(
      source,
      /detail\.eligibility\.eligible ===[\s\S]*true/
    );

    assert.doesNotMatch(
      source,
      /assessVehicleLocationArchivePruningEligibility/
    );
  }
);


test(
  "prune action requires exact typed confirmation",
  () => {
    assert.match(
      source,
      /const CONFIRMATION =[\s\S]*"PRUNE_VERIFIED_ARCHIVE"/
    );

    assert.match(
      source,
      /confirmationText !==[\s\S]*CONFIRMATION/
    );

    assert.match(
      source,
      /confirmation:[\s\S]*confirmationText/
    );

    assert.match(
      source,
      /disabled=\{[\s\S]*confirmationText !==[\s\S]*CONFIRMATION[\s\S]*prunePending/
    );
  }
);


test(
  "prune result refreshes both detail and list",
  () => {
    assert.match(
      source,
      /await loadDetail\([\s\S]*detail\.manifest\.manifestId/
    );

    assert.match(
      source,
      /await loadList\(\)/
    );

    assert.match(
      source,
      /deletedRowCount/
    );

    assert.match(
      source,
      /durableRetry/
    );
  }
);


test(
  "archive evidence is copyable but not downloadable",
  () => {
    assert.match(
      source,
      /navigator\.clipboard\.writeText/
    );

    assert.match(
      source,
      /Copy object key/
    );

    assert.match(
      source,
      /Copy SHA-256/
    );

    for (const forbidden of [
      "createSignedUrl",
      "createSignedUrls",
      "storage.from(",
      "download(",
      "Download archive",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false,
        `unexpected archive-download behavior: ${forbidden}`
      );
    }
  }
);


test(
  "already-pruned manifests remain visible and cannot expose prune action through local state",
  () => {
    assert.match(
      source,
      /item\.prunedAt[\s\S]*"Pruned"[\s\S]*"Unpruned"/
    );

    assert.match(
      source,
      /canPrune/
    );

    assert.match(
      source,
      /eligibility\.state ===[\s\S]*"assessed"/
    );
  }
);


test(
  "normal reads do not write audit logs",
  () => {
    assert.doesNotMatch(
      source,
      /createAuditLog/
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*"audit_logs"/
    );
  }
);


test(
  "successful prune can link to existing audit log page",
  () => {
    assert.match(
      source,
      /href="\/admin\/audit-logs"/
    );
  }
);

test(
  "successful prune result survives the post-prune detail refresh",
  () => {
    assert.match(
      source,
      /preservePruneResult\?:/
    );

    assert.match(
      source,
      /if \([\s\S]*!options\?\.preservePruneResult[\s\S]*\)[\s\S]*setPruneResult\(null\)/
    );

    assert.match(
      source,
      /await loadDetail\([\s\S]*detail\.manifest\.manifestId,[\s\S]*preservePruneResult:[\s\S]*true/
    );
  }
);
