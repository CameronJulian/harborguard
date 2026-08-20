import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/route-safety/providers/importHereIncidents.ts",
    "utf8"
  );

test(
  "missing HERE provider identity does not use operational dedupe identity",
  () => {
    assert.match(
      source,
      /!normalized\.providerMessageId/
    );

    assert.match(
      source,
      /continue;/
    );
  }
);

test(
  "missing HERE provider observation time does not create immutable provider observation",
  () => {
    assert.match(
      source,
      /!normalized\.observedAt/
    );
  }
);

test(
  "HERE Route Safety rows still flow through road-context enrichment",
  () => {
    assert.match(
      source,
      /enrichRouteSafetyAlertsWithRoadContext\([\s\S]*?normalizedRows/
    );
  }
);

test(
  "HERE Route Safety rows still flow through existing provider upsert",
  () => {
    assert.match(
      source,
      /insertNewProviderAlerts\([\s\S]*"here_traffic"/
    );
  }
);

test(
  "HERE observation integration does not modify TomTom",
  () => {
    assert.doesNotMatch(
      source,
      /importTomTomIncidents/
    );
  }
);
