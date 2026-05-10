import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganization, requireRole } from "@/lib/server-auth";

const schema = z.object({
  id: z.string().min(1, "Incident id is required."),
});

function generateIncidentReport(incident: any, actorName: string) {
  const code = incident.incident_code || incident.id;
  const type = incident.type || "operational incident";
  const severity = incident.severity || "unknown";
  const description = incident.description || "No description provided.";

  return {
    title: `Incident ${code} resolved`,
    summary: `Incident ${code} was resolved by ${actorName}.`,
    operationalNarrative:
      `A ${severity.toUpperCase()} ${type} incident was reviewed and marked as resolved. ${description}`,
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
    const { supabase, organizationId, role, user, profile } =
      await requireOrganization();

    requireRole(role, ["owner", "admin", "operator"]);

    const body = await req.json();
    const { id } = schema.parse({
      id: String(body.id ?? "").trim(),
    });

    const { data: incident, error: fetchError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !incident) {
      return NextResponse.json(
        { error: "Incident not found." },
        { status: 404 }
      );
    }

    const actorName =
      profile?.full_name || user.email || "Unknown User";

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
      .update({
        status: "Resolved",
      })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (resolveError) {
      return NextResponse.json(
        { error: `Failed to resolve incident: ${resolveError.message}` },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
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
    const message = error.message || "Unexpected server error.";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Permission denied"
        ? 403
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}