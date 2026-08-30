// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/**
 * Adversarial regressions for long-table-intent-idempotency/v2.
 *
 * Exactly five preallocated lanes exist per table, each holding only its
 * current server-issued grant and a monotonic highest-consumed counter. The
 * exact next counter is consumed before any semantic or version evaluation
 * and stays consumed for every outcome; at-or-below counters are duplicates
 * with no mutation; forward gaps, foreign grants and malformed identities
 * reject atomically without advancing; consuming the maximum counter exhausts
 * the entire table incarnation; and no flood — duplicate, unauthorized or
 * gapped — can grow lane state with request count.
 */
import { describe, expect, it } from "vitest";

import { stateDigest } from "../../../packages/rules-core/src";
import { INTENT_COUNTER_MAX, INTENT_LANES, type TableIntent } from "../../../packages/protocol/src";
import { TableAuthority, type Actor, type IntentLaneState } from "../src/table";
import { PARTICIPANTS, PUBLIC_ACTOR, createTable, hostActor, nextIntentId, playerActor, playerSnapshot, submit } from "./support";

const DEALER_ACTOR: Actor = { role: "dealer", participantId: PARTICIPANTS.dealer, seat: null };

function raw(table: TableAuthority, actor: Actor, intentId: string, intent: TableIntent, expectedVersion = table.currentVersion) {
  return table.submitIntent(actor, { tableId: table.tableId, intentId, expectedVersion, intent });
}

function laneSnapshot(table: TableAuthority): Record<string, IntentLaneState> {
  return structuredClone(table.intentLanes()) as Record<string, IntentLaneState>;
}

describe("bounded lane state", () => {
  it("holds exactly the five preallocated lanes with fresh grants and zero high-waters", () => {
    const table = createTable({ seed: "lanes" });
    const lanes = table.intentLanes();
    expect(Object.keys(lanes).sort()).toEqual([...INTENT_LANES].sort());
    const grants = INTENT_LANES.map((lane) => lanes[lane].currentGrantSessionId);
    expect(new Set(grants).size).toBe(5);
    INTENT_LANES.forEach((lane) => expect(lanes[lane].highestConsumedCounter).toBe(0));
  });

  it("keeps all five lane records byte-identical under a public and dealer intent flood, then accepts a South preview and confirm", () => {
    const table = createTable({ seed: "flood-unauthorized" });
    const before = laneSnapshot(table);
    const digest = stateDigest(table.committedState());

    for (let index = 0; index < 500; index += 1) {
      const fromPublic = raw(table, PUBLIC_ACTOR, `${before.south.currentGrantSessionId}:${index + 1}`, { kind: "confirm" });
      expect(fromPublic.receipt?.code).toBe("unauthorized-role");
      const fromDealer = raw(table, DEALER_ACTOR, `flood-${index}`, { kind: "next-hand" });
      expect(fromDealer.receipt?.code).toBe("unauthorized-role");
    }
    // The flood was refused before any lane lookup: every lane byte is unchanged.
    expect(JSON.stringify(laneSnapshot(table))).toBe(JSON.stringify(before));
    expect(stateDigest(table.committedState())).toBe(digest);

    // Legitimate progress is not vacuous: the entitled seat still previews and commits.
    const preview = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    expect(preview.receipt.outcome).toBe("accepted");
    const confirmed = submit(table, playerActor("south"), { kind: "confirm" });
    expect(confirmed.receipt.committed).toBe(true);
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);
  });

  it("rejects foreign grants, malformed identities and forward gaps atomically, without advancing any lane", () => {
    const table = createTable({ seed: "flood-identity" });
    const southGrant = table.laneGrant("south");
    const hostGrant = table.laneGrant("host");
    const before = laneSnapshot(table);
    const pass: TableIntent = { kind: "preview", selection: { type: "pass" } };

    // Another lane's grant, a retired-looking grant, and malformed identities.
    for (const intentId of [
      `${hostGrant}:1`,
      "grant-999:1",
      "no-divider",
      ":1",
      `${southGrant}:`,
      `${southGrant}:0`,
      `${southGrant}:01`,
      `${southGrant}:+2`,
      `${southGrant}:1.5`,
      `${southGrant}:1e3`,
      `${southGrant}: 1`,
      `${southGrant}:9007199254740992`,
    ]) {
      const result = raw(table, playerActor("south"), intentId, pass);
      expect(result.identityViolation, intentId).toBe("intent-identity");
      expect(result.receipt).toBeNull();
    }
    // A forward gap: exactly high-water plus one is required.
    const gap = raw(table, playerActor("south"), `${southGrant}:2`, pass);
    expect(gap.identityViolation).toBe("intent-identity");
    expect(JSON.stringify(laneSnapshot(table))).toBe(JSON.stringify(before));
    expect(playerSnapshot(table, "south").previewLabel).toBeNull();

    // The exact next still applies once afterwards.
    expect(raw(table, playerActor("south"), `${southGrant}:1`, pass).receipt?.outcome).toBe("accepted");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(1);
  });
});

