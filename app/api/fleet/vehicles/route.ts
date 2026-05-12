import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function buildMaintenanceProfile(vehicle: any) {
  const mileage = Number(vehicle.mileage_km || 0);
  const batteryHealth = Number(vehicle.battery_health || 100);
  const engineHours = Number(vehicle.engine_hours || 0);
  const serviceInterval = Number(vehicle.service_interval_km || 10000);
  const lastServiceMileage = Number(vehicle.last_service_mileage || 0);

  const kmSinceService = mileage - lastServiceMileage;

  let maintenanceScore = 100;

  if (kmSinceService > serviceInterval) maintenanceScore -= 35;
  else if (kmSinceService > serviceInterval * 0.8) maintenanceScore -= 20;

  if (batteryHealth < 40) maintenanceScore -= 35;
  else if (batteryHealth < 60) maintenanceScore -= 20;

  if (engineHours > 5000) maintenanceScore -= 25;
  else if (engineHours > 3000) maintenanceScore -= 12;

  maintenanceScore = Math.max(0, Math.min(100, maintenanceScore));

  let maintenanceRisk = "Low";

  if (maintenanceScore < 40) maintenanceRisk = "Critical";
  else if (maintenanceScore < 60) maintenanceRisk = "High";
  else if (maintenanceScore < 80) maintenanceRisk = "Medium";

  let prediction = "Vehicle maintenance status stable.";

  if (maintenanceRisk === "Critical") {
    prediction = "Immediate maintenance intervention recommended.";
  } else if (maintenanceRisk === "High") {
    prediction = "Vehicle approaching elevated maintenance risk.";
  } else if (maintenanceRisk === "Medium") {
    prediction = "Preventative maintenance recommended soon.";
  }

  return {
    maintenanceScore,
    maintenanceRisk,
    prediction,
    metrics: {
      mileage,
      batteryHealth,
      engineHours,
      kmSinceService,
      serviceInterval,
    },
  };
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const vehicles = (data || []).map((vehicle) => ({
      ...vehicle,
      maintenanceProfile: buildMaintenanceProfile(vehicle),
    }));

    return NextResponse.json({
      success: true,
      organizationId,
      vehicles,
    });
  } catch (err: any) {
    const message = err.message || "Failed to load vehicles.";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}