// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Closed-schema kit.
 *
 * Every wire payload in The Long Table is decoded through one of these schemas.
 * Decoding constructs a brand-new value field by field from an explicit
 * allowlist: an unknown key, a missing key, a wrong type, or an out-of-range
 * value rejects the whole payload. There is no partial acceptance, no default
 * filling, no pattern matching, and no redaction step anywhere in this file —
 * per director/privacy-control-policy.md the boundary is structural.
 *
 * The same field order that a schema declares is the order the canonical JSON
 * encoder writes, so TypeScript and Unreal produce byte-identical text for the
 * same value.
 */

export type SchemaRejectionCode =
  | "not-an-object"
  | "unknown-field"
  | "missing-field"
  | "type-mismatch"
  | "value-out-of-range"
  | "unknown-variant";

export interface SchemaRejection {
  readonly code: SchemaRejectionCode;
  /** Dotted path of the offending member, e.g. `projection.hand[3].cardId`. */
  readonly path: string;
}

export type DecodeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly rejection: SchemaRejection };

export interface Schema<T> {
  /** Kind tag, used by the canonical encoder to order object keys. */
  readonly kind: "primitive" | "object" | "array" | "nullable" | "union";
  decode(input: unknown, path: string): DecodeResult<T>;
  /** Re-emits `value` in declared field order. Assumes `value` already conforms. */
  canonical(value: T): unknown;
}

export interface ObjectSchema<T extends object> extends Schema<T> {
  readonly kind: "object";
  readonly keys: readonly (keyof T & string)[];
}

function reject<T>(code: SchemaRejectionCode, path: string): DecodeResult<T> {
  return { ok: false, rejection: { code, path } };
}

function accept<T>(value: T): DecodeResult<T> {
  return { ok: true, value };
}

export interface StringOptions {
  /** Inclusive upper bound on UTF-16 length. */
  readonly maxLength: number;
  readonly allowEmpty?: boolean;
}

export function string(options: StringOptions): Schema<string> {
  return {
    kind: "primitive",
    decode(input, path) {
      if (typeof input !== "string") return reject("type-mismatch", path);
      if (input.length > options.maxLength) return reject("value-out-of-range", path);
      if (!options.allowEmpty && input.length === 0) return reject("value-out-of-range", path);
      return accept(input);
    },
    canonical: (value) => value,
  };
}

export interface IntOptions {
  readonly min: number;
  readonly max: number;
}

export function int(options: IntOptions): Schema<number> {
  return {
    kind: "primitive",
    decode(input, path) {
      if (typeof input !== "number" || !Number.isInteger(input)) return reject("type-mismatch", path);
      if (input < options.min || input > options.max) return reject("value-out-of-range", path);
      return accept(input);
    },
    canonical: (value) => value,
  };
}

export function boolean(): Schema<boolean> {
  return {
    kind: "primitive",
    decode(input, path) {
      return typeof input === "boolean" ? accept(input) : reject("type-mismatch", path);
    },
    canonical: (value) => value,
  };
}

export function literal<const L extends string | number | boolean>(expected: L): Schema<L> {
  return {
    kind: "primitive",
    decode(input, path) {
      return input === expected ? accept(expected) : reject("value-out-of-range", path);
    },
    canonical: (value) => value,
  };
}

/** Closed vocabulary. Membership is exact string equality against the list. */
export function enumOf<const E extends string>(values: readonly E[]): Schema<E> {
  return {
    kind: "primitive",
    decode(input, path) {
      if (typeof input !== "string") return reject("type-mismatch", path);
      const match = values.find((candidate) => candidate === input);
      return match === undefined ? reject("value-out-of-range", path) : accept(match);
    },
    canonical: (value) => value,
  };
}

export function nullable<T>(inner: Schema<T>): Schema<T | null> {
  return {
    kind: "nullable",
    decode(input, path) {
      return input === null ? accept<T | null>(null) : inner.decode(input, path);
    },
    canonical: (value) => (value === null ? null : inner.canonical(value)),
  };
}

export interface ArrayOptions {
  readonly maxLength: number;
}

export function array<T>(item: Schema<T>, options: ArrayOptions): Schema<T[]> {
  return {
    kind: "array",
    decode(input, path) {
      if (!Array.isArray(input)) return reject("type-mismatch", path);
      if (input.length > options.maxLength) return reject("value-out-of-range", path);
      const out: T[] = [];
      for (let index = 0; index < input.length; index += 1) {
        const decoded = item.decode(input[index], `${path}[${index}]`);
        if (!decoded.ok) return decoded;
        out.push(decoded.value);
      }
      return accept(out);
    },
    canonical: (value) => value.map((entry) => item.canonical(entry)),
  };
}

export type FieldSchemas<T extends object> = { readonly [K in keyof T]-?: Schema<T[K]> };

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Closed object. Every declared field is required (nullability is explicit via
 * `nullable`), and any key outside the declaration rejects the payload.
 */
export function object<T extends object>(fields: FieldSchemas<T>): ObjectSchema<T> {
  const keys = Object.keys(fields) as (keyof T & string)[];
  const keySet = new Set<string>(keys);
  return {
    kind: "object",
    keys,
    decode(input, path) {
      if (!isPlainObject(input)) return reject("not-an-object", path);
      for (const key of Object.keys(input)) {
        if (!keySet.has(key)) return reject("unknown-field", `${path}.${key}`);
      }
      const out: Partial<T> = {};
      for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(input, key)) {
          return reject("missing-field", `${path}.${key}`);
        }
        const decoded = fields[key].decode(input[key], `${path}.${key}`);
        if (!decoded.ok) return decoded;
        out[key] = decoded.value;
      }
      return accept(out as T);
    },
    canonical(value) {
      const out: Record<string, unknown> = {};
      for (const key of keys) out[key] = fields[key].canonical(value[key]);
      return out;
    },
  };
}

/**
 * Discriminated union keyed by a string member. The variant schemas must each
 * declare the discriminant as a `literal`.
 */
export function union<D extends string, T extends { [P in D]: string }>(
  discriminant: D,
  variants: { readonly [V in T[D]]: ObjectSchema<Extract<T, { [P in D]: V }>> },
): Schema<T> {
  const table = variants as unknown as Record<string, ObjectSchema<T>>;
  return {
    kind: "union",
    decode(input, path) {
      if (!isPlainObject(input)) return reject("not-an-object", path);
      const tag = input[discriminant];
      if (typeof tag !== "string") return reject("type-mismatch", `${path}.${discriminant}`);
      const variant = Object.prototype.hasOwnProperty.call(table, tag) ? table[tag] : undefined;
      if (!variant) return reject("unknown-variant", `${path}.${discriminant}`);
      return variant.decode(input, path);
    },
    canonical(value) {
      return table[value[discriminant]].canonical(value);
    },
  };
}

/** Decodes and, on rejection, throws — for callers that treat rejection as a bug. */
export function decodeOrThrow<T>(schema: Schema<T>, input: unknown, label: string): T {
  const result = schema.decode(input, label);
  if (!result.ok) {
    throw new Error(`${label}: ${result.rejection.code} at ${result.rejection.path}`);
  }
  return result.value;
}

/** Canonical JSON: schema field order, no whitespace. */
export function canonicalJson<T>(schema: Schema<T>, value: T): string {
  return JSON.stringify(schema.canonical(value));
}

/** Parses JSON text and decodes it through `schema`; malformed text fails closed. */
export function decodeJsonText<T>(schema: Schema<T>, text: string, label: string): DecodeResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return reject("type-mismatch", label);
  }
  return schema.decode(parsed, label);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
