import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/runHsppAssemblyRecoveryCycle.ts",
    "utf8",
  );


test(
  "AS33 preserves ordinary Error messages",
  () => {
    assert.match(
      source,
      /error instanceof Error[\s\S]*return error\.message\.trim\(\)/,
    );
  },
);


test(
  "AS33 preserves thrown string messages",
  () => {
    assert.match(
      source,
      /typeof error === "string"[\s\S]*return error\.trim\(\)/,
    );
  },
);


test(
  "AS33 preserves message from plain Supabase/PostgREST error objects",
  () => {
    assert.match(
      source,
      /typeof error === "object"/,
    );

    assert.match(
      source,
      /error !== null/,
    );

    assert.match(
      source,
      /"message" in error/,
    );

    assert.match(
      source,
      /typeof message === "string"/,
    );

    assert.match(
      source,
      /return message\.trim\(\)/,
    );
  },
);


test(
  "AS33 retains generic fallback for unrecognized thrown values",
  () => {
    assert.match(
      source,
      /return "HSPP assembly recovery work item failed\.";/,
    );
  },
);


test(
  "AS33 does not change OPEN recovery lifecycle ordering",
  () => {
    const membershipIndex =
      source.indexOf(
        "await prepareHsppOpenAssemblyMembershipBeforeSealing",
      );

    const sealingIndex =
      source.indexOf(
        "await runHsppOpenAssemblyRecoverySealing",
      );

    assert.ok(membershipIndex >= 0);
    assert.ok(sealingIndex > membershipIndex);
  },
);