import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reportServerError } from "@/lib/server/reportServerError";
import {
  collectTrafficFlowObservations,
} from "@/lib/traffic/collectTrafficFlowObservations";
import {
  claimTrafficFlowCollection,
  completeTrafficFlowCollection,
  failTrafficFlowCollection,
} from "@/lib/traffic/collectionReceiptLifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null
      ? JSON.stringify(error)
      : String(
          error ||
            "Traffic-flow collection failed."
        );
}

export async function GET(request: Request) {
  try {
    const cronSecret =
      process.env.CRON_SECRET;

    if (!cronSecret) {
      reportServerError(
        new Error("CRON_SECRET is not configured."),
        {
          domain: "traffic-flow",
          operation: "cron",
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
          domain: "traffic-flow",
          operation: "cron",
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

    const trafficOrganizationId =
      process.env.TRAFFIC_IMPORT_ORGANIZATION_ID?.trim();

    if (!trafficOrganizationId) {
      reportServerError(
        new Error("TRAFFIC_IMPORT_ORGANIZATION_ID is not configured."),
        {
          domain: "traffic-flow",
          operation: "cron",
          boundary: "traffic-organization-id-missing",
        }
      );


      return NextResponse.json(
        {
          error:
            "TRAFFIC_IMPORT_ORGANIZATION_ID is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: organization,
      error: organizationError,
    } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", trafficOrganizationId)
      .maybeSingle();

    if (organizationError) {
      throw organizationError;
    }

    if (!organization) {
      reportServerError(
        new Error("TRAFFIC_IMPORT_ORGANIZATION_ID does not match an organization."),
        {
          domain: "traffic-flow",
          operation: "cron",
          boundary: "traffic-organization-not-found",
        }
      );


      return NextResponse.json(
        {
          error:
            "TRAFFIC_IMPORT_ORGANIZATION_ID does not match an organization.",
        },
        {
          status: 500,
        }
      );
    }

    const collectionKey =
      request.headers
        .get("Upstash-Message-Id")
        ?.trim() || null;

    if (!collectionKey) {
      const result =
        await collectTrafficFlowObservations(
          supabase,
          trafficOrganizationId,
          null
        );

      return NextResponse.json({
        success: true,
        organizationId:
          trafficOrganizationId,
        ...result,
      });
    }

    const claim =
      await claimTrafficFlowCollection({
        supabase,
        organizationId:
          trafficOrganizationId,
        collectionKey,
        metadata: {
          source: "qstash",
          endpoint:
            "/api/traffic-flow/cron",
        },
      });

    if (!claim.claimed) {
      return NextResponse.json({
        success: true,
        organizationId:
          trafficOrganizationId,
        collectionKey,
        skipped:
          claim.processingStatus ===
          "processed"
            ? "duplicate"
            : "processing",
        receiptId:
          claim.receiptId,
        attemptCount:
          claim.attemptCount,
      });
    }

    try {
      const result =
        await collectTrafficFlowObservations(
          supabase,
          trafficOrganizationId,
          collectionKey
        );

      await completeTrafficFlowCollection({
        supabase,
        receiptId:
          claim.receiptId,
        attemptCount:
          claim.attemptCount,
      });

      return NextResponse.json({
        success: true,
        organizationId:
          trafficOrganizationId,
        collectionKey,
        receiptId:
          claim.receiptId,
        attemptCount:
          claim.attemptCount,
        ...result,
      });
    }
    catch (error: unknown) {
      const message =
        errorMessage(error);

      try {
        await failTrafficFlowCollection({
          supabase,
          receiptId:
            claim.receiptId,
          attemptCount:
            claim.attemptCount,
          failureMessage:
            message,
        });
      }
      catch (finalizationError) {
        throw new AggregateError(
          [
            error,
            finalizationError,
          ],
          "Traffic-flow collection failed and the receipt could not be marked failed."
        );
      }

      throw error;
    }
  }
  catch (error: unknown) {

    console.error(
      "[traffic-flow collection cron]",
      error
    );

    reportServerError(
      error,
      {
        domain: "traffic-flow",
        operation: "cron",
        boundary: "outer-request",
      }
    );

    return NextResponse.json(
      {
        error:
          errorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}
