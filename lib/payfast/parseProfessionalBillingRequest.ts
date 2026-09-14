import { z } from "zod";

const billingBodySchema = z.object({
  billingEmail: z.string().trim().max(254).email(),
});

type BillingRequestResult =
  | { ok: true; billingEmail: string }
  | { ok: false; status: 400 | 415; error: string };

export async function parseProfessionalBillingRequest(
  req: Request
): Promise<BillingRequestResult> {
  const mediaType = (req.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (mediaType !== "application/json") {
    return {
      ok: false,
      status: 415,
      error: "Content-Type application/json is required.",
    };
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    return {
      ok: false,
      status: 400,
      error: "Invalid JSON body.",
    };
  }

  const parsed = billingBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "A valid billing email is required.",
    };
  }

  return {
    ok: true,
    billingEmail: parsed.data.billingEmail,
  };
}
