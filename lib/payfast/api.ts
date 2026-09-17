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
  const canonical = Object.keys(data)
    .filter(
      (key) =>
        key !== "signature" &&
        data[key] !== ""
    )
    .sort()
    .map(
      (key) =>
        `${key}=${encodePayFastApiValue(data[key])}`
    )
    .join("&");

  const payload =
    `${canonical}&passphrase=${encodePayFastApiValue(passphrase)}`;

  return createHash("md5")
    .update(payload)
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
  ].join("");
}