import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath =
  path.resolve(
    process.cwd(),
    "lib/geo/providerGeometryRouteDistance.ts"
  );

const {
  extractProviderGeometryCoordinates,
  getMinimumProviderGeometryDistanceMeters,
  providerGeometryScoreMultiplier,
} = await import(
  pathToFileURL(modulePath).href
);

test(
  "extracts TomTom GeoJSON LineString coordinates",
  () => {
    assert.deepEqual(
      extractProviderGeometryCoordinates({
        type: "LineString",
        coordinates: [
          [18.5, -33.9],
          [18.6, -34.0],
        ],
      }),
      [
        [-33.9, 18.5],
        [-34.0, 18.6],
      ]
    );
  }
);

test(
  "extracts HERE links geometry",
  () => {
    assert.deepEqual(
      extractProviderGeometryCoordinates({
        links: [
          {
            points: [
              {
                lat: -33.9,
                lng: 18.5,
              },
              {
                lat: -34.0,
                lng: 18.6,
              },
            ],
          },
        ],
      }),
      [
        [-33.9, 18.5],
        [-34.0, 18.6],
      ]
    );
  }
);

test(
  "extracts HERE shape links geometry",
  () => {
    assert.deepEqual(
      extractProviderGeometryCoordinates({
        shape: {
          links: [
            {
              points: [
                {
                  lat: -33.9,
                  lng: 18.5,
                },
              ],
            },
          ],
        },
      }),
      [
        [-33.9, 18.5],
      ]
    );
  }
);

test(
  "rejects malformed provider geometry",
  () => {
    assert.deepEqual(
      extractProviderGeometryCoordinates(
        null
      ),
      []
    );

    assert.deepEqual(
      extractProviderGeometryCoordinates(
        {}
      ),
      []
    );
  }
);

test(
  "calculates minimum route to provider geometry distance",
  () => {
    const distance =
      getMinimumProviderGeometryDistanceMeters(
        [
          [-33.9, 18.5],
          [-34.0, 18.6],
        ],
        {
          type: "LineString",
          coordinates: [
            [18.5, -33.9],
          ],
        }
      );

    assert.notEqual(
      distance,
      null
    );

    assert.ok(
      distance >= 0 &&
      distance < 1
    );
  }
);

test(
  "returns null for empty route or provider geometry",
  () => {
    assert.equal(
      getMinimumProviderGeometryDistanceMeters(
        [],
        {
          type: "LineString",
          coordinates: [
            [18.5, -33.9],
          ],
        }
      ),
      null
    );

    assert.equal(
      getMinimumProviderGeometryDistanceMeters(
        [
          [-33.9, 18.5],
        ],
        {}
      ),
      null
    );
  }
);

test(
  "preserves provider geometry score multiplier bands",
  () => {
    assert.equal(
      providerGeometryScoreMultiplier(null),
      1
    );

    assert.equal(
      providerGeometryScoreMultiplier(50),
      1
    );

    assert.equal(
      providerGeometryScoreMultiplier(150),
      0.9
    );

    assert.equal(
      providerGeometryScoreMultiplier(300),
      0.75
    );

    assert.equal(
      providerGeometryScoreMultiplier(500),
      0.6
    );

    assert.equal(
      providerGeometryScoreMultiplier(1000),
      0.4
    );

    assert.equal(
      providerGeometryScoreMultiplier(1001),
      0.25
    );
  }
);
