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

  const normalizedCredentialReference =
    credentialReference?.trim() || null;

  const configuredBaseUrl =
    baseUrl?.trim();

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

    const environmentBaseUrl = (
      process.env.TRACCAR_API_BASE_URL ||
      "https://demo3.traccar.org"
    ).replace(/\/+$/, "");

    return {
      token: referencedToken,
      baseUrl: configuredBaseUrl
        ? configuredBaseUrl.replace(/\/+$/, "")
        : environmentBaseUrl,
    };
  }

  const environmentConfiguration =
    getEnvironmentTraccarConfiguration();

  return {
    token: environmentConfiguration.token,
    baseUrl: configuredBaseUrl
      ? configuredBaseUrl.replace(/\/+$/, "")
      : environmentConfiguration.baseUrl,
  };
}
