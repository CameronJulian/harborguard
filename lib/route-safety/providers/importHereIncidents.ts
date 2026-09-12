import { randomUUID } from "node:crypto";
import type {
  IntelligenceSourceConfigurationLoader,
} from "@/lib/route-safety/providers/getIntelligenceSourceConfiguration";
import {
  persistRouteSafetyProviderSnapshotRetrieval,
  type RouteSafetyProviderSnapshotAssertionInput,
} from "@/lib/route-safety/providers/persistRouteSafetyProviderSnapshotRetrieval";
import type { ProviderResult } from "@/lib/route-safety/providers/types";
import type { RouteSafetyAlertRow } from "@/lib/route-safety/types";
import { insertNewProviderAlerts } from "@/lib/route-safety/upsertRouteSafetyAlerts";
import { enrichRouteSafetyAlertsWithRoadContext } from "@/lib/route-safety/enrichRouteSafetyAlertsWithRoadContext";
import { resolveRoadContext } from "@/lib/road-context/provider";
import {
  persistRouteSafetyProviderObservation,
  prefetchRouteSafetyProviderObservations,
} from "@/lib/hspp/persistRouteSafetyProviderObservation";
import { buildHsppEvidence } from "@/lib/hspp/buildHsppEvidence";
import {
  persistHsppEvidenceForProviderObservation,
  prefetchHsppEvidenceForProviderObservations,
} from "@/lib/hspp/persistHsppEvidenceForProviderObservation";
import {
  assessHsppExternalIntelligenceEvidence,
  HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
} from "@/lib/hspp/assessHsppExternalIntelligenceEvidence";
import {
  applyHsppAssessmentDecisionsBatch,
  type ApplyHsppAssessmentDecisionBatchItem,
} from "@/lib/hspp/applyHsppAssessmentDecisionsBatch";
import { verifyHsppEvidenceIntegrity } from "@/lib/hspp/verifyHsppEvidenceIntegrity";



const HSPP_PROVIDER_FRESHNESS_HOURS = 48;

const HERE_ROAD_CONTEXT_TIMEOUT_MS = 2_000;

type HereHsppAssessmentContext = {
  evidence: ReturnType<typeof buildHsppEvidence>;
  persistedEvidence: Awaited<
    ReturnType<
      typeof persistHsppEvidenceForProviderObservation
    >
  >;
} | null;

function mapHereSeverity(criticality?: string) {
  const value = String(criticality || "").toLowerCase();

  if (value.includes("critical") || value.includes("major")) {
    return "critical";
  }

  if (value.includes("high")) {
    return "high";
  }

  if (value.includes("medium")) {
    return "medium";
  }

  return "low";
}

