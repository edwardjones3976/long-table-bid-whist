// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Exact field inventories of the closed schemas.
 *
 * Privacy is enforced structurally: every schema declares an exact, ordered
 * inventory of the members it may carry, the decoder rejects anything else,
 * and role projections are constructed field by field from those inventories.
 * There is no list of forbidden names, no substring scan and no redaction step
 * anywhere; the invariants below fail `tsc` and the test suite if a declared
 * type or runtime schema drifts from its inventory.
 */
import type { ObjectSchema } from "./schema";
import { DEALER_CUE_FRAME, type DealerCueFrame } from "./dealer";
import {
  HOST_PROJECTION,
  PLAYER_PROJECTION,
  PUBLIC_PROJECTION,
  type HostProjection,
  type PlayerProjection,
  type PublicCore,
  type PublicProjection,
} from "./projections";
import { INTENT_RECEIPT, type IntentReceipt } from "./receipts";
import {
  ERROR_MESSAGE,
  REPLAY_FRAME,
  WELCOME_MESSAGE_VARIANTS,
  WELCOME_PLAYER_MESSAGE,
  type ErrorMessage,
  type ReplayFrame,
  type WelcomeMessage,
} from "./wire";

export const PUBLIC_CORE_INVENTORY = [
  "protocolVersion",
  "manifestId",
  "tableId",
  "version",
  "handNumber",
  "phase",
  "turn",
  "turnLabel",
  "dealer",
  "dealerLabel",
  "contract",
  "auction",
  "publicTrick",
  "completedTricks",
  "booksNorthSouth",
  "booksEastWest",
  "scoreNorthSouth",
  "scoreEastWest",
  "seats",
  "statusLine",
  "summaryLine",
  "paused",
  "eventEnded",
] as const;

export const PLAYER_PROJECTION_INVENTORY = [
  "role",
  ...PUBLIC_CORE_INVENTORY,
  "seat",
  "hand",
  "legalChoices",
  "previewLabel",
  "discardPicked",
  "discardTarget",
  "uncommittedRevision",
  "feedbackCode",
  "feedbackLine",
  "disabledNotices",
] as const;

export const HOST_PROJECTION_INVENTORY = [
  "role",
  ...PUBLIC_CORE_INVENTORY,
  "betweenHands",
  "hostControls",
  "lastAnnouncement",
] as const;

export const PUBLIC_PROJECTION_INVENTORY = ["role", ...PUBLIC_CORE_INVENTORY] as const;

export const DEALER_CUE_FRAME_INVENTORY = [
  "protocolVersion",
  "tableId",
  "version",
  "handNumber",
  "phase",
  "cue",
  "seat",
  "seatLabel",
  "announcement",
] as const;

export const INTENT_RECEIPT_INVENTORY = [
  "intentId",
  "intentKind",
  "outcome",
  "code",
  "message",
  "committed",
  "version",
] as const;

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
export const WELCOME_MESSAGE_INVENTORY = [
  "type",
  "protocolVersion",
  "sessionId",
  "role",
  "seat",
  "tableId",
  "version",
  "nextIntentCounter",
  "projection",
] as const;
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

export const ERROR_MESSAGE_INVENTORY = ["type", "code", "detail"] as const;

export const REPLAY_FRAME_INVENTORY = ["version", "projection"] as const;

/** `true` only when the two unions are identical in both directions. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
type AssertTrue<T extends true> = T;

/** Compile-time exactness of every declared type against its inventory. */
export type InventoryInvariants = [
  AssertTrue<Exact<keyof PublicCore, (typeof PUBLIC_CORE_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof PlayerProjection, (typeof PLAYER_PROJECTION_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof HostProjection, (typeof HOST_PROJECTION_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof PublicProjection, (typeof PUBLIC_PROJECTION_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof DealerCueFrame, (typeof DEALER_CUE_FRAME_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof IntentReceipt, (typeof INTENT_RECEIPT_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof WelcomeMessage, (typeof WELCOME_MESSAGE_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof ErrorMessage, (typeof ERROR_MESSAGE_INVENTORY)[number]>>,
  AssertTrue<Exact<keyof ReplayFrame, (typeof REPLAY_FRAME_INVENTORY)[number]>>,
];

export interface SchemaInventory {
  readonly name: string;
  readonly schema: ObjectSchema<object>;
  readonly inventory: readonly string[];
}

/** Every closed schema with its exact, ordered inventory. */
export const SCHEMA_INVENTORIES: readonly SchemaInventory[] = [
  { name: "PlayerProjection", schema: PLAYER_PROJECTION as ObjectSchema<object>, inventory: PLAYER_PROJECTION_INVENTORY },
  { name: "HostProjection", schema: HOST_PROJECTION as ObjectSchema<object>, inventory: HOST_PROJECTION_INVENTORY },
  { name: "PublicProjection", schema: PUBLIC_PROJECTION as ObjectSchema<object>, inventory: PUBLIC_PROJECTION_INVENTORY },
  { name: "DealerCueFrame", schema: DEALER_CUE_FRAME as ObjectSchema<object>, inventory: DEALER_CUE_FRAME_INVENTORY },
  { name: "IntentReceipt", schema: INTENT_RECEIPT as ObjectSchema<object>, inventory: INTENT_RECEIPT_INVENTORY },
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
  // The welcome is role-discriminated; every variant shares this inventory (checked below).
  { name: "WelcomeMessage", schema: WELCOME_PLAYER_MESSAGE as ObjectSchema<object>, inventory: WELCOME_MESSAGE_INVENTORY },
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
  { name: "ErrorMessage", schema: ERROR_MESSAGE as ObjectSchema<object>, inventory: ERROR_MESSAGE_INVENTORY },
  { name: "ReplayFrame", schema: REPLAY_FRAME as ObjectSchema<object>, inventory: REPLAY_FRAME_INVENTORY },
];

function sameInventory(declared: readonly string[], inventory: readonly string[]): boolean {
  return declared.length === inventory.length && declared.every((key, index) => key === inventory[index]);
}

/** Names of schemas whose runtime key list differs from the inventory in members or order; empty when sound. */
export function inventoryViolations(): string[] {
  const violations = SCHEMA_INVENTORIES.filter(({ schema, inventory }) => !sameInventory(schema.keys, inventory)).map(({ name }) => name);
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
  if (WELCOME_MESSAGE_VARIANTS.some((variant) => !sameInventory(variant.keys, WELCOME_MESSAGE_INVENTORY)) && !violations.includes("WelcomeMessage")) {
    violations.push("WelcomeMessage");
  }
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
  return violations;
}

/** True when `value` carries exactly the inventory of `name`: no more, no fewer. */
export function matchesInventory(name: string, value: object): boolean {
  const entry = SCHEMA_INVENTORIES.find((candidate) => candidate.name === name);
  if (!entry) return false;
  const keys = Object.keys(value);
  return keys.length === entry.inventory.length && entry.inventory.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
