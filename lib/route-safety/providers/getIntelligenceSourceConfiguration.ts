export type IntelligenceSourceConfiguration = {
  sourceKey: string;
  enabled: boolean;
  approvedForIngestion: boolean;
  baseConfidence: number;
};

export type IntelligenceSourceConfigurationResult = {
  configuration: IntelligenceSourceConfiguration | null;
  error: string | null;
};

export type IntelligenceSourceConfigurationLoader = (
  supabase: any,
  sourceKey: string
) => Promise<IntelligenceSourceConfigurationResult>;

export async function getIntelligenceSourceConfiguration(
  supabase: any,
  sourceKey: string
): Promise<IntelligenceSourceConfigurationResult> {
  const { data, error } = await supabase
    .from("intelligence_sources")
    .select(`
      source_key,
      enabled,
      approved_for_ingestion,
      base_confidence
    `)
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (error) {
    return {
      configuration: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      configuration: null,
      error:
        `Intelligence source configuration was not found: ${sourceKey}`,
    };
  }

  const rawBaseConfidence = Number(
    data.base_confidence
  );

  const baseConfidence = Math.min(
    100,
    Math.max(
      0,
      Number.isFinite(rawBaseConfidence)
        ? rawBaseConfidence
        : 0
    )
  );

  return {
    configuration: {
      sourceKey: String(data.source_key),
      enabled: Boolean(data.enabled),
      approvedForIngestion: Boolean(
        data.approved_for_ingestion
      ),
      baseConfidence,
    },
    error: null,
  };
}
