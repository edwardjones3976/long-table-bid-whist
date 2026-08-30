// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Wire envelopes for the authenticated WebSocket between Unreal and the
 * TypeScript table authority. Text frames, one JSON message per frame.
 *
 * Client -> authority: `hello`, `intent`, `resync`.
 * Authority -> client: `welcome`, `projection`, `receipt`, `replay`,
 * `dealer-cue`, `error`.
 */
import * as s from "./schema";
import { DEALER_CUE_FRAME, type DealerCueFrame } from "./dealer";
import { TABLE_INTENT, type TableIntent } from "./intents";
import { ROLE_PROJECTION, type RoleProjection } from "./projections";
import { INTENT_RECEIPT, type IntentReceipt } from "./receipts";
import {
  LIMITS,
  PROTOCOL_VERSION,
  ROLES,
  SEATS,
  type ProtocolVersion,
  type Role,
  type Seat,
} from "./vocabulary";

export type ClientMessage =
  | {
      type: "hello";
      protocolVersion: ProtocolVersion;
      /** Opaque bearer credential matched exactly against the participant directory. */
      token: string;
      /** The role this connection asks for; the authority checks entitlement. */
      role: Role;
      tableId: string;
      displayName: string;
      /** Null on a fresh join; the last applied version when reconnecting. */
      lastVersion: number | null;
    }
  | {
      type: "intent";
      tableId: string;
      intentId: string;
      expectedVersion: number;
      intent: TableIntent;
    }
  | { type: "resync"; tableId: string; lastVersion: number };

export interface ReplayFrame {
  version: number;
  projection: RoleProjection;
}

export const WIRE_ERROR_CODES = [
  "schema-rejected",
  "protocol-version",
  "unauthenticated",
  "not-welcomed",
  "unknown-table",
  "role-unavailable",
] as const;
export type WireErrorCode = (typeof WIRE_ERROR_CODES)[number];

export type AuthorityMessage =
  | {
      type: "welcome";
      protocolVersion: ProtocolVersion;
      sessionId: string;
      role: Role;
      seat: Seat | null;
      tableId: string;
      version: number;
      /** Null only for the dealer role, which receives cues alone. */
      projection: RoleProjection | null;
    }
  | { type: "projection"; tableId: string; version: number; projection: RoleProjection }
  | { type: "receipt"; tableId: string; receipt: IntentReceipt }
  | {
      type: "replay";
      tableId: string;
      fromVersion: number;
      toVersion: number;
      /** True when the retained history no longer reaches `fromVersion`; the welcome snapshot is authoritative. */
      truncated: boolean;
      frames: ReplayFrame[];
    }
  | { type: "dealer-cue"; tableId: string; frame: DealerCueFrame }
  | { type: "error"; code: WireErrorCode; detail: string };

const ID = s.string({ maxLength: LIMITS.id });
const VERSION = s.int({ min: 0, max: LIMITS.maxVersion });

export const CLIENT_MESSAGE = s.union<"type", ClientMessage>("type", {
  hello: s.object<Extract<ClientMessage, { type: "hello" }>>({
    type: s.literal("hello"),
    protocolVersion: s.literal(PROTOCOL_VERSION),
    token: s.string({ maxLength: LIMITS.token }),
    role: s.enumOf(ROLES),
    tableId: ID,
    displayName: s.string({ maxLength: LIMITS.displayName, allowEmpty: true }),
    lastVersion: s.nullable(VERSION),
  }),
  intent: s.object<Extract<ClientMessage, { type: "intent" }>>({
    type: s.literal("intent"),
    tableId: ID,
    intentId: ID,
    expectedVersion: VERSION,
    intent: TABLE_INTENT,
  }),
  resync: s.object<Extract<ClientMessage, { type: "resync" }>>({
    type: s.literal("resync"),
    tableId: ID,
    lastVersion: VERSION,
  }),
});

export const REPLAY_FRAME = s.object<ReplayFrame>({ version: VERSION, projection: ROLE_PROJECTION });

export const AUTHORITY_MESSAGE = s.union<"type", AuthorityMessage>("type", {
  welcome: s.object<Extract<AuthorityMessage, { type: "welcome" }>>({
    type: s.literal("welcome"),
    protocolVersion: s.literal(PROTOCOL_VERSION),
    sessionId: ID,
    role: s.enumOf(ROLES),
    seat: s.nullable(s.enumOf(SEATS)),
    tableId: ID,
    version: VERSION,
    projection: s.nullable(ROLE_PROJECTION),
  }),
  projection: s.object<Extract<AuthorityMessage, { type: "projection" }>>({
    type: s.literal("projection"),
    tableId: ID,
    version: VERSION,
    projection: ROLE_PROJECTION,
  }),
  receipt: s.object<Extract<AuthorityMessage, { type: "receipt" }>>({
    type: s.literal("receipt"),
    tableId: ID,
    receipt: INTENT_RECEIPT,
  }),
  replay: s.object<Extract<AuthorityMessage, { type: "replay" }>>({
    type: s.literal("replay"),
    tableId: ID,
    fromVersion: VERSION,
    toVersion: VERSION,
    truncated: s.boolean(),
    frames: s.array(REPLAY_FRAME, { maxLength: 512 }),
  }),
  "dealer-cue": s.object<Extract<AuthorityMessage, { type: "dealer-cue" }>>({
    type: s.literal("dealer-cue"),
    tableId: ID,
    frame: DEALER_CUE_FRAME,
  }),
  error: s.object<Extract<AuthorityMessage, { type: "error" }>>({
    type: s.literal("error"),
    code: s.enumOf(WIRE_ERROR_CODES),
    detail: s.string({ maxLength: LIMITS.detail, allowEmpty: true }),
  }),
});

export function encodeClientMessage(message: ClientMessage): string {
  return s.canonicalJson(CLIENT_MESSAGE, message);
}

export function encodeAuthorityMessage(message: AuthorityMessage): string {
  return s.canonicalJson(AUTHORITY_MESSAGE, message);
}

export function decodeClientMessage(text: string): s.DecodeResult<ClientMessage> {
  return s.decodeJsonText(CLIENT_MESSAGE, text, "client");
}

export function decodeAuthorityMessage(text: string): s.DecodeResult<AuthorityMessage> {
  return s.decodeJsonText(AUTHORITY_MESSAGE, text, "authority");
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
