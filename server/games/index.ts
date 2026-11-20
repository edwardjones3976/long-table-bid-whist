import { standardDeck } from "../../shared/cards";
import { DEFAULT_OPTIONS, apply, checkOptions, newMatch, nextHand, viewFor, type Options, type State } from "./bidwhist";
import { chooseAction } from "./bidwhist-bot";
import type { Game } from "./game";
import { spades } from "./spades-bot";
import { tonk } from "./tonk-bot";

export const bidWhist: Game<State, Options> = {
  checkOptions: (options) => checkOptions((options ?? DEFAULT_OPTIONS) as Options),
  deck: () => standardDeck(true),
  newMatch,
  nextHand,
  apply,
  viewFor,
  chooseAction,
  // A trick just finished: let everyone read all four cards before the next lead.
  // (By count: states are deep copies, so lastTrick is a new object after every move.)
  settles: (before, after) => after.tricksPlayed > before.tricksPlayed,
};

export const GAMES: Record<string, Game<any, any>> = {
  "bid-whist": bidWhist,
  spades,
  tonk,
};
