import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function mapTomTomType(category: number | string | null) {
  const value = String(category || "");

  if (["6", "7", "8", "9"].includes(value)) return "roadblock";
  if (["1", "2", "3"].includes(value)) return "accident";
  if (["4", "5"].includes(value)) return "protest";

  return "roadblock";
}

function mapSeverity(magnitude: number | string | null) {
  const value = Number(magnitude || 0);

  if (value >= 4) return "critical";
  if (value >= 3) return "high";
  if (value >= 2) return "medium";

  return "low";
}

export async function POST() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    if (!process.env.TOMTOM_API_KEY) {
      return NextResponse.json(
        { error: "TOMTOM_API_KEY is not configured." },
        { status: 500 }
      );
    }

    // Cape Town / Western Cape test bounding box
    const bbox = "18.20,-34.10,19.10,-33.60";

    const url =
      "https://api.tomtom.com/traffic/services/5/incidentDetails" +
      `?bbox=${bbox}` +
      "&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},from,to,length,delay}}}" +
      "&language=en-GB" +
      "&timeValidityFilter=present" +
      `&key=${process.env.TOMTOM_API_KEY}`;

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      console.error("TOMTOM ERROR");
      console.error(data);

      return NextResponse.json(
        {
          error: "TomTom request failed.",
          details: data,
        },
        { status: 500 }
      );
    }

    const incidents = data?.incidents || [];

    const rows = incidents
      .map((incident: any) => {
        const coordinates = incident?.geometry?.coordinates;
        const firstPoint = Array.isArray(coordinates?.[0])
          ? coordinates[0]
          : coordinates;

        const longitude = Number(firstPoint?.[0]);
        const latitude = Number(firstPoint?.[1]);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        const props = incident.properties || {};
        const eventDescription =
          props.events?.[0]?.description ||
          props.from ||
          "Traffic incident reported";

        return {
          organization_id: organizationId,
          type: mapTomTomType(props.iconCategory),
          title: eventDescription,
          description: `Automatically imported from TomTom Traffic. Delay: ${props.delay || 0}s. Length: ${props.length || 0}m.`,
          latitude,
          longitude,
          radius_meters: 1200,
          severity: mapSeverity(props.magnitudeOfDelay),
          source: "tomtom",
          status: "active",
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          verified_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: "No active TomTom traffic incidents found.",
      });
    }

    const { error } = await supabase
      .from("route_safety_alerts")
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "TomTom ingestion failed." },
      { status: 500 }
    );
  }
}

