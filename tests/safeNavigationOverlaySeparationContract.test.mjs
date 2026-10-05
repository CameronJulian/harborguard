import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "active route safety warning is vertically separated from route intelligence",
  () => {
    assert.match(
      page,
      /className="hg-active-route-safety-warning"[\s\S]{0,500}?position:\s*"absolute"[\s\S]{0,200}?bottom:\s*390[\s\S]{0,200}?zIndex:\s*760/,
    );

    assert.match(
      page,
      /className="hg-navigation-recommendation"[\s\S]{0,500}?position:\s*"absolute"[\s\S]{0,200}?bottom:\s*190[\s\S]{0,200}?zIndex:\s*700/,
    );
  },
);

test(
  "live road intelligence remains inside the route recommendation",
  () => {
    assert.match(
      page,
      /className="hg-navigation-recommendation"[\s\S]{0,2500}?aria-label="Live road intelligence"/,
    );

    assert.match(
      page,
      /Live road conditions/,
    );
  },
);

test(
  "mobile continues to hide the desktop route recommendation overlay",
  () => {
    assert.match(
      page,
      /@media\s*\(max-width:\s*767px\)[\s\S]{0,5000}?\.hg-navigation-recommendation\s*\{[\s\S]{0,200}?display:\s*none;/,
    );
  },
);