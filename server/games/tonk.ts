/**
 * Authoritative Tonk rules: four players, each for themselves. Pure: the caller
 * supplies each shuffled deck, and `apply` returns a new state or throws
 * without touching its input. The top of the stock and of the discard pile is
 * the last card of its array.
 */
import { standardDeck, type Card } from "../../shared/cards";

import { RuleError, type Seat } from "./game";

export { RuleError } from "./game";
export type { Seat } from "./game";
/** "draw": may drop or draw. "meld": may meld, extend, or end the turn by discarding. */
export type Phase = "draw" | "meld" | "hand-over" | "game-over";
export type Reason =
  | "initial-fifty"
  | "void-deal"
  | "drop-won"
  | "drop-failed"
  | "out-by-melds"
  | "out-by-discard"
  | "stock-empty";

export interface Options {
  /** A player may drop before drawing. */
  knocking: boolean;
  /** A dealt 49 or 50 wins the hand. */
  initialFifty: boolean;
  target: 5 | 10;
}

export const DEFAULT_OPTIONS: Options = {
  knocking: true,
  initialFifty: true,
  target: 5,
};

export interface Meld {
  seat: Seat;
  kind: "set" | "run";
  /** Runs are kept low to high. */
  cards: Card[];
}

export interface HandResult {
  reason: Reason;
  /** Who dropped, went out or held the fifty; null for a void deal or an empty stock. */
  seat: Seat | null;
  totals: number[];
  points: number[];
  /** The qualifying hands of an initial fifty or void deal; no other hand is ever shown. */
  revealed: { seat: Seat; cards: Card[] }[];
}

export interface State {
  options: Options;
  handNumber: number;
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  hands: Card[][];
  stock: Card[];
  discards: Card[];
  melds: Meld[];
  /** The card taken from the discard pile this turn; it may not be discarded again this turn. */
  tookDiscard: string | null;
  scores: number[];
  result: HandResult | null;
  winners: Seat[];
}

export type Action =
  | { type: "drop" }
  | { type: "draw"; from: "stock" | "discard" }
  | { type: "meld"; cardIds: string[] }
  | { type: "extend"; meldIndex: number; cardId: string }
  | { type: "discard"; cardId: string };

/** The phase each action belongs to and exactly how many keys it carries. */
const ACTIONS = new Map<unknown, [Phase, number]>([
  ["drop", ["draw", 1]],
  ["draw", ["draw", 2]],
  ["meld", ["meld", 2]],
  ["extend", ["meld", 3]],
  ["discard", ["meld", 2]],
]);
const SEATS: readonly Seat[] = [0, 1, 2, 3];

const next = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;
/** Ace is low: it sits below the 2 in a run and counts one point. */
const order = (card: Card): number => (card.rank === 14 ? 1 : card.rank);
const byOrder = (a: Card, b: Card): number => order(a) - order(b);
const award = (seats: readonly Seat[], points: number): number[] => SEATS.map((seat) => (seats.includes(seat) ? points : 0));

export const points = (card: Card): number => Math.min(order(card), 10);
export const total = (hand: readonly Card[]): number => hand.reduce((sum, card) => sum + points(card), 0);

/** Expects different cards of one deck, so a set can never exceed four. */
export function meldKind(cards: readonly Card[]): Meld["kind"] | null {
  if (cards.length < 3) return null;
  if (cards.every((card) => card.rank === cards[0].rank)) return "set";
  const orders = cards.map(order).sort((a, b) => a - b);
  const run = cards.every((card) => card.suit === cards[0].suit) && orders.every((o, i) => o === orders[0] + i);
  return run ? "run" : null;
}

const fits = (meld: Meld, card: Card): boolean => meldKind([...meld.cards, card]) === meld.kind;

/** Every meld the hand could lay. shortcut: tries all subsets, fine while a hand is at most six cards. */
export function meldsIn(hand: readonly Card[]): Card[][] {
  const melds: Card[][] = [];
  for (let mask = 7; mask < 1 << hand.length; mask += 1) {
    const cards = hand.filter((_, i) => mask & (1 << i));
    if (meldKind(cards)) melds.push(cards);
  }
  return melds;
}

const discardable = (state: State, seat: Seat): Card[] => state.hands[seat].filter((card) => card.id !== state.tookDiscard);

