import type {
  SupabaseClient,
} from "@supabase/supabase-js";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC =
  "read_hspp_reconstruction_execution_intents_v2" as const;


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READER_VERSION =
  "B7490-Q14AG33D-v1" as const;


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION =
  "hspp-reservoir-eligibility-v1" as const;


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION =
  "hspp-reconstruction-execution-intent-v1" as const;


const DEFAULT_LIMIT =
  100;


const MAX_LIMIT =
  100;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type HsppReconstructionExecutionIntentSelectionProvenance =
  | {
      selectionSource:
        "B07B_DISCOVERY";

      discoveryPolicyVersion:
        string;

      pairSchedulingVersion:
        null;
    }
  | {
      selectionSource:
        "SCHEDULED_PAIR";

      discoveryPolicyVersion:
        null;

      pairSchedulingVersion:
        string;
    };


export type HsppReconstructionExecutionIntentPersistence =
  | {
      persistenceState:
        "CLAIMED_NOT_PERSISTED";

      reconstructionId:
        null;

      parentAssemblyId:
        null;

      assemblyState:
        null;

      sealedAt:
        null;
    }
  | {
      persistenceState:
        "RECONSTRUCTION_PERSISTED";

      reconstructionId:
        string;

      parentAssemblyId:
        string;

      assemblyState:
        "OPEN";

      sealedAt:
        null;
    }
  | {
      persistenceState:
        "RECONSTRUCTION_PERSISTED";

      reconstructionId:
        string;

      parentAssemblyId:
        string;

      assemblyState:
        "SEALED";

      sealedAt:
        string;
    };


export type HsppReconstructionExecutionIntentSuccessorCommon = {
  intentId: string;

  organizationId: string;

  childAssemblyId: string;

  selectedFirstEvidenceId: string;

  selectedSecondEvidenceId: string;

  historicalEvidenceId: string;

  historicalEvidenceIntegrityFingerprint:
    string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint:
    string;

  reservoirEligibilityPolicyVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION;

  reevaluationPolicyVersion:
    string;

  membershipPolicyVersion:
    string;

  reconstructionPolicyVersion:
    string;

  reconstructionReason:
    string;

  intentVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION;

  createdAt:
    string;
};


export type HsppReconstructionExecutionIntentV2 =
  HsppReconstructionExecutionIntentSuccessorCommon &
  HsppReconstructionExecutionIntentSelectionProvenance &
  HsppReconstructionExecutionIntentPersistence;


export type HsppReconstructionExecutionIntentSuccessorCursor = {
  createdAt:
    string;

  intentId:
    string;
};


export type ReadHsppReconstructionExecutionIntentsV2Input = {
  supabase:
    SupabaseClient;

  organizationId:
    string;

  limit?:
    number;

  beforeCreatedAt?:
    | string
    | null;

  beforeIntentId?:
    | string
    | null;

  persistenceStateFilter?:
    | HsppReconstructionExecutionIntentPersistence["persistenceState"]
    | null;
};


export type ReadHsppReconstructionExecutionIntentsV2Result = {
  readerVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READER_VERSION;

  organizationId:
    string;

  limit:
    number;

  cursor:
    | HsppReconstructionExecutionIntentSuccessorCursor
    | null;

  persistenceStateFilter:
    | HsppReconstructionExecutionIntentPersistence["persistenceState"]
    | null;

  intents:
    HsppReconstructionExecutionIntentV2[];

  nextCursor:
    | HsppReconstructionExecutionIntentSuccessorCursor
    | null;
};


type IntentRpcRow = {
  intent_id?:
    unknown;

  organization_id?:
    unknown;

  child_assembly_id?:
    unknown;

  selected_first_evidence_id?:
    unknown;

  selected_second_evidence_id?:
    unknown;

  historical_evidence_id?:
    unknown;

  historical_evidence_integrity_fingerprint?:
    unknown;

  replacement_evidence_id?:
    unknown;

  replacement_evidence_integrity_fingerprint?:
    unknown;

  selection_source?:
    unknown;

  discovery_policy_version?:
    unknown;

  pair_scheduling_version?:
    unknown;

  reservoir_eligibility_policy_version?:
    unknown;

  reevaluation_policy_version?:
    unknown;

  membership_policy_version?:
    unknown;

  reconstruction_policy_version?:
    unknown;

  reconstruction_reason?:
    unknown;

  intent_version?:
    unknown;

  created_at?:
    unknown;

  persistence_state?:
    unknown;

  reconstruction_id?:
    unknown;

  parent_assembly_id?:
    unknown;

  assembly_state?:
    unknown;

  sealed_at?:
    unknown;
};


