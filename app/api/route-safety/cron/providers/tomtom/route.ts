import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getCronContext(request: Request) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      response: NextResponse.json(
        {
          error:
            "CRON_SECRET is not configured.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const authorization =
    request.headers.get("authorization");

  if (
    authorization !==
    `Bearer ${cronSecret}`
  ) {
    return {
      response: NextResponse.json(
        {
          error:
            "Unauthorized cron request.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      response: NextResponse.json(
        {
          error:
            "Supabase service-role configuration is incomplete.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const trafficOrganizationId =
    process.env
      .TRAFFIC_IMPORT_ORGANIZATION_ID
      ?.trim();

  if (!trafficOrganizationId) {
    return {
      response: NextResponse.json(
        {
          error:
            "TRAFFIC_IMPORT_ORGANIZATION_ID is not configured.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const supabase =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

  const {
    data: organization,
    error: organizationError,
  } =
    await supabase
      .from("organizations")
      .select("id")
      .eq(
        "id",
        trafficOrganizationId
      )
      .maybeSingle();

  if (organizationError) {
    throw organizationError;
  }

  if (!organization) {
    return {
      response: NextResponse.json(
        {
          error:
            "TRAFFIC_IMPORT_ORGANIZATION_ID does not match an organization.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  return {
    supabase,
    organizationId:
      trafficOrganizationId,
  };
}
import {
  getIntelligenceSourceConfiguration,
} from "@/lib/route-safety/providers/getIntelligenceSourceConfiguration";

import {
  importTomTomIncidents,
} from "@/lib/route-safety/providers/importTomTomIncidents";

export async function GET(
  request: Request
) {
  try {
    const context =
      await getCronContext(request);

    if ("response" in context) {
      return context.response;
    }

    const {
      supabase,
      organizationId,
    } = context;

    const providerResult =
      await importTomTomIncidents(
        supabase,
        organizationId,
        getIntelligenceSourceConfiguration
      );

    return NextResponse.json({
      phase: "tomtom",
      organizationId,
      providerResult,
    });
  } catch (error: unknown) {
    console.error(
      "[route-safety TomTom cron]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "TomTom provider cron failed.",
      },
      {
        status: 500,
      }
    );
  }
}