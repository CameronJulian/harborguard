import { NextResponse } from "next/server";
import { PLAN_LIMITS } from "@/lib/plan-limits";
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

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const { count: vehicleCount, error: countError } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      );
    }

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", organizationId)
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: orgError.message },
        { status: 500 }
      );
    }

    const plan = organization?.plan || "starter";
    const planLimit =
  PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.vehicles ?? 5;

    if ((vehicleCount || 0) >= planLimit) {
      return NextResponse.json(
        { error: "Vehicle limit reached for your plan." },
        { status: 403 }
      );
    }

    const { data: vehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        organization_id: organizationId,
        name: body.name,
        registration_number: body.registration_number || body.registrationNumber || null,
        status: body.status || "active",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle,
    });
  } catch (err: any) {
    const message = err.message || "Failed to create vehicle.";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}