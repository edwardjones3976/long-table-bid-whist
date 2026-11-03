// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Seat-generic hand transitions.
 *
 * The browser oracle (`src/game/engine.ts`) hard-wires South as the human seat
 * and folds AI advancement into every action. A native table seats up to four
 * humans, so the same transitions are expressed here for an arbitrary acting
 * seat with no automation attached. Legality helpers (`legalBids`,
 * `legalCards`) are the oracle's own exports; the transition bodies below are
 * held byte-for-byte equivalent to the oracle by
 * `packages/rules-core/tests/conformance.test.ts`, which replays the oracle and
 * this module side by side and requires identical states after every step.
 */
import { legalBids, legalCards } from "../../../src/game/engine";
import { dealHand } from "./deck";
import {
  MANIFEST_ID,
  SEATS,
  SUITS,
  nextSeat,
  teamFor,
  type ActionResult,
  type AuctionEntry,
  type Bid,
  type Card,
  type ContractMode,
  type GameState,
  type Seat,
  type SeatAction,
  type Suit,
  type Team,
} from "./model";

export { legalBids, legalCards };

const MODE_ORDER: ContractMode[] = ["low", "high", "no-trump-low", "no-trump-high"];
const EVENT_MEMORY = 80;
const DISCARD_COUNT = 6;
const TRICKS_PER_HAND = 12;