function requireRecord(
  value:
    unknown,
  fieldName:
    string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${fieldName} must be an object.`,
    );
  }

  return value as Record<string, unknown>;
}


function requireNonBlankString(
  value:
    unknown,
  fieldName:
    string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a non-empty string.`,
    );
  }

  return value.trim();
}


function requireBoundedPolicyVersion(
  value:
    unknown,
  fieldName:
    string,
): string {
  const normalized =
    requireNonBlankString(
      value,
      fieldName,
    );

  if (normalized.length > 128) {
    throw new Error(
      `${fieldName} must contain at most 128 characters.`,
    );
  }

  return normalized;
}


function requireSha256(
  value:
    unknown,
  fieldName:
    string,
): string {
  const normalized =
    requireNonBlankString(
      value,
      fieldName,
    );

  if (!SHA256_PATTERN.test(normalized)) {
    throw new Error(
      `${fieldName} must be a lowercase SHA-256 fingerprint.`,
    );
  }

  return normalized;
}


function requireTimestamp(
  value:
    unknown,
  fieldName:
    string,
): string {
  const normalized =
    requireNonBlankString(
      value,
      fieldName,
    );

  const parsed =
    Date.parse(
      normalized,
    );

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return normalized;
}


function requireReconstructionReason(
  value:
    unknown,
): string {
  const normalized =
    requireNonBlankString(
      value,
      "reconstruction_reason",
    );

  if (normalized.length > 512) {
    throw new Error(
      "reconstruction_reason must contain at most 512 characters.",
    );
  }

  return normalized;
}


