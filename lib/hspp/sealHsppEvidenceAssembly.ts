import type { SupabaseClient } from "@supabase/supabase-js";

export const HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION =
  "hspp-evidence-assembly-sealing-v1" as const;

export const HSPP_EVIDENCE_ASSEMBLY_SEALING_RPC =
  "seal_hspp_evidence_assembly" as const;

export type SealHsppEvidenceAssemblyInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type SealedHsppEvidenceAssembly = {
  sealingVersion: typeof HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION;

  organizationId: string;

  assemblyId: string;

  assemblyState: "SEALED";

  sealedAt: string;
};

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

/**
 * B7490-07C3 atomic evidence-assembly sealing boundary.
 *
 * This application boundary performs one PostgreSQL RPC call.
 *
 * The database function:
 *
 * - locks the organization-scoped assembly;
 * - requires the assembly to exist;
 * - requires its current state to be OPEN;
 * - performs only OPEN -> SEALED;
 * - sets sealed_at; and
 * - relies on the existing B11A1 lifecycle triggers as the
 *   authoritative database invariant.
 *
 * It deliberately does NOT:
 *
 * - read or add assembly members;
 * - rerun assembly membership evaluation;
 * - scan the completed assembly;
 * - perform canonical comparison;
 * - detect corroboration or contradiction;
 * - evaluate an assembly decision;
 * - persist an assembly decision;
 * - modify evidence trust;
 * - apply HSPP assessments;
 * - establish physical-world truth;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - create API, cron, retry, or scheduling behavior.
 */
export async function sealHsppEvidenceAssembly(
  input: SealHsppEvidenceAssemblyInput,
): Promise<SealedHsppEvidenceAssembly> {
  const organizationId = requireNonBlank(
    input.organizationId,
    "organizationId",
  );

  const assemblyId = requireNonBlank(input.assemblyId, "assemblyId");

  const { data, error } = await input.supabase.rpc(
    HSPP_EVIDENCE_ASSEMBLY_SEALING_RPC,
    {
      p_organization_id: organizationId,

      p_assembly_id: assemblyId,
    },
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] ?? null) : data;

  if (
    !row ||
    row.assembly_id !== assemblyId ||
    row.organization_id !== organizationId ||
    row.assembly_state !== "SEALED" ||
    typeof row.sealed_at !== "string" ||
    !row.sealed_at.trim()
  ) {
    throw new Error(
      "Atomic HSPP evidence assembly sealing returned an invalid result.",
    );
  }

  return {
    sealingVersion: HSPP_EVIDENCE_ASSEMBLY_SEALING_VERSION,

    organizationId,

    assemblyId,

    assemblyState: "SEALED",

    sealedAt: row.sealed_at,
  };
}