function lowest(state: State, seats: readonly Seat[]): Seat[] {
  const least = Math.min(...seats.map((seat) => total(state.hands[seat])));
  return seats.filter((seat) => total(state.hands[seat]) === least);
}

function endHand(state: State, reason: Reason, seat: Seat | null, awarded: number[], revealed: Seat[] = []): void {
  state.result = {
    reason,
    seat,
    totals: state.hands.map(total),
    points: awarded,
    revealed: revealed.map((s) => ({ seat: s, cards: [...state.hands[s]] })),
  };
  state.scores = state.scores.map((score, i) => score + awarded[i]);
  state.winners = SEATS.filter((s) => state.scores[s] >= state.options.target);
  state.phase = state.winners.length ? "game-over" : "hand-over";
}

function deal(state: State, deck: readonly Card[]): void {
  const standard = new Map(standardDeck(false).map((card) => [card.id, card]));
  const exact = (card: Card): boolean => {
    const match = standard.get(card?.id);
    return !!match && match.suit === card.suit && match.rank === card.rank;
  };
  if (deck.length !== 52 || new Set(deck.map((card) => card?.id)).size !== 52 || !deck.every(exact)) {
    throw new Error("Deck must be the 52 standard cards");
  }
  state.hands = [[], [], [], []];
  for (let i = 0; i < 20; i += 1) state.hands[(state.dealer + 1 + i) % 4].push({ ...deck[i] });
  state.discards = [{ ...deck[20] }];
  state.stock = deck.slice(21).map((card) => ({ ...card }));
  state.melds = [];
  state.tookDiscard = null;
  state.result = null;
  state.phase = "draw";
  state.turn = next(state.dealer);
  if (!state.options.initialFifty) return;
  // Five cards total at most 50, so this is exactly "49 or 50".
  const fifty = SEATS.filter((seat) => total(state.hands[seat]) >= 49);
  if (fifty.length === 1) endHand(state, "initial-fifty", fifty[0], award(fifty, 2), fifty);
  else if (fifty.length > 1) endHand(state, "void-deal", null, award([], 0), fifty);
}

/** Validates house rules from an untrusted source and drops unknown keys. */
export function checkOptions(options: Options): Options {
  const { knocking, initialFifty, target } = options ?? ({} as Options);
  if (typeof knocking !== "boolean" || typeof initialFifty !== "boolean" || (target !== 5 && target !== 10)) {
    throw new RuleError("Invalid house rules");
  }
  return { knocking, initialFifty, target };
}

