import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET() {
  try {

    const { supabase, organizationId } =
      await requireOrganization();

    const { data: missions } =
      await supabase
        .from("dispatch_missions")
        .select(`
          *,
          vehicles:assigned_vehicle_id (
            id,
            registration_number
          )
        `)
        .eq("organization_id", organizationId)
        .in("status", [
          "Accepted",
          "En Route",
          "Arrived",
          "In Progress"
        ]);

    const { data: locations } =
      await supabase
        .from("vehicle_locations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("recorded_at", {
          ascending: false
        });

    const latest = new Map();

    for (const location of locations || []) {

      if (!latest.has(location.vehicle_id)) {
        latest.set(location.vehicle_id, location);
      }

    }

    const tracking = [];

    for (const mission of missions || []) {

      const location =
        latest.get(mission.assigned_vehicle_id);

      if (!location)
        continue;

      tracking.push({

        missionId: mission.id,

        vehicle:
          mission.vehicles?.registration_number,

        status: mission.status,

        latitude:
          location.latitude,

        longitude:
          location.longitude,

        speed:
          location.speed_kmh,

        destination: {
          lat: mission.destination_lat,
          lng: mission.destination_lng,
        },

        lastSeen:
          location.recorded_at,

      });

    }

    return NextResponse.json({
      success: true,
      tracking,
    });

  } catch (error: any) {

    return NextResponse.json(
      {
        error:
          error.message ||
          "Tracking failed."
      },
      {
        status:
          error.message === "Unauthorized"
            ? 401
            : 500
      }
    );

  }
}