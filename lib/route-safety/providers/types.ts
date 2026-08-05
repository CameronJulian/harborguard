export type ProviderResult = {
  provider: "here" | "tomtom";
  organizationId: string;
  success: boolean;
  rawCount: number;
  imported: number;
  refreshedExisting: number;
  skippedDuplicates: number;
  mergedDuplicates: number;
  error: string | null;
};
