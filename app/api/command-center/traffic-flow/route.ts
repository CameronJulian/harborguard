import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { getHereTrafficFlow } from "@/lib/here/traffic";

export async function GET(request: Request) {
  try {
    await requireOrganization();

    const { searchParams } = new URL(request.url);

    const latitude = Number(searchParams.get("latitude") || -33.9249);
    const longitude = Number(searchParams.get("longitude") || 18.4241);
    const radiusMeters = Number(searchParams.get("radiusMeters") || 10000);

    const traffic = await getHereTrafficFlow({
      latitude,
      longitude,
      radiusMeters,
    });

    const flow = traffic.flow;

    return NextResponse.json({
      success: true,
      summary: {
        corridors: flow.length,
        critical: flow.filter((item: any) => item.riskLevel === "critical").length,
        high: flow.filter((item: any) => item.riskLevel === "high").length,
        averageCongestion: flow.length
          ? Math.round(
              flow.reduce(
                (sum: number, item: any) => sum + Number(item.congestion || 0),
                0
              ) / flow.length
            )
          : 0,
        averageDelay: flow.length
          ? Math.round(
              flow.reduce(
                (sum: number, item: any) => sum + Number(item.delayMinutes || 0),
                0
              ) / flow.length
            )
          : 0,
        rawCount: traffic.rawCount,
        latitude,
        longitude,
        radiusMeters,
      },
      flow,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load HERE traffic flow." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
