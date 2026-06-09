import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { createAuditLog } from "@/lib/audit";

type ResolveIncidentBody = {
  id?: string;
  resolutionNote?: string;
};

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();

    const body = (await req.json()) as ResolveIncidentBody;
    const incidentId = String(body.id || "").trim();

const resolutionNote = String(
  body.resolutionNote || ""
).trim();

    if (!incidentId) {
      return NextResponse.json(
        { error: "Incident id is required." },
        { status: 400 }
      );
    }

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("id, incident_code, summary, status")
      .eq("id", incidentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (incidentError || !incident) {
      return NextResponse.json(
        { error: incidentError?.message || "Incident not found." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("incidents")
      .update({
        status: "Resolved",
        resolved_by: user?.id ?? null,
        resolved_at: new Date().toISOString(),
        resolution_note: resolutionNote || null,
      })
      .eq("id", incidentId)
      .eq("organization_id", organizationId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await createAuditLog({
      organizationId,
      userId: user?.id ?? null,
      action: "incident.resolved",
      target: incidentId,
      metadata: {
        incidentCode: incident.incident_code,
        previousStatus: incident.status,
        summary: incident.summary,
        resolvedAt: new Date().toISOString(),
        resolutionNote,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Incident resolved successfully.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to resolve incident.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}






