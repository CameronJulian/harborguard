import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX,
  HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS,
  readHsppReservoirEligibleEvidenceByIds,
} from "../lib/hspp/readHsppReservoirEligibleEvidenceByIds";

import {
  buildHsppEvidence,
} from "../lib/hspp/buildHsppEvidence";


type MembershipClassificationRow = {
  evidence_id: string;

  has_historical_membership:
    boolean;

  has_current_effective_membership:
    boolean;

  membership_classification:
    | "NEVER_ASSEMBLED"
    | "HISTORICAL_NOT_CURRENT"
    | "CURRENT_EFFECTIVE";
};


function validPersistedEvidenceRow(
  id: string,
) {
  const evidence =
    buildHsppEvidence({
      sourceClass:
        "telematics",

      sourceProvider:
        "test-provider",

      sourceStream:
        "test-stream",

      sourceMessageId:
        `message-${id}`,

      observedAt:
        "2026-08-21T10:00:00.000Z",

      receivedAt:
        "2026-08-21T10:00:01.000Z",

      payloadSchemaVersion:
        "1",

      normalizedPayload: {
        vehicleId:
          "vehicle-1",
      },
    });

  return {
    id,

    organization_id:
      "00000000-0000-0000-0000-0000000000a1",

    protocol_version:
      evidence.protocolVersion,

    canonicalization_version:
      evidence.canonicalizationVersion,

    source_class:
      evidence.sourceClass,

    source_provider:
      evidence.sourceProvider,

    source_stream:
      evidence.sourceStream,

    source_message_id:
      evidence.sourceMessageId,

    observed_at:
      evidence.observedAt,

    received_at:
      evidence.receivedAt,

    payload_schema_version:
      evidence.payloadSchemaVersion,

    normalized_payload:
      evidence.normalizedPayload,

    integrity_algorithm:
      evidence.integrityAlgorithm,

    integrity_fingerprint:
      evidence.integrityFingerprint,

    integrity_state:
      evidence.integrityState,

    validation_state:
      "VALIDATED",

    trust_state:
      "VERIFIED",

    operational_eligible:
      true,

    assessment_policy_version:
      "hspp-assessment-v1",

    assessment_reason:
      "verified_test_evidence",

    assessed_at:
      "2026-08-21T10:00:02.000Z",

    parent_evidence_id:
      null,

    parent_integrity_fingerprint:
      null,

    derivation_type:
      null,

    derivation_version:
      null,
  };
}


function neverAssembledRow(
  evidenceId: string,
): MembershipClassificationRow {
  return {
    evidence_id:
      evidenceId,

    has_historical_membership:
      false,

    has_current_effective_membership:
      false,

    membership_classification:
      "NEVER_ASSEMBLED",
  };
}


function evidenceIdForIndex(
  index: number,
): string {
  return (
    "00000000-0000-0000-0000-" +
    index
      .toString(16)
      .padStart(
        12,
        "0",
      )
  );
}


function createSupabaseMock({
  membershipRows,
  persistedRows,
}: {
  membershipRows:
    Record<
      string,
      MembershipClassificationRow
    >;

  persistedRows:
    Record<
      string,
      ReturnType<
        typeof validPersistedEvidenceRow
      >
    >;
}) {
  const calls:
    Array<
      [
        string,
        unknown,
      ]
    > =
      [];

  let table =
    "";

  let currentInValues:
    string[] =
      [];


  const query:
    any =
      {
        select(
          value: string,
        ) {
          calls.push([
            "select",
            value,
          ]);

          return query;
        },


        eq(
          column: string,
          value: unknown,
        ) {
          calls.push([
            `eq:${column}`,
            value,
          ]);

          return query;
        },


        in(
          column: string,
          values: string[],
        ) {
          calls.push([
            `in:${column}`,
            values,
          ]);

          currentInValues =
            values;

          return query;
        },


        order(
          column: string,
          value: unknown,
        ) {
          calls.push([
            `order:${column}`,
            value,
          ]);

          return query;
        },


        limit(
          value: number,
        ) {
          calls.push([
            "limit",
            value,
          ]);

          return query;
        },


        then(
          resolve:
            (
              value: unknown,
            ) => void,
        ) {
          if (
            table ===
            "hspp_evidence"
          ) {
            const rows =
              currentInValues
                .map(
                  (evidenceId) =>
                    persistedRows[
                      evidenceId
                    ],
                )
                .filter(
                  Boolean,
                );

            return Promise.resolve({
              data:
                rows,

              error:
                null,
            }).then(
              resolve,
            );
          }

          return Promise.resolve({
            data: [],

            error:
              null,
          }).then(
            resolve,
          );
        },
      };


  const supabase =
    {
      from(
        value: string,
      ) {
        table =
          value;

        currentInValues =
          [];

        calls.push([
          "from",
          value,
        ]);

        return query;
      },


      async rpc(
        functionName:
          string,

        args:
          Record<
            string,
            unknown
          >,
      ) {
        calls.push([
          "rpc",
          {
            functionName,
            args,
          },
        ]);

        if (
          functionName ===
          "read_hspp_evidence_assembly_membership_classifications"
        ) {
          const evidenceIds =
            (
              args
                .p_evidence_ids ??
              []
            ) as string[];

          return {
            data:
              evidenceIds
                .map(
                  (evidenceId) =>
                    membershipRows[
                      evidenceId
                    ],
                )
                .filter(
                  Boolean,
                ),

            error:
              null,
          };
        }

        return {
          data: [],

          error:
            null,
        };
      },
    };


  return {
    supabase,

    calls,
  };
}


