// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../shared/cards";
import { RuleError, type Game, type GameState, type Seat } from "../../server/games/game";
import { bidWhist } from "../../server/games";
import { spades } from "../../server/games/spades-bot";
import { Match, type Pace } from "../../server/match";

const DELAY = 900;
/** Unshuffled, so a paced match and an instant one are dealt the same cards and must end in the same state. */
const same = (deck: Card[]) => deck;

/** A match that counts its changes (the deal, then every move). */
function counted(pace: Pace, humans: Seat[], game: Game<any, any> = spades) {
  const made = { changes: 0, match: null as unknown as Match };
  made.match = new Match(game, undefined, same, () => (made.changes += 1), pace);
  for (const seat of humans) made.match.humans[seat] = true;
  return made;
}

/** The seat that acts last in the first round, so bots move before it does. */
function lastToAct(): Seat {
  const probe = new Match(spades, undefined, same);
  probe.humans.fill(true);
  probe.start();
  return ((probe.state!.turn + 3) % 4) as Seat;
}

function humanMove(match: Match, seat: Seat, actionId: string): void {
  const action = spades.chooseAction(match.view(seat)) as { type?: unknown };
  expect(match.act(seat, { actionId, expectedRevision: match.revision, action }).ok).toBe(true);
}

interface Count extends GameState {
  moves: number;
  end: number;
  /** Each turn holds two decisions, like a Tonk draw and discard. */
  double: boolean;
}

/**
 * A tiny game for exact timings: seats move in turn, every fourth move "finishes a trick", the game ends after `end`
 * moves. With `keep`, the seat that finishes a trick wins it and moves again, as a trick winner leads.
 */
function counter(end = 8, double = false, keep = false): Game<Count, unknown> {
  return {
    checkOptions: () => undefined,
    deck: () => [],
    newMatch: () => ({ phase: "play", turn: 0, moves: 0, end, double }),
    nextHand: (state) => state,
    apply: (state, seat) => {
      if (seat !== state.turn || state.phase !== "play") throw new RuleError("Not your turn");
      const moves = state.moves + 1;
      const pass = (!state.double || moves % 2 === 0) && !(keep && moves % 4 === 0);
      return { ...state, moves, turn: (pass ? (state.turn + 1) % 4 : state.turn) as Seat, phase: moves >= state.end ? "game-over" : "play" };
    },
    viewFor: (state, seat) => ({ phase: state.phase, turn: state.turn, hand: [], legal: seat === state.turn ? ["go"] : null }),
    chooseAction: () => ({ type: "go" }),
    settles: (_before, after) => after.moves % 4 === 0,
  };
}

const go = (match: Match, seat: Seat, actionId: string) =>
  expect(match.act(seat, { actionId, expectedRevision: match.revision, action: { type: "go" } }).ok).toBe(true);

