import webpush from "web-push";

let configuredIdentity: string | null = null;

function normalizeEnvValue(value: string | undefined): string {
  return String(value ?? "").trim();
}

function looksLikePlaceholder(value: string): boolean {
  return /^\[.*\]$/.test(value);
}

function getConfiguration() {
  const subject =
    normalizeEnvValue(process.env.VAPID_SUBJECT) ||
    "mailto:cameron@healthsystems.co.za";

  const publicKey =
    normalizeEnvValue(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    );

  const privateKey =
    normalizeEnvValue(
      process.env.VAPID_PRIVATE_KEY,
    );

  if (!publicKey || !privateKey) {
    throw new Error(
      "Web push is not configured: VAPID public/private key is missing.",
    );
  }

  if (
    looksLikePlaceholder(subject) ||
    looksLikePlaceholder(publicKey) ||
    looksLikePlaceholder(privateKey)
  ) {
    throw new Error(
      "Web push is not configured: VAPID configuration contains a placeholder value.",
    );
  }

  const subjectValid =
    subject.toLowerCase().startsWith("mailto:") ||
    subject.toLowerCase().startsWith("https://");

  if (!subjectValid) {
    throw new Error(
      "Web push is not configured: VAPID subject must use mailto: or https://.",
    );
  }

  return {
    subject,
    publicKey,
    privateKey,
  };
}

function ensureWebPushConfigured() {
  const configuration =
    getConfiguration();

  const identity =
    [
      configuration.subject,
      configuration.publicKey,
      configuration.privateKey,
    ].join("\n");

  if (configuredIdentity === identity) {
    return;
  }

  webpush.setVapidDetails(
    configuration.subject,
    configuration.publicKey,
    configuration.privateKey,
  );

  configuredIdentity = identity;
}

export function sendWebPushNotification(
  subscription: Parameters<
    typeof webpush.sendNotification
  >[0],
  payload?: Parameters<
    typeof webpush.sendNotification
  >[1],
  options?: Parameters<
    typeof webpush.sendNotification
  >[2],
) {
  ensureWebPushConfigured();

  return webpush.sendNotification(
    subscription,
    payload,
    options,
  );
}
