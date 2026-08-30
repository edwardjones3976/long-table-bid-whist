// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import {
  AUTHORITY_MESSAGE,
  PROTOCOL_VERSION,
  decodeAuthorityMessage,
  encodeClientMessage,
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

  it("welcomes each role with its own snapshot and nothing concealed", () => {
    const { sessions } = sessionsFor();
    const player = sessions.handle("p", hello(TOKENS.south, "player"))[0].message;
    const host = sessions.handle("h", hello(TOKENS.host, "host"))[0].message;
    const pub = sessions.handle("s", hello(TOKENS.spectator, "public"))[0].message;
    const dealer = sessions.handle("d", hello(TOKENS.dealer, "dealer"))[0].message;
    expect(player.type === "welcome" && player.seat).toBe("south");
    expect(player.type === "welcome" && player.projection?.role).toBe("player");
    expect(host.type === "welcome" && host.projection?.role).toBe("host");
    expect(host.type === "welcome" && host.projection && "hand" in host.projection).toBe(false);
    expect(pub.type === "welcome" && pub.projection?.role).toBe("public");
    expect(pub.type === "welcome" && pub.projection && "legalChoices" in pub.projection).toBe(false);
    expect(dealer.type === "welcome" && dealer.projection).toBeNull();
    [player, host, pub, dealer].forEach((message) => expect(AUTHORITY_MESSAGE.decode(message, "m").ok).toBe(true));
  });

  it("refuses intents before hello", () => {
    const { sessions } = sessionsFor();
    const out = sessions.handle("ghost", intent("table-1", 1, { kind: "cancel" }));
    expect(out[0].message).toMatchObject({ type: "error", code: "not-welcomed" });
  });
});

describe("sessions — broadcast, reconnect and replay", () => {
  it("routes each role its projection and every connection the dealer cues", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("p", hello(TOKENS.south, "player"));
    sessions.handle("n", hello(TOKENS.north, "player"));
    sessions.handle("h", hello(TOKENS.host, "host"));
    sessions.handle("s", hello(TOKENS.spectator, "public"));
    sessions.handle("d", hello(TOKENS.dealer, "dealer"));

    const version = table.currentVersion;
    sessions.handle("p", intent("table-1", version, { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } }));
    const out = sessions.handle("p", intent("table-1", version + 1, { kind: "confirm" }));

    const south = messagesFor(out, "p");
    expect(south[0]).toMatchObject({ type: "receipt", receipt: { committed: true } });
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
    expect(own[0].type === "welcome" && own[0].projection?.seats.find((seat) => seat.seat === "south")?.connected).toBe(true);
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
    expect(handleClose(sessions, "c")).toEqual([]);
    expect(sessions.connectionCount()).toBe(0);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
