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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = schema.parse({
      id: String(body.id ?? "").trim(),
    });

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role")
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
      .select("id, status, incident_code")
      .eq("id", id)
      .single();

    if (fetchError || !incident) {
      return NextResponse.json(
        { error: "Incident not found." },
        { status: 404 }
      );
    }

    if (incident.status === "Resolved") {
      return NextResponse.json({
        success: true,
        message: "Incident is already resolved.",
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

    const actorName = profile.full_name || user.email || "Unknown User";

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_name: actorName,
      action: "Resolved incident",
      batch_code: incident.incident_code ?? null,
      risk: "Low",
    });

    if (auditError) {
      return NextResponse.json(
        { error: `Incident resolved, but audit log failed: ${auditError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Incident resolved successfully.",
    });
  } catch (error: any) {
    console.error("API /api/incidents/resolve error:", error);

    return NextResponse.json(
      { error: error.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}