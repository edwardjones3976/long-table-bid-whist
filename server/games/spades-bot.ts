/**
 * A simple, legal Spades bot. It is handed only its own seat's view, so it
 * cannot use anything a human in that seat could not see.
 * shortcut: bids its aces, kings and jokers, never nil, and plays by rank alone with no card counting; upgrade when bot quality matters.
 */
import type { Game } from "./game";
import {
  DEFAULT_OPTIONS,
  apply,
  checkOptions,
  deck,
  newMatch,
  nextHand,
  viewFor,
  type Action,
  type Options,
  type State,
  type View,
} from "./spades";

export function chooseAction(view: View): Action {
  const hand = view.hand ?? [];
  const legal = view.legal;
  if (!legal) throw new Error("Bot asked to act out of turn");

  if (view.phase === "bidding") {
    // 1-13 is always legal, whatever the nil rule.
    return { type: "bid", tricks: Math.max(1, hand.filter((card) => card.rank >= 13).length) };
  }
  const options = hand.filter((card) => legal.cardIds.includes(card.id)).sort((a, b) => a.rank - b.rank);
  const pick = view.trick.length === 0 ? options[options.length - 1] : options[0];
  return { type: "play", cardId: pick.id };
}

export const spades: Game<State, Options> = {
  checkOptions: (options) => (options === undefined ? { ...DEFAULT_OPTIONS } : checkOptions(options as Options)),
  deck,
  newMatch,
  nextHand,
  apply,
  viewFor,
  chooseAction,
  // A trick just finished: let everyone read all four cards before the next lead.
  // (By count: states are deep copies, so lastTrick is a new object after every move.)
  settles: (before, after) => after.tricksPlayed > before.tricksPlayed,
};
