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

import {
  runHsppReservoirReevaluation,
} from "@/lib/hspp/runHsppReservoirReevaluation";

import {
  runHsppReconstructionActivationCycle,
} from "@/lib/hspp/runHsppReconstructionActivationCycle";


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
 * - delegates persisted-assembly recovery lifecycle behavior to Q13f;
 * - runs B07B Reservoir reevaluation after Q13f;
 * - delegates H1 -> H2 reconstruction activation to Q14ag32B using that exact B07B snapshot;
 * - owns fresh proposed reconstruction-child UUIDs at the machine boundary;
 * - returns only bounded operational summaries;
 * - does not expose execution lease tokens;
 * - does not accept lifecycle identity or policy from the request;
 * - does not schedule itself;
 * - does not implement H1 -> H2 reconstruction logic itself;
 * - does not invoke B07C2 or persist Reservoir assembly candidates.
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


    const reservoirRun =
      await (async () => {
        try {
          const lifeguard =
            await runHsppReservoirReevaluation({
              supabase,

              organizationId,

              limit:
                recoveryLimit,
            });


          return {
            summary: {
              status:
                "EVALUATED" as const,

              runnerVersion:
                lifeguard.runnerVersion,

              discoveryPolicyVersion:
                lifeguard.discoveryPolicyVersion,

              reevaluationPolicyVersion:
                lifeguard.reevaluationPolicyVersion,

              discovered:
                lifeguard.discovery
                  .candidates.length,

              reevaluationState:
                lifeguard.reevaluation
                  .state,

              assemblyCandidateCount:
                lifeguard.reevaluation
                  .assemblyCandidates.length,

              error:
                null,
            },

            reevaluationResult:
              lifeguard,
          };
        }
        catch (error: unknown) {
          /*
           * Q14ag5 B07B failure isolation remains active.
           *
           * Reservoir read/evaluation failure must not convert
           * a completed persisted-assembly recovery cycle into
           * an HTTP-level recovery failure.
           *
           * Q14ag32D also refuses to fabricate a B07B snapshot.
           * Existing durable reconstruction intents remain available
           * for a later healthy cron cycle.
           */
          return {
            summary: {
              status:
                "ERROR" as const,

              runnerVersion:
                null,

              discoveryPolicyVersion:
                null,

              reevaluationPolicyVersion:
                null,

              discovered:
                0,

              reevaluationState:
                null,

              assemblyCandidateCount:
                0,

              error:
                errorMessage(
                  error
                ),
            },

            reevaluationResult:
              null,
          };
        }
      })();


    const reservoir =
      reservoirRun.summary;


    const reconstructionSnapshot =
      reservoirRun.reevaluationResult;


    const reconstruction =
      reconstructionSnapshot ===
      null
        ? {
            status:
              "SKIPPED_NO_B07B_SNAPSHOT" as const,

            runnerVersion:
              null,

            producerSuccess:
              null,

            producerState:
              null,

            consumerState:
              null,

            consumerSelectedCount:
              0,

            consumerSucceededCount:
              0,

            consumerFailedCount:
              0,

            consumerHasMore:
              false,

            error:
              reservoir.error,
          }
        : await (async () => {
            try {
              const activation =
                await runHsppReconstructionActivationCycle({
                  supabase,

                  organizationId,

                  reevaluationResult:
                    reconstructionSnapshot,

                  proposedChildAssemblyId:
                    randomUUID(),
                });


              return {
                status:
                  "COMPLETED" as const,

                runnerVersion:
                  activation.runnerVersion,

                producerSuccess:
                  activation.producer.success,

                producerState:
                  activation.producer.success
                    ? activation.producer
                        .result.state
                    : null,

                consumerState:
                  activation.consumer.state,

                consumerSelectedCount:
                  activation.consumer
                    .selectedCount,

                consumerSucceededCount:
                  activation.consumer
                    .succeededCount,

                consumerFailedCount:
                  activation.consumer
                    .failedCount,

                consumerHasMore:
                  activation.consumer
                    .hasMore,

                error:
                  activation.producer.success
                    ? null
                    : activation.producer
                        .errorMessage,
              };
            }
            catch (error: unknown) {
              /*
               * Q14ag32B deliberately propagates fatal consumer/read
               * failures. The cron boundary isolates that failure so
               * an already-completed Q13f recovery cycle is not
               * retroactively converted into an HTTP-level failure.
               */
              return {
                status:
                  "ERROR" as const,

                runnerVersion:
                  null,

                producerSuccess:
                  null,

                producerState:
                  null,

                consumerState:
                  null,

                consumerSelectedCount:
                  0,

                consumerSucceededCount:
                  0,

                consumerFailedCount:
                  0,

                consumerHasMore:
                  false,

                error:
                  errorMessage(
                    error
                  ),
              };
            }
          })();

    /*
     * Do not serialize Q13f's or B07B's complete internal results directly.
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

      reservoir,

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

      reconstruction,

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
