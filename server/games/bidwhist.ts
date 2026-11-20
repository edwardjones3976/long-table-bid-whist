/**
 * Authoritative Bid Whist rules. Pure: the caller supplies each shuffled deck,
 * every seat is a player (bots and timers live outside), and `apply` returns a
 * new state or throws without touching its input.
 */
import { SUITS, standardDeck, type Card, type Suit } from "../../shared/cards";

import { RuleError, type Seat } from "./game";

export { RuleError } from "./game";
/** Seats run clockwise; partners sit opposite, so team = seat % 2. */
export type { Seat } from "./game";
export type Team = 0 | 1;
export type Direction = "high" | "low";
export type BidKind = Direction | "no-trump";
export type Phase = "auction" | "declare" | "kitty" | "play" | "hand-over" | "game-over";

export interface Bid {
  level: number;
  kind: BidKind;
}

export interface Options {
  minBid: 3 | 4;
  /** At the same level, a low bid outranks a high bid. Off: they are equal. */
  lowOverHigh: boolean;
  /** A made contract scores every book above six, not just the bid. */
  overtricks: boolean;
  noTrumpDouble: boolean;
}

export const DEFAULT_OPTIONS: Options = {
  minBid: 3,
  lowOverHigh: false,
  overtricks: true,
  noTrumpDouble: true,
};

export interface Contract {
  seat: Seat;
  level: number;
  noTrump: boolean;
  /** Set by the bid for a suit contract, by the declaration for no-trump. */
  direction: Direction | null;
  trump: Suit | null;
}

export interface Play {
  seat: Seat;
  card: Card;
}

export interface HandResult {
  team: Team;
  level: number;
  /** Tricks won by the declaring team plus one for the kitty. */
  books: number;
  made: boolean;
  delta: number;
}

export interface State {
  options: Options;
  handNumber: number;
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  hands: Card[][];
  kitty: Card[];
  discards: Card[];
  auction: { seat: Seat; bid: Bid | null }[];
  contract: Contract | null;
  trick: Play[];
  lastTrick: { winner: Seat; plays: Play[] } | null;
  tricksWon: [number, number];
  tricksPlayed: number;
  scores: [number, number];
  result: HandResult | null;
  winner: Team | null;
}

export type Action =
  | { type: "bid"; bid: Bid | null }
  | { type: "declare"; trump?: Suit; direction?: Direction }
  | { type: "discard"; cardIds: string[] }
  | { type: "play"; cardId: string };

const KINDS: readonly BidKind[] = ["high", "low", "no-trump"];
const ACTION_PHASE: Record<Action["type"], Phase> = {
  bid: "auction",
  declare: "declare",
  discard: "kitty",
  play: "play",
};

const next = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;
const teamOf = (seat: Seat): Team => (seat % 2) as Team;

function deal(state: State, deck: readonly Card[]): void {
  const given = new Map(deck.map((card) => [card?.id, card]));
  const matches = (card: Card) => given.get(card.id)?.suit === card.suit && given.get(card.id)?.rank === card.rank;
  if (deck.length !== 54 || given.size !== 54 || !standardDeck(true).every(matches)) {
    throw new Error("Deck must be the 54 standard cards");
  }
  state.hands = [[], [], [], []];
  for (let i = 0; i < 48; i += 1) state.hands[(state.dealer + 1 + i) % 4].push({ ...deck[i] });
  state.kitty = deck.slice(48).map((card) => ({ ...card }));
  state.discards = [];
  state.auction = [];
  state.contract = null;
  state.trick = [];
  state.lastTrick = null;
  state.tricksWon = [0, 0];
  state.tricksPlayed = 0;
  state.result = null;
  state.phase = "auction";
  state.turn = next(state.dealer);
}

/** Validates house rules from an untrusted source and drops unknown keys. */
export function checkOptions(options: Options): Options {
  const { minBid, lowOverHigh, overtricks, noTrumpDouble } = options ?? ({} as Options);
  if (
    (minBid !== 3 && minBid !== 4) ||
    [lowOverHigh, overtricks, noTrumpDouble].some((flag) => typeof flag !== "boolean")
  ) {
    throw new RuleError("Invalid house rules");
  }
  return { minBid, lowOverHigh, overtricks, noTrumpDouble };
}

