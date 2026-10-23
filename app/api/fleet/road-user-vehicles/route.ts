import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const BROAD_VEHICLE_ROLES = new Set([
  "owner",
  "admin",
  "super_admin",
  "platform_admin",
  "manager",
]);

export async function GET() {
  try {
    const {
      supabase,
      organizationId,
      user,
      role,
    } = await requireOrganization();

    let query = supabase
      .from("vehicles")
      .select(`
        id,
        nickname,
        registration_number,
        make,
        model,
        is_active,
        assigned_user_id
      `)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!BROAD_VEHICLE_ROLES.has(String(role || ""))) {
      if (role !== "operator") {
        return NextResponse.json(
          { error: "Permission denied." },
          { status: 403 }
        );
      }

      query = query.eq("assigned_user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const authorizedVehicles = data || [];
    const vehicleIds = authorizedVehicles.map((vehicle) => vehicle.id);

    if (vehicleIds.length === 0) {
      return NextResponse.json({
        success: true,
        vehicles: [],
      });
    }

    const { data: activeTrips, error: tripsError } = await supabase
      .from("vehicle_trips")
      .select(`
        id,
        vehicle_id,
        status,
        expected_route,
        origin_port,
        destination_fishery,
        created_at
      `)
      .eq("organization_id", organizationId)
      .in("vehicle_id", vehicleIds)
      .in("status", [
        "scheduled",
        "en_route_to_port",
        "collecting",
        "en_route_to_fishery",
        "emergency",
      ])
      .order("created_at", { ascending: false });

    if (tripsError) {
      return NextResponse.json(
        { error: tripsError.message },
        { status: 500 }
      );
    }

    const activeTripByVehicle = new Map<
      string,
      {
        id: string;
        status: string;
        expectedRoute: unknown;
        originPort: string | null;
        destinationFishery: string | null;
      }
    >();

    for (const trip of activeTrips || []) {
      if (!trip.vehicle_id || activeTripByVehicle.has(trip.vehicle_id)) {
        continue;
      }

      activeTripByVehicle.set(trip.vehicle_id, {
        id: trip.id,
        status: trip.status,
        expectedRoute: trip.expected_route,
        originPort: trip.origin_port,
        destinationFishery: trip.destination_fishery,
      });
    }

    return NextResponse.json({
      success: true,
      vehicles: authorizedVehicles.map((vehicle) => ({
        ...vehicle,
        activeTrip: activeTripByVehicle.get(vehicle.id) || null,
      })),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load road-user vehicles.";

    const status =
      message === "Unauthorized" ? 401 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
