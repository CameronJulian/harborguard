import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "short landscape avoids applying the sidebar width twice",
  () => {
    assert.doesNotMatch(
      page,
      /@media\s*\(orientation:\s*landscape\)[\s\S]{0,3000}?min\(320px,\s*42vw\)\s*\+\s*max\(24px,\s*env\(safe-area-inset-left\)\)/,
    );

    const insetPairs =
      page.match(
        /left:\s*max\(8px,\s*env\(safe-area-inset-left\)\)\s*!important;\s*right:\s*max\(8px,\s*env\(safe-area-inset-right\)\)\s*!important;/g,
      ) ?? [];

    assert.ok(
      insetPairs.length >= 2,
      "Expected map-relative insets for turn card and HUD",
    );
  },
);
test(
  "short landscape HUD uses three columns",
  () => {
    assert.match(
      page,
      /@media\s*\(orientation:\s*landscape\)[\s\S]{0,2400}?repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*!important/,
    );

    assert.doesNotMatch(
      page,
      /@media\s*\(orientation:\s*landscape\)[\s\S]{0,2400}?repeat\(5,\s*minmax\(0,\s*1fr\)\)\s*!important/,
    );
  },
);

test(
  "short landscape hides Why This Route recommendation",
  () => {
    assert.match(
      page,
      /@media\s*\(orientation:\s*landscape\)[\s\S]{0,3000}?\.hg-navigation-recommendation\s*\{\s*display:\s*none\s*!important;/,
    );
  },
);

test(
  "short landscape raises follow button above the HUD",
  () => {
    assert.match(
      page,
      /@media\s*\(orientation:\s*landscape\)[\s\S]{0,3000}?\.hg-navigation-follow-button\s*\{[\s\S]*?bottom:\s*max\(176px,\s*env\(safe-area-inset-bottom\)\)\s*!important;/,
    );
  },
);

test(
  "desktop six-column HUD remains configured",
  () => {
    assert.match(
      page,
      /\.hg-navigation-metrics\s*\{\s*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)\s*!important;/,
    );
  },
);

test(
  "portrait three-column HUD remains configured",
  () => {
    const matches =
      page.match(
        /repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*!important/g,
      ) ?? [];

    assert.ok(
      matches.length >= 3,
      "Expected portrait rules plus landscape three-column rule",
    );
  },
);