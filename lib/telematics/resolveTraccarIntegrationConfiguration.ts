import "server-only";

import {
  getEnvironmentTraccarConfiguration,
  type TraccarConfiguration,
} from "@/lib/telematics/providers/traccar";

export type ResolveTraccarIntegrationConfigurationInput = {
  organizationId: string;
  credentialSource: string;
  credentialReference: string | null;
  baseUrl: string | null;
};

export function resolveTraccarIntegrationConfiguration({
  organizationId,
  credentialSource,
  credentialReference,
  baseUrl,
}: ResolveTraccarIntegrationConfigurationInput): TraccarConfiguration {
  if (credentialSource !== "environment") {
    throw new Error(
      `Unsupported Traccar credential source "${credentialSource}" for organization ${organizationId}.`
    );
  }

  const environmentConfiguration =
    getEnvironmentTraccarConfiguration();

  const normalizedCredentialReference =
    credentialReference?.trim() || null;

  let token =
    environmentConfiguration.token;

  if (normalizedCredentialReference) {
    if (
      !/^[A-Z][A-Z0-9_]{1,127}$/.test(
        normalizedCredentialReference
      )
    ) {
      throw new Error(
        `Invalid Traccar credential reference for organization ${organizationId}.`
      );
    }

    const referencedToken =
      process.env[
        normalizedCredentialReference
      ]?.trim();

    if (!referencedToken) {
      throw new Error(
        `Traccar credential reference "${normalizedCredentialReference}" is not configured for organization ${organizationId}.`
      );
    }

    token = referencedToken;
  }

  const configuredBaseUrl =
    baseUrl?.trim();

  return {
    token,
    baseUrl: configuredBaseUrl
      ? configuredBaseUrl.replace(/\/+$/, "")
      : environmentConfiguration.baseUrl,
  };
}