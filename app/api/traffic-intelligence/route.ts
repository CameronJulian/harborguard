import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function trafficRiskScore(incidentCount: number, avgCongestion: number, criticalCount: number) {
  return Math.min(100, Math.round(avgCongestion + incidentCount * 6 + criticalCount * 15));
}

function riskLevel(score: number) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function recommendedAction(level: string) {
  if (level === "critical") return "Escalate traffic risk and prepare immediate reroutes.";
  if (level === "high") return "Warn dispatchers and review high-risk corridors.";
  if (level === "medium") return "Monitor traffic conditions and ETA impact.";
  return "Traffic conditions are stable. Continue routine monitoring.";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const now = new Date().toISOString();

    const { data: incidents, error: incidentsError } = await supabase
      .from("road_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    const criticalCount = (incidents || []).filter((item: any) =>
      ["critical", "high"].includes(String(item.severity || "").toLowerCase())
    ).length;

    let flow: any[] = [];
    let flowError: string | null = null;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/command-center/traffic-flow`, {
        cache: "no-store",
        headers: {
          "x-harborguard-internal": "traffic-intelligence",
        },
      });

      const result = await response.json();

      if (response.ok) {
        flow = result.flow || [];
      } else {
        flowError = result.error || "Traffic flow unavailable.";
      }
    } catch (error: any) {
      flowError = error.message || "Traffic flow unavailable.";
    }

    const averageCongestion = flow.length
      ? Math.round(flow.reduce((sum, item) => sum + Number(item.congestion || 0), 0) / flow.length)
      : 0;

    const averageDelay = flow.length
      ? Math.round(flow.reduce((sum, item) => sum + Number(item.delayMinutes || 0), 0) / flow.length)
      : 0;

    const score = trafficRiskScore((incidents || []).length, averageCongestion, criticalCount);
    const level = riskLevel(score);

    const intelligence = {
      score,
      level,
      recommendedAction: recommendedAction(level),
      incidents: incidents || [],
      flow,
      sources: {
        incidents: "road_incidents",
        flow: flow.length > 0 ? "here_flow_live" : "unavailable",
      },
      warnings: flowError ? [flowError] : [],
    };

    return NextResponse.json({
      success: true,
      summary: {
        riskScore: score,
        riskLevel: level,
        activeIncidents: incidents?.length || 0,
        criticalIncidents: criticalCount,
        flowCorridors: flow.length,
        averageCongestion,
        averageDelay,
      },
      intelligence,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load traffic intelligence." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
