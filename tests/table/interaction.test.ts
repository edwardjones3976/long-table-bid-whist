// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
import { describe, expect, it } from "vitest";

import { ALPHA_EXCLUSION_NOTICE } from "../../src/game/model";
import { TABLE_REJECTION_MESSAGES } from "../../src/table/intent";
import { DISCARD_PICK_TARGET } from "../../src/table/interaction";
import { TablePort, driveUntil, seedWhereSouthBids } from "./drive";

describe("shared table port — idempotency", () => {
  it("applies a repeated input id exactly once", () => {
    const port = new TablePort("idempotent-preview");
    const [first, second] = port.sendTwice(
      { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } },
      "controller-event-7",
    );

    expect(first.outcome).toBe("accepted");
    expect(second.outcome).toBe("duplicate");
    expect(second.code).toBe("duplicate-input-id");
    expect(second.committed).toBe(false);
  });

  it("never commits a replayed confirm", () => {
    const port = new TablePort("idempotent-confirm");
    port.send({ kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });

    const first = port.send({ kind: "confirm" }, { inputId: "trigger-1" });
    expect(first.committed).toBe(true);
    const committedGame = port.game;

    const replay = port.send({ kind: "confirm" }, { inputId: "trigger-1" });
    expect(replay.outcome).toBe("duplicate");
    expect(replay.committed).toBe(false);
    // Identity, not just equality: the committed state was not rebuilt.
    expect(port.game).toBe(committedGame);
  });

  it("treats a preview as pointing, never as a commit", () => {
    const port = new TablePort("preview-is-not-commit");
    const before = port.game;

    const receipt = port.send({
      kind: "preview",
      selection: { type: "bid", bid: { level: 4, mode: "low" } },
    });

    expect(receipt.outcome).toBe("accepted");
    expect(receipt.committed).toBe(false);
    expect(port.game).toBe(before);
    expect(port.state.preview?.label).toBe("4 Low");
  });

  it("keeps one input id ledger across desktop and XR sources", () => {
    const port = new TablePort("cross-surface");
    const preview = port.send(
      { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } },
      { source: "xr", inputId: "shared-1" },
    );
    expect(preview.source).toBe("xr");

    const replayFromDesktop = port.send(
      { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } },
      { source: "desktop", inputId: "shared-1" },
    );
    expect(replayFromDesktop.outcome).toBe("duplicate");

    const confirm = port.send({ kind: "confirm" }, { source: "desktop" });
    expect(confirm.committed).toBe(true);
  });
});

