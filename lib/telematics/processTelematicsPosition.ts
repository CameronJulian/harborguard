import {
  processVehicleLocationUpdate,
  type ProcessVehicleLocationUpdateResult,
} from "@/lib/fleet/processVehicleLocationUpdate";

import {
  buildHsppEvidence,
} from "@/lib/hspp/buildHsppEvidence";

import {
  persistHsppEvidence,
} from "@/lib/hspp/persistHsppEvidence";

import {
  assessHsppTraccarEvidence,
} from "@/lib/hspp/assessHsppTraccarEvidence";

import {
  applyHsppAssessmentDecision,
} from "@/lib/hspp/applyHsppAssessmentDecision";

import {
  verifyHsppEvidenceIntegrity,
} from "@/lib/hspp/verifyHsppEvidenceIntegrity";

import {
  claimTelematicsMessage,
  completeTelematicsMessage,
  failTelematicsMessage,
} from "@/lib/telematics/messageReceiptLifecycle";

import {
  resolveVehicleForProviderDevice,
} from "@/lib/telematics/resolveVehicleForProviderDevice";

export type NormalizedTelematicsPosition = {
  providerMessageId: string;
  providerDeviceId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  recordedAt: string;
};

export type ProcessTelematicsPositionInput = {
  supabase: any;
  organizationId: string;
  provider: string;
  stream: string;
  position: NormalizedTelematicsPosition;
};

export type ProcessTelematicsPositionResult =
  | {
      ok: false;
      errorType:
        | "vehicle_not_found"
        | "ambiguous_device"
        | "location_processing";
      error: string;
    }
  | {
      ok: true;
      skipped: "duplicate" | "processing";
      receiptId: string;
    }
  | {
      ok: true;
      skipped: "jitter" | "gps_spike" | null;
      receiptId: string;
      vehicleId: string;
      processingResult: ProcessVehicleLocationUpdateResult;
    };

function errorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Telematics location processing failed.";
}

export async function processTelematicsPosition({
  supabase,
  organizationId,
  provider,
  stream,
  position,
}: ProcessTelematicsPositionInput): Promise<ProcessTelematicsPositionResult> {
  const resolved =
    await resolveVehicleForProviderDevice({
      supabase,
      organizationId,
      providerDeviceId:
        position.providerDeviceId,
    });

  if (!resolved.ok) {
    return {
      ok: false,
      errorType: resolved.errorType,
      error: resolved.error,
    };
  }

  const claim =
    await claimTelematicsMessage({
      supabase,
      organizationId,
      provider,
      stream,
      providerMessageId:
        position.providerMessageId,
      metadata: {
        providerDeviceId:
          position.providerDeviceId,
        vehicleId:
          resolved.vehicle.id,
        recordedAt:
          position.recordedAt,
      },
    });

  if (!claim.claimed) {
    return {
      ok: true,
      skipped:
        claim.processingStatus === "processed"
          ? "duplicate"
          : "processing",
      receiptId:
        claim.receiptId,
    };
  }

  try {
    const hsppEvidence =
      buildHsppEvidence({
        sourceClass: "telematics",
        sourceProvider: provider,
        sourceStream: stream,
        sourceMessageId:
          position.providerMessageId,
        observedAt:
          position.recordedAt,
        payloadSchemaVersion:
          "normalized-telematics-position-v1",
        normalizedPayload: {
          providerDeviceId:
            position.providerDeviceId,
          vehicleId:
            resolved.vehicle.id,
          latitude:
            position.latitude,
          longitude:
            position.longitude,
          speedKmh:
            position.speedKmh,
          heading:
            position.heading,
          recordedAt:
            position.recordedAt,
        },
      });

    const persistedHsppEvidence =
      await persistHsppEvidence({
        supabase,
        organizationId,
        evidence:
          hsppEvidence,
        telematicsReceiptId:
          claim.receiptId,
        vehicleId:
          resolved.vehicle.id,
        tripId:
          null,
      });

    const result =
      await processVehicleLocationUpdate({
        supabase,
        organizationId,
        location: {
          vehicleId:
            resolved.vehicle.id,
          tripId: null,
          latitude:
            position.latitude,
          longitude:
            position.longitude,
          speedKmh:
            position.speedKmh,
          heading:
            position.heading,
          source: "hardware",
          recordedAt:
            position.recordedAt,
        },
      });

    const hsppVerification =
      verifyHsppEvidenceIntegrity({
        protocolVersion:
          hsppEvidence.protocolVersion,

        canonicalizationVersion:
          hsppEvidence.canonicalizationVersion,

        sourceClass:
          hsppEvidence.sourceClass,

        sourceProvider:
          hsppEvidence.sourceProvider,

        sourceStream:
          hsppEvidence.sourceStream,

        sourceMessageId:
          hsppEvidence.sourceMessageId,

        observedAt:
          hsppEvidence.observedAt,

        receivedAt:
          hsppEvidence.receivedAt,

        payloadSchemaVersion:
          hsppEvidence.payloadSchemaVersion,

        normalizedPayload:
          hsppEvidence.normalizedPayload,

        integrityAlgorithm:
          hsppEvidence.integrityAlgorithm,

        integrityFingerprint:
          hsppEvidence.integrityFingerprint,

        trustState:
          hsppEvidence.trustState,

        derivationLineage:
          hsppEvidence.derivationLineage,
      });

    const processingOutcome =
      !result.ok
        ? "failed"
        : result.skipped === "gps_spike"
          ? "gps_spike"
          : result.skipped === "jitter"
            ? "jitter"
            : "accepted";

    const hsppAssessment =
      assessHsppTraccarEvidence({
        verification:
          hsppVerification,

        validationState:
          hsppEvidence.validationState,

        sourceClass:
          hsppEvidence.sourceClass,

        sourceProvider:
          hsppEvidence.sourceProvider,

        payloadSchemaVersion:
          hsppEvidence.payloadSchemaVersion,

        processingOutcome,
      });

    await applyHsppAssessmentDecision({
      supabase,
      organizationId,
      evidenceId:
        persistedHsppEvidence.id,
      integrityFingerprint:
        persistedHsppEvidence.integrityFingerprint,
      assessment:
        hsppAssessment,
    });

    if (!result.ok) {
      await failTelematicsMessage({
        supabase,
        receiptId:
          claim.receiptId,
        attemptCount:
          claim.attemptCount,
        failureMessage:
          result.error,
      });

      return {
        ok: false,
        errorType:
          "location_processing",
        error:
          result.error,
      };
    }

    await completeTelematicsMessage({
      supabase,
      receiptId:
        claim.receiptId,
      attemptCount:
        claim.attemptCount,
    });

    return {
      ok: true,
      skipped:
        result.skipped,
      receiptId:
        claim.receiptId,
      vehicleId:
        resolved.vehicle.id,
      processingResult:
        result,
    };
  }
  catch (error) {
    const message =
      errorMessage(error);

    try {
      await failTelematicsMessage({
        supabase,
        receiptId:
          claim.receiptId,
        attemptCount:
          claim.attemptCount,
        failureMessage:
          message,
      });
    }
    catch (finalizationError) {
      throw new AggregateError(
        [
          error,
          finalizationError,
        ],
        "Telematics processing failed and the receipt could not be marked failed."
      );
    }

    throw error;
  }
}
