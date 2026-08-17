import type {
  RouteRiskShadowGoogleAlternativeRouteRequest,
} from "./buildRouteRiskShadowGoogleAlternativeRouteRequest.ts";

export const ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION_VERSION =
  "harborguard-route-risk-shadow-google-alternative-route-execution-v1" as const;

export type RouteRiskShadowGoogleAlternativeRouteExecutionFailure =
  | "invalid_request"
  | "missing_credential"
  | "timeout"
  | "aborted"
  | "network_error"
  | "authentication_failure"
  | "quota_exhausted"
  | "http_client_error"
  | "http_server_error"
  | "malformed_json"
  | "unexpected_error";

export type RouteRiskShadowGoogleAlternativeRouteExecution = {
  executionVersion:
    typeof ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION_VERSION;
  semantics: "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION";
  authority: "NON_AUTHORITATIVE";
  executionState: "SUCCEEDED" | "FAILED";
  failure: RouteRiskShadowGoogleAlternativeRouteExecutionFailure | null;
  status: number | null;
  providerResponse: unknown | null;
};

export type ExecuteRouteRiskShadowGoogleAlternativeRouteRequestInput = {
  request: RouteRiskShadowGoogleAlternativeRouteRequest;
  apiKey: string | null | undefined;
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  timeoutMs: number;
  signal?: AbortSignal;
};

function failed(
  failure: RouteRiskShadowGoogleAlternativeRouteExecutionFailure,
  status: number | null = null
): RouteRiskShadowGoogleAlternativeRouteExecution {
  return {
    executionVersion:
      ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION",
    authority: "NON_AUTHORITATIVE",
    executionState: "FAILED",
    failure,
    status,
    providerResponse: null,
  };
}

function succeeded(
  providerResponse: unknown,
  status: number
): RouteRiskShadowGoogleAlternativeRouteExecution {
  return {
    executionVersion:
      ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_EXECUTION",
    authority: "NON_AUTHORITATIVE",
    executionState: "SUCCEEDED",
    failure: null,
    status,
    providerResponse,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Executes one already-described shadow request; it performs no retries or orchestration. */
export async function executeRouteRiskShadowGoogleAlternativeRouteRequest({
  request,
  apiKey,
  fetcher,
  timeoutMs,
  signal,
}: ExecuteRouteRiskShadowGoogleAlternativeRouteRequestInput): Promise<RouteRiskShadowGoogleAlternativeRouteExecution> {
  if (
    request.requestState !== "AVAILABLE" ||
    !request.body
  ) {
    return failed("invalid_request");
  }

  if (typeof apiKey !== "string" || apiKey.length === 0) {
    return failed("missing_credential");
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return failed("invalid_request");
  }

  if (signal?.aborted) {
    return failed("aborted");
  }

  const controller = new AbortController();
  let timedOut = false;
  let callerAborted = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const abortForCaller = () => {
    callerAborted = true;
    controller.abort();
  };

  if (signal) {
    signal.addEventListener("abort", abortForCaller, { once: true });
  }

  timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetcher(request.endpoint, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": request.fieldMask,
      },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return failed("authentication_failure", response.status);
    }

    if (response.status === 429) {
      return failed("quota_exhausted", response.status);
    }

    if (response.status >= 400 && response.status < 500) {
      return failed("http_client_error", response.status);
    }

    if (response.status >= 500 && response.status < 600) {
      return failed("http_server_error", response.status);
    }

    if (!response.ok) {
      return failed("unexpected_error", response.status);
    }

    let providerResponse: unknown;
    try {
      providerResponse = await response.json();
    } catch {
      return failed("malformed_json", response.status);
    }

    return succeeded(providerResponse, response.status);
  } catch (error: unknown) {
    if (timedOut) {
      return failed("timeout");
    }

    if (callerAborted || isAbortError(error)) {
      return failed("aborted");
    }

    if (error instanceof TypeError) {
      return failed("network_error");
    }

    return failed("unexpected_error");
  } finally {
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    signal?.removeEventListener("abort", abortForCaller);
  }
}
