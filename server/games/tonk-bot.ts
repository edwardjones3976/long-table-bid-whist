/**
 * A simple, legal Tonk bot. It is handed only its own seat's view, so it cannot
 * use anything a human in that seat could not see.
 * shortcut: melds whatever it can and throws its dearest card, with no card counting; upgrade when bot quality matters.
 */
import { standardDeck } from "../../shared/cards";
import type { Game } from "./game";
import {
  DEFAULT_OPTIONS,
  apply,
  checkOptions,
  newMatch,
  nextHand,
  points,
  total,
  viewFor,
  type Action,
  type Options,
  type State,
  type View,
} from "./tonk";

export function chooseAction(view: View): Action {
  const hand = view.hand ?? [];
  const legal = view.legal;
  if (!legal) throw new Error("Bot asked to act out of turn");

  if (view.phase === "draw") {
    if (legal.canDrop && total(hand) <= 6) return { type: "drop" };
    return { type: "draw", from: legal.canDrawStock ? "stock" : "discard" };
  }
  if (legal.melds.length) return { type: "meld", cardIds: legal.melds[0] };
  if (legal.extensions.length) return { type: "extend", ...legal.extensions[0] };
  const options = hand.filter((card) => legal.discardIds.includes(card.id)).sort((a, b) => points(b) - points(a));
  return { type: "discard", cardId: options[0].id };
}

export const tonk: Game<State, Options> = {
  checkOptions: (options) => checkOptions(options === undefined ? DEFAULT_OPTIONS : (options as Options)),
  deck: () => standardDeck(false),
  newMatch,
  nextHand,
  apply,
  viewFor,
  chooseAction,
};
