import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Incident id is required." },
        { status: 400 }
      );
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
      actor_name: "Cameron Hendrick",
      action: "Resolved incident",
      batch_code: null,
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
  } catch (error) {
    console.error("API /api/incidents/resolve error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}