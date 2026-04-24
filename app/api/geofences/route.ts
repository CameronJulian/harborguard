import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("geofences")
      .select("*")
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
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const centerLat = Number(body.center_lat);
    const centerLng = Number(body.center_lng);
    const radiusMeters = Number(body.radius_meters);

    if (!name || Number.isNaN(centerLat) || Number.isNaN(centerLng) || Number.isNaN(radiusMeters)) {
      return NextResponse.json(
        { error: "Missing or invalid geofence fields." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("geofences")
      .insert({
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
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
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
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
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
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete geofence." },
      { status: 500 }
    );
  }
}