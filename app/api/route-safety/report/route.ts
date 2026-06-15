import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();
    const body = await req.json();

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const radiusMeters = Number(body.radius_meters || 1000);
    const expiresHours = Number(body.expires_hours || 6);

    if (!body.title || !body.type || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "title, type, latitude and longitude are required." },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("route_safety_alerts")
      .insert({
        organization_id: organizationId,
        type: body.type,
        title: body.title,
        description: body.description || null,
        latitude,
        longitude,
        radius_meters: radiusMeters,
        severity: body.severity || "medium",
        source: "operator",
        status: "active",
        created_by: user.id,
        verified_at: new Date().toISOString(),
        expires_at: expiresAt,
        suggested_route: body.suggested_route || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

