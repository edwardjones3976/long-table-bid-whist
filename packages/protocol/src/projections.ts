// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Role projections.
 *
 * `PlayerProjection`, `HostProjection` and `PublicProjection` are three distinct
 * closed types that share one public core. Concealed members (`hand`,
 * `legalChoices`, preview and discard state) are declared only on
 * `PlayerProjection`; they are not optional members of the host or public
 * types — they do not exist there, in the TypeScript type, in the runtime
 * schema, or in the Unreal mirror.
 *
 * `AiSeatView` is the browser oracle's `PlayerView`, re-exported as the only
 * input an AI seat may receive. It is authority-internal and never on the wire.
 */
import type { PlayerView } from "../../../src/game/model";
import * as s from "./schema";
import { HOST_CONTROLS, TABLE_INTENT, type HostControl, type TableIntent } from "./intents";
import { REJECTION_CODES, type RejectionCode } from "./receipts";
import {
  AUCTION_ENTRY_VIEW,
  COMPLETED_TRICK_VIEW,
  CONTRACT_VIEW,
  DISABLED_NOTICE_VIEW,
  PLAYER_CARD_VIEW,
  PUBLIC_TRICK_CARD,
  SEAT_OCCUPANCY_VIEW,
  type AuctionEntryView,
  type CompletedTrickView,
  type ContractView,
  type DisabledNoticeView,
  type PlayerCardView,
  type PublicTrickCard,
  type SeatOccupancyView,
} from "./views";
import {
  CHOICE_KINDS,
  HOST_ANNOUNCEMENT_CUES,
  LIMITS,
  MANIFEST_ID,
  PHASES,
  PROTOCOL_VERSION,
  SEATS,
  TRICKS_PER_HAND,
  type ChoiceKind,
  type HostAnnouncementCue,
  type ManifestId,
  type Phase,
  type ProtocolVersion,
  type Seat,
} from "./vocabulary";

export interface LegalChoiceView {
  targetId: string;
  kind: ChoiceKind;
  label: string;
  intent: TableIntent;
}

/** Facts that are public at the table by the rules of the game. */
export interface PublicCore {
  protocolVersion: ProtocolVersion;
  manifestId: ManifestId;
  tableId: string;
  version: number;
  handNumber: number;
  phase: Phase;
  turn: Seat;
  turnLabel: string;
  dealer: Seat;
  dealerLabel: string;
  contract: ContractView | null;
  auction: AuctionEntryView[];
  publicTrick: PublicTrickCard[];
  completedTricks: CompletedTrickView[];
  booksNorthSouth: number;
  booksEastWest: number;
  scoreNorthSouth: number;
  scoreEastWest: number;
  seats: SeatOccupancyView[];
  statusLine: string;
  summaryLine: string | null;
  paused: boolean;
  eventEnded: boolean;
}

export interface PlayerProjection extends PublicCore {
  role: "player";
  seat: Seat;
  hand: PlayerCardView[];
  legalChoices: LegalChoiceView[];
  previewLabel: string | null;
  discardPicked: number;
  discardTarget: number;
  /** Per-seat counter for player-local (uncommitted) changes; the shared version does not move for them. */
  uncommittedRevision: number;
  feedbackCode: RejectionCode | null;
  feedbackLine: string | null;
  disabledNotices: DisabledNoticeView[];
}

export interface HostProjection extends PublicCore {
  role: "host";
  betweenHands: boolean;
  hostControls: HostControl[];
  lastAnnouncement: HostAnnouncementCue | null;
}

export interface PublicProjection extends PublicCore {
  role: "public";
}

export type RoleProjection = PlayerProjection | HostProjection | PublicProjection;

/** Authority-internal AI input. Never serialized to a connection. */
export type AiSeatView = PlayerView;

export const AI_SEAT_VIEW_KEYS = [
  "seat",
  "phase",
  "turn",
  "hand",
  "dealer",
  "auction",
  "contract",
  "currentTrick",
  "completedTricks",
  "tricksWon",
  "scores",
] as const satisfies readonly (keyof AiSeatView)[];

const VERSION = s.int({ min: 0, max: LIMITS.maxVersion });
const SCORE = s.int({ min: -LIMITS.maxVersion, max: LIMITS.maxVersion });
const BOOKS = s.int({ min: 0, max: TRICKS_PER_HAND });

