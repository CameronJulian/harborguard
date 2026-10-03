import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const mapPath = fileURLToPath(
  new URL(
    "../components/navigation/SafeNavigationMap.tsx",
    import.meta.url
  )
);

const source =
  fs.readFileSync(
    mapPath,
    "utf8"
  );

test(
  "Safe Navigation has exactly one React-Leaflet map owner",
  () => {
    const matches =
      source.match(
        /<MapContainer\b/g
      ) ?? [];

    assert.equal(
      matches.length,
      1
    );
  }
);

test(
  "MapContainer does not use a changing development key",
  () => {
    assert.doesNotMatch(
      source,
      /SAFE_NAVIGATION_MAP_MOUNT_KEY/
    );

    assert.doesNotMatch(
      source,
      /Date\.now\(\)/
    );

    assert.doesNotMatch(
      source,
      /<MapContainer[\s\S]{0,300}\bkey=/
    );
  }
);

test(
  "Leaflet map ownership is not manually mutated",
  () => {
    assert.doesNotMatch(
      source,
      /_leaflet_id/
    );

    assert.doesNotMatch(
      source,
      /\bmap\.remove\(\)/
    );

    assert.doesNotMatch(
      source,
      /\bL\.map\(/
    );
  }
);

test(
  "React-Leaflet still owns TileLayer and navigation children",
  () => {
    assert.match(
      source,
      /<MapContainer/
    );

    assert.match(
      source,
      /<TileLayer/
    );

    assert.match(
      source,
      /<MapViewportSync\s*\/>/
    );

    assert.match(
      source,
      /<NavigationFollow/
    );
  }
);

test(
  "viewport lifecycle cleanup remains intact",
  () => {
    assert.match(
      source,
      /observer\?\.disconnect\(\)/
    );

    assert.match(
      source,
      /window\.removeEventListener\([\s\S]*?"resize"/
    );

    assert.match(
      source,
      /window\.removeEventListener\([\s\S]*?"orientationchange"/
    );

    assert.match(
      source,
      /map\.off\("moveend", clearProgrammaticMove\)/
    );
  }
);