describe("bot pacing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("with no delay, makes every bot move before start() returns", () => {
    const human = lastToAct();
    const { match } = counted({}, [human]);
    match.start();
    expect(match.state!.turn).toBe(human);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("makes one bot move per delay and ends exactly where instant bots end", () => {
    const human = lastToAct();
    const instant = counted({}, [human]);
    const paced = counted({ botMs: DELAY }, [human]);
    instant.match.start();
    paced.match.start();
    const bots = instant.changes - 1;
    expect(bots).toBeGreaterThanOrEqual(2);

    expect(paced.changes).toBe(1);
    vi.advanceTimersByTime(DELAY - 1);
    expect(paced.changes).toBe(1);
    vi.advanceTimersByTime(1);
    expect(paced.changes).toBe(2);
    vi.advanceTimersByTime(DELAY);
    expect(paced.changes).toBe(3);
    vi.advanceTimersByTime(DELAY * bots);
    expect(paced.changes).toBe(1 + bots);
    expect(paced.match.state).toEqual(instant.match.state);
    // Nothing waits while a person is to act.
    expect(paced.match.state!.turn).toBe(human);
    expect(vi.getTimerCount()).toBe(0);

    // A person's move lands at once; the bot moves after it are paced again.
    humanMove(instant.match, human, "a");
    const before = paced.changes;
    humanMove(paced.match, human, "a");
    expect(paced.changes).toBe(before + 1);
    expect(vi.getTimerCount()).toBe(1);
    vi.runAllTimers();
    expect(paced.match.state).toEqual(instant.match.state);
    expect(paced.match.revision).toBe(instant.match.revision);
  });

  it("plays a whole hand of bots at the same pace and stops at the end of the hand", () => {
    const instant = counted({}, []);
    const paced = counted({ botMs: DELAY }, []);
    instant.match.start();
    paced.match.start();
    vi.runAllTimers();
    expect(paced.match.state).toEqual(instant.match.state);
    expect(["hand-over", "game-over"]).toContain(paced.match.state!.phase);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves a finished trick on the table for settleMs before the next bot move", () => {
    const t0 = Date.now();
    const times: number[] = [];
    const match = new Match(counter(), undefined, same, () => times.push(Date.now() - t0), { botMs: 100, settleMs: 300 });
    match.start();
    vi.runAllTimers();
    expect(times).toEqual([0, 100, 200, 300, 400, 700, 800, 900, 1000]);
  });

  it.each([
    ["Spades", spades, 13],
    ["Bid Whist", bidWhist, 12],
  ] as const)("in %s, pauses after each finished trick and nowhere else", (_name, game, tricks) => {
    const seen: { at: number; played: number }[] = [];
    const match: Match = new Match(game as Game<any, any>, undefined, same, () => seen.push({ at: Date.now(), played: (match.state as any).tricksPlayed }), {
      botMs: 100,
      settleMs: 500,
    });
    match.start();
    vi.runAllTimers();
    expect(match.state!.phase).toBe("hand-over");
    let pauses = 0;
    for (let i = 1; i < seen.length; i += 1) {
      const finished = i >= 2 && seen[i - 1].played > seen[i - 2].played;
      expect(seen[i].at - seen[i - 1].at).toBe(finished ? 500 : 100);
      if (finished) pauses += 1;
    }
    // The last trick ends the hand, and nobody moves after that.
    expect(pauses).toBe(tricks - 1);
  });

  it("stop() cancels the pending move and no bot moves after it", () => {
    const paced = counted({ botMs: DELAY }, [lastToAct()]);
    paced.match.start();
    vi.advanceTimersByTime(DELAY);
    expect(paced.changes).toBe(2);
    paced.match.stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(DELAY * 10);
    expect(paced.changes).toBe(2);
  });

  it("re-reads the table when the timer fires: a seat taken by a person is not played, and one a person leaves is", () => {
    const paced = counted({ botMs: DELAY }, [lastToAct()]);
    paced.match.start();
    const seat = paced.match.state!.turn;
    paced.match.humans[seat] = true;
    vi.advanceTimersByTime(DELAY);
    expect(paced.changes).toBe(1);
    expect(vi.getTimerCount()).toBe(0);

    paced.match.leave(seat);
    expect(paced.changes).toBe(1);
    vi.advanceTimersByTime(DELAY);
    expect(paced.changes).toBe(2);
  });

  it("a bot move that throws stops that match's bots instead of crashing the server", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: Game<any, any> = {
      ...spades,
      chooseAction: () => {
        throw new Error("no move");
      },
    };
    const paced = counted({ botMs: DELAY }, [lastToAct()], broken);
    paced.match.start();
    expect(() => vi.advanceTimersByTime(DELAY)).not.toThrow();
    expect(paced.match.revision).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(error).toHaveBeenCalledWith("bot move failed:", "no move");
    error.mockRestore();
  });
});