function mapHereType(description: string) {
  const text = description.toLowerCase();

  if (text.includes("traffic light") || text.includes("signal")) {
    return "traffic_light_outage";
  }

  if (
    text.includes("accident") ||
    text.includes("crash") ||
    text.includes("collision")
  ) {
    return "accident";
  }

  if (text.includes("protest")) {
    return "protest";
  }

  if (
    text.includes("road construction") ||
    text.includes("roadworks") ||
    text.includes("road works")
  ) {
    return "roadworks";
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

  if (
    text.includes("road closed") ||
    text.includes("closed ahead") ||
    text.includes("closed") ||
    text.includes("closure")
  ) {
    return "road_closure";
  }

  if (text.includes("roadblock")) {
    return "roadblock";
  }

  return "road_hazard";
}

function getHereLatLng(incident: any) {
  const shapePoint =
    incident?.location?.shape?.links?.[0]?.points?.[0];

  if (
    Number.isFinite(Number(shapePoint?.lat)) &&
    Number.isFinite(Number(shapePoint?.lng))
  ) {
    return {
      latitude: Number(shapePoint.lat),
      longitude: Number(shapePoint.lng),
    };
  }

  const polylinePoint =
    incident?.location?.polyline?.points?.[0];

  if (
    Number.isFinite(Number(polylinePoint?.lat)) &&
    Number.isFinite(Number(polylinePoint?.lng))
  ) {
    return {
      latitude: Number(polylinePoint.lat),
      longitude: Number(polylinePoint.lng),
    };
  }

  return null;
}

export async function importHereIncidents(
  supabase: any,
  organizationId: string,
  getSourceConfiguration: IntelligenceSourceConfigurationLoader
): Promise<ProviderResult> {
  const importStartedAt = Date.now();

  const logHereTiming = (
    stage: string,
    startedAt: number,
    count?: number
  ) => {
    console.info(
      "[HERE provider timing]",
      {
        stage,
        durationMs:
          Date.now() - startedAt,
        ...(typeof count === "number"
          ? { count }
          : {}),
      }
    );
  };

  const sourceConfigStartedAt =
    Date.now();

  const sourceLookup =
    await getSourceConfiguration(
      supabase,
      "here_traffic"
    );

  logHereTiming(
    "source-config",
    sourceConfigStartedAt
  );

  if (!sourceLookup.configuration) {
    return {
      provider: "here",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        sourceLookup.error ||
        "HERE source configuration could not be loaded.",
    };
  }

  const sourceConfiguration =
    sourceLookup.configuration;

  if (
    !sourceConfiguration.enabled ||
    !sourceConfiguration.approvedForIngestion
  ) {
    console.info(
      "[HERE provider ingestion] Skipped by intelligence source registry."
    );

    return {
      provider: "here",
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

  if (!process.env.HERE_API_KEY) {
    return {
      provider: "here",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error: "HERE_API_KEY is not configured.",
    };
  }

  try {
    const latitude = Number(
      process.env.TRAFFIC_CENTER_LATITUDE || -33.9249
    );

    const longitude = Number(
      process.env.TRAFFIC_CENTER_LONGITUDE || 18.4241
    );

    const radiusMeters = Number(
      process.env.TRAFFIC_IMPORT_RADIUS_METERS || 25000
    );

    const url =
      "https://data.traffic.hereapi.com/v7/incidents" +
      `?in=circle:${latitude},${longitude};r=${radiusMeters}` +
      "&locationReferencing=shape" +
      `&apikey=${process.env.HERE_API_KEY}`;

    const fetchStartedAt =
      Date.now();

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    logHereTiming(
      "fetch",
      fetchStartedAt
    );

    const receivedAt =
      new Date().toISOString();

    const retrievalId =
      randomUUID();

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
        .get("X-Request-Id")
        ?.trim() || "";

    const providerRequestId =
      providerRequestIdCandidate ||
      null;

    const responseJsonStartedAt =
      Date.now();

    const data = await response.json();

    logHereTiming(
      "response-json",
      responseJsonStartedAt
    );

    if (!response.ok) {
      const upstreamMessage =
        data?.title ||
        data?.error ||
        response.statusText ||
        "HERE Traffic request failed.";

      console.error(
        "[HERE provider upstream failure]",
        {
          stage: "fetch",
          httpStatus: response.status,
          statusText: response.statusText,
          message: upstreamMessage,
        }
      );

      throw new Error(
        `HERE Traffic request failed with HTTP ${response.status}: ${upstreamMessage}`
      );
    }

    const incidents = Array.isArray(data?.results)
      ? data.results
      : [];

    const sourceUpdatedCandidate =
      typeof data?.sourceUpdated === "string"
        ? data.sourceUpdated.trim()
        : "";

    const sourceUpdatedMilliseconds =
      Date.parse(
        sourceUpdatedCandidate
      );

    const sourceUpdatedAt =
      sourceUpdatedCandidate &&
      Number.isFinite(
        sourceUpdatedMilliseconds
      )
        ? new Date(
            sourceUpdatedMilliseconds
          ).toISOString()
        : null;

    const normalizedIncidents = incidents
      .map((incident: any) => {
        const details =
          incident?.incidentDetails || {};

        const description =
          String(
            details?.description?.value ||
              details?.summary?.value ||
              details?.type ||
              "HERE traffic incident"
          );

        const coordinates =
          getHereLatLng(incident);

        if (!coordinates) {
          return null;
        }

        const firstLink =
          incident?.location?.shape?.links?.[0] ??
          incident?.location?.polyline?.links?.[0];

        const roadName =
          firstLink?.name ??
          firstLink?.roadName ??
          details?.roadName ??
          null;

        const row: RouteSafetyAlertRow = {
          organization_id:
            organizationId,
          type:
            mapHereType(description),
          title:
            description.slice(0, 120),
          description,
          latitude:
            coordinates.latitude,
          longitude:
            coordinates.longitude,
          radius_meters:
            1000,
          severity:
            mapHereSeverity(
              details?.criticality
            ),
          source:
            "here_traffic",
          status:
            "active",
          expires_at:
            details?.endTime || null,
          verified_at:
            new Date().toISOString(),
          road_name:
            roadName,
          road_from:
            null,
          road_to:
            null,
          provider_geometry:
            incident?.location?.shape ??
            incident?.location?.polyline ??
            null,
        };

        const providerOriginalId =
          typeof details?.originalId === "string"
            ? details.originalId.trim()
            : "";

        const providerIncidentId =
          typeof details?.id === "string"
            ? details.id.trim()
            : providerOriginalId;

        const observedAtCandidate =
          typeof details?.entryTime === "string"
            ? details.entryTime
            : typeof details?.startTime === "string"
              ? details.startTime
              : "";

        const observedAt =
          observedAtCandidate &&
          Number.isFinite(
            Date.parse(observedAtCandidate)
          )
            ? new Date(
                Date.parse(
                  observedAtCandidate
                )
              ).toISOString()
            : null;

        const providerMessageId =
          providerIncidentId && observedAt
            ? `${providerIncidentId}@${observedAt}`
            : "";

        return {
          row,
          providerMessageId,
          providerIncidentId,
          providerOriginalId,
          observedAt,
        };
      })
      .filter(
        (
          item: {
            row: RouteSafetyAlertRow;
            providerMessageId: string;
            providerIncidentId: string;
            providerOriginalId: string;
            observedAt: string | null;
          } | null
        ): item is {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          providerIncidentId: string;
          providerOriginalId: string;
          observedAt: string | null;
        } =>
          item !== null
      );

    const providerIdCounts =
      new Map<string, number>();

    for (const normalized of normalizedIncidents) {
      if (!normalized.providerMessageId) {
        continue;
      }

      providerIdCounts.set(
        normalized.providerMessageId,
        (providerIdCounts.get(
          normalized.providerMessageId
        ) ?? 0) + 1
      );
    }

    const duplicateProviderIdGroups =
      Array.from(
        providerIdCounts.values()
      ).filter(
        (count) =>
          count > 1
      ).length;

    const completeObservationIdentityCount =
      normalizedIncidents.filter(
        (normalized: {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          observedAt: string | null;
        }) =>
          Boolean(
            normalized.providerMessageId &&
              normalized.observedAt
          )
      ).length;

    console.info(
      "[HERE provider diagnostic]",
      {
        stage:
          "normalized",
        httpStatus:
          response.status,
        rawCount:
          incidents.length,
        normalizedCount:
          normalizedIncidents.length,
        uniqueProviderIds:
          providerIdCounts.size,
        duplicateProviderIdGroups,
        completeObservationIdentityCount,
        sourceUpdatedPresent:
          Boolean(sourceUpdatedAt),
      }
    );

    const snapshotAssertions:
      RouteSafetyProviderSnapshotAssertionInput[] =
        normalizedIncidents.map(
          (normalized: {
            row: RouteSafetyAlertRow;
            providerMessageId: string;
            providerIncidentId: string;
            providerOriginalId: string;
            observedAt: string | null;
          }) => {
            const immutableSnapshotPayload:
              Record<string, unknown> = {
                ...(
                  normalized.row as unknown as
                    Record<string, unknown>
                ),
              };

            delete immutableSnapshotPayload.verified_at;
            delete immutableSnapshotPayload.expires_at;

            if (normalized.providerOriginalId) {
              immutableSnapshotPayload.here_original_id =
                normalized.providerOriginalId;
            }

            immutableSnapshotPayload.here_incident_id =
              normalized.providerIncidentId;

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
                immutableSnapshotPayload,
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
      HereHsppAssessmentContext[] =
        Array.from(
          {
            length:
              normalizedIncidents.length,
          },
          () => null
        );

    const prefetchedProviderObservations =
      await prefetchRouteSafetyProviderObservations({
        supabase,
        organizationId,
        provider:
          "here",
        sourceStream:
          "here_traffic",
        payloadSchemaVersion:
          HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
        observations:
          normalizedIncidents
            .filter(
              (normalized: {
                row: RouteSafetyAlertRow;
                providerMessageId: string;
                providerIncidentId: string;
                providerOriginalId: string;
                observedAt: string | null;
              }) =>
                Boolean(
                  normalized.providerMessageId &&
                    normalized.observedAt
                )
            )
            .map(
              (normalized: {
                row: RouteSafetyAlertRow;
                providerMessageId: string;
                providerIncidentId: string;
                providerOriginalId: string;
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

                if (normalized.providerOriginalId) {
                  immutableNormalizedPayload.here_original_id =
                    normalized.providerOriginalId;
                }

                immutableNormalizedPayload.here_incident_id =
                  normalized.providerIncidentId;

                return {
                  providerMessageId:
                    normalized.providerMessageId,
                  observedAt:
                    normalized.observedAt as string,
                  normalizedPayload:
                    immutableNormalizedPayload,
                };
              }
            ),
      });

    console.info(
      "[HERE provider diagnostic]",
      {
        stage:
          "provider-observation-prefetch",
        requested:
          completeObservationIdentityCount,
        found:
          prefetchedProviderObservations.size,
      }
    );

    let persistedProviderObservationCount =
      0;

    const observationEvidenceStartedAt =
      Date.now();
    const prefetchedEvidence =
      await prefetchHsppEvidenceForProviderObservations({
        supabase,
        organizationId,
        providerObservationIds:
          Array.from(
            prefetchedProviderObservations.values()
          ).map(
            (observation) =>
              observation.id
          ),
      });

    console.info(
      "[HERE provider diagnostic]",
      {
        stage:
          "hspp-evidence-prefetch",
        requested:
          prefetchedProviderObservations.size,
        found:
          prefetchedEvidence.size,
      }
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

      const immutableNormalizedPayload:
        Record<string, unknown> = {
          ...(
            normalized.row as unknown as
              Record<string, unknown>
          ),
        };

      delete immutableNormalizedPayload.verified_at;

      if (normalized.providerOriginalId) {
        immutableNormalizedPayload.here_original_id =
          normalized.providerOriginalId;
      }

      immutableNormalizedPayload.here_incident_id =
        normalized.providerIncidentId;

      let providerObservation:
        Awaited<
          ReturnType<
            typeof persistRouteSafetyProviderObservation
          >
        >;

      try {
        providerObservation =
          prefetchedProviderObservations.get(
            normalized.providerMessageId
          ) ??
          await persistRouteSafetyProviderObservation({
            supabase,
            organizationId,
            provider:
              "here",
            sourceStream:
              "here_traffic",
            providerMessageId:
              normalized.providerMessageId,
            observedAt:
              normalized.observedAt,
            payloadSchemaVersion:
              HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2,
            normalizedPayload:
              immutableNormalizedPayload,
          });
      } catch (error) {
        console.error(
          "[HERE provider diagnostic]",
          {
            stage:
              "provider-observation-error",
            inputIndex,
            normalizedCount:
              normalizedIncidents.length,
            persistedBeforeFailure:
              persistedProviderObservationCount,
            hasProviderMessageId:
              Boolean(
                normalized.providerMessageId
              ),
            hasObservedAt:
              Boolean(
                normalized.observedAt
              ),
            errorClass:
              error instanceof Error
                ? error.name
                : typeof error,
          }
        );

        throw error;
      }

      persistedProviderObservationCount +=
        1;

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

      const prefetchedExistingEvidence =
        prefetchedEvidence.get(
          providerObservation.id
        );

      const persistedEvidence =
        prefetchedExistingEvidence
          ? (() => {
              if (
                prefetchedExistingEvidence.integrityFingerprint !==
                evidence.integrityFingerprint
              ) {
                throw new Error(
                  "Existing HSPP evidence does not match the provider observation evidence being persisted."
                );
              }

              return {
                ...prefetchedExistingEvidence,
                created:
                  false,
              };
            })()
          : await persistHsppEvidenceForProviderObservation({
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

    logHereTiming(
      "observation-evidence-persistence",
      observationEvidenceStartedAt,
      persistedProviderObservationCount
    );

    if (!sourceUpdatedAt) {
      console.warn(
        "[HERE provider ingestion] Snapshot provenance skipped because sourceUpdated was not present or invalid."
      );
    } else if (!hasCompleteSnapshotAssertionIdentity) {
      console.warn(
        "[HERE provider ingestion] Snapshot provenance skipped because at least one normalized incident is missing provider identity."
      );
    } else {
      const snapshotStartedAt =
        Date.now();

      const snapshotPersistence =
        await persistRouteSafetyProviderSnapshotRetrieval({
          supabase,
          organizationId,
          provider:
            "here",
          sourceStream:
            "here_traffic",
          snapshotIdentityKind:
            "source_updated",
          snapshotIdentityValue:
            sourceUpdatedCandidate,
          providerSourceUpdatedAt:
            sourceUpdatedAt,
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
          "HERE provider snapshot persistence did not return one assertion per normalized incident."
        );
      }

      logHereTiming(
        "snapshot-persistence",
        snapshotStartedAt,
        snapshotAssertions.length
      );
    }

    const normalizedRows =
      normalizedIncidents.map(
        (item: {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          observedAt: string | null;
        }) => item.row
      );
    const roadContextStartedAt =
      Date.now();

    const roadContextEnrichment =

      await enrichRouteSafetyAlertsWithRoadContext(

        normalizedRows,

        (params) =>
          resolveRoadContext({
            ...params,
            timeoutMs:
              HERE_ROAD_CONTEXT_TIMEOUT_MS,
          }),
        {
          maxLookups: 1,
        }

      );

    logHereTiming(
      "road-context",
      roadContextStartedAt,
      normalizedRows.length
    );


    const rows = roadContextEnrichment.rows;

    const alertUpsertStartedAt =
      Date.now();

    const result = await insertNewProviderAlerts(
      supabase,
      organizationId,
      "here_traffic",
      sourceConfiguration.baseConfidence,
      rows
    );

    logHereTiming(
      "insert-alerts",
      alertUpsertStartedAt,
      rows.length
    );

    if (
      result.resolutions.length !==
      rows.length
    ) {
      throw new Error(
        "HERE Route Safety upsert did not return one resolution per input row."
      );
    }

    const staleBeforeMs =
      Date.now() -
      HSPP_PROVIDER_FRESHNESS_HOURS *
        60 * 60 * 1000;

    const assessmentStartedAt =
      Date.now();

    const assessmentDecisions:
      ApplyHsppAssessmentDecisionBatchItem[] =
        [];

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
          `HERE Route Safety resolution index mismatch at ${inputIndex}.`
        );
      }

      const providerLastSeenValue =
        resolution.providerLastSeen[
          "here_traffic"
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
            "here_traffic",
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

      assessmentDecisions.push({
        evidenceId:
          context.persistedEvidence.id,
        integrityFingerprint:
          context.persistedEvidence
            .integrityFingerprint,
        assessment,
        assessedAt:
          new Date().toISOString(),
      });
    }
    await applyHsppAssessmentDecisionsBatch({
      supabase,
      organizationId,
      decisions:
        assessmentDecisions,
    });

    const assessmentCount =
      assessmentDecisions.length;

    logHereTiming(
      "apply-hspp-assessment",
      assessmentStartedAt,
      assessmentCount
    );

    logHereTiming(
      "total",
      importStartedAt,
      normalizedIncidents.length
    );

    return {
      provider: "here",
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
    return {
      provider: "here",
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        error instanceof Error
          ? error.message
          : "HERE incident ingestion failed.",
    };
  }
}
