export type ActiveVehicleTrip = {
  id: string;
  status: string;
};

export type GetActiveVehicleTripInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
};

export async function getActiveVehicleTrip(
  input: GetActiveVehicleTripInput
): Promise<ActiveVehicleTrip | null> {
  const {
    supabase,
    organizationId,
    vehicleId,
  } = input;

  const { data: activeTrip } =
    await supabase
      .from("vehicle_trips")
      .select("id, status")
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", organizationId)
      .in("status", [
        "scheduled",
        "en_route_to_port",
        "collecting",
        "en_route_to_fishery",
        "emergency",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  return activeTrip;
}