function membershipRpcCalls(
  calls:
    Array<
      [
        string,
        unknown,
      ]
    >,
) {
  return calls.filter(
    (
      [
        operation,
        value,
      ],
    ) =>
      operation ===
        "rpc" &&
      typeof value ===
        "object" &&
      value !==
        null &&
      (
        value as {
          functionName?:
            unknown;
        }
      ).functionName ===
        "read_hspp_evidence_assembly_membership_classifications",
  );
}


test(
  "shared Reservoir revalidation preserves NEVER_ASSEMBLED and HISTORICAL_NOT_CURRENT while excluding CURRENT_EFFECTIVE",
  async () => {
    const never =
      evidenceIdForIndex(
        1,
      );

    const historical =
      evidenceIdForIndex(
        2,
      );

    const current =
      evidenceIdForIndex(
        3,
      );

    const mock =
      createSupabaseMock({
        membershipRows: {
          [never]:
            neverAssembledRow(
              never,
            ),

          [historical]: {
            evidence_id:
              historical,

            has_historical_membership:
              true,

            has_current_effective_membership:
              false,

            membership_classification:
              "HISTORICAL_NOT_CURRENT",
          },

          [current]: {
            evidence_id:
              current,

            has_historical_membership:
              true,

            has_current_effective_membership:
              true,

            membership_classification:
              "CURRENT_EFFECTIVE",
          },
        },

        persistedRows: {
          [never]:
            validPersistedEvidenceRow(
              never,
            ),

          [historical]:
            validPersistedEvidenceRow(
              historical,
            ),

          [current]:
            validPersistedEvidenceRow(
              current,
            ),
        },
      });


    const candidates =
      await readHsppReservoirEligibleEvidenceByIds({
        supabase:
          mock.supabase as any,

        organizationId:
          "00000000-0000-0000-0000-0000000000a1",

        evidenceIds: [
          never,
          historical,
          current,
        ],
      });


    assert.deepEqual(
      candidates.map(
        (candidate) =>
          candidate.evidenceId,
      ),
      [
        never,
        historical,
      ],
    );

    assert.equal(
      candidates[0]
        .membershipClassification,
      "NEVER_ASSEMBLED",
    );

    assert.equal(
      candidates[1]
        .membershipClassification,
      "HISTORICAL_NOT_CURRENT",
    );

    assert.equal(
      candidates[0]
        .reservoirDecision
        .reason,
      "RESERVOIR_ELIGIBLE",
    );

    assert.equal(
      candidates[1]
        .reservoirDecision
        .reason,
      "RESERVOIR_ELIGIBLE",
    );
  },
);


test(
  "shared Reservoir revalidation chunks the maximum 200 unique endpoints into two authoritative 100-id classification reads",
  async () => {
    const evidenceIds =
      Array.from(
        {
          length:
            HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS,
        },
        (
          _,
          index,
        ) =>
          evidenceIdForIndex(
            index + 1,
          ),
      );

    const membershipRows:
      Record<
        string,
        MembershipClassificationRow
      > =
        {};

    const persistedRows:
      Record<
        string,
        ReturnType<
          typeof validPersistedEvidenceRow
        >
      > =
        {};

    for (
      const evidenceId of
      evidenceIds
    ) {
      membershipRows[
        evidenceId
      ] =
        neverAssembledRow(
          evidenceId,
        );

      persistedRows[
        evidenceId
      ] =
        validPersistedEvidenceRow(
          evidenceId,
        );
    }


    const mock =
      createSupabaseMock({
        membershipRows,
        persistedRows,
      });


    const candidates =
      await readHsppReservoirEligibleEvidenceByIds({
        supabase:
          mock.supabase as any,

        organizationId:
          "00000000-0000-0000-0000-0000000000a1",

        evidenceIds,
      });


    assert.equal(
      candidates.length,
      HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS,
    );


    const rpcCalls =
      membershipRpcCalls(
        mock.calls,
      );

    assert.equal(
      rpcCalls.length,
      2,
    );


    const firstArgs =
      (
        rpcCalls[0][1] as {
          args:
            {
              p_evidence_ids:
                string[];
            };
        }
      ).args;

    const secondArgs =
      (
        rpcCalls[1][1] as {
          args:
            {
              p_evidence_ids:
                string[];
            };
        }
      ).args;


    assert.equal(
      firstArgs
        .p_evidence_ids
        .length,
      HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX,
    );

    assert.equal(
      secondArgs
        .p_evidence_ids
        .length,
      HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX,
    );

    assert.deepEqual(
      [
        ...firstArgs
          .p_evidence_ids,

        ...secondArgs
          .p_evidence_ids,
      ],
      evidenceIds,
    );
  },
);


