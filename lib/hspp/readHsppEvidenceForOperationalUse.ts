import {
  readAndVerifyHsppEvidence,
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
