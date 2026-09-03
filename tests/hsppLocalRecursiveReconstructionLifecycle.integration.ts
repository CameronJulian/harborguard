import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

import {
  createClient,
} from "@supabase/supabase-js";

import type {
  Database,
} from "../types/supabase";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";

import {
  persistHsppEvidence,
} from "../lib/hspp/persistHsppEvidence";

import {
  evaluateHsppAssemblyMembership,
} from "../lib/hspp/evaluateHsppAssemblyMembership";

import {
  persistHsppEvidenceAssembly,
} from "../lib/hspp/persistHsppEvidenceAssembly";

import {
  sealHsppEvidenceAssembly,
} from "../lib/hspp/sealHsppEvidenceAssembly";

import {
  runHsppSealedEvidenceAssemblyDecisionPersistence,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyDecisionPersistence";

import {
  claimHsppAssemblyAssessmentRetryIdentity,
} from "../lib/hspp/claimHsppAssemblyAssessmentRetryIdentity";

import {
  runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting,
} from "../lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting";

import {
  recordHsppAssemblyAssessmentCompletionUnderExecutionLease,
} from "../lib/hspp/recordHsppAssemblyAssessmentCompletionUnderExecutionLease";

import {
  acquireHsppAssemblyAssessmentExecutionLease,
  releaseHsppAssemblyAssessmentExecutionLease,
} from "../lib/hspp/hsppAssemblyAssessmentExecutionLease";

import {
  readHsppPostPositiveLifecycleFairWorkItemsV2,
} from "../lib/hspp/readHsppPostPositiveLifecycleFairWorkItemsV2";

import {
  readAndVerifyHsppEvidence,
} from "../lib/hspp/readAndVerifyHsppEvidence";

import {
  evaluateHsppPostPositiveMemberUnsuitability,
} from "../lib/hspp/evaluateHsppPostPositiveMemberUnsuitability";

import {
  persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease,
} from "../lib/hspp/persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease";

import {
  runHsppPostPositiveMemberUnsuitabilityAssessment,
} from "../lib/hspp/runHsppPostPositiveMemberUnsuitabilityAssessment";

import {
  runHsppPostPositiveMemberEffectiveCessation,
} from "../lib/hspp/runHsppPostPositiveMemberEffectiveCessation";

import {
  readHsppHistoricalReconstructionContexts,
} from "../lib/hspp/readHsppHistoricalReconstructionContexts";

import {
  persistHsppEvidenceAssemblyReconstruction,
} from "../lib/hspp/persistHsppEvidenceAssemblyReconstruction";

import {
  runHsppAssemblyRecoveryCycle,
} from "../lib/hspp/runHsppAssemblyRecoveryCycle";


/*
 * HSPP local recursive reconstruction lifecycle integration.
 *
 * Verification target:
 *
 *   H1 positive
 *     -> H1 member UNSUITABLE
 *     -> Q14v persisted
 *     -> H1 CESSATION_REQUIRED
 *     -> effective cessation
 *     -> cessation-backed historical context
 *     -> H1 -> H2 reconstruction
 *     -> H2 OPEN
 *     -> ordinary recovery / assessment
 *     -> H2 positive
 *     -> H1 no longer current leaf
 *     -> H2 post-positive
 *     -> H2 member UNSUITABLE
 *     -> effective cessation
 *     -> H2 -> H3 reconstruction
 *     -> H3 OPEN
 *
 * This file intentionally refuses every non-local Supabase URL.
 *
 * The recursive lifecycle itself will be added in the next focused
 * implementation slice after this safety / cleanup harness compiles.
 */

const TEST_RUN_ID =
  randomUUID();

const ORGANIZATION_ID =
  randomUUID();

const ORGANIZATION_NAME =
  `HSPP recursive lifecycle ${TEST_RUN_ID}`;



function requireLocalEnvironment(): {
  url: string;
  serviceRoleKey: string;
} {
  const url =
    process.env
      .HSPP_LOCAL_SUPABASE_URL
      ?.trim();

  const serviceRoleKey =
    process.env
      .HSPP_LOCAL_SUPABASE_SERVICE_ROLE_KEY
      ?.trim();

  assert.ok(
    url,
    "HSPP_LOCAL_SUPABASE_URL is required.",
  );

  assert.match(
    url,
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i,
    "Recursive integration refuses non-local Supabase.",
  );

  assert.ok(
    serviceRoleKey,
    "HSPP_LOCAL_SUPABASE_SERVICE_ROLE_KEY is required.",
  );

  return {
    url,
    serviceRoleKey,
  };
}


function cleanupOrganization(
  organizationId: string,
): void {
  assert.match(
    organizationId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Cleanup requires a valid organization UUID.",
  );

  /*
   * Test-only local PostgreSQL cleanup authority.
   *
   * HSPP production tables are intentionally immutable and several
   * tables do not grant DELETE to service_role. The integration
   * harness therefore cleans only its own local fixture by invoking
   * the local Supabase PostgreSQL container as postgres.
   *
   * This does not alter migrations, grants, RLS, triggers, or
   * production HSPP behavior.
   */
  const sql =
    [
      "begin;",
      "",
      "set local session_replication_role = replica;",
      "",
      "do $cleanup$",
      "declare",
      "  r record;",
      "begin",
      "  for r in",
      "    select distinct",
      "      c.table_name",
      "    from",
      "      information_schema.columns c",
      "    where",
      "      c.table_schema = 'public'",
      "      and c.table_name like 'hspp_%'",
      "      and c.column_name = 'organization_id'",
      "    order by",
      "      c.table_name",
      "  loop",
      "    execute format(",
      "      'delete from public.%I where organization_id = %L::uuid',",
      "      r.table_name,",
      `      '${organizationId}'`,
      "    );",
      "  end loop;",
      "end",
      "$cleanup$;",
      "",
      "delete from",
      "  public.organizations",
      "where",
      `  id = '${organizationId}'::uuid;`,
      "",
      "commit;",
    ].join("\n");

  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_harborguard",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input:
        sql,

      encoding:
        "utf8",

      stdio: [
        "pipe",
        "pipe",
        "pipe",
      ],
    },
  );
}