export function newMatch(deck: readonly Card[], options: Options = DEFAULT_OPTIONS, dealer: Seat = 0): State {
  const state: State = {
    options: checkOptions(options),
    handNumber: 1,
    phase: "auction",
    dealer,
    turn: next(dealer),
    hands: [],
    kitty: [],
    discards: [],
    auction: [],
    contract: null,
    trick: [],
    lastTrick: null,
    tricksWon: [0, 0],
    tricksPlayed: 0,
    scores: [0, 0],
    result: null,
    winner: null,
  };
  deal(state, deck);
  return state;
}

export function nextHand(input: State, deck: readonly Card[]): State {
  if (input.phase !== "hand-over") throw new RuleError("The hand is not over");
  const state = structuredClone(input);
  state.dealer = next(state.dealer);
  state.handNumber += 1;
  deal(state, deck);
  return state;
}

function bidRank(bid: Bid, options: Options): number {
  const tier = bid.kind === "no-trump" ? 2 : options.lowOverHigh && bid.kind === "low" ? 1 : 0;
  return bid.level * 3 + tier;
}

export function legalBids(state: State): Bid[] {
  if (state.phase !== "auction") return [];
  const best = Math.max(-1, ...state.auction.map((entry) => (entry.bid ? bidRank(entry.bid, state.options) : -1)));
  const bids: Bid[] = [];
  for (let level = state.options.minBid; level <= 7; level += 1) {
    for (const kind of KINDS) {
      if (bidRank({ level, kind }, state.options) > best) bids.push({ level, kind });
    }
  }
  return bids;
}

/** The dealer may not pass when the other three have. */
export function mustBid(state: State): boolean {
  return state.phase === "auction" && state.auction.length === 3 && state.auction.every((entry) => !entry.bid);
}

function suitOf(card: Card, contract: Contract): Suit | "joker" {
  return card.suit === "joker" ? (contract.trump ?? "joker") : card.suit;
}

/** In no-trump a joker has no suit, so the first non-joker sets the led suit. */
function ledSuit(trick: readonly Play[], contract: Contract): Suit | null {
  for (const play of trick) {
    const suit = suitOf(play.card, contract);
    if (suit !== "joker") return suit;
  }
  return null;
}

export function legalCards(state: State, seat: Seat): Card[] {
  if (state.phase !== "play" || !state.contract) return [];
  const contract = state.contract;
  const hand = state.hands[seat];
  const led = ledSuit(state.trick, contract);
  const following = led ? hand.filter((card) => suitOf(card, contract) === led) : [];
  return following.length ? following : [...hand];
}

function strength(card: Card, contract: Contract, led: Suit | null): number {
  const suit = suitOf(card, contract);
  if (suit === "joker" || (suit !== led && suit !== contract.trump)) return -1;
  // Low: ace is best, then 2 up through king as the weakest.
  const low = contract.direction === "low" && card.suit !== "joker";
  const rank = low ? (card.rank === 14 ? 14 : 15 - card.rank) : card.rank;
  return (suit === contract.trump ? 100 : 0) + rank;
}

export function trickWinner(plays: readonly Play[], contract: Contract): Seat {
  const led = ledSuit(plays, contract);
  return plays.reduce((best, play) =>
    strength(play.card, contract, led) > strength(best.card, contract, led) ? play : best,
  ).seat;
}

function bid(state: State, seat: Seat, wanted: Bid | null): void {
  if (wanted === null) {
    if (mustBid(state)) throw new RuleError("The dealer must bid");
    state.auction.push({ seat, bid: null });
  } else {
    const legal = legalBids(state).find((b) => b.level === wanted?.level && b.kind === wanted?.kind);
    if (!legal) throw new RuleError("That bid is not allowed");
    state.auction.push({ seat, bid: legal });
  }
  if (state.auction.length < 4) {
    state.turn = next(seat);
    return;
  }
  // Each bid had to outrank the last, so the final bid made is the winner.
  const won = state.auction.filter((entry) => entry.bid).at(-1)!;
  const kind = won.bid!.kind;
  state.contract = {
    seat: won.seat,
    level: won.bid!.level,
    noTrump: kind === "no-trump",
    direction: kind === "no-trump" ? null : kind,
    trump: null,
  };
  state.phase = "declare";
  state.turn = won.seat;
}

function declare(state: State, action: { trump?: Suit; direction?: Direction }): void {
  const contract = state.contract!;
  if (contract.noTrump) {
    if (action.direction !== "high" && action.direction !== "low") throw new RuleError("Name high or low");
    contract.direction = action.direction;
  } else {
    if (!SUITS.includes(action.trump as Suit)) throw new RuleError("Name a trump suit");
    contract.trump = action.trump as Suit;
  }
  state.hands[contract.seat].push(...state.kitty);
  state.kitty = [];
  state.phase = "kitty";
}

function discard(state: State, seat: Seat, cardIds: string[]): void {
  if (!Array.isArray(cardIds) || cardIds.length !== 6 || new Set(cardIds).size !== 6) {
    throw new RuleError("Discard exactly six different cards");
  }
  const hand = state.hands[seat];
  if (!cardIds.every((id) => hand.some((card) => card.id === id))) {
    throw new RuleError("Discards must come from your hand");
  }
  state.discards = hand.filter((card) => cardIds.includes(card.id));
  state.hands[seat] = hand.filter((card) => !cardIds.includes(card.id));
  state.phase = "play";
}

function score(state: State): void {
  const contract = state.contract!;
  const { overtricks, noTrumpDouble } = state.options;
  const team = teamOf(contract.seat);
  const books = state.tricksWon[team] + 1;
  const made = books >= 6 + contract.level;
  const factor = contract.noTrump && noTrumpDouble ? 2 : 1;
  const delta = (made ? (overtricks ? books - 6 : contract.level) : -contract.level) * factor;
  state.scores[team] += delta;
  state.result = { team, level: contract.level, books, made, delta };
  // Only the declaring team's score moves, so at most one of these is true.
  if (state.scores[team] >= 7) state.winner = team;
  else if (state.scores[team] <= -7) state.winner = (1 - team) as Team;
  state.phase = state.winner === null ? "hand-over" : "game-over";
}

function play(state: State, seat: Seat, cardId: string): void {
  const card = state.hands[seat].find((held) => held.id === cardId);
  if (!card) throw new RuleError("That card is not in your hand");
  if (!legalCards(state, seat).includes(card)) throw new RuleError("You must follow suit");
  state.hands[seat] = state.hands[seat].filter((held) => held !== card);
  state.trick.push({ seat, card });
  if (state.trick.length < 4) {
    state.turn = next(seat);
    return;
  }
  const winner = trickWinner(state.trick, state.contract!);
  state.tricksWon[teamOf(winner)] += 1;
  state.tricksPlayed += 1;
  state.lastTrick = { winner, plays: state.trick };
  state.trick = [];
  state.turn = winner;
  if (state.tricksPlayed === 12) score(state);
}

export function apply(input: State, seat: Seat, action: Action): State {
  // A non-string type such as ["play"] would otherwise coerce to a valid key.
  const type = action?.type;
  if (typeof type !== "string" || !Object.hasOwn(ACTION_PHASE, type)) throw new RuleError("Unknown action");
  const phase = ACTION_PHASE[type];
  if (input.phase !== phase) throw new RuleError("That action is not open now");
  if (seat !== input.turn) throw new RuleError("It is not your turn");
  const state = structuredClone(input);
  if (action.type === "bid") bid(state, seat, action.bid);
  else if (action.type === "declare") declare(state, action);
  else if (action.type === "discard") discard(state, seat, action.cardIds);
  else play(state, seat, action.cardId);
  return state;
}

/**
 * What one recipient may see. `seat` null is the non-playing host: public state
 * only. The kitty and discards never leave the server; the declarer sees the
 * kitty only as cards in their own hand.
 */
export function viewFor(state: State, seat: Seat | null) {
  return structuredClone({
    options: state.options,
    handNumber: state.handNumber,
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    auction: state.auction,
    contract: state.contract,
    trick: state.trick,
    lastTrick: state.lastTrick,
    tricksWon: state.tricksWon,
    scores: state.scores,
    result: state.result,
    winner: state.winner,
    handCounts: state.hands.map((hand) => hand.length),
    kittyCount: state.kitty.length,
    hand: seat === null ? null : state.hands[seat],
    // Derived from the viewer's own hand and public state only.
    legal:
      seat === null || seat !== state.turn
        ? null
        : {
            bids: legalBids(state),
            mustBid: mustBid(state),
            cardIds: legalCards(state, seat).map((card) => card.id),
          },
  });
}

export type View = ReturnType<typeof viewFor>;
