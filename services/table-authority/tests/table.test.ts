// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import { SEATS, replayMatches, stateDigest } from "../../../packages/rules-core/src";
import { DEALER_CUES, DEALER_CUE_FRAME, INTENT_RECEIPT, REJECTION_MESSAGES } from "../../../packages/protocol/src";
import { PARTICIPANTS, PUBLIC_ACTOR, createTable, driveHand, driveUntil, hostActor, playerActor, submit, takeTurn } from "./support";

describe("authoritative boundary — preview, cancel, confirm", () => {
  it("treats a preview as pointing: the version moves, committed play does not", () => {
    const table = createTable({ seed: "preview" });
    const before = stateDigest(table.committedState());
    const version = table.currentVersion;

    const receipt = submit(table, playerActor("south"), {
      kind: "preview",
      selection: { type: "bid", bid: { level: 4, mode: "low" } },
    }).receipt;

    expect(receipt.outcome).toBe("accepted");
    expect(receipt.committed).toBe(false);
    expect(receipt.version).toBe(version + 1);
    expect(stateDigest(table.committedState())).toBe(before);
    const projection = table.snapshot("player", "south");
    expect(projection?.role === "player" && projection.previewLabel).toBe("4 Low");
  });

  it("commits only on confirm, then advances the AI seats", () => {
    const table = createTable({ seed: "confirm" });
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    const confirmed = submit(table, playerActor("south"), { kind: "confirm" });
    expect(confirmed.receipt.committed).toBe(true);
    const game = table.committedState();
    expect(game.auction.length).toBeGreaterThanOrEqual(1);
    expect(game.auction[0]).toEqual({ seat: "south", bid: { level: 3, mode: "high" } });
    // The three AI seats answered; play returned to South or the phase moved on.
    expect(game.turn === "south" || game.phase !== "auction").toBe(true);
    expect(table.snapshot("player", "south")?.role === "player" && table.snapshot("player", "south")!.role === "player" ? true : false).toBe(true);
  });

  it("rejects a confirm after cancel and a fresh double confirm after a commit", () => {
    const table = createTable({ seed: "cancel" });
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 5, mode: "high" } } });
    submit(table, playerActor("south"), { kind: "cancel" });
    const afterCancel = submit(table, playerActor("south"), { kind: "confirm" });
    expect(afterCancel.receipt.outcome).toBe("rejected");
    expect(afterCancel.receipt.code).toBe("nothing-to-confirm");

    submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "low" } } });
    expect(submit(table, playerActor("south"), { kind: "confirm" }).receipt.committed).toBe(true);
    const digest = stateDigest(table.committedState());
    const again = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "definitely-new" });
    expect(again.receipt.outcome).toBe("rejected");
    expect(again.receipt.committed).toBe(false);
    expect(stateDigest(table.committedState())).toBe(digest);
  });

  it("reports the published exclusion for withheld contracts and stable feedback per cause", () => {
    const table = createTable({ seed: "withheld" });
    const seven = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 7, mode: "high" } } });
    const noTrump = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "no-trump-high" } } });
    expect(seven.receipt.code).toBe("bid-outside-manifest");
    expect(noTrump.receipt.code).toBe("bid-outside-manifest");
    expect(seven.receipt.message).toBe(REJECTION_MESSAGES["bid-outside-manifest"]);
    expect(seven.receipt.message).toBe("Not included in Alpha 0.1; available after the published-rules stage.");
    const projection = table.snapshot("player", "south");
    expect(projection?.role === "player" && projection.feedbackCode).toBe("bid-outside-manifest");
  });

  it("holds six discard picks, refuses a seventh, and needs all six to confirm", () => {
    const table = createTable({ seed: "discards" });
    driveUntil(table, ["south"], (game) => game.phase !== "auction", "bid");
    if (table.committedState().contract?.bidder !== "south") return;
    driveUntil(table, ["south"], (game) => game.phase === "kitty");
    const hand = table.committedState().hands.south;
    hand.slice(0, 6).forEach((card) => {
      expect(submit(table, playerActor("south"), { kind: "toggle-discard", cardId: card.id }).receipt.outcome).toBe("accepted");
    });
    const seventh = submit(table, playerActor("south"), { kind: "toggle-discard", cardId: hand[6].id });
    expect(seventh.receipt.code).toBe("discard-limit-reached");
    submit(table, playerActor("south"), { kind: "toggle-discard", cardId: hand[0].id });
    const incomplete = submit(table, playerActor("south"), { kind: "confirm" });
    expect(incomplete.receipt.code).toBe("discard-incomplete");
    const projection = table.snapshot("player", "south");
    expect(projection?.role === "player" && projection.discardPicked).toBe(5);
  });
});

