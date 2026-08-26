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
  assessHsppExternalIntelligenceEvidence,
  HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,
} from "@/lib/hspp/assessHsppExternalIntelligenceEvidence";
import { buildHsppEvidence } from "@/lib/hspp/buildHsppEvidence";
import { persistHsppEvidenceForProviderObservation } from "@/lib/hspp/persistHsppEvidenceForProviderObservation";
import { applyHsppAssessmentDecision } from "@/lib/hspp/applyHsppAssessmentDecision";
import { verifyHsppEvidenceIntegrity } from "@/lib/hspp/verifyHsppEvidenceIntegrity";

const HSPP_PROVIDER_FRESHNESS_HOURS = 48;

const AZURE_MAPS_SOURCE_KEY =
  "azure_maps_traffic";

const AZURE_MAPS_PROVIDER =
  "azure_maps";

const AZURE_MAPS_API_VERSION =
  "2025-01-01";

const DEFAULT_AZURE_MAPS_TRAFFIC_BBOX =
  "18.20,-34.10,19.10,-33.60";

type AzureMapsHsppAssessmentContext = {
  evidence: ReturnType<typeof buildHsppEvidence>;
  persistedEvidence: Awaited<
    ReturnType<
      typeof persistHsppEvidenceForProviderObservation
    >
  >;
} | null;

function mapAzureMapsType(
  incidentType: unknown,
  isRoadClosed: unknown
): RouteSafetyAlertRow["type"] {
  if (isRoadClosed === true) {
    return "road_closure";
  }

  const value =
    String(incidentType || "")
      .trim()
      .toLowerCase();

  if (value === "accident") {
    return "accident";
  }

  if (value === "congestion") {
    return "congestion";
  }

  if (value === "disabledvehicle") {
    return "vehicle_breakdown";
  }

  if (value === "roadhazard") {
    return "road_hazard";
  }

  if (value === "construction") {
    return "roadworks";
  }

  if (value === "weather") {
    return "weather_hazard";
  }

  return "road_hazard";
}

function mapAzureMapsSeverity(
  severity: unknown,
  isRoadClosed: unknown
): RouteSafetyAlertRow["severity"] {
  if (isRoadClosed === true) {
    return "critical";
  }

  const value =
    Number(severity);

  if (value >= 3) {
    return "high";
  }

  if (value === 2) {
    return "medium";
  }

  return "low";
}

function normalizeTimestamp(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const milliseconds =
    Date.parse(value);

  if (!Number.isFinite(milliseconds)) {
    return null;
  }

  return new Date(
    milliseconds
  ).toISOString();
}

function normalizeAzureMapsBbox(
  value: string
): string {
  const parts =
    value
      .split(",")
      .map((part) =>
        Number(part.trim())
      );

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isFinite(part)
    )
  ) {
    throw new Error(
      "AZURE_MAPS_TRAFFIC_BBOX must contain minLon,minLat,maxLon,maxLat."
    );
  }

  const [
    minLon,
    minLat,
    maxLon,
    maxLat,
  ] = parts;

  if (
    minLon < -180 ||
    maxLon > 180 ||
    minLat < -90 ||
    maxLat > 90 ||
    minLon >= maxLon ||
    minLat >= maxLat
  ) {
    throw new Error(
      "AZURE_MAPS_TRAFFIC_BBOX contains invalid geographic bounds."
    );
  }

  return [
    minLon,
    minLat,
    maxLon,
    maxLat,
  ].join(",");
}

function extractAzureFeatureIds(
  rawPayload: string
): string[] {
  const ids: string[] = [];

  const pattern =
    /"id"\s*:\s*(-?\d+)/g;

  let match:
    RegExpExecArray | null;

  while (
    (
      match =
        pattern.exec(rawPayload)
    ) !== null
  ) {
    ids.push(match[1]);
  }

  return ids;
}

