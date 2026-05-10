import { NextResponse } from "next/server";
import { requireOrganization, requireRole } from "@/lib/server-auth";

function getStatus(error: any) {
  const message = error?.message || "";

  if (message === "Unauthorized") return 401;
  if (message === "Permission denied") return 403;

  return 500;
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data, error } = await supabase
      .from("geofences")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      geofences: data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load geofences." },
      { status: getStatus(err) }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    requireRole(role, ["owner", "admin", "operator"]);

    const body = await req.json();

    const name = String(body.name || "").trim();
    const centerLat = Number(body.center_lat);
    const centerLng = Number(body.center_lng);
    const radiusMeters = Number(body.radius_meters);

    if (
      !name ||
      Number.isNaN(centerLat) ||
      Number.isNaN(centerLng) ||
      Number.isNaN(radiusMeters)
    ) {
      return NextResponse.json(
        { error: "Missing or invalid geofence fields." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("geofences")
      .insert({
        organization_id: organizationId,
        name,
        center_lat: centerLat,
        center_lng: centerLng,
        radius_meters: radiusMeters,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      geofence: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create geofence." },
      { status: getStatus(err) }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    requireRole(role, ["owner", "admin", "operator"]);

    const body = await req.json();

    const id = String(body.id || "").trim();
    const isActive = body.is_active;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "id and is_active are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("geofences")
      .update({
        is_active: isActive,
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      geofence: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update geofence." },
      { status: getStatus(err) }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    requireRole(role, ["owner", "admin"]);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("geofences")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete geofence." },
      { status: getStatus(err) }
    );
  }
}