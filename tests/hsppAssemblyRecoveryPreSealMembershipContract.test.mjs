import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const recoveryCycle =
  fs.readFileSync(
    "lib/hspp/runHsppAssemblyRecoveryCycle.ts",
    "utf8",
  );

const openSealing =
  fs.readFileSync(
    "lib/hspp/runHsppOpenAssemblyRecoverySealing.ts",
    "utf8",
  );

const preSealMembership =
  fs.readFileSync(
    "lib/hspp/prepareHsppOpenAssemblyMembershipBeforeSealing.ts",
    "utf8",
  );


test(
  "AS26C Q13f establishes B11A2 provenance before Q13c sealing",
  () => {
    const membershipIndex =
      recoveryCycle.indexOf(
        "await prepareHsppOpenAssemblyMembershipBeforeSealing",
      );

    const sealingIndex =
      recoveryCycle.indexOf(
        "await runHsppOpenAssemblyRecoverySealing",
      );

    assert.ok(membershipIndex >= 0);
    assert.ok(sealingIndex > membershipIndex);

    assert.match(
      recoveryCycle,
      /organizationId:\s*normalizedOrganizationId/s,
    );

    assert.match(
      recoveryCycle,
      /assemblyId:\s*workItem\.assemblyId/s,
    );
  },
);


test(
  "AS26C OPEN result carries membership preparation explicitly",
  () => {
    assert.match(
      recoveryCycle,
      /membershipPreparation:\s*PreparedHsppOpenAssemblyMembershipBeforeSealing/s,
    );

    assert.match(
      recoveryCycle,
      /branch:\s*"OPEN_SEALED"[\s\S]*membershipPreparation[\s\S]*sealing/s,
    );

    assert.match(
      recoveryCycle,
      /branch:\s*"OPEN_ERROR"[\s\S]*membershipPreparation:\s*null[\s\S]*sealing:\s*null/s,
    );
  },
);


test(
  "AS26C preserves Q13c as sealing-only",
  () => {
    assert.doesNotMatch(
      openSealing,
      /\bevaluateHsppAssemblyMembership\s*\(/,
    );

    assert.doesNotMatch(
      openSealing,
      /persist_hspp_open_assembly_membership_relation/,
    );

    assert.doesNotMatch(
      openSealing,
      /prepareHsppOpenAssemblyMembershipBeforeSealing/,
    );
  },
);


test(
  "AS26C keeps B11A2 implementation inside AS26B",
  () => {
    assert.match(
      preSealMembership,
      /\bevaluateHsppAssemblyMembership\s*\(/,
    );

    assert.match(
      preSealMembership,
      /persist_hspp_open_assembly_membership_relation/,
    );

    assert.doesNotMatch(
      recoveryCycle,
      /\.rpc\(\s*"persist_hspp_open_assembly_membership_relation"/s,
    );

    assert.doesNotMatch(
      recoveryCycle,
      /\bevaluateHsppAssemblyMembership\s*\(/,
    );
  },
);