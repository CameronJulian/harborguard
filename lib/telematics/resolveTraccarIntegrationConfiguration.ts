import "server-only";

import {
  getEnvironmentTraccarConfiguration,
  type TraccarConfiguration,
} from "@/lib/telematics/providers/traccar";

export type ResolveTraccarIntegrationConfigurationInput = {
  organizationId: string;
  credentialSource: string;
  baseUrl: string | null;
};

export function resolveTraccarIntegrationConfiguration({
  organizationId,
  credentialSource,
  baseUrl,
}: ResolveTraccarIntegrationConfigurationInput): TraccarConfiguration {
  if (credentialSource !== "environment") {
    throw new Error(
      `Unsupported Traccar credential source "${credentialSource}" for organization ${organizationId}.`
    );
  }

  const environmentConfiguration =
    getEnvironmentTraccarConfiguration();

  const configuredBaseUrl =
    baseUrl?.trim();

  return {
    token: environmentConfiguration.token,
    baseUrl: configuredBaseUrl
      ? configuredBaseUrl.replace(/\/+$/, "")
      : environmentConfiguration.baseUrl,
  };
}