import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  runHsppPostPositiveLifecycleCycle,
} from "@/lib/hspp/runHsppPostPositiveLifecycleCycle";


export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;


/*
 * Intentionally conservative initial production boundary.
 *
 * The canonical fair reader supports larger pages, but this isolated
 * machine boundary admits exactly one lifecycle item per invocation until
 * production timing evidence justifies a larger source-controlled bound.
 */
const HSPP_POST_POSITIVE_LIFECYCLE_LIMIT =
  1;


/*
 * Vercel allows the route 60 seconds.
 *
 * HSPP network activity receives only 40 seconds of that window, leaving
 * a 20-second platform / serialization / cleanup margin.
 */
const HSPP_POST_POSITIVE_EXECUTION_BUDGET_MS =
  40_000;


/*
 * No individual Supabase HTTP request may consume the complete route
 * execution budget.
 */
const HSPP_POST_POSITIVE_FETCH_TIMEOUT_MAX_MS =
  6_000;


const HSPP_RECOVERY_LEASE_SECONDS_MIN =
  1;

const HSPP_RECOVERY_LEASE_SECONDS_MAX =
  3600;


function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null
      ? JSON.stringify(error)
      : String(
          error ||
            "HSPP post-positive lifecycle execution failed.",
        );
}


function requireIntegerEnvironment(
  name: string,
  minimum: number,
  maximum: number,
): number {
  const raw =
    process.env[name];

  if (
    typeof raw !== "string" ||
    !raw.trim()
  ) {
    throw new Error(
      name + " is not configured.",
    );
  }

  const normalized =
    Number(
      raw.trim(),
    );

  if (
    !Number.isInteger(normalized) ||
    normalized < minimum ||
    normalized > maximum
  ) {
    throw new Error(
      name +
        " must be an integer between " +
        minimum +
        " and " +
        maximum +
        ".",
    );
  }

  return normalized;
}


/*
 * All Supabase work performed by this route shares one absolute network
 * deadline. Every request is additionally capped by the per-request
 * maximum.
 *
 * This does not reinterpret HSPP lifecycle outcomes. It is transport-level
 * runtime fencing only.
 */
function createDeadlineFetch(
  deadlineEpochMs: number,
) {
  return async function deadlineFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const remainingMs =
      deadlineEpochMs -
      Date.now();

    if (remainingMs <= 0) {
      throw new Error(
        "HSPP post-positive lifecycle execution budget exhausted before network request.",
      );
    }

    const timeoutMs =
      Math.min(
        HSPP_POST_POSITIVE_FETCH_TIMEOUT_MAX_MS,
        remainingMs,
      );

    const controller =
      new AbortController();

    const upstreamSignal =
      init?.signal ??
      null;

    function relayAbort() {
      controller.abort();
    }

    if (upstreamSignal?.aborted) {
      controller.abort();
    } else {
      upstreamSignal?.addEventListener(
        "abort",
        relayAbort,
        {
          once:
            true,
        },
      );
    }

    const timeoutHandle =
      setTimeout(
        () => {
          controller.abort();
        },
        timeoutMs,
      );

    try {
      return await fetch(
        input,
        {
          ...init,

          signal:
            controller.signal,
        },
      );
    } finally {
      clearTimeout(
        timeoutHandle,
      );

      upstreamSignal?.removeEventListener(
        "abort",
        relayAbort,
      );
    }
  };
}


/*
 * Isolated post-positive lifecycle machine boundary.
 *
 * Deliberately NOT present in vercel.json yet.
 *
 * The route:
 * - authenticates using the existing cron-secret boundary;
 * - reuses the configured HSPP organization and lease duration;
 * - executes exactly one fair post-positive lifecycle item at most;
 * - owns observation / decision time and lease UUID generation;
 * - delegates all lifecycle semantics to the canonical cycle;
 * - applies only transport/runtime fencing at this layer;
 * - returns bounded summaries only.
 *
 * It does NOT:
 * - invoke assembly recovery;
 * - invoke Reservoir;
 * - invoke reconstruction activation;
 * - directly persist Q14x or Q14ac;
 * - directly advance scan-state CAS;
 * - schedule itself.
 */
export async function GET(
  request: Request,
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
          status:
            500,
        },
      );
    }

    const authorization =
      request.headers.get(
        "authorization",
      );

    if (
      authorization !==
      "Bearer " + cronSecret
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized cron request.",
        },
        {
          status:
            401,
        },
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
          status:
            500,
        },
      );
    }


    const organizationId =
      process.env
        .HSPP_RECOVERY_ORGANIZATION_ID
        ?.trim();

    if (!organizationId) {
      return NextResponse.json(
        {
          error:
            "HSPP_RECOVERY_ORGANIZATION_ID is not configured.",
        },
        {
          status:
            500,
        },
      );
    }


    const leaseSeconds =
      requireIntegerEnvironment(
        "HSPP_RECOVERY_LEASE_SECONDS",
        HSPP_RECOVERY_LEASE_SECONDS_MIN,
        HSPP_RECOVERY_LEASE_SECONDS_MAX,
      );


    /*
     * Start the runtime budget immediately before construction of the
     * service-role client and canonical lifecycle execution.
     */
    const deadlineEpochMs =
      Date.now() +
      HSPP_POST_POSITIVE_EXECUTION_BUDGET_MS;

    const deadlineFetch =
      createDeadlineFetch(
        deadlineEpochMs,
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

          global: {
            fetch:
              deadlineFetch,
          },
        },
      );


    const cycle =
      await runHsppPostPositiveLifecycleCycle({
        supabase,

        organizationId,

        limit:
          HSPP_POST_POSITIVE_LIFECYCLE_LIMIT,

        leaseSeconds,

        createObservedAt() {
          return new Date()
            .toISOString();
        },

        createDecidedAt() {
          return new Date()
            .toISOString();
        },

        createLeaseToken() {
          return randomUUID();
        },
      });


    const reevaluationErrors =
      cycle.workResults.filter(
        (result) =>
          result.branch ===
          "REEVALUATION_ERROR",
      ).length;

    const cessationErrors =
      cycle.workResults.filter(
        (result) =>
          result.branch ===
          "CESSATION_ERROR",
      ).length;

    const cursorAdvanceError =
      cycle.cursorAdvanceResult.branch ===
      "CURSOR_ADVANCE_ERROR";


    return NextResponse.json({
      success:
        reevaluationErrors === 0 &&
        cessationErrors === 0 &&
        !cursorAdvanceError,

      runnerVersion:
        cycle.runnerVersion,

      organizationId,

      policy: {
        limit:
          HSPP_POST_POSITIVE_LIFECYCLE_LIMIT,

        leaseSeconds,

        executionBudgetMs:
          HSPP_POST_POSITIVE_EXECUTION_BUDGET_MS,

        fetchTimeoutMaxMs:
          HSPP_POST_POSITIVE_FETCH_TIMEOUT_MAX_MS,
      },

      summary: {
        discovered:
          cycle.discovery
            .workItems.length,

        processed:
          cycle.workResults.length,

        reevaluationErrors,

        cessationErrors,

        cursorAdvance:
          cycle.cursorAdvanceResult
            .branch,
      },
    });
  }
  catch (error: unknown) {
    console.error(
      "[hspp post-positive lifecycle cron]",
      error,
    );

    return NextResponse.json(
      {
        error:
          errorMessage(
            error,
          ),
      },
      {
        status:
          500,
      },
    );
  }
}
