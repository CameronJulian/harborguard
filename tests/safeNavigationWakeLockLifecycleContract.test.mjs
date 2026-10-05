import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation only holds a wake lock during real active navigation",
  () => {
    assert.match(
      page,
      /const hasRealGpsWatch\s*=\s*watchIdRef\.current\s*!==\s*null;/,
    );

    assert.match(
      page,
      /const shouldHoldWakeLock\s*=\s*gpsActive\s*&&\s*hasRealGpsWatch\s*&&\s*hasNavigationRoute\s*&&\s*!hasReachedDestination;/,
    );

    assert.match(
      page,
      /if\s*\(!shouldHoldWakeLock\)\s*\{\s*void releaseWakeLock\(\);\s*return;\s*\}/,
    );

    assert.match(
      page,
      /void requestWakeLock\(\);/,
    );
  },
);

test(
  "wake lock requests require a visible browser and supported API",
  () => {
    assert.match(
      page,
      /typeof navigator === "undefined"[\s\S]{0,220}?typeof document === "undefined"[\s\S]{0,220}?document\.visibilityState !== "visible"/,
    );

    assert.match(
      page,
      /const wakeLock\s*=\s*\(navigator as WakeLockNavigator\)[\s\S]{0,80}?\.wakeLock;/,
    );

    assert.match(
      page,
      /!wakeLock\s*\|\|\s*wakeLockRef\.current/,
    );

    assert.match(
      page,
      /await wakeLock\.request\("screen"\)/,
    );
  },
);

test(
  "stale or hidden wake-lock requests cannot regain screen ownership",
  () => {
    assert.match(
      page,
      /const requestId\s*=\s*wakeLockRequestIdRef\.current \+ 1;/,
    );

    assert.match(
      page,
      /wakeLockRequestIdRef\.current\s*=\s*requestId;/,
    );

    assert.match(
      page,
      /requestId\s*!==\s*wakeLockRequestIdRef\.current\s*\|\|\s*document\.visibilityState !== "visible"/,
    );

    assert.match(
      page,
      /requestId[\s\S]{0,650}?await sentinel\.release\(\);[\s\S]{0,220}?return;/,
    );
  },
);

test(
  "releasing the wake lock invalidates pending ownership before releasing the sentinel",
  () => {
    assert.match(
      page,
      /const releaseWakeLock\s*=[\s\S]{0,500}?wakeLockRequestIdRef\.current \+= 1;/,
    );

    assert.match(
      page,
      /const sentinel\s*=\s*wakeLockRef\.current;[\s\S]{0,120}?wakeLockRef\.current\s*=\s*null;/,
    );

    assert.match(
      page,
      /if\s*\(!sentinel\)\s*\{\s*return;\s*\}/,
    );

    assert.match(
      page,
      /await sentinel\.release\(\);/,
    );
  },
);

test(
  "browser release events clear only the sentinel that still owns the wake lock",
  () => {
    assert.match(
      page,
      /sentinel\.addEventListener\?\.\(\s*"release"/,
    );

    assert.match(
      page,
      /wakeLockRef\.current ===\s*sentinel[\s\S]{0,140}?wakeLockRef\.current\s*=\s*null;/,
    );
  },
);

test(
  "visibility changes release and reacquire the wake lock safely",
  () => {
    assert.match(
      page,
      /const handleVisibilityChange\s*=\s*\(\)\s*=>\s*\{/,
    );

    assert.match(
      page,
      /document\.visibilityState ===\s*"visible"[\s\S]{0,180}?void requestWakeLock\(\);[\s\S]{0,180}?void releaseWakeLock\(\);/,
    );

    assert.match(
      page,
      /document\.addEventListener\(\s*"visibilitychange",\s*handleVisibilityChange\s*\);/,
    );

    assert.match(
      page,
      /document\.removeEventListener\(\s*"visibilitychange",\s*handleVisibilityChange\s*\);/,
    );

    assert.match(
      page,
      /document\.removeEventListener[\s\S]{0,220}?void releaseWakeLock\(\);/,
    );
  },
);

test(
  "Wake Lock API failure never blocks Safe Navigation",
  () => {
    assert.match(
      page,
      /Wake Lock API is optional and may be denied by/,
    );

    assert.match(
      page,
      /Navigation must continue normally without it\./,
    );
  },
);