import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READER_VERSION,
  HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READ_RPC,
  readHsppHistoricalReconstructionContexts,
} from "@/lib/hspp/readHsppHistoricalReconstructionContexts";


const ORGANIZATION_ID =
  "00000000-0000-0000-0000-0000000000a1";

const EVIDENCE_A =
  "00000000-0000-0000-0000-000000000001";

const EVIDENCE_B =
  "00000000-0000-0000-0000-000000000002";

const EVIDENCE_C =
  "00000000-0000-0000-0000-000000000003";

const FINGERPRINT_A =
  "a".repeat(64);

const FINGERPRINT_C =
  "c".repeat(64);


function validRow(
  evidenceId: string = EVIDENCE_A,
  overrides: Record<string, unknown> = {},
) {
  const suffix =
    evidenceId === EVIDENCE_C
      ? "3"
      : "1";

  return {
    evidence_id:
      evidenceId,

    historical_membership_id:
      `00000000-0000-0000-0000-0000000001${suffix}1`,

    parent_assembly_id:
      `00000000-0000-0000-0000-0000000002${suffix}1`,

    evidence_integrity_fingerprint:
      evidenceId === EVIDENCE_C
        ? FINGERPRINT_C
        : FINGERPRINT_A,

    parent_member_ordinal:
      evidenceId === EVIDENCE_C
        ? 3
        : 1,

    cessation_id:
      `00000000-0000-0000-0000-0000000003${suffix}1`,

    unsuitability_checkpoint_id:
      `00000000-0000-0000-0000-0000000004${suffix}1`,

    cessation_version:
      "hspp-assembly-member-effective-cessation-v1",

    cessation_policy_version:
      "hspp-member-cessation-policy-v1",

    cessation_reason:
      "POST_POSITIVE_UNSUITABILITY",

    ceased_at:
      evidenceId === EVIDENCE_C
        ? "2026-08-23T16:03:00.000Z"
        : "2026-08-23T16:01:00.000Z",

    ...overrides,
  };
}


function createSupabaseMock(
  options: {
    data?: unknown;
    error?: unknown;
  } = {},
) {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];

  const supabase = {
    rpc: async (
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({
        name,
        args,
      });

      return {
        data:
          options.data ??
          [validRow()],

        error:
          options.error ??
          null,
      };
    },
  };

  return {
    supabase,
    calls,
  };
}


test(
  "Q14ag16C calls Q14ag14 once, deduplicates deterministically, and exposes no-context evidence explicitly",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow(
            EVIDENCE_C,
          ),

          validRow(
            EVIDENCE_A,
          ),
        ],
      });

    const result =
      await readHsppHistoricalReconstructionContexts({
        supabase:
          mock.supabase as any,

        organizationId:
          ` ${ORGANIZATION_ID} `,

        evidenceIds: [
          EVIDENCE_A,
          EVIDENCE_A,
          EVIDENCE_B,
          EVIDENCE_C,
        ],
      });

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.equal(
      mock.calls[0].name,
      HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READ_RPC,
    );

    assert.deepEqual(
      mock.calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_evidence_ids: [
          EVIDENCE_A,
          EVIDENCE_B,
          EVIDENCE_C,
        ],
      },
    );

    assert.equal(
      result.readerVersion,
      HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READER_VERSION,
    );

    assert.equal(
      result.organizationId,
      ORGANIZATION_ID,
    );

    assert.deepEqual(
      result.requestedEvidenceIds,
      [
        EVIDENCE_A,
        EVIDENCE_B,
        EVIDENCE_C,
      ],
    );

    assert.deepEqual(
      result.contexts.map(
        (context) =>
          context.evidenceId,
      ),
      [
        EVIDENCE_A,
        EVIDENCE_C,
      ],
    );

    assert.deepEqual(
      result.noContextEvidenceIds,
      [
        EVIDENCE_B,
      ],
    );

    assert.equal(
      result.contexts[0].evidenceIntegrityFingerprint,
      FINGERPRINT_A,
    );

    assert.equal(
      result.contexts[1].evidenceIntegrityFingerprint,
      FINGERPRINT_C,
    );
  },
);


