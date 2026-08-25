// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | BEGIN]]
export const MANIFEST_ID = "STRICT_TABLE_V1" as const;

export type Seat = "south" | "west" | "north" | "east";
export type Team = "north-south" | "east-west";
export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type ContractMode = "high" | "low" | "no-trump-high" | "no-trump-low";
export type Phase = "auction" | "declaration" | "kitty" | "play" | "summary";

export interface Card {
  id: string;
  suit: Suit | "joker";
  rank: number;
  label: string;
  glyph: string;
  joker?: "big" | "little";
}

export interface Bid {
  level: 3 | 4 | 5 | 6 | 7;
  mode: ContractMode;
}

export interface Contract extends Bid {
  bidder: Seat;
  trump: Suit | null;
}

export interface AuctionEntry {
  seat: Seat;
  bid: Bid | null;
}

export interface PlayedCard {
  seat: Seat;
  card: Card;
}

export interface CompletedTrick {
  number: number;
  lead: Seat;
  winner: Seat;
  cards: PlayedCard[];
}

export interface GameEvent {
  id: number;
  text: string;
}

export interface GameState {
  manifestId: typeof MANIFEST_ID;
  seed: string;
  handNumber: number;
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  hands: Record<Seat, Card[]>;
  kitty: Card[];
  discardPile: Card[];
  auction: AuctionEntry[];
  contract: Contract | null;
  currentTrick: PlayedCard[];
  completedTricks: CompletedTrick[];
  tricksWon: Record<Seat, number>;
  scores: Record<Team, number>;
  events: GameEvent[];
  status: string;
  summary: string | null;
  paused: boolean;
}

export type HumanAction =
  | { type: "pass" }
  | { type: "bid"; bid: Bid }
  | { type: "declare"; trump: Suit | null }
  | { type: "discard"; cardIds: string[] }
  | { type: "play"; cardId: string }
  | { type: "next-hand" };

export interface PlayerView {
  seat: Seat;
  phase: Phase;
  turn: Seat;
  hand: Card[];
  dealer: Seat;
  auction: AuctionEntry[];
  contract: Contract | null;
  currentTrick: PlayedCard[];
  completedTricks: CompletedTrick[];
  tricksWon: Record<Seat, number>;
  scores: Record<Team, number>;
  seed: string;
}

export interface ActionResult {
  state: GameState;
  error?: string;
}

export const SEATS: Seat[] = ["south", "west", "north", "east"];
export const SUITS: Suit[] = ["clubs", "diamonds", "hearts", "spades"];

export function teamFor(seat: Seat): Team {
  return seat === "south" || seat === "north" ? "north-south" : "east-west";
}

export function nextSeat(seat: Seat): Seat {
  return SEATS[(SEATS.indexOf(seat) + 1) % SEATS.length];
}
// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | END]]
