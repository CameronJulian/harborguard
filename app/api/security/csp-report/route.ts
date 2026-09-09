import * as Sentry from "@sentry/nextjs";

import { cspReportRatelimit } from "@/lib/ratelimit";

const MAX_REPORT_BYTES = 16_384;

const ACCEPTED_CONTENT_TYPES = new Set([
  "application/csp-report",
  "application/reports+json",
  "application/json",
]);

type UnknownRecord = Record<string, unknown>;

type NormalizedCspReport = {
  documentOrigin: string | null;
  blockedOrigin: string | null;
  sourceOrigin: string | null;
  effectiveDirective: string | null;
  violatedDirective: string | null;
  disposition: string | null;
  statusCode: number | null;
  lineNumber: number | null;
  columnNumber: number | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stringValue(
  value: unknown
): string | null {
  return typeof value === "string" &&
    value.trim().length > 0
    ? value.trim()
    : null;
}

function numberValue(
  value: unknown
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function safeOrigin(
  value: unknown
): string | null {
  const text =
    stringValue(value);

  if (!text) {
    return null;
  }

  if (
    text === "inline" ||
    text === "eval" ||
    text === "self" ||
    text === "data" ||
    text === "blob"
  ) {
    return text;
  }

  try {
    return new URL(text).origin;
  }
  catch {
    return null;
  }
}

function getClientIdentifier(
  request: Request
): string {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  const forwardedIp =
    forwardedFor
      ?.split(",")[0]
      ?.trim();

  return (
    forwardedIp ||
    request.headers.get(
      "x-real-ip"
    ) ||
    "unknown"
  );
}

function normalizeLegacyReport(
  payload: UnknownRecord
): NormalizedCspReport | null {
  const report =
    payload["csp-report"];

  if (!isRecord(report)) {
    return null;
  }

  return {
    documentOrigin:
      safeOrigin(
        report["document-uri"]
      ),
    blockedOrigin:
      safeOrigin(
        report["blocked-uri"]
      ),
    sourceOrigin:
      safeOrigin(
        report["source-file"]
      ),
    effectiveDirective:
      stringValue(
        report["effective-directive"]
      ),
    violatedDirective:
      stringValue(
        report["violated-directive"]
      ),
    disposition:
      stringValue(
        report["disposition"]
      ),
    statusCode:
      numberValue(
        report["status-code"]
      ),
    lineNumber:
      numberValue(
        report["line-number"]
      ),
    columnNumber:
      numberValue(
        report["column-number"]
      ),
  };
}

function normalizeReportingApiBody(
  report: UnknownRecord
): NormalizedCspReport | null {
  const body =
    report.body;

  if (!isRecord(body)) {
    return null;
  }

  const type =
    stringValue(report.type);

  if (
    type &&
    type !== "csp-violation"
  ) {
    return null;
  }

  return {
    documentOrigin:
      safeOrigin(
        report.url ??
        body["documentURL"] ??
        body["document-uri"]
      ),
    blockedOrigin:
      safeOrigin(
        body["blockedURL"] ??
        body["blocked-uri"]
      ),
    sourceOrigin:
      safeOrigin(
        body["sourceFile"] ??
        body["source-file"]
      ),
    effectiveDirective:
      stringValue(
        body["effectiveDirective"] ??
        body["effective-directive"]
      ),
    violatedDirective:
      stringValue(
        body["violatedDirective"] ??
        body["violated-directive"]
      ),
    disposition:
      stringValue(
        body.disposition
      ),
    statusCode:
      numberValue(
        body["statusCode"] ??
        body["status-code"]
      ),
    lineNumber:
      numberValue(
        body["lineNumber"] ??
        body["line-number"]
      ),
    columnNumber:
      numberValue(
        body["columnNumber"] ??
        body["column-number"]
      ),
  };
}

function normalizeReports(
  payload: unknown
): NormalizedCspReport[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (!isRecord(item)) {
          return null;
        }

        return (
          normalizeReportingApiBody(
            item
          ) ??
          normalizeLegacyReport(
            item
          )
        );
      })
      .filter(
        (
          item
        ): item is NormalizedCspReport =>
          item !== null
      );
  }

  if (!isRecord(payload)) {
    return [];
  }

  const direct =
    normalizeLegacyReport(
      payload
    ) ??
    normalizeReportingApiBody(
      payload
    );

  return direct
    ? [direct]
    : [];
}

export async function POST(
  request: Request
): Promise<Response> {
  const contentType =
    (
      request.headers
        .get("content-type") ??
      ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

  if (
    !ACCEPTED_CONTENT_TYPES.has(
      contentType
    )
  ) {
    return Response.json(
      {
        error:
          "Unsupported CSP report content type.",
      },
      {
        status: 400,
      }
    );
  }

  const identifier =
    getClientIdentifier(
      request
    );

  const limitResult =
    await cspReportRatelimit.limit(
      identifier
    );

  if (!limitResult.success) {
    return Response.json(
      {
        error:
          "Too many CSP reports.",
      },
      {
        status: 429,
        headers: {
          "Retry-After":
            Math.max(
              1,
              Math.ceil(
                (
                  limitResult.reset -
                  Date.now()
                ) /
                  1000
              )
            ).toString(),
        },
      }
    );
  }

  let rawBody: string;

  try {
    rawBody =
      await request.text();
  }
  catch {
    return Response.json(
      {
        error:
          "Unable to read CSP report.",
      },
      {
        status: 400,
      }
    );
  }

  const bodySize =
    new TextEncoder()
      .encode(rawBody)
      .byteLength;

  if (
    bodySize >
    MAX_REPORT_BYTES
  ) {
    return Response.json(
      {
        error:
          "CSP report is too large.",
      },
      {
        status: 413,
      }
    );
  }

  if (
    rawBody.trim().length === 0
  ) {
    return Response.json(
      {
        error:
          "CSP report body is empty.",
      },
      {
        status: 400,
      }
    );
  }

  let payload: unknown;

  try {
    payload =
      JSON.parse(rawBody);
  }
  catch {
    return Response.json(
      {
        error:
          "Malformed CSP report.",
      },
      {
        status: 400,
      }
    );
  }

  const reports =
    normalizeReports(
      payload
    );

  if (reports.length === 0) {
    return Response.json(
      {
        error:
          "No valid CSP violation report found.",
      },
      {
        status: 400,
      }
    );
  }

  for (const report of reports) {
    Sentry.captureMessage(
      "HarborGuard CSP Report-Only violation",
      {
        level: "warning",
        tags: {
          domain: "security",
          operation: "csp-report",
          effectiveDirective:
            report.effectiveDirective ??
            "unknown",
          disposition:
            report.disposition ??
            "unknown",
        },
        extra: {
          documentOrigin:
            report.documentOrigin,
          blockedOrigin:
            report.blockedOrigin,
          sourceOrigin:
            report.sourceOrigin,
          violatedDirective:
            report.violatedDirective,
          statusCode:
            report.statusCode,
          lineNumber:
            report.lineNumber,
          columnNumber:
            report.columnNumber,
        },
      }
    );
  }

  return new Response(
    null,
    {
      status: 204,
    }
  );
}