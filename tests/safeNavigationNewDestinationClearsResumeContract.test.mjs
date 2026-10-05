import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

function destinationResultSelectionBlock() {
  const start =
    page.indexOf(
      "destinationResults.map("
    );

  assert.ok(
    start >= 0,
    "destinationResults.map block not found",
  );

  const end =
    page.indexOf(
      "calculateRouteButtonRef.current?.focus();",
      start,
    );

  assert.ok(
    end > start,
    "destination result selection end not found",
  );

  return page.slice(
    start,
    end,
  );
}

test(
  "selecting a new destination clears stale Resume Journey ownership",
  () => {
    const block =
      destinationResultSelectionBlock();

    assert.match(
      block,
      /setRefreshRecoveryAvailable\(\s*false\s*\);[\s\S]*?setSelectedDestination\(\s*result\s*\)/,
    );
  },
);

test(
  "new destination still publishes title coordinates and selected result",
  () => {
    const block =
      destinationResultSelectionBlock();

    assert.match(
      block,
      /setSelectedDestination\(\s*result\s*\)/,
    );

    assert.match(
      block,
      /setDestinationName\(\s*result\.title\s*\)/,
    );

    assert.match(
      block,
      /setDestinationLat\(\s*String\(result\.lat\)\s*\)/,
    );

    assert.match(
      block,
      /setDestinationLng\(\s*String\(result\.lng\)\s*\)/,
    );
  },
);

test(
  "refresh restoration still owns Resume Journey until customer intent changes",
  () => {
    assert.match(
      page,
      /setRefreshRecoveryAvailable\(\s*true\s*\)/,
    );

    assert.match(
      page,
      /refreshRecoveryAvailable\s*&&[\s\S]{0,200}?routes\.length\s*===\s*0[\s\S]{0,200}?"Resume Journey"/,
    );
  },
);