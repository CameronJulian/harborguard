import type {
  ReadAndVerifyHsppEvidenceResult,
} from "@/lib/hspp/readAndVerifyHsppEvidence";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";


export const HSPP_POST_POSITIVE_REVALIDATION_EVALUATOR_VERSION =
  "hspp-post-positive-revalidation-evaluator-v1" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_POLICY_VERSION =
  "hspp-post-positive-member-unsuitability-v2" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_PERSISTENCE_REASON =
  "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS =
  "derived" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER =
  "harborguard" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM =
  "post-positive-revalidation" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION =
  "hspp-post-positive-revalidation-v1" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE =
  "post_positive_revalidation" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION =
  "hspp-post-positive-revalidation-v1" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_DECISION =
  "UNSUITABLE_FOR_DESCENDANT_COMPOSITION" as const;


export type HsppPostPositiveRevalidationEvaluationState =
  | "QUALIFYING_UNSUITABILITY_BASIS"
  | "NON_QUALIFYING_REVALIDATION";


export type HsppPostPositiveRevalidationEvaluationReason =
  | "R1_UNSUITABILITY_BASIS_CONFIRMED"
  | "R1_EVIDENCE_NOT_FOUND"
  | "R1_ORGANIZATION_MISMATCH"
  | "R1_INTEGRITY_NOT_VERIFIED"
  | "R1_SOURCE_IDENTITY_MISMATCH"
  | "R1_PAYLOAD_SCHEMA_MISMATCH"
  | "R1_LINEAGE_MISMATCH"
  | "R1_NOT_POST_POSITIVE"
  | "R1_PAYLOAD_SHAPE_INVALID"
  | "R1_PAYLOAD_SUBJECT_MISMATCH"
  | "R1_PAYLOAD_DECISION_MISMATCH";


export type EvaluateHsppPostPositiveRevalidationEvidenceInput = {
  workItem:
    HsppPostPositiveLifecycleWorkItem;

  revalidationEvidence:
    ReadAndVerifyHsppEvidenceResult;
};


export type HsppPostPositiveRevalidationEvaluation = {
  evaluatorVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_EVALUATOR_VERSION;

  policyVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_POLICY_VERSION;

  persistenceReason:
    typeof HSPP_POST_POSITIVE_REVALIDATION_PERSISTENCE_REASON;

  state:
    HsppPostPositiveRevalidationEvaluationState;

  reason:
    HsppPostPositiveRevalidationEvaluationReason;

  qualifiesUnsuitability:
    boolean;

  organizationId:
    string;

  assemblyId:
    string;

  positiveCheckpointId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  revalidationEvidenceId:
    string | null;

  revalidationIntegrityFingerprint:
    string | null;

  observedAt:
    string | null;
};


