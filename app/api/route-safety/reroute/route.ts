import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    await requireOrganization();

    const body = await req.json();
    const { origin, destination } = body;

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json(
        { error: "origin.lat, origin.lng, destination.lat and destination.lng are required." },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_ROUTES_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_ROUTES_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_ROUTES_API_KEY,
          "X-Goog-FieldMask":
            "routes.duration,routes.staticDuration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline,routes.legs",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: Number(origin.lat),
                longitude: Number(origin.lng),
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: Number(destination.lat),
                longitude: Number(destination.lng),
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: true,
          units: "METRIC",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Google Routes request failed.", details: data },
        { status: 500 }
      );
    }

    const routes = (data.routes || []).map((route: any, index: number) => ({
      index,
      label: index === 0 ? "Current best route" : `Alternative route ${index}`,
      distanceMeters: route.distanceMeters || 0,
      duration: route.duration || null,
      staticDuration: route.staticDuration || null,
      description: route.description || null,
      encodedPolyline: route.polyline?.encodedPolyline || null,
    }));

    return NextResponse.json({
      success: true,
      routes,
      recommendation:
        routes.length > 1
          ? "Alternative routes are available. Compare ETA and distance before rerouting."
          : "No alternate Google route returned for this trip.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}


