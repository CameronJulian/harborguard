export type RouteSafetyAlertRow = {
  organization_id: string;
  type: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  severity: string;
  source: string;
  status: string;
  expires_at: string | null;
  verified_at: string;

  // Provider metadata used for duplicate matching.
  road_name?: string | null;
  road_from?: string | null;
  road_to?: string | null;
  provider_geometry?: unknown;
};
