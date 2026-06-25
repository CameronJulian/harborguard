import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function mapHereSeverity(criticality?: string) {
  const value = String(criticality || "").toLowerCase();

  if (value.includes("critical") || value.includes("major")) return "critical";
  if (value.includes("high")) return "high";
  if (value.includes("medium")) return "medium";

  return "low";
}

function mapHereType(description: string) {
  const text = description.toLowerCase();

  if (text.includes("traffic light") || text.includes("signal")) {
    return "traffic_light_outage";
  }

  if (text.includes("roadblock") || text.includes("road closed") || text.includes("closure")) {
    return "roadblock";
  }

  if (text.includes("accident") || text.includes("crash") || text.includes("collision")) {
    return "accident";
  }

  if (text.includes("protest")) {
    return "protest";
  }

  return "roadblock";
}

function getLatLng(incident: any) {
  const shape = incident?.location?.shape?.links?.[0]?.points?.[0];

  if (shape?.lat && shape?.lng) {
    return {
      latitude: Number(shape.lat),
      longitude: Number(shape.lng),
    };
  }

  const point = incident?.location?.polyline?.points?.[0];

  if (point?.lat && point?.lng) {
    return {
      latitude: Number(point.lat),
      longitude: Number(point.lng),
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    if (!process.env.HERE_API_KEY) {
      return NextResponse.json(
        { error: "HERE_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const latitude = Number(body.latitude || -33.9249);
    const longitude = Number(body.longitude || 18.4241);
    const radiusMeters = Number(body.radiusMeters || 10000);

    const url =
      `https://data.traffic.hereapi.com/v7/incidents` +
      `?in=circle:${latitude},${longitude};r=${radiusMeters}` +
      `&locationReferencing=shape` +
      `&apikey=${process.env.HERE_API_KEY}`;

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "HERE Traffic request failed.", details: data },
        { status: 500 }
      );
    }

    const incidents = data.results || [];

    let rows = incidents
      .map((incident: any) => {
        const details = incident.incidentDetails || {};
        const description =
          details.description?.value ||
          details.summary?.value ||
          details.type ||
          "HERE traffic incident";

        const coords = getLatLng(incident);

        if (!coords) return null;

        return {
          organization_id: organizationId,
          type: mapHereType(description),
          title: description.slice(0, 120),
          description,
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius_meters: 1000,
          severity: mapHereSeverity(details.criticality),
          source: "here_traffic",
          status: "active",
          expires_at: details.endTime || null,
          verified_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    const { data: existingAlerts } = await supabase
      .from("route_safety_alerts")
      .select("title, latitude, longitude")
      .eq("organization_id", organizationId)
      .eq("source", "here_traffic")
      .eq("status", "active");

    const existingKeys = new Set(
      (existingAlerts || []).map((alert: any) => {
        const lat = Number(alert.latitude).toFixed(5);
        const lng = Number(alert.longitude).toFixed(5);
        return `${alert.title}|${lat}|${lng}`;
      })
    );

    const beforeDedupeCount = rows.length;

    rows = rows.filter((row: any) => {
      const lat = Number(row.latitude).toFixed(5);
      const lng = Number(row.longitude).toFixed(5);
      const key = `${row.title}|${lat}|${lng}`;
      return !existingKeys.has(key);
    });

    const skippedDuplicates = beforeDedupeCount - rows.length;
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: skippedDuplicates > 0
          ? "HERE incidents already imported. No new incidents added."
          : "HERE returned no importable incidents for this area.",
        rawCount: incidents.length,
        skippedDuplicates,
      });
    }

    const { data: inserted, error } = await supabase
      .from("route_safety_alerts")
      .insert(rows)
      .select("id, type, title, severity, source");

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      rawCount: incidents.length,
      skippedDuplicates,
      alerts: inserted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "HERE incident import failed." },
      { status: 500 }
    );
  }
}

