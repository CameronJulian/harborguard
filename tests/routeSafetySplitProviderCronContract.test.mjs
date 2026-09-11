import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const here = fs.readFileSync(
  "app/api/route-safety/cron/providers/here/route.ts",
  "utf8"
);

const tomtom = fs.readFileSync(
  "app/api/route-safety/cron/providers/tomtom/route.ts",
  "utf8"
);

const azure = fs.readFileSync(
  "app/api/route-safety/cron/providers/azure-maps/route.ts",
  "utf8"
);

const reconcile = fs.readFileSync(
  "app/api/route-safety/cron/providers/reconcile/route.ts",
  "utf8"
);

const vercel = JSON.parse(
  fs.readFileSync(
    "vercel.json",
    "utf8"
  )
);

const routes = [
  here,
  tomtom,
  azure,
  reconcile,
];

test(
  "all split provider cron routes retain CRON_SECRET authentication",
  () => {
    for (const source of routes) {
      assert.match(
        source,
        /process\.env\.CRON_SECRET/
      );

      assert.match(
        source,
        /authorization !==\s*`Bearer \$\{cronSecret\}`/
      );

      assert.match(
        source,
        /Unauthorized cron request/
      );
    }
  }
);

test(
  "all split provider cron routes retain service-role organization validation",
  () => {
    for (const source of routes) {
      assert.match(
        source,
        /SUPABASE_SERVICE_ROLE_KEY/
      );

      assert.match(
        source,
        /TRAFFIC_IMPORT_ORGANIZATION_ID/
      );

      assert.match(
        source,
        /\.from\("organizations"\)/
      );
    }
  }
);

test(
  "HERE cron uses production HERE provider importer and owns expiration",
  () => {
    assert.match(
      here,
      /await importHereIncidents\(/
    );

    assert.match(
      here,
      /await expireRouteSafetyAlerts\(/
    );

    assert.doesNotMatch(
      here,
      /importTomTomIncidents/
    );

    assert.doesNotMatch(
      here,
      /importAzureMapsIncidents/
    );
  }
);

test(
  "TomTom cron only invokes production TomTom provider importer",
  () => {
    assert.match(
      tomtom,
      /await importTomTomIncidents\(/
    );

    assert.doesNotMatch(
      tomtom,
      /expireRouteSafetyAlerts/
    );

    assert.doesNotMatch(
      tomtom,
      /reconcileProviderObservations/
    );
  }
);

test(
  "Azure Maps cron only invokes production Azure Maps provider importer",
  () => {
    assert.match(
      azure,
      /await importAzureMapsIncidents\(/
    );

    assert.doesNotMatch(
      azure,
      /expireRouteSafetyAlerts/
    );

    assert.doesNotMatch(
      azure,
      /reconcileProviderObservations/
    );
  }
);

test(
  "reconciliation is isolated from provider imports",
  () => {
    assert.match(
      reconcile,
      /await reconcileProviderObservations\(/
    );

    assert.doesNotMatch(
      reconcile,
      /importHereIncidents/
    );

    assert.doesNotMatch(
      reconcile,
      /importTomTomIncidents/
    );

    assert.doesNotMatch(
      reconcile,
      /importAzureMapsIncidents/
    );
  }
);

test(
  "Vercel no longer schedules the combined provider cron",
  () => {
    const paths =
      vercel.crons.map(
        (cron) => cron.path
      );

    assert.ok(
      !paths.includes(
        "/api/route-safety/cron/providers"
      )
    );
  }
);

test(
  "Vercel schedules provider phases in lifecycle order",
  () => {
    const schedules =
      new Map(
        vercel.crons.map(
          (cron) => [
            cron.path,
            cron.schedule,
          ]
        )
      );

    assert.equal(
      schedules.get(
        "/api/route-safety/cron/providers/here"
      ),
      "0 6 * * *"
    );

    assert.equal(
      schedules.get(
        "/api/route-safety/cron/providers/tomtom"
      ),
      "5 6 * * *"
    );

    assert.equal(
      schedules.get(
        "/api/route-safety/cron/providers/azure-maps"
      ),
      "10 6 * * *"
    );

    assert.equal(
      schedules.get(
        "/api/route-safety/cron/providers/reconcile"
      ),
      "15 6 * * *"
    );
  }
);