describe("authoritative boundary — idempotency and versions", () => {
  it("answers a repeated intent id from the ledger and never re-applies it", () => {
    const table = createTable({ seed: "idempotent" });
    const first = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } }, { intentId: "controller-7" });
    expect(first.receipt.outcome).toBe("accepted");
    const version = table.currentVersion;

    const replay = table.submitIntent(playerActor("south"), {
      tableId: table.tableId,
      intentId: "controller-7",
      expectedVersion: version,
      intent: { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } },
    });
    expect(replay.receipt.outcome).toBe("duplicate");
    expect(replay.receipt.code).toBe("duplicate-input-id");
    expect(replay.receipt.committed).toBe(false);
    expect(replay.frame).toBeNull();
    expect(table.currentVersion).toBe(version);
  });

  it("never commits a replayed confirm, even after the version has moved on", () => {
    const table = createTable({ seed: "replayed-confirm" });
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    const confirmed = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "trigger-1" });
    expect(confirmed.receipt.committed).toBe(true);
    const digest = stateDigest(table.committedState());
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } });

    const replay = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "trigger-1" });
    expect(replay.receipt.outcome).toBe("duplicate");
    expect(replay.receipt.committed).toBe(false);
    expect(stateDigest(table.committedState())).toBe(digest);
  });

  it("rejects a stale expected version and reports the current one", () => {
    const table = createTable({ seed: "stale" });
    const stale = table.currentVersion;
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    expect(table.currentVersion).toBe(stale + 1);

    const rejected = submit(table, playerActor("south"), { kind: "confirm" }, { expectedVersion: stale });
    expect(rejected.receipt.outcome).toBe("rejected");
    expect(rejected.receipt.code).toBe("stale-version");
    expect(rejected.receipt.version).toBe(stale + 1);
    expect(rejected.receipt.committed).toBe(false);

    const fresh = submit(table, playerActor("south"), { kind: "confirm" }, { expectedVersion: stale + 1 });
    expect(fresh.receipt.committed).toBe(true);
  });

  it("increments the version by exactly one per accepted intent", () => {
    const table = createTable({ seed: "monotonic" });
    const start = table.currentVersion;
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } });
    submit(table, playerActor("south"), { kind: "cancel" });
    submit(table, playerActor("south"), { kind: "confirm" });
    expect(table.currentVersion).toBe(start + 2);
  });
});

describe("authoritative boundary — roles", () => {
  it("refuses play intents from the host and host intents from a player", () => {
    const table = createTable({ seed: "roles" });
    const hostPreview = submit(table, hostActor(), { kind: "preview", selection: { type: "pass" } });
    expect(hostPreview.receipt.code).toBe("unauthorized-role");
    const hostConfirm = submit(table, hostActor(), { kind: "confirm" });
    expect(hostConfirm.receipt.code).toBe("unauthorized-role");
    const hostToggle = submit(table, hostActor(), { kind: "toggle-discard", cardId: "spades-14" });
    expect(hostToggle.receipt.code).toBe("unauthorized-role");
    const playerPause = submit(table, playerActor("south"), { kind: "host-pause" });
    expect(playerPause.receipt.code).toBe("unauthorized-role");
    const publicAnything = submit(table, PUBLIC_ACTOR, { kind: "preview", selection: { type: "pass" } });
    expect(publicAnything.receipt.code).toBe("unauthorized-role");
    const impostor = submit(table, hostActor("someone-else"), { kind: "host-announce", cue: "welcome" });
    expect(impostor.receipt.code).toBe("unauthorized-role");
  });

  it("refuses a player who is not bound to the seat they claim", () => {
    const table = createTable({ seed: "seat-binding" });
    const wrongSeat = submit(table, { role: "player", participantId: PARTICIPANTS.south, seat: "west" }, { kind: "preview", selection: { type: "pass" } });
    expect(wrongSeat.receipt.code).toBe("seat-not-bound");
    const unknown = submit(table, { role: "player", participantId: "nobody", seat: "south" }, { kind: "preview", selection: { type: "pass" } });
    expect(unknown.receipt.code).toBe("seat-not-bound");
  });
});

