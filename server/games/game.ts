/**
 * The contract every card game implements so one match server can run them all.
 * Engines are pure: the caller supplies each shuffled deck, `apply` returns a
 * new state or throws RuleError without touching its input.
 */
import type { Card } from "../../shared/cards";

/** Seats run clockwise. */
export type Seat = 0 | 1 | 2 | 3;

/** An illegal or malformed player action, as opposed to a server bug. */
export class RuleError extends Error {}

/** "hand-over" waits for the next deal; "game-over" is final. In both, nobody is on turn. */
export interface GameState {
  phase: string;
  turn: Seat;
}

/** What one recipient may see. `hand` and `legal` are null for the non-playing host. */
export interface GameView {
  phase: string;
  turn: Seat;
  hand: Card[] | null;
  /** The viewer's legal moves, only when it is their turn. */
  legal: unknown | null;
}

export interface Game<S extends GameState = GameState, O = unknown> {
  /** Validates house rules from an untrusted source; undefined means the defaults. */
  checkOptions(options: unknown): O;
  /** The unshuffled deck for these house rules. */
  deck(options: O): Card[];
  newMatch(deck: readonly Card[], options: O): S;
  nextHand(state: S, deck: readonly Card[]): S;
  apply(state: S, seat: Seat, action: any): S;
  viewFor(state: S, seat: Seat | null): GameView;
  /** A bot's move, chosen from its own seat's view only. */
  chooseAction(view: any): unknown;
  /** True when the move from `before` to `after` should stay on the table longer before a bot moves (a finished trick). */
  settles?(before: S, after: S): boolean;
}
