import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const routerSource =
  readFileSync(
    new URL(
      "../lib/hspp/resolveHsppReservoirLifecycleRoute.ts",
      import.meta.url,
    ),
    "utf8",
  );

const recoveryRouteSource =
  readFileSync(
    new URL(
      "../app/api/hspp/cron/recovery/route.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "lifecycle router is a pure authority-free resolver",
  () => {
    assert.doesNotMatch(
      routerSource,
      /\bSupabaseClient\b|\.rpc\s*\(|\.from\s*\(|persistHspp/,
    );
  },
);

test(
  "reconstruction authority has precedence over fresh initial assembly",
  () => {
    const reconstructionIndex =
      routerSource.indexOf(
        "if (reconstructionMaterial)",
      );

    const initialSelectionIndex =
      routerSource.indexOf(
        "const selected",
      );

    assert.ok(
      reconstructionIndex >= 0,
    );

    assert.ok(
      initialSelectionIndex >
        reconstructionIndex,
    );

    assert.match(
      routerSource,
      /state:\s*"RECONSTRUCTION"/,
    );
  },
);

test(
  "fresh initial assembly requires both selected candidates to remain NEVER_ASSEMBLED",
  () => {
    assert.match(
      routerSource,
      /firstCandidate[\s\S]*?membershipClassification\s*===\s*"NEVER_ASSEMBLED"[\s\S]*?secondCandidate[\s\S]*?membershipClassification\s*===\s*"NEVER_ASSEMBLED"/,
    );

    assert.match(
      routerSource,
      /state:\s*"INITIAL_ASSEMBLY"/,
    );
  },
);

test(
  "recovery cron reuses one B07B snapshot and invokes B07C2 at most once behind lifecycle routing",
  () => {
    const b07bIndex =
      recoveryRouteSource.indexOf(
        "await runHsppReservoirReevaluation",
      );

    const reconstructionMaterialIndex =
      recoveryRouteSource.indexOf(
        "resolveHsppReconstructionClaimMaterial({",
      );

    const lifecycleRouteIndex =
      recoveryRouteSource.indexOf(
        "resolveHsppReservoirLifecycleRoute({",
      );

    const b07c2Index =
      recoveryRouteSource.indexOf(
        "await persistHsppReservoirAssemblyCandidate({",
      );

    const reconstructionActivationIndex =
      recoveryRouteSource.indexOf(
        "await runHsppReconstructionActivationCycle({",
      );

    assert.ok(
      b07bIndex >= 0,
    );

    assert.ok(
      reconstructionMaterialIndex >
        b07bIndex,
    );

    assert.ok(
      lifecycleRouteIndex >
        reconstructionMaterialIndex,
    );

    assert.ok(
      b07c2Index >
        lifecycleRouteIndex,
    );

    assert.ok(
      reconstructionActivationIndex >
        b07c2Index,
    );

    const b07c2Calls =
      recoveryRouteSource.match(
        /await\s+persistHsppReservoirAssemblyCandidate\s*\(/g,
      ) ?? [];

    assert.equal(
      b07c2Calls.length,
      1,
    );

    assert.match(
      recoveryRouteSource,
      /route\.state\s*!==[\s\S]*?"INITIAL_ASSEMBLY"/,
    );
  },
);

test(
  "recovery cron preserves existing reconstruction activation after B07C2 routing",
  () => {
    const activationCalls =
      recoveryRouteSource.match(
        /await\s+runHsppReconstructionActivationCycle\s*\(/g,
      ) ?? [];

    assert.equal(
      activationCalls.length,
      1,
    );

    assert.match(
      recoveryRouteSource,
      /const reconstructionSnapshot\s*=[\s\S]*?reservoirRun\.reevaluationResult/,
    );
  },
);
