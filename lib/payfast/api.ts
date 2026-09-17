import { createHash } from "crypto";

function encodePayFastApiValue(
  value: string
): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+");
}

export function generatePayFastApiSignature(
  data: Record<string, string>,
  passphrase: string
): string {
  /*
   * PayFast API authentication requires every submitted
   * signature variable, including the passphrase, to be
   * sorted alphabetically before the MD5 is generated.
   *
   * The sandbox-only `testing` query parameter is explicitly
   * excluded from the API signature.
   */
  const signatureData: Record<string, string> = {
    ...data,
    passphrase,
  };

  const canonical = Object.keys(signatureData)
    .filter(
      (key) =>
        key !== "signature" &&
        key !== "testing" &&
        signatureData[key] !== ""
    )
    .sort()
    .map(
      (key) =>
        `${key}=${encodePayFastApiValue(signatureData[key])}`
    )
    .join("&");

  return createHash("md5")
    .update(canonical)
    .digest("hex");
}

export function buildPayFastApiHeaders({
  merchantId,
  passphrase,
  timestamp,
}: {
  merchantId: string;
  passphrase: string;
  timestamp: string;
}) {
  const signature =
    generatePayFastApiSignature(
      {
        "merchant-id": merchantId,
        timestamp,
        version: "v1",
      },
      passphrase
    );

  return {
    "merchant-id": merchantId,
    version: "v1",
    timestamp,
    signature,
  };
}

export function formatPayFastApiTimestamp(
  date = new Date()
): string {
  const pad = (value: number) =>
    value.toString().padStart(2, "0");

  /*
   * Date#getTimezoneOffset returns:
   *   UTC - local time
   *
   * Example:
   * Cape Town UTC+02:00 => -120 minutes.
   *
   * PayFast API timestamps require the local ISO-style
   * timezone offset to accompany the local date/time.
   */
  const timezoneOffsetMinutes =
    -date.getTimezoneOffset();

  const timezoneSign =
    timezoneOffsetMinutes >= 0
      ? "+"
      : "-";

  const absoluteOffsetMinutes =
    Math.abs(timezoneOffsetMinutes);

  const timezoneHours =
    Math.floor(
      absoluteOffsetMinutes / 60
    );

  const timezoneMinutes =
    absoluteOffsetMinutes % 60;

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    timezoneSign,
    pad(timezoneHours),
    ":",
    pad(timezoneMinutes),
  ].join("");
}