function requireNonBlank(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${label} must be a non-blank string.`,
    );
  }

  return value.trim();
}


function requireFingerprint(
  value: unknown,
  label: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      label,
    );

  if (
    !/^[a-f0-9]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `${label} must be an exact lowercase SHA-256 hexadecimal fingerprint.`,
    );
  }

  return normalized;
}


function requireIsoTimestamp(
  value: unknown,
  label: string,
): {
  value: string;
  epochMs: number;
} {
  const normalized =
    requireNonBlank(
      value,
      label,
    );

  const epochMs =
    Date.parse(
      normalized,
    );

  if (!Number.isFinite(epochMs)) {
    throw new Error(
      `${label} must be a valid ISO timestamp.`,
    );
  }

  return {
    value:
      normalized,

    epochMs,
  };
}


function sameIdentity(
  left: string,
  right: string,
): boolean {
  return (
    left.toLowerCase() ===
    right.toLowerCase()
  );
}


function buildEvaluation(
  workItem: HsppPostPositiveLifecycleWorkItem,
  state: HsppPostPositiveRevalidationEvaluationState,
  reason: HsppPostPositiveRevalidationEvaluationReason,
  revalidationEvidenceId: string | null,
  revalidationIntegrityFingerprint: string | null,
  observedAt: string | null,
): HsppPostPositiveRevalidationEvaluation {
  return {
    evaluatorVersion:
      HSPP_POST_POSITIVE_REVALIDATION_EVALUATOR_VERSION,

    policyVersion:
      HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_POLICY_VERSION,

    persistenceReason:
      HSPP_POST_POSITIVE_REVALIDATION_PERSISTENCE_REASON,

    state,

    reason,

    qualifiesUnsuitability:
      state ===
      "QUALIFYING_UNSUITABILITY_BASIS",

    organizationId:
      workItem.organizationId,

    assemblyId:
      workItem.assemblyId,

    positiveCheckpointId:
      workItem.positiveCheckpointId,

    evidenceId:
      workItem.evidenceId,

    integrityFingerprint:
      workItem.integrityFingerprint,

    revalidationEvidenceId,

    revalidationIntegrityFingerprint,

    observedAt,
  };
}


function readPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value =
    payload[key];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}


/**
 * Pure semantic evaluation of one later immutable R1 evidence row.
 *
 * R1 is not historical C and does not mutate historical C.
 *
 * A qualifying R1 must:
 *
 * - independently pass HSPP integrity verification;
 * - use the canonical HarborGuard post-positive revalidation source;
 * - use the canonical immutable R1 derivation lineage;
 * - be lineage-bound to the exact historical positive C identity;
 * - be observed at or after the exact prior positive checkpoint;
 * - use the exact R1 payload schema;
 * - bind its payload to H1, Q14p and C;
 * - explicitly commit to unsuitability policy v2;
 * - explicitly conclude UNSUITABLE_FOR_DESCENDANT_COMPOSITION.
 *
 * This function performs no I/O and grants no persistence authority.
 */
export function evaluateHsppPostPositiveRevalidationEvidence({
  workItem,
  revalidationEvidence,
}: EvaluateHsppPostPositiveRevalidationEvidenceInput): HsppPostPositiveRevalidationEvaluation {
  if (
    !workItem ||
    typeof workItem !== "object"
  ) {
    throw new Error(
      "Post-positive lifecycle work item is required.",
    );
  }


  if (
    workItem.workState !==
    "REEVALUATION_REQUIRED"
  ) {
    throw new Error(
      "R1 semantic evaluation requires REEVALUATION_REQUIRED work.",
    );
  }


  if (
    workItem.unsuitabilityCheckpointId !==
      null ||
    workItem.unsuitabilityObservedAt !==
      null ||
    workItem.unsuitabilityDecidedAt !==
      null
  ) {
    throw new Error(
      "R1 semantic evaluation refuses work that already contains Q14v authority.",
    );
  }


  const organizationId =
    requireNonBlank(
      workItem.organizationId,
      "workItem.organizationId",
    );

  const assemblyId =
    requireNonBlank(
      workItem.assemblyId,
      "workItem.assemblyId",
    );

  const positiveCheckpointId =
    requireNonBlank(
      workItem.positiveCheckpointId,
      "workItem.positiveCheckpointId",
    );

  const evidenceId =
    requireNonBlank(
      workItem.evidenceId,
      "workItem.evidenceId",
    );

  const integrityFingerprint =
    requireFingerprint(
      workItem.integrityFingerprint,
      "workItem.integrityFingerprint",
    );

  const positiveAssessedAt =
    requireIsoTimestamp(
      workItem.positiveAssessedAt,
      "workItem.positiveAssessedAt",
    );


  if (!revalidationEvidence.found) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_EVIDENCE_NOT_FOUND",
      null,
      null,
      null,
    );
  }


  const evidence =
    revalidationEvidence.evidence;

  const revalidationEvidenceId =
    requireNonBlank(
      evidence.id,
      "revalidationEvidence.evidence.id",
    );

  const revalidationIntegrityFingerprint =
    requireFingerprint(
      evidence.integrityFingerprint,
      "revalidationEvidence.evidence.integrityFingerprint",
    );

  const revalidationObservedAt =
    requireIsoTimestamp(
      evidence.observedAt,
      "revalidationEvidence.evidence.observedAt",
    );


  if (
    !sameIdentity(
      evidence.organizationId,
      organizationId,
    )
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_ORGANIZATION_MISMATCH",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  if (
    revalidationEvidence.verification.status !==
    "MATCH"
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_INTEGRITY_NOT_VERIFIED",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  if (
    revalidationEvidence.verification.expectedFingerprint !==
      revalidationIntegrityFingerprint ||
    revalidationEvidence.verification.actualFingerprint !==
      revalidationIntegrityFingerprint
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_INTEGRITY_NOT_VERIFIED",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  if (
    evidence.sourceClass !==
      HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS ||
    evidence.sourceProvider !==
      HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER ||
    evidence.sourceStream !==
      HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_SOURCE_IDENTITY_MISMATCH",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  if (
    evidence.payloadSchemaVersion !==
    HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_PAYLOAD_SCHEMA_MISMATCH",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  const lineage =
    evidence.derivationLineage;

  if (
    !lineage ||
    !sameIdentity(
      lineage.parentEvidenceId,
      evidenceId,
    ) ||
    lineage.parentIntegrityFingerprint !==
      integrityFingerprint ||
    lineage.derivationType !==
      HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE ||
    lineage.derivationVersion !==
      HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_LINEAGE_MISMATCH",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  if (
    revalidationObservedAt.epochMs <
    positiveAssessedAt.epochMs
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_NOT_POST_POSITIVE",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  const payload =
    evidence.normalizedPayload;

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_PAYLOAD_SHAPE_INVALID",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  const expectedPayloadKeys =
    [
      "decision",
      "subjectAssemblyId",
      "subjectEvidenceId",
      "subjectIntegrityFingerprint",
      "subjectPositiveCheckpointId",
      "unsuitabilityPolicyVersion",
      "unsuitabilityReason",
    ].sort();

  const actualPayloadKeys =
    Object.keys(
      payload,
    ).sort();


  if (
    actualPayloadKeys.length !==
      expectedPayloadKeys.length ||
    actualPayloadKeys.some(
      (
        key,
        index,
      ) =>
        key !==
        expectedPayloadKeys[index],
    )
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_PAYLOAD_SHAPE_INVALID",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  const payloadAssemblyId =
    readPayloadString(
      payload,
      "subjectAssemblyId",
    );

  const payloadPositiveCheckpointId =
    readPayloadString(
      payload,
      "subjectPositiveCheckpointId",
    );

  const payloadEvidenceId =
    readPayloadString(
      payload,
      "subjectEvidenceId",
    );

  const payloadIntegrityFingerprint =
    readPayloadString(
      payload,
      "subjectIntegrityFingerprint",
    );


  if (
    !payloadAssemblyId ||
    !payloadPositiveCheckpointId ||
    !payloadEvidenceId ||
    !payloadIntegrityFingerprint ||
    !sameIdentity(
      payloadAssemblyId,
      assemblyId,
    ) ||
    !sameIdentity(
      payloadPositiveCheckpointId,
      positiveCheckpointId,
    ) ||
    !sameIdentity(
      payloadEvidenceId,
      evidenceId,
    ) ||
    payloadIntegrityFingerprint !==
      integrityFingerprint
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_PAYLOAD_SUBJECT_MISMATCH",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  const payloadDecision =
    readPayloadString(
      payload,
      "decision",
    );

  const payloadPolicyVersion =
    readPayloadString(
      payload,
      "unsuitabilityPolicyVersion",
    );

  const payloadReason =
    readPayloadString(
      payload,
      "unsuitabilityReason",
    );


  if (
    payloadDecision !==
      HSPP_POST_POSITIVE_REVALIDATION_DECISION ||
    payloadPolicyVersion !==
      HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_POLICY_VERSION ||
    payloadReason !==
      HSPP_POST_POSITIVE_REVALIDATION_PERSISTENCE_REASON
  ) {
    return buildEvaluation(
      workItem,
      "NON_QUALIFYING_REVALIDATION",
      "R1_PAYLOAD_DECISION_MISMATCH",
      revalidationEvidenceId,
      revalidationIntegrityFingerprint,
      revalidationObservedAt.value,
    );
  }


  return buildEvaluation(
    workItem,
    "QUALIFYING_UNSUITABILITY_BASIS",
    "R1_UNSUITABILITY_BASIS_CONFIRMED",
    revalidationEvidenceId,
    revalidationIntegrityFingerprint,
    revalidationObservedAt.value,
  );
}
