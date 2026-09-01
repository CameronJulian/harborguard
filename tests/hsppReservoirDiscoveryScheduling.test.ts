import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,
  readHsppReservoirDiscoveryPage,
} from "../lib/hspp/readHsppReservoirDiscoveryPage";

import {
  compareAndSwapHsppReservoirDiscoveryScanState,
} from "../lib/hspp/compareAndSwapHsppReservoirDiscoveryScanState";

const organizationId =
  "00000000-0000-0000-0000-0000000000a1";

const firstEvidenceId =
  "00000000-0000-0000-0000-000000000001";

const secondEvidenceId =
  "00000000-0000-0000-0000-000000000002";

const firstObservedAt =
  "2026-08-21T10:00:00.000Z";

const secondObservedAt =
  "2026-08-21T10:01:00.000Z";

test(
  "Reservoir scheduling page wrapper preserves the raw circular page cursor",
  async () => {
    const calls:
      Array<{
        name: string;
        args: Record<string, unknown>;
      }> =
      [];

    const supabase = {
      async rpc(
        name: string,
        args: Record<string, unknown>,
      ) {
        calls.push({
          name,
          args,
        });

        return {
          data: [
            {
              scheduling_version:
                HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,

              cursor_expected_observed_at:
                null,

              cursor_expected_evidence_id:
                null,

              cursor_proposed_observed_at:
                secondObservedAt,

              cursor_proposed_evidence_id:
                secondEvidenceId,

              candidate_evidence_id:
                firstEvidenceId,

              candidate_observed_at:
                firstObservedAt,

              candidate_position:
                1,
            },
            {
              scheduling_version:
                HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,

              cursor_expected_observed_at:
                null,

              cursor_expected_evidence_id:
                null,

              cursor_proposed_observed_at:
                secondObservedAt,

              cursor_proposed_evidence_id:
                secondEvidenceId,

              candidate_evidence_id:
                secondEvidenceId,

              candidate_observed_at:
                secondObservedAt,

              candidate_position:
                2,
            },
          ],

          error:
            null,
        };
      },
    };

    const result =
      await readHsppReservoirDiscoveryPage({
        supabase:
          supabase as any,

        organizationId,

        limit:
          2,
      });

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].name,
      "read_hspp_reservoir_discovery_page",
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          organizationId,

        p_limit:
          2,
      },
    );

    assert.equal(
      result.schedulingVersion,
      HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,
    );

    assert.equal(
      result.items.length,
      2,
    );

    assert.equal(
      result.expectedCursor,
      null,
    );

    assert.deepEqual(
      result.proposedCursor,
      {
        observedAt:
          secondObservedAt,

        evidenceId:
          secondEvidenceId,
      },
    );

    assert.equal(
      result.items[1].evidenceId,
      secondEvidenceId,
    );
  },
);


test(
  "Reservoir scheduling page wrapper represents an empty raw page without inventing a cursor",
  async () => {
    const supabase = {
      async rpc() {
        return {
          data: [],
          error: null,
        };
      },
    };

    const result =
      await readHsppReservoirDiscoveryPage({
        supabase:
          supabase as any,

        organizationId,

        limit:
          100,
      });

    assert.equal(
      result.items.length,
      0,
    );

    assert.equal(
      result.expectedCursor,
      null,
    );

    assert.equal(
      result.proposedCursor,
      null,
    );
  },
);


test(
  "Reservoir scheduling CAS maps the exact expected and proposed cursor once",
  async () => {
    const calls:
      Array<{
        name: string;
        args: Record<string, unknown>;
      }> =
      [];

    const supabase = {
      async rpc(
        name: string,
        args: Record<string, unknown>,
      ) {
        calls.push({
          name,
          args,
        });

        return {
          data: [
            {
              cas_state:
                "ADVANCED",

              state_version:
                HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,

              organization_id:
                organizationId,

              cursor_observed_at:
                secondObservedAt,

              cursor_evidence_id:
                secondEvidenceId,

              previous_cursor_observed_at:
                firstObservedAt,

              previous_cursor_evidence_id:
                firstEvidenceId,

              created_at:
                "2026-08-31T09:00:00.000Z",

              updated_at:
                "2026-08-31T09:01:00.000Z",
            },
          ],

          error:
            null,
        };
      },
    };

    const result =
      await compareAndSwapHsppReservoirDiscoveryScanState({
        supabase:
          supabase as any,

        organizationId,

        expectedCursor: {
          observedAt:
            firstObservedAt,

          evidenceId:
            firstEvidenceId,
        },

        proposedCursor: {
          observedAt:
            secondObservedAt,

          evidenceId:
            secondEvidenceId,
        },
      });

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].name,
      "compare_and_swap_hspp_reservoir_discovery_scan_state",
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          organizationId,

        p_expected_cursor_observed_at:
          firstObservedAt,

        p_expected_cursor_evidence_id:
          firstEvidenceId,

        p_proposed_cursor_observed_at:
          secondObservedAt,

        p_proposed_cursor_evidence_id:
          secondEvidenceId,
      },
    );

    assert.equal(
      result.casState,
      "ADVANCED",
    );

    assert.deepEqual(
      result.cursor,
      {
        observedAt:
          secondObservedAt,

        evidenceId:
          secondEvidenceId,
      },
    );

    assert.deepEqual(
      result.previousCursor,
      {
        observedAt:
          firstObservedAt,

        evidenceId:
          firstEvidenceId,
      },
    );
  },
);