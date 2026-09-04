import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  randomUUID,
} from "node:crypto";

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
  applyHsppAssessmentDecision,
} from "../lib/hspp/applyHsppAssessmentDecision";

import {
  evaluateHsppAssemblyEncounterMembership,
} from "../lib/hspp/evaluateHsppAssemblyEncounterMembership";

import {
  prepareHsppAssemblyEncounterContribution,
} from "../lib/hspp/prepareHsppAssemblyEncounterContribution";

import {
  runHsppAssemblyEncounterContributionLifecycle,
} from "../lib/hspp/runHsppAssemblyEncounterContributionLifecycle";


const TEST_RUN_ID =
  randomUUID();

const ORGANIZATION_ID =
  randomUUID();

const ORGANIZATION_NAME =
  `HSPP encounter lifecycle ${TEST_RUN_ID}`;

const PARENT_EVIDENCE_IDENTITY =
  `encounter-parent-${TEST_RUN_ID}`;


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
    "Encounter integration refuses non-local Supabase.",
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
  );

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
      "delete from public.organizations",
      `where id = '${organizationId}'::uuid;`,
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
          persistSession:
            false,

          autoRefreshToken:
            false,
        },
      },
    );

  let organizationCreated =
    false;

  let primaryError:
    unknown =
      null;

  let cleanupError:
    unknown =
      null;

  try {
    /*
     * ------------------------------------------------------------
     * A. LOCAL FIXTURE ORGANIZATION
     * ------------------------------------------------------------
     */
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
        .select("id")
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


    /*
     * ------------------------------------------------------------
     * B. CREATE REAL OPERATIONAL PARENT C
     * ------------------------------------------------------------
     */
    const observedAt =
      "2026-09-04T07:00:00.000Z";

    const parentPayload = {
      eventType:
        "road-hazard",

      latitude:
        -33.9249,

      longitude:
        18.4241,

      testRunId:
        TEST_RUN_ID,
    };

    const builtParent =
      buildHsppEvidence({
        sourceClass:
          "external_intelligence",

        sourceProvider:
          "tomtom",

        sourceStream:
          "encounter-integration",

        sourceMessageId:
          PARENT_EVIDENCE_IDENTITY,

        observedAt,

        payloadSchemaVersion:
          "hspp-local-road-event-v1",

        normalizedPayload:
          parentPayload,
      });

    const persistedParent =
      await persistHsppEvidence({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        evidence:
          builtParent,
      });

    assert.match(
      persistedParent.integrityFingerprint,
      /^[0-9a-f]{64}$/,
    );


    /*
     * Give the parent the minimum already-proven operational
     * assessment needed for the encounter lifecycle to re-read it.
     */
    await applyHsppAssessmentDecision({
      supabase,

      organizationId:
        ORGANIZATION_ID,

      evidenceId:
        persistedParent.id,

      integrityFingerprint:
        persistedParent.integrityFingerprint,

      assessment: {
        policyVersion:
          "hspp-local-encounter-parent-assessment-v1",

        trustState:
          "PLAUSIBLE",

        operationalEligible:
          true,

        crowdEligible:
          false,

        trainingEligible:
          false,

        validationEligible:
          false,

        reason:
          "local_encounter_parent_fixture",
      },

      assessedAt:
        "2026-09-04T07:01:00.000Z",
    });


    /*
     * ------------------------------------------------------------
     * C. REAL B11A2 ENCOUNTER COMPATIBILITY
     * ------------------------------------------------------------
     *
     * The source candidate is the persisted parent C.
     * The target anchor is a separate immutable evidence identity.
     *
     * No assembly persistence is performed by this integration test.
     * This remains a test of the encounter contribution lifecycle,
     * not assembly-construction authority.
     */
    const anchorEvidenceId =
      randomUUID();

    const anchorFingerprint =
      "a".repeat(64);

    const encounterMembership =
      evaluateHsppAssemblyEncounterMembership({
        organizationId:
          ORGANIZATION_ID,

        candidate: {
          sourceAssemblyId:
            `source-assembly-${TEST_RUN_ID}`,

          targetAssemblyId:
            `target-assembly-${TEST_RUN_ID}`,

          evidenceId:
            persistedParent.id,

          integrityFingerprint:
            persistedParent.integrityFingerprint,

          memberOrdinal:
            1,

          sourceProvider:
            "tomtom",

          sourceClass:
            "external_intelligence",

          observedAt,

          validationState:
            "VALIDATED",
        },

        candidateEvidence: {
          organizationId:
            ORGANIZATION_ID,

          evidenceId:
            persistedParent.id,

          integrityFingerprint:
            persistedParent.integrityFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "tomtom",

          observedAt,

          latitude:
            parentPayload.latitude,

          longitude:
            parentPayload.longitude,

          eventType:
            parentPayload.eventType,
        },

        targetAssembly: {
          organizationId:
            ORGANIZATION_ID,

          assemblyId:
            `target-assembly-${TEST_RUN_ID}`,

          members: [
            {
              membershipId:
                `anchor-membership-${TEST_RUN_ID}`,

              evidenceId:
                anchorEvidenceId,

              integrityFingerprint:
                anchorFingerprint,

              memberOrdinal:
                0,

              sourceProvider:
                "here",

              sourceClass:
                "external_intelligence",

              observedAt,

              integrityStatus:
                "MATCH",

              validationState:
                "VALIDATED",
            },
          ],
        },

        targetAnchorEvidence: {
          organizationId:
            ORGANIZATION_ID,

          evidenceId:
            anchorEvidenceId,

          integrityFingerprint:
            anchorFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "here",

          observedAt,

          latitude:
            parentPayload.latitude,

          longitude:
            parentPayload.longitude,

          eventType:
            parentPayload.eventType,
        },
      });

    assert.equal(
      encounterMembership.state,
      "PAIR_MEMBERSHIP_ELIGIBLE",
    );

    assert.equal(
      encounterMembership.authority,
      "NONE",
    );


    /*
     * ------------------------------------------------------------
     * D. PREPARE C-PRIME
     * ------------------------------------------------------------
     */
    const contribution =
      prepareHsppAssemblyEncounterContribution({
        organizationId:
          ORGANIZATION_ID,

        encounterMembership,

        parentEvidence: {
          evidenceId:
            persistedParent.id,

          integrityFingerprint:
            persistedParent.integrityFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "tomtom",
        },

        derivedSourceStream:
          "hspp-assembly-encounter",

        derivedSourceMessageId:
          `derived-${TEST_RUN_ID}`,

        derivedObservedAt:
          "2026-09-04T07:02:00.000Z",

        derivedPayloadSchemaVersion:
          "hspp-assembly-encounter-contribution-v1",

        derivedNormalizedPayload: {
          eventType:
            parentPayload.eventType,

          latitude:
            parentPayload.latitude,

          longitude:
            parentPayload.longitude,

          encounterSourceAssemblyId:
            encounterMembership
              .sourceAssemblyId,

          encounterTargetAssemblyId:
            encounterMembership
              .targetAssemblyId,

          encounterTargetAnchorEvidenceId:
            encounterMembership
              .targetAnchorEvidenceId,

          parentEvidenceId:
            persistedParent.id,

          testRunId:
            TEST_RUN_ID,
        },
      });

    assert.equal(
      contribution.state,
      "ENCOUNTER_CONTRIBUTION_PREPARED",
    );

    assert.equal(
      contribution.authority,
      "NONE",
    );


    /*
     * ------------------------------------------------------------
     * E. REAL DATABASE LIFECYCLE
     * ------------------------------------------------------------
     *
     * build
     * verify
     * persist C'
     * assess C'
     * persist assessment
     * authoritative Reservoir reread
     */
    const result =
      await runHsppAssemblyEncounterContributionLifecycle({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        contribution,

        assessedAt:
          "2026-09-04T07:03:00.000Z",
      });

    assert.equal(
      result.state,
      "ENCOUNTER_CONTRIBUTION_RESERVOIR_ELIGIBLE",
    );

    assert.equal(
      result.assessmentTrustState,
      "PLAUSIBLE",
    );

    assert.equal(
      result.membershipClassification,
      "NEVER_ASSEMBLED",
    );

    assert.equal(
      result.authority,
      "NONE",
    );

    assert.equal(
      result.created,
      true,
    );

    assert.notEqual(
      result.derivedEvidenceId,
      persistedParent.id,
    );

    assert.match(
      result.derivedIntegrityFingerprint,
      /^[0-9a-f]{64}$/,
    );


    /*
     * ------------------------------------------------------------
     * F. RETRY / IDEMPOTENCY RECOVERY
     * ------------------------------------------------------------
     *
     * Same exact encounter contribution should recover the same
     * immutable C-prime rather than creating another contribution.
     */
    const retry =
      await runHsppAssemblyEncounterContributionLifecycle({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        contribution,

        assessedAt:
          "2026-09-04T07:04:00.000Z",
      });

    assert.equal(
      retry.state,
      "ENCOUNTER_CONTRIBUTION_RESERVOIR_ELIGIBLE",
    );

    assert.equal(
      retry.created,
      false,
    );

    assert.equal(
      retry.derivedEvidenceId,
      result.derivedEvidenceId,
    );

    assert.equal(
      retry.derivedIntegrityFingerprint,
      result.derivedIntegrityFingerprint,
    );

    assert.equal(
      retry.membershipClassification,
      "NEVER_ASSEMBLED",
    );

    assert.equal(
      retry.authority,
      "NONE",
    );



    /*
     * ------------------------------------------------------------
     * G. POST_PERSIST_PRE_ASSESSMENT_RECOVERY
     * ------------------------------------------------------------
     *
     * Simulate a partial failure:
     *
     *   prepare C''
     *   -> build C''
     *   -> persist C''
     *   -> process stops before assessment
     *
     * The ordinary lifecycle runner must recover that exact immutable
     * C'' on retry, assess it, and expose it through the existing
     * Reservoir lifecycle without creating a duplicate evidence row.
     */

    const partialFailureContribution =
      prepareHsppAssemblyEncounterContribution({
        organizationId:
          ORGANIZATION_ID,

        encounterMembership,

        parentEvidence: {
          evidenceId:
            persistedParent.id,

          integrityFingerprint:
            persistedParent.integrityFingerprint,

          sourceClass:
            "external_intelligence",

          sourceProvider:
            "tomtom",
        },

        derivedSourceStream:
          "hspp-assembly-encounter",

        derivedSourceMessageId:
          `partial-failure-${TEST_RUN_ID}`,

        derivedObservedAt:
          "2026-09-04T07:05:00.000Z",

        derivedPayloadSchemaVersion:
          "hspp-assembly-encounter-contribution-v1",

        derivedNormalizedPayload: {
          eventType:
            parentPayload.eventType,

          latitude:
            parentPayload.latitude,

          longitude:
            parentPayload.longitude,

          encounterSourceAssemblyId:
            encounterMembership
              .sourceAssemblyId,

          encounterTargetAssemblyId:
            encounterMembership
              .targetAssemblyId,

          encounterTargetAnchorEvidenceId:
            encounterMembership
              .targetAnchorEvidenceId,

          parentEvidenceId:
            persistedParent.id,

          recoveryScenario:
            "POST_PERSIST_PRE_ASSESSMENT_RECOVERY",

          testRunId:
            TEST_RUN_ID,
        },
      });


    /*
     * Build and persist manually.
     *
     * Deliberately DO NOT:
     *
     * - assess the derived evidence;
     * - apply an assessment decision;
     * - read it into the Reservoir through the lifecycle runner yet.
     *
     * This creates the exact simulated interruption point.
     */
    const partialFailureBuilt =
      buildHsppEvidence(
        partialFailureContribution
          .evidenceBuildInput,
      );

    const partialFailurePersisted =
      await persistHsppEvidence({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        evidence:
          partialFailureBuilt,
      });


    assert.notEqual(
      partialFailurePersisted.id,
      persistedParent.id,
    );

    assert.match(
      partialFailurePersisted
        .integrityFingerprint,
      /^[0-9a-f]{64}$/,
    );


    /*
     * Prove the interrupted row exists before recovery.
     */
    const {
      data:
        partialFailureBeforeRecovery,
      error:
        partialFailureBeforeRecoveryError,
    } =
      await supabase
        .from("hspp_evidence")
        .select(
          "id, trust_state, operational_eligible, assessment_policy_version, assessment_reason, assessed_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "id",
          partialFailurePersisted.id,
        )
        .eq(
          "integrity_fingerprint",
          partialFailurePersisted
            .integrityFingerprint,
        )
        .single();

    if (
      partialFailureBeforeRecoveryError
    ) {
      throw partialFailureBeforeRecoveryError;
    }

    assert.equal(
      partialFailureBeforeRecovery.id,
      partialFailurePersisted.id,
    );

    assert.equal(
      partialFailureBeforeRecovery
        .trust_state,
      "UNASSESSED",
    );

    assert.equal(
      partialFailureBeforeRecovery
        .operational_eligible,
      true,
    );

    assert.equal(
      partialFailureBeforeRecovery
        .assessment_policy_version,
      null,
    );

    assert.equal(
      partialFailureBeforeRecovery
        .assessment_reason,
      null,
    );

    assert.equal(
      partialFailureBeforeRecovery
        .assessed_at,
      null,
    );


    /*
     * Retry through the already-certified production composition.
     *
     * It must recover the persisted immutable evidence rather than
     * creating another C''.
     */
    const partialFailureRecovery =
      await runHsppAssemblyEncounterContributionLifecycle({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        contribution:
          partialFailureContribution,

        assessedAt:
          "2026-09-04T07:06:00.000Z",
      });


    assert.equal(
      partialFailureRecovery.state,
      "ENCOUNTER_CONTRIBUTION_RESERVOIR_ELIGIBLE",
    );

    assert.equal(
      partialFailureRecovery.created,
      false,
    );

    assert.equal(
      partialFailureRecovery
        .derivedEvidenceId,
      partialFailurePersisted.id,
    );

    assert.equal(
      partialFailureRecovery
        .derivedIntegrityFingerprint,
      partialFailurePersisted
        .integrityFingerprint,
    );

    assert.equal(
      partialFailureRecovery
        .assessmentTrustState,
      "PLAUSIBLE",
    );

    assert.equal(
      partialFailureRecovery
        .membershipClassification,
      "NEVER_ASSEMBLED",
    );

    assert.equal(
      partialFailureRecovery.authority,
      "NONE",
    );


    /*
     * Verify recovery persisted the assessment onto the same row.
     */
    const {
      data:
        partialFailureAfterRecovery,
      error:
        partialFailureAfterRecoveryError,
    } =
      await supabase
        .from("hspp_evidence")
        .select(
          "id, trust_state, operational_eligible, assessment_policy_version, assessment_reason, assessed_at",
        )
        .eq(
          "organization_id",
          ORGANIZATION_ID,
        )
        .eq(
          "id",
          partialFailurePersisted.id,
        )
        .eq(
          "integrity_fingerprint",
          partialFailurePersisted
            .integrityFingerprint,
        )
        .single();

    if (
      partialFailureAfterRecoveryError
    ) {
      throw partialFailureAfterRecoveryError;
    }

    assert.equal(
      partialFailureAfterRecovery.id,
      partialFailurePersisted.id,
    );

    assert.equal(
      partialFailureAfterRecovery
        .trust_state,
      "PLAUSIBLE",
    );

    assert.equal(
      partialFailureAfterRecovery
        .operational_eligible,
      true,
    );

    assert.equal(
      partialFailureAfterRecovery
        .assessment_policy_version,
      "hspp-assembly-encounter-contribution-assessment-v1",
    );

    assert.equal(
      partialFailureAfterRecovery
        .assessment_reason,
      "encounter_contribution_plausibility_passed",
    );

    assert.equal(
      typeof partialFailureAfterRecovery
        .assessed_at,
      "string",
    );

    console.log(
      "HSPP_LOCAL_ASSEMBLY_ENCOUNTER_CONTRIBUTION_LIFECYCLE_PASS",
      {
        organizationId:
          ORGANIZATION_ID,

        parentEvidenceId:
          persistedParent.id,

        derivedEvidenceId:
          result.derivedEvidenceId,

        derivedIntegrityFingerprint:
          result.derivedIntegrityFingerprint,

        trust:
          result.assessmentTrustState,

        membershipClassification:
          result.membershipClassification,

        retryRecovered:
          retry.created === false,

        authority:
          result.authority,
      },
    );
  }
  catch (error) {
    primaryError =
      error;

    throw error;
  }
  finally {
    if (organizationCreated) {
      try {
        cleanupOrganization(
          ORGANIZATION_ID,
        );
      }
      catch (error) {
        cleanupError =
          error;

        console.error(
          "HSPP_LOCAL_ENCOUNTER_CLEANUP_FAILED",
          error,
        );
      }
    }

    if (
      !primaryError &&
      cleanupError
    ) {
      throw cleanupError;
    }
  }
}


void main();