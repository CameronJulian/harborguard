export type VehicleForLocationUpdate = {
  id: string;
  is_active: boolean | null;
  nickname: string | null;
  registration_number: string | null;
  organization_id: string;
};

export type GetVehicleForLocationUpdateInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
};

export type GetVehicleForLocationUpdateResult = {
  vehicle: VehicleForLocationUpdate | null;
  error: any;
};

export async function getVehicleForLocationUpdate(
  input: GetVehicleForLocationUpdateInput
): Promise<GetVehicleForLocationUpdateResult> {
  const {
    supabase,
    organizationId,
    vehicleId,
  } = input;

  const {
    data: vehicle,
    error,
  } = await supabase
    .from("vehicles")
    .select(`
      id,
      is_active,
      nickname,
      registration_number,
      organization_id
    `)
    .eq("id", vehicleId)
    .eq("organization_id", organizationId)
    .single();

  return {
    vehicle,
    error,
  };
}
