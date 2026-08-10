export type TrafficFlowCollectionClaimInput = {
  supabase: any;
  organizationId: string;
  collectionKey: string;
  metadata?: Record<string, unknown>;
};

export type TrafficFlowCollectionClaim =
  | {
      claimed: true;
      receiptId: string;
      attemptCount: number;
    }
  | {
      claimed: false;
      receiptId: string;
      processingStatus: string;
      attemptCount: number;
    };

export type TrafficFlowCollectionFinalizationInput = {
  supabase: any;
  receiptId: string;
  attemptCount: number;
};

export type FailTrafficFlowCollectionInput =
  TrafficFlowCollectionFinalizationInput & {
    failureMessage: string;
  };

type ClaimRpcRow = {
  claimed: boolean;
  receipt_id: string;
  processing_status: string;
  attempt_count: number;
};

function requireNonBlank(
  value: string,
  name: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${name} is required.`);
  }

  return normalized;
}

function requireAttemptCount(
  attemptCount: number
): number {
  if (
    !Number.isInteger(attemptCount) ||
    attemptCount < 1
  ) {
    throw new Error(
      "attemptCount must be a positive integer."
    );
  }

  return attemptCount;
}

export async function claimTrafficFlowCollection({
  supabase,
  organizationId,
  collectionKey,
  metadata = {},
}: TrafficFlowCollectionClaimInput): Promise<TrafficFlowCollectionClaim> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const normalizedCollectionKey =
    requireNonBlank(
      collectionKey,
      "collectionKey"
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    "claim_traffic_flow_collection",
    {
      p_organization_id:
        normalizedOrganizationId,
      p_collection_key:
        normalizedCollectionKey,
      p_metadata:
        metadata,
    }
  );

  if (error) {
    throw error;
  }

  const rows =
    Array.isArray(data) ? data : [];

  if (rows.length !== 1) {
    throw new Error(
      "Traffic-flow collection claim returned an unexpected result."
    );
  }

  const row =
    rows[0] as ClaimRpcRow;

  if (
    typeof row.receipt_id !== "string" ||
    !row.receipt_id ||
    typeof row.processing_status !== "string" ||
    !row.processing_status ||
    !Number.isInteger(row.attempt_count) ||
    row.attempt_count < 1
  ) {
    throw new Error(
      "Traffic-flow collection claim returned an invalid result."
    );
  }

  if (row.claimed === true) {
    return {
      claimed: true,
      receiptId: row.receipt_id,
      attemptCount: row.attempt_count,
    };
  }

  if (row.claimed !== false) {
    throw new Error(
      "Traffic-flow collection claim returned an invalid claimed value."
    );
  }

  return {
    claimed: false,
    receiptId: row.receipt_id,
    processingStatus:
      row.processing_status,
    attemptCount:
      row.attempt_count,
  };
}

export async function completeTrafficFlowCollection({
  supabase,
  receiptId,
  attemptCount,
}: TrafficFlowCollectionFinalizationInput): Promise<void> {
  const normalizedReceiptId =
    requireNonBlank(
      receiptId,
      "receiptId"
    );

  const normalizedAttemptCount =
    requireAttemptCount(attemptCount);

  const {
    data,
    error,
  } = await supabase.rpc(
    "complete_traffic_flow_collection",
    {
      p_receipt_id:
        normalizedReceiptId,
      p_attempt_count:
        normalizedAttemptCount,
    }
  );

  if (error) {
    throw error;
  }

  if (data !== true) {
    throw new Error(
      "Traffic-flow collection completion rejected because the claim is no longer active."
    );
  }
}

export async function failTrafficFlowCollection({
  supabase,
  receiptId,
  attemptCount,
  failureMessage,
}: FailTrafficFlowCollectionInput): Promise<void> {
  const normalizedReceiptId =
    requireNonBlank(
      receiptId,
      "receiptId"
    );

  const normalizedAttemptCount =
    requireAttemptCount(attemptCount);

  const normalizedFailureMessage =
    requireNonBlank(
      failureMessage,
      "failureMessage"
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    "fail_traffic_flow_collection",
    {
      p_receipt_id:
        normalizedReceiptId,
      p_attempt_count:
        normalizedAttemptCount,
      p_failure_message:
        normalizedFailureMessage,
    }
  );

  if (error) {
    throw error;
  }

  if (data !== true) {
    throw new Error(
      "Traffic-flow collection failure finalization rejected because the claim is no longer active."
    );
  }
}
