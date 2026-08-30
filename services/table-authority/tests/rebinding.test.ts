// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Adversarial regressions for seat rebinding and entitlement revalidation.
 *
 * Every snapshot, replay, broadcast and disconnect re-derives entitlement from
 * the table's current bindings. A socket that belonged to a seat's previous
 * occupant is revoked before the new occupant's projection can reach it, and
 * its later disconnect cannot change the new occupant's presence.
 */
import { describe, expect, it } from "vitest";

import { PROTOCOL_VERSION, type AuthorityMessage, type ClientMessage, type Role } from "../../../packages/protocol/src";
import { AuthoritySessions, staticDirectory, type Outbound } from "../src/session";
import { PARTICIPANTS, createTable, driveHand } from "./support";

const TOKENS = { south: "tok-south", newcomer: "tok-newcomer", north: "tok-north", host: "tok-host", spectator: "tok-spectator" } as const;
const NEWCOMER = "p-newcomer";

function sessionsFor(table = createTable({ seed: "rebinding", humans: ["south", "north"] })) {
  const directory = staticDirectory({
    [TOKENS.south]: { participantId: PARTICIPANTS.south, kind: "participant" },
    [TOKENS.newcomer]: { participantId: NEWCOMER, kind: "participant" },
    [TOKENS.north]: { participantId: PARTICIPANTS.north, kind: "participant" },
    [TOKENS.host]: { participantId: PARTICIPANTS.host, kind: "participant" },
    [TOKENS.spectator]: { participantId: PARTICIPANTS.spectator, kind: "participant" },
  });
  return { table, sessions: new AuthoritySessions({ directory, tables: new Map([[table.tableId, table]]) }) };
}

function hello(token: string, role: Role, lastVersion: number | null = null): ClientMessage {
  return { type: "hello", protocolVersion: PROTOCOL_VERSION, token, role, tableId: "table-1", displayName: "", lastVersion };
}

let counter = 0;
function intent(expectedVersion: number, body: Extract<ClientMessage, { type: "intent" }>["intent"]): ClientMessage {
  counter += 1;
  return { type: "intent", tableId: "table-1", intentId: `rebind-${counter}`, expectedVersion, intent: body };
}

function messagesFor(outbound: Outbound[], connectionId: string): AuthorityMessage[] {
  return outbound.filter((item) => item.connectionId === connectionId).map((item) => item.message);
}

function seatedNewcomer() {
  return { occupant: "human" as const, participantId: NEWCOMER, displayName: "Newcomer", connected: false };
}

