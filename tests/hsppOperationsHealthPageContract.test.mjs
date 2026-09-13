import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pagePath = path.resolve(
  "app/operations-health/page.tsx"
);

const sidebarPath = path.resolve(
  "components/Sidebar.tsx"
);

const page = fs.readFileSync(
  pagePath,
  "utf8"
);

const sidebar = fs.readFileSync(
  sidebarPath,
  "utf8"
);

test(
  "operations health page is owner/admin gated",
  () => {
    assert.match(
      page,
      /const allowedRoles\s*=\s*\[\s*["']owner["']\s*,\s*["']admin["']\s*,?\s*\]/
    );

    assert.doesNotMatch(
      page,
      /allowedRoles[\s\S]{0,100}["']super_admin["']/
    );
  }
);

test(
  "operations health page consumes HSPP health API",
  () => {
    assert.match(
      page,
      /fetch\s*\(\s*["']\/api\/hspp\/health["']/
    );

    assert.match(
      page,
      /cache\s*:\s*["']no-store["']/
    );
  }
);

test(
  "operations health page does not query scheduled worker state directly",
  () => {
    assert.doesNotMatch(
      page,
      /scheduled_worker_state/
    );

    assert.doesNotMatch(
      page,
      /\.from\s*\(\s*["']scheduled_worker_state["']/
    );
  }
);

test(
  "operations health page models HSPP status contract",
  () => {
    for (const signal of [
      '"unknown"',
      '"healthy"',
      '"stale"',
      "stateRecorded",
      "scheduleIntervalHours",
      "staleGraceHours",
      "staleAfterHours",
      "successfulAgeMs",
      "lastStartedAt",
      "lastSuccessfulAt",
      "lastFailureAt",
      "lastFailureMessage",
      "updatedAt",
    ]) {
      assert.ok(
        page.includes(signal),
        `expected ${signal}`
      );
    }
  }
);

test(
  "operations health page reuses StatusBadge",
  () => {
    assert.match(
      page,
      /import\s*\{\s*StatusBadge\s*\}\s*from\s*["']@\/components\/ui["']/
    );

    assert.match(
      page,
      /<StatusBadge/
    );
  }
);

test(
  "operations health page keeps failure evidence separate",
  () => {
    assert.match(
      page,
      /lastFailureAt/
    );

    assert.match(
      page,
      /lastFailureMessage/
    );

    assert.match(
      page,
      /statusLabel\s*\(\s*health\.status\s*\)/
    );
  }
);

test(
  "sidebar exposes operations health only to owner/admin",
  () => {
    assert.match(
      sidebar,
      /\(\s*role\s*===\s*["']owner["']\s*\|\|\s*role\s*===\s*["']admin["']\s*\)[\s\S]*?href=["']\/operations-health["']/
    );

    assert.doesNotMatch(
      sidebar,
      /role\s*===\s*["']super_admin["'][\s\S]{0,200}href=["']\/operations-health["']/
    );
  }
);

test(
  "operations health page starts with one HSPP worker surface",
  () => {
    assert.match(
      page,
      /HSPP Recovery Worker/
    );

    assert.doesNotMatch(
      page,
      /Traccar Integration Health/
    );

    assert.doesNotMatch(
      page,
      /Crowd Intelligence Operational Health/
    );
  }
);
