import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const wrapper =
  fs.readFileSync(
    "lib/route-safety/refreshRouteSafetySameProviderBatch.ts",
    "utf8"
  );

test(
  "same-provider wrapper targets exactly the deployed batch RPC",
  () => {
    assert.match(
      wrapper,
      /refresh_route_safety_same_provider_batch/
    );

    const calls =
      wrapper.match(
        /await\s+supabase\.rpc\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      1
    );
  }
);

test(
  "same-provider wrapper sends the exact RPC argument boundary",
  () => {
    assert.match(
      wrapper,
      /p_organization_id/
    );

    assert.match(
      wrapper,
      /p_source/
    );

    assert.match(
      wrapper,
      /p_base_confidence/
    );

    assert.match(
      wrapper,
      /p_refreshes/
    );
  }
);

test(
  "same-provider wrapper preserves inputIndex alertId expiry and road name",
  () => {
    assert.match(
      wrapper,
      /inputIndex/
    );

    assert.match(
      wrapper,
      /alertId/
    );

    assert.match(
      wrapper,
      /expiresAt/
    );

    assert.match(
      wrapper,
      /roadName/
    );
  }
);

test(
  "same-provider wrapper keeps TypeScript base-confidence compatibility",
  () => {
    assert.match(
      wrapper,
      /Number\.isFinite\(value\)/
    );

    assert.match(
      wrapper,
      /value < 0/
    );

    assert.match(
      wrapper,
      /value > 100/
    );

    assert.doesNotMatch(
      wrapper,
      /Number\.isInteger\(baseConfidence\)/
    );
  }
);

test(
  "same-provider wrapper rejects duplicate input indexes before RPC execution",
  () => {
    assert.match(
      wrapper,
      /seenInputIndexes/
    );

    assert.match(
      wrapper,
      /duplicate inputIndex values/
    );
  }
);

test(
  "same-provider wrapper validates returned row cardinality",
  () => {
    assert.match(
      wrapper,
      /data\.length !==[\s\S]*?payload\.length/
    );

    assert.match(
      wrapper,
      /unexpected row count/
    );
  }
);

test(
  "same-provider wrapper validates exact returned input identity",
  () => {
    assert.match(
      wrapper,
      /expectedByInputIndex/
    );

    assert.match(
      wrapper,
      /unexpected inputIndex/
    );

    assert.match(
      wrapper,
      /alertId !==[\s\S]*?expected\.alertId/
    );

    assert.match(
      wrapper,
      /unexpected alertId/
    );
  }
);

test(
  "same-provider wrapper validates one-provider quality results",
  () => {
    assert.match(
      wrapper,
      /providerSources\.length !== 1/
    );

    assert.match(
      wrapper,
      /providerConfirmationCount !== 1/
    );

    assert.match(
      wrapper,
      /providerLastSeen/
    );
  }
);

test(
  "same-provider wrapper returns resolutions ordered by inputIndex",
  () => {
    assert.match(
      wrapper,
      /results\.sort/
    );

    assert.match(
      wrapper,
      /left\.inputIndex[\s\S]*?right\.inputIndex/
    );
  }
);

test(
  "same-provider wrapper performs no direct route_safety_alerts mutation",
  () => {
    assert.doesNotMatch(
      wrapper,
      /\.from\(\s*["']route_safety_alerts["']\s*\)/
    );

    assert.doesNotMatch(
      wrapper,
      /\.update\(/
    );
  }
);
test(
  "same-provider wrapper validates provider last-seen as a string record",
  () => {
    assert.match(
      wrapper,
      /providerLastSeen:\s*Record<string,\s*string>/
    );

    assert.match(
      wrapper,
      /function requireStringRecord/
    );

    assert.match(
      wrapper,
      /Object\.entries\(record\)/
    );

    assert.match(
      wrapper,
      /typeof entry !== "string"/
    );
  }
);