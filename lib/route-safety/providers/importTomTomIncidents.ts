import { randomUUID } from "node:crypto";
import type { ProviderResult } from "@/lib/route-safety/providers/types";
import type {
  IntelligenceSourceConfigurationLoader,
} from "@/lib/route-safety/providers/getIntelligenceSourceConfiguration";
import type { RouteSafetyAlertRow } from "@/lib/route-safety/types";
import { insertNewProviderAlerts } from "@/lib/route-safety/upsertRouteSafetyAlerts";
import { enrichRouteSafetyAlertsWithRoadContext } from "@/lib/route-safety/enrichRouteSafetyAlertsWithRoadContext";
import { resolveRoadContext } from "@/lib/road-context/provider";
import { persistRouteSafetyProviderObservation } from "@/lib/hspp/persistRouteSafetyProviderObservation";
import {
  persistRouteSafetyProviderSnapshotRetrieval,
  type RouteSafetyProviderSnapshotAssertionInput,
} from "@/lib/route-safety/providers/persistRouteSafetyProviderSnapshotRetrieval";
import {
  assessHsppExternalIntelligenceEvidence,
  HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
} from "@/lib/hspp/assessHsppExternalIntelligenceEvidence";
import { buildHsppEvidence } from "@/lib/hspp/buildHsppEvidence";
import { persistHsppEvidenceForProviderObservation } from "@/lib/hspp/persistHsppEvidenceForProviderObservation";
import { applyHsppAssessmentDecision } from "@/lib/hspp/applyHsppAssessmentDecision";
import { verifyHsppEvidenceIntegrity } from "@/lib/hspp/verifyHsppEvidenceIntegrity";

const HSPP_PROVIDER_FRESHNESS_HOURS = 48;

type TomTomHsppAssessmentContext = {
  evidence: ReturnType<typeof buildHsppEvidence>;
  persistedEvidence: Awaited<
    ReturnType<
      typeof persistHsppEvidenceForProviderObservation
    >
  >;
} | null;

function mapTomTomType(
  category: number | string | null,
  description: string
) {
  const text = description.toLowerCase();
const value = String(category || "");

if (
  text.includes("road construction") ||
  text.includes("roadworks") ||
  text.includes("road works")
) {
  return "roadworks";
}

if (
  text.includes("road closed") ||
  text.includes("closed ahead") ||
  text.includes("closed") ||
  text.includes("closure")
) {
  return "road_closure";
}

if (
  text.includes("backed-up traffic") ||
  text.includes("traffic congestion") ||
  text.includes("stationary traffic") ||
  text.includes("queuing traffic") ||
  text.includes("slow traffic")
) {
  return "congestion";
}

  if (value === "1") return "accident";
  if (value === "2") return "weather_hazard";
  if (value === "3") return "road_hazard";
  if (value === "4") return "weather_hazard";
  if (value === "5") return "weather_hazard";
  if (value === "6") return "congestion";
  if (value === "7") return "lane_closure";
  if (value === "8") return "road_closure";
  if (value === "9") return "roadworks";
  if (value === "10") return "weather_hazard";
  if (value === "11") return "flooding";
  if (value === "14") return "vehicle_breakdown";

  return "road_hazard";
}

function mapTomTomSeverity(magnitude: number | string | null) {
  const value = Number(magnitude || 0);

  if (value >= 4) {
    return "critical";
  }

  if (value >= 3) {
    return "high";
  }

  if (value >= 2) {
    return "medium";
  }

  return "low";
}

