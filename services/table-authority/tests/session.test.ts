// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import {
  AUTHORITY_MESSAGE,
  PROTOCOL_VERSION,
  decodeAuthorityMessage,
  encodeClientMessage,
  matchesInventory,
  type AuthorityMessage,
  type ClientMessage,
  type Role,
} from "../../../packages/protocol/src";
import { AuthoritySessions, staticDirectory, type Outbound } from "../src/session";
import { handleClose, handleText } from "../src/wire";
import { PARTICIPANTS, createTable } from "./support";

const TOKENS = {
  south: "tok-south",
  north: "tok-north",
  host: "tok-host",
  spectator: "tok-spectator",
  dealer: "tok-dealer",
} as const;

function sessionsFor(table = createTable({ seed: "sessions", humans: ["south", "north"] })) {
  const directory = staticDirectory({
    [TOKENS.south]: { participantId: PARTICIPANTS.south, kind: "participant" },
    [TOKENS.north]: { participantId: PARTICIPANTS.north, kind: "participant" },
    [TOKENS.host]: { participantId: PARTICIPANTS.host, kind: "participant" },
    [TOKENS.spectator]: { participantId: PARTICIPANTS.spectator, kind: "participant" },
    [TOKENS.dealer]: { participantId: PARTICIPANTS.dealer, kind: "dealer" },
  });
  const sessions = new AuthoritySessions({ directory, tables: new Map([[table.tableId, table]]) });
  return { table, sessions };
}

function hello(token: string, role: Role, lastVersion: number | null = null, tableId = "table-1"): ClientMessage {
  return { type: "hello", protocolVersion: PROTOCOL_VERSION, token, role, tableId, displayName: "", lastVersion };
}

let intentCounter = 0;
function intent(tableId: string, expectedVersion: number, body: Extract<ClientMessage, { type: "intent" }>["intent"]): ClientMessage {
  intentCounter += 1;
  return { type: "intent", tableId, intentId: `session-intent-${intentCounter}`, expectedVersion, intent: body };
}

function messagesFor(outbound: Outbound[], connectionId: string): AuthorityMessage[] {
  return outbound.filter((item) => item.connectionId === connectionId).map((item) => item.message);
}

