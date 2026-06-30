import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { calculateHereRoutes } from "@/lib/routing/hereRouting";

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

    const result = await calculateHereRoutes(origin, destination);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
