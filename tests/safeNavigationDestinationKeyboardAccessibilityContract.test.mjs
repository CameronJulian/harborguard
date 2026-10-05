import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "destination search exposes combobox and listbox semantics",
  () => {
    assert.match(page, /role="combobox"/);
    assert.match(page, /aria-autocomplete="list"/);

    assert.match(
      page,
      /aria-expanded=\{destinationResults\.length\s*>\s*0\}/,
    );

    assert.match(
      page,
      /aria-activedescendant=/,
    );

    assert.match(page, /role="listbox"/);
    assert.match(page, /role="option"/);
    assert.match(page, /aria-selected=/);
    assert.match(page, /tabIndex=\{-1\}/);
  },
);

test(
  "destination search supports Arrow keys Escape and Enter selection",
  () => {
    assert.match(
      page,
      /event\.key\s*===\s*"ArrowDown"/,
    );

    assert.match(
      page,
      /event\.key\s*===\s*"ArrowUp"/,
    );

    assert.match(
      page,
      /event\.key\s*===\s*"Escape"/,
    );

    assert.match(
      page,
      /activeDestinationResultIndex/,
    );

    assert.match(
      page,
      /safe-navigation-destination-option-/,
    );

    assert.match(
      page,
      /\.getElementById\([\s\S]*?safe-navigation-destination-option-/,
    );
  },
);

test(
  "editing destination text resets keyboard result ownership",
  () => {
    assert.match(
      page,
      /setDestinationResults\([\s\S]{0,120}?\[\][\s\S]{0,120}?\);[\s\S]{0,120}?setActiveDestinationResultIndex\(-1\);/,
    );
  },
);