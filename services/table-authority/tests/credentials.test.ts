// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Adversarial regressions for credential kinds. A dealer-kind credential can
 * never obtain a player, host or public projection, even when its participant
 * identity collides with an entitled identity; a participant-kind credential
 * can never act as the dealer.
 */
import { describe, expect, it } from "vitest";

import { PROTOCOL_VERSION, type ClientMessage, type Role } from "../../../packages/protocol/src";
import { AuthoritySessions, staticDirectory } from "../src/session";
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
import { PARTICIPANTS, createTable, nextIntentId } from "./support";
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

const COLLIDING_DEALER_TOKEN = "tok-dealer-as-south";
const COLLIDING_HOST_DEALER_TOKEN = "tok-dealer-as-host";

function sessionsFor() {
  const table = createTable({ seed: "credentials", humans: ["south"] });
  const directory = staticDirectory({
    "tok-south": { participantId: PARTICIPANTS.south, kind: "participant" },
    "tok-host": { participantId: PARTICIPANTS.host, kind: "participant" },
    [COLLIDING_DEALER_TOKEN]: { participantId: PARTICIPANTS.south, kind: "dealer" },
    [COLLIDING_HOST_DEALER_TOKEN]: { participantId: PARTICIPANTS.host, kind: "dealer" },
    "tok-dealer": { participantId: PARTICIPANTS.dealer, kind: "dealer" },
  });
  return { table, sessions: new AuthoritySessions({ directory, tables: new Map([[table.tableId, table]]) }) };
}

function hello(token: string, role: Role): ClientMessage {
  return { type: "hello", protocolVersion: PROTOCOL_VERSION, token, role, tableId: "table-1", displayName: "", lastVersion: null };
}

describe("credential kinds", () => {
  it("fails closed for a dealer credential whose identity collides with the seated player", () => {
    const { sessions } = sessionsFor();
    for (const role of ["player", "host", "public"] as Role[]) {
      const out = sessions.handle(`collide-${role}`, hello(COLLIDING_DEALER_TOKEN, role));
      expect(out).toHaveLength(1);
      expect(out[0].message).toEqual({ type: "error", code: "role-unavailable", detail: "credential kind does not match role" });
      expect(sessions.isBound(`collide-${role}`)).toBe(false);
    }
    // The same identity with a participant credential is entitled as before.
    expect(sessions.handle("legit", hello("tok-south", "player"))[0].message.type).toBe("welcome");
  });

  it("fails closed for a dealer credential whose identity collides with the host", () => {
    const { sessions } = sessionsFor();
    expect(sessions.handle("dh", hello(COLLIDING_HOST_DEALER_TOKEN, "host"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("dp", hello(COLLIDING_HOST_DEALER_TOKEN, "public"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    const asDealer = sessions.handle("dd", hello(COLLIDING_HOST_DEALER_TOKEN, "dealer"))[0].message;
    expect(asDealer.type).toBe("welcome");
    expect(asDealer.type === "welcome" && asDealer.projection).toBeNull();
    expect(asDealer.type === "welcome" && asDealer.role).toBe("dealer");
  });

  it("never lets a participant credential take the dealer role", () => {
    const { sessions } = sessionsFor();
    expect(sessions.handle("x", hello("tok-south", "dealer"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("y", hello("tok-host", "dealer"))[0].message).toMatchObject({ type: "error", code: "role-unavailable" });
    expect(sessions.handle("z", hello("tok-dealer", "dealer"))[0].message.type).toBe("welcome");
  });

  it("keeps a dealer-role connection projection-free even after authoritative changes", () => {
    const { table, sessions } = sessionsFor();
    sessions.handle("d", hello("tok-dealer", "dealer"));
    sessions.handle("p", hello("tok-south", "player"));
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
    const out = sessions.handle("p", {
      type: "intent",
      tableId: "table-1",
      intentId: nextIntentId(table, "south"),
      expectedVersion: table.currentVersion,
      intent: { kind: "preview", selection: { type: "pass" } },
    });
    const confirmed = sessions.handle("p", {
      type: "intent",
      tableId: "table-1",
      intentId: nextIntentId(table, "south"),
      expectedVersion: table.currentVersion,
      intent: { kind: "confirm" },
    });
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
    const dealerMessages = [...out, ...confirmed].filter((item) => item.connectionId === "d").map((item) => item.message);
    expect(dealerMessages.length).toBeGreaterThan(0);
    expect(dealerMessages.every((message) => message.type === "dealer-cue")).toBe(true);
  });

  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
  it("refuses a colliding dealer credential's use of the seated player's exact identity before any lane lookup, leaving every lane byte unchanged", () => {
    const { table, sessions } = sessionsFor();
    const asDealer = sessions.handle("dd", hello(COLLIDING_DEALER_TOKEN, "dealer"))[0].message;
    expect(asDealer.type).toBe("welcome");
    // The dealer-kind welcome carries a connection identifier, never the seat's lane grant, and no counter.
    expect(asDealer.type === "welcome" && asDealer.sessionId).not.toBe(table.laneGrant("south"));
    expect(asDealer.type === "welcome" && asDealer.nextIntentCounter).toBeNull();
    expect(sessions.handle("p", hello("tok-south", "player"))[0].message.type).toBe("welcome");

    const identity = nextIntentId(table, "south");
    const lanes = JSON.stringify(table.intentLanes());
    const out = sessions.handle("dd", { type: "intent", tableId: "table-1", intentId: identity, expectedVersion: table.currentVersion, intent: { kind: "preview", selection: { type: "pass" } } });
    expect(out).toHaveLength(1);
    expect(out[0].message).toMatchObject({ type: "receipt", receipt: { intentId: identity, outcome: "rejected", code: "unauthorized-role", committed: false } });
    expect(JSON.stringify(table.intentLanes())).toBe(lanes);
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(0);

    // The entitled player still holds the exact next counter under its own grant, and the dealer sees none of it.
    const own = sessions.handle("p", { type: "intent", tableId: "table-1", intentId: identity, expectedVersion: table.currentVersion, intent: { kind: "preview", selection: { type: "pass" } } });
    expect(own.map((item) => item.connectionId)).toEqual(["p", "p"]);
    expect(own[0].message).toMatchObject({ type: "receipt", receipt: { intentId: identity, outcome: "accepted" } });
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(1);
  });
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
