import {
  randomUUID,
} from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  NextResponse,
} from "next/server";

import {
  HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT,
} from "@/lib/hspp/readHsppAssemblyRecoveryWorkItems";

import {
  runHsppAssemblyRecoveryCycle,
} from "@/lib/hspp/runHsppAssemblyRecoveryCycle";


export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;


const HSPP_RECOVERY_LIMIT_MIN =
  1;

const HSPP_RECOVERY_LEASE_SECONDS_MIN =
  1;

const HSPP_RECOVERY_LEASE_SECONDS_MAX =
  3600;


function errorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : typeof error === "object" &&
        error !== null
      ? JSON.stringify(error)
      : String(
          error ||
            "HSPP assembly recovery execution failed."
        );
}


function requireIntegerEnvironment(
  name: string,
  minimum: number,
  maximum: number
): number {
  const raw =
    process.env[name]?.trim();

  if (!raw) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`
    );
  }

  const value =
    Number(raw);

  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`
    );
  }

  return value;
}


/**
 * B7490-07Q13g protected machine-side activation boundary
 * for one bounded HSPP persisted-assembly recovery cycle.
 *
 * This endpoint:
 *
 * - requires HarborGuard cron authorization;
 * - uses a non-persistent service-role Supabase client;
 * - uses one explicit server-controlled organization;
 * - requires an explicit bounded recovery-discovery limit;
 * - requires an explicit bounded execution-lease duration;
 * - owns fresh assessment-time proposals at the machine boundary;
 * - owns fresh lease tokens at the machine boundary;
 * - delegates all lifecycle behavior to Q13f;
 * - returns only bounded operational summaries;
 * - does not expose execution lease tokens;
 * - does not accept lifecycle identity or policy from the request;
 * - does not schedule itself;
 * - does not implement H1 -> H2 reconstruction.
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
          status:
            500,
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
          status:
            401,
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
          status:
            500,
        }
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
        }
      );
    }


    const recoveryLimit =
      requireIntegerEnvironment(
        "HSPP_RECOVERY_LIMIT",
        HSPP_RECOVERY_LIMIT_MIN,
        HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT
      );

    const leaseSeconds =
      requireIntegerEnvironment(
        "HSPP_RECOVERY_LEASE_SECONDS",
        HSPP_RECOVERY_LEASE_SECONDS_MIN,
        HSPP_RECOVERY_LEASE_SECONDS_MAX
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
        .from(
          "organizations"
        )
        .select(
          "id"
        )
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
            "HSPP_RECOVERY_ORGANIZATION_ID does not match an organization.",
        },
        {
          status:
            500,
        }
      );
    }


    const cycle =
      await runHsppAssemblyRecoveryCycle({
        supabase,

        organizationId,

        limit:
          recoveryLimit,

        leaseSeconds,

        createProposedAssessedAt() {
          return new Date()
            .toISOString();
        },

        createLeaseToken() {
          return randomUUID();
        },
      });


    /*
     * Do not serialize Q13f's complete internal results directly.
     *
     * The machine boundary exposes only persisted assembly identity,
     * outcome branch and error text. In particular, execution lease
     * ownership material is never returned to the HTTP caller.
     */
    const openResults =
      cycle.openResults.map(
        (result) => ({
          assemblyId:
            result.workItem.assemblyId,

          branch:
            result.branch,

          error:
            result.error,
        })
      );

    const sealedResults =
      cycle.sealedResults.map(
        (result) => ({
          assemblyId:
            result.workItem.assemblyId,

          branch:
            result.branch,

          error:
            result.error,
        })
      );


    const openFailed =
      openResults.filter(
        (result) =>
          result.branch ===
          "OPEN_ERROR"
      ).length;

    const sealedFailed =
      sealedResults.filter(
        (result) =>
          result.branch ===
          "SEALED_ERROR"
      ).length;


    return NextResponse.json({
      success:
        openFailed === 0 &&
        sealedFailed === 0,

      runnerVersion:
        cycle.runnerVersion,

      organizationId,

      policy: {
        limit:
          recoveryLimit,

        leaseSeconds,
      },

      discovery: {
        openRequestedLimit:
          cycle.openDiscovery
            .requestedLimit,

        openDiscovered:
          cycle.openDiscovery
            .workItems.length,

        sealedRequestedLimit:
          cycle.sealedDiscovery
            .requestedLimit,

        sealedDiscovered:
          cycle.sealedDiscovery
            .workItems.length,
      },

      outcomes: {
        open: {
          processed:
            openResults.length,

          succeeded:
            openResults.length -
            openFailed,

          failed:
            openFailed,
        },

        sealed: {
          processed:
            sealedResults.length,

          succeeded:
            sealedResults.length -
            sealedFailed,

          failed:
            sealedFailed,
        },
      },

      results: {
        open:
          openResults,

        sealed:
          sealedResults,
      },
    });
  }
  catch (error: unknown) {
    console.error(
      "[hspp recovery cron]",
      error
    );

    return NextResponse.json(
      {
        error:
          errorMessage(
            error
          ),
      },
      {
        status:
          500,
      }
    );
  }
}