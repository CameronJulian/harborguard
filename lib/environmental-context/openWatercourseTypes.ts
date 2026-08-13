export type OpenWatercourseContext = {
  provider: "city_of_cape_town";

  providerFeatureId: string | null;

  riverName: string | null;

  watercourseType: string | null;

  classification: string | null;

  description: string | null;

  channelMaterial: string | null;

  floodplainMaterial: string | null;

  gradient: number | null;

  status: string | null;

  streamOrder: number | null;

  catchment: string | null;

  ownership: string | null;

  maintenanceAuthority: string | null;

  distanceMeters: number;
};

export type ResolveOpenWatercourseContextParams = {
  latitude: number;
  longitude: number;

  /**
   * Maximum distance from the supplied coordinate.
   *
   * Open-watercourse context is explanatory environmental
   * context only and does not itself imply flooding.
   */
  searchRadiusMeters?: number;
};