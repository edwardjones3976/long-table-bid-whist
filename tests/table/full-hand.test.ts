// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * A whole hand played only through the shared semantic port, choosing every move
 * from the XR projection's published `legalChoices`. This is the same route a
 * controller select takes, so it proves the room can finish a hand without any
 * surface-specific path into the rules engine.
 */
import { describe, expect, it } from "vitest";

import { SEATS } from "../../src/game/model";
import { TablePort, driveHand, driveUntil, seedWhereSouthBids, takeSouthTurn } from "./drive";

describe("full hand through the shared port", () => {
  it("completes auction, declaration, kitty, twelve tricks, and the summary", () => {
    const seed = seedWhereSouthBids("full-hand");
    const port = new TablePort(seed);

    driveUntil(port, (game) => game.phase !== "auction");
    expect(port.game.contract?.bidder).toBe("south");
    expect(port.game.contract?.level).toBeGreaterThanOrEqual(3);
    expect(port.game.contract?.level).toBeLessThanOrEqual(6);
    expect(["high", "low"]).toContain(port.game.contract?.mode);

    driveUntil(port, (game) => game.phase === "kitty");
    expect(port.game.hands.south).toHaveLength(18);
    expect(port.game.kitty).toHaveLength(0);

    driveUntil(port, (game) => game.phase === "play");
    expect(port.game.hands.south).toHaveLength(12);

    driveHand(port);

    expect(port.game.phase).toBe("summary");
    expect(port.game.completedTricks).toHaveLength(12);
    expect(Object.values(port.game.hands).flat()).toHaveLength(0);
    expect(port.game.summary).toContain("Score");

    const summaryProjection = port.projection();
    expect(summaryProjection.summaryLine).toBe(port.game.summary);
    expect(summaryProjection.legalChoices.map((choice) => choice.kind)).toEqual(["next-hand"]);
    expect(summaryProjection.booksNorthSouth + summaryProjection.booksEastWest).toBe(12);

    expect(port.send({ kind: "next-hand" }).committed).toBe(true);
    expect(port.game.handNumber).toBe(2);
    expect(port.game.phase).toBe("auction");
    SEATS.forEach((seat) => expect(port.game.hands[seat]).toHaveLength(12));
  });

  it("keeps every concealed hand out of the projection for the whole hand", () => {
    const port = new TablePort(seedWhereSouthBids("full-hand-privacy"));
    const concealedIds = new Set<string>();
    let guard = 0;

    while (port.game.phase !== "summary" && guard < 400) {
      const serialized = JSON.stringify(port.projection());
      SEATS.filter((seat) => seat !== "south").forEach((seat) => {
        port.game.hands[seat].forEach((card) => {
          concealedIds.add(card.id);
          expect(serialized).not.toContain(card.id);
        });
      });
      port.game.kitty.forEach((card) => expect(serialized).not.toContain(card.id));
      expect(serialized).not.toContain(port.game.seed);
      guard += 1;
      if (!takeSouthTurn(port)) break;
    }

    expect(concealedIds.size).toBeGreaterThan(0);
    expect(port.game.phase).toBe("summary");
  });

  it("plays a hand where another seat holds the contract", () => {
    const port = new TablePort("opponent-contract");
    port.auctionPolicy = "pass";
    driveUntil(port, (game) => game.phase !== "auction");
    expect(port.game.contract?.bidder).not.toBe("south");
    // The AI seats bid and discard on their own; South only ever sees play.
    driveHand(port);

    expect(port.game.phase).toBe("summary");
    expect(port.game.completedTricks).toHaveLength(12);
    expect(port.state.discardIds).toHaveLength(0);
  });
});
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
