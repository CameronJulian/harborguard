export type PayFastMode = "sandbox" | "production";

export function getPayFastMode(
  rawValue = process.env.PAYFAST_SANDBOX
): PayFastMode {
  if (rawValue === "true") {
    return "sandbox";
  }

  if (rawValue === "false") {
    return "production";
  }

  throw new Error(
    'PAYFAST_SANDBOX must be explicitly set to "true" or "false".'
  );
}

export function getPayFastProcessUrl(
  rawValue = process.env.PAYFAST_SANDBOX
): string {
  return getPayFastMode(rawValue) === "sandbox"
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";
}

export function getPayFastValidationUrl(
  rawValue = process.env.PAYFAST_SANDBOX
): string {
  return getPayFastMode(rawValue) === "sandbox"
    ? "https://sandbox.payfast.co.za/eng/query/validate"
    : "https://www.payfast.co.za/eng/query/validate";
}