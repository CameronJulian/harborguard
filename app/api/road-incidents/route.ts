import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function cleanString(value: any, fallback = "") {
  return String(value ?? fallback).trim();
}

function cleanNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("road_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      incidents: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load road incidents." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const title = cleanString(body.title);
    const type = cleanString(body.type, "road_alert");
    const severity = cleanString(body.severity, "medium").toLowerCase();
    const latitude = cleanNumber(body.latitude);
    const longitude = cleanNumber(body.longitude);
    const radiusMeters = cleanNumber(body.radius_meters) ?? 500;

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (latitude === null || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Valid latitude is required." }, { status: 400 });
    }

    if (longitude === null || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Valid longitude is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("road_incidents")
      .insert({
        organization_id: organizationId,
        title,
        type,
        severity,
        latitude,
        longitude,
        radius_meters: radiusMeters,
        is_active: body.is_active !== false,
        source: cleanString(body.source, "manual"),
        description: cleanString(body.description),
        expires_at: body.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, incident: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create road incident." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const id = cleanString(body.id);

    if (!id) {
      return NextResponse.json({ error: "Incident id is required." }, { status: 400 });
    }

    const updatePayload: any = {};

    if (body.title !== undefined) updatePayload.title = cleanString(body.title);
    if (body.type !== undefined) updatePayload.type = cleanString(body.type);
    if (body.severity !== undefined) updatePayload.severity = cleanString(body.severity).toLowerCase();
    if (body.description !== undefined) updatePayload.description = cleanString(body.description);
    if (body.source !== undefined) updatePayload.source = cleanString(body.source);
    if (body.expires_at !== undefined) updatePayload.expires_at = body.expires_at || null;
    if (typeof body.is_active === "boolean") updatePayload.is_active = body.is_active;

    if (body.latitude !== undefined) {
      const latitude = cleanNumber(body.latitude);
      if (latitude === null || latitude < -90 || latitude > 90) {
        return NextResponse.json({ error: "Valid latitude is required." }, { status: 400 });
      }
      updatePayload.latitude = latitude;
    }

    if (body.longitude !== undefined) {
      const longitude = cleanNumber(body.longitude);
      if (longitude === null || longitude < -180 || longitude > 180) {
        return NextResponse.json({ error: "Valid longitude is required." }, { status: 400 });
      }
      updatePayload.longitude = longitude;
    }

    if (body.radius_meters !== undefined) {
      const radiusMeters = cleanNumber(body.radius_meters);
      if (radiusMeters === null || radiusMeters <= 0) {
        return NextResponse.json({ error: "Valid radius is required." }, { status: 400 });
      }
      updatePayload.radius_meters = radiusMeters;
    }

    const { data, error } = await supabase
      .from("road_incidents")
      .update(updatePayload)
      .eq("organization_id", organizationId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, incident: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update road incident." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
