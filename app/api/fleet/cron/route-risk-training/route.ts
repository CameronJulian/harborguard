import {
  createClient,
} from "@supabase/supabase-js";
import {
  NextResponse,
} from "next/server";

import {
  persistRouteRiskTrainingRun,
} from "@/lib/fleet/persistRouteRiskTrainingRun";
import {
  runRouteRiskOfflineTraining,
} from "@/lib/fleet/runRouteRiskOfflineTraining";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

function errorMessage(
  error: unknown
) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null
      ? JSON.stringify(error)
      : String(
          error ||
            "Route-risk offline training failed."
        );
}

function parseEvaluationThreshold(
  value: string | undefined
) {
  if (!value?.trim()) {
    throw new Error(
      "ROUTE_RISK_TRAINING_EVALUATION_THRESHOLD is not configured."
    );
  }

  const threshold =
    Number(value);

  if (
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1
  ) {
    throw new Error(
      "ROUTE_RISK_TRAINING_EVALUATION_THRESHOLD must be a finite probability between 0 and 1."
    );
  }

  return threshold;
}

/**
 * Protected machine-side execution boundary for one complete
 * offline route-risk training run.
 *
 * This endpoint:
 *
 * - requires HarborGuard cron authorization;
 * - uses a non-persistent service-role Supabase client;
 * - uses a server-controlled organization ID;
 * - runs the deterministic offline training pipeline;
 * - persists the completed immutable training artifact;
 * - does not select a threshold;
 * - does not approve or activate a model;
 * - does not modify live route-risk scoring;
 * - is not automatically scheduled by this implementation.
 */
export async function GET(
  request: Request
) {
  try {
    const cronSecret =
      process.env.CRON_SECRET;

    if (!cronSecret) {
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
      request.headers.get(
        "authorization"
      );

    if (
      authorization !==
      `Bearer ${cronSecret}`
    ) {
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
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
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

    const organizationId =
      process.env
        .ROUTE_RISK_TRAINING_ORGANIZATION_ID
        ?.trim();

    if (!organizationId) {
      return NextResponse.json(
        {
          error:
            "ROUTE_RISK_TRAINING_ORGANIZATION_ID is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const evaluationThreshold =
      parseEvaluationThreshold(
        process.env
          .ROUTE_RISK_TRAINING_EVALUATION_THRESHOLD
      );

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
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
          organizationId
        )
        .maybeSingle();

    if (organizationError) {
      throw organizationError;
    }

    if (!organization) {
      return NextResponse.json(
        {
          error:
            "ROUTE_RISK_TRAINING_ORGANIZATION_ID does not match an organization.",
        },
        {
          status: 500,
        }
      );
    }

    const generatedAt =
      new Date().toISOString();

    const run =
      await runRouteRiskOfflineTraining({
        supabase,
        organizationId,
        generatedAt,
        evaluationThreshold,
      });

    const persisted =
      await persistRouteRiskTrainingRun({
        supabase,
        organizationId,
        run,
      });

    return NextResponse.json({
      success:
        true,

      organizationId,

      trainingRunId:
        persisted.id,

      createdAt:
        persisted.createdAt,

      runVersion:
        run.runVersion,

      datasetFingerprint:
        run.manifest
          .datasetFingerprint,

      generatedAt:
        run.manifest.generatedAt,

      counts:
        run.manifest.counts,

      evaluationThreshold,

      model: {
        algorithmVersion:
          run.model.algorithmVersion,

        exampleCount:
          run.model.training
            .exampleCount,

        positiveCount:
          run.model.training
            .positiveCount,

        negativeCount:
          run.model.training
            .negativeCount,

        epochs:
          run.model.training.epochs,

        learningRate:
          run.model.training
            .learningRate,

        finalLoss:
          run.model.training
            .finalLoss,
      },

      validation: {
        exampleCount:
          run.validationEvaluation
            .exampleCount,

        threshold:
          run.validationEvaluation
            .threshold,
      },

      test: {
        exampleCount:
          run.testEvaluation
            .exampleCount,

        threshold:
          run.testEvaluation
            .threshold,
      },
    });
  }
  catch (error: unknown) {
    console.error(
      "[route-risk training cron]",
      error
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