export async function importTomTomIncidents(
  supabase: any,
  organizationId: string,
  getSourceConfiguration: IntelligenceSourceConfigurationLoader
): Promise<ProviderResult> {
  const sourceLookup =
    await getSourceConfiguration(
      supabase,
      "tomtom"
    );

  if (!sourceLookup.configuration) {
    return {
      provider: "tomtom",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        sourceLookup.error ||
        "TomTom source configuration could not be loaded.",
    };
  }

  const sourceConfiguration =
    sourceLookup.configuration;

  if (
    !sourceConfiguration.enabled ||
    !sourceConfiguration.approvedForIngestion
  ) {
    console.info(
      "[TomTom provider ingestion] Skipped by intelligence source registry."
    );

    return {
      provider: "tomtom",
      organizationId,
      success: true,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: null,
    };
  }

  if (!process.env.TOMTOM_API_KEY) {
    return {
      provider: "tomtom",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: "TOMTOM_API_KEY is not configured.",
    };
  }

  try {
    const bbox =
      process.env.TOMTOM_TRAFFIC_BBOX ||
      "18.20,-34.10,19.10,-33.60";

    const fields =
      "{incidents{type,geometry{type,coordinates}," +
      "properties{id,lastReportTime,iconCategory,magnitudeOfDelay," +
      "events{description,code},from,to,length,delay}}}";

    const url =
      "https://api.tomtom.com/traffic/services/5/incidentDetails" +
      `?bbox=${encodeURIComponent(bbox)}` +
      `&fields=${encodeURIComponent(fields)}` +
      "&language=en-GB" +
      "&timeValidityFilter=present" +
      `&key=${process.env.TOMTOM_API_KEY}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const receivedAt =
      new Date().toISOString();

    const retrievalId =
      randomUUID();

    const trafficModelId =
      response.headers
        .get("TrafficModelID")
        ?.trim() || "";

    const responseOriginatedAtCandidate =
      response.headers
        .get("Date")
        ?.trim() || "";

    const responseOriginatedAtMilliseconds =
      Date.parse(
        responseOriginatedAtCandidate
      );

    const responseOriginatedAt =
      responseOriginatedAtCandidate &&
      Number.isFinite(
        responseOriginatedAtMilliseconds
      )
        ? new Date(
            responseOriginatedAtMilliseconds
          ).toISOString()
        : null;

    const providerRequestIdCandidate =
      response.headers
        .get("Tracking-ID")
        ?.trim() || "";

    const providerRequestId =
      providerRequestIdCandidate ||
      null;

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detailedError?.message ||
          data?.error?.description ||
          "TomTom Traffic request failed."
      );
    }

    const incidents = Array.isArray(data?.incidents)
      ? data.incidents
      : [];

    const normalizedIncidents = incidents
      .map((incident: any): {
        row: RouteSafetyAlertRow;
        providerMessageId: string;
        observedAt: string | null;
      } | null => {
        const coordinates = incident?.geometry?.coordinates;

        const firstPoint = Array.isArray(coordinates?.[0])
          ? coordinates[0]
          : coordinates;

        const longitude = Number(firstPoint?.[0]);
        const latitude = Number(firstPoint?.[1]);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        const properties = incident?.properties || {};

        const eventDescription = String(
          properties?.events?.[0]?.description ||
            properties?.from ||
            "Traffic incident reported"
        );

        const row: RouteSafetyAlertRow = {
          organization_id: organizationId,
          type: mapTomTomType(
            properties?.iconCategory,
            eventDescription
          ),
          title: eventDescription.slice(0, 120),
          description:
            "Automatically imported from TomTom Traffic. " +
            `Delay: ${properties?.delay || 0}s. ` +
            `Length: ${properties?.length || 0}m.`,
          latitude,
          longitude,
          radius_meters: 1200,
          severity: mapTomTomSeverity(
            properties?.magnitudeOfDelay
          ),
           source: "tomtom",
  status: "active",
  expires_at: new Date(
    Date.now() + 2 * 60 * 60 * 1000
  ).toISOString(),
  verified_at: new Date().toISOString(),

  road_name:
    properties?.from ??
    properties?.to ??
    null,

  road_from:
    properties?.from ??
    null,

  road_to:
    properties?.to ??
    null,

  provider_geometry:
    incident?.geometry ??
    null,
};

        const providerMessageId =
          typeof properties?.id === "string"
            ? properties.id.trim()
            : "";

        const observedAtCandidate =
          typeof properties?.lastReportTime === "string"
            ? properties.lastReportTime.trim()
            : "";

        const observedAtMilliseconds =
          Date.parse(observedAtCandidate);

        const observedAt =
          observedAtCandidate &&
          Number.isFinite(observedAtMilliseconds)
            ? new Date(
                observedAtMilliseconds
              ).toISOString()
            : null;

        return {
          row,
          providerMessageId,
          observedAt,
        };
      })
      .filter(
        (
          item: {
            row: RouteSafetyAlertRow;
            providerMessageId: string;
            observedAt: string | null;
          } | null
        ): item is {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          observedAt: string | null;
        } =>
          item !== null
      );

    const snapshotAssertions:
      RouteSafetyProviderSnapshotAssertionInput[] =
        normalizedIncidents.map(
          (normalized: {
            row: RouteSafetyAlertRow;
            providerMessageId: string;
            observedAt: string | null;
          }) => {
            const immutableNormalizedPayload:
              Record<string, unknown> = {
                ...(
                  normalized.row as unknown as
                    Record<string, unknown>
                ),
              };

            delete immutableNormalizedPayload.verified_at;
            delete immutableNormalizedPayload.expires_at;

            return {
              providerMessageId:
                normalized.providerMessageId,
              payloadSchemaVersion:
                HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
              eventObservedAt:
                normalized.observedAt,
              providerObservationId:
                null,
              normalizedPayload:
                immutableNormalizedPayload,
            };
          }
        );

    const hasCompleteSnapshotAssertionIdentity =
      snapshotAssertions.every(
        (assertion) =>
          assertion.providerMessageId
            .trim()
            .length > 0
      );

    const hsppAssessmentContexts:
      TomTomHsppAssessmentContext[] =
        Array.from(
          {
            length:
              normalizedIncidents.length,
          },
          () => null
        );

    for (
      let inputIndex = 0;
      inputIndex < normalizedIncidents.length;
      inputIndex += 1
    ) {
      const normalized =
        normalizedIncidents[inputIndex];
      if (
        !normalized.providerMessageId ||
        !normalized.observedAt
      ) {
        continue;
      }

      const snapshotAssertion =
        snapshotAssertions[inputIndex];

      const immutableNormalizedPayload =
        snapshotAssertion.normalizedPayload;

      const providerObservation =
        await persistRouteSafetyProviderObservation({
        supabase,
        organizationId,
        provider:
          "tomtom",
        sourceStream:
          "tomtom",
        providerMessageId:
          normalized.providerMessageId,
        observedAt:
          normalized.observedAt,
        payloadSchemaVersion:
          HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
        normalizedPayload:
          immutableNormalizedPayload,
      });

      snapshotAssertion.providerMessageId =
        providerObservation.providerMessageId;

      snapshotAssertion.payloadSchemaVersion =
        providerObservation.payloadSchemaVersion;

      snapshotAssertion.eventObservedAt =
        providerObservation.observedAt;

      snapshotAssertion.providerObservationId =
        providerObservation.id;

      snapshotAssertion.normalizedPayload =
        providerObservation.normalizedPayload;

      const evidence =
        buildHsppEvidence({
          sourceClass:
            "external_intelligence",

          sourceProvider:
            providerObservation.provider,

          sourceStream:
            providerObservation.sourceStream,

          sourceMessageId:
            providerObservation.providerMessageId,

          observedAt:
            providerObservation.observedAt,

          receivedAt:
            providerObservation.receivedAt,

          payloadSchemaVersion:
            providerObservation.payloadSchemaVersion,

          normalizedPayload:
            providerObservation.normalizedPayload,
        });

      const persistedEvidence =
        await persistHsppEvidenceForProviderObservation({
        supabase,
        organizationId,
        providerObservationId:
          providerObservation.id,
        evidence,
      });

      hsppAssessmentContexts[inputIndex] = {
        evidence,
        persistedEvidence,
      };
    }

    if (!trafficModelId) {
      console.warn(
        "[TomTom provider ingestion] Snapshot provenance skipped because TrafficModelID was not present."
      );
    } else if (!hasCompleteSnapshotAssertionIdentity) {
      console.warn(
        "[TomTom provider ingestion] Snapshot provenance skipped because at least one normalized incident is missing provider identity."
      );
    } else {
      const snapshotPersistence =
        await persistRouteSafetyProviderSnapshotRetrieval({
          supabase,
          organizationId,
          provider:
            "tomtom",
          sourceStream:
            "tomtom",
          snapshotIdentityKind:
            "traffic_model_id",
          snapshotIdentityValue:
            trafficModelId,
          providerSourceUpdatedAt:
            null,
          retrievalId,
          responseOriginatedAt,
          receivedAt,
          providerRequestId,
          assertions:
            snapshotAssertions,
        });

      if (
        snapshotPersistence.assertionCount !==
        snapshotAssertions.length
      ) {
        throw new Error(
          "TomTom provider snapshot persistence did not return one assertion per normalized incident."
        );
      }
    }

    const normalizedRows =
      normalizedIncidents.map(
        (item: {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          observedAt: string | null;
        }) => item.row
      );

    const roadContextEnrichment =

      await enrichRouteSafetyAlertsWithRoadContext(

        normalizedRows,

        resolveRoadContext

      );


    const rows = roadContextEnrichment.rows;

    const result = await insertNewProviderAlerts(
      supabase,
      organizationId,
      "tomtom",
      sourceConfiguration.baseConfidence,
      rows
    );

    if (
      result.resolutions.length !==
      rows.length
    ) {
      throw new Error(
        "TomTom Route Safety upsert did not return one resolution per input row."
      );
    }

    const staleBeforeMs =
      Date.now() -
      HSPP_PROVIDER_FRESHNESS_HOURS *
        60 * 60 * 1000;

    for (
      let inputIndex = 0;
      inputIndex < rows.length;
      inputIndex += 1
    ) {
      const context =
        hsppAssessmentContexts[inputIndex];

      if (!context) {
        continue;
      }

      const resolution =
        result.resolutions[inputIndex];

      if (
        !resolution ||
        resolution.inputIndex !== inputIndex
      ) {
        throw new Error(
          `TomTom Route Safety resolution index mismatch at ${inputIndex}.`
        );
      }

      const providerLastSeenValue =
        resolution.providerLastSeen[
          "tomtom"
        ];

      const providerLastSeenTime =
        new Date(
          String(providerLastSeenValue)
        ).getTime();

      const providerLastSeenValid =
        Number.isFinite(
          providerLastSeenTime
        );

      const providerObservationFresh =
        providerLastSeenValid &&
        providerLastSeenTime >=
          staleBeforeMs;

      const verification =
        verifyHsppEvidenceIntegrity({
          protocolVersion:
            context.evidence.protocolVersion,
          canonicalizationVersion:
            context.evidence
              .canonicalizationVersion,
          sourceClass:
            context.evidence.sourceClass,
          sourceProvider:
            context.evidence.sourceProvider,
          sourceStream:
            context.evidence.sourceStream,
          sourceMessageId:
            context.evidence.sourceMessageId,
          observedAt:
            context.evidence.observedAt,
          receivedAt:
            context.evidence.receivedAt,
          payloadSchemaVersion:
            context.evidence
              .payloadSchemaVersion,
          normalizedPayload:
            context.evidence
              .normalizedPayload,
          integrityAlgorithm:
            context.evidence
              .integrityAlgorithm,
          integrityFingerprint:
            context.evidence
              .integrityFingerprint,
          trustState:
            context.evidence.trustState,
          derivationLineage:
            context.evidence
              .derivationLineage,
        });

      const assessment =
        assessHsppExternalIntelligenceEvidence({
          verification,
          validationState:
            context.evidence
              .validationState,
          sourceClass:
            context.evidence.sourceClass,
          sourceProvider:
            context.evidence
              .sourceProvider,
          sourceKey:
            "tomtom",
          payloadSchemaVersion:
            context.evidence
              .payloadSchemaVersion,
          sourceEnabled:
            sourceConfiguration.enabled,
          sourceApprovedForIngestion:
            sourceConfiguration
              .approvedForIngestion,
          alertStatus:
            rows[inputIndex].status,
          providerSources:
            resolution.providerSources,
          providerConfirmationCount:
            resolution
              .providerConfirmationCount,
          providerConfidence:
            resolution.providerConfidence,
          providerObservationFresh,
          providerLastSeenValid,
        });

      await applyHsppAssessmentDecision({
        supabase,
        organizationId,
        evidenceId:
          context.persistedEvidence.id,
        integrityFingerprint:
          context.persistedEvidence
            .integrityFingerprint,
        assessment,
      });
    }

    return {
      provider: "tomtom",
      organizationId,
      success: true,
      rawCount: incidents.length,
      imported: result.imported,
      refreshedExisting: result.refreshedExisting,
      skippedDuplicates: result.skippedDuplicates,
      mergedDuplicates: result.mergedDuplicates,
      error: null,
    };
  } catch (error: unknown) {
    console.error("[TomTom provider ingestion]", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error || "TomTom incident ingestion failed.");

    return {
      provider: "tomtom",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: errorMessage,
    };
  }
}
