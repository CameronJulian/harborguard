import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

export async function GET() {
  try {
    await requirePlatformAdmin();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    if (message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }

    if (message === "Forbidden") {
      return jsonError("Forbidden", 403);
    }

    return jsonError("Authentication failed", 500);
  }

  try {
    const [
      organizations,
      vehicles,
      incidents,
      professional,
    ] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id", { count: "exact", head: true }),

      supabaseAdmin
        .from("vehicles")
        .select("id", { count: "exact", head: true }),

      supabaseAdmin
        .from("incidents")
        .select("id", { count: "exact", head: true }),

      supabaseAdmin
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("plan", "professional"),
    ]);

    const results = [
      organizations,
      vehicles,
      incidents,
      professional,
    ];

    if (
      results.some(
        (result) =>
          result.error !== null ||
          result.count === null ||
          !Number.isSafeInteger(result.count) ||
          result.count < 0
      )
    ) {
      console.error(
        "Platform metrics query failed:",
        results.map((result) => result.error?.code ?? "COUNT_CHECK")
      );

      return jsonError("Failed to load platform metrics", 500);
    }

    return NextResponse.json(
      {
        success: true,
        metrics: {
          organization_count: organizations.count,
          vehicle_count: vehicles.count,
          incident_count: incidents.count,
          professional_count: professional.count,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return jsonError("Failed to load platform metrics", 500);
  }
}