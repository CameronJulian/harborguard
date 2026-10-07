/**
 * Route Safety provider execution result.
 *
 * `provider` is intentionally represented as a non-empty string rather than
 * a closed provider union so new external intelligence adapters can return
 * operational results without requiring this shared result envelope to be
 * rewritten for every provider.
 *
 * This does NOT grant a provider HSPP trust, ingestion approval, operational
 * authority, crowd authority, validation authority, or training authority.
 * Those remain controlled by the intelligence-source registry and HSPP
 * assessment policy.
 */
export type ProviderResult = {
  provider: string;
  organizationId: string;
  success: boolean;
  rawCount: number;
  imported: number;
  refreshedExisting: number;
  skippedDuplicates: number;
  mergedDuplicates: number;
  error: string | null;
};
