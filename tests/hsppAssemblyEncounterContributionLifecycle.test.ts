import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_LIFECYCLE_VERSION,
} from "../lib/hspp/runHsppAssemblyEncounterContributionLifecycle";


test(
  "encounter contribution lifecycle exposes a stable v1 policy identity",
  () => {
    assert.equal(
      HSPP_ASSEMBLY_ENCOUNTER_CONTRIBUTION_LIFECYCLE_VERSION,
      "hspp-assembly-encounter-contribution-lifecycle-v1",
    );
  },
);