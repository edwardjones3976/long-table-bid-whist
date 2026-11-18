/**
 * Authoritative Spades rules. Pure: the caller supplies each shuffled deck,
 * every seat is a player (bots and timers live outside), and `apply` returns a
 * new state or throws without touching its input.
 */
import { standardDeck, type Card, type Suit } from "../../shared/cards";

import { RuleError, type Seat } from "./game";

export { RuleError } from "./game";
/** Seats run clockwise; partners sit opposite, so team = seat % 2. */
export type { Seat } from "./game";
export type Team = 0 | 1;
export type Phase = "bidding" | "play" | "hand-over" | "game-over";

export interface Options {
  /** "jokers": both jokers and the 2 of diamonds are the top spades, above the 2 of spades. */
  preset: "standard" | "jokers";
  target: 100 | 250 | 500;
  /** A bid of 0 is a nil bid. Off: 0 is illegal. */
  nil: boolean;
  /** Every tenth bag costs 100 points. */
  bagPenalty: boolean;
}

export const DEFAULT_OPTIONS: Options = {
  preset: "standard",
  target: 500,
  nil: true,
  bagPenalty: true,
};

export interface Play {
  seat: Seat;
  card: Card;
}

/** One team's hand, by partner: index 0 is seat `team`, index 1 is seat `team + 2`. */
export interface TeamResult {
  bids: [number, number];
  tricks: [number, number];
  nils: ["made" | "failed" | null, "made" | "failed" | null];
  /** The sum of the non-nil bids. */
  contract: number;
  /** Null when both partners bid nil, so there was no contract. */
  made: boolean | null;
  bagsAdded: number;
  penalty: number;
  delta: number;
}

export interface State {
  options: Options;
  handNumber: number;
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  hands: Card[][];
  /** Per seat; 0 is nil, null has not bid yet. */
  bids: (number | null)[];
  trick: Play[];
  lastTrick: { winner: Seat; plays: Play[] } | null;
  /** Tricks won per seat, because nil is scored per player. */
  tricks: number[];
  tricksPlayed: number;
  spadesBroken: boolean;
  scores: [number, number];
  bags: [number, number];
  result: [TeamResult, TeamResult] | null;
  winner: Team | null;
}

export type Action = { type: "bid"; tricks: number } | { type: "play"; cardId: string };

const ACTION_PHASE: Record<Action["type"], Phase> = { bid: "bidding", play: "play" };
/** Jokers preset: the spades that outrank the ace, weakest first. */
const PROMOTED = ["spades-2", "diamonds-2", "joker-little", "joker-big"];

const next = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;
const teamOf = (seat: Seat): Team => (seat % 2) as Team;

export function deck(options: Options): Card[] {
  return options.preset === "jokers"
    ? standardDeck(true).filter((card) => card.id !== "clubs-2" && card.id !== "hearts-2")
    : standardDeck();
}

/** Jokers exist only in the jokers preset, where they and the 2 of diamonds are spades. */
export function suitOf(card: Card, options: Options): Suit {
  return card.suit === "joker" || (options.preset === "jokers" && card.id === "diamonds-2") ? "spades" : card.suit;
}

function deal(state: State, cards: readonly Card[]): void {
  // Suit and rank drive following suit and trick strength, so a right id on a wrong card is a wrong deck.
  const faces = (list: readonly Card[]) => new Set(list.map((card) => `${card?.id}|${card?.suit}|${card?.rank}`));
  const want = faces(deck(state.options));
  const got = faces(cards);
  if (cards.length !== 52 || got.size !== 52 || ![...got].every((face) => want.has(face))) {
    throw new Error("Deck must be the 52 cards for this preset");
  }
  state.hands = [[], [], [], []];
  for (let i = 0; i < 52; i += 1) state.hands[(state.dealer + 1 + i) % 4].push({ ...cards[i] });
  state.bids = [null, null, null, null];
  state.trick = [];
  state.lastTrick = null;
  state.tricks = [0, 0, 0, 0];
  state.tricksPlayed = 0;
  state.spadesBroken = false;
  state.result = null;
  state.phase = "bidding";
  state.turn = next(state.dealer);
}

/** Validates house rules from an untrusted source and drops unknown keys. */
export function checkOptions(options: Options): Options {
  const { preset, target, nil, bagPenalty } = options ?? ({} as Options);
  if (
    (preset !== "standard" && preset !== "jokers") ||
    (target !== 100 && target !== 250 && target !== 500) ||
    typeof nil !== "boolean" ||
    typeof bagPenalty !== "boolean"
  ) {
    throw new RuleError("Invalid house rules");
  }
  return { preset, target, nil, bagPenalty };
}

export function newMatch(cards: readonly Card[], options: Options = DEFAULT_OPTIONS, dealer: Seat = 0): State {
  const state: State = {
    options: checkOptions(options),
    handNumber: 1,
    phase: "bidding",
    dealer,
    turn: next(dealer),
    hands: [],
    bids: [],
    trick: [],
    lastTrick: null,
    tricks: [],
    tricksPlayed: 0,
    spadesBroken: false,
    scores: [0, 0],
    bags: [0, 0],
    result: null,
    winner: null,
  };
  deal(state, cards);
  return state;
}

export function nextHand(input: State, cards: readonly Card[]): State {
  if (input.phase !== "hand-over") throw new RuleError("The hand is not over");
  const state = structuredClone(input);
  state.dealer = next(state.dealer);
  state.handNumber += 1;
  deal(state, cards);
  return state;
}

export function legalBids(state: State): number[] {
  if (state.phase !== "bidding") return [];
  const bids: number[] = [];
  for (let tricks = state.options.nil ? 0 : 1; tricks <= 13; tricks += 1) bids.push(tricks);
  return bids;
}

