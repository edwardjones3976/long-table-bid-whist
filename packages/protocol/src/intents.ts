// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Typed intents. A preview is pointing, never a commit; only `confirm` and
 * `next-hand` can advance committed play, and only the authority decides.
 *
 * Host intents are social/session powers. There is no host intent that can
 * read, request, or change a card, a bid, a trick, or a score.
 */
import * as s from "./schema";
import { BID_VIEW, type BidView } from "./views";
import {
  HOST_ANNOUNCEMENT_CUES,
  LIMITS,
  SEATS,
  SUITS,
  type HostAnnouncementCue,
  type Role,
  type Seat,
  type Suit,
} from "./vocabulary";

export type TableSelection =
  | { type: "pass" }
  | { type: "bid"; bid: BidView }
  | { type: "declaration"; trump: Suit | null }
  | { type: "play"; cardId: string };

export type TableIntent =
  | { kind: "preview"; selection: TableSelection }
  | { kind: "toggle-discard"; cardId: string }
  | { kind: "cancel" }
  | { kind: "confirm" }
  | { kind: "next-hand" }
  | { kind: "host-pause" }
  | { kind: "host-resume" }
  | { kind: "host-announce"; cue: HostAnnouncementCue }
  | { kind: "host-substitute"; seat: Seat }
  | { kind: "host-transfer"; participantId: string }
  | { kind: "host-end-event" };

export type IntentKind = TableIntent["kind"];

export const INTENT_KINDS = [
  "preview",
  "toggle-discard",
  "cancel",
  "confirm",
  "next-hand",
  "host-pause",
  "host-resume",
  "host-announce",
  "host-substitute",
  "host-transfer",
  "host-end-event",
] as const satisfies readonly IntentKind[];

/**
 * Which roles may submit which intent. Enforced by the authority before any
 * rules code runs; a public or dealer connection can submit nothing.
 */
export const INTENT_AUTHORITY: Readonly<Record<IntentKind, readonly Role[]>> = {
  preview: ["player"],
  "toggle-discard": ["player"],
  cancel: ["player"],
  confirm: ["player"],
  "next-hand": ["player", "host"],
  "host-pause": ["host"],
  "host-resume": ["host"],
  "host-announce": ["host"],
  "host-substitute": ["host"],
  "host-transfer": ["host"],
  "host-end-event": ["host"],
};

export const HOST_CONTROLS = [
  "next-hand",
  "host-pause",
  "host-resume",
  "host-announce",
  "host-substitute",
  "host-transfer",
  "host-end-event",
] as const satisfies readonly IntentKind[];
export type HostControl = (typeof HOST_CONTROLS)[number];

const CARD_ID = s.string({ maxLength: LIMITS.id });

export const TABLE_SELECTION = s.union<"type", TableSelection>("type", {
  pass: s.object<Extract<TableSelection, { type: "pass" }>>({ type: s.literal("pass") }),
  bid: s.object<Extract<TableSelection, { type: "bid" }>>({
    type: s.literal("bid"),
    bid: BID_VIEW,
  }),
  declaration: s.object<Extract<TableSelection, { type: "declaration" }>>({
    type: s.literal("declaration"),
    trump: s.nullable(s.enumOf(SUITS)),
  }),
  play: s.object<Extract<TableSelection, { type: "play" }>>({
    type: s.literal("play"),
    cardId: CARD_ID,
  }),
});

export const TABLE_INTENT = s.union<"kind", TableIntent>("kind", {
  preview: s.object<Extract<TableIntent, { kind: "preview" }>>({
    kind: s.literal("preview"),
    selection: TABLE_SELECTION,
  }),
  "toggle-discard": s.object<Extract<TableIntent, { kind: "toggle-discard" }>>({
    kind: s.literal("toggle-discard"),
    cardId: CARD_ID,
  }),
  cancel: s.object<Extract<TableIntent, { kind: "cancel" }>>({ kind: s.literal("cancel") }),
  confirm: s.object<Extract<TableIntent, { kind: "confirm" }>>({ kind: s.literal("confirm") }),
  "next-hand": s.object<Extract<TableIntent, { kind: "next-hand" }>>({
    kind: s.literal("next-hand"),
  }),
  "host-pause": s.object<Extract<TableIntent, { kind: "host-pause" }>>({
    kind: s.literal("host-pause"),
  }),
  "host-resume": s.object<Extract<TableIntent, { kind: "host-resume" }>>({
    kind: s.literal("host-resume"),
  }),
  "host-announce": s.object<Extract<TableIntent, { kind: "host-announce" }>>({
    kind: s.literal("host-announce"),
    cue: s.enumOf(HOST_ANNOUNCEMENT_CUES),
  }),
  "host-substitute": s.object<Extract<TableIntent, { kind: "host-substitute" }>>({
    kind: s.literal("host-substitute"),
    seat: s.enumOf(SEATS),
  }),
  "host-transfer": s.object<Extract<TableIntent, { kind: "host-transfer" }>>({
    kind: s.literal("host-transfer"),
    participantId: s.string({ maxLength: LIMITS.id }),
  }),
  "host-end-event": s.object<Extract<TableIntent, { kind: "host-end-event" }>>({
    kind: s.literal("host-end-event"),
  }),
});

export function isHostIntent(intent: TableIntent): boolean {
  return INTENT_AUTHORITY[intent.kind].every((role) => role === "host");
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
