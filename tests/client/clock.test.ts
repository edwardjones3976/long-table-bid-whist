import { describe, expect, it } from "vitest";
import type { SeatInfo, TableSummary } from "../../shared/protocol";
import { clockText, matchElapsed, seatLines, strikeText, turnCue, turnLeft } from "../../client/src/tableui/helpers";
import { describeTable, type SeatDescription } from "../../client/src/ui/actions";

const seat = (patch: Partial<SeatDescription> = {}): SeatDescription => ({
  seat: 1,
  name: "Bo",
  occupant: "human",
  connected: true,
  ready: true,
  cardCount: 5,
  isTurn: false,
  isYou: false,
  team: null,
  note: "",
  strikes: 0,
  ...patch,
});

describe("turn and match clock words", () => {
  it("writes a running time as m:ss, and as h:mm:ss from an hour on", () => {
    expect(clockText(0)).toBe("0:00");
    expect(clockText(999)).toBe("0:00");
    expect(clockText(59_999)).toBe("0:59");
    expect(clockText(61_000)).toBe("1:01");
    expect(clockText(3_599_999)).toBe("59:59");
    expect(clockText(3_600_000)).toBe("1:00:00");
    expect(clockText(3_725_000)).toBe("1:02:05");
    expect(clockText(36_000_000 + 59 * 60_000)).toBe("10:59:00");
    expect(clockText(-5)).toBe("0:00");
  });

  it("rounds the seconds left up, so 0 shows only once time is out, and marks the last ten", () => {
    expect(turnLeft(45_000)).toEqual({ seconds: 45, hurry: false });
    expect(turnLeft(10_001)).toEqual({ seconds: 11, hurry: false });
    expect(turnLeft(10_000)).toEqual({ seconds: 10, hurry: true });
    expect(turnLeft(1)).toEqual({ seconds: 1, hurry: true });
    expect(turnLeft(0)).toEqual({ seconds: 0, hurry: true });
    expect(turnLeft(-300)).toEqual({ seconds: 0, hurry: true });
  });

  it("ticks once as each of my last ten seconds begins, buzzing with the first", () => {
    const heard: string[] = [];
    let last: number | null = null;
    // Checked several times a second; a snapshot may arrive in between and change nothing.
    for (const left of [45, 12, 11, 11, 10, 10, 10, 9, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 0, 0]) {
      const told = turnCue(left, last);
      if (told) heard.push(`${told} ${left}`);
      last = left;
    }
    expect(heard).toEqual(["buzz 10", ...[9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => `tick ${n}`)]);
    // Not on the clock: nothing, and the next clock buzzes afresh.
    expect(turnCue(null, 4)).toBeNull();
    expect(turnCue(10, null)).toBe("buzz");
    // A turn clock shorter than ten seconds buzzes on its first second.
    expect(turnCue(2, null)).toBe("buzz");
    expect(turnCue(1, 2)).toBe("tick");
  });

  it("counts a match up from when the room snapshot arrived, and stops at the final time", () => {
    expect(matchElapsed({ elapsedMs: 5_000, running: true }, 1_000, 3_500)).toBe(7_500);
    expect(matchElapsed({ elapsedMs: 5_000, running: false }, 1_000, 900_000)).toBe(5_000);
    // A local clock that steps back never counts down.
    expect(matchElapsed({ elapsedMs: 5_000, running: true }, 1_000, 500)).toBe(5_000);
    expect(matchElapsed(null, 0, 1)).toBeNull();
    expect(matchElapsed(undefined, 0, 1)).toBeNull();
  });

  it("puts the seconds left and the strikes in a seat's words", () => {
    expect(strikeText(0)).toBe("");
    expect(strikeText(2)).toBe("Strike 2 of 3");
    expect(seatLines(seat())).toEqual(["Bo", "5 cards"]);
    expect(seatLines(seat({ isTurn: true }), 38)).toEqual(["Bo", "5 cards", "Their turn", "38 s left"]);
    expect(seatLines(seat({ isTurn: true, isYou: true, strikes: 1 }), 7)).toEqual(["Bo", "5 cards", "Your turn", "7 s left", "Strike 1 of 3"]);
    expect(seatLines(seat({ occupant: "bot", name: "Bot 2", isTurn: true }))).toEqual(["Bot 2", "5 cards", "Their turn"]);
  });

  it("takes each seat's strikes from my table snapshot, which a visitor does not have", () => {
    const human = (n: number): SeatInfo => ({ occupant: "human", memberId: `m${n}`, name: `P${n + 1}`, ready: true, connected: true });
    const summary: TableSummary = { id: "spades-1", game: "spades", status: "lobby", seats: [human(0), human(1), human(2), human(3)], host: null, managerId: "m0", options: {} };
    const snapshot = { tableId: "spades-1" as const, game: "spades" as const, revision: 1, you: 0 as const, view: null, strikes: [0, 2, 0, 1] as [number, number, number, number] };
    expect(describeTable({ summary, snapshot, meId: "m0", selection: [] }).seats.map((s) => s.strikes)).toEqual([0, 2, 0, 1]);
    expect(describeTable({ summary, snapshot, meId: "visitor", selection: [] }).seats.map((s) => s.strikes)).toEqual([0, 0, 0, 0]);
  });
});
