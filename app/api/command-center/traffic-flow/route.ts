import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const corridors = [
  { road: "N1 South", currentSpeed: 43, freeFlowSpeed: 100, confidence: 0.96 },
  { road: "N2 East", currentSpeed: 62, freeFlowSpeed: 90, confidence: 0.94 },
  { road: "R300", currentSpeed: 38, freeFlowSpeed: 80, confidence: 0.91 },
  { road: "M5", currentSpeed: 54, freeFlowSpeed: 70, confidence: 0.89 },
  { road: "Voortrekker Road", currentSpeed: 28, freeFlowSpeed: 60, confidence: 0.87 },
];

function congestionPercent(currentSpeed: number, freeFlowSpeed: number) {
  if (!freeFlowSpeed) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - currentSpeed / freeFlowSpeed) * 100)));
}

function delayMinutes(currentSpeed: number, freeFlowSpeed: number) {
  const congestion = congestionPercent(currentSpeed, freeFlowSpeed);
  return Math.round(congestion / 4);
}

function riskLevel(congestion: number) {
  if (congestion >= 70) return "critical";
  if (congestion >= 40) return "high";
  if (congestion >= 20) return "medium";
  return "low";
}

export async function GET() {
  try {
    await requireOrganization();

    const flow = corridors.map((item, index) => {
      const congestion = congestionPercent(item.currentSpeed, item.freeFlowSpeed);

      return {
        id: `traffic-flow-${index + 1}`,
        road: item.road,
        currentSpeed: item.currentSpeed,
        freeFlowSpeed: item.freeFlowSpeed,
        congestion,
        delayMinutes: delayMinutes(item.currentSpeed, item.freeFlowSpeed),
        confidence: item.confidence,
        riskLevel: riskLevel(congestion),
        source: process.env.HERE_API_KEY ? "here_flow_ready" : "demo_flow",
        recommendedAction:
          congestion >= 70
            ? "Avoid corridor and prepare reroute."
            : congestion >= 40
            ? "Monitor ETA impact and consider alternate route."
            : congestion >= 20
            ? "Warn dispatcher of moderate delay."
            : "Traffic flow normal.",
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        corridors: flow.length,
        critical: flow.filter((item) => item.riskLevel === "critical").length,
        high: flow.filter((item) => item.riskLevel === "high").length,
        averageCongestion: Math.round(flow.reduce((sum, item) => sum + item.congestion, 0) / flow.length),
        averageDelay: Math.round(flow.reduce((sum, item) => sum + item.delayMinutes, 0) / flow.length),
      },
      flow,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load traffic flow." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
