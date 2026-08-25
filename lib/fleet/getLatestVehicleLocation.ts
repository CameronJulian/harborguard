export type LatestVehicleLocation = {
  latitude: number | string | null;
  longitude: number | string | null;
  speed_kmh: number | string | null;
  heading: number | string | null;
  road_speed_limit_kmh: number | string | null;
  road_speed_limit_resolved_at: string | null;
  road_speed_limit_resolved_latitude: number | string | null;
  road_speed_limit_resolved_longitude: number | string | null;
  recorded_at: string;
};

export type GetLatestVehicleLocationInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
};

export async function getLatestVehicleLocation(
  input: GetLatestVehicleLocationInput
): Promise<LatestVehicleLocation | null> {
  const {
    supabase,
    organizationId,
    vehicleId,
  } = input;

  const { data: lastPoint } =
    await supabase
      .from("vehicle_locations")
      .select(
        "latitude, longitude, speed_kmh, heading, road_speed_limit_kmh, road_speed_limit_resolved_at, road_speed_limit_resolved_latitude, road_speed_limit_resolved_longitude, recorded_at"
      )
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  return lastPoint;
}
