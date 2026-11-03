// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Adversarial regressions for player-local state. Preview, toggle-discard and
 * cancel change only the acting seat's own projection: the shared version,
 * the host and public canonical bytes and the replay history are unchanged.
 */
import { describe, expect, it } from "vitest";

import { HOST_PROJECTION, PUBLIC_PROJECTION, canonicalJson } from "../../../packages/protocol/src";
import { PARTICIPANTS, createTable, driveUntil, playerActor, playerSnapshot, submit } from "./support";

function hostBytes(table: ReturnType<typeof createTable>): string {
  const projection = table.snapshot("host", null, PARTICIPANTS.host);
  if (!projection || projection.role !== "host") throw new Error("no host projection");
  return canonicalJson(HOST_PROJECTION, projection);
}

function publicBytes(table: ReturnType<typeof createTable>): string {
  const projection = table.snapshot("public", null, PARTICIPANTS.spectator);
  if (!projection || projection.role !== "public") throw new Error("no public projection");
  return canonicalJson(PUBLIC_PROJECTION, projection);
}

describe("player-local preview state", () => {
  it("leaves host and public canonical bytes, the shared version and the replay history unchanged", () => {
    const table = createTable({ seed: "local-preview" });
    const version = table.currentVersion;
    const host = hostBytes(table);
    const pub = publicBytes(table);
    const history = table.replayFrames("public", null, PARTICIPANTS.spectator, 0).frames.length;
    const ownBefore = playerSnapshot(table, "south");

    const preview = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 4, mode: "high" } } });
    const cancel = submit(table, playerActor("south"), { kind: "cancel" });
    const again = submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } });

    [preview, cancel, again].forEach((result) => {
      expect(result.receipt.outcome).toBe("accepted");
      expect(result.receipt.committed).toBe(false);
      expect(result.receipt.version).toBe(version);
      expect(result.frame).toBeNull();
      expect(result.seatUpdate?.seat).toBe("south");
    });
    expect(table.currentVersion).toBe(version);
    expect(hostBytes(table)).toBe(host);
    expect(publicBytes(table)).toBe(pub);
    expect(table.replayFrames("public", null, PARTICIPANTS.spectator, 0).frames.length).toBe(history);
    expect(table.replayFrames("player", "south", PARTICIPANTS.south, 0).frames.length).toBe(history);

    const own = playerSnapshot(table, "south");
    expect(own.version).toBe(version);
    expect(own.uncommittedRevision).toBe(ownBefore.uncommittedRevision + 3);
    expect(own.previewLabel).toBe("Pass");
    expect(preview.seatUpdate?.projection.previewLabel).toBe("4 High");
    expect(cancel.seatUpdate?.projection.previewLabel).toBeNull();
  });

  it("keeps discard picks local until the kitty is confirmed", () => {
    const table = createTable({ seed: "local-discards" });
    driveUntil(table, ["south"], (game) => game.phase !== "auction", "bid");
    if (table.committedState().contract?.bidder !== "south") return;
    driveUntil(table, ["south"], (game) => game.phase === "kitty");
    const version = table.currentVersion;
    const host = hostBytes(table);
    const pub = publicBytes(table);
    const hand = table.committedState().hands.south;

    hand.slice(0, 6).forEach((card) => {
      const toggled = submit(table, playerActor("south"), { kind: "toggle-discard", cardId: card.id });
      expect(toggled.receipt.version).toBe(version);
      expect(toggled.frame).toBeNull();
    });
    expect(table.currentVersion).toBe(version);
    expect(hostBytes(table)).toBe(host);
    expect(publicBytes(table)).toBe(pub);
    expect(playerSnapshot(table, "south").discardPicked).toBe(6);

    const confirmed = submit(table, playerActor("south"), { kind: "confirm" });
    expect(confirmed.receipt.committed).toBe(true);
    expect(confirmed.receipt.version).toBe(version + 1);
    expect(table.currentVersion).toBe(version + 1);
    expect(hostBytes(table)).not.toBe(host);
    expect(table.committedState().phase).toBe("play");
    expect(playerSnapshot(table, "south").discardPicked).toBe(0);
  });

  it("orders same-version projections by the seat's revision and never by the shared version", () => {
    const table = createTable({ seed: "local-revision" });
    const first = submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } });
    const second = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "low" } } });
    expect(first.seatUpdate?.projection.version).toBe(second.seatUpdate?.projection.version);
    expect(second.seatUpdate!.projection.uncommittedRevision).toBeGreaterThan(first.seatUpdate!.projection.uncommittedRevision);
    const committed = submit(table, playerActor("south"), { kind: "confirm" });
    const afterCommit = playerSnapshot(table, "south");
    expect(afterCommit.version).toBe(committed.receipt.version);
    expect(afterCommit.uncommittedRevision).toBeGreaterThan(second.seatUpdate!.projection.uncommittedRevision);
    expect(afterCommit.previewLabel).toBeNull();
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