describe("shared table port — fresh double confirm", () => {
  it("rejects a second confirm carrying a fresh input id after a committed bid", () => {
    const port = new TablePort("fresh-double-confirm-bid");
    port.send({ kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    expect(port.send({ kind: "confirm" }).committed).toBe(true);

    const committedGame = port.game;
    const second = port.send({ kind: "confirm" }, { inputId: "definitely-new" });

    expect(second.outcome).toBe("rejected");
    expect(second.committed).toBe(false);
    expect(port.game).toBe(committedGame);
  });

  it("rejects a second confirm carrying a fresh input id after a committed play", () => {
    const port = new TablePort("fresh-double-confirm-play");
    driveUntil(port, (game) => game.phase === "play" && game.turn === "south");
    expect(port.game.phase).toBe("play");

    const cardId = port.projection().legalChoices[0].targetId.replace("play:", "");
    port.send({ kind: "preview", selection: { type: "play", cardId } });
    expect(port.send({ kind: "confirm" }).committed).toBe(true);

    const committedGame = port.game;
    const tricksBefore = committedGame.completedTricks.length;
    const second = port.send({ kind: "confirm" }, { inputId: "fresh-after-play" });

    expect(second.outcome).toBe("rejected");
    expect(second.code).toBe("nothing-to-confirm");
    expect(second.message).toBe(TABLE_REJECTION_MESSAGES["nothing-to-confirm"]);
    expect(second.committed).toBe(false);
    expect(port.game).toBe(committedGame);
    expect(port.game.completedTricks.length).toBe(tricksBefore);
  });

  it("rejects a confirm that follows a cancelled preview", () => {
    const port = new TablePort("cancel-then-confirm");
    port.send({ kind: "preview", selection: { type: "bid", bid: { level: 5, mode: "high" } } });
    port.send({ kind: "cancel" });
    expect(port.state.preview).toBeNull();

    const receipt = port.send({ kind: "confirm" });
    expect(receipt.outcome).toBe("rejected");
    expect(receipt.code).toBe("nothing-to-confirm");
    expect(receipt.committed).toBe(false);
  });
});

describe("shared table port — closed rejection vocabulary", () => {
  it("reports the published Alpha 0.1 exclusion for withheld contracts", () => {
    const port = new TablePort("withheld-contracts");

    const levelSeven = port.send({
      kind: "preview",
      selection: { type: "bid", bid: { level: 7, mode: "high" } },
    });
    const noTrump = port.send({
      kind: "preview",
      selection: { type: "bid", bid: { level: 3, mode: "no-trump-high" } },
    });

    expect(levelSeven.code).toBe("bid-outside-manifest");
    expect(noTrump.code).toBe("bid-outside-manifest");
    expect(levelSeven.message).toBe(ALPHA_EXCLUSION_NOTICE);
    expect(noTrump.message).toBe(ALPHA_EXCLUSION_NOTICE);
    expect(port.state.preview).toBeNull();
  });

  it("gives identical feedback for the same cause every time", () => {
    const port = new TablePort("stable-feedback");
    const first = port.send({
      kind: "preview",
      selection: { type: "declaration", trump: "spades" },
    });
    const second = port.send({
      kind: "preview",
      selection: { type: "declaration", trump: "hearts" },
    });

    expect(first.code).toBe("wrong-phase");
    expect(second.code).toBe("wrong-phase");
    expect(first.message).toBe(second.message);
  });

  it("refuses a pointed card that is not in South's hand", () => {
    const port = new TablePort("card-not-in-hand");
    driveUntil(port, (game) => game.phase === "play" && game.turn === "south");

    const receipt = port.send({
      kind: "preview",
      selection: { type: "play", cardId: "not-a-real-card" },
    });
    expect(receipt.code).toBe("card-not-in-hand");
    expect(receipt.committed).toBe(false);
  });
});

describe("shared table port — discard picks", () => {
  it("holds six picks, refuses a seventh, and unpicks on repeat", () => {
    const port = new TablePort(seedWhereSouthBids("discard-seed"));
    driveUntil(port, (game) => game.phase === "kitty");
    expect(port.game.phase).toBe("kitty");

    const hand = port.game.hands.south;
    hand.slice(0, DISCARD_PICK_TARGET).forEach((card) => {
      expect(port.send({ kind: "toggle-discard", cardId: card.id }).outcome).toBe("accepted");
    });
    expect(port.state.discardIds).toHaveLength(DISCARD_PICK_TARGET);

    const seventh = port.send({ kind: "toggle-discard", cardId: hand[DISCARD_PICK_TARGET].id });
    expect(seventh.code).toBe("discard-limit-reached");
    expect(port.state.discardIds).toHaveLength(DISCARD_PICK_TARGET);

    port.send({ kind: "toggle-discard", cardId: hand[0].id });
    expect(port.state.discardIds).toHaveLength(DISCARD_PICK_TARGET - 1);

    const incomplete = port.send({ kind: "confirm" });
    expect(incomplete.code).toBe("discard-incomplete");
    expect(incomplete.committed).toBe(false);
  });

  it("drops picks on cancel without touching committed state", () => {
    const port = new TablePort(seedWhereSouthBids("discard-cancel-seed"));
    driveUntil(port, (game) => game.phase === "kitty");

    port.send({ kind: "toggle-discard", cardId: port.game.hands.south[0].id });
    const committedGame = port.game;

    port.send({ kind: "cancel" });
    expect(port.state.discardIds).toHaveLength(0);
    expect(port.game).toBe(committedGame);
  });
});
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
