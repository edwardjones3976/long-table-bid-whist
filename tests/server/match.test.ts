// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../shared/cards";
import type { Game, Seat } from "../../server/games/game";
import { spades } from "../../server/games/spades-bot";
import { Match } from "../../server/match";

const DELAY = 900;
/** Unshuffled, so a paced match and an instant one are dealt the same cards and must end in the same state. */
const same = (deck: Card[]) => deck;

/** A match that counts its changes (the deal, then every move). */
function counted(delay: number, humans: Seat[], game: Game<any, any> = spades) {
  const made = { changes: 0, match: null as unknown as Match };
  made.match = new Match(game, undefined, same, () => (made.changes += 1), delay);
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

describe("bot pacing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("with no delay, makes every bot move before start() returns", () => {
    const human = lastToAct();
    const { match } = counted(0, [human]);
    match.start();
    expect(match.state!.turn).toBe(human);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("makes one bot move per delay and ends exactly where instant bots end", () => {
    const human = lastToAct();
    const instant = counted(0, [human]);
    const paced = counted(DELAY, [human]);
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
    const instant = counted(0, []);
    const paced = counted(DELAY, []);
    instant.match.start();
    paced.match.start();
    vi.advanceTimersByTime(DELAY * (instant.changes - 1));
    expect(paced.match.state).toEqual(instant.match.state);
    expect(["hand-over", "game-over"]).toContain(paced.match.state!.phase);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stop() cancels the pending move and no bot moves after it", () => {
    const paced = counted(DELAY, [lastToAct()]);
    paced.match.start();
    vi.advanceTimersByTime(DELAY);
    expect(paced.changes).toBe(2);
    paced.match.stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(DELAY * 10);
    expect(paced.changes).toBe(2);
  });

  it("re-reads the table when the timer fires: a seat taken by a person is not played, and one a person leaves is", () => {
    const paced = counted(DELAY, [lastToAct()]);
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
    const paced = counted(DELAY, [lastToAct()], broken);
    paced.match.start();
    expect(() => vi.advanceTimersByTime(DELAY)).not.toThrow();
    expect(paced.match.revision).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(error).toHaveBeenCalledWith("bot move failed:", "no move");
    error.mockRestore();
  });
});