describe("authoritative boundary — host session powers", () => {
  it("pauses only between hands, resumes, and never touches play", () => {
    const table = createTable({ seed: "host-pause" });
    expect(submit(table, hostActor(), { kind: "host-pause" }).receipt.code).toBe("not-between-hands");
    driveHand(table);
    const summary = table.committedState();
    expect(summary.phase).toBe("summary");

    const paused = submit(table, hostActor(), { kind: "host-pause" });
    expect(paused.receipt.outcome).toBe("accepted");
    expect(paused.frame?.cues.map((cue) => cue.cue)).toContain("table-paused");
    expect(table.committedState().paused).toBe(true);
    expect(table.committedState().scores).toEqual(summary.scores);
    expect(submit(table, playerActor("south"), { kind: "next-hand" }).receipt.code).toBe("table-paused");
    const host = table.snapshot("host", null);
    expect(host?.role === "host" && host.hostControls).toContain("host-resume");
    expect(host?.role === "host" && host.hostControls).not.toContain("host-pause");

    const resumed = submit(table, hostActor(), { kind: "host-resume" });
    expect(resumed.receipt.outcome).toBe("accepted");
    expect(resumed.frame?.cues.map((cue) => cue.cue)).toContain("table-resumed");
    expect(submit(table, hostActor(), { kind: "host-resume" }).receipt.code).toBe("wrong-phase");
    expect(submit(table, hostActor(), { kind: "next-hand" }).receipt.committed).toBe(true);
    expect(table.committedState().handNumber).toBe(2);
  });

  it("announces only from the fixed cue list and substitutes a seat with AI between hands", () => {
    const table = createTable({ seed: "host-substitute", humans: ["south", "north"] });
    const announced = submit(table, hostActor(), { kind: "host-announce", cue: "welcome" });
    expect(announced.receipt.outcome).toBe("accepted");
    expect(announced.frame?.cues.map((cue) => cue.cue)).toContain("host-announcement");
    expect(announced.frame?.host.lastAnnouncement).toBe("welcome");

    expect(submit(table, hostActor(), { kind: "host-substitute", seat: "north" }).receipt.code).toBe("not-between-hands");
    driveHand(table, ["south", "north"]);
    expect(submit(table, hostActor(), { kind: "host-substitute", seat: "west" }).receipt.code).toBe("seat-not-substitutable");
    const substituted = submit(table, hostActor(), { kind: "host-substitute", seat: "north" });
    expect(substituted.receipt.outcome).toBe("accepted");
    expect(substituted.frame?.cues.some((cue) => cue.cue === "seat-substituted" && cue.seat === "north")).toBe(true);
    expect(table.seatBinding("north").occupant).toBe("ai");
    expect(table.seatOf(PARTICIPANTS.north)).toBeNull();

    submit(table, hostActor(), { kind: "next-hand" });
    driveHand(table, ["south"]);
    expect(table.committedState().phase).toBe("summary");
  });

  it("transfers hosting to a seated participant and ends the event", () => {
    const table = createTable({ seed: "host-transfer" });
    expect(submit(table, hostActor(), { kind: "host-transfer", participantId: "stranger" }).receipt.code).toBe("unknown-participant");
    expect(submit(table, hostActor(), { kind: "host-transfer", participantId: PARTICIPANTS.south }).receipt.outcome).toBe("accepted");
    expect(table.isHost(PARTICIPANTS.host)).toBe(false);
    expect(table.isHost(PARTICIPANTS.south)).toBe(true);
    expect(submit(table, hostActor(), { kind: "host-announce", cue: "thanks" }).receipt.code).toBe("unauthorized-role");

    const ended = submit(table, hostActor(PARTICIPANTS.south), { kind: "host-end-event" });
    expect(ended.receipt.outcome).toBe("accepted");
    expect(ended.frame?.cues.map((cue) => cue.cue)).toEqual(["event-ended"]);
    expect(ended.frame?.public.eventEnded).toBe(true);
    expect(ended.frame?.host.hostControls).toEqual([]);
    expect(submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } }).receipt.code).toBe("event-ended");
    expect(submit(table, hostActor(PARTICIPANTS.south), { kind: "host-announce", cue: "thanks" }).receipt.code).toBe("event-ended");
  });
});

