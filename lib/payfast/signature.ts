import { createHash, timingSafeEqual } from "crypto";

function encodePayFastValue(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

export function generatePayFastSignature(
  data: Record<string, string>,
  passphrase?: string
) {
  const pfOutput = Object.keys(data)
    .filter(
      (key) =>
        key !== "signature" &&
        data[key] !== ""
    )
    .map(
      (key) =>
        `${key}=${encodePayFastValue(data[key])}`
    )
    .join("&");

  const payload = passphrase
    ? `${pfOutput}&passphrase=${encodePayFastValue(passphrase)}`
    : pfOutput;

  return createHash("md5")
    .update(payload)
    .digest("hex");
}

export function generatePayFastItnSignature(
  data: Record<string, string>,
  passphrase?: string
) {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === "signature") {
      break;
    }

    parts.push(
      `${key}=${encodePayFastValue(value)}`
    );
  }

  const pfOutput = parts.join("&");

  const payload = passphrase
    ? `${pfOutput}&passphrase=${encodePayFastValue(passphrase)}`
    : pfOutput;

  return createHash("md5")
    .update(payload)
    .digest("hex");
}

export function verifyPayFastSignature(
  data: Record<string, string>,
  passphrase?: string
) {
  const receivedSignature =
    data.signature?.trim().toLowerCase();

  if (
    !receivedSignature ||
    !/^[a-f0-9]{32}$/.test(receivedSignature)
  ) {
    return false;
  }

  const expectedSignature =
    generatePayFastItnSignature(
      data,
      passphrase
    ).toLowerCase();

  const receivedBuffer =
    Buffer.from(receivedSignature, "ascii");

  const expectedBuffer =
    Buffer.from(expectedSignature, "ascii");

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}