async function main(): Promise<void> {
  const {
    url,
    serviceRoleKey,
  } =
    requireLocalEnvironment();

  const supabase =
    createClient<Database>(
      url,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  let organizationCreated =
    false;

  let primaryLifecycleError:
    unknown =
      null;

  let cleanupError:
    unknown =
      null;

  try {
    const {
      data: organization,
      error: organizationError,
    } =
      await supabase
        .from("organizations")
        .insert({
          id:
            ORGANIZATION_ID,

          name:
            ORGANIZATION_NAME,
        })
        .select(
          "id",
        )
        .single();

    if (organizationError) {
      throw organizationError;
    }

    assert.equal(
      organization.id,
      ORGANIZATION_ID,
    );

    organizationCreated =
      true;

    console.log(
      "HSPP_RECURSIVE_FIXTURE_ORGANIZATION_CREATED",
      {
        organizationId:
          ORGANIZATION_ID,

        testRunId:
          TEST_RUN_ID,
      },
    );


    /*
     * ============================================================
     * A. FRESH H1 EVIDENCE
     * ============================================================
     */

    const observedAt =
      new Date(
        Date.now() - 60_000,
      ).toISOString();

    const receivedAt =
      new Date().toISOString();

    const normalizedPayload = {
      latitude:
        -33.9476,

      longitude:
        18.5751,

      eventType:
        "road_closure",

      severity:
        "medium",

      description:
        `recursive-${TEST_RUN_ID}`,
    };

    const builtA =
      buildHsppEvidence({
        sourceClass:
          "external_intelligence",

        sourceProvider:
          "here",

        sourceStream:
          "recursive-road-events",

        sourceMessageId:
          `A-${TEST_RUN_ID}`,

        observedAt,
        receivedAt,

        payloadSchemaVersion:
          "hspp-local-road-event-v1",

        normalizedPayload,
      });

    const builtC =
      buildHsppEvidence({
        sourceClass:
          "external_intelligence",

        sourceProvider:
          "tomtom",

        sourceStream:
          "recursive-road-events",

        sourceMessageId:
          `C-${TEST_RUN_ID}`,

        observedAt,
        receivedAt,

        payloadSchemaVersion:
          "hspp-local-road-event-v1",

        normalizedPayload,
      });

    const evidenceA =
      await persistHsppEvidence({
        supabase,
        organizationId:
          ORGANIZATION_ID,
        evidence:
          builtA,
      });

    const evidenceC =
      await persistHsppEvidence({
        supabase,
        organizationId:
          ORGANIZATION_ID,
        evidence:
          builtC,
      });

    assert.match(
      evidenceA.integrityFingerprint,
      /^[0-9a-f]{64}$/,
    );

    assert.match(
      evidenceC.integrityFingerprint,
      /^[0-9a-f]{64}$/,
    );


    /*
     * ============================================================
     * B. REAL MEMBERSHIP DECISION
     * ============================================================
     */

    const membershipDecision =
      evaluateHsppAssemblyMembership(
        {
          organizationId:
            ORGANIZATION_ID,

          evidenceId:
            evidenceA.id,

          integrityFingerprint:
            evidenceA.integrityFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "here",

          observedAt,

          latitude:
            normalizedPayload.latitude,

          longitude:
            normalizedPayload.longitude,

          eventType:
            normalizedPayload.eventType,
        },
        {
          organizationId:
            ORGANIZATION_ID,

          evidenceId:
            evidenceC.id,

          integrityFingerprint:
            evidenceC.integrityFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "tomtom",

          observedAt,

          latitude:
            normalizedPayload.latitude,

          longitude:
            normalizedPayload.longitude,

          eventType:
            normalizedPayload.eventType,
        },
      );

    assert.equal(
      membershipDecision.eligible,
      true,
    );

    assert.equal(
      membershipDecision.reason,
      "ELIGIBLE",
    );


    /*
     * ============================================================
     * C. OPEN + SEALED H1
     * ============================================================
     */

    const openH1 =
      await persistHsppEvidenceAssembly({
        supabase,
        organizationId:
          ORGANIZATION_ID,

        membershipPolicyVersion:
          membershipDecision.policyVersion,

        members: [
          {
            evidenceId:
              evidenceA.id,

            integrityFingerprint:
              evidenceA.integrityFingerprint,
          },
          {
            evidenceId:
              evidenceC.id,

            integrityFingerprint:
              evidenceC.integrityFingerprint,
          },
        ],

        membershipRelation: {
          firstEvidenceId:
            evidenceA.id,

          secondEvidenceId:
            evidenceC.id,

          membershipEligible:
            membershipDecision.eligible,

          membershipPolicyVersion:
            membershipDecision.policyVersion,

          membershipReason:
            membershipDecision.reason,

          distanceMeters:
            membershipDecision.distanceMeters,

          timeDeltaMs:
            membershipDecision.timeDeltaMs,
        },
      });

    assert.equal(
      openH1.assemblyState,
      "OPEN",
    );

    const sealedH1 =
      await sealHsppEvidenceAssembly({
        supabase,
        organizationId:
          ORGANIZATION_ID,
        assemblyId:
          openH1.assemblyId,
      });

    assert.equal(
      sealedH1.assemblyState,
      "SEALED",
    );


    /*
     * ============================================================
     * D. CANONICAL SEALED DECISION
     * ============================================================
     */

    const decisionPersistence =
      await runHsppSealedEvidenceAssemblyDecisionPersistence({
        supabase,
        organizationId:
          ORGANIZATION_ID,
        assemblyId:
          openH1.assemblyId,
      });

    const persistedDecision =
      decisionPersistence.persistedDecision;

    assert.equal(
      persistedDecision.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      persistedDecision.assemblyId,
      openH1.assemblyId,
    );

    assert.equal(
      persistedDecision.decisionState,
      "CONSISTENT",
      "Fresh H1 must produce a CONSISTENT canonical decision before Q5.",
    );

    assert.equal(
      persistedDecision.decisionReason,
      "CANONICAL_AGREEMENT_WITHOUT_CONFLICT",
      "Fresh H1 must contain canonical agreement without conflict before Q5.",
    );

    console.log(
      "HSPP_LOCAL_RECURSIVE_H1_DECISION_CANDIDACY_PASS",
      {
        decisionState:
          persistedDecision.decisionState,

        decisionReason:
          persistedDecision.decisionReason,
      },
    );


    /*
     * ============================================================
     * E. REAL POSITIVE Q5 -> Q6 CHECKPOINT
     * ============================================================
     */

    const proposedAssessedAt =
      new Date().toISOString();

    const assessmentLeaseToken =
      randomUUID();

    const assessmentLease =
      await acquireHsppAssemblyAssessmentExecutionLease({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          openH1.assemblyId,

        leaseToken:
          assessmentLeaseToken,

        leaseSeconds:
          300,
      });

    assert.equal(
      assessmentLease.state,
      "ACQUIRED",
    );

    let terminalResult: Awaited<
      ReturnType<
        typeof runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting
      >
    > | null =
      null;

    let completion: Awaited<
      ReturnType<
        typeof recordHsppAssemblyAssessmentCompletionUnderExecutionLease
      >
    > | null =
      null;

    try {
      const retryIdentity =
        await claimHsppAssemblyAssessmentRetryIdentity({
          supabase,

          organizationId:
            ORGANIZATION_ID,

          assemblyId:
            openH1.assemblyId,

          proposedAssessedAt,
        });

      const executionLease = {
        assemblyId:
          assessmentLease.assemblyId,

        leaseToken:
          assessmentLease.leaseToken,
      };

      terminalResult =
        await runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting(
          {
            supabase,

            organizationId:
              retryIdentity.organizationId,

            assemblyId:
              retryIdentity.assemblyId,

            assessedAt:
              retryIdentity.assessedAt,

            executionLease,
          },
        );

      completion =
        await recordHsppAssemblyAssessmentCompletionUnderExecutionLease({
          supabase,

          organizationId:
            retryIdentity.organizationId,

          assemblyId:
            retryIdentity.assemblyId,

          leaseToken:
            executionLease.leaseToken,

          terminalResult,
        });
    }
    finally {
      const release =
        await releaseHsppAssemblyAssessmentExecutionLease({
          supabase,

          organizationId:
            ORGANIZATION_ID,

          assemblyId:
            openH1.assemblyId,

          leaseToken:
            assessmentLeaseToken,
        });

      assert.equal(
        release.state,
        "RELEASED",
      );
    }

    assert.ok(
      terminalResult,
      "Fresh H1 must produce one terminal Q12 result.",
    );

    assert.equal(
      terminalResult.branch,
      "MEMBER_CORROBORATION_ELIGIBLE",
      "Fresh H1 must reach the eligible terminal Q12 branch.",
    );

    assert.ok(
      terminalResult.persistenceResult,
      "Fresh H1 eligible Q12 must persist the operational assessment.",
    );

    assert.equal(
      terminalResult.persistenceResult.state,
      "CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTED",
    );

    assert.ok(
      completion,
      "Fresh H1 must record immutable whole-Q12 completion before lease release.",
    );

    assert.equal(
      completion.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      completion.assemblyId,
      openH1.assemblyId,
    );


    /*
     * ============================================================
     * F. DURABLE POSITIVE CHECKPOINT + FAIR V2
     * ============================================================
     */

    const {
      data: positiveH1,
      error: positiveH1Error,
    } =
      await supabase
        .from(
          "hspp_assembly_positive_assessment_checkpoints",
        )
        .select(
          "id,organization_id,assembly_id,assembly_decision_id,evidence_id,integrity_fingerprint,assessed_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "assembly_id",
          openH1.assemblyId,
        )
        .single();

    if (positiveH1Error) {
      throw positiveH1Error;
    }

    assert.equal(
      positiveH1.organization_id,
      ORGANIZATION_ID,
    );

    assert.equal(
      positiveH1.assembly_id,
      openH1.assemblyId,
    );

    assert.equal(
      positiveH1.assembly_decision_id,
      persistedDecision.id,
    );

    const fairH1 =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase,
        organizationId:
          ORGANIZATION_ID,
        limit:
          100,
      });

    const h1WorkItem =
      fairH1.workItems.find(
        (
          item,
        ) =>
          item.assemblyId ===
          openH1.assemblyId,
      );

    assert.ok(
      h1WorkItem,
      "Fresh H1 must be visible to Fair V2 after positive checkpoint persistence.",
    );

    assert.equal(
      h1WorkItem.workState,
      "REEVALUATION_REQUIRED",
    );

    /*
     * ============================================================
     * G. Q14V — REAL LEASE + REAL EVALUATOR + REAL PERSISTENCE
     * ============================================================
     *
     * HSPP evidence itself remains immutable.
     *
     * The only controlled dependency is the current verification
     * observation. We first perform the real durable evidence read,
     * preserve that complete result, and change only verification
     * status to MISMATCH for this deliberate lifecycle test.
     *
     * Everything after that observation is production authority:
     *
     *   acquire real execution lease
     *     -> real Q14 evaluator
     *     -> UNSUITABLE
     *     -> real Q14x/Q14v PostgreSQL persistence
     *     -> release real lease
     */

    const controlledMismatchRead:
      typeof readAndVerifyHsppEvidence =
        async (
          input,
        ) => {
          const current =
            await readAndVerifyHsppEvidence(
              input,
            );

          if (!current.found) {
            throw new Error(
              "Recursive Q14v fixture expected persisted current evidence.",
            );
          }

          return {
            found:
              true,

            evidence:
              current.evidence,

            verification: {
              status:
                "MISMATCH",

              expectedFingerprint:
                current.evidence.integrityFingerprint,

              actualFingerprint:
                "0".repeat(64),
            },
          };
        };

    const unsuitabilityObservedAt =
      new Date(
        new Date(
          positiveH1.assessed_at,
        ).getTime() + 1_000,
      ).toISOString();

    const unsuitabilityDecidedAt =
      new Date(
        new Date(
          unsuitabilityObservedAt,
        ).getTime() + 1_000,
      ).toISOString();

    const q14v =
      await runHsppPostPositiveMemberUnsuitabilityAssessment(
        {
          supabase,

          workItem:
            h1WorkItem,

          leaseToken:
            randomUUID(),

          leaseSeconds:
            300,

          observedAt:
            unsuitabilityObservedAt,

          decidedAt:
            unsuitabilityDecidedAt,
        },
        {
          acquireLease:
            acquireHsppAssemblyAssessmentExecutionLease,

          releaseLease:
            releaseHsppAssemblyAssessmentExecutionLease,

          readEvidence:
            controlledMismatchRead,

          evaluate:
            evaluateHsppPostPositiveMemberUnsuitability,

          persistUnsuitability:
            persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease,
        },
      );

    assert.equal(
      q14v.branch,
      "UNSUITABILITY_CHECKPOINT_PERSISTED",
    );

    assert.ok(
      q14v.decision,
      "Q14v must expose the real UNSUITABLE evaluator decision.",
    );

    assert.equal(
      q14v.decision.state,
      "UNSUITABLE",
    );

    assert.equal(
      q14v.decision.reason,
      "CURRENT_INTEGRITY_NOT_VERIFIED",
    );

    assert.ok(
      q14v.checkpoint,
      "Q14v must persist the real member-unsuitability checkpoint.",
    );

    assert.equal(
      q14v.checkpoint.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      q14v.checkpoint.assemblyId,
      openH1.assemblyId,
    );

    assert.equal(
      q14v.checkpoint.evidenceId,
      h1WorkItem.evidenceId,
    );

    assert.equal(
      q14v.checkpoint.integrityFingerprint,
      h1WorkItem.integrityFingerprint,
    );

    assert.equal(
      q14v.checkpoint.priorPositiveCheckpointId,
      positiveH1.id,
    );


    /*
     * ============================================================
     * H. FAIR V2 MUST NOW ADVANCE H1 TO CESSATION_REQUIRED
     * ============================================================
     */

    const fairAfterQ14v =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          100,
      });

    const h1CessationWorkItem =
      fairAfterQ14v.workItems.find(
        (
          item,
        ) =>
          item.assemblyId ===
          openH1.assemblyId,
      );

    assert.ok(
      h1CessationWorkItem,
      "H1 must remain visible to Fair V2 after Q14v persistence.",
    );

    assert.equal(
      h1CessationWorkItem.workState,
      "CESSATION_REQUIRED",
    );

    assert.equal(
      h1CessationWorkItem.unsuitabilityCheckpointId,
      q14v.checkpoint.checkpointId,
    );


    /*
     * ============================================================
     * I. REAL EFFECTIVE MEMBERSHIP CESSATION
     * ============================================================
     */

    const h1Cessation =
      await runHsppPostPositiveMemberEffectiveCessation({
        supabase,

        workItem:
          h1CessationWorkItem,

        leaseToken:
          randomUUID(),

        leaseSeconds:
          300,
      });

    assert.equal(
      h1Cessation.branch,
      "CESSATION_PERSISTED",
    );

    assert.ok(
      h1Cessation.cessation,
      "H1 cessation must be durably persisted.",
    );

    assert.equal(
      h1Cessation.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      h1Cessation.assemblyId,
      openH1.assemblyId,
    );

    assert.equal(
      h1Cessation.evidenceId,
      h1CessationWorkItem.evidenceId,
    );

    assert.equal(
      h1Cessation.cessation.state,
      "ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_PERSISTED",
    );

    assert.equal(
      h1Cessation.cessation.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      h1Cessation.cessation.assemblyId,
      openH1.assemblyId,
    );

    assert.equal(
      h1Cessation.cessation.evidenceId,
      h1CessationWorkItem.evidenceId,
    );

    assert.equal(
      h1Cessation.cessation.unsuitabilityCheckpointId,
      h1CessationWorkItem.unsuitabilityCheckpointId,
    );


    /*
     * ============================================================
     * J. DURABLE CESSATION ROW MUST EXIST
     * ============================================================
     */

    const {
      data: durableH1Cessation,
      error: durableH1CessationError,
    } =
      await supabase
        .from(
          "hspp_assembly_member_effective_cessations",
        )
        .select(
          "id,organization_id,assembly_id,evidence_id,integrity_fingerprint,historical_membership_id,unsuitability_checkpoint_id,ceased_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "assembly_id",
          openH1.assemblyId,
        )
        .eq(
          "evidence_id",
          h1CessationWorkItem.evidenceId,
        )
        .single();

    if (durableH1CessationError) {
      throw durableH1CessationError;
    }

    assert.equal(
      durableH1Cessation.id,
      h1Cessation.cessation.cessationId,
    );

    assert.equal(
      durableH1Cessation.unsuitability_checkpoint_id,
      h1CessationWorkItem.unsuitabilityCheckpointId,
    );

    assert.equal(
      durableH1Cessation.historical_membership_id,
      h1CessationWorkItem.membershipId,
    );

    assert.equal(
      durableH1Cessation.integrity_fingerprint,
      h1CessationWorkItem.integrityFingerprint,
    );


    /*
     * ============================================================
     * K. REAL CESSATION-BACKED HISTORICAL CONTEXT
     * ============================================================
     */

    const historicalH1Read =
      await readHsppHistoricalReconstructionContexts({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        evidenceIds: [
          h1CessationWorkItem.evidenceId,
        ],
      });

    assert.equal(
      historicalH1Read.contexts.length,
      1,
      "Exactly one historical reconstruction context must exist for ceased H1 evidence.",
    );

    assert.deepEqual(
      historicalH1Read.noContextEvidenceIds,
      [],
    );

    const historicalH1 =
      historicalH1Read.contexts[0];

    assert.equal(
      historicalH1.parentAssemblyId,
      openH1.assemblyId,
    );

    assert.equal(
      historicalH1.evidenceId,
      h1CessationWorkItem.evidenceId,
    );

    assert.equal(
      historicalH1.evidenceIntegrityFingerprint,
      h1CessationWorkItem.integrityFingerprint,
    );

    assert.equal(
      historicalH1.historicalMembershipId,
      h1Cessation.cessation.historicalMembershipId,
    );

    assert.equal(
      historicalH1.cessationId,
      h1Cessation.cessation.cessationId,
    );


    /*
     * ============================================================
     * L. IDENTIFY H1 SURVIVING MEMBER
     * ============================================================
     */

    const survivingH1Evidence =
      h1CessationWorkItem.evidenceId ===
      evidenceA.id
        ? evidenceC
        : evidenceA;

    assert.notEqual(
      survivingH1Evidence.id,
      h1CessationWorkItem.evidenceId,
    );


    /*
     * ============================================================
     * M. CREATE FRESH REPLACEMENT EVIDENCE
     * ============================================================
     *
     * Use the opposite provider from the surviving member so the
     * reconstructed pair retains independent source provenance.
     */

    const replacementProvider =
      survivingH1Evidence.id ===
      evidenceA.id
        ? "tomtom"
        : "here";

    const replacementBuilt =
      buildHsppEvidence({
        sourceClass:
          "external_intelligence",

        sourceProvider:
          replacementProvider,

        sourceStream:
          "recursive-road-events",

        sourceMessageId:
          `R1-${TEST_RUN_ID}`,

        observedAt:
          new Date(
            new Date(observedAt).getTime() +
            2_000,
          ).toISOString(),

        receivedAt:
          new Date(
            new Date(receivedAt).getTime() +
            2_000,
          ).toISOString(),

        payloadSchemaVersion:
          "hspp-local-road-event-v1",

        normalizedPayload: {
          ...normalizedPayload,

          description:
            `recursive-replacement-${TEST_RUN_ID}`,
        },
      });

    const replacementEvidence =
      await persistHsppEvidence({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        evidence:
          replacementBuilt,
      });

    assert.match(
      replacementEvidence.integrityFingerprint,
      /^[0-9a-f]{64}$/,
    );

    assert.notEqual(
      replacementEvidence.id,
      survivingH1Evidence.id,
    );

    assert.notEqual(
      replacementEvidence.id,
      historicalH1.evidenceId,
    );


    /*
     * ============================================================
     * N. REAL Q14H — H1 -> H2
     * ============================================================
     *
     * Q14h receives:
     *
     *   - the exact historical parent proven above;
     *   - one surviving H1 member;
     *   - one newly persisted replacement;
     *   - caller-owned child identity.
     *
     * No reconstruction row is inserted manually.
     */

    const h2AssemblyId =
      randomUUID();

    const h1ToH2 =
      await persistHsppEvidenceAssemblyReconstruction({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        parentAssemblyId:
          historicalH1.parentAssemblyId,

        childAssemblyId:
          h2AssemblyId,

        membershipPolicyVersion:
          membershipDecision.policyVersion,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "POST_POSITIVE_MEMBER_REPLACEMENT",

        members: [
          {
            evidenceId:
              survivingH1Evidence.id,

            integrityFingerprint:
              survivingH1Evidence.integrityFingerprint,
          },
          {
            evidenceId:
              replacementEvidence.id,

            integrityFingerprint:
              replacementEvidence.integrityFingerprint,
          },
        ],
      });

    assert.equal(
      h1ToH2.parentAssemblyId,
      openH1.assemblyId,
    );

    assert.equal(
      h1ToH2.childAssemblyId,
      h2AssemblyId,
    );

    assert.equal(
      h1ToH2.assemblyState,
      "OPEN",
    );

    assert.equal(
      h1ToH2.persistedMemberCount,
      2,
    );


    /*
     * ============================================================
     * O. VERIFY DURABLE H2 AS A NORMAL OPEN ASSEMBLY
     * ============================================================
     */

    const {
      data: durableH2,
      error: durableH2Error,
    } =
      await supabase
        .from(
          "hspp_evidence_assemblies",
        )
        .select(
          "id,organization_id,assembly_state,membership_policy_version,sealed_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "id",
          h2AssemblyId,
        )
        .single();

    if (durableH2Error) {
      throw durableH2Error;
    }

    assert.equal(
      durableH2.id,
      h2AssemblyId,
    );

    assert.equal(
      durableH2.organization_id,
      ORGANIZATION_ID,
    );

    assert.equal(
      durableH2.assembly_state,
      "OPEN",
    );

    assert.equal(
      durableH2.membership_policy_version,
      membershipDecision.policyVersion,
    );

    assert.equal(
      durableH2.sealed_at,
      null,
    );


    /*
     * ============================================================
     * P. VERIFY EXACT H1 -> H2 PROVENANCE
     * ============================================================
     */

    const {
      data: durableH1ToH2,
      error: durableH1ToH2Error,
    } =
      await supabase
        .from(
          "hspp_evidence_assembly_reconstructions",
        )
        .select(
          "id,organization_id,parent_assembly_id,child_assembly_id,reconstruction_policy_version,reconstruction_reason",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "parent_assembly_id",
          openH1.assemblyId,
        )
        .eq(
          "child_assembly_id",
          h2AssemblyId,
        )
        .single();

    if (durableH1ToH2Error) {
      throw durableH1ToH2Error;
    }

    assert.equal(
      durableH1ToH2.id,
      h1ToH2.reconstructionId,
    );

    assert.equal(
      durableH1ToH2.parent_assembly_id,
      openH1.assemblyId,
    );

    assert.equal(
      durableH1ToH2.child_assembly_id,
      h2AssemblyId,
    );

    assert.equal(
      durableH1ToH2.reconstruction_policy_version,
      "hspp-reconstruction-policy-v1",
    );

    assert.equal(
      durableH1ToH2.reconstruction_reason,
      "POST_POSITIVE_MEMBER_REPLACEMENT",
    );


    /*
     * ============================================================
     * Q. H2 RE-ENTERS ORDINARY Q13F RECOVERY AS OPEN
     * ============================================================
     *
     * No reconstruction-specific recovery function is called here.
     * Q13f must discover H2 from the ordinary assembly table.
     */

    const h2SealCycle =
      await runHsppAssemblyRecoveryCycle({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          100,

        leaseSeconds:
          300,

        createProposedAssessedAt(
          workItem,
        ) {
          return new Date(
            Date.now() + 10_000,
          ).toISOString();
        },

        createLeaseToken(
          workItem,
        ) {
          assert.equal(
            workItem.organizationId,
            ORGANIZATION_ID,
          );

          return randomUUID();
        },
      });


    const h2OpenDiscovery =
      h2SealCycle.openDiscovery.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          h2AssemblyId,
      );

    assert.equal(
      h2OpenDiscovery.length,
      1,
      "Q13f must discover reconstructed H2 as an ordinary OPEN recovery work item.",
    );

    assert.equal(
      h2OpenDiscovery[0].assemblyState,
      "OPEN",
    );


    const h2OpenResults =
      h2SealCycle.openResults.filter(
        (
          result,
        ) =>
          result.workItem.assemblyId ===
          h2AssemblyId,
      );

    assert.equal(
      h2OpenResults.length,
      1,
      "Exactly one OPEN recovery result must exist for H2.",
    );

    const h2OpenResult =
      h2OpenResults[0];

    if (
      h2OpenResult.branch ===
      "OPEN_ERROR"
    ) {
      console.error(
        "HSPP_LOCAL_RECURSIVE_H2_OPEN_ERROR_DETAIL",
        {
          assemblyId:
            h2OpenResult.workItem.assemblyId,

          assemblyState:
            h2OpenResult.workItem.assemblyState,

          membershipPolicyVersion:
            h2OpenResult.workItem.membershipPolicyVersion,

          membershipPreparation:
            h2OpenResult.membershipPreparation,

          sealing:
            h2OpenResult.sealing,

          error:
            h2OpenResult.error,
        },
      );
    }

    assert.equal(
      h2OpenResult.branch,
      "OPEN_SEALED",
      h2OpenResult.branch === "OPEN_ERROR"
        ? `H2 OPEN recovery failed before sealing: ${h2OpenResult.error}`
        : "H2 must complete ordinary OPEN recovery sealing.",
    );

    assert.ok(
      h2OpenResult.sealing,
      "H2 OPEN recovery must return the real sealing result.",
    );

    assert.ok(
      h2OpenResult.membershipPreparation,
      "H2 OPEN recovery must return its child-specific B11A2 preparation.",
    );


    /*
     * ============================================================
     * R. VERIFY H2 IS NOW DURABLY SEALED
     * ============================================================
     */

    const {
      data: sealedDurableH2,
      error: sealedDurableH2Error,
    } =
      await supabase
        .from(
          "hspp_evidence_assemblies",
        )
        .select(
          "id,organization_id,assembly_state,sealed_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "id",
          h2AssemblyId,
        )
        .single();

    if (sealedDurableH2Error) {
      throw sealedDurableH2Error;
    }

    assert.equal(
      sealedDurableH2.assembly_state,
      "SEALED",
    );

    assert.equal(
      typeof sealedDurableH2.sealed_at,
      "string",
    );


    /*
     * ============================================================
     * S. SECOND RECOVERY CYCLE REDISCOVERS H2 AS SEALED
     * ============================================================
     *
     * Q13f deliberately does not assess an assembly in the same
     * cycle in which that assembly was discovered OPEN and sealed.
     */

    const h2AssessedAt =
      new Date(
        Date.now() + 20_000,
      ).toISOString();

    let h2AssessedAtFactoryCalls =
      0;

    let h2LeaseTokenFactoryCalls =
      0;


    const h2AssessmentCycle =
      await runHsppAssemblyRecoveryCycle({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          100,

        leaseSeconds:
          300,

        createProposedAssessedAt(
          workItem,
        ) {
          if (
            workItem.assemblyId ===
            h2AssemblyId
          ) {
            h2AssessedAtFactoryCalls +=
              1;

            assert.equal(
              workItem.assemblyState,
              "SEALED",
            );
          }

          return h2AssessedAt;
        },

        createLeaseToken(
          workItem,
        ) {
          if (
            workItem.assemblyId ===
            h2AssemblyId
          ) {
            h2LeaseTokenFactoryCalls +=
              1;
          }

          return randomUUID();
        },
      });


    const h2SealedDiscovery =
      h2AssessmentCycle.sealedDiscovery.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          h2AssemblyId,
      );

    assert.equal(
      h2SealedDiscovery.length,
      1,
      "Second Q13f cycle must rediscover H2 as ordinary SEALED recovery work.",
    );

    assert.equal(
      h2SealedDiscovery[0].assemblyState,
      "SEALED",
    );

    assert.equal(
      h2AssessedAtFactoryCalls,
      1,
    );

    assert.equal(
      h2LeaseTokenFactoryCalls,
      1,
    );


    /*
     * ============================================================
     * T. REAL H2 ASSESSMENT MUST COMPLETE
     * ============================================================
     */

    const h2SealedResults =
      h2AssessmentCycle.sealedResults.filter(
        (
          result,
        ) =>
          result.workItem.assemblyId ===
          h2AssemblyId,
      );

    assert.equal(
      h2SealedResults.length,
      1,
      "Exactly one SEALED recovery result must exist for H2.",
    );

    const h2SealedResult =
      h2SealedResults[0];

    if (
      h2SealedResult.branch ===
      "SEALED_ERROR"
    ) {
      console.error(
        "HSPP_LOCAL_RECURSIVE_H2_SEALED_ERROR_DETAIL",
        {
          assemblyId:
            h2SealedResult.workItem.assemblyId,

          assemblyState:
            h2SealedResult.workItem.assemblyState,

          sealedAt:
            h2SealedResult.workItem.sealedAt,

          error:
            h2SealedResult.error,
        },
      );
    }

    assert.equal(
      h2SealedResult.branch,
      "SEALED_ASSESSMENT",
      h2SealedResult.branch === "SEALED_ERROR"
        ? `H2 SEALED recovery failed: ${h2SealedResult.error}`
        : "H2 must complete the ordinary SEALED recovery assessment.",
    );

    assert.ok(
      h2SealedResult.assessment,
      "Q13f must return the real H2 sealed assessment result.",
    );

    assert.equal(
      h2SealedResult.assessment.branch,
      "ASSESSMENT_COMPLETED",
    );


    /*
     * ============================================================
     * U. H2 MUST OWN ITS OWN DURABLE POSITIVE CHECKPOINT
     * ============================================================
     */

    const {
      data: positiveH2,
      error: positiveH2Error,
    } =
      await supabase
        .from(
          "hspp_assembly_positive_assessment_checkpoints",
        )
        .select(
          "id,organization_id,assembly_id,assembly_decision_id,evidence_id,integrity_fingerprint,assessed_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "assembly_id",
          h2AssemblyId,
        )
        .single();

    if (positiveH2Error) {
      throw positiveH2Error;
    }

    assert.equal(
      positiveH2.organization_id,
      ORGANIZATION_ID,
    );

    assert.equal(
      positiveH2.assembly_id,
      h2AssemblyId,
    );

    assert.equal(
      new Date(
        positiveH2.assessed_at,
      ).toISOString(),

      new Date(
        h2AssessedAt,
      ).toISOString(),

      "H2 positive checkpoint assessed_at must preserve the same instant regardless of equivalent UTC serialization.",
    );

    assert.notEqual(
      positiveH2.id,
      positiveH1.id,
    );


    /*
     * ============================================================
     * V. CURRENT-LEAF POST-POSITIVE REENTRY
     * ============================================================
     *
     * Once H2 exists and is positively assessed:
     *
     *   H1 = reconstruction parent, therefore historical/non-leaf
     *   H2 = current effective descendant
     */

    const fairAfterH2Positive =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          100,
      });


    const h1AfterH2 =
      fairAfterH2Positive.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          openH1.assemblyId,
      );

    const h2PostPositive =
      fairAfterH2Positive.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          h2AssemblyId,
      );


    assert.equal(
      h1AfterH2.length,
      0,
      "H1 must no longer be a current post-positive leaf after H2 reconstruction.",
    );

    assert.equal(
      h2PostPositive.length,
      1,
      "H2 must become the ordinary current post-positive work item.",
    );


    const h2WorkItem =
      h2PostPositive[0];

    assert.equal(
      h2WorkItem.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      h2WorkItem.assemblyId,
      h2AssemblyId,
    );

    assert.equal(
      h2WorkItem.positiveCheckpointId,
      positiveH2.id,
    );

    assert.equal(
      h2WorkItem.workState,
      "REEVALUATION_REQUIRED",
    );


    /*
     * ============================================================
     * W. H2 Q14V — SAME REAL POST-POSITIVE UNSUITABILITY PATH
     * ============================================================
     *
     * Reuse the same controlled verification observation used for H1:
     *
     *   persisted evidence still exists
     *   -> controlled verification MISMATCH
     *   -> real evaluator
     *   -> real Q14v persistence
     */

    const h2UnsuitabilityObservedAt =
      new Date(
        new Date(
          positiveH2.assessed_at,
        ).getTime() + 1_000,
      ).toISOString();

    const h2UnsuitabilityDecidedAt =
      new Date(
        new Date(
          h2UnsuitabilityObservedAt,
        ).getTime() + 1_000,
      ).toISOString();


    const h2Q14v =
      await runHsppPostPositiveMemberUnsuitabilityAssessment(
        {
          supabase,

          workItem:
            h2WorkItem,

          leaseToken:
            randomUUID(),

          leaseSeconds:
            300,

          observedAt:
            h2UnsuitabilityObservedAt,

          decidedAt:
            h2UnsuitabilityDecidedAt,
        },
        {
          acquireLease:
            acquireHsppAssemblyAssessmentExecutionLease,

          releaseLease:
            releaseHsppAssemblyAssessmentExecutionLease,

          readEvidence:
            controlledMismatchRead,

          evaluate:
            evaluateHsppPostPositiveMemberUnsuitability,

          persistUnsuitability:
            persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease,
        },
      );


    assert.equal(
      h2Q14v.branch,
      "UNSUITABILITY_CHECKPOINT_PERSISTED",
    );

    assert.ok(
      h2Q14v.decision,
    );

    assert.equal(
      h2Q14v.decision.state,
      "UNSUITABLE",
    );

    assert.equal(
      h2Q14v.decision.reason,
      "CURRENT_INTEGRITY_NOT_VERIFIED",
    );

    assert.ok(
      h2Q14v.checkpoint,
    );

    assert.equal(
      h2Q14v.checkpoint.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      h2Q14v.checkpoint.assemblyId,
      h2AssemblyId,
    );

    assert.equal(
      h2Q14v.checkpoint.evidenceId,
      h2WorkItem.evidenceId,
    );

    assert.equal(
      h2Q14v.checkpoint.priorPositiveCheckpointId,
      positiveH2.id,
    );


    /*
     * ============================================================
     * X. FAIR V2 MUST ADVANCE H2 TO CESSATION_REQUIRED
     * ============================================================
     */

    const fairAfterH2Q14v =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          100,
      });


    const h2CessationCandidates =
      fairAfterH2Q14v.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          h2AssemblyId,
      );


    assert.equal(
      h2CessationCandidates.length,
      1,
      "H2 must remain the unique current-leaf work item after Q14v.",
    );


    const h2CessationWorkItem =
      h2CessationCandidates[0];


    assert.equal(
      h2CessationWorkItem.workState,
      "CESSATION_REQUIRED",
    );

    assert.equal(
      h2CessationWorkItem.unsuitabilityCheckpointId,
      h2Q14v.checkpoint.checkpointId,
    );


    /*
     * ============================================================
     * Y. REAL H2 EFFECTIVE CESSATION
     * ============================================================
     */

    const h2Cessation =
      await runHsppPostPositiveMemberEffectiveCessation({
        supabase,

        workItem:
          h2CessationWorkItem,

        leaseToken:
          randomUUID(),

        leaseSeconds:
          300,
      });


    assert.equal(
      h2Cessation.branch,
      "CESSATION_PERSISTED",
    );

    assert.ok(
      h2Cessation.cessation,
    );

    assert.equal(
      h2Cessation.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      h2Cessation.assemblyId,
      h2AssemblyId,
    );

    assert.equal(
      h2Cessation.cessation.organizationId,
      ORGANIZATION_ID,
    );

    assert.equal(
      h2Cessation.cessation.assemblyId,
      h2AssemblyId,
    );

    assert.equal(
      h2Cessation.cessation.evidenceId,
      h2CessationWorkItem.evidenceId,
    );

    assert.equal(
      h2Cessation.cessation.unsuitabilityCheckpointId,
      h2CessationWorkItem.unsuitabilityCheckpointId,
    );


    /*
     * ============================================================
     * Z. REAL H2 HISTORICAL RECONSTRUCTION CONTEXT
     * ============================================================
     */

    const historicalH2Read =
      await readHsppHistoricalReconstructionContexts({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        evidenceIds: [
          h2CessationWorkItem.evidenceId,
        ],
      });


    assert.equal(
      historicalH2Read.contexts.length,
      1,
      "Exactly one H2 historical context must exist after effective cessation.",
    );

    assert.deepEqual(
      historicalH2Read.noContextEvidenceIds,
      [],
    );


    const historicalH2 =
      historicalH2Read.contexts[0];


    assert.equal(
      historicalH2.parentAssemblyId,
      h2AssemblyId,
    );

    assert.equal(
      historicalH2.evidenceId,
      h2CessationWorkItem.evidenceId,
    );

    assert.equal(
      historicalH2.evidenceIntegrityFingerprint,
      h2CessationWorkItem.integrityFingerprint,
    );

    assert.equal(
      historicalH2.historicalMembershipId,
      h2Cessation.cessation.historicalMembershipId,
    );

    assert.equal(
      historicalH2.cessationId,
      h2Cessation.cessation.cessationId,
    );


    /*
     * ============================================================
     * AA. IDENTIFY H2 SURVIVING MEMBER
     * ============================================================
     */

    const h2Members = [
      survivingH1Evidence,
      replacementEvidence,
    ];


    const survivingH2Evidence =
      h2Members.find(
        (
          evidence,
        ) =>
          evidence.id !==
          h2CessationWorkItem.evidenceId,
      );


    assert.ok(
      survivingH2Evidence,
      "H2 must retain one surviving member after the selected member ceases.",
    );


    /*
     * ============================================================
     * AB. CREATE SECOND-GENERATION REPLACEMENT EVIDENCE
     * ============================================================
     */

    const secondReplacementProvider =
      survivingH2Evidence.id ===
      evidenceA.id
        ? "tomtom"
        : survivingH2Evidence.id ===
          evidenceC.id
          ? "here"
          : replacementProvider ===
            "here"
            ? "tomtom"
            : "here";


    const secondReplacementBuilt =
      buildHsppEvidence({
        sourceClass:
          "external_intelligence",

        sourceProvider:
          secondReplacementProvider,

        sourceStream:
          "recursive-road-events",

        sourceMessageId:
          `R2-${TEST_RUN_ID}`,

        observedAt:
          new Date(
            new Date(observedAt).getTime() +
            4_000,
          ).toISOString(),

        receivedAt:
          new Date(
            new Date(receivedAt).getTime() +
            4_000,
          ).toISOString(),

        payloadSchemaVersion:
          "hspp-local-road-event-v1",

        normalizedPayload: {
          ...normalizedPayload,

          description:
            `recursive-second-replacement-${TEST_RUN_ID}`,
        },
      });


    const secondReplacementEvidence =
      await persistHsppEvidence({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        evidence:
          secondReplacementBuilt,
      });


    assert.match(
      secondReplacementEvidence.integrityFingerprint,
      /^[0-9a-f]{64}$/,
    );

    assert.notEqual(
      secondReplacementEvidence.id,
      survivingH2Evidence.id,
    );

    assert.notEqual(
      secondReplacementEvidence.id,
      historicalH2.evidenceId,
    );


    /*
     * ============================================================
     * AC. REAL Q14H — H2 -> H3
     * ============================================================
     */

    const h3AssemblyId =
      randomUUID();


    const h2ToH3 =
      await persistHsppEvidenceAssemblyReconstruction({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        parentAssemblyId:
          historicalH2.parentAssemblyId,

        childAssemblyId:
          h3AssemblyId,

        membershipPolicyVersion:
          membershipDecision.policyVersion,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "POST_POSITIVE_MEMBER_REPLACEMENT",

        members: [
          {
            evidenceId:
              survivingH2Evidence.id,

            integrityFingerprint:
              survivingH2Evidence.integrityFingerprint,
          },
          {
            evidenceId:
              secondReplacementEvidence.id,

            integrityFingerprint:
              secondReplacementEvidence.integrityFingerprint,
          },
        ],
      });


    assert.equal(
      h2ToH3.parentAssemblyId,
      h2AssemblyId,
    );

    assert.equal(
      h2ToH3.childAssemblyId,
      h3AssemblyId,
    );

    assert.equal(
      h2ToH3.assemblyState,
      "OPEN",
    );

    assert.equal(
      h2ToH3.persistedMemberCount,
      2,
    );


    /*
     * ============================================================
     * AD. DURABLE H3 MUST BE AN ORDINARY OPEN ASSEMBLY
     * ============================================================
     */

    const {
      data: durableH3,
      error: durableH3Error,
    } =
      await supabase
        .from(
          "hspp_evidence_assemblies",
        )
        .select(
          "id,organization_id,assembly_state,membership_policy_version,sealed_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "id",
          h3AssemblyId,
        )
        .single();


    if (durableH3Error) {
      throw durableH3Error;
    }


    assert.equal(
      durableH3.id,
      h3AssemblyId,
    );

    assert.equal(
      durableH3.organization_id,
      ORGANIZATION_ID,
    );

    assert.equal(
      durableH3.assembly_state,
      "OPEN",
    );

    assert.equal(
      durableH3.membership_policy_version,
      membershipDecision.policyVersion,
    );

    assert.equal(
      durableH3.sealed_at,
      null,
    );


    /*
     * ============================================================
     * AE. EXACT H2 -> H3 RECONSTRUCTION PROVENANCE
     * ============================================================
     */

    const {
      data: durableH2ToH3,
      error: durableH2ToH3Error,
    } =
      await supabase
        .from(
          "hspp_evidence_assembly_reconstructions",
        )
        .select(
          "id,organization_id,parent_assembly_id,child_assembly_id,reconstruction_policy_version,reconstruction_reason",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "parent_assembly_id",
          h2AssemblyId,
        )
        .eq(
          "child_assembly_id",
          h3AssemblyId,
        )
        .single();


    if (durableH2ToH3Error) {
      throw durableH2ToH3Error;
    }


    assert.equal(
      durableH2ToH3.id,
      h2ToH3.reconstructionId,
    );

    assert.equal(
      durableH2ToH3.parent_assembly_id,
      h2AssemblyId,
    );

    assert.equal(
      durableH2ToH3.child_assembly_id,
      h3AssemblyId,
    );


    /*
     * ============================================================
     * AF. H2 MUST STOP BEING CURRENT POST-POSITIVE LEAF
     * ============================================================
     */

    const fairAfterH3 =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          100,
      });


    const h1AfterH3 =
      fairAfterH3.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          openH1.assemblyId,
      );


    const h2AfterH3 =
      fairAfterH3.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          h2AssemblyId,
      );


    const h3PostPositiveBeforeAssessment =
      fairAfterH3.workItems.filter(
        (
          item,
        ) =>
          item.assemblyId ===
          h3AssemblyId,
      );


    assert.equal(
      h1AfterH3.length,
      0,
      "H1 must remain historical after two reconstruction generations.",
    );

    assert.equal(
      h2AfterH3.length,
      0,
      "H2 must leave post-positive discovery once H3 becomes its reconstruction child.",
    );

    assert.equal(
      h3PostPositiveBeforeAssessment.length,
      0,
      "OPEN H3 must not enter post-positive processing before ordinary assessment.",
    );


    /*
     * ============================================================
     * AG. RECURSIVE LIFECYCLE PROOF
     * ============================================================
     */

    console.log(
      "HSPP_LOCAL_RECURSIVE_H1_H2_H3_PASS",
      {
        organizationId:
          ORGANIZATION_ID,

        h1AssemblyId:
          openH1.assemblyId,

        h2AssemblyId,

        h3AssemblyId,

        h1ToH2ReconstructionId:
          h1ToH2.reconstructionId,

        h2ToH3ReconstructionId:
          h2ToH3.reconstructionId,

        h2CessationId:
          h2Cessation.cessation.cessationId,

        h3State:
          h2ToH3.assemblyState,

        h1PostPositiveCount:
          h1AfterH3.length,

        h2PostPositiveCount:
          h2AfterH3.length,

        h3PostPositiveBeforeAssessmentCount:
          h3PostPositiveBeforeAssessment.length,
      },
    );

    console.log(
      "HSPP_LOCAL_RECURSIVE_H2_POSITIVE_REENTRY_PASS",
      {
        organizationId:
          ORGANIZATION_ID,

        h1AssemblyId:
          openH1.assemblyId,

        h2AssemblyId,

        h2PositiveCheckpointId:
          positiveH2.id,

        h1CurrentLeafWorkCount:
          h1AfterH2.length,

        h2CurrentLeafWorkCount:
          h2PostPositive.length,

        h2WorkState:
          h2WorkItem.workState,

        next:
          "CESSATION_AND_RECONSTRUCT_H3",
      },
    );

    console.log(
      "HSPP_LOCAL_RECURSIVE_H1_TO_H2_PASS",
      {
        organizationId:
          ORGANIZATION_ID,

        h1AssemblyId:
          openH1.assemblyId,

        cessationId:
          h1Cessation.cessation.cessationId,

        historicalMembershipId:
          historicalH1.historicalMembershipId,

        replacementEvidenceId:
          replacementEvidence.id,

        h2AssemblyId,

        reconstructionId:
          h1ToH2.reconstructionId,

        h2State:
          h1ToH2.assemblyState,

        next:
          "RECOVER_SEAL_AND_POSITIVELY_ASSESS_H2",
      },
    );

    console.log(
      "HSPP_LOCAL_RECURSIVE_H1_CESSATION_PASS",
      {
        organizationId:
          ORGANIZATION_ID,

        h1AssemblyId:
          openH1.assemblyId,

        positiveCheckpointId:
          positiveH1.id,

        unsuitabilityCheckpointId:
          h1CessationWorkItem.unsuitabilityCheckpointId,

        cessationId:
          h1Cessation.cessation.cessationId,

        next:
          "READ_HISTORICAL_CONTEXT_AND_RECONSTRUCT_H2",
      },
    );

    console.log(
      "HSPP_LOCAL_RECURSIVE_H1_POSITIVE_PASS",
      {
        organizationId:
          ORGANIZATION_ID,

        h1AssemblyId:
          openH1.assemblyId,

        positiveCheckpointId:
          positiveH1.id,

        evidenceAId:
          evidenceA.id,

        evidenceCId:
          evidenceC.id,

        next:
          "CREATE_REAL_Q14V_AND_CESSATION",
      },
    );
  }
  catch (
    error: unknown
  ) {
    primaryLifecycleError =
      error;
  }
  finally {
    if (organizationCreated) {
      try {
        cleanupOrganization(
          ORGANIZATION_ID,
        );
      }
      catch (
        error: unknown
      ) {
        cleanupError =
          error;
      }
    }
  }

  if (primaryLifecycleError) {
    if (cleanupError) {
      console.error(
        "HSPP_LOCAL_RECURSIVE_CLEANUP_SECONDARY_FAIL",
        cleanupError,
      );
    }

    throw primaryLifecycleError;
  }

  if (cleanupError) {
    throw cleanupError;
  }
}


main().catch(
  (error: unknown) => {
    console.error(
      "HSPP_LOCAL_RECURSIVE_RECONSTRUCTION_FOUNDATION_FAIL",
      error,
    );

    process.exitCode =
      1;
  },
);
