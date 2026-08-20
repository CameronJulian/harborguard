export const HSPP_CANONICALIZATION_VERSION =
  "hspp-canonical-json-v1" as const;

export type HsppCanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | HsppCanonicalJsonValue[]
  | { [key: string]: HsppCanonicalJsonValue };

function normalizeCanonicalValue(
  value: unknown,
  path: string
): HsppCanonicalJsonValue {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        `HSPP canonical value at ${path} must be a finite number.`
      );
    }

    return Object.is(value, -0) ? 0 : value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeCanonicalValue(
        item,
        `${path}[${index}]`
      )
    );
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const prototype =
      Object.getPrototypeOf(value);

    if (
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new Error(
        `HSPP canonical value at ${path} must be a plain JSON object.`
      );
    }

    const result: {
      [key: string]: HsppCanonicalJsonValue;
    } = {};

    for (const key of Object.keys(value).sort()) {
      const child =
        (value as Record<string, unknown>)[key];

      if (child === undefined) {
        throw new Error(
          `HSPP canonical value at ${path}.${key} cannot be undefined.`
        );
      }

      result[key] =
        normalizeCanonicalValue(
          child,
          `${path}.${key}`
        );
    }

    return result;
  }

  throw new Error(
    `Unsupported HSPP canonical value at ${path}.`
  );
}

export function canonicalizeHsppEvidence(
  value: unknown
): string {
  return JSON.stringify(
    normalizeCanonicalValue(value, "$")
  );
}
