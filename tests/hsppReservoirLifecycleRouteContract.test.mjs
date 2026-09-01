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


const neutralCoreStart =
  routerSource.indexOf(
    "export function resolveHsppReservoirLifecycleRouteFromSnapshot",
  );


const legacyWrapperStart =
  routerSource.indexOf(
    "export function resolveHsppReservoirLifecycleRoute({",
    neutralCoreStart + 1,
  );


assert.ok(
  neutralCoreStart >=
    0,
);


assert.ok(
  legacyWrapperStart >
    neutralCoreStart,
);


const neutralCoreSource =
  routerSource.slice(
    neutralCoreStart,
    legacyWrapperStart,
  );


const legacyWrapperSource =
  routerSource.slice(
    legacyWrapperStart,
  );


test(
  "lifecycle module remains a pure authority-free resolver",
  () => {
    assert.doesNotMatch(
      routerSource,
      /\bSupabaseClient\b|\.rpc\s*\(|\.from\s*\(|persistHspp/,
    );

    assert.doesNotMatch(
      routerSource,
      /compareAndSwapHsppReservoir/,
    );
  },
);


test(
  "producer-neutral lifecycle core consumes only the neutral semantic snapshot",
  () => {
    assert.match(
      routerSource,
      /type\s+HsppReservoirDownstreamSnapshot/,
    );

    assert.match(
      neutralCoreSource,
      /snapshot\.organizationId/,
    );

    assert.match(
      neutralCoreSource,
      /snapshot\.candidates/,
    );

    assert.match(
      neutralCoreSource,
      /snapshot\.reevaluation/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /\.discovery\b/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /RunHsppReservoirReevaluationResult/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /createHsppReservoirDownstreamSnapshotFromB07B/,
    );
  },
);


test(
  "legacy public resolver is only the B07B adaptation point",
  () => {
    assert.match(
      legacyWrapperSource,
      /createHsppReservoirDownstreamSnapshotFromB07B\s*\(\s*reevaluationResult\s*,?\s*\)/,
    );

    assert.match(
      legacyWrapperSource,
      /resolveHsppReservoirLifecycleRouteFromSnapshot\s*\(/,
    );

    assert.doesNotMatch(
      legacyWrapperSource,
      /\.discovery\b/,
    );

    assert.doesNotMatch(
      legacyWrapperSource,
      /assemblyCandidates\s*\[/,
    );

    const adapterCalls =
      legacyWrapperSource.match(
        /createHsppReservoirDownstreamSnapshotFromB07B\s*\(/g,
      ) ?? [];

    assert.equal(
      adapterCalls.length,
      1,
    );
  },
);


test(
  "reconstruction authority retains precedence over fresh initial assembly",
  () => {
    const reconstructionIndex =
      neutralCoreSource.indexOf(
        "if (reconstructionMaterial)",
      );

    const initialSelectionIndex =
      neutralCoreSource.indexOf(
        "const selected",
      );


    assert.ok(
      reconstructionIndex >=
        0,
    );

    assert.ok(
      initialSelectionIndex >
        reconstructionIndex,
    );

    assert.match(
      neutralCoreSource,
      /state:\s*"RECONSTRUCTION"/,
    );
  },
);


test(
  "fresh initial assembly still requires both selected candidates to remain NEVER_ASSEMBLED",
  () => {
    assert.match(
      neutralCoreSource,
      /firstCandidate[\s\S]*?membershipClassification\s*===\s*"NEVER_ASSEMBLED"[\s\S]*?secondCandidate[\s\S]*?membershipClassification\s*===\s*"NEVER_ASSEMBLED"/,
    );

    assert.match(
      neutralCoreSource,
      /state:\s*"INITIAL_ASSEMBLY"/,
    );
  },
);


test(
  "non-candidate and malformed candidate states remain fail-closed",
  () => {
    assert.match(
      neutralCoreSource,
      /snapshot\.reevaluation\.state\s*!==[\s\S]*?"ASSEMBLY_CANDIDATE"/,
    );

    assert.match(
      neutralCoreSource,
      /assemblyCandidates\.length\s*!==[\s\S]*?0[\s\S]*?throw new Error/,
    );

    assert.match(
      neutralCoreSource,
      /if\s*\(\s*!selected\s*\)[\s\S]*?throw new Error/,
    );

    assert.match(
      neutralCoreSource,
      /membershipDecision[\s\S]*?eligible\s*!==[\s\S]*?true[\s\S]*?throw new Error/,
    );
  },
);


test(
  "selected evidence is resolved only against neutral snapshot candidates",
  () => {
    assert.match(
      neutralCoreSource,
      /requireCandidate\s*\(\s*snapshot\.candidates,[\s\S]*?selected\.firstEvidenceId/,
    );

    assert.match(
      neutralCoreSource,
      /requireCandidate\s*\(\s*snapshot\.candidates,[\s\S]*?selected\.secondEvidenceId/,
    );

    assert.doesNotMatch(
      neutralCoreSource,
      /discovery\.candidates/,
    );
  },
);


test(
  "recovery cron retains the existing legacy lifecycle call signature",
  () => {
    assert.match(
      recoveryRouteSource,
      /resolveHsppReservoirLifecycleRoute\s*\(\s*\{[\s\S]*?reevaluationResult:\s*[\r\n]+\s*lifecycleSnapshot,[\s\S]*?reconstructionMaterial,/,
    );

    assert.doesNotMatch(
      recoveryRouteSource,
      /resolveHsppReservoirLifecycleRouteFromSnapshot/,
    );

    assert.doesNotMatch(
      recoveryRouteSource,
      /createHsppReservoirDownstreamSnapshotFromB07B/,
    );

    assert.doesNotMatch(
      recoveryRouteSource,
      /createHsppReservoirDownstreamSnapshotFromScheduledPairs/,
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
      b07bIndex >=
        0,
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