import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const route =
  fs.readFileSync(
    "app/api/hspp/cron/recovery/route.ts",
    "utf8",
  );


test(
  "Q14ag35N recovery route imports the canonical policy resolver and committed PAIR orchestrator",
  () => {
    assert.match(
      route,
      /resolveHsppReconstructionActivationPolicy,\s*\}\s*from\s*"@\/lib\/hspp\/resolveHsppReconstructionActivationPolicy";/,
    );

    assert.match(
      route,
      /runHsppScheduledPairReconstructionCycle,\s*\}\s*from\s*"@\/lib\/hspp\/runHsppScheduledPairReconstructionCycle";/,
    );
  },
);


test(
  "Q14ag35N recovery route has exactly one scheduled PAIR runtime invocation",
  () => {
    const matches =
      route.match(
        /await runHsppScheduledPairReconstructionCycle\(\{/g,
      ) ?? [];


    assert.equal(
      matches.length,
      1,
    );
  },
);


test(
  "Q14ag35N canonical policy is resolved at the machine boundary",
  () => {
    const pairStart =
      route.indexOf(
        "const scheduledPairReconstruction =",
      );

    const discoveryStart =
      route.indexOf(
        "const reservoirScheduling =",
      );


    assert.ok(
      pairStart >= 0,
    );

    assert.ok(
      discoveryStart > pairStart,
    );


    const region =
      route.slice(
        pairStart,
        discoveryStart,
      );


    assert.match(
      region,
      /const pairPolicy\s*=\s*resolveHsppReconstructionActivationPolicy\(\);/,
    );
  },
);


test(
  "Q14ag35N PAIR receives machine-owned organization limit UUID and canonical policy",
  () => {
    const pairCall =
      route.match(
        /await runHsppScheduledPairReconstructionCycle\(\{[\s\S]*?\n\s*\}\);/,
      );


    assert.ok(
      pairCall,
    );


    const call =
      pairCall[0];


    assert.match(
      call,
      /\bsupabase,/,
    );

    assert.match(
      call,
      /\borganizationId,/,
    );

    assert.match(
      call,
      /limit:\s*recoveryLimit/,
    );

    assert.match(
      call,
      /proposedChildAssemblyId:\s*randomUUID\(\)/,
    );

    assert.match(
      call,
      /reconstructionPolicyVersion:\s*pairPolicy\.reconstructionPolicyVersion/,
    );

    assert.match(
      call,
      /reconstructionReason:\s*pairPolicy\.reconstructionReason/,
    );
  },
);


test(
  "Q14ag35N PAIR is isolated and discovery CAS remains later in the machine",
  () => {
    const b07b =
      route.indexOf(
        "await runHsppReconstructionActivationCycle({",
      );

    const pair =
      route.indexOf(
        "await runHsppScheduledPairReconstructionCycle({",
      );

    const discovery =
      route.indexOf(
        "await compareAndSwapHsppReservoirDiscoveryScanState({",
      );


    assert.ok(
      b07b < pair &&
      pair < discovery,
    );


    const isolatedRegion =
      route.slice(
        route.lastIndexOf(
          "try {",
          pair,
        ),
        discovery,
      );


    assert.match(
      isolatedRegion,
      /catch\s*\(error:\s*unknown\)/,
    );
  },
);


test(
  "Q14ag35N activation does not modify PAIR orchestrator authority",
  () => {
    const orchestrator =
      fs.readFileSync(
        "lib/hspp/runHsppScheduledPairReconstructionCycle.ts",
        "utf8",
      );


    assert.equal(
      orchestrator.includes(
        "resolveHsppReconstructionActivationPolicy("
      ),
      false,
    );

    assert.equal(
      orchestrator.includes(
        "randomUUID("
      ),
      false,
    );
  },
);