import { createHash, timingSafeEqual } from "crypto";

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
        `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}`
    )
    .join("&");

  const payload = passphrase
    ? `${pfOutput}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`
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
    generatePayFastSignature(
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