describe("seat rebinding", () => {
  it("revokes the previous occupant's socket before the new occupant's hand can reach it", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("old", hello(TOKENS.south, "player"));
    sessions.handle("h", hello(TOKENS.host, "host"));
    expect(sessions.isBound("old")).toBe(true);

    const out = sessions.bindSeat("table-1", "south", seatedNewcomer());
    const oldMessages = out.filter((item) => item.connectionId === "old");
    expect(oldMessages).toHaveLength(1);
    expect(oldMessages[0].message).toEqual({ type: "error", code: "role-unavailable", detail: "entitlement revoked" });
    expect(oldMessages[0].closeAfter).toBe(true);
    expect(sessions.isBound("old")).toBe(false);
    expect(messagesFor(out, "h").some((m) => m.type === "projection" && m.projection.role === "host")).toBe(true);

    // Anything the old socket still sends is refused; no projection is built for it.
    const late = sessions.handle("old", intent(table.currentVersion, { kind: "cancel" }));
    expect(late.map((item) => item.message)).toEqual([{ type: "error", code: "not-welcomed", detail: "" }]);
    expect(table.snapshot("player", "south", PARTICIPANTS.south)).toBeNull();

    const joined = sessions.handle("new", hello(TOKENS.newcomer, "player"));
    const welcome = messagesFor(joined, "new")[0];
    expect(welcome.type === "welcome" && welcome.seat).toBe("south");
    expect(welcome.type === "welcome" && welcome.projection?.role === "player" && welcome.projection.hand.length).toBe(12);
    expect(messagesFor(joined, "old")).toEqual([]);
  });

  it("does not let the previous occupant's disconnect change the new occupant's presence", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("old", hello(TOKENS.south, "player"));
    sessions.handle("h", hello(TOKENS.host, "host"));
    sessions.bindSeat("table-1", "south", seatedNewcomer());
    sessions.handle("new", hello(TOKENS.newcomer, "player"));
    const binding = table.seatBinding("south");
    expect(binding.occupant === "human" && binding.connected).toBe(true);
    const version = table.currentVersion;

    const dropped = sessions.disconnect("old");
    expect(dropped).toEqual([]);
    const after = table.seatBinding("south");
    expect(after.occupant === "human" && after.participantId).toBe(NEWCOMER);
    expect(after.occupant === "human" && after.connected).toBe(true);
    expect(table.currentVersion).toBe(version);

    // The table itself refuses presence writes from a non-owner as well.
    expect(table.setSeatPresence("south", PARTICIPANTS.south, false, null)).toBeNull();
  });

  it("never replays frames that were built for a previous occupant", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("old", hello(TOKENS.south, "player"));
    const seenBefore = table.currentVersion;
    // The previous occupant plays a whole hand; every frame of it carries that occupant's hand.
    driveHand(table, ["south", "north"]);
    expect(table.currentVersion).toBeGreaterThan(seenBefore + 5);
    const rebound = sessions.bindSeat("table-1", "south", seatedNewcomer());
    expect(rebound.some((item) => item.connectionId === "old" && item.closeAfter)).toBe(true);
    const rebindVersion = table.currentVersion;

    const joined = sessions.handle("new", hello(TOKENS.newcomer, "player", seenBefore));
    const replay = messagesFor(joined, "new").find((m) => m.type === "replay");
    expect(replay?.type).toBe("replay");
    if (replay?.type !== "replay") return;
    // Frames from before the rebinding carried the previous occupant's hand and are withheld;
    // only frames built for the newcomer (the rebind frame and its own presence frame) come back.
    expect(replay.frames.length).toBeGreaterThan(0);
    expect(replay.frames.every((frame) => frame.version >= rebindVersion)).toBe(true);
    expect(replay.frames.map((frame) => frame.version)).toEqual(
      Array.from({ length: table.currentVersion - rebindVersion + 1 }, (_, index) => rebindVersion + index),
    );
    replay.frames.forEach((frame) => {
      expect(frame.projection.role).toBe("player");
      expect(frame.projection.seats.find((seat) => seat.seat === "south")?.displayName).toBe("Newcomer");
    });
    expect(table.replayFrames("player", "south", PARTICIPANTS.south, seenBefore).frames).toEqual([]);
  });

  it("revokes the substituted participant's player connection atomically with the host's intent", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("p", hello(TOKENS.south, "player"));
    sessions.handle("n", hello(TOKENS.north, "player"));
    sessions.handle("h", hello(TOKENS.host, "host"));
    driveHand(table, ["south", "north"]);

    const out = sessions.handle("h", intent(table.currentVersion, { kind: "host-substitute", seat: "north" }));
    const north = out.filter((item) => item.connectionId === "n");
    expect(north).toHaveLength(1);
    expect(north[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(north[0].closeAfter).toBe(true);
    expect(sessions.isBound("n")).toBe(false);
    expect(messagesFor(out, "p").some((m) => m.type === "projection" && m.projection.role === "player" && m.projection.seat === "south")).toBe(true);
    expect(messagesFor(out, "h").some((m) => m.type === "dealer-cue" && m.frame.cue === "seat-substituted")).toBe(true);
    expect(sessions.handle("n2", hello(TOKENS.north, "player"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
  });

  it("revokes the previous host connection when hosting is transferred", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("p", hello(TOKENS.south, "player"));
    sessions.handle("h", hello(TOKENS.host, "host"));
    const out = sessions.handle("h", intent(table.currentVersion, { kind: "host-transfer", participantId: PARTICIPANTS.south }));
    const host = out.filter((item) => item.connectionId === "h");
    expect(host[0].message.type).toBe("receipt");
    expect(host[host.length - 1].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(host[host.length - 1].closeAfter).toBe(true);
    expect(sessions.isBound("h")).toBe(false);
    expect(sessions.handle("h2", hello(TOKENS.host, "host"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("sh", hello(TOKENS.south, "host"))[0].message.type).toBe("welcome");
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
