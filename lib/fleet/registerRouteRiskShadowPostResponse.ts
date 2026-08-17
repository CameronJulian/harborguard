import { after } from "next/server.js";

export const ROUTE_RISK_SHADOW_POST_RESPONSE_LIFECYCLE_VERSION =
  "harborguard-route-risk-shadow-post-response-lifecycle-v1" as const;

export type RouteRiskShadowPostResponseTask = () => void | Promise<void>;

export type RouteRiskShadowPostResponseScheduler = (
  task: RouteRiskShadowPostResponseTask
) => void;

export type RouteRiskShadowPostResponseRegistrationFailure =
  | "invalid_task"
  | "registration_failed";

export type RouteRiskShadowPostResponseRegistration = {
  lifecycleVersion:
    typeof ROUTE_RISK_SHADOW_POST_RESPONSE_LIFECYCLE_VERSION;
  semantics: "DESCRIPTIVE_SHADOW_POST_RESPONSE_LIFECYCLE";
  authority: "NON_AUTHORITATIVE";
  registrationState: "REGISTERED" | "UNAVAILABLE";
  failure: RouteRiskShadowPostResponseRegistrationFailure | null;
};

export type RegisterRouteRiskShadowPostResponseInput = {
  task: RouteRiskShadowPostResponseTask;
  scheduler?: RouteRiskShadowPostResponseScheduler;
};

function unavailable(
  failure: RouteRiskShadowPostResponseRegistrationFailure
): RouteRiskShadowPostResponseRegistration {
  return {
    lifecycleVersion:
      ROUTE_RISK_SHADOW_POST_RESPONSE_LIFECYCLE_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_POST_RESPONSE_LIFECYCLE",
    authority: "NON_AUTHORITATIVE",
    registrationState: "UNAVAILABLE",
    failure,
  };
}

/**
 * Registers a task with the supported post-response lifecycle. The task is
 * invoked by the scheduler and its failure is contained inside the callback.
 * This is not durable delivery infrastructure.
 */
export function registerRouteRiskShadowPostResponse({
  task,
  scheduler = after,
}: RegisterRouteRiskShadowPostResponseInput): RouteRiskShadowPostResponseRegistration {
  if (typeof task !== "function") {
    return unavailable("invalid_task");
  }

  try {
    scheduler(async () => {
      try {
        await task();
      } catch {
        // Deferred shadow failures must not escape into the production request.
      }
    });

    return {
      lifecycleVersion:
        ROUTE_RISK_SHADOW_POST_RESPONSE_LIFECYCLE_VERSION,
      semantics: "DESCRIPTIVE_SHADOW_POST_RESPONSE_LIFECYCLE",
      authority: "NON_AUTHORITATIVE",
      registrationState: "REGISTERED",
      failure: null,
    };
  } catch {
    return unavailable("registration_failed");
  }
}