export function newMatch(deck: readonly Card[], options: Options = DEFAULT_OPTIONS, dealer: Seat = 0): State {
  const state: State = {
    options: checkOptions(options),
    handNumber: 1,
    phase: "draw",
    dealer,
    turn: next(dealer),
    hands: [],
    stock: [],
    discards: [],
    melds: [],
    tookDiscard: null,
    scores: [0, 0, 0, 0],
    result: null,
    winners: [],
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

function drop(state: State, seat: Seat): void {
  if (!state.options.knocking) throw new RuleError("Dropping is not allowed at this table");
  const low = lowest(state, SEATS.filter((other) => other !== seat));
  if (total(state.hands[seat]) < total(state.hands[low[0]])) endHand(state, "drop-won", seat, award([seat], 1));
  else endHand(state, "drop-failed", seat, award(low, 2));
}

function draw(state: State, seat: Seat, from: unknown): void {
  const pile = from === "stock" ? state.stock : from === "discard" ? state.discards : null;
  if (!pile) throw new RuleError("Draw from the stock or the discard pile");
  const card = pile.pop();
  if (!card) throw new RuleError("That pile is empty");
  state.hands[seat].push(card);
  state.tookDiscard = from === "discard" ? card.id : null;
  state.phase = "meld";
}

function held(state: State, seat: Seat, cardId: unknown): Card {
  const card = state.hands[seat].find((c) => c.id === cardId);
  if (!card) throw new RuleError("That card is not in your hand");
  return card;
}

function lay(state: State, seat: Seat, cards: readonly Card[]): void {
  const hand = (state.hands[seat] = state.hands[seat].filter((card) => !cards.includes(card)));
  if (!hand.length) return endHand(state, "out-by-melds", seat, award([seat], 2));
  // The card just taken may not be discarded this turn, so it must not be left alone with no meld to go on.
  if (hand.length === 1 && hand[0].id === state.tookDiscard && !state.melds.some((meld) => fits(meld, hand[0]))) {
    throw new RuleError("That would leave only the card you just took, which you may not discard this turn");
  }
}

function meld(state: State, seat: Seat, cardIds: unknown): void {
  if (!Array.isArray(cardIds) || new Set(cardIds).size !== cardIds.length) {
    throw new RuleError("A meld is a list of different cards");
  }
  const cards = cardIds.map((id) => held(state, seat, id)).sort(byOrder);
  const kind = meldKind(cards);
  if (!kind) throw new RuleError("Those cards are not a set or a run");
  state.melds.push({ seat, kind, cards });
  lay(state, seat, cards);
}

function extend(state: State, seat: Seat, meldIndex: unknown, cardId: unknown): void {
  const target = Number.isInteger(meldIndex) ? state.melds[meldIndex as number] : undefined;
  if (!target) throw new RuleError("No such meld");
  const card = held(state, seat, cardId);
  if (!fits(target, card)) throw new RuleError("That card does not extend the meld");
  target.cards.push(card);
  target.cards.sort(byOrder);
  lay(state, seat, [card]);
}

function discard(state: State, seat: Seat, cardId: unknown): void {
  const card = held(state, seat, cardId);
  if (!discardable(state, seat).includes(card)) throw new RuleError("You may not discard the card you just took");
  state.hands[seat] = state.hands[seat].filter((c) => c !== card);
  state.discards.push(card);
  state.tookDiscard = null;
  if (!state.hands[seat].length) return endHand(state, "out-by-discard", seat, award([seat], 1));
  state.turn = next(seat);
  state.phase = "draw";
  if (!state.stock.length) endHand(state, "stock-empty", null, award(lowest(state, SEATS), 1));
}

export function apply(input: State, seat: Seat, action: Action): State {
  const known = ACTIONS.get(action?.type);
  if (!known) throw new RuleError("Unknown action");
  if (input.phase !== known[0]) throw new RuleError("That action is not open now");
  if (seat !== input.turn) throw new RuleError("It is not your turn");
  if (Object.keys(action).length !== known[1]) throw new RuleError("Malformed action");
  const state = structuredClone(input);
  if (action.type === "drop") drop(state, seat);
  else if (action.type === "draw") draw(state, seat, action.from);
  else if (action.type === "meld") meld(state, seat, action.cardIds);
  else if (action.type === "extend") extend(state, seat, action.meldIndex, action.cardId);
  else discard(state, seat, action.cardId);
  return state;
}

/** Derived from the viewer's own hand and public state only. */
function legalFor(state: State, seat: Seat) {
  const hand = state.hands[seat];
  const drawing = state.phase === "draw";
  const melding = state.phase === "meld";
  const open = (action: Action): boolean => {
    try {
      apply(state, seat, action);
      return true;
    } catch {
      return false;
    }
  };
  return {
    canDrop: drawing && state.options.knocking,
    canDrawStock: drawing && state.stock.length > 0,
    canDrawDiscard: drawing && state.discards.length > 0,
    melds: melding
      ? meldsIn(hand)
          .map((cards) => cards.map((card) => card.id))
          .filter((cardIds) => open({ type: "meld", cardIds }))
      : [],
    extensions: melding
      ? state.melds.flatMap((target, meldIndex) =>
          hand.filter((card) => fits(target, card)).map((card) => ({ meldIndex, cardId: card.id })),
        ).filter((extension) => open({ type: "extend", ...extension }))
      : [],
    discardIds: melding ? discardable(state, seat).map((card) => card.id) : [],
  };
}

/**
 * What one recipient may see. `seat` null is the non-playing host: public state
 * only. The stock's order and the other hands never leave the server; the
 * discard pile and the table melds are face up.
 */
export function viewFor(state: State, seat: Seat | null) {
  const live = state.phase === "draw" || state.phase === "meld";
  return structuredClone({
    options: state.options,
    handNumber: state.handNumber,
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    discards: state.discards,
    stockCount: state.stock.length,
    melds: state.melds,
    tookDiscard: state.tookDiscard,
    scores: state.scores,
    result: state.result,
    winners: state.winners,
    handCounts: state.hands.map((hand) => hand.length),
    hand: seat === null ? null : state.hands[seat],
    legal: seat === null || seat !== state.turn || !live ? null : legalFor(state, seat),
  });
}

export type View = ReturnType<typeof viewFor>;