function normalizeLimit(
  value:
    unknown,
): number {
  if (value === undefined) {
    return DEFAULT_LIMIT;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${MAX_LIMIT}.`,
    );
  }

  return value;
}


function normalizePersistenceStateFilter(
  value:
    unknown,
): HsppReconstructionExecutionIntentPersistence["persistenceState"] | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    value === "CLAIMED_NOT_PERSISTED" ||
    value === "RECONSTRUCTION_PERSISTED"
  ) {
    return value;
  }

  throw new Error(
    "persistenceStateFilter must be CLAIMED_NOT_PERSISTED, RECONSTRUCTION_PERSISTED, or null.",
  );
}


function normalizeCursor(
  beforeCreatedAt:
    unknown,
  beforeIntentId:
    unknown,
): HsppReconstructionExecutionIntentSuccessorCursor | null {
  const hasCreatedAt =
    beforeCreatedAt !== undefined &&
    beforeCreatedAt !== null;

  const hasIntentId =
    beforeIntentId !== undefined &&
    beforeIntentId !== null;

  if (hasCreatedAt !== hasIntentId) {
    throw new Error(
      "beforeCreatedAt and beforeIntentId must be provided together.",
    );
  }

  if (!hasCreatedAt) {
    return null;
  }

  return {
    createdAt:
      requireTimestamp(
        beforeCreatedAt,
        "beforeCreatedAt",
      ),

    intentId:
      requireNonBlankString(
        beforeIntentId,
        "beforeIntentId",
      ),
  };
}


function validateImmutablePair(
  selectedFirstEvidenceId:
    string,
  selectedSecondEvidenceId:
    string,
  historicalEvidenceId:
    string,
  replacementEvidenceId:
    string,
  rowIndex:
    number,
): void {
  if (
    selectedFirstEvidenceId ===
      selectedSecondEvidenceId
  ) {
    throw new Error(
      `intent row ${rowIndex} selected evidence identities must be distinct.`,
    );
  }

  if (
    historicalEvidenceId ===
      replacementEvidenceId
  ) {
    throw new Error(
      `intent row ${rowIndex} historical and replacement evidence identities must be distinct.`,
    );
  }

  const exactPair =
    (
      selectedFirstEvidenceId ===
        historicalEvidenceId &&
      selectedSecondEvidenceId ===
        replacementEvidenceId
    ) ||
    (
      selectedFirstEvidenceId ===
        replacementEvidenceId &&
      selectedSecondEvidenceId ===
        historicalEvidenceId
    );

  if (!exactPair) {
    throw new Error(
      `intent row ${rowIndex} selected pair must exactly contain the historical and replacement evidence identities.`,
    );
  }
}


function normalizeSelectionProvenance(
  row:
    IntentRpcRow,
  rowIndex:
    number,
): HsppReconstructionExecutionIntentSelectionProvenance {
  const selectionSource =
    requireNonBlankString(
      row.selection_source,
      `intent row ${rowIndex}.selection_source`,
    );

  if (
    selectionSource ===
      "B07B_DISCOVERY"
  ) {
    const discoveryPolicyVersion =
      requireBoundedPolicyVersion(
        row.discovery_policy_version,
        `intent row ${rowIndex}.discovery_policy_version`,
      );

    if (
      row.pair_scheduling_version !==
        null
    ) {
      throw new Error(
        `intent row ${rowIndex} B07B_DISCOVERY must not expose pair scheduling provenance.`,
      );
    }

    return {
      selectionSource:
        "B07B_DISCOVERY",

      discoveryPolicyVersion,

      pairSchedulingVersion:
        null,
    };
  }

  if (
    selectionSource ===
      "SCHEDULED_PAIR"
  ) {
    if (
      row.discovery_policy_version !==
        null
    ) {
      throw new Error(
        `intent row ${rowIndex} SCHEDULED_PAIR must not expose fabricated discovery provenance.`,
      );
    }

    return {
      selectionSource:
        "SCHEDULED_PAIR",

      discoveryPolicyVersion:
        null,

      pairSchedulingVersion:
        requireBoundedPolicyVersion(
          row.pair_scheduling_version,
          `intent row ${rowIndex}.pair_scheduling_version`,
        ),
    };
  }

  throw new Error(
    `intent row ${rowIndex} has unsupported selection_source ${selectionSource}.`,
  );
}


function normalizeIntentRow(
  rawRow:
    unknown,
  rowIndex:
    number,
  expectedOrganizationId:
    string,
): HsppReconstructionExecutionIntentV2 {
  const row =
    requireRecord(
      rawRow,
      `intent row ${rowIndex}`,
    ) as IntentRpcRow;

  const intentId =
    requireNonBlankString(
      row.intent_id,
      `intent row ${rowIndex}.intent_id`,
    );

  const organizationId =
    requireNonBlankString(
      row.organization_id,
      `intent row ${rowIndex}.organization_id`,
    );

  if (
    organizationId !==
      expectedOrganizationId
  ) {
    throw new Error(
      `intent row ${rowIndex} organization does not match the requested organization.`,
    );
  }

  const childAssemblyId =
    requireNonBlankString(
      row.child_assembly_id,
      `intent row ${rowIndex}.child_assembly_id`,
    );

  const selectedFirstEvidenceId =
    requireNonBlankString(
      row.selected_first_evidence_id,
      `intent row ${rowIndex}.selected_first_evidence_id`,
    );

  const selectedSecondEvidenceId =
    requireNonBlankString(
      row.selected_second_evidence_id,
      `intent row ${rowIndex}.selected_second_evidence_id`,
    );

  const historicalEvidenceId =
    requireNonBlankString(
      row.historical_evidence_id,
      `intent row ${rowIndex}.historical_evidence_id`,
    );

  const historicalEvidenceIntegrityFingerprint =
    requireSha256(
      row.historical_evidence_integrity_fingerprint,
      `intent row ${rowIndex}.historical_evidence_integrity_fingerprint`,
    );

  const replacementEvidenceId =
    requireNonBlankString(
      row.replacement_evidence_id,
      `intent row ${rowIndex}.replacement_evidence_id`,
    );

  const replacementEvidenceIntegrityFingerprint =
    requireSha256(
      row.replacement_evidence_integrity_fingerprint,
      `intent row ${rowIndex}.replacement_evidence_integrity_fingerprint`,
    );

  validateImmutablePair(
    selectedFirstEvidenceId,
    selectedSecondEvidenceId,
    historicalEvidenceId,
    replacementEvidenceId,
    rowIndex,
  );

  const selectionProvenance =
    normalizeSelectionProvenance(
      row,
      rowIndex,
    );

  const reservoirEligibilityPolicyVersion =
    requireBoundedPolicyVersion(
      row.reservoir_eligibility_policy_version,
      `intent row ${rowIndex}.reservoir_eligibility_policy_version`,
    );

  if (
    reservoirEligibilityPolicyVersion !==
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION
  ) {
    throw new Error(
      `intent row ${rowIndex} uses an unsupported Reservoir eligibility policy version.`,
    );
  }

  const reevaluationPolicyVersion =
    requireBoundedPolicyVersion(
      row.reevaluation_policy_version,
      `intent row ${rowIndex}.reevaluation_policy_version`,
    );

  const membershipPolicyVersion =
    requireBoundedPolicyVersion(
      row.membership_policy_version,
      `intent row ${rowIndex}.membership_policy_version`,
    );

  const reconstructionPolicyVersion =
    requireBoundedPolicyVersion(
      row.reconstruction_policy_version,
      `intent row ${rowIndex}.reconstruction_policy_version`,
    );

  const reconstructionReason =
    requireReconstructionReason(
      row.reconstruction_reason,
    );

  const intentVersion =
    requireNonBlankString(
      row.intent_version,
      `intent row ${rowIndex}.intent_version`,
    );

  if (
    intentVersion !==
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION
  ) {
    throw new Error(
      `intent row ${rowIndex} uses an unsupported reconstruction execution-intent version.`,
    );
  }

  const createdAt =
    requireTimestamp(
      row.created_at,
      `intent row ${rowIndex}.created_at`,
    );

  const common:
    HsppReconstructionExecutionIntentSuccessorCommon = {
      intentId,

      organizationId,

      childAssemblyId,

      selectedFirstEvidenceId,

      selectedSecondEvidenceId,

      historicalEvidenceId,

      historicalEvidenceIntegrityFingerprint,

      replacementEvidenceId,

      replacementEvidenceIntegrityFingerprint,

      reservoirEligibilityPolicyVersion:
        HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION,

      reevaluationPolicyVersion,

      membershipPolicyVersion,

      reconstructionPolicyVersion,

      reconstructionReason,

      intentVersion:
        HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION,

      createdAt,
    };

  const persistenceState =
    requireNonBlankString(
      row.persistence_state,
      `intent row ${rowIndex}.persistence_state`,
    );

  if (
    persistenceState ===
      "CLAIMED_NOT_PERSISTED"
  ) {
    if (
      row.reconstruction_id !== null ||
      row.parent_assembly_id !== null ||
      row.assembly_state !== null ||
      row.sealed_at !== null
    ) {
      throw new Error(
        `intent row ${rowIndex} CLAIMED_NOT_PERSISTED state must not expose persisted child/reconstruction state.`,
      );
    }

    return {
      ...common,
      ...selectionProvenance,

      persistenceState:
        "CLAIMED_NOT_PERSISTED",

      reconstructionId:
        null,

      parentAssemblyId:
        null,

      assemblyState:
        null,

      sealedAt:
        null,
    };
  }

  if (
    persistenceState !==
      "RECONSTRUCTION_PERSISTED"
  ) {
    throw new Error(
      `intent row ${rowIndex} has unsupported persistence_state ${persistenceState}.`,
    );
  }

  const reconstructionId =
    requireNonBlankString(
      row.reconstruction_id,
      `intent row ${rowIndex}.reconstruction_id`,
    );

  const parentAssemblyId =
    requireNonBlankString(
      row.parent_assembly_id,
      `intent row ${rowIndex}.parent_assembly_id`,
    );

  if (
    parentAssemblyId ===
      childAssemblyId
  ) {
    throw new Error(
      `intent row ${rowIndex} parent and child assembly identities must be distinct.`,
    );
  }

  const assemblyState =
    requireNonBlankString(
      row.assembly_state,
      `intent row ${rowIndex}.assembly_state`,
    );

  if (
    assemblyState ===
      "OPEN"
  ) {
    if (row.sealed_at !== null) {
      throw new Error(
        `intent row ${rowIndex} OPEN state must have null sealed_at.`,
      );
    }

    return {
      ...common,
      ...selectionProvenance,

      persistenceState:
        "RECONSTRUCTION_PERSISTED",

      reconstructionId,

      parentAssemblyId,

      assemblyState:
        "OPEN",

      sealedAt:
        null,
    };
  }

  if (
    assemblyState ===
      "SEALED"
  ) {
    return {
      ...common,
      ...selectionProvenance,

      persistenceState:
        "RECONSTRUCTION_PERSISTED",

      reconstructionId,

      parentAssemblyId,

      assemblyState:
        "SEALED",

      sealedAt:
        requireTimestamp(
          row.sealed_at,
          `intent row ${rowIndex}.sealed_at`,
        ),
    };
  }

  throw new Error(
    `intent row ${rowIndex} has unsupported assembly_state ${assemblyState}.`,
  );
}


function assertDeterministicPage(
  intents:
    HsppReconstructionExecutionIntentV2[],
): void {
  const seenIntentIds =
    new Set<string>();

  for (
    let index = 0;
    index < intents.length;
    index += 1
  ) {
    const current =
      intents[index];

    if (seenIntentIds.has(current.intentId)) {
      throw new Error(
        `Duplicate reconstruction execution-intent identity ${current.intentId}.`,
      );
    }

    seenIntentIds.add(
      current.intentId,
    );

    if (index === 0) {
      continue;
    }

    const previous =
      intents[index - 1];

    const previousTimestamp =
      Date.parse(
        previous.createdAt,
      );

    const currentTimestamp =
      Date.parse(
        current.createdAt,
      );

    if (
      currentTimestamp >
        previousTimestamp
    ) {
      throw new Error(
        "Successor reconstruction execution-intent page is not ordered by created_at descending.",
      );
    }

    if (
      currentTimestamp ===
        previousTimestamp &&
      current.intentId.localeCompare(
        previous.intentId,
      ) >= 0
    ) {
      throw new Error(
        "Successor reconstruction execution-intent page is not ordered by intent_id descending for equal created_at.",
      );
    }
  }
}


/**
 * Q14ag33D successor durable reconstruction execution-intent reader.
 *
 * This boundary reads only the Q14ag33C v2 RPC. It does not delegate
 * to Q14ag31F because Q14ag31F intentionally requires B07B discovery
 * provenance and therefore cannot represent a SCHEDULED_PAIR row.
 *
 * Q14ag33D owns no claim, replacement hydration, reconstruction,
 * Reservoir discovery, pair scheduling, pair cursor CAS, sealing,
 * assessment or authority transition.
 */
export async function readHsppReconstructionExecutionIntentsV2({
  supabase,

  organizationId:
    rawOrganizationId,

  limit:
    rawLimit,

  beforeCreatedAt,
  beforeIntentId,

  persistenceStateFilter:
    rawPersistenceStateFilter,
}: ReadHsppReconstructionExecutionIntentsV2Input): Promise<ReadHsppReconstructionExecutionIntentsV2Result> {
  const organizationId =
    requireNonBlankString(
      rawOrganizationId,
      "organizationId",
    );

  const limit =
    normalizeLimit(
      rawLimit,
    );

  const cursor =
    normalizeCursor(
      beforeCreatedAt,
      beforeIntentId,
    );

  const persistenceStateFilter =
    normalizePersistenceStateFilter(
      rawPersistenceStateFilter,
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
      {
        p_organization_id:
          organizationId,

        p_limit:
          limit,

        p_before_created_at:
          cursor?.createdAt ??
          null,

        p_before_intent_id:
          cursor?.intentId ??
          null,

        p_persistence_state:
          persistenceStateFilter,
      },
    );

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Q14ag33C successor reconstruction execution-intent reader must return an array.",
    );
  }

  if (data.length > limit) {
    throw new Error(
      "Q14ag33C successor reconstruction execution-intent reader returned more rows than requested.",
    );
  }

  const intents =
    data.map(
      (
        rawRow,
        rowIndex,
      ) =>
        normalizeIntentRow(
          rawRow,
          rowIndex,
          organizationId,
        ),
    );

  if (
    persistenceStateFilter !==
      null
  ) {
    for (const intent of intents) {
      if (
        intent.persistenceState !==
          persistenceStateFilter
      ) {
        throw new Error(
          "Q14ag33D successor reader received a persistence state outside the requested server-side filter.",
        );
      }
    }
  }

  assertDeterministicPage(
    intents,
  );

  const lastIntent =
    intents.length > 0
      ? intents[intents.length - 1]
      : null;

  const nextCursor =
    data.length === limit &&
    lastIntent !== null
      ? {
          createdAt:
            lastIntent.createdAt,

          intentId:
            lastIntent.intentId,
        }
      : null;

  return {
    readerVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READER_VERSION,

    organizationId,

    limit,

    cursor,

    persistenceStateFilter,

    intents,

    nextCursor,
  };
}