describe("sessions — authentication and entitlement", () => {
  it("accepts a token only by exact match", () => {
    const { sessions } = sessionsFor();
    expect(sessions.handle("c1", hello(TOKENS.south, "player"))[0].message.type).toBe("welcome");
    expect(sessions.handle("c2", hello(`${TOKENS.south} `, "player"))[0].message).toEqual({ type: "error", code: "unauthenticated", detail: "" });
    expect(sessions.handle("c3", hello("tok-sou", "player"))[0].message).toEqual({ type: "error", code: "unauthenticated", detail: "" });
    expect(sessions.handle("c4", hello("", "player"))[0].message.type).toBe("error");
  });

  it("grants a role only when the table entitles the participant to it", () => {
    const { sessions } = sessionsFor();
    expect(sessions.handle("c1", hello(TOKENS.spectator, "player"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("c2", hello(TOKENS.south, "host"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("c3", hello(TOKENS.south, "dealer"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("c4", hello(TOKENS.dealer, "public"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("c5", hello(TOKENS.host, "player", null, "table-9"))[0].message).toMatchObject({ type: "error", code: "unknown-table" });
    expect(sessions.handle("c6", hello(TOKENS.host, "host"))[0].message.type).toBe("welcome");
    expect(sessions.handle("c7", hello(TOKENS.spectator, "public"))[0].message.type).toBe("welcome");
    expect(sessions.handle("c8", hello(TOKENS.dealer, "dealer"))[0].message.type).toBe("welcome");
  });

  it("welcomes each role with exactly its own role-discriminated shape", () => {
    const { sessions } = sessionsFor();
    const player = sessions.handle("p", hello(TOKENS.south, "player"))[0].message;
    const host = sessions.handle("h", hello(TOKENS.host, "host"))[0].message;
    const pub = sessions.handle("s", hello(TOKENS.spectator, "public"))[0].message;
    const dealer = sessions.handle("d", hello(TOKENS.dealer, "dealer"))[0].message;
    expect(player.type === "welcome" && player.role === "player" && player.seat).toBe("south");
    expect(player.type === "welcome" && player.role === "player" && matchesInventory("PlayerProjection", player.projection)).toBe(true);
    expect(host.type === "welcome" && host.role === "host" && host.seat).toBeNull();
    expect(host.type === "welcome" && host.role === "host" && matchesInventory("HostProjection", host.projection)).toBe(true);
    expect(pub.type === "welcome" && pub.role === "public" && pub.seat).toBeNull();
    expect(pub.type === "welcome" && pub.role === "public" && matchesInventory("PublicProjection", pub.projection)).toBe(true);
    expect(dealer.type === "welcome" && dealer.role === "dealer" && dealer.seat).toBeNull();
    expect(dealer.type === "welcome" && dealer.projection).toBeNull();
    [player, host, pub, dealer].forEach((message) => {
      expect(AUTHORITY_MESSAGE.decode(message, "m").ok).toBe(true);
      expect(matchesInventory("WelcomeMessage", message)).toBe(true);
    });
  });

  it("refuses intents before hello", () => {
    const { sessions } = sessionsFor();
    const out = sessions.handle("ghost", intent("table-1", 1, { kind: "cancel" }));
    expect(out[0].message).toMatchObject({ type: "error", code: "not-welcomed" });
  });
});

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
describe("sessions — connection binding and replacement", () => {
  it("rejects and policy-closes a second hello on an already bound connection without overwriting it or leaving ghost presence", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("h", hello(TOKENS.host, "host"));
    const first = sessions.handle("p", hello(TOKENS.south, "player"));
    expect(first[0].message.type).toBe("welcome");
    const south = table.seatBinding("south");
    expect(south.occupant === "human" && south.connected).toBe(true);
    const version = table.currentVersion;

    // A second hello on the same connection — even for another role — is refused and the socket is policy-closed.
    for (const attempt of [hello(TOKENS.south, "player"), hello(TOKENS.north, "player"), hello(TOKENS.host, "host")]) {
      const out = sessions.handle("p", attempt);
      expect(out).toHaveLength(1);
      expect(out[0]).toEqual({ connectionId: "p", message: { type: "error", code: "role-unavailable", detail: "connection already bound" }, closeAfter: true });
    }
    // Nothing was overwritten: the binding, the seat and the presence are as before.
    expect(sessions.connectionCount()).toBe(2);
    expect(sessions.isBound("p")).toBe(true);
    expect(table.seatOf(PARTICIPANTS.south)).toBe("south");
    expect(table.seatOf(PARTICIPANTS.north)).toBe("north");
    expect(table.currentVersion).toBe(version);
    const still = table.seatBinding("south");
    expect(still.occupant === "human" && still.participantId).toBe(PARTICIPANTS.south);
    expect(still.occupant === "human" && still.connected).toBe(true);

    // The transport's close path retires the presence normally: no ghost seat survives.
    const closed = sessions.disconnect("p");
    expect(sessions.connectionCount()).toBe(1);
    expect(sessions.isBound("p")).toBe(false);
    const after = table.seatBinding("south");
    expect(after.occupant === "human" && after.connected).toBe(false);
    expect(messagesFor(closed, "h").some((m) => m.type === "projection" && m.projection.seats.find((seat) => seat.seat === "south")?.connected === false)).toBe(true);
  });

  it("replaces an earlier connection of the same participant and role atomically, closing the replaced socket and keeping presence", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("h", hello(TOKENS.host, "host"));
    sessions.handle("p1", hello(TOKENS.south, "player"));
    const version = table.currentVersion;

    const out = sessions.handle("p2", hello(TOKENS.south, "player"));
    const replaced = out.filter((item) => item.connectionId === "p1");
    expect(replaced).toHaveLength(1);
    expect(replaced[0]).toEqual({ connectionId: "p1", message: { type: "error", code: "role-unavailable", detail: "replaced by a newer connection" }, closeAfter: true });
    const own = messagesFor(out, "p2");
    expect(own[0].type).toBe("welcome");
    expect(own[0].type === "welcome" && own[0].role === "player" && own[0].seat).toBe("south");
    expect(sessions.isBound("p1")).toBe(false);
    expect(sessions.isBound("p2")).toBe(true);
    expect(sessions.connectionCount()).toBe(2);

    // Presence stayed with the seat: no disconnect/reconnect flap reached the host.
    const binding = table.seatBinding("south");
    expect(binding.occupant === "human" && binding.connected).toBe(true);
    expect(table.currentVersion).toBe(version);
    expect(messagesFor(out, "h").every((m) => m.type !== "projection")).toBe(true);

    // The replaced raw socket closing later cannot retire the new connection's presence.
    expect(sessions.disconnect("p1")).toEqual([]);
    const after = table.seatBinding("south");
    expect(after.occupant === "human" && after.connected).toBe(true);
    expect(sessions.isBound("p2")).toBe(true);

    // Anything the replaced socket still sends is refused.
    expect(sessions.handle("p1", intent("table-1", table.currentVersion, { kind: "cancel" }))[0].message).toMatchObject({ type: "error", code: "not-welcomed" });
    expect(sessions.handle("p2", intent("table-1", table.currentVersion, { kind: "cancel" }))[0].message.type).toBe("receipt");
  });

  it("lets one participant hold different roles on different connections without replacement", () => {
    const table = createTable({ seed: "sessions-roles", humans: ["south"], host: PARTICIPANTS.south });
    const { sessions } = sessionsFor(table);
    expect(sessions.handle("as-player", hello(TOKENS.south, "player"))[0].message.type).toBe("welcome");
    const out = sessions.handle("as-host", hello(TOKENS.south, "host"));
    expect(messagesFor(out, "as-player")).toEqual([]);
    expect(messagesFor(out, "as-host")[0].type).toBe("welcome");
    expect(sessions.connectionCount()).toBe(2);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

describe("sessions — broadcast, reconnect and replay", () => {
  it("delivers a player-local preview to its seat alone and an authoritative commit to every role", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("p", hello(TOKENS.south, "player"));
    sessions.handle("n", hello(TOKENS.north, "player"));
    sessions.handle("h", hello(TOKENS.host, "host"));
    sessions.handle("s", hello(TOKENS.spectator, "public"));
    sessions.handle("d", hello(TOKENS.dealer, "dealer"));

    const version = table.currentVersion;
    const previewed = sessions.handle("p", intent("table-1", version, { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } }));
    expect(messagesFor(previewed, "p").map((m) => m.type)).toEqual(["receipt", "projection"]);
    expect(messagesFor(previewed, "p")[1]).toMatchObject({ type: "projection", version, projection: { role: "player", seat: "south", previewLabel: "3 High" } });
    ["n", "h", "s", "d"].forEach((other) => expect(messagesFor(previewed, other)).toEqual([]));
    expect(table.currentVersion).toBe(version);

    const out = sessions.handle("p", intent("table-1", version, { kind: "confirm" }));
    const south = messagesFor(out, "p");
    expect(south[0]).toMatchObject({ type: "receipt", receipt: { committed: true, version: version + 1 } });
    expect(south.some((m) => m.type === "projection" && m.projection.role === "player" && m.projection.seat === "south")).toBe(true);
    expect(messagesFor(out, "n").some((m) => m.type === "projection" && m.projection.role === "player" && m.projection.seat === "north")).toBe(true);
    expect(messagesFor(out, "h").some((m) => m.type === "projection" && m.projection.role === "host")).toBe(true);
    expect(messagesFor(out, "s").some((m) => m.type === "projection" && m.projection.role === "public")).toBe(true);
    const dealer = messagesFor(out, "d");
    expect(dealer.length).toBeGreaterThan(0);
    expect(dealer.every((m) => m.type === "dealer-cue")).toBe(true);
    expect(messagesFor(out, "h").some((m) => m.type === "dealer-cue")).toBe(true);
    // A host connection never receives a player projection, whatever the seat.
    expect(messagesFor(out, "h").every((m) => m.type !== "projection" || m.projection.role === "host")).toBe(true);
  });

  it("marks a seat disconnected for the others and reconnects with a snapshot plus replay", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("p1", hello(TOKENS.south, "player"));
    sessions.handle("h", hello(TOKENS.host, "host"));
    const seenByPlayer = table.currentVersion;

    const dropped = sessions.disconnect("p1");
    const hostView = messagesFor(dropped, "h").find((m) => m.type === "projection");
    expect(hostView?.type === "projection" && hostView.projection.seats.find((seat) => seat.seat === "south")?.connected).toBe(false);
    expect(sessions.connectionCount()).toBe(1);

    // The table moves on while South is away.
    const version = table.currentVersion;
    const announced = sessions.handle("h", intent("table-1", version, { kind: "host-announce", cue: "pause-shortly" }));
    expect(messagesFor(announced, "p1")).toEqual([]);

    const back = sessions.handle("p2", hello(TOKENS.south, "player", seenByPlayer));
    const own = messagesFor(back, "p2");
    expect(own[0].type).toBe("welcome");
    expect(own[0].type === "welcome" && own[0].version).toBe(table.currentVersion);
    expect(own[0].type === "welcome" && own[0].role === "player" && own[0].projection.seats.find((seat) => seat.seat === "south")?.connected).toBe(true);
    const replay = own[1];
    expect(replay.type).toBe("replay");
    if (replay.type === "replay") {
      expect(replay.fromVersion).toBe(seenByPlayer);
      expect(replay.toVersion).toBe(table.currentVersion);
      expect(replay.truncated).toBe(false);
      expect(replay.frames.map((frame) => frame.version)).toEqual(
        Array.from({ length: table.currentVersion - seenByPlayer }, (_, index) => seenByPlayer + 1 + index),
      );
      replay.frames.forEach((frame) => expect(frame.projection.role).toBe("player"));
    }
    expect(messagesFor(back, "h").some((m) => m.type === "projection")).toBe(true);
    expect(sessions.connectionCount()).toBe(2);
  });

  it("answers a resync with the missing frames and a fresh snapshot", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("p", hello(TOKENS.south, "player"));
    const seen = table.currentVersion;
    sessions.handle("p", intent("table-1", seen, { kind: "preview", selection: { type: "pass" } }));
    const out = sessions.handle("p", { type: "resync", tableId: "table-1", lastVersion: seen });
    expect(out.map((item) => item.message.type)).toEqual(["replay", "projection"]);
    expect(out[1].message.type === "projection" && out[1].message.projection.role === "player" && out[1].message.projection.previewLabel).toBe("Pass");
  });
});

describe("wire — closed decode and canonical encode", () => {
  it("rejects malformed and non-closed frames without touching the session", () => {
    const { sessions } = sessionsFor();
    expect(JSON.parse(handleText(sessions, "c", "{not json")[0].text)).toMatchObject({ type: "error", code: "schema-rejected" });
    const extra = JSON.parse(handleText(sessions, "c", JSON.stringify({ ...hello(TOKENS.south, "player"), hand: [] }))[0].text);
    expect(extra).toEqual({ type: "error", code: "schema-rejected", detail: "unknown-field at client.hand" });
    const missing = JSON.parse(handleText(sessions, "c", JSON.stringify({ type: "hello", token: TOKENS.south }))[0].text);
    expect(missing).toMatchObject({ type: "error", code: "schema-rejected" });
    const badRole = JSON.parse(handleText(sessions, "c", JSON.stringify({ ...hello(TOKENS.south, "player"), role: "admin" }))[0].text);
    expect(badRole).toEqual({ type: "error", code: "schema-rejected", detail: "value-out-of-range at client.role" });
    expect(sessions.connectionCount()).toBe(0);
  });

  it("round-trips a hello and a receipt through canonical text", () => {
    const { sessions } = sessionsFor();
    const out = handleText(sessions, "c", encodeClientMessage(hello(TOKENS.south, "player")));
    const decoded = decodeAuthorityMessage(out[0].text);
    expect(decoded.ok && decoded.value.type).toBe("welcome");
    expect(out[0].closeAfter).toBe(false);
    expect(handleClose(sessions, "c")).toEqual([]);
    expect(sessions.connectionCount()).toBe(0);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
