// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Compile-time and runtime invariants of the closed schemas.
 *
 * The type-level checks fail `tsc` if a concealed member is ever added to a
 * host, public, dealer, receipt or wire-error type. The runtime check is used by
 * tests and by the fixture generator to assert the same thing about the schema
 * key lists that the Unreal mirror is generated from.
 */
import type { ObjectSchema } from "./schema";
import { DEALER_CUE_FRAME } from "./dealer";
import { HOST_PROJECTION, PUBLIC_PROJECTION } from "./projections";
import type { HostProjection, PublicProjection } from "./projections";
import { INTENT_RECEIPT } from "./receipts";
import type { DealerCueFrame } from "./dealer";
import type { IntentReceipt } from "./receipts";

/**
 * Members that identify concealed or authority-private state. None may appear
 * on any type other than `PlayerProjection` (own hand only) and `AiSeatView`.
 */
export const CONCEALED_KEYS = [
  "hand",
  "hands",
  "kitty",
  "discardPile",
  "seed",
  "events",
  "legalChoices",
  "previewLabel",
  "discardPicked",
  "discardTarget",
  "discardIds",
  "preview",
  "processedInputIds",
  "processedIntentIds",
  "token",
  "participantId",
] as const;
export type ConcealedKey = (typeof CONCEALED_KEYS)[number];

type AssertNever<T extends never> = T;
type HostHasNoConcealedMember = AssertNever<Extract<keyof HostProjection, ConcealedKey>>;
type PublicHasNoConcealedMember = AssertNever<Extract<keyof PublicProjection, ConcealedKey>>;
type DealerHasNoConcealedMember = AssertNever<Extract<keyof DealerCueFrame, ConcealedKey>>;
type ReceiptHasNoConcealedMember = AssertNever<Extract<keyof IntentReceipt, ConcealedKey>>;
export type ClosedTypeInvariants = [
  HostHasNoConcealedMember,
  PublicHasNoConcealedMember,
  DealerHasNoConcealedMember,
  ReceiptHasNoConcealedMember,
];

/** Schemas whose key lists must never include a concealed member. */
export const NON_PLAYER_SCHEMAS: ReadonlyArray<{ name: string; schema: ObjectSchema<object> }> = [
  { name: "HostProjection", schema: HOST_PROJECTION as ObjectSchema<object> },
  { name: "PublicProjection", schema: PUBLIC_PROJECTION as ObjectSchema<object> },
  { name: "DealerCueFrame", schema: DEALER_CUE_FRAME as ObjectSchema<object> },
  { name: "IntentReceipt", schema: INTENT_RECEIPT as ObjectSchema<object> },
];

/** Returns the names of non-player schemas that declare a concealed key; empty when sound. */
export function concealedKeyViolations(): string[] {
  const concealed = new Set<string>(CONCEALED_KEYS);
  return NON_PLAYER_SCHEMAS.filter(({ schema }) =>
    schema.keys.some((key) => concealed.has(key)),
  ).map(({ name }) => name);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