export async function importAzureMapsIncidents(
  supabase: any,
  organizationId: string,
  getSourceConfiguration:
    IntelligenceSourceConfigurationLoader
): Promise<ProviderResult> {
  const sourceLookup =
    await getSourceConfiguration(
      supabase,
      AZURE_MAPS_SOURCE_KEY
    );

  if (!sourceLookup.configuration) {
    return {
      provider: AZURE_MAPS_PROVIDER,
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        sourceLookup.error ||
        "Azure Maps source configuration could not be loaded.",
    };
  }

  const sourceConfiguration =
    sourceLookup.configuration;

  if (
    !sourceConfiguration.enabled ||
    !sourceConfiguration.approvedForIngestion
  ) {
    console.info(
      "[Azure Maps provider ingestion] Skipped by intelligence source registry."
    );

    return {
      provider: AZURE_MAPS_PROVIDER,
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

  const subscriptionKey =
    process.env
      .AZURE_MAPS_SUBSCRIPTION_KEY
      ?.trim();

  if (!subscriptionKey) {
    return {
      provider: AZURE_MAPS_PROVIDER,
      organizationId,
      success: false,
      rawCount: 0,
      imported: 0,
      refreshedExisting: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      error:
        "AZURE_MAPS_SUBSCRIPTION_KEY is not configured.",
    };
  }

  try {
    const bbox =
      normalizeAzureMapsBbox(
        process.env.AZURE_MAPS_TRAFFIC_BBOX ||
          DEFAULT_AZURE_MAPS_TRAFFIC_BBOX
      );

    const url =
      "https://atlas.microsoft.com/traffic/incident" +
      `?api-version=${AZURE_MAPS_API_VERSION}` +
      `&bbox=${encodeURIComponent(bbox)}`;

    const response =
      await fetch(
        url,
        {
          cache: "no-store",
          headers: {
            "subscription-key":
              subscriptionKey,
            "Accept-Language":
              "en-GB",
          },
        }
      );

    const rawPayload =
      await response.text();

    let data: any;

    try {
      data =
        JSON.parse(rawPayload);
    } catch {
      throw new Error(
        "Azure Maps Traffic returned invalid JSON."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          data?.message ||
          "Azure Maps Traffic request failed."
      );
    }

    const features =
      Array.isArray(data?.features)
        ? data.features
        : [];

    const rawFeatureIds =
      extractAzureFeatureIds(
        rawPayload
      );

    const normalizedIncidents =
      features
        .map(
          (
            feature: any,
            featureIndex: number
          ): {
            row: RouteSafetyAlertRow;
            providerMessageId: string;
            observedAt: string | null;
          } | null => {
            const coordinates =
              feature?.geometry?.coordinates;

            const longitude =
              Number(
                coordinates?.[0]
              );

            const latitude =
              Number(
                coordinates?.[1]
              );

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude)
            ) {
              return null;
            }

            const properties =
              feature?.properties || {};

            const rawDescription =
              String(
                properties?.description ||
                  properties?.title ||
                  "Traffic incident reported"
              ).trim();

            const titleCandidate =
              String(
                properties?.title ||
                  rawDescription ||
                  "Azure Maps traffic incident"
              ).trim();

            const title =
              (
                titleCandidate ||
                "Azure Maps traffic incident"
              ).slice(
                0,
                120
              );

            const observedAt =
              normalizeTimestamp(
                properties?.lastModifiedTime
              ) ||
              normalizeTimestamp(
                properties?.startTime
              );

            const endTime =
              normalizeTimestamp(
                properties?.endTime
              );

            const providerMessageId =
              String(
                rawFeatureIds[
                  featureIndex
                ] ||
                  (
                    typeof feature?.id ===
                    "string"
                      ? feature.id.trim()
                      : Number.isSafeInteger(
                          feature?.id
                        )
                        ? String(
                            feature.id
                          )
                        : ""
                  )
              ).trim();

            const row:
              RouteSafetyAlertRow = {
                organization_id:
                  organizationId,

                type:
                  mapAzureMapsType(
                    properties?.incidentType,
                    properties?.isRoadClosed
                  ),

                title,

                description:
                  "Automatically imported from Azure Maps Traffic. " +
                  rawDescription,

                latitude,
                longitude,

                radius_meters:
                  1000,

                severity:
                  mapAzureMapsSeverity(
                    properties?.severity,
                    properties?.isRoadClosed
                  ),

                source:
                  AZURE_MAPS_SOURCE_KEY,

                status:
                  "active",

                expires_at:
                  endTime ||
                  new Date(
                    Date.now() +
                      2 *
                        60 *
                        60 *
                        1000
                  ).toISOString(),

                verified_at:
                  new Date()
                    .toISOString(),

                provider_geometry:
                  feature?.geometry ??
                  null,
              };

            return {
              row,
              providerMessageId,
              observedAt,
            };
          }
        )
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

    const hsppAssessmentContexts:
      AzureMapsHsppAssessmentContext[] =
        Array.from(
          {
            length:
              normalizedIncidents.length,
          },
          () => null
        );

    for (
      let inputIndex = 0;
      inputIndex <
      normalizedIncidents.length;
      inputIndex += 1
    ) {
      const normalized =
        normalizedIncidents[
          inputIndex
        ];

      if (
        !normalized.providerMessageId ||
        !normalized.observedAt
      ) {
        continue;
      }

      const providerObservation =
        await persistRouteSafetyProviderObservation({
          supabase,
          organizationId,

          provider:
            AZURE_MAPS_PROVIDER,

          sourceStream:
            AZURE_MAPS_SOURCE_KEY,

          providerMessageId:
            normalized.providerMessageId,

          observedAt:
            normalized.observedAt,

          payloadSchemaVersion:
            HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION,

          normalizedPayload:
            normalized.row as unknown as Record<
              string,
              unknown
            >,
        });

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

      hsppAssessmentContexts[
        inputIndex
      ] = {
        evidence,
        persistedEvidence,
      };
    }

    const normalizedRows =
      normalizedIncidents.map(
        (item: {
          row: RouteSafetyAlertRow;
          providerMessageId: string;
          observedAt: string | null;
        }) =>
          item.row
      );

    const roadContextEnrichment =
      await enrichRouteSafetyAlertsWithRoadContext(
        normalizedRows,
        resolveRoadContext
      );

    const rows =
      roadContextEnrichment.rows;

    const result =
      await insertNewProviderAlerts(
        supabase,
        organizationId,
        AZURE_MAPS_SOURCE_KEY,
        sourceConfiguration.baseConfidence,
        rows
      );

    if (
      result.resolutions.length !==
      rows.length
    ) {
      throw new Error(
        "Azure Maps Route Safety upsert did not return one resolution per input row."
      );
    }

    const nowMs =
      Date.now();

    const staleBeforeMs =
      nowMs -
      HSPP_PROVIDER_FRESHNESS_HOURS *
        60 *
        60 *
        1000;

    for (
      let inputIndex = 0;
      inputIndex <
      hsppAssessmentContexts.length;
      inputIndex += 1
    ) {
      const context =
        hsppAssessmentContexts[
          inputIndex
        ];

      if (!context) {
        continue;
      }

      const resolution =
        result.resolutions[
          inputIndex
        ];

      if (!resolution) {
        throw new Error(
          `Azure Maps Route Safety resolution is missing for input ${inputIndex}.`
        );
      }

      const providerLastSeenValue =
        resolution
          .providerLastSeen[
            AZURE_MAPS_SOURCE_KEY
          ];

      const providerLastSeenTime =
        new Date(
          String(
            providerLastSeenValue
          )
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
            context.evidence
              .protocolVersion,

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
            context.evidence
              .sourceClass,

          sourceProvider:
            context.evidence
              .sourceProvider,

          sourceKey:
            AZURE_MAPS_SOURCE_KEY,

          payloadSchemaVersion:
            context.evidence
              .payloadSchemaVersion,

          sourceEnabled:
            sourceConfiguration.enabled,

          sourceApprovedForIngestion:
            sourceConfiguration
              .approvedForIngestion,

          alertStatus:
            rows[
              inputIndex
            ].status,

          providerSources:
            resolution.providerSources,

          providerConfirmationCount:
            resolution
              .providerConfirmationCount,

          providerConfidence:
            resolution
              .providerConfidence,

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
      provider:
        AZURE_MAPS_PROVIDER,

      organizationId,

      success:
        true,

      rawCount:
        features.length,

      imported:
        result.imported,

      refreshedExisting:
        result.refreshedExisting,

      skippedDuplicates:
        result.skippedDuplicates,

      mergedDuplicates:
        result.mergedDuplicates,

      error:
        null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Azure Maps Traffic error.";

    console.error(
      "[Azure Maps provider ingestion]",
      message
    );

    return {
      provider:
        AZURE_MAPS_PROVIDER,

      organizationId,

      success:
        false,

      rawCount:
        0,

      imported:
        0,

      refreshedExisting:
        0,

      skippedDuplicates:
        0,

      mergedDuplicates:
        0,

      error:
        message,
    };
  }
}
