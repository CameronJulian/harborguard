import assert from "node:assert/strict";
import test from "node:test";

import {
  collectHsppReservoirScheduledPairEndpointIds,
  runHsppReservoirScheduledPairReevaluation,
} from "../lib/hspp/runHsppReservoirScheduledPairReevaluation";

import {
  HSPP_RESERVOIR_PAIR_MAX_LIMIT,
  type HsppReservoirScheduledPair,
} from "../lib/hspp/readHsppReservoirPairPage";

import {
  HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS,
} from "../lib/hspp/readHsppReservoirEligibleEvidenceByIds";


function evidenceId(
  value:
    number,
): string {
  return (
    "00000000-0000-4000-8000-" +
    value
      .toString(16)
      .padStart(
        12,
        "0",
      )
  );
}


function pair(
  ordinal:
    number,
  firstEvidenceId:
    string,
  secondEvidenceId:
    string,
): HsppReservoirScheduledPair {
  return {
    ordinal,
    firstEvidenceId,
    secondEvidenceId,
  };
}


test(
  "pair runner endpoint collection preserves first-seen scheduler order",
  () => {
    const a =
      evidenceId(1);

    const b =
      evidenceId(2);

    const c =
      evidenceId(3);

    const d =
      evidenceId(4);

    const e =
      evidenceId(5);


    const result =
      collectHsppReservoirScheduledPairEndpointIds([
        pair(
          1,
          b,
          c,
        ),

        pair(
          2,
          a,
          d,
        ),

        pair(
          3,
          b,
          e,
        ),
      ]);


    assert.deepEqual(
      result,
      [
        b,
        c,
        a,
        d,
        e,
      ],
    );
  },
);


test(
  "pair runner endpoint collection deduplicates repeated endpoints",
  () => {
    const a =
      evidenceId(1);

    const b =
      evidenceId(2);

    const c =
      evidenceId(3);


    const result =
      collectHsppReservoirScheduledPairEndpointIds([
        pair(
          1,
          a,
          b,
        ),

        pair(
          2,
          a,
          c,
        ),

        pair(
          3,
          b,
          c,
        ),
      ]);


    assert.deepEqual(
      result,
      [
        a,
        b,
        c,
      ],
    );
  },
);


test(
  "one full one-hundred-pair page can produce at most two hundred unique endpoint IDs",
  () => {
    const pairs =
      Array.from(
        {
          length:
            HSPP_RESERVOIR_PAIR_MAX_LIMIT,
        },
        (
          _,
          index,
        ) =>
          pair(
            index + 1,
            evidenceId(
              index * 2 + 1,
            ),
            evidenceId(
              index * 2 + 2,
            ),
          ),
      );


    const result =
      collectHsppReservoirScheduledPairEndpointIds(
        pairs,
      );


    assert.equal(
      HSPP_RESERVOIR_PAIR_MAX_LIMIT,
      100,
    );

    assert.equal(
      HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS,
      200,
    );

    assert.equal(
      result.length,
      200,
    );
  },
);


test(
  "endpoint collection fails closed if supplied pair input exceeds the shared two-hundred-ID boundary",
  () => {
    const pairs =
      Array.from(
        {
          length:
            101,
        },
        (
          _,
          index,
        ) =>
          pair(
            index + 1,
            evidenceId(
              index * 2 + 1,
            ),
            evidenceId(
              index * 2 + 2,
            ),
          ),
      );


    assert.throws(
      () =>
        collectHsppReservoirScheduledPairEndpointIds(
          pairs,
        ),

      /more than 200 unique endpoint IDs/i,
    );
  },
);


test(
  "empty pair page produces an empty endpoint read set",
  () => {
    assert.deepEqual(
      collectHsppReservoirScheduledPairEndpointIds(
        [],
      ),
      [],
    );
  },
);


test(
  "runner rejects an invalid scheduling limit before database access",
  async () => {
    const organizationId =
      "11111111-1111-4111-8111-111111111111";


    await assert.rejects(
      runHsppReservoirScheduledPairReevaluation({
        supabase:
          null as never,

        organizationId,

        limit:
          0,
      }),

      /integer between 1 and 100/i,
    );


    await assert.rejects(
      runHsppReservoirScheduledPairReevaluation({
        supabase:
          null as never,

        organizationId,

        limit:
          101,
      }),

      /integer between 1 and 100/i,
    );


    await assert.rejects(
      runHsppReservoirScheduledPairReevaluation({
        supabase:
          null as never,

        organizationId,

        limit:
          1.5,
      }),

      /integer between 1 and 100/i,
    );
  },
);