export type TelematicsMessageClaimInput = {
  supabase: any;
  organizationId: string;
  provider: string;
  stream: string;
  providerMessageId: string;
  metadata?: Record<string, unknown>;
};

export type TelematicsMessageClaim =
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

export type TelematicsMessageFinalizationInput = {
  supabase: any;
  receiptId: string;
  attemptCount: number;
};

export type FailTelematicsMessageInput =
  TelematicsMessageFinalizationInput & {
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

export async function claimTelematicsMessage({
  supabase,
  organizationId,
  provider,
  stream,
  providerMessageId,
  metadata = {},
}: TelematicsMessageClaimInput): Promise<TelematicsMessageClaim> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const normalizedProvider =
    requireNonBlank(provider, "provider");

  const normalizedStream =
    requireNonBlank(stream, "stream");

  const normalizedProviderMessageId =
    requireNonBlank(
      providerMessageId,
      "providerMessageId"
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    "claim_telematics_message",
    {
      p_organization_id:
        normalizedOrganizationId,
      p_provider:
        normalizedProvider,
      p_stream:
        normalizedStream,
      p_provider_message_id:
        normalizedProviderMessageId,
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
      "Telematics message claim returned an unexpected result."
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
      "Telematics message claim returned an invalid result."
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
      "Telematics message claim returned an invalid claimed value."
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

export async function completeTelematicsMessage({
  supabase,
  receiptId,
  attemptCount,
}: TelematicsMessageFinalizationInput): Promise<void> {
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
    "complete_telematics_message",
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
      "Telematics message completion rejected because the claim is no longer active."
    );
  }
}

export async function failTelematicsMessage({
  supabase,
  receiptId,
  attemptCount,
  failureMessage,
}: FailTelematicsMessageInput): Promise<void> {
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
    "fail_telematics_message",
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
      "Telematics message failure finalization rejected because the claim is no longer active."
    );
  }
}
