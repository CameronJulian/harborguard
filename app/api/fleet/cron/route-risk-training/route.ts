import {
  createClient,
} from "@supabase/supabase-js";
import {
  NextResponse,
} from "next/server";

import {
  assessRouteRiskRetrainingReadiness,
} from "@/lib/fleet/assessRouteRiskRetrainingReadiness";
import {
  persistRouteRiskRetrainingReadinessObservation,
} from "@/lib/fleet/persistRouteRiskRetrainingReadinessObservation";
import {
  persistRouteRiskTrainingRun,
} from "@/lib/fleet/persistRouteRiskTrainingRun";
import {
  prepareRouteRiskOfflineTrainingDataset,
} from "@/lib/fleet/prepareRouteRiskOfflineTrainingDataset";
import {
  readLatestRouteRiskTrainingRunIdentity,
} from "@/lib/fleet/readLatestRouteRiskTrainingRunIdentity";
import {
  readRouteRiskRetrainingReadinessPolicy,
} from "@/lib/fleet/readRouteRiskRetrainingReadinessPolicy";
import {
  registerRouteRiskModelCandidate,
} from "@/lib/fleet/registerRouteRiskModelCandidate";
import {
  runPreparedRouteRiskOfflineTraining,
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
 * - prepares deterministic current training evidence;
 * - reads the latest immutable training-run identity;
 * - reads the explicit server-controlled retraining policy;
 * - assesses retraining readiness before model optimization;
 * - returns a successful no-op when retraining is not ready;
 * - runs model optimization only when readiness permits training;
 * - persists the completed immutable training artifact only after training;
 * - registers the persisted artifact as a lifecycle candidate;
 * - does not approve or reject a candidate;
 * - does not enter shadow mode;
 * - does not activate or retire a model;
 * - does not select a threshold;
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

    const prepared =
      await prepareRouteRiskOfflineTrainingDataset({
        supabase,
        organizationId,
        generatedAt,
      });

    const previousTraining =
      await readLatestRouteRiskTrainingRunIdentity({
        supabase,
        organizationId,
      });

    const policy =
      readRouteRiskRetrainingReadinessPolicy();

    const readiness =
      assessRouteRiskRetrainingReadiness({
        dataset: {
          datasetFingerprint:
            prepared.manifest
              .datasetFingerprint,

          counts: {
            total:
              prepared.dataset.train.length +
              prepared.dataset.validation.length +
              prepared.dataset.test.length,

            train:
              prepared.dataset.train.length,

            validation:
              prepared.dataset.validation.length,

            test:
              prepared.dataset.test.length,
          },

          trainingClassCounts:
            prepared.trainingClassCounts,
        },

        previousTraining,

        policy,
      });

    const readinessObservation =
      await persistRouteRiskRetrainingReadinessObservation({
        supabase,

        organizationId,

        datasetGeneratedAt:
          prepared.manifest.generatedAt,

        previousTraining,

        assessment:
          readiness,
      });

    if (
      readiness.state ===
        "NOT_READY_FOR_TRAINING"
    ) {
      return NextResponse.json({
        success:
          true,

        trained:
          false,

        organizationId,

        datasetFingerprint:
          prepared.manifest
            .datasetFingerprint,

        generatedAt:
          prepared.manifest.generatedAt,

        counts:
          prepared.manifest.counts,

        trainingClassCounts:
          prepared.trainingClassCounts,

        previousTraining,

        readiness,

        readinessObservation:
          readinessObservation.observation,

        readinessObservationStatus:
          readinessObservation.status,
      });
    }

    const evaluationThreshold =
      parseEvaluationThreshold(
        process.env
          .ROUTE_RISK_TRAINING_EVALUATION_THRESHOLD
      );

    const run =
      runPreparedRouteRiskOfflineTraining({
        prepared,
        evaluationThreshold,
      });

    const persisted =
      await persistRouteRiskTrainingRun({
        supabase,
        organizationId,
        run,
      });

    const registered =
      await registerRouteRiskModelCandidate({
        supabase,
        organizationId,
        trainingRunId:
          persisted.id,
      });

    return NextResponse.json({
      success:
        true,

      trained:
        true,

      organizationId,

      readiness,

      readinessObservation:
        readinessObservation.observation,

      readinessObservationStatus:
        readinessObservation.status,

      trainingRunId:
        persisted.id,

      registryId:
        registered.registryId,

      lifecycleStatus:
        registered.lifecycleStatus,

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

      trainingClassCounts:
        prepared.trainingClassCounts,

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
