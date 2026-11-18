/**
 * One match of any game, independent of the network. Every change bumps
 * `revision`; callers must name the revision they acted on, and a repeated
 * action id is answered without being applied twice.
 */
import type { Card } from "../shared/cards";
import { RuleError, type Game, type GameState, type GameView, type Seat } from "./games/game";
import { shuffled } from "./shuffle";

export interface ActionRequest {
  actionId: string;
  expectedRevision: number;
  /** A game action, or { type: "next-hand" } once a hand is over. */
  action: { type?: unknown };
}

export type ActionError = "bad-request" | "not-started" | "action-id-reused" | "stale-revision" | "illegal";

export type ActionReply =
  | { ok: true; revision: number; duplicate?: true }
  | { ok: false; error: ActionError; message: string; revision: number };

export class Match<S extends GameState = GameState, O = unknown> {
  revision = 0;
  state: S | null = null;
  /** Seats played by a person; every other seat is a bot once the match starts. */
  readonly humans = [false, false, false, false];
  private readonly options: O;
  // shortcut: grows for the life of the match (about 50 entries a hand); prune per hand if matches get long.
  private readonly accepted = new Map<string, string>();

  constructor(
    private readonly game: Game<S, O>,
    options?: unknown,
    private readonly shuffle: (deck: Card[]) => Card[] = shuffled,
    private readonly onChange: () => void = () => {},
  ) {
    this.options = game.checkOptions(options);
  }

  private deal(): Card[] {
    return this.shuffle(this.game.deck(this.options));
  }

  start(): void {
    if (this.state) throw new RuleError("The match has already started");
    this.state = this.game.newMatch(this.deal(), this.options);
    this.changed();
    this.runBots();
  }

  view(seat: Seat | null): GameView | null {
    return this.state && this.game.viewFor(this.state, seat);
  }

  /** A person left: their seat is played by a bot from now on. */
  leave(seat: Seat): void {
    this.humans[seat] = false;
    this.runBots();
  }

  act(seat: Seat, request: ActionRequest): ActionReply {
    const fail = (error: ActionError, message: string): ActionReply => ({
      ok: false,
      error,
      message,
      revision: this.revision,
    });
    if (!this.state) return fail("not-started", "The match has not started");
    const { actionId, expectedRevision, action } = request ?? ({} as ActionRequest);
    if (
      typeof actionId !== "string" ||
      actionId.length < 1 ||
      actionId.length > 64 ||
      !Number.isInteger(expectedRevision) ||
      typeof action !== "object" ||
      action === null
    ) {
      return fail("bad-request", "Malformed action");
    }
    const key = `${seat}:${actionId}`;
    // Bounded because accepted prints are kept for the whole match.
    let print: string;
    try {
      print = JSON.stringify([expectedRevision, action]);
    } catch {
      return fail("bad-request", "Malformed action");
    }
    if (print.length > 2048) return fail("bad-request", "Action too large");
    const prior = this.accepted.get(key);
    if (prior !== undefined) {
      return prior === print
        ? { ok: true, revision: this.revision, duplicate: true }
        : fail("action-id-reused", "That action id was already used for a different action");
    }
    if (expectedRevision !== this.revision) return fail("stale-revision", "The table has changed; act on the latest state");
    try {
      this.state =
        action.type === "next-hand"
          ? this.game.nextHand(this.state, this.deal())
          : this.game.apply(this.state, seat, action);
    } catch (error) {
      if (error instanceof RuleError) return fail("illegal", error.message);
      throw error;
    }
    this.accepted.set(key, print);
    this.changed();
    const revision = this.revision;
    this.runBots();
    return { ok: true, revision };
  }

  private changed(): void {
    this.revision += 1;
    this.onChange();
  }

  // shortcut: bots answer instantly; add pacing with the decision timers.
  private runBots(): void {
    for (let guard = 0; guard < 500; guard += 1) {
      const state = this.state;
      if (!state || state.phase === "hand-over" || state.phase === "game-over" || this.humans[state.turn]) return;
      this.state = this.game.apply(state, state.turn, this.game.chooseAction(this.game.viewFor(state, state.turn)));
      this.changed();
    }
    throw new Error("Bot loop did not reach a human turn or the end of the hand");
  }
}
