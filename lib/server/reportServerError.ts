import * as Sentry from "@sentry/nextjs";

export type ServerErrorReportContext = {
  domain: string;
  operation: string;
  boundary: string;
  extra?: Record<
    string,
    string | number | boolean | null | undefined
  >;
};

/**
 * Reports an unexpected server-side failure to Sentry using only
 * explicitly supplied low-sensitivity metadata.
 *
 * Do not pass request objects, authorization headers, cookies,
 * access tokens, API keys, service-role keys, or raw request bodies.
 */
export function reportServerError(
  error: unknown,
  context: ServerErrorReportContext
): void {
  const normalizedError =
    error instanceof Error
      ? error
      : new Error(
          typeof error === "string"
            ? error
            : "Unknown server error"
        );

  Sentry.captureException(
    normalizedError,
    {
      tags: {
        domain: context.domain,
        operation: context.operation,
        boundary: context.boundary,
      },
      ...(context.extra
        ? {
            extra: context.extra,
          }
        : {}),
    }
  );
}