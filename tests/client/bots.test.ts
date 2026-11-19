import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "../../shared/protocol";
import { botSeats } from "../../client/src/world/Bots";

const seat = (occupant: "open" | "human" | "bot") => ({ occupant, memberId: null, name: null, ready: false, connected: false });

describe("visible bots", () => {
  it("puts a bot figure in every seat a bot plays, at every table, named as the plates name them", () => {
    const room = {
      tables: [
        { id: "spades-1", seats: [seat("human"), seat("bot"), seat("bot"), seat("bot")] },
        { id: "tonk-1", seats: [seat("open"), seat("human"), seat("open"), seat("open")] },
        { id: "bid-whist-2", seats: [seat("bot"), seat("human"), seat("human"), seat("bot")] },
      ],
    } as unknown as RoomSnapshot;
    expect(botSeats(room)).toEqual([
      { tableId: "spades-1", seat: 1, name: "Bot 2" },
      { tableId: "spades-1", seat: 2, name: "Bot 3" },
      { tableId: "spades-1", seat: 3, name: "Bot 4" },
      { tableId: "bid-whist-2", seat: 0, name: "Bot 1" },
      { tableId: "bid-whist-2", seat: 3, name: "Bot 4" },
    ]);
  });

  it("draws none before a room is joined or while every table is in its lobby", () => {
    expect(botSeats(null)).toEqual([]);
    expect(botSeats({ tables: [{ id: "tonk-1", seats: [seat("human"), seat("open"), seat("open"), seat("open")] }] } as unknown as RoomSnapshot)).toEqual([]);
  });
});