const PUBLIC_CORE_FIELDS: s.FieldSchemas<PublicCore> = {
  protocolVersion: s.literal(PROTOCOL_VERSION),
  manifestId: s.literal(MANIFEST_ID),
  tableId: s.string({ maxLength: LIMITS.id }),
  version: VERSION,
  handNumber: s.int({ min: 1, max: LIMITS.maxVersion }),
  phase: s.enumOf(PHASES),
  turn: s.enumOf(SEATS),
  turnLabel: s.string({ maxLength: LIMITS.label }),
  dealer: s.enumOf(SEATS),
  dealerLabel: s.string({ maxLength: LIMITS.label }),
  contract: s.nullable(CONTRACT_VIEW),
  auction: s.array(AUCTION_ENTRY_VIEW, { maxLength: 4 }),
  publicTrick: s.array(PUBLIC_TRICK_CARD, { maxLength: 4 }),
  completedTricks: s.array(COMPLETED_TRICK_VIEW, { maxLength: TRICKS_PER_HAND }),
  booksNorthSouth: BOOKS,
  booksEastWest: BOOKS,
  scoreNorthSouth: SCORE,
  scoreEastWest: SCORE,
  seats: s.array(SEAT_OCCUPANCY_VIEW, { maxLength: 4 }),
  statusLine: s.string({ maxLength: LIMITS.line, allowEmpty: true }),
  summaryLine: s.nullable(s.string({ maxLength: LIMITS.line })),
  paused: s.boolean(),
  eventEnded: s.boolean(),
};

export const LEGAL_CHOICE_VIEW = s.object<LegalChoiceView>({
  targetId: s.string({ maxLength: LIMITS.id }),
  kind: s.enumOf(CHOICE_KINDS),
  label: s.string({ maxLength: LIMITS.label }),
  intent: TABLE_INTENT,
});

export const PLAYER_PROJECTION = s.object<PlayerProjection>({
  role: s.literal("player"),
  ...PUBLIC_CORE_FIELDS,
  seat: s.enumOf(SEATS),
  hand: s.array(PLAYER_CARD_VIEW, { maxLength: LIMITS.maxHandLength }),
  legalChoices: s.array(LEGAL_CHOICE_VIEW, { maxLength: LIMITS.maxListLength }),
  previewLabel: s.nullable(s.string({ maxLength: LIMITS.label })),
  discardPicked: s.int({ min: 0, max: LIMITS.maxHandLength }),
  discardTarget: s.int({ min: 0, max: LIMITS.maxHandLength }),
  uncommittedRevision: s.int({ min: 0, max: LIMITS.maxVersion }),
  feedbackCode: s.nullable(s.enumOf(REJECTION_CODES)),
  feedbackLine: s.nullable(s.string({ maxLength: LIMITS.line })),
  disabledNotices: s.array(DISABLED_NOTICE_VIEW, { maxLength: 8 }),
});

export const HOST_PROJECTION = s.object<HostProjection>({
  role: s.literal("host"),
  ...PUBLIC_CORE_FIELDS,
  betweenHands: s.boolean(),
  hostControls: s.array(s.enumOf(HOST_CONTROLS), { maxLength: HOST_CONTROLS.length }),
  lastAnnouncement: s.nullable(s.enumOf(HOST_ANNOUNCEMENT_CUES)),
});

export const PUBLIC_PROJECTION = s.object<PublicProjection>({
  role: s.literal("public"),
  ...PUBLIC_CORE_FIELDS,
});

export const ROLE_PROJECTION = s.union<"role", RoleProjection>("role", {
  player: PLAYER_PROJECTION,
  host: HOST_PROJECTION,
  public: PUBLIC_PROJECTION,
});

export const PUBLIC_CORE_KEYS = Object.keys(PUBLIC_CORE_FIELDS) as readonly (keyof PublicCore)[];
export const PLAYER_PROJECTION_KEYS = PLAYER_PROJECTION.keys;
export const HOST_PROJECTION_KEYS = HOST_PROJECTION.keys;
export const PUBLIC_PROJECTION_KEYS = PUBLIC_PROJECTION.keys;
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
