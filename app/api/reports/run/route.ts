import { NextResponse } from "next/server";
import { requireOrganization, requireRole } from "@/lib/server-auth";
import { requirePremiumAccess } from "@/lib/require-premium";

function buildExecutiveNarrative(period: string, result: any) {
  const totalVehicles = result?.summary?.totalVehicles || 0;
  const activeThreats = result?.summary?.activeThreats || 0;
  const criticalThreats = result?.summary?.criticalThreats || 0;
  const resolvedIncidents = result?.summary?.resolvedIncidents || 0;
  const threatScore = result?.summary?.globalThreatScore || 0;

  let operationalStatus = "Stable";

  if (threatScore >= 80) operationalStatus = "Critical";
  else if (threatScore >= 60) operationalStatus = "High Alert";
  else if (threatScore >= 40) operationalStatus = "Elevated";

  return {
    title: `${period.toUpperCase()} Executive Fleet Intelligence Report`,
    operationalStatus,
    executiveSummary:
      `Fleet operations currently classified as ${operationalStatus}. ` +
      `${criticalThreats} critical threats detected with ` +
      `${activeThreats} active operational alerts across ` +
      `${totalVehicles} monitored vehicles.`,
    operationalNarrative:
      `Autonomous monitoring systems identified ongoing operational risk patterns ` +
      `including behavioral anomalies, route deviations, and active fleet alerts. ` +
      `Operational telemetry indicates a global threat index of ${threatScore}/100.`,
    recommendations: [
      "Review critical vehicle threat escalations immediately.",
      "Investigate recurring driver behavioral anomalies.",
      "Audit high-risk fleet movement patterns.",
      "Validate operational geofence compliance.",
      "Review unresolved incidents requiring escalation.",
    ],
    metrics: {
      totalVehicles,
      activeThreats,
      criticalThreats,
      resolvedIncidents,
      threatScore,
    },
  };
}

export async function POST(req: Request) {
  try {
    const { organizationId, role } = await requireOrganization();
	const premium = await requirePremiumAccess(organizationId);

if (!premium.allowed) {
  return NextResponse.json(
    { error: "Professional subscription required." },
    { status: 403 }
  );
}

    requireRole(role, ["owner", "admin", "operator"]);

    const body = await req.json();

    const period = body.period === "weekly" ? "weekly" : "daily";

    const cronSecret = process.env.CRON_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${siteUrl}/api/reports/cron?period=${period}&organizationId=${organizationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
        cache: "no-store",
      }
    );

    const rawText = await response.text();

    let result: any;

    try {
      result = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Expected JSON from cron route but received non-JSON response.",
          details: rawText.slice(0, 300),
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: result.error || "Failed to run reports.",
        },
        { status: response.status }
      );
    }

    const executiveReport = buildExecutiveNarrative(period, result);

    return NextResponse.json({
      success: true,
      organizationId,
      executiveReport,
      ...result,
    });
  } catch (err: any) {
    const message = err.message || "Manual report run failed.";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Permission denied"
        ? 403
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}