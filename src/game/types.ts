export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const SEATS = [0, 1, 2, 3] as const;
export type Seat = (typeof SEATS)[number];
export type Team = 0 | 1;

export type Rank =
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14;

export interface SuitedCard {
  readonly id: string;
  readonly kind: "suited";
  readonly suit: Suit;
  readonly rank: Rank;
}

export interface JokerCard {
  readonly id: "J-BIG" | "J-LITTLE";
  readonly kind: "joker";
  readonly joker: "big" | "little";
}

export type Card = SuitedCard | JokerCard;
export type Hands = [Card[], Card[], Card[], Card[]];

export type BidLevel = 3 | 4 | 5 | 6 | 7;
export type BidMode = "high" | "low" | "no-trump";
export type Direction = "high" | "low";

export interface PassBid {
  readonly kind: "pass";
}

export interface ContractBid {
  readonly kind: "contract";
  readonly level: BidLevel;
  readonly mode: BidMode;
}

export type Bid = PassBid | ContractBid;

export interface BidRecord {
  readonly seat: Seat;
  readonly bid: Bid;
  readonly forced: boolean;
}

export interface ContractDeclaration {
  /** High/low rank direction. No-trump bidders choose this after the auction. */
  readonly direction: Direction;
  /** Null for no-trump; otherwise the suit named by the successful bidder. */
  readonly trump: Suit | null;
}

export interface PlayedCard {
  readonly seat: Seat;
  readonly card: Card;
}

export interface TrickRecord {
  readonly index: number;
  readonly leader: Seat;
  readonly plays: readonly PlayedCard[];
  readonly ledSuit: Suit | null;
  readonly winner: Seat;
}

export interface TableRules {
  readonly id: string;
  readonly name: string;
  readonly deckSize: 54;
  readonly handSize: 12;
  readonly kittySize: 6;
  readonly minimumBid: 3;
  readonly maximumBid: 7;
  readonly forcedDealerBid: true;
  readonly kittyCountsAsBidderBook: true;
  readonly noTrumpScoresDouble: true;
  readonly downtownAceRanksFirst: true;
  readonly targetScore: 7;
  readonly losingScore: -7;
  readonly source: string;
}

export type HandPhase =
  | "bidding"
  | "declaring"
  | "discarding"
  | "playing"
  | "complete";

export interface HandSummary {
  readonly bidder: Seat;
  readonly biddingTeam: Team;
  readonly bid: ContractBid;
  readonly declaration: ContractDeclaration;
  /** Played tricks only. The kitty book is represented separately. */
  readonly tricks: readonly [number, number];
  /** Thirteen total books: twelve played tricks plus the bidder's kitty book. */
  readonly books: readonly [number, number];
  readonly targetBooks: number;
  readonly made: boolean;
  readonly rawPoints: number;
  readonly multiplier: 1 | 2;
  readonly scoreDelta: readonly [number, number];
  readonly scoreBefore: readonly [number, number];
  readonly scoreAfter: readonly [number, number];
  readonly gameWinner: Team | null;
}

export interface HandState {
  readonly rules: TableRules;
  readonly seed: string;
  readonly phase: HandPhase;
  readonly dealer: Seat;
  readonly turn: Seat;
  /** Authoritative state. Consumers must use projectForSeat for player views. */
  readonly hands: Hands;
  readonly kitty: readonly Card[];
  readonly buried: readonly Card[];
  readonly bids: readonly BidRecord[];
  readonly highBid: ContractBid | null;
  readonly bidder: Seat | null;
  readonly declaration: ContractDeclaration | null;
  readonly currentTrick: readonly PlayedCard[];
  readonly completedTricks: readonly TrickRecord[];
  readonly trickBooks: readonly [number, number];
  readonly scoresBefore: readonly [number, number];
  readonly summary: HandSummary | null;
  readonly lastError: string | null;
}

export interface PublicHandState {
  readonly rules: TableRules;
  readonly phase: HandPhase;
  readonly dealer: Seat;
  readonly turn: Seat;
  readonly handCounts: readonly [number, number, number, number];
  readonly bids: readonly BidRecord[];
  readonly highBid: ContractBid | null;
  readonly bidder: Seat | null;
  readonly declaration: ContractDeclaration | null;
  readonly currentTrick: readonly PlayedCard[];
  readonly completedTricks: readonly TrickRecord[];
  readonly trickBooks: readonly [number, number];
  readonly scoresBefore: readonly [number, number];
  readonly summary: HandSummary | null;
}

/** The complete and only information passed into heuristic AI functions. */
export interface AiView {
  readonly seat: Seat;
  readonly hand: readonly Card[];
  readonly publicState: PublicHandState;
}

export type GameAction =
  | { readonly type: "BID"; readonly seat: Seat; readonly bid: Bid }
  | {
      readonly type: "DECLARE";
      readonly seat: Seat;
      readonly declaration: ContractDeclaration;
    }
  | {
      readonly type: "DISCARD";
      readonly seat: Seat;
      readonly cardIds: readonly string[];
    }
  | { readonly type: "PLAY"; readonly seat: Seat; readonly cardId: string }
  | { readonly type: "CLEAR_ERROR" };

export interface CreateHandOptions {
  readonly seed: string | number;
  readonly dealer?: Seat;
  readonly scores?: readonly [number, number];
}

export interface AutoplayOptions {
  /** Seats omitted here stop automatic play when their turn arrives. */
  readonly aiSeats?: readonly Seat[];
  /** Guards callers from an accidental infinite transition loop. */
  readonly maxActions?: number;
}

export interface AutoplayResult {
  readonly state: HandState;
  readonly actions: readonly GameAction[];
}

export const PASS: PassBid = Object.freeze({ kind: "pass" });
