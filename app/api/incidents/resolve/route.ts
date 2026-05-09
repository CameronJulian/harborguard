import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  id: z.string().min(1, "Incident id is required."),
});

function getAccessToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie") || "";

  const cookieToken = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("sb-access-token="))
    ?.replace("sb-access-token=", "");

  return (
    authHeader?.replace("Bearer ", "").trim() ||
    (cookieToken ? decodeURIComponent(cookieToken) : undefined)
  );
}

function generateIncidentReport(incident: any, actorName: string) {
  const code = incident.incident_code || incident.id;
  const type = incident.type || "operational incident";
  const severity = incident.severity || "unknown";
  const description = incident.description || "No description provided.";

  return {
    title: `Incident ${code} resolved`,
    summary: `Incident ${code} was resolved by ${actorName}.`,
    operationalNarrative: `A ${severity.toUpperCase()} ${type} incident was reviewed and marked as resolved. ${description}`,
    probableCause:
      severity === "critical"
        ? "High-severity operational deviation or safety risk detected."
        : "Operational exception detected and reviewed.",
    resolutionAction:
      "Incident status was updated to Resolved and logged for audit tracking.",
    complianceNote:
      "Resolution was recorded with user attribution for operational traceability.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = schema.parse({
      id: String(body.id ?? "").trim(),
    });

    const token = getAccessToken(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found." },
        { status: 403 }
      );
    }

    if (profile.role === "viewer") {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const { data: incident, error: fetchError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !incident) {
      return NextResponse.json(
        { error: "Incident not found." },
        { status: 404 }
      );
    }

    if (incident.organization_id && incident.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const actorName = profile.full_name || user.email || "Unknown User";
    const report = generateIncidentReport(incident, actorName);

    if (incident.status === "Resolved") {
      return NextResponse.json({
        success: true,
        message: "Incident is already resolved.",
        report,
      });
    }

    const { error: resolveError } = await supabase
      .from("incidents")
      .update({ status: "Resolved" })
      .eq("id", id);

    if (resolveError) {
      return NextResponse.json(
        { error: `Failed to resolve incident: ${resolveError.message}` },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_name: actorName,
      action: `Resolved incident with AI report: ${report.summary}`,
      batch_code: incident.incident_code ?? null,
      risk: incident.severity || "Low",
    });

    if (auditError) {
      return NextResponse.json(
        {
          error: `Incident resolved, but audit log failed: ${auditError.message}`,
          report,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Incident resolved successfully.",
      report,
    });
  } catch (error: any) {
    console.error("API /api/incidents/resolve error:", error);

    return NextResponse.json(
      { error: error.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}