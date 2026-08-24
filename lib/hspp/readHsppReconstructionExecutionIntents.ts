import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
} from "./claimHsppReconstructionExecutionIntent";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_READER_VERSION =
  "hspp-reconstruction-execution-intent-reader-v1" as const;


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_READ_RPC =
  "read_hspp_reconstruction_execution_intents" as const;


const DEFAULT_LIMIT =
  100;


const MAX_LIMIT =
  100;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type HsppReconstructionExecutionIntentCursor = {
  createdAt: string;

  intentId: string;
};


type HsppReconstructionExecutionIntentCommon = {
  intentId: string;

  organizationId: string;

  childAssemblyId: string;

  selectedFirstEvidenceId: string;

  selectedSecondEvidenceId: string;

  historicalEvidenceId: string;

  historicalEvidenceIntegrityFingerprint: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  discoveryPolicyVersion: string;

  reevaluationPolicyVersion: string;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  intentVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION;

  createdAt: string;
};


export type HsppReconstructionExecutionIntent =
  | (
      HsppReconstructionExecutionIntentCommon & {
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
    )
  | (
      HsppReconstructionExecutionIntentCommon & {
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
    )
  | (
      HsppReconstructionExecutionIntentCommon & {
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
      }
    );


export type ReadHsppReconstructionExecutionIntentsInput = {
  /**
   * Trusted service-role client.
   *
   * Q14ag31E grants the reader RPC only to service_role.
   */
  supabase: SupabaseClient;

  organizationId: string;

  limit?: number;

  beforeCreatedAt?:
    | string
    | null;

  beforeIntentId?:
    | string
    | null;
};


export type ReadHsppReconstructionExecutionIntentsResult = {
  readerVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_READER_VERSION;

  organizationId: string;

  limit: number;

  cursor:
    | HsppReconstructionExecutionIntentCursor
    | null;

  intents:
    HsppReconstructionExecutionIntent[];

  /**
   * Present only when the database returned a full page.
   *
   * The timestamp is preserved exactly as returned by PostgreSQL so
   * sub-millisecond cursor precision is not lost.
   */
  nextCursor:
    | HsppReconstructionExecutionIntentCursor
    | null;
};


type IntentRpcRow = {
  intent_id?: unknown;

  organization_id?: unknown;

  child_assembly_id?: unknown;

  selected_first_evidence_id?: unknown;

  selected_second_evidence_id?: unknown;

  historical_evidence_id?: unknown;

  historical_evidence_integrity_fingerprint?: unknown;

  replacement_evidence_id?: unknown;

  replacement_evidence_integrity_fingerprint?: unknown;

  discovery_policy_version?: unknown;

  reevaluation_policy_version?: unknown;

  membership_policy_version?: unknown;

  reconstruction_policy_version?: unknown;

  reconstruction_reason?: unknown;

  intent_version?: unknown;

  created_at?: unknown;

  persistence_state?: unknown;

  reconstruction_id?: unknown;

  parent_assembly_id?: unknown;

  assembly_state?: unknown;

  sealed_at?: unknown;
};


function requireObject(
  value: unknown,
  fieldName: string,
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
  value: unknown,
  fieldName: string,
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


function requireTimestamp(
  value: unknown,
  fieldName: string,
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

  /*
   * Deliberately preserve the exact timestamp text.
   *
   * This value may become a keyset cursor and PostgreSQL can preserve
   * precision beyond JavaScript Date milliseconds.
   */
  return normalized;
}


function requireSha256(
  value: unknown,
  fieldName: string,
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


function requireBoundedPolicyVersion(
  value: unknown,
  fieldName: string,
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


function requireReconstructionReason(
  value: unknown,
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


function requireLimit(
  value: unknown,
): number {
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


function normalizeCursor(
  beforeCreatedAt: unknown,
  beforeIntentId: unknown,
): HsppReconstructionExecutionIntentCursor | null {
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
  selectedFirstEvidenceId: string,
  selectedSecondEvidenceId: string,
  historicalEvidenceId: string,
  replacementEvidenceId: string,
  rowIndex: number,
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

  const pair =
    new Set<string>([
      selectedFirstEvidenceId,
      selectedSecondEvidenceId,
    ]);

  if (
    pair.size !== 2 ||
    !pair.has(
      historicalEvidenceId,
    ) ||
    !pair.has(
      replacementEvidenceId,
    )
  ) {
    throw new Error(
      `intent row ${rowIndex} selected pair must contain exactly the historical and replacement evidence identities.`,
    );
  }
}


function normalizeIntentRow(
  rawRow: unknown,
  expectedOrganizationId: string,
  rowIndex: number,
): HsppReconstructionExecutionIntent {
  const row =
    requireObject(
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

  const discoveryPolicyVersion =
    requireBoundedPolicyVersion(
      row.discovery_policy_version,
      `intent row ${rowIndex}.discovery_policy_version`,
    );

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
    HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION
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

  const persistenceState =
    requireNonBlankString(
      row.persistence_state,
      `intent row ${rowIndex}.persistence_state`,
    );

  const common: HsppReconstructionExecutionIntentCommon = {
    intentId,

    organizationId,

    childAssemblyId,

    selectedFirstEvidenceId,

    selectedSecondEvidenceId,

    historicalEvidenceId,

    historicalEvidenceIntegrityFingerprint,

    replacementEvidenceId,

    replacementEvidenceIntegrityFingerprint,

    discoveryPolicyVersion,

    reevaluationPolicyVersion,

    membershipPolicyVersion,

    reconstructionPolicyVersion,

    reconstructionReason,

    intentVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,

    createdAt,
  };


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


  if (assemblyState === "OPEN") {
    if (row.sealed_at !== null) {
      throw new Error(
        `intent row ${rowIndex} OPEN reconstruction must have sealed_at = null.`,
      );
    }

    return {
      ...common,

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


  if (assemblyState === "SEALED") {
    const sealedAt =
      requireTimestamp(
        row.sealed_at,
        `intent row ${rowIndex}.sealed_at`,
      );

    return {
      ...common,

      persistenceState:
        "RECONSTRUCTION_PERSISTED",

      reconstructionId,

      parentAssemblyId,

      assemblyState:
        "SEALED",

      sealedAt,
    };
  }


  throw new Error(
    `intent row ${rowIndex} persisted assembly_state must be OPEN or SEALED.`,
  );
}


function assertDeterministicPageOrder(
  previous: HsppReconstructionExecutionIntent,
  current: HsppReconstructionExecutionIntent,
  currentIndex: number,
): void {
  const previousMillis =
    Date.parse(
      previous.createdAt,
    );

  const currentMillis =
    Date.parse(
      current.createdAt,
    );


  if (previousMillis < currentMillis) {
    throw new Error(
      `intent row ${currentIndex} violates created_at DESC ordering.`,
    );
  }


  if (previousMillis !== currentMillis) {
    return;
  }


  /*
   * Date.parse truncates precision beyond milliseconds.
   *
   * If the parsed millisecond is equal but PostgreSQL returned distinct
   * timestamp text, preserve deterministic descending order using the
   * exact returned timestamp representation.
   */
  if (
    previous.createdAt !==
    current.createdAt
  ) {
    if (
      previous.createdAt <
      current.createdAt
    ) {
      throw new Error(
        `intent row ${currentIndex} violates sub-millisecond created_at DESC ordering.`,
      );
    }

    return;
  }


  if (
    previous.intentId <=
    current.intentId
  ) {
    throw new Error(
      `intent row ${currentIndex} violates intent_id DESC ordering for an equal created_at value.`,
    );
  }
}


/**
 * Typed application boundary for Q14ag31E.
 *
 * The deployed RPC deliberately returns immutable reconstruction-intent
 * provenance plus a derived persistence state.
 *
 * Supabase-generated RPC types currently mark the derived nullable fields as
 * strings. This reader therefore treats every returned row as unknown and
 * validates the real runtime state before exposing a discriminated union.
 *
 * The reader deliberately does not claim intents, select evidence, create
 * UUIDs, execute Q14h, reconstruct H2, seal or assess assemblies, mutate
 * trust/Reservoir state, or route API/cron execution.
 */
export async function readHsppReconstructionExecutionIntents({
  supabase,
  organizationId: rawOrganizationId,
  limit: rawLimit,
  beforeCreatedAt,
  beforeIntentId,
}: ReadHsppReconstructionExecutionIntentsInput): Promise<ReadHsppReconstructionExecutionIntentsResult> {
  const organizationId =
    requireNonBlankString(
      rawOrganizationId,
      "organizationId",
    );

  const limit =
    rawLimit === undefined
      ? DEFAULT_LIMIT
      : requireLimit(
          rawLimit,
        );

  const cursor =
    normalizeCursor(
      beforeCreatedAt,
      beforeIntentId,
    );


  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_READ_RPC,
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
      },
    );


  if (error) {
    throw error;
  }


  if (!Array.isArray(data)) {
    throw new Error(
      "Q14ag31E reconstruction execution-intent reader must return an array.",
    );
  }


  if (data.length > limit) {
    throw new Error(
      "Q14ag31E reconstruction execution-intent reader returned more rows than requested.",
    );
  }


  const intents =
    data.map(
      (
        rawRow,
        index,
      ) =>
        normalizeIntentRow(
          rawRow,
          organizationId,
          index,
        ),
    );


  const intentIds =
    new Set<string>();

  const childAssemblyIds =
    new Set<string>();


  for (
    let index = 0;
    index < intents.length;
    index += 1
  ) {
    const intent =
      intents[index];


    if (
      intentIds.has(
        intent.intentId,
      )
    ) {
      throw new Error(
        `Q14ag31E returned duplicate intent identity ${intent.intentId}.`,
      );
    }


    if (
      childAssemblyIds.has(
        intent.childAssemblyId,
      )
    ) {
      throw new Error(
        `Q14ag31E returned duplicate canonical child identity ${intent.childAssemblyId}.`,
      );
    }


    intentIds.add(
      intent.intentId,
    );

    childAssemblyIds.add(
      intent.childAssemblyId,
    );


    if (index > 0) {
      assertDeterministicPageOrder(
        intents[index - 1],
        intent,
        index,
      );
    }
  }


  const finalIntent =
    intents.length > 0
      ? intents[
          intents.length - 1
        ]
      : null;


  const nextCursor =
    intents.length === limit &&
    finalIntent !== null
      ? {
          createdAt:
            finalIntent.createdAt,

          intentId:
            finalIntent.intentId,
        }
      : null;


  return {
    readerVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_READER_VERSION,

    organizationId,

    limit,

    cursor,

    intents,

    nextCursor,
  };
}