describe("authoritative boundary — reconnect, replay and evidence", () => {
  it("replays the retained projections after a last-known version", () => {
    const table = createTable({ seed: "reconnect", historyRetention: 6 });
    const lastSeen = table.currentVersion;
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    submit(table, playerActor("south"), { kind: "confirm" });
    // Cancel is accepted in every phase, so it always advances the version.
    submit(table, playerActor("south"), { kind: "cancel" });

    const replay = table.replayFrames("player", "south", lastSeen);
    expect(replay.truncated).toBe(false);
    expect(replay.frames.map((frame) => frame.version)).toEqual([lastSeen + 1, lastSeen + 2, lastSeen + 3]);
    replay.frames.forEach((frame) => {
      expect(frame.projection.role).toBe("player");
      expect(frame.projection.version).toBe(frame.version);
    });
    expect(table.replayFrames("host", null, lastSeen).frames.every((frame) => frame.projection.role === "host")).toBe(true);
    expect(table.replayFrames("dealer", null, lastSeen).frames).toEqual([]);

    for (let index = 0; index < 8; index += 1) {
      submit(table, playerActor("south"), { kind: "cancel" });
    }
    const beyond = table.replayFrames("public", null, lastSeen);
    expect(beyond.truncated).toBe(true);
    expect(beyond.frames.length).toBe(6);
  });

  it("records every committed action so the hand replays to the identical state", () => {
    const table = createTable({ seed: "replay-evidence" });
    driveHand(table);
    submit(table, playerActor("south"), { kind: "next-hand" });
    driveUntil(table, ["south"], (game) => game.phase === "play" && game.completedTricks.length >= 2);
    const record = table.exportReplay();
    expect(record.entries.length).toBeGreaterThan(50);
    expect(replayMatches(record, table.committedState())).toBe(true);
  });

  it("emits only allowlisted dealer cues with no card member", () => {
    const table = createTable({ seed: "dealer-cues" });
    const opening = table.lastFrame()?.cues ?? [];
    expect(opening.map((cue) => cue.cue)).toEqual(["hand-opens", "auction-turn"]);
    expect(opening[1].seat).toBe("south");
    const cues = [...opening, ...driveHand(table)];
    const kinds = new Set(cues.map((cue) => cue.cue));
    ["hand-opens", "auction-turn", "contract-set", "kitty-taken", "play-opens", "trick-taken", "hand-scored", "next-hand-ready"].forEach((expected) => {
      expect(kinds.has(expected as (typeof DEALER_CUES)[number]), `missing cue ${expected}`).toBe(true);
    });
    expect(cues.filter((cue) => cue.cue === "trick-taken")).toHaveLength(12);
    const allIds = SEATS.flatMap((seat) => table.committedState().completedTricks.flatMap((trick) => trick.cards.map((card) => card.card.id)));
    cues.forEach((cue) => {
      expect(DEALER_CUES).toContain(cue.cue);
      expect(DEALER_CUE_FRAME.decode(cue, "cue").ok).toBe(true);
      const text = JSON.stringify(cue);
      allIds.forEach((id) => expect(text).not.toContain(id));
      expect(Object.keys(cue).sort()).toEqual([...DEALER_CUE_FRAME.keys].sort());
    });
  });

  it("issues receipts that decode through the closed receipt schema", () => {
    const table = createTable({ seed: "receipts" });
    const receipts = [
      submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } }).receipt,
      submit(table, playerActor("south"), { kind: "confirm" }, { expectedVersion: 0 }).receipt,
      submit(table, hostActor(), { kind: "confirm" }).receipt,
    ];
    receipts.forEach((receipt) => expect(INTENT_RECEIPT.decode(receipt, "receipt").ok).toBe(true));
    expect(receipts.map((receipt) => receipt.code)).toEqual([null, "stale-version", "unauthorized-role"]);
  });
});

describe("four human seats", () => {
  it("complete a hand through preview/confirm and the kitty picks, then rotate the deal", () => {
    const humans = SEATS.slice();
    const table = createTable({ seed: "four-humans", humans });
    driveHand(table, humans);
    const game = table.committedState();
    expect(game.completedTricks).toHaveLength(12);
    expect(Object.values(game.hands).flat()).toHaveLength(0);
    const byNorth = submit(table, playerActor("north"), { kind: "next-hand" });
    expect(byNorth.receipt.committed).toBe(true);
    expect(table.committedState().handNumber).toBe(2);
    expect(table.committedState().turn).toBe("west");
    // Nobody is AI at this table, so West must act; nothing was auto-played.
    expect(table.committedState().auction).toHaveLength(0);
    expect(takeTurn(table, "west").length).toBeGreaterThan(0);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
