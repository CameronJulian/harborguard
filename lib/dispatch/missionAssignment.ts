import { buildFleetOptimization } from "@/lib/fleet/optimizationEngine";
import { calculateHereRoutes } from "@/lib/routing/hereRouting";

type MissionAssignmentInput = {
  incidentId?: string | null;
  destination: {
    lat: number;
    lng: number;
  };
  priority?: string;
  missionType?: string;
  notes?: string;
};

export async function buildMissionAssignment(
  supabase: any,
  organizationId: string,
  input: MissionAssignmentInput
) {
  const {
    incidentId = null,
    destination,
    priority = "normal",
    missionType = "dispatch",
    notes = "",
  } = input;

  if (!destination?.lat || !destination?.lng) {
    throw new Error("destination.lat and destination.lng are required.");
  }

  const optimization = await buildFleetOptimization(supabase, organizationId);

  const vehicle =
    optimization.summary?.bestCandidate ||
    optimization.candidates?.[0];

  if (!vehicle) {
    throw new Error("No dispatch candidate available.");
  }

  if (!vehicle.latitude || !vehicle.longitude) {
    throw new Error("Best candidate does not have a live location.");
  }

  const routing = await calculateHereRoutes(
    {
      lat: vehicle.latitude,
      lng: vehicle.longitude,
    },
    {
      lat: destination.lat,
      lng: destination.lng,
    }
  );

  const selectedRoute = routing.routes?.[0] || null;

  const routeAssignment = {
    organization_id: organizationId,
    vehicle_id: vehicle.vehicleId,
    route_data: {
      provider: routing.provider || "unknown",
      destination,
      selectedRoute,
      alternatives: routing.routes || [],
      optimization: vehicle,
      priority,
      notes,
      incidentId,
      missionType,
    },
    status: "assigned",
    created_at: new Date().toISOString(),
  };

  const dispatchMission = {
    organization_id: organizationId,
    incident_id: incidentId,
    assigned_vehicle_id: vehicle.vehicleId,
    mission_type: missionType,
    priority,
    status: "Assigned",
    pickup_lat: vehicle.latitude,
    pickup_lng: vehicle.longitude,
    destination_lat: destination.lat,
    destination_lng: destination.lng,
    route_data: {
      provider: routing.provider || "unknown",
      optimization: vehicle,
      selectedRoute,
      alternatives: routing.routes || [],
      routeRecommendation: routing.recommendation,
    },
    notes,
    assigned_at: new Date().toISOString(),
  };

  return {
    vehicle,
    selectedRoute,
    routing,
    routeAssignment,
    dispatchMission,
    recommendation: routing.recommendation,
    message: `Assigned ${vehicle.vehicleName} using Fleet Optimization and HERE Routing.`,
  };
}
