import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";

export async function GET(request: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { searchParams } = new URL(request.url);

    const latitude = searchParams.get("latitude")
      ? Number(searchParams.get("latitude"))
      : undefined;

    const longitude = searchParams.get("longitude")
      ? Number(searchParams.get("longitude"))
      : undefined;

    const radiusMeters = searchParams.get("radiusMeters")
      ? Number(searchParams.get("radiusMeters"))
      : undefined;

    const result = await buildTrafficIntelligence(supabase, organizationId, {
      latitude,
      longitude,
      radiusMeters,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load traffic intelligence." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
