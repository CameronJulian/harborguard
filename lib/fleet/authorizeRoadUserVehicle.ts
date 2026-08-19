export type RoadUserVehicleAuthorizationInput = {
  supabase: any;
  organizationId: string;
  userId: string;
  role: string | null | undefined;
  vehicleId: string;
};

export type RoadUserVehicleAuthorizationResult =
  | {
      ok: true;
      vehicle: {
        id: string;
        driver_id: string | null;
        assigned_user_id: string | null;
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

const BROAD_VEHICLE_ROLES = new Set([
  "owner",
  "admin",
  "super_admin",
  "platform_admin",
  "manager",
]);

export async function authorizeRoadUserVehicle({
  supabase,
  organizationId,
  userId,
  role,
  vehicleId,
}: RoadUserVehicleAuthorizationInput): Promise<RoadUserVehicleAuthorizationResult> {
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("id, driver_id, assigned_user_id")
    .eq("id", vehicleId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: error.message,
    };
  }

  if (!vehicle) {
    return {
      ok: false,
      status: 404,
      error: "Vehicle not found.",
    };
  }

  if (BROAD_VEHICLE_ROLES.has(String(role || ""))) {
    return {
      ok: true,
      vehicle,
    };
  }

  if (role !== "operator") {
    return {
      ok: false,
      status: 403,
      error: "Permission denied.",
    };
  }

  if (!vehicle.assigned_user_id) {
    return {
      ok: false,
      status: 403,
      error: "No vehicle is assigned to this road user.",
    };
  }

  if (vehicle.assigned_user_id !== userId) {
    return {
      ok: false,
      status: 403,
      error: "This vehicle is assigned to another road user.",
    };
  }

  return {
    ok: true,
    vehicle,
  };
}
