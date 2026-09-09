// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * AI seats.
 *
 * An AI seat decides from an `AiSeatView` — the oracle's `PlayerView`: its own
 * hand plus public history, built by the oracle's `makePlayerView` — and the
 * legal options for that seat. The decision functions are the oracle's. Nothing
 * here reads another seat's hand, the kitty, the discard pile, or the seed;
 * `tests/automation.test.ts` proves it with a counterfactual.
 */
import { chooseBid, chooseDiscards, choosePlay, chooseTrump } from "../../../src/game/ai";
import { makePlayerView } from "../../../src/game/engine";
import { applySeatAction, canPass, legalBids, legalCards } from "./hand";
import type { Bid, Card, GameState, PlayerView, Seat, SeatAction } from "./model";

export type AiSeatView = PlayerView;

/** True for seats the authority plays itself. */
export type SeatPolicy = (seat: Seat) => boolean;

export const NO_AI_SEATS: SeatPolicy = () => false;
export const ORACLE_AI_SEATS: SeatPolicy = (seat) => seat !== "south";

const AI_GUARD = 160;

export function buildAiSeatView(state: GameState, seat: Seat): AiSeatView {
  return makePlayerView(state, seat);
}

export interface AiLegalOptions {
  bids: Bid[];
  cards: Card[];
  canPass: boolean;
}

export function aiLegalOptions(state: GameState, seat: Seat): AiLegalOptions {
  return {
    bids: state.phase === "auction" ? legalBids(state) : [],
    cards: state.phase === "play" ? legalCards(state, seat) : [],
    canPass: state.phase === "auction" ? canPass(state) : false,
  };
}

/** Pure: the decision depends only on the view and the legal options. */
export function aiDecision(view: AiSeatView, options: AiLegalOptions): SeatAction {
  switch (view.phase) {
    case "auction": {
      const selected = chooseBid(view, options.bids);
      if (selected) return { type: "bid", bid: selected };
      return options.canPass ? { type: "pass" } : { type: "bid", bid: options.bids[0] };
    }
    case "declaration": {
      const noTrump = view.contract?.mode.startsWith("no-trump");
      return { type: "declare", trump: noTrump ? null : chooseTrump(view) };
    }
    case "kitty":
      return { type: "discard", cardIds: chooseDiscards(view, 6).map((card) => card.id) };
    case "play":
      return { type: "play", cardId: choosePlay(view, options.cards).id };
    case "summary":
      return { type: "next-hand" };
  }
}

export interface CommittedAction {
  seat: Seat;
  action: SeatAction;
}

export interface AdvanceResult {
  state: GameState;
  /** Every AI action committed, in order, for the replay log. */
  actions: CommittedAction[];
}

/**
 * Advances AI seats until a non-AI seat must act, the hand is over, or the
 * table is paused. Never calls the next hand: that is a table-level decision.
 */
export function advanceAiSeats(input: GameState, isAi: SeatPolicy): AdvanceResult {
  let state = input;
  const actions: CommittedAction[] = [];
  let guard = 0;
  while (state.phase !== "summary" && isAi(state.turn) && !state.paused) {
    const seat = state.turn;
    const action = aiDecision(buildAiSeatView(state, seat), aiLegalOptions(state, seat));
    const result = applySeatAction(state, seat, action);
    if (result.error) throw new Error(`AI seat ${seat} produced an illegal action: ${result.error}`);
    state = result.state;
    actions.push({ seat, action });
    guard += 1;
    if (guard > AI_GUARD) throw new Error("AI advancement guard exceeded");
  }
  return { state, actions };
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
