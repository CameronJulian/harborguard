import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { createAuditLog } from "@/lib/audit";

type ResolveIncidentBody = {
  id?: string;
  resolutionNote?: string;
};

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, user } =
      await requireOrganization();

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

    /*
     * Preserve the pre-resolution incident read for audit metadata and
     * existing 404 semantics.
     */
    const {
      data: incident,
      error: incidentError,
    } = await supabase
      .from("incidents")
      .select(
        "id, incident_code, summary, status, vehicle_alert_id"
      )
      .eq("id", incidentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (incidentError || !incident) {
      return NextResponse.json(
        {
          error:
            incidentError?.message ||
            "Incident not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Incident + linked alert resolution must cross one PostgreSQL
     * transaction boundary. The RPC locks and validates both rows before
     * mutation, preventing a partially-resolved lifecycle state.
     */
    const {
      data: resolutionRows,
      error: resolutionError,
    } = await supabase.rpc(
      "resolve_incident_with_linked_alert",
      {
        p_organization_id: organizationId,
        p_incident_id: incidentId,
        p_resolution_note:
          resolutionNote || null,
      }
    );

    if (resolutionError) {
      return NextResponse.json(
        { error: resolutionError.message },
        { status: 500 }
      );
    }

    const resolution =
      Array.isArray(resolutionRows)
        ? resolutionRows[0]
        : resolutionRows;

    if (!resolution) {
      return NextResponse.json(
        {
          error:
            "Incident resolution returned no lifecycle state.",
        },
        { status: 500 }
      );
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
        resolvedAt:
          resolution.lifecycle_resolved_at ??
          new Date().toISOString(),
        resolutionNote,
        linkedVehicleAlertId:
          resolution.linked_vehicle_alert_id ??
          incident.vehicle_alert_id ??
          null,
        linkedAlertResolved:
          resolution.linked_alert_resolved ??
          null,
        atomicLifecycleResolution: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Incident resolved successfully.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to resolve incident.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
