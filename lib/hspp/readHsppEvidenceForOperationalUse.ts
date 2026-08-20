import {
  readAndVerifyHsppEvidence,
  readAndVerifyHsppEvidenceBatch,
  type PersistedHsppEvidenceRecord,
  type ReadAndVerifyHsppEvidenceResult,
} from "@/lib/hspp/readAndVerifyHsppEvidence";

import {
  decideHsppOperationalUse,
  type HsppOperationalUseDecision,
} from "@/lib/hspp/decideHsppOperationalUse";

export type ReadHsppEvidenceForOperationalUseInput = {
  supabase: any;
  organizationId: string;
  evidenceId: string;
};

export type ReadHsppEvidenceForOperationalUseResult = {
  readResult: ReadAndVerifyHsppEvidenceResult;
  decision: HsppOperationalUseDecision;
  evidence: PersistedHsppEvidenceRecord | null;
};

export async function readHsppEvidenceForOperationalUse({
  supabase,
  organizationId,
  evidenceId,
}: ReadHsppEvidenceForOperationalUseInput): Promise<ReadHsppEvidenceForOperationalUseResult> {
  const readResult =
    await readAndVerifyHsppEvidence({
      supabase,
      organizationId,
      evidenceId,
    });

  const decision =
    decideHsppOperationalUse(
      readResult
    );

  return {
    readResult,
    decision,
    evidence:
      readResult.found
        ? readResult.evidence
        : null,
  };
}

export type ReadHsppEvidenceBatchForOperationalUseInput = {
  supabase: any;
  organizationId: string;
  evidenceIds: string[];
};

export type ReadHsppEvidenceBatchForOperationalUseResult =
  Map<
    string,
    ReadHsppEvidenceForOperationalUseResult
  >;

export async function readHsppEvidenceBatchForOperationalUse({
  supabase,
  organizationId,
  evidenceIds,
}: ReadHsppEvidenceBatchForOperationalUseInput): Promise<ReadHsppEvidenceBatchForOperationalUseResult> {
  const readResults =
    await readAndVerifyHsppEvidenceBatch({
      supabase,
      organizationId,
      evidenceIds,
    });

  const results =
    new Map<
      string,
      ReadHsppEvidenceForOperationalUseResult
    >();

  for (
    const [evidenceId, readResult]
    of readResults.entries()
  ) {
    results.set(
      evidenceId,
      {
        readResult,
        decision:
          decideHsppOperationalUse(
            readResult
          ),
        evidence:
          readResult.found
            ? readResult.evidence
            : null,
      }
    );
  }

  return results;
}