test(
  "shared Reservoir revalidation deduplicates endpoint identities before operational and membership reads",
  async () => {
    const first =
      evidenceIdForIndex(
        1,
      );

    const second =
      evidenceIdForIndex(
        2,
      );

    const mock =
      createSupabaseMock({
        membershipRows: {
          [first]:
            neverAssembledRow(
              first,
            ),

          [second]:
            neverAssembledRow(
              second,
            ),
        },

        persistedRows: {
          [first]:
            validPersistedEvidenceRow(
              first,
            ),

          [second]:
            validPersistedEvidenceRow(
              second,
            ),
        },
      });


    const candidates =
      await readHsppReservoirEligibleEvidenceByIds({
        supabase:
          mock.supabase as any,

        organizationId:
          "00000000-0000-0000-0000-0000000000a1",

        evidenceIds: [
          first,
          first,
          second,
          first,
        ],
      });


    assert.deepEqual(
      candidates.map(
        (candidate) =>
          candidate.evidenceId,
      ),
      [
        first,
        second,
      ],
    );


    const rpcCalls =
      membershipRpcCalls(
        mock.calls,
      );

    assert.equal(
      rpcCalls.length,
      1,
    );

    assert.deepEqual(
      (
        rpcCalls[0][1] as {
          args:
            {
              p_evidence_ids:
                string[];
            };
        }
      ).args
        .p_evidence_ids,
      [
        first,
        second,
      ],
    );
  },
);


test(
  "shared Reservoir revalidation fails closed when Q14ag8 omits a requested evidence classification",
  async () => {
    const first =
      evidenceIdForIndex(
        1,
      );

    const second =
      evidenceIdForIndex(
        2,
      );

    const mock =
      createSupabaseMock({
        membershipRows: {
          [first]:
            neverAssembledRow(
              first,
            ),
        },

        persistedRows: {
          [first]:
            validPersistedEvidenceRow(
              first,
            ),

          [second]:
            validPersistedEvidenceRow(
              second,
            ),
        },
      });


    await assert.rejects(
      () =>
        readHsppReservoirEligibleEvidenceByIds({
          supabase:
            mock.supabase as any,

          organizationId:
            "00000000-0000-0000-0000-0000000000a1",

          evidenceIds: [
            first,
            second,
          ],
        }),

      /membership classification missing for evidence/i,
    );
  },
);


test(
  "shared Reservoir revalidation rejects impossible current-without-history lifecycle state",
  async () => {
    const evidenceId =
      evidenceIdForIndex(
        1,
      );

    const mock =
      createSupabaseMock({
        membershipRows: {
          [evidenceId]: {
            evidence_id:
              evidenceId,

            has_historical_membership:
              false,

            has_current_effective_membership:
              true,

            membership_classification:
              "CURRENT_EFFECTIVE",
          },
        },

        persistedRows: {
          [evidenceId]:
            validPersistedEvidenceRow(
              evidenceId,
            ),
        },
      });


    await assert.rejects(
      () =>
        readHsppReservoirEligibleEvidenceByIds({
          supabase:
            mock.supabase as any,

          organizationId:
            "00000000-0000-0000-0000-0000000000a1",

          evidenceIds: [
            evidenceId,
          ],
        }),

      /impossible current-without-history state/i,
    );
  },
);


test(
  "shared Reservoir revalidation rejects more than 200 unique endpoints before database work",
  async () => {
    const evidenceIds =
      Array.from(
        {
          length:
            HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS +
            1,
        },
        (
          _,
          index,
        ) =>
          evidenceIdForIndex(
            index + 1,
          ),
      );

    const mock =
      createSupabaseMock({
        membershipRows: {},

        persistedRows: {},
      });


    await assert.rejects(
      () =>
        readHsppReservoirEligibleEvidenceByIds({
          supabase:
            mock.supabase as any,

          organizationId:
            "00000000-0000-0000-0000-0000000000a1",

          evidenceIds,
        }),

      /at most 200 unique evidence ids/i,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);
