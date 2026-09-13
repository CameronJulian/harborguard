import Twilio from "twilio";

type TwilioClient = ReturnType<typeof Twilio>;

let cachedClient: TwilioClient | null = null;
let cachedIdentity: string | null = null;

function normalizeEnvValue(
  value: string | undefined,
): string {
  return String(value ?? "").trim();
}

function looksLikePlaceholder(
  value: string,
): boolean {
  return /^\[.*\]$/.test(value);
}

export function getTwilioClient(): TwilioClient | null {
  const accountSid =
    normalizeEnvValue(
      process.env.TWILIO_ACCOUNT_SID,
    );

  const authToken =
    normalizeEnvValue(
      process.env.TWILIO_AUTH_TOKEN,
    );

  if (!accountSid || !authToken) {
    return null;
  }

  if (
    looksLikePlaceholder(accountSid) ||
    looksLikePlaceholder(authToken)
  ) {
    return null;
  }

  if (!accountSid.startsWith("AC")) {
    return null;
  }

  const identity =
    `${accountSid}\n${authToken}`;

  if (
    cachedClient &&
    cachedIdentity === identity
  ) {
    return cachedClient;
  }

  cachedClient =
    Twilio(
      accountSid,
      authToken,
    );

  cachedIdentity =
    identity;

  return cachedClient;
}

export async function sendSMS(
  message: string,
) {
  const client =
    getTwilioClient();

  const from =
    normalizeEnvValue(
      process.env.TWILIO_SMS_FROM,
    );

  const to =
    normalizeEnvValue(
      process.env.TWILIO_SMS_TO,
    );

  if (!client) {
    throw new Error(
      "Twilio is not configured.",
    );
  }

  if (!from || !to) {
    throw new Error(
      "Twilio SMS sender or recipient is not configured.",
    );
  }

  return client.messages.create({
    body: message,
    from,
    to,
  });
}