describe("turn clock", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function clocked(game = counter(), turnMs = 1000) {
    const timeouts: Seat[] = [];
    const match = new Match(game, undefined, same, () => {}, { turnMs, onTimeout: (seat) => timeouts.push(seat) });
    match.humans[0] = true;
    return { match, timeouts };
  }

  it("gives a person turnMs to decide, then the bots finish the turn and the caller hears of it once", () => {
    const { match, timeouts } = clocked();
    match.start();
    expect(match.clock).toEqual({ seat: 0, endsAt: Date.now() + 1000 });
    vi.advanceTimersByTime(999);
    expect((match.state as Count).moves).toBe(0);
    expect(timeouts).toEqual([]);
    vi.advanceTimersByTime(1);
    // The bot played seat 0's move, the other bots played theirs, and seat 0 is on a fresh clock.
    expect(timeouts).toEqual([0]);
    expect((match.state as Count).moves).toBe(4);
    expect(match.clock).toEqual({ seat: 0, endsAt: Date.now() + 1000 });
  });

  it("restarts for each decision, so a person who acts in time is never timed out", () => {
    const { match, timeouts } = clocked();
    match.start();
    vi.advanceTimersByTime(900);
    go(match, 0, "a");
    expect(match.clock).toEqual({ seat: 0, endsAt: Date.now() + 1000 });
    vi.advanceTimersByTime(900);
    go(match, 0, "b");
    vi.advanceTimersByTime(900);
    expect(timeouts).toEqual([]);
  });

  it("finishes a turn of two decisions in one go and counts it once", () => {
    const { match, timeouts } = clocked(counter(16, true));
    match.start();
    vi.advanceTimersByTime(1000);
    expect(timeouts).toEqual([0]);
    expect((match.state as Count).turn).toBe(0);
    expect((match.state as Count).moves).toBe(8);
  });

  it("ends a timed-out turn at a won trick, so the lead after it is a decision of its own", () => {
    const timeouts: Seat[] = [];
    const match = new Match(counter(16, false, true), undefined, same, () => {}, { turnMs: 1000, onTimeout: (seat) => timeouts.push(seat) });
    match.humans[3] = true;
    match.start();
    // Bots 0 to 2 move at once; seat 3's timed-out move finishes the trick and wins it.
    vi.advanceTimersByTime(1000);
    expect(timeouts).toEqual([3]);
    expect((match.state as Count).moves).toBe(4);
    expect(match.clock).toEqual({ seat: 3, endsAt: Date.now() + 1000 });
  });

  it("does not run while a bot plays, and stops for a person who leaves or a stopped match", () => {
    const left = clocked();
    left.match.start();
    left.match.leave(0);
    expect(left.match.clock).toBeNull();
    expect(left.match.state!.phase).toBe("game-over");
    vi.advanceTimersByTime(5000);
    expect(left.timeouts).toEqual([]);

    const stopped = clocked();
    stopped.match.start();
    stopped.match.stop();
    expect(stopped.match.clock).toBeNull();
    vi.advanceTimersByTime(5000);
    expect(stopped.timeouts).toEqual([]);
  });

  it("has no clock once the hand is over", () => {
    const human = lastToAct();
    const match = new Match(spades, undefined, same, () => {}, { turnMs: 60_000 });
    match.humans[human] = true;
    match.start();
    for (let i = 0; match.state!.phase !== "hand-over"; i += 1) {
      expect(match.clock?.seat).toBe(human);
      humanMove(match, human, `m${i}`);
    }
    expect(match.clock).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("match time", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs from the deal and freezes when the match is over", () => {
    const match = new Match(counter(), undefined, same, () => {}, { botMs: 100 });
    expect(match.elapsedMs()).toBeNull();
    match.start();
    vi.advanceTimersByTime(450);
    expect(match.elapsedMs()).toBe(450);
    vi.runAllTimers();
    expect(match.state!.phase).toBe("game-over");
    expect(match.elapsedMs()).toBe(800);
    vi.advanceTimersByTime(60_000);
    expect(match.elapsedMs()).toBe(800);
  });
});
