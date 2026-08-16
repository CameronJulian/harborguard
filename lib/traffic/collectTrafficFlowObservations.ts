import {
  getHereTrafficFlow,
} from "@/lib/here/traffic";
import {
  persistTrafficFlowObservations,
} from "@/lib/traffic/persistTrafficFlowObservations";
import {
  resolveTrafficFlowCollectionScope,
} from "@/lib/traffic/resolveTrafficFlowCollectionScope";

export type CollectTrafficFlowObservationsResult = {
  scopeResolved: boolean;
  sourceVehicleId: string | null;
  sourceRecordedAt: string | null;
  received: number;
  persisted: number;
  skippedWithoutProviderSegmentId: number;
};

export async function collectTrafficFlowObservations(
  supabase: any,
  organizationId: string,
  collectionKey: string | null = null
): Promise<CollectTrafficFlowObservationsResult> {
  const normalizedOrganizationId =
    organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new Error(
      "organizationId is required to collect traffic-flow observations."
    );
  }

  const scope =
    await resolveTrafficFlowCollectionScope(
      supabase,
      normalizedOrganizationId
    );

  if (!scope) {
    return {
      scopeResolved: false,
      sourceVehicleId: null,
      sourceRecordedAt: null,
      received: 0,
      persisted: 0,
      skippedWithoutProviderSegmentId: 0,
    };
  }

  const observedAt =
    new Date().toISOString();

  const trafficFlow =
    await getHereTrafficFlow({
      latitude: scope.latitude,
      longitude: scope.longitude,
      radiusMeters: scope.radiusMeters,
    });

  const persistence =
    await persistTrafficFlowObservations(
      supabase,
      normalizedOrganizationId,
      trafficFlow.flow,
      observedAt,
      collectionKey,
      {
        latitude: scope.latitude,
        longitude: scope.longitude,
        radiusMeters: scope.radiusMeters,
      }
    );

  return {
    scopeResolved: true,
    sourceVehicleId: scope.sourceVehicleId,
    sourceRecordedAt: scope.sourceRecordedAt,
    ...persistence,
  };
}