describe("exact-next consumption before semantic evaluation", () => {
  it("consumes the exact counter for accepted-local, accepted-authoritative and every rejected outcome", () => {
    const table = createTable({ seed: "consume-all" });
    const south = playerActor("south");

    // Accepted player-local.
    expect(submit(table, south, { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } }).receipt.outcome).toBe("accepted");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(1);
    // Accepted authoritative.
    expect(submit(table, south, { kind: "confirm" }).receipt.committed).toBe(true);
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);
    // Rejected: stale version.
    expect(submit(table, south, { kind: "cancel" }, { expectedVersion: 0 }).receipt.code).toBe("stale-version");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(3);
    // Rejected: rules ("nothing to confirm").
    expect(submit(table, south, { kind: "confirm" }).receipt.code).toBe("nothing-to-confirm");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(4);
    // Rejected: intent-kind authority (a player using a host power).
    expect(submit(table, south, { kind: "host-pause" }).receipt.code).toBe("unauthorized-role");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(5);
    // Rejected: wrong phase on the host lane.
    expect(submit(table, hostActor(), { kind: "host-resume" }).receipt.code).toBe("wrong-phase");
    expect(table.intentLaneState("host").highestConsumedCounter).toBe(1);
    // Rejected: not between hands on the host lane.
    expect(submit(table, hostActor(), { kind: "host-pause" }).receipt.code).toBe("not-between-hands");
    expect(table.intentLaneState("host").highestConsumedCounter).toBe(2);
  });

  it("answers a replayed rejected identity as a duplicate even when the original cause no longer applies", () => {
    const table = createTable({ seed: "cause-gone" });
    const identity = nextIntentId(table, "south");
    const stale = raw(table, playerActor("south"), identity, { kind: "preview", selection: { type: "pass" } }, 0);
    expect(stale.receipt?.code).toBe("stale-version");
    // With the correct version supplied, the same identity is still terminal.
    const again = raw(table, playerActor("south"), identity, { kind: "preview", selection: { type: "pass" } });
    expect(again.receipt?.outcome).toBe("duplicate");
    expect(again.receipt?.code).toBe("duplicate-input-id");
    expect(playerSnapshot(table, "south").previewLabel).toBeNull();
  });

  it("never lets an old rejected confirm consume a preview placed later at the same version", () => {
    const table = createTable({ seed: "terminal-confirm" });
    const version = table.currentVersion;
    const earlyConfirm = nextIntentId(table, "south");
    expect(raw(table, playerActor("south"), earlyConfirm, { kind: "confirm" }).receipt?.code).toBe("nothing-to-confirm");

    // A preview is now pending at the same shared version.
    const preview = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    expect(preview.receipt.outcome).toBe("accepted");
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");
    const digest = stateDigest(table.committedState());

    // The old rejected confirm, replayed now, must not become a fresh confirm that commits the preview.
    const replay = raw(table, playerActor("south"), earlyConfirm, { kind: "confirm" });
    expect(replay.receipt?.outcome).toBe("duplicate");
    expect(replay.receipt?.committed).toBe(false);
    expect(replay.frame).toBeNull();
    expect(table.currentVersion).toBe(version);
    expect(stateDigest(table.committedState())).toBe(digest);
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");

    // A genuinely fresh confirm still commits the pending preview.
    expect(submit(table, playerActor("south"), { kind: "confirm" }).receipt.committed).toBe(true);
    expect(table.currentVersion).toBe(version + 1);
  });

  it("lets a lost-receipt retry resend the same identity once without a second mutation, then advance", () => {
    const table = createTable({ seed: "lost-receipt" });
    const previewId = nextIntentId(table, "south");
    const first = raw(table, playerActor("south"), previewId, { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    expect(first.receipt?.outcome).toBe("accepted");
    const revision = table.seatRevision("south");

    // The receipt was lost; the unchanged identity is resent and cannot apply twice.
    const retry = raw(table, playerActor("south"), previewId, { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    expect(retry.receipt?.outcome).toBe("duplicate");
    expect(retry.seatUpdate).toBeNull();
    expect(table.seatRevision("south")).toBe(revision);
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");

    // The next counter proceeds normally.
    const confirmed = submit(table, playerActor("south"), { kind: "confirm" });
    expect(confirmed.receipt.committed).toBe(true);
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);
  });
});

describe("maximum-counter exhaustion", () => {
  function nearExhaustedTable() {
    // An atomically restored incarnation whose south lane sits one below the
    // maximum, exactly as a restarted authority would restore it.
    const lanes = {
      south: { currentGrantSessionId: "grant-1", highestConsumedCounter: INTENT_COUNTER_MAX - 1 },
      west: { currentGrantSessionId: "grant-2", highestConsumedCounter: 0 },
      north: { currentGrantSessionId: "grant-3", highestConsumedCounter: 0 },
      east: { currentGrantSessionId: "grant-4", highestConsumedCounter: 0 },
      host: { currentGrantSessionId: "grant-5", highestConsumedCounter: 7 },
    } as const;
    const table = new TableAuthority({
      tableId: "table-1",
      seed: "exhaustion",
      hostParticipantId: PARTICIPANTS.host,
      seats: {
        south: { occupant: "human", participantId: PARTICIPANTS.south, displayName: "south name", connected: true },
        west: { occupant: "ai" },
        north: { occupant: "ai" },
        east: { occupant: "ai" },
      },
      restoredLanes: lanes,
      restoredGrantHighWater: 5,
    });
    return table;
  }

  it("requires the atomic restore to carry the grant high-water", () => {
    expect(
      () =>
        new TableAuthority({
          tableId: "table-1",
          seed: "exhaustion",
          hostParticipantId: null,
          restoredLanes: {
            south: { currentGrantSessionId: "grant-1", highestConsumedCounter: 0 },
            west: { currentGrantSessionId: "grant-2", highestConsumedCounter: 0 },
            north: { currentGrantSessionId: "grant-3", highestConsumedCounter: 0 },
            east: { currentGrantSessionId: "grant-4", highestConsumedCounter: 0 },
            host: { currentGrantSessionId: "grant-5", highestConsumedCounter: 0 },
          },
        }),
    ).toThrow(/atomically/);
  });

  it("consumes the maximum counter once, then fails every new intent closed with no wrap and null next counters", () => {
    const table = nearExhaustedTable();
    expect(table.incarnationExhausted).toBe(false);
    expect(table.nextIntentCounter("south")).toBe(INTENT_COUNTER_MAX);
    const digestBefore = stateDigest(table.committedState());

    // The maximum counter itself is a normal exact-next consumption.
    const last = raw(table, playerActor("south"), `grant-1:${INTENT_COUNTER_MAX}`, { kind: "preview", selection: { type: "pass" } });
    expect(last.receipt?.outcome).toBe("accepted");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(INTENT_COUNTER_MAX);

    // The whole incarnation is now exhausted: every entitled lane reports null.
    expect(table.incarnationExhausted).toBe(true);
    INTENT_LANES.forEach((lane) => expect(table.nextIntentCounter(lane)).toBeNull());

    // Every later new intent rejects without mutation — the maxed lane, and every other lane too.
    const digest = stateDigest(table.committedState());
    const lanes = JSON.stringify(laneSnapshot(table));
    // Wrapping to a low counter cannot apply: it is at or below the high-water
    // and answers duplicate with no mutation.
    const wrap = raw(table, playerActor("south"), "grant-1:1", { kind: "cancel" });
    expect(wrap.receipt?.outcome).toBe("duplicate");
    expect(wrap.frame).toBeNull();
    const beyond = raw(table, playerActor("south"), `grant-1:${INTENT_COUNTER_MAX + 1}`, { kind: "cancel" });
    expect(beyond.identityViolation).toBe("intent-identity");
    const hostNext = raw(table, hostActor(), "grant-5:8", { kind: "host-announce", cue: "welcome" });
    expect(hostNext.identityViolation).toBe("intent-exhausted");
    expect(JSON.stringify(laneSnapshot(table))).toBe(lanes);
    expect(stateDigest(table.committedState())).toBe(digest);
    expect(digestBefore).not.toBe("");

    // An in-flight identity may still be resent: duplicates answer without mutation.
    const resent = raw(table, playerActor("south"), `grant-1:${INTENT_COUNTER_MAX}`, { kind: "preview", selection: { type: "pass" } });
    expect(resent.receipt?.outcome).toBe("duplicate");

    // Grant rotation cannot bypass exhaustion: rebinding the seat retires the
    // grant, but the fresh grant's exact next still rejects.
    table.bindSeat("south", { occupant: "human", participantId: "p-newcomer", displayName: "Newcomer", connected: false });
    const rotated = table.laneGrant("south");
    expect(rotated).not.toBe("grant-1");
    const afterRotation = raw(table, { role: "player", participantId: "p-newcomer", seat: "south" }, `${rotated}:1`, { kind: "cancel" });
    expect(afterRotation.identityViolation).toBe("intent-exhausted");
    expect(table.nextIntentCounter("south")).toBeNull();
  });

  it("restores an already-exhausted incarnation exhausted", () => {
    const table = new TableAuthority({
      tableId: "table-1",
      seed: "exhausted-restore",
      hostParticipantId: PARTICIPANTS.host,
      restoredLanes: {
        south: { currentGrantSessionId: "grant-1", highestConsumedCounter: INTENT_COUNTER_MAX },
        west: { currentGrantSessionId: "grant-2", highestConsumedCounter: 0 },
        north: { currentGrantSessionId: "grant-3", highestConsumedCounter: 0 },
        east: { currentGrantSessionId: "grant-4", highestConsumedCounter: 0 },
        host: { currentGrantSessionId: "grant-5", highestConsumedCounter: 0 },
      },
      restoredGrantHighWater: 5,
    });
    expect(table.incarnationExhausted).toBe(true);
    INTENT_LANES.forEach((lane) => expect(table.nextIntentCounter(lane)).toBeNull());
    expect(raw(table, hostActor(), "grant-5:1", { kind: "host-announce", cue: "welcome" }).identityViolation).toBe("intent-exhausted");
  });
});
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
