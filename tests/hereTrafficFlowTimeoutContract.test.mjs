import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const traffic =
  fs.readFileSync(
    "lib/here/traffic.ts",
    "utf8"
  );

test(
  "HERE Traffic Flow uses a bounded 15 second provider timeout",
  () => {
    assert.match(
      traffic,
      /const HERE_TRAFFIC_FLOW_TIMEOUT_MS\s*=\s*15_000\s*;/,
    );

    assert.match(
      traffic,
      /signal:\s*AbortSignal\.timeout\(\s*HERE_TRAFFIC_FLOW_TIMEOUT_MS\s*,?\s*\)/,
    );
  },
);

test(
  "HERE Traffic Flow still reserves provider cost capacity before fetch",
  () => {
    const reservationIndex =
      traffic.indexOf(
        "await reserveHereProviderRequest("
      );

    const denialIndex =
      traffic.indexOf(
        "!hereCostReservation.allowed"
      );

    const fetchIndex =
      traffic.indexOf(
        "const response = await fetch"
      );

    assert.ok(
      reservationIndex >= 0,
      "HERE Traffic Flow cost reservation is missing",
    );

    assert.ok(
      denialIndex > reservationIndex,
      "HERE cost denial gate must follow reservation",
    );

    assert.ok(
      fetchIndex > denialIndex,
      "HERE fetch must remain behind the cost guard denial gate",
    );
  },
);