export interface OpenHandOptions {
  seed: string;
  handNumber?: number;
  dealer?: Seat;
  scores?: Record<Team, number>;
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function log(state: GameState, text: string): void {
  state.events.push({ id: state.events.length + 1, text });
  if (state.events.length > EVENT_MEMORY) state.events = state.events.slice(-EVENT_MEMORY);
  state.status = text;
}

export function modeLabel(mode: ContractMode): string {
  return mode.replaceAll("-", " ");
}

export function bidValue(bid: Bid): number {
  return bid.level * 10 + MODE_ORDER.indexOf(bid.mode);
}

/** A hand with no AI advancement applied. Every seat waits for an explicit action. */
export function openHand(options: OpenHandOptions): GameState {
  const handNumber = options.handNumber ?? 1;
  const dealer = options.dealer ?? "east";
  const scores = options.scores ?? { "north-south": 0, "east-west": 0 };
  const dealt = dealHand(options.seed, handNumber);
  const state: GameState = {
    manifestId: MANIFEST_ID,
    seed: options.seed,
    handNumber,
    phase: "auction",
    dealer,
    turn: nextSeat(dealer),
    hands: dealt.hands,
    kitty: dealt.kitty,
    discardPile: [],
    auction: [],
    contract: null,
    currentTrick: [],
    completedTricks: [],
    tricksWon: { south: 0, west: 0, north: 0, east: 0 },
    scores: { ...scores },
    events: [],
    status: `Hand ${handNumber}. ${nextSeat(dealer)} opens the auction.`,
    summary: null,
    paused: false,
  };
  state.events.push({ id: 1, text: state.status });
  return state;
}

/** The dealer may not pass when the three seats before them all passed. */
export function canPass(state: GameState): boolean {
  const isLastDealerTurn = state.auction.length === 3 && state.turn === state.dealer;
  return !(isLastDealerTurn && state.auction.every((entry) => !entry.bid));
}

function completeAuction(state: GameState): void {
  const winning = state.auction
    .filter((entry): entry is AuctionEntry & { bid: Bid } => Boolean(entry.bid))
    .sort((a, b) => bidValue(b.bid) - bidValue(a.bid))[0];
  if (!winning) throw new Error("Forced dealer invariant failed");
  state.contract = { ...winning.bid, bidder: winning.seat, trump: null };
  state.phase = "declaration";
  state.turn = winning.seat;
  log(state, `${winning.seat} wins ${winning.bid.level} ${modeLabel(winning.bid.mode)} and must declare.`);
}

function recordBid(state: GameState, seat: Seat, bid: Bid | null): void {
  state.auction.push({ seat, bid: bid ? { ...bid } : null });
  log(state, bid ? `${seat} bids ${bid.level} ${modeLabel(bid.mode)}.` : `${seat} passes.`);
  if (state.auction.length === 4) completeAuction(state);
  else state.turn = nextSeat(seat);
}

function declare(state: GameState, trump: Suit | null): void {
  if (!state.contract) throw new Error("Missing contract");
  const noTrump = state.contract.mode.startsWith("no-trump");
  if (noTrump && trump !== null) throw new Error("No-trump contract cannot declare a suit");
  if (!noTrump && !trump) throw new Error("Trump suit required");
  state.contract.trump = trump;
  state.hands[state.contract.bidder].push(...state.kitty);
  state.kitty = [];
  state.phase = "kitty";
  state.turn = state.contract.bidder;
  log(state, `${state.contract.bidder} declares ${trump ?? modeLabel(state.contract.mode)} and takes the kitty.`);
}

function discard(state: GameState, cardIds: string[]): void {
  if (!state.contract) throw new Error("Missing contract");
  if (cardIds.length !== DISCARD_COUNT || new Set(cardIds).size !== DISCARD_COUNT) {
    throw new Error("Choose exactly six different cards");
  }
  const hand = state.hands[state.contract.bidder];
  const cards = cardIds.map((id) => hand.find((card) => card.id === id));
  if (cards.some((card) => !card)) throw new Error("Discard must come from the bidder hand");
  state.discardPile = cards as Card[];
  state.hands[state.contract.bidder] = hand.filter((card) => !cardIds.includes(card.id));
  if (state.hands[state.contract.bidder].length !== 12) throw new Error("Bidder must retain twelve cards");
  state.phase = "play";
  state.turn = state.contract.bidder;
  log(state, `${state.contract.bidder} closes the kitty. Opening lead.`);
}

function effectiveSuit(card: Card, state: GameState): Suit | "joker" {
  if (card.suit === "joker" && state.contract?.trump) return state.contract.trump;
  return card.suit;
}

function trickPower(card: Card, ledSuit: Suit | "joker", state: GameState): number {
  const suit = effectiveSuit(card, state);
  const trump = state.contract?.trump;
  const isTrump = Boolean(trump && suit === trump);
  const follows = suit === ledSuit;
  if (!isTrump && !follows) return -100 + card.rank;
  const lowWins = state.contract?.mode === "low" || state.contract?.mode === "no-trump-low";
  let rank = lowWins ? 20 - card.rank : card.rank;
  if (card.suit === "joker" && trump) rank = card.joker === "big" ? 40 : 39;
  return (isTrump ? 100 : 0) + rank;
}

function scoreHand(state: GameState): void {
  if (!state.contract) throw new Error("Missing contract");
  const declaringTeam = teamFor(state.contract.bidder);
  const teamTricks = SEATS.filter((seat) => teamFor(seat) === declaringTeam).reduce(
    (sum, seat) => sum + state.tricksWon[seat],
    0,
  );
  const target = 6 + state.contract.level;
  const made = teamTricks >= target;
  state.scores[declaringTeam] += made ? state.contract.level : -state.contract.level;
  state.phase = "summary";
  state.turn = "south";
  state.summary = `${declaringTeam} ${made ? "made" : "was set on"} ${state.contract.level} ${modeLabel(state.contract.mode)} with ${teamTricks} tricks. Score ${state.scores["north-south"]}–${state.scores["east-west"]}.`;
  log(state, state.summary);
}

function resolveTrick(state: GameState): void {
  const cards = state.currentTrick;
  const ledSuit = effectiveSuit(cards[0].card, state);
  const winner = [...cards].sort(
    (a, b) => trickPower(b.card, ledSuit, state) - trickPower(a.card, ledSuit, state),
  )[0].seat;
  state.tricksWon[winner] += 1;
  state.completedTricks.push({
    number: state.completedTricks.length + 1,
    lead: cards[0].seat,
    winner,
    cards: structuredClone(cards),
  });
  state.currentTrick = [];
  state.turn = winner;
  log(state, `${winner} takes trick ${state.completedTricks.length}.`);
  if (state.completedTricks.length === TRICKS_PER_HAND) scoreHand(state);
}

function play(state: GameState, seat: Seat, cardId: string): void {
  const card = state.hands[seat].find((candidate) => candidate.id === cardId);
  if (!card) throw new Error("Card is not in the acting hand");
  if (!legalCards(state, seat).some((candidate) => candidate.id === cardId)) throw new Error("Follow suit");
  state.hands[seat] = state.hands[seat].filter((candidate) => candidate.id !== cardId);
  state.currentTrick.push({ seat, card });
  log(state, `${seat} plays ${card.label}.`);
  if (state.currentTrick.length === 4) resolveTrick(state);
  else state.turn = nextSeat(seat);
}

/**
 * Actions `seat` may commit now. Between hands every seat may call the next
 * hand; during a hand only the seat whose turn it is has choices.
 */
export function legalSeatActions(state: GameState, seat: Seat): SeatAction[] {
  if (state.paused) return [];
  if (state.phase === "summary") return [{ type: "next-hand" }];
  if (state.turn !== seat) return [];
  if (state.phase === "auction") {
    const actions: SeatAction[] = legalBids(state).map((bid) => ({ type: "bid", bid }));
    if (canPass(state)) actions.unshift({ type: "pass" });
    return actions;
  }
  if (state.phase === "declaration") {
    if (state.contract?.mode.startsWith("no-trump")) return [{ type: "declare", trump: null }];
    return SUITS.map((trump) => ({ type: "declare", trump }));
  }
  if (state.phase === "play") return legalCards(state, seat).map((card) => ({ type: "play", cardId: card.id }));
  return [];
}

/**
 * Commits one action for `seat`. Returns the untouched input state with an
 * error when the action is not legal now. No AI seat is advanced here; see
 * `automation.ts`.
 */
export function applySeatAction(input: GameState, seat: Seat, action: SeatAction): ActionResult {
  const state = cloneState(input);
  if (state.paused) return { state, error: "Table is paused" };
  if (state.turn !== seat && action.type !== "next-hand") return { state, error: "Wait for your turn" };
  try {
    if (action.type === "pass" && state.phase === "auction" && canPass(state)) recordBid(state, seat, null);
    else if (
      action.type === "bid" &&
      state.phase === "auction" &&
      legalBids(state).some((bid) => bidValue(bid) === bidValue(action.bid))
    ) {
      recordBid(state, seat, action.bid);
    } else if (action.type === "declare" && state.phase === "declaration") declare(state, action.trump);
    else if (action.type === "discard" && state.phase === "kitty") discard(state, action.cardIds);
    else if (action.type === "play" && state.phase === "play") play(state, seat, action.cardId);
    else if (action.type === "next-hand" && state.phase === "summary") {
      return {
        state: openHand({
          seed: state.seed,
          scores: state.scores,
          dealer: nextSeat(state.dealer),
          handNumber: state.handNumber + 1,
        }),
      };
    } else return { state, error: "That action is not legal now" };
    return { state };
  } catch (error) {
    return { state: input, error: error instanceof Error ? error.message : "Action failed" };
  }
}

/** Host pause/resume. Pausing never changes cards, bids, tricks or score. */
export function setPaused(input: GameState, paused: boolean): GameState {
  if (input.paused === paused) return input;
  const state = cloneState(input);
  state.paused = paused;
  log(state, paused ? "Host requested a table pause." : "Table resumed.");
  return state;
}

export function teamBooks(state: GameState): Record<Team, number> {
  return SEATS.reduce(
    (totals, seat) => {
      totals[teamFor(seat)] += state.tricksWon[seat];
      return totals;
    },
    { "north-south": 0, "east-west": 0 } as Record<Team, number>,
  );
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
