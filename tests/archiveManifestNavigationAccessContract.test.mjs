import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const appShell =
  fs.readFileSync(
    new URL(
      "../components/AppShell.tsx",
      import.meta.url
    ),
    "utf8"
  );

const sidebar =
  fs.readFileSync(
    new URL(
      "../components/Sidebar.tsx",
      import.meta.url
    ),
    "utf8"
  );

const rbac =
  fs.readFileSync(
    new URL(
      "../lib/rbac.ts",
      import.meta.url
    ),
    "utf8"
  );


test(
  "AppShell and Sidebar reuse the canonical RBAC UserRole",
  () => {
    assert.match(
      appShell,
      /import type \{ UserRole \} from "@\/lib\/rbac";/
    );

    assert.match(
      sidebar,
      /import type \{ UserRole \} from "@\/lib\/rbac";/
    );

    assert.doesNotMatch(
      appShell,
      /type UserRole =/
    );

    assert.doesNotMatch(
      sidebar,
      /type UserRole =/
    );

    for (const role of [
      "owner",
      "admin",
      "operator",
      "manager",
      "viewer",
    ]) {
      assert.equal(
        rbac.includes(`| "${role}"`),
        true,
        `canonical role missing: ${role}`
      );
    }
  }
);


test(
  "AppShell fails closed instead of defaulting role failures to admin",
  () => {
    assert.doesNotMatch(
      appShell,
      /setRole\("admin"\)/
    );

    assert.doesNotMatch(
      appShell,
      /profile\.role \|\| "admin"/
    );

    assert.match(
      appShell,
      /profile\.role \|\| null/
    );

    const nullAssignments =
      appShell.match(
        /setRole\(null\)/g
      ) || [];

    assert.ok(
      nullAssignments.length >= 3
    );
  }
);


test(
  "archive navigation is visible only to owner or admin",
  () => {
    assert.match(
      sidebar,
      /const canManageArchive =[\s\S]*role === "owner"[\s\S]*role === "admin"/
    );

    assert.match(
      sidebar,
      /\{canManageArchive && \([\s\S]*href="\/admin\/archive-manifests"[\s\S]*Archive Manifests/
    );
  }
);


test(
  "archive navigation excludes all other organization and platform roles",
  () => {
    const gateMatch =
      sidebar.match(
        /const canManageArchive =([\s\S]*?);/
      );

    assert.ok(
      gateMatch
    );

    const gate =
      gateMatch[0];

    for (const forbiddenRole of [
      "manager",
      "operator",
      "viewer",
      "super_admin",
      "platform_admin",
      "dock",
      "warehouse",
    ]) {
      assert.equal(
        gate.includes(
          `"${forbiddenRole}"`
        ),
        false,
        `archive navigation unexpectedly allows ${forbiddenRole}`
      );
    }
  }
);


test(
  "archive visibility does not use organization-manage permission",
  () => {
    assert.equal(
      sidebar.includes(
        'hasPermission(role, "organization:manage")'
      ),
      false
    );
  }
);


test(
  "archive navigation points to the committed admin archive page",
  () => {
    assert.match(
      sidebar,
      /href="\/admin\/archive-manifests"/
    );

    assert.match(
      sidebar,
      /navStyle\("\/admin\/archive-manifests"\)/
    );
  }
);