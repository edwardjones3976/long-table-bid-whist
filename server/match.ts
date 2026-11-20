/**
 * One match of any game, independent of the network. Every change bumps
 * `revision`; callers must name the revision they acted on, and a repeated
 * action id is answered without being applied twice.
 *
 * Pace (every value defaults to 0, so tests and plain callers run instantly):
 *   botMs      wait before a bot moves after an ordinary change, so players see each bot card arrive
 *   settleMs   wait after a change the game marks as worth reading, such as a finished trick (default botMs)
 *   turnMs     time a person has for each decision; when it runs out the bots finish that person's turn
 *   onTimeout  called after that, with the seat, so the caller can count it against the player
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

export interface Pace {
  botMs?: number;
  settleMs?: number;
  turnMs?: number;
  onTimeout?: (seat: Seat) => void;
}

export class Match<S extends GameState = GameState, O = unknown> {
  revision = 0;
  state: S | null = null;
  /** Seats played by a person; every other seat is a bot once the match starts. */
  readonly humans = [false, false, false, false];
  /** The person on the clock and when their time runs out (Date.now() time), or null. */
  clock: { seat: Seat; endsAt: number } | null = null;
  /** When the match started and, once it is over, when it ended (Date.now() time). */
  startedAt: number | null = null;
  endedAt: number | null = null;
  private readonly options: O;
  // shortcut: grows for the life of the match (about 50 entries a hand); prune per hand if matches get long.
  private readonly accepted = new Map<string, string>();
  private readonly botMs: number;
  private readonly settleMs: number;
  private readonly turnMs: number;
  private readonly onTimeout: (seat: Seat) => void;
  /** The pending paced bot move and the running turn clock, if any. */
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether the last change should stay on the table longer before a bot moves. */
  private settling = false;
  private stopped = false;

  constructor(
    private readonly game: Game<S, O>,
    options?: unknown,
    private readonly shuffle: (deck: Card[]) => Card[] = shuffled,
    private readonly onChange: () => void = () => {},
    pace: Pace = {},
  ) {
    this.options = game.checkOptions(options);
    this.botMs = pace.botMs ?? 0;
    this.settleMs = pace.settleMs ?? this.botMs;
    this.turnMs = pace.turnMs ?? 0;
    this.onTimeout = pace.onTimeout ?? (() => {});
  }

  /** Cancels the pending bot move and the clock. A stopped match never moves a bot again; call it when the match is dropped. */
  stop(): void {
    this.stopped = true;
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = null;
    this.clearClock();
  }

  /** How long the match has run, frozen once it is over; null before it starts. */
  elapsedMs(now = Date.now()): number | null {
    return this.startedAt === null ? null : (this.endedAt ?? now) - this.startedAt;
  }

  private deal(): Card[] {
    return this.shuffle(this.game.deck(this.options));
  }

  start(): void {
    if (this.state) throw new RuleError("The match has already started");
    this.state = this.game.newMatch(this.deal(), this.options);
    this.startedAt = Date.now();
    this.changed(false);
    this.runBots();
  }

  view(seat: Seat | null): GameView | null {
    return this.state && this.game.viewFor(this.state, seat);
  }

  /** A person left: their seat is played by a bot from now on. */
  leave(seat: Seat): void {
    this.humans[seat] = false;
    if (this.clock?.seat === seat) this.clearClock();
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
    const before = this.state;
    try {
      this.state = action.type === "next-hand" ? this.game.nextHand(before, this.deal()) : this.game.apply(before, seat, action);
    } catch (error) {
      if (error instanceof RuleError) return fail("illegal", error.message);
      throw error;
    }
    this.accepted.set(key, print);
    this.changed(this.game.settles?.(before, this.state) ?? false);
    const revision = this.revision;
    this.runBots();
    return { ok: true, revision };
  }

  private changed(settle: boolean): void {
    this.revision += 1;
    this.settling = settle;
    if (this.state?.phase === "game-over") this.endedAt ??= Date.now();
    // Before onChange, so the snapshot it sends already carries the new clock.
    this.armClock();
    this.onChange();
  }

  /** Whether `seat` still has a decision to make in this hand. */
  private onTurn(seat: Seat): boolean {
    const state = this.state;
    return !!state && state.turn === seat && state.phase !== "hand-over" && state.phase !== "game-over";
  }

  /** The seat a bot must play now, or null while a person is to act or the hand is over. */
  private botTurn(): Seat | null {
    const turn = this.state?.turn;
    return turn !== undefined && this.onTurn(turn) && !this.humans[turn] ? turn : null;
  }

  private botMove(seat: Seat): void {
    const before = this.state!;
    this.state = this.game.apply(before, seat, this.game.chooseAction(this.game.viewFor(before, seat)));
    this.changed(this.game.settles?.(before, this.state) ?? false);
  }

  private runBots(): void {
    if (this.stopped) return;
    if (this.botMs > 0) return this.scheduleBot();
    for (let guard = 0; guard < 500; guard += 1) {
      const seat = this.botTurn();
      if (seat === null) return;
      this.botMove(seat);
    }
    throw new Error("Bot loop did not reach a human turn or the end of the hand");
  }

  /** Paced play: at most one pending timer; it re-reads the state when it fires, so a change in between cannot make a bot act out of turn. */
  private scheduleBot(): void {
    if (this.stopped || this.botTimer || this.botTurn() === null) return;
    this.botTimer = setTimeout(
      () => {
        this.botTimer = null;
        const seat = this.stopped ? null : this.botTurn();
        if (seat === null) return;
        try {
          this.botMove(seat);
        } catch (error) {
          // Nothing above a timer can catch this: stop this match's bots rather than the whole server.
          console.error("bot move failed:", error instanceof Error ? error.message : "unknown error");
          this.stop();
          return;
        }
        this.scheduleBot();
      },
      this.settling ? this.settleMs : this.botMs,
    );
    this.botTimer.unref?.();
  }

  /** Starts a full turnMs for the person who must decide now, if any: each decision gets its own time. */
  private armClock(): void {
    this.clearClock();
    const turn = this.state?.turn;
    if (this.stopped || this.turnMs <= 0 || turn === undefined || !this.humans[turn] || !this.onTurn(turn)) return;
    this.clock = { seat: turn, endsAt: Date.now() + this.turnMs };
    this.turnTimer = setTimeout(() => this.timeUp(turn), this.turnMs);
    this.turnTimer.unref?.();
  }

  private clearClock(): void {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.turnTimer = null;
    this.clock = null;
  }

  /** A person's time ran out: the bots finish that person's whole turn (one timeout however many decisions it held), then the caller hears of it. */
  private timeUp(seat: Seat): void {
    this.turnTimer = null;
    this.clock = null;
    if (this.stopped || !this.humans[seat] || !this.onTurn(seat)) return;
    try {
      for (let guard = 0; this.onTurn(seat); guard += 1) {
        if (guard >= 50) throw new Error("A timed-out turn did not end");
        this.botMove(seat);
        // A won trick ends the timed-out turn: leading the next one is a new decision on its own clock (changed() armed it).
        if (this.settling) break;
      }
    } catch (error) {
      console.error("timed-out turn failed:", error instanceof Error ? error.message : "unknown error");
      this.stop();
      return;
    }
    this.onTimeout(seat);
    this.runBots();
  }
}
