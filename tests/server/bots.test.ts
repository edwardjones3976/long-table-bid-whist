/**
 * Bots as people: a seat a bot plays carries a random look, cleaned, that stays while it stays a bot and is new for a
 * new bot; every room has its walkers, each with its own look and loop, the same for everyone. Neither carries
 * anything about cards.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanLook } from "../../shared/avatar";
import { WALKERS, type RoomSnapshot, type SeatInfo } from "../../shared/protocol";
import { Rooms } from "../../server/rooms";

let rooms: Rooms;
/** The latest room snapshot each member was sent. */
let seen: Map<string, RoomSnapshot>;

beforeEach(() => {
  vi.useFakeTimers();
  seen = new Map();
  rooms = new Rooms((memberId, event, payload) => void (event === "room" && seen.set(memberId, payload as RoomSnapshot)));
});

afterEach(() => {
  rooms.close();
  vi.useRealTimers();
});

function arrive(name: string, code?: string): string {
  const { memberId } = code ? rooms.join(code, name) : rooms.create(name);
  rooms.connected(memberId);
  return memberId;
}

const seatsOf = (memberId: string): SeatInfo[] => seen.get(memberId)!.tables.find((table) => table.id === "spades-1")!.seats;

describe("bot seats", () => {
  it("get a cleaned random look that stays while the seat stays a bot, and a new one for a new bot", () => {
    const ada = arrive("Ada");
    const code = seen.get(ada)!.code;
    const bo = arrive("Bo", code);
    rooms.sit(ada, { tableId: "spades-1", role: "player", seat: 0 });
    rooms.sit(bo, { tableId: "spades-1", role: "player", seat: 1 });
    expect(seatsOf(ada).every((seat) => !("look" in seat))).toBe(true);
    rooms.ready(ada, true);
    rooms.ready(bo, true);
    rooms.start(ada);

    const first = seatsOf(ada);
    expect(first.map((seat) => seat.occupant)).toEqual(["human", "human", "bot", "bot"]);
    expect(first.slice(0, 2).every((seat) => !("look" in seat))).toBe(true);
    for (const seat of first.slice(2)) expect(seat.look).toEqual(cleanLook(seat.look));
    expect(first[2].look).not.toEqual(first[3].look);
    // Everyone sees the same bots.
    expect(seatsOf(bo)).toEqual(first);

    // Another snapshot (someone arrives): the bots keep their looks.
    arrive("Cy", code);
    expect(seatsOf(ada).slice(2)).toEqual(first.slice(2));

    // Bo leaves mid-match: his seat becomes a bot with a look of its own; the others keep theirs.
    rooms.stand(bo);
    const second = seatsOf(ada);
    expect(second[1]).toMatchObject({ occupant: "bot", memberId: null });
    expect(second[1].look).toEqual(cleanLook(second[1].look));
    expect(second.slice(2)).toEqual(first.slice(2));

    // The match is dropped: the seats are open again and lose their looks. The next match brings new bots.
    rooms.reset(ada);
    expect(seatsOf(ada).slice(1).map((seat) => [seat.occupant, "look" in seat])).toEqual([
      ["open", false],
      ["open", false],
      ["open", false],
    ]);
    rooms.ready(ada, true);
    rooms.start(ada);
    const third = seatsOf(ada);
    for (const s of [1, 2, 3]) {
      expect(third[s].look).toEqual(cleanLook(third[s].look));
      expect(third[s].look).not.toEqual(second[s].look);
    }
  });
});

describe("walkers", () => {
  it(`are ${WALKERS} per room, each with its own cleaned look and loop, the same for everyone and kept`, () => {
    const ada = arrive("Ada");
    const walkers = seen.get(ada)!.walkers!;
    expect(walkers.map(({ id, name, loop }) => ({ id, name, loop }))).toEqual([
      { id: "walker-1", name: "Walker 1", loop: 0 },
      { id: "walker-2", name: "Walker 2", loop: 1 },
      { id: "walker-3", name: "Walker 3", loop: 2 },
    ]);
    for (const walker of walkers) {
      expect(walker.look).toEqual(cleanLook(walker.look));
      expect(walker.since).toBe(Date.now());
    }
    expect(new Set(walkers.map((walker) => JSON.stringify(walker.look))).size).toBe(WALKERS);

    vi.advanceTimersByTime(5000);
    const bo = arrive("Bo", seen.get(ada)!.code);
    expect(seen.get(bo)!.walkers).toEqual(walkers);
    expect(seen.get(ada)!.walkers).toEqual(walkers);
    // They are not members, and another room has walkers of its own.
    expect(seen.get(ada)!.members.map((member) => member.name)).toEqual(["Ada", "Bo"]);
    const other = arrive("Di");
    expect(seen.get(other)!.walkers!.map((walker) => walker.look)).not.toEqual(walkers.map((walker) => walker.look));
  });

  it("are as many as the server is set to, and never more than there are loops", () => {
    for (const [asked, made] of [[0, 0], [1, 1], [WALKERS + 2, WALKERS]]) {
      rooms.close();
      rooms = new Rooms((memberId, event, payload) => void (event === "room" && seen.set(memberId, payload as RoomSnapshot)), { walkers: asked });
      expect(seen.get(arrive("Ada"))!.walkers, `asked ${asked}`).toHaveLength(made);
    }
  });
});

describe("nothing about cards", () => {
  it("rides on a bot seat or a walker", () => {
    const ada = arrive("Ada");
    rooms.sit(ada, { tableId: "spades-1", role: "player", seat: 0 });
    rooms.ready(ada, true);
    rooms.start(ada);
    const snapshot = seen.get(ada)!;
    const lookFields = Object.keys(cleanLook({})).sort();
    const bot = seatsOf(ada)[1];
    expect(Object.keys(bot).sort()).toEqual(["connected", "look", "memberId", "name", "occupant", "ready"]);
    expect(Object.keys(bot.look!).sort()).toEqual(lookFields);
    for (const walker of snapshot.walkers!) {
      expect(Object.keys(walker).sort()).toEqual(["id", "look", "loop", "name", "since"]);
      expect(Object.keys(walker.look).sort()).toEqual(lookFields);
    }
  });
});
