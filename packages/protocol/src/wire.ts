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
import type { Schema } from "./schema";
import { DEALER_CUE_FRAME, type DealerCueFrame } from "./dealer";
import { TABLE_INTENT, type TableIntent } from "./intents";
import {
  HOST_PROJECTION,
  PLAYER_PROJECTION,
  PUBLIC_PROJECTION,
  ROLE_PROJECTION,
  type HostProjection,
  type PlayerProjection,
  type PublicProjection,
  type RoleProjection,
} from "./projections";
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

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
/**
 * The welcome is role-discriminated. Each role has its own closed shape:
 * a player welcome carries a seat and a `PlayerProjection`; host and public
 * welcomes carry no seat and their own projection; a dealer welcome carries
 * no seat and a null projection. Every crossover fails closed at decode.
 */
interface WelcomeBase {
  type: "welcome";
  protocolVersion: ProtocolVersion;
  sessionId: string;
  tableId: string;
  version: number;
}

export interface PlayerWelcome extends WelcomeBase {
  role: "player";
  seat: Seat;
  projection: PlayerProjection;
}

export interface HostWelcome extends WelcomeBase {
  role: "host";
  seat: null;
  projection: HostProjection;
}

export interface PublicWelcome extends WelcomeBase {
  role: "public";
  seat: null;
  projection: PublicProjection;
}

export interface DealerWelcome extends WelcomeBase {
  role: "dealer";
  seat: null;
  projection: null;
}

export type WelcomeMessage = PlayerWelcome | HostWelcome | PublicWelcome | DealerWelcome;
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

export interface ErrorMessage {
  type: "error";
  code: WireErrorCode;
  detail: string;
}

export type AuthorityMessage =
  | WelcomeMessage
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
  | ErrorMessage;

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

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
/** Accepts JSON null and nothing else. */
const NULL_ONLY: Schema<null> = {
  kind: "primitive",
  decode: (input, path) => (input === null ? { ok: true, value: null } : { ok: false, rejection: { code: "value-out-of-range", path } }),
  canonical: () => null,
};

export const WELCOME_PLAYER_MESSAGE = s.object<PlayerWelcome>({
  type: s.literal("welcome"),
  protocolVersion: s.literal(PROTOCOL_VERSION),
  sessionId: ID,
  role: s.literal("player"),
  seat: s.enumOf(SEATS),
  tableId: ID,
  version: VERSION,
  projection: PLAYER_PROJECTION,
});

export const WELCOME_HOST_MESSAGE = s.object<HostWelcome>({
  type: s.literal("welcome"),
  protocolVersion: s.literal(PROTOCOL_VERSION),
  sessionId: ID,
  role: s.literal("host"),
  seat: NULL_ONLY,
  tableId: ID,
  version: VERSION,
  projection: HOST_PROJECTION,
});

export const WELCOME_PUBLIC_MESSAGE = s.object<PublicWelcome>({
  type: s.literal("welcome"),
  protocolVersion: s.literal(PROTOCOL_VERSION),
  sessionId: ID,
  role: s.literal("public"),
  seat: NULL_ONLY,
  tableId: ID,
  version: VERSION,
  projection: PUBLIC_PROJECTION,
});

export const WELCOME_DEALER_MESSAGE = s.object<DealerWelcome>({
  type: s.literal("welcome"),
  protocolVersion: s.literal(PROTOCOL_VERSION),
  sessionId: ID,
  role: s.literal("dealer"),
  seat: NULL_ONLY,
  tableId: ID,
  version: VERSION,
  projection: NULL_ONLY,
});

/** The four closed welcome shapes; every one declares the same ordered key inventory. */
export const WELCOME_MESSAGE_VARIANTS: readonly s.ObjectSchema<object>[] = [
  WELCOME_PLAYER_MESSAGE as s.ObjectSchema<object>,
  WELCOME_HOST_MESSAGE as s.ObjectSchema<object>,
  WELCOME_PUBLIC_MESSAGE as s.ObjectSchema<object>,
  WELCOME_DEALER_MESSAGE as s.ObjectSchema<object>,
];

export const WELCOME_MESSAGE: Schema<WelcomeMessage> = s.union<"role", WelcomeMessage>("role", {
  player: WELCOME_PLAYER_MESSAGE,
  host: WELCOME_HOST_MESSAGE,
  public: WELCOME_PUBLIC_MESSAGE,
  dealer: WELCOME_DEALER_MESSAGE,
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

export const ERROR_MESSAGE = s.object<ErrorMessage>({
  type: s.literal("error"),
  code: s.enumOf(WIRE_ERROR_CODES),
  detail: s.string({ maxLength: LIMITS.detail, allowEmpty: true }),
});

export const AUTHORITY_MESSAGE = s.union<"type", AuthorityMessage>("type", {
  // The welcome variant is itself a role-discriminated union; it exposes the
  // same decode/canonical contract the outer union needs.
  welcome: WELCOME_MESSAGE as unknown as s.ObjectSchema<WelcomeMessage>,
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
  error: ERROR_MESSAGE,
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
