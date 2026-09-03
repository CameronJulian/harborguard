import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const route =
  fs.readFileSync(
    "app/api/hspp/cron/recovery/route.ts",
    "utf8",
  );


test(
  "Q14ag35N recovery machine activates scheduled PAIR after existing B07B activation and before discovery CAS",
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


    assert.notEqual(
      b07b,
      -1,
    );

    assert.notEqual(
      pair,
      -1,
    );

    assert.notEqual(
      discovery,
      -1,
    );

    assert.ok(
      b07b < pair,
    );

    assert.ok(
      pair < discovery,
    );
  },
);


test(
  "Q14ag35N PAIR gets canonical policy and an independent machine-owned UUID",
  () => {
    const pairBlockStart =
      route.indexOf(
        "const scheduledPairReconstruction =",
      );

    const pairBlockEnd =
      route.indexOf(
        "Do not serialize Q13f's or B07B's complete internal results directly.",
        pairBlockStart,
      );

    assert.ok(
      pairBlockStart >= 0,
    );

    assert.ok(
      pairBlockEnd > pairBlockStart,
    );


    const pairBlock =
      route.slice(
        pairBlockStart,
        pairBlockEnd,
      );


    assert.match(
      pairBlock,
      /resolveHsppReconstructionActivationPolicy\(\)/,
    );

    assert.match(
      pairBlock,
      /proposedChildAssemblyId:\s*randomUUID\(\)/,
    );

    assert.match(
      pairBlock,
      /reconstructionPolicyVersion:\s*pairPolicy\.reconstructionPolicyVersion/,
    );

    assert.match(
      pairBlock,
      /reconstructionReason:\s*pairPolicy\.reconstructionReason/,
    );
  },
);


test(
  "Q14ag35N PAIR failure is isolated before discovery scheduling continues",
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


    const pairRegion =
      route.slice(
        pairStart,
        discoveryStart,
      );


    assert.match(
      pairRegion,
      /catch\s*\(error:\s*unknown\)/,
    );

    assert.match(
      pairRegion,
      /status:\s*"ERROR"\s+as const/,
    );

    assert.match(
      pairRegion,
      /error:\s*errorMessage\(/,
    );
  },
);


test(
  "Q14ag35N response exposes only the bounded scheduledPairReconstruction summary",
  () => {
    assert.match(
      route,
      /reconstruction,\s*scheduledPairReconstruction,\s*results:/,
    );


    const pairStart =
      route.indexOf(
        "const scheduledPairReconstruction =",
      );

    const pairEnd =
      route.indexOf(
        "Do not serialize Q13f's or B07B's complete internal results directly.",
        pairStart,
      );

    const pairRegion =
      route.slice(
        pairStart,
        pairEnd,
      );


    for (
      const required of [
        "status:",
        "runnerVersion:",
        "schedulingVersion:",
        "scheduledPairCount:",
        "reevaluationState:",
        "producerState:",
        "cursorState:",
        "cursorCasStatus:",
        "error:",
      ]
    ) {
      assert.equal(
        pairRegion.includes(
          required,
        ),
        true,
        `Missing bounded PAIR field: ${required}`,
      );
    }
  },
);


test(
  "Q14ag35N PAIR status does not participate in existing top-level success calculation",
  () => {
    const responseStart =
      route.indexOf(
        "return NextResponse.json({",
        route.indexOf(
          "const openFailed =",
        ),
      );

    assert.ok(
      responseStart >= 0,
    );


    const response =
      route.slice(
        responseStart,
      );


    assert.match(
      response,
      /success:\s*openFailed\s*===\s*0\s*&&\s*sealedFailed\s*===\s*0/,
    );

    const successExpressionEnd =
      response.indexOf(
        "runnerVersion:",
      );

    assert.ok(
      successExpressionEnd > 0,
    );


    const successRegion =
      response.slice(
        0,
        successExpressionEnd,
      );


    assert.equal(
      successRegion.includes(
        "scheduledPairReconstruction",
      ),
      false,
    );
  },
);