export function legalCards(state: State, seat: Seat): Card[] {
  if (state.phase !== "play") return [];
  const hand = state.hands[seat];
  const led = state.trick.length ? suitOf(state.trick[0].card, state.options) : null;
  // Leading: spades are barred until broken. Either way, a hand with no allowed card may play anything.
  const allowed = hand.filter((card) => {
    const suit = suitOf(card, state.options);
    return led ? suit === led : state.spadesBroken || suit !== "spades";
  });
  return allowed.length ? allowed : [...hand];
}

function strength(card: Card, options: Options, led: Suit): number {
  const suit = suitOf(card, options);
  if (suit !== led && suit !== "spades") return -1;
  if (suit !== "spades") return card.rank;
  const promoted = options.preset === "jokers" ? PROMOTED.indexOf(card.id) : -1;
  return 100 + (promoted < 0 ? card.rank : 15 + promoted);
}

export function trickWinner(plays: readonly Play[], options: Options): Seat {
  const led = suitOf(plays[0].card, options);
  return plays.reduce((best, play) =>
    strength(play.card, options, led) > strength(best.card, options, led) ? play : best,
  ).seat;
}

function bid(state: State, seat: Seat, tricks: number): void {
  if (!legalBids(state).includes(tricks)) throw new RuleError("That bid is not allowed");
  state.bids[seat] = tricks;
  // Bidding starts left of the dealer, so the dealer bids last and the same seat then leads.
  if (seat === state.dealer) state.phase = "play";
  state.turn = next(seat);
}

function score(state: State): void {
  const { target, bagPenalty } = state.options;
  state.result = ([0, 1] as const).map((team): TeamResult => {
    const bids = [state.bids[team]!, state.bids[team + 2]!] as [number, number];
    const tricks = [state.tricks[team], state.tricks[team + 2]] as [number, number];
    const nils = bids.map((b, i) => (b !== 0 ? null : tricks[i] === 0 ? "made" : "failed")) as TeamResult["nils"];
    const contract = bids[0] + bids[1];
    // A failed nil bidder's tricks do not help the contract; they are bags.
    const taken = tricks.reduce((sum, n, i) => sum + (bids[i] === 0 ? 0 : n), 0);
    const made = contract === 0 ? null : taken >= contract;
    const bagsAdded = tricks[0] + tricks[1] - (made ? contract : taken);
    let delta = (made === null ? 0 : made ? 10 : -10) * contract + bagsAdded;
    for (const nil of nils) delta += nil === "made" ? 100 : nil === "failed" ? -100 : 0;
    state.bags[team] += bagsAdded;
    let penalty = 0;
    while (bagPenalty && state.bags[team] >= 10) {
      state.bags[team] -= 10;
      penalty += 100;
    }
    delta -= penalty;
    state.scores[team] += delta;
    return { bids, tricks, nils, contract, made, bagsAdded, penalty, delta };
  }) as [TeamResult, TeamResult];
  const [us, them] = state.scores;
  // A tie at or past the target plays another hand.
  if (Math.max(us, them) >= target && us !== them) state.winner = us > them ? 0 : 1;
  state.phase = state.winner === null ? "hand-over" : "game-over";
}

function play(state: State, seat: Seat, cardId: string): void {
  const card = state.hands[seat].find((held) => held.id === cardId);
  if (!card) throw new RuleError("That card is not in your hand");
  if (!legalCards(state, seat).includes(card)) {
    throw new RuleError(state.trick.length ? "You must follow suit" : "Spades are not broken");
  }
  state.hands[seat] = state.hands[seat].filter((held) => held !== card);
  state.trick.push({ seat, card });
  // A legal spade lead means the leader held nothing else, which breaks spades too.
  if (suitOf(card, state.options) === "spades") state.spadesBroken = true;
  if (state.trick.length < 4) {
    state.turn = next(seat);
    return;
  }
  const winner = trickWinner(state.trick, state.options);
  state.tricks[winner] += 1;
  state.tricksPlayed += 1;
  state.lastTrick = { winner, plays: state.trick };
  state.trick = [];
  state.turn = winner;
  if (state.tricksPlayed === 13) score(state);
}

export function apply(input: State, seat: Seat, action: Action): State {
  // Strict equality: a keyed lookup would coerce ["play"] to "play".
  if (action?.type !== "bid" && action?.type !== "play") throw new RuleError("Unknown action");
  if (Object.keys(action).length !== 2) throw new RuleError("Malformed action");
  if (input.phase !== ACTION_PHASE[action.type]) throw new RuleError("That action is not open now");
  if (seat !== input.turn) throw new RuleError("It is not your turn");
  const state = structuredClone(input);
  if (action.type === "bid") bid(state, seat, action.tricks);
  else play(state, seat, action.cardId);
  return state;
}

/**
 * What one recipient may see. `seat` null is the non-playing host: public state
 * only. Card faces appear only in the viewer's own hand and in played tricks.
 */
export function viewFor(state: State, seat: Seat | null) {
  const open = state.phase === "bidding" || state.phase === "play";
  return structuredClone({
    options: state.options,
    handNumber: state.handNumber,
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    bids: state.bids,
    trick: state.trick,
    lastTrick: state.lastTrick,
    tricks: state.tricks,
    spadesBroken: state.spadesBroken,
    scores: state.scores,
    bags: state.bags,
    result: state.result,
    winner: state.winner,
    handCounts: state.hands.map((hand) => hand.length),
    hand: seat === null ? null : state.hands[seat],
    // Derived from the viewer's own hand and public state only.
    legal:
      seat === null || seat !== state.turn || !open
        ? null
        : { bids: legalBids(state), cardIds: legalCards(state, seat).map((card) => card.id) },
  });
}

export type View = ReturnType<typeof viewFor>;
