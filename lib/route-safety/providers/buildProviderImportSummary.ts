import type {
  ProviderResult,
} from "@/lib/route-safety/providers/types";

export type ProviderImportSummary = {
  providerRuns: number;
  imported: number;
  refreshedExisting: number;
  skippedDuplicates: number;
  mergedDuplicates: number;
  failedProviders: number;
};

export function buildProviderImportSummary(
  results: ProviderResult[]
): ProviderImportSummary {
  const imported = results.reduce(
    (total, result) =>
      total + result.imported,
    0
  );

  const refreshedExisting = results.reduce(
    (total, result) =>
      total + result.refreshedExisting,
    0
  );

  const skippedDuplicates = results.reduce(
    (total, result) =>
      total + result.skippedDuplicates,
    0
  );

  const mergedDuplicates = results.reduce(
    (total, result) =>
      total + result.mergedDuplicates,
    0
  );

  const failedProviders = results.filter(
    (result) => !result.success
  ).length;

  return {
    providerRuns: results.length,
    imported,
    refreshedExisting,
    skippedDuplicates,
    mergedDuplicates,
    failedProviders,
  };
}
