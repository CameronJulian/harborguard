import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync(
  "lib/payfast/api.ts",
  "utf8"
);

const mode = fs.readFileSync(
  "lib/payfast/mode.ts",
  "utf8"
);

const cancelRoute = fs.readFileSync(
  "app/api/billing/cancel/route.ts",
  "utf8"
);

test(
  "REST API signature alphabetically sorts fields",
  () => {
    assert.match(
      api,
      /\.sort\(\)/
    );

    assert.match(
      api,
      /Object\.keys\(signatureData\)/
    );
  }
);

test(
  "REST API signature uses MD5 and passphrase",
  () => {
    assert.match(
      api,
      /createHash\("md5"\)/
    );

    assert.match(
      api,
      /\.\.\.data,\s*passphrase/
    );
  }
);

test(
  "REST API headers contain required PayFast fields",
  () => {
    assert.match(
      api,
      /"merchant-id": merchantId/
    );

    assert.match(
      api,
      /version: "v1"/
    );

    assert.match(
      api,
      /timestamp/
    );

    assert.match(
      api,
      /signature/
    );
  }
);

test(
  "REST API timestamp includes local timezone offset",
  () => {
    assert.match(
      api,
      /getTimezoneOffset\(\)/
    );

    assert.match(
      api,
      /timezoneOffsetMinutes\s*>=\s*0/
    );

    assert.match(
      api,
      /timezoneSign/
    );

    assert.match(
      api,
      /absoluteOffsetMinutes/
    );

    assert.match(
      api,
      /timezoneHours/
    );

    assert.match(
      api,
      /timezoneMinutes/
    );

    assert.match(
      api,
      /pad\(timezoneHours\)/
    );

    assert.match(
      api,
      /pad\(timezoneMinutes\)/
    );
  }
);
test(
  "sandbox cancellation URL uses testing=true",
  () => {
    assert.match(
      mode,
      /api\.payfast\.co\.za\/subscriptions/
    );

    assert.match(
      mode,
      /\?testing=true/
    );

    assert.match(
      mode,
      /getPayFastMode\(rawValue\) === "sandbox"/
    );
  }
);

test(
  "production cancellation URL does not require testing flag",
  () => {
    assert.match(
      mode,
      /: base;/
    );
  }
);

test(
  "cancel endpoint permits outbound cancellation only in sandbox mode",
  () => {
    assert.match(
      cancelRoute,
      /payfastMode !== "sandbox"/
    );

    assert.match(
      cancelRoute,
      /outboundCancellationEnabled:\s*false/
    );

    assert.match(
      cancelRoute,
      /outboundCancellationEnabled:\s*true/
    );

    assert.match(
      cancelRoute,
      /getPayFastApiSubscriptionCancelUrl/
    );

    assert.match(
      cancelRoute,
      /buildPayFastApiHeaders/
    );

    assert.match(
      cancelRoute,
      /\bfetch\s*\(/
    );
  }
);
