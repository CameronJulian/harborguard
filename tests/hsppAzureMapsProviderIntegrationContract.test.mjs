import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/route-safety/providers/importAzureMapsIncidents.ts",
    "utf8"
  );

const orchestration =
  fs.readFileSync(
    "lib/route-safety/providers/runOrganizationProviderImport.ts",
    "utf8"
  );

test(
  "Azure Maps importer uses the current Traffic Incident API",
  () => {
    assert.match(
      source,
      /https:\/\/atlas\.microsoft\.com\/traffic\/incident/
    );

    assert.match(
      source,
      /2025-01-01/
    );

    assert.match(
      source,
      /AZURE_MAPS_TRAFFIC_BBOX/
    );

    assert.match(
      source,
      /subscription-key/
    );

    assert.match(
      source,
      /AZURE_MAPS_SUBSCRIPTION_KEY/
    );
  }
);

test(
  "Azure Maps registry guard occurs before credentials and network request",
  () => {
    const configuration =
      source.indexOf(
        "getSourceConfiguration("
      );

    const enabledGuard =
      source.indexOf(
        "!sourceConfiguration.enabled"
      );

    const subscriptionKey =
      source.indexOf(
        ".AZURE_MAPS_SUBSCRIPTION_KEY"
      );

    const fetch =
      source.indexOf(
        "await fetch("
      );

    assert.ok(
      configuration >= 0
    );

    assert.ok(
      enabledGuard >
        configuration
    );

    assert.ok(
      subscriptionKey >
        enabledGuard
    );

    assert.ok(
      fetch >
        subscriptionKey
    );
  }
);

test(
  "Azure Maps uses distinct provider and source identities",
  () => {
    assert.match(
      source,
      /"azure_maps"/
    );

    assert.match(
      source,
      /"azure_maps_traffic"/
    );
  }
);

test(
  "Azure Maps preserves provider incident identity before mutable Route Safety projection",
  () => {
    assert.match(
      source,
      /extractAzureFeatureIds/
    );

    const observation =
      source.indexOf(
        "persistRouteSafetyProviderObservation({"
      );

    const evidence =
      source.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    const routeSafety =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    const assessment =
      source.indexOf(
        "assessHsppExternalIntelligenceEvidence({"
      );

    const decision =
      source.indexOf(
        "applyHsppAssessmentDecision({"
      );

    assert.ok(
      observation >= 0
    );

    assert.ok(
      evidence >
        observation
    );

    assert.ok(
      routeSafety >
        evidence
    );

    assert.ok(
      assessment >
        routeSafety
    );

    assert.ok(
      decision >
        assessment
    );
  }
);

test(
  "Azure Maps HSPP assessment consumes authoritative provider quality",
  () => {
    assert.match(
      source,
      /providerSources:\s*[\r\n\s]*resolution\.providerSources/
    );

    assert.match(
      source,
      /providerConfirmationCount:[\s\S]*resolution[\s\S]*\.providerConfirmationCount/
    );

    assert.match(
      source,
      /providerConfidence:[\s\S]*resolution[\s\S]*\.providerConfidence/
    );

    assert.match(
      source,
      /providerLastSeen[\s\S]*AZURE_MAPS_SOURCE_KEY/
    );

    assert.match(
      source,
      /providerLastSeenTime >=[\s\S]*staleBeforeMs/
    );
  }
);

test(
  "Azure Maps is scheduled after TomTom and before reconciliation",
  () => {
    const tomTomCall =
      orchestration.indexOf(
        "await importTomTomIncidents("
      );

    const azureMapsCall =
      orchestration.indexOf(
        "await importAzureMapsIncidents("
      );

    const reconciliation =
      orchestration.indexOf(
        "await reconcileProviderObservations("
      );

    assert.match(
      orchestration,
      /importAzureMapsIncidents/
    );

    assert.ok(
      tomTomCall >= 0
    );

    assert.ok(
      azureMapsCall >
        tomTomCall
    );

    assert.ok(
      reconciliation >
        azureMapsCall
    );

    assert.match(
      orchestration,
      /providerResults:\s*\[[\s\S]*hereResult,[\s\S]*tomTomResult,[\s\S]*azureMapsResult,[\s\S]*\]/
    );
  }
);


test(
  "shared cross-provider candidate filter includes Azure Maps",
  () => {
    const sharedUpsert =
      fs.readFileSync(
        "lib/route-safety/upsertRouteSafetyAlerts.ts",
        "utf8"
      );

    assert.ok(
      sharedUpsert.includes(
        '["here_traffic", "tomtom", "azure_maps_traffic"].includes(existingSource)'
      )
    );
  }
);
