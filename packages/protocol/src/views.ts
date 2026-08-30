// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Component views shared by the role projections. Each is a closed object; the
 * schema is the allowlist.
 */
import * as s from "./schema";
import {
  CONTRACT_MODES,
  LIMITS,
  MAX_BID_LEVEL,
  MIN_BID_LEVEL,
  OCCUPANTS,
  SEATS,
  SUITS,
  TRICKS_PER_HAND,
  type ContractMode,
  type Occupant,
  type Seat,
  type Suit,
} from "./vocabulary";

export interface BidView {
  level: number;
  mode: ContractMode;
}

export interface AuctionEntryView {
  seat: Seat;
  bid: BidView | null;
}

export interface ContractView {
  level: number;
  mode: ContractMode;
  modeLabel: string;
  trump: Suit | null;
  trumpLabel: string;
  bidder: Seat;
  bidderLabel: string;
}

/** A card face-up on the table. Public to every seat by the rules of the game. */
export interface PublicTrickCard {
  seat: Seat;
  seatLabel: string;
  cardId: string;
  label: string;
  glyph: string;
  rankText: string;
  red: boolean;
}

/** A gathered book: who led, who took it. Its cards are not re-projected. */
export interface CompletedTrickView {
  number: number;
  lead: Seat;
  winner: Seat;
}

export interface SeatOccupancyView {
  seat: Seat;
  seatLabel: string;
  occupant: Occupant;
  displayName: string;
  connected: boolean;
  cardCount: number;
}

/** A card in the local player's own hand. Exists only in `PlayerProjection`. */
export interface PlayerCardView {
  cardId: string;
  label: string;
  glyph: string;
  rankText: string;
  red: boolean;
  legal: boolean;
  selectedForDiscard: boolean;
  previewed: boolean;
}

export interface DisabledNoticeView {
  id: string;
  label: string;
  explanation: string;
}

export const BID_VIEW = s.object<BidView>({
  level: s.int({ min: MIN_BID_LEVEL, max: MAX_BID_LEVEL }),
  mode: s.enumOf(CONTRACT_MODES),
});

export const AUCTION_ENTRY_VIEW = s.object<AuctionEntryView>({
  seat: s.enumOf(SEATS),
  bid: s.nullable(BID_VIEW),
});

export const CONTRACT_VIEW = s.object<ContractView>({
  level: s.int({ min: MIN_BID_LEVEL, max: MAX_BID_LEVEL }),
  mode: s.enumOf(CONTRACT_MODES),
  modeLabel: s.string({ maxLength: LIMITS.label }),
  trump: s.nullable(s.enumOf(SUITS)),
  trumpLabel: s.string({ maxLength: LIMITS.label }),
  bidder: s.enumOf(SEATS),
  bidderLabel: s.string({ maxLength: LIMITS.label }),
});

export const PUBLIC_TRICK_CARD = s.object<PublicTrickCard>({
  seat: s.enumOf(SEATS),
  seatLabel: s.string({ maxLength: LIMITS.label }),
  cardId: s.string({ maxLength: LIMITS.id }),
  label: s.string({ maxLength: LIMITS.label }),
  glyph: s.string({ maxLength: LIMITS.glyph }),
  rankText: s.string({ maxLength: LIMITS.rankText }),
  red: s.boolean(),
});

export const COMPLETED_TRICK_VIEW = s.object<CompletedTrickView>({
  number: s.int({ min: 1, max: TRICKS_PER_HAND }),
  lead: s.enumOf(SEATS),
  winner: s.enumOf(SEATS),
});

export const SEAT_OCCUPANCY_VIEW = s.object<SeatOccupancyView>({
  seat: s.enumOf(SEATS),
  seatLabel: s.string({ maxLength: LIMITS.label }),
  occupant: s.enumOf(OCCUPANTS),
  displayName: s.string({ maxLength: LIMITS.displayName }),
  connected: s.boolean(),
  cardCount: s.int({ min: 0, max: LIMITS.maxHandLength }),
});

export const PLAYER_CARD_VIEW = s.object<PlayerCardView>({
  cardId: s.string({ maxLength: LIMITS.id }),
  label: s.string({ maxLength: LIMITS.label }),
  glyph: s.string({ maxLength: LIMITS.glyph }),
  rankText: s.string({ maxLength: LIMITS.rankText }),
  red: s.boolean(),
  legal: s.boolean(),
  selectedForDiscard: s.boolean(),
  previewed: s.boolean(),
});

export const DISABLED_NOTICE_VIEW = s.object<DisabledNoticeView>({
  id: s.string({ maxLength: LIMITS.id }),
  label: s.string({ maxLength: LIMITS.label }),
  explanation: s.string({ maxLength: LIMITS.line }),
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
