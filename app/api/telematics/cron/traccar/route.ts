import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reportServerError } from "@/lib/server/reportServerError";
import {
  runTraccarPositionSync,
} from "@/lib/telematics/runTraccarPositionSync";
import {
  resolveTraccarIntegrationConfiguration,
} from "@/lib/telematics/resolveTraccarIntegrationConfiguration";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const cronSecret =
      process.env.CRON_SECRET;

    if (!cronSecret) {
      reportServerError(
        new Error("CRON_SECRET is not configured."),
        {
          domain: "telematics",
          operation: "traccar-cron",
          boundary: "cron-secret-missing",
        }
      );

      return NextResponse.json(
        {
          error:
            "CRON_SECRET is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          error:
            "Unauthorized cron request.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      reportServerError(
        new Error("Supabase service-role configuration is incomplete."),
        {
          domain: "telematics",
          operation: "traccar-cron",
          boundary: "supabase-service-role-config",
        }
      );

      return NextResponse.json(
        {
          error:
            "Supabase service-role configuration is incomplete.",
        },
        {
          status: 500,
        }
      );
    }

    const supabase = createClient(
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
      data: integrations,
      error: integrationError,
    } = await supabase
      .from("telematics_integrations")
      .select("organization_id, credential_source, credential_reference, base_url")
      .eq("provider", "traccar")
      .eq("enabled", true)
      .order("organization_id", {
        ascending: true,
      });

    if (integrationError) {
      throw integrationError;
    }

    const enabledIntegrations =
      integrations ?? [];

    const organizationResults: Array<{
      organizationId: string;
      success: boolean;
      result?: unknown;
      error?: string;
    }> = [];

    for (const integration of enabledIntegrations) {
      const organizationId =
        integration.organization_id;

      try {
        const configuration =
          resolveTraccarIntegrationConfiguration({
            organizationId,
            credentialSource:
              integration.credential_source,
            credentialReference:
              integration.credential_reference,
            baseUrl:
              integration.base_url,
          });

        const result =
          await runTraccarPositionSync({
            supabase,
            organizationId,
            configuration,
          });

        organizationResults.push({
          organizationId,
          success: true,
          result,
        });
      } catch (error: unknown) {

        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string" &&
                error.trim()
              ? error.trim()
              : "Traccar position sync failed.";

        console.error(
          "[traccar position cron organization]",
          {
            organizationId,
            error,
          }
        );

        reportServerError(
          error,
          {
            domain: "telematics",
            operation: "traccar-cron",
            boundary: "organization-sync",
            extra: {
              organizationId,
            },
          }
        );

        organizationResults.push({
          organizationId,
          success: false,
          error: message,
        });
      }
    }

    const succeeded =
      organizationResults.filter(
        (entry) => entry.success
      ).length;

    const failed =
      organizationResults.length -
      succeeded;

    return NextResponse.json({
      success: failed === 0,
      provider: "traccar",
      integrations: enabledIntegrations.length,
      succeeded,
      failed,
      organizations: organizationResults,
    });
  }
  catch (error: unknown) {

    console.error(
      "[traccar position cron]",
      error
    );

    reportServerError(
      error,
      {
        domain: "telematics",
        operation: "traccar-cron",
        boundary: "outer-request",
      }
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string" &&
            error.trim()
          ? error.trim()
          : "Traccar position sync failed.";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}