test(
  "Q14ag16C treats an empty request as an empty valid read without RPC",
  async () => {
    const mock =
      createSupabaseMock();

    const result =
      await readHsppHistoricalReconstructionContexts({
        supabase:
          mock.supabase as any,

        organizationId:
          ORGANIZATION_ID,

        evidenceIds:
          [],
      });

    assert.equal(
      mock.calls.length,
      0,
    );

    assert.deepEqual(
      result.requestedEvidenceIds,
      [],
    );

    assert.deepEqual(
      result.contexts,
      [],
    );

    assert.deepEqual(
      result.noContextEvidenceIds,
      [],
    );
  },
);


test(
  "Q14ag16C treats zero returned rows as a valid explicit no-context result",
  async () => {
    const mock =
      createSupabaseMock({
        data:
          [],
      });

    const result =
      await readHsppHistoricalReconstructionContexts({
        supabase:
          mock.supabase as any,

        organizationId:
          ORGANIZATION_ID,

        evidenceIds: [
          EVIDENCE_A,
          EVIDENCE_B,
        ],
      });

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.deepEqual(
      result.contexts,
      [],
    );

    assert.deepEqual(
      result.noContextEvidenceIds,
      [
        EVIDENCE_A,
        EVIDENCE_B,
      ],
    );
  },
);


test(
  "Q14ag16C enforces the raw 100-id Q14ag14 bound before deduplication",
  async () => {
    const mock =
      createSupabaseMock();

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds:
            Array.from(
              {
                length: 101,
              },
              () => EVIDENCE_A,
            ),
        }),
      /at most 100 evidence ids/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag16C rejects blank organization identity before RPC",
  async () => {
    const mock =
      createSupabaseMock();

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            " ",

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      /organizationId is required/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag16C rejects blank evidence identities before RPC",
  async () => {
    const mock =
      createSupabaseMock();

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
            " ",
          ],
        }),
      /evidenceIds\[1\] is required/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag16C rejects unexpected returned evidence",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow(
            EVIDENCE_C,
          ),
        ],
      });

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      /returned unexpected evidence/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16C rejects duplicate returned evidence rows",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow(
            EVIDENCE_A,
          ),

          validRow(
            EVIDENCE_A,
          ),
        ],
      });

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      /returned duplicate evidence/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16C rejects malformed immutable fingerprints",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow(
            EVIDENCE_A,
            {
              evidence_integrity_fingerprint:
                "not-a-sha256",
            },
          ),
        ],
      });

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      /lowercase SHA-256 fingerprint/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16C rejects invalid historical member ordinal",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow(
            EVIDENCE_A,
            {
              parent_member_ordinal:
                0,
            },
          ),
        ],
      });

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      /positive integer/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16C rejects invalid cessation timestamp",
  async () => {
    const mock =
      createSupabaseMock({
        data: [
          validRow(
            EVIDENCE_A,
            {
              ceased_at:
                "not-a-timestamp",
            },
          ),
        ],
      });

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      /valid timestamp/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16C rejects a non-array RPC result",
  async () => {
    const mock =
      createSupabaseMock({
        data: {
          evidence_id:
            EVIDENCE_A,
        },
      });

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      /non-array result/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "Q14ag16C propagates Q14ag14 RPC errors without retrying",
  async () => {
    const rpcError =
      new Error(
        "Q14ag14 read rejected",
      );

    const mock =
      createSupabaseMock({
        data:
          null,

        error:
          rpcError,
      });

    await assert.rejects(
      () =>
        readHsppHistoricalReconstructionContexts({
          supabase:
            mock.supabase as any,

          organizationId:
            ORGANIZATION_ID,

          evidenceIds: [
            EVIDENCE_A,
          ],
        }),
      (error) =>
        error === rpcError,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);
