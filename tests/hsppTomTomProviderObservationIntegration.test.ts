import assert from "node:assert/strict";
import test from "node:test";

function deriveTomTomProvenance(
  properties: Record<string, unknown>
) {
  const providerMessageId =
    typeof properties.id === "string"
      ? properties.id.trim()
      : "";

  const observedAtCandidate =
    typeof properties.lastReportTime === "string"
      ? properties.lastReportTime.trim()
      : "";

  const observedAtMilliseconds =
    Date.parse(observedAtCandidate);

  const observedAt =
    observedAtCandidate &&
    Number.isFinite(
      observedAtMilliseconds
    )
      ? new Date(
          observedAtMilliseconds
        ).toISOString()
      : null;

  return {
    providerMessageId,
    observedAt,
  };
}

test(
  "TomTom provider-native id is preserved",
  () => {
    assert.deepEqual(
      deriveTomTomProvenance({
        id: " TTI-123 ",
        lastReportTime:
          "2026-08-20T10:30:00Z",
      }),
      {
        providerMessageId:
          "TTI-123",
        observedAt:
          "2026-08-20T10:30:00.000Z",
      }
    );
  }
);

test(
  "missing TomTom id fails closed for immutable identity",
  () => {
    const result =
      deriveTomTomProvenance({
        lastReportTime:
          "2026-08-20T10:30:00Z",
      });

    assert.equal(
      result.providerMessageId,
      ""
    );
  }
);

test(
  "missing lastReportTime does not invent observation time",
  () => {
    const result =
      deriveTomTomProvenance({
        id: "TTI-123",
        startTime:
          "2026-08-20T09:00:00Z",
      });

    assert.equal(
      result.observedAt,
      null
    );
  }
);

test(
  "invalid lastReportTime fails closed",
  () => {
    const result =
      deriveTomTomProvenance({
        id: "TTI-123",
        lastReportTime:
          "not-a-date",
      });

    assert.equal(
      result.observedAt,
      null
    );
  }
);

test(
  "startTime is never substituted for provider observation time",
  () => {
    const result =
      deriveTomTomProvenance({
        id: "TTI-123",
        startTime:
          "2026-08-20T09:00:00Z",
      });

    assert.deepEqual(
      result,
      {
        providerMessageId:
          "TTI-123",
        observedAt:
          null,
      }
    );
  }
);
