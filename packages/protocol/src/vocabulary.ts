// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Closed wire vocabulary. Every string that crosses the authority boundary is a
 * member of one of these lists; the Unreal `LongTableProtocol` module declares
 * the same members in the same order.
 */
import { MANIFEST_ID } from "../../../src/game/model";

export const PROTOCOL_VERSION = "long-table-protocol/1" as const;
export type ProtocolVersion = typeof PROTOCOL_VERSION;

export { MANIFEST_ID };
export type ManifestId = typeof MANIFEST_ID;

export const SEATS = ["south", "west", "north", "east"] as const;
export type Seat = (typeof SEATS)[number];

export const TEAMS = ["north-south", "east-west"] as const;
export type Team = (typeof TEAMS)[number];

export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const CONTRACT_MODES = ["high", "low", "no-trump-high", "no-trump-low"] as const;
export type ContractMode = (typeof CONTRACT_MODES)[number];

export const PHASES = ["auction", "declaration", "kitty", "play", "summary"] as const;
export type Phase = (typeof PHASES)[number];

/** Connection roles. `ai` seats never connect; their view is authority-internal. */
export const ROLES = ["player", "host", "public", "dealer"] as const;
export type Role = (typeof ROLES)[number];

export const OCCUPANTS = ["human", "ai", "open"] as const;
export type Occupant = (typeof OCCUPANTS)[number];

export const CHOICE_KINDS = ["pass", "bid", "declare", "discard", "play", "next-hand"] as const;
export type ChoiceKind = (typeof CHOICE_KINDS)[number];

export const SELECTION_TYPES = ["pass", "bid", "declaration", "play"] as const;
export type SelectionType = (typeof SELECTION_TYPES)[number];

export const HOST_ANNOUNCEMENT_CUES = [
  "welcome",
  "hand-starting",
  "pause-shortly",
  "resuming",
  "last-hand",
  "thanks",
] as const;
export type HostAnnouncementCue = (typeof HOST_ANNOUNCEMENT_CUES)[number];

/** Neutral seat labels; a presentation layer may append "(You)" for the local seat. */
export const SEAT_LABELS: Readonly<Record<Seat, string>> = {
  south: "South",
  west: "West",
  north: "North",
  east: "East",
};

export const MODE_LABELS: Readonly<Record<ContractMode, string>> = {
  high: "High",
  low: "Low",
  "no-trump-high": "No Trump High",
  "no-trump-low": "No Trump Low",
};

export const MIN_BID_LEVEL = 3;
export const MAX_BID_LEVEL = 7;
export const DISCARD_TARGET = 6;
export const CARDS_PER_SEAT = 12;
export const KITTY_SIZE = 6;
export const TRICKS_PER_HAND = 12;

/** Bounded string lengths shared by every schema. */
export const LIMITS = {
  id: 64,
  label: 80,
  line: 240,
  glyph: 4,
  rankText: 4,
  displayName: 32,
  token: 128,
  detail: 120,
  maxListLength: 64,
  maxHandLength: 18,
  maxVersion: 2_147_483_647,
} as const;
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
