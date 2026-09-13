import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { reportServerError } from "@/lib/server/reportServerError";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt =
    new Date().toISOString();

  try {
    const {
      error,
    } =
      await supabaseAdmin
        .from("organizations")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .limit(1);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          status: "not_ready",
          checkedAt,
        },
        {
          status: 503,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: "ready",
        checkedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
  catch (error: unknown) {
    reportServerError(error, {
      domain: "platform",
      operation: "readiness",
      boundary: "top-level",
    });

    return NextResponse.json(
      {
        success: false,
        status: "not_ready",
        checkedAt,
      },
      {
        status: 503,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
