// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
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

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
import { applySeatAction, stateDigest } from "../../../packages/rules-core/src";
import { INTENT_COUNTER_MAX, INTENT_LANES, LIMITS, type TableIntent } from "../../../packages/protocol/src";
import {
  GRANT_NAMESPACE,
  INCARNATION_ID_MAX_LENGTH,
  TableAuthority,
  type Actor,
  type CommitEngine,
  type IncarnationState,
  type IntentLaneState,
  type TableOptions,
} from "../src/table";
import {
  PARTICIPANTS,
  PUBLIC_ACTOR,
  TEST_INCARNATION,
  createTable,
  grantFor,
  hostActor,
  incarnationState,
  nextIntentId,
  playerActor,
  playerSnapshot,
  submit,
} from "./support";
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

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
      // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
      // Another incarnation's south grant with this lane's exact counter, a
      // never-issued grant of this incarnation, the legacy grant form, and
      // case/spacing variants of the current grant: none is the current grant.
      `${grantFor("other-incarnation", 1)}:1`,
      `${grantFor(TEST_INCARNATION, 999)}:1`,
      "grant-1:1",
      `${southGrant.toUpperCase()}:1`,
      `${southGrant} :1`,
      // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
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

  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
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
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
});

describe("maximum-counter exhaustion", () => {
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
  const EXHAUSTION_INCARNATION = "exhaustion";
  const southGrant = grantFor(EXHAUSTION_INCARNATION, 1);
  const hostGrant = grantFor(EXHAUSTION_INCARNATION, 5);
  const PASS: TableIntent = { kind: "preview", selection: { type: "pass" } };

  function nearExhaustedTable() {
    // An atomically restored incarnation whose south lane sits one below the
    // maximum, exactly as a restarted authority would restore it.
    return createTable({
      seed: "exhaustion",
      incarnation: { kind: "restore", state: incarnationState(EXHAUSTION_INCARNATION, { south: INTENT_COUNTER_MAX - 1, host: 7 }) },
    });
  }

  it("consumes the maximum counter once, then fails every new intent closed with no wrap and null next counters", () => {
    const table = nearExhaustedTable();
    expect(table.incarnationExhausted).toBe(false);
    expect(table.laneGrant("south")).toBe(southGrant);
    expect(table.laneGrant("host")).toBe(hostGrant);
    expect(table.nextIntentCounter("south")).toBe(INTENT_COUNTER_MAX);
    expect(table.nextIntentCounter("host")).toBe(8);
    const digestBefore = stateDigest(table.committedState());

    // The maximum counter itself is a normal exact-next consumption.
    const last = raw(table, playerActor("south"), `${southGrant}:${INTENT_COUNTER_MAX}`, PASS);
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
    const wrap = raw(table, playerActor("south"), `${southGrant}:1`, { kind: "cancel" });
    expect(wrap.receipt?.outcome).toBe("duplicate");
    expect(wrap.frame).toBeNull();
    const beyond = raw(table, playerActor("south"), `${southGrant}:${INTENT_COUNTER_MAX + 1}`, { kind: "cancel" });
    expect(beyond.identityViolation).toBe("intent-identity");
    const hostNext = raw(table, hostActor(), `${hostGrant}:8`, { kind: "host-announce", cue: "welcome" });
    expect(hostNext.identityViolation).toBe("intent-exhausted");
    expect(JSON.stringify(laneSnapshot(table))).toBe(lanes);
    expect(stateDigest(table.committedState())).toBe(digest);
    expect(digestBefore).not.toBe("");

    // An in-flight identity may still be resent: duplicates answer without mutation.
    const resent = raw(table, playerActor("south"), `${southGrant}:${INTENT_COUNTER_MAX}`, PASS);
    expect(resent.receipt?.outcome).toBe("duplicate");

    // Grant rotation cannot bypass exhaustion: rebinding the seat retires the
    // grant, but the fresh grant's exact next still rejects.
    table.bindSeat("south", { occupant: "human", participantId: "p-newcomer", displayName: "Newcomer", connected: false });
    const rotated = table.laneGrant("south");
    expect(rotated).toBe(grantFor(EXHAUSTION_INCARNATION, 6));
    const afterRotation = raw(table, { role: "player", participantId: "p-newcomer", seat: "south" }, `${rotated}:1`, { kind: "cancel" });
    expect(afterRotation.identityViolation).toBe("intent-exhausted");
    expect(table.nextIntentCounter("south")).toBeNull();
  });

  it("keeps exhaustion through grant rotation and through export and restore, even once no current lane record sits at the maximum", () => {
    const table = nearExhaustedTable();
    expect(raw(table, playerActor("south"), `${southGrant}:${INTENT_COUNTER_MAX}`, PASS).receipt?.outcome).toBe("accepted");
    expect(table.incarnationExhausted).toBe(true);

    // Rotation retires the maxed lane record; the exhaustion is the incarnation's, not the record's.
    table.bindSeat("south", { occupant: "human", participantId: "p-newcomer", displayName: "Newcomer", connected: false });
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(0);
    expect(INTENT_LANES.every((lane) => table.intentLaneState(lane).highestConsumedCounter < INTENT_COUNTER_MAX)).toBe(true);
    expect(table.incarnationExhausted).toBe(true);

    const exported = table.exportIncarnation();
    expect(exported.incarnationId).toBe(EXHAUSTION_INCARNATION);
    expect(exported.exhausted).toBe(true);
    expect(exported.grantHighWater).toBe(6);
    expect(exported.lanes.south).toEqual({ currentGrantSessionId: grantFor(EXHAUSTION_INCARNATION, 6), highestConsumedCounter: 0 });
    expect(exported.lanes.host).toEqual({ currentGrantSessionId: hostGrant, highestConsumedCounter: 7 });

    const restored = createTable({ seed: "exhaustion", incarnation: { kind: "restore", state: exported } });
    expect(restored.incarnationExhausted).toBe(true);
    INTENT_LANES.forEach((lane) => expect(restored.nextIntentCounter(lane)).toBeNull());
    expect(raw(restored, hostActor(), `${hostGrant}:8`, { kind: "host-announce", cue: "welcome" }).identityViolation).toBe("intent-exhausted");
    // Seat bindings are table state, not incarnation state: the restarted
    // table seats its own occupant, who holds the restored (rotated) grant.
    expect(restored.laneGrant("south")).toBe(grantFor(EXHAUSTION_INCARNATION, 6));
    expect(raw(restored, playerActor("south"), `${grantFor(EXHAUSTION_INCARNATION, 6)}:1`, { kind: "cancel" }).identityViolation).toBe("intent-exhausted");

    // Only a distinct, externally allocated incarnation resumes.
    const successor = createTable({ seed: "exhaustion", incarnationId: "exhaustion-successor" });
    expect(successor.incarnationExhausted).toBe(false);
    expect(successor.laneGrant("south")).toBe(grantFor("exhaustion-successor", 1));
    expect(successor.nextIntentCounter("south")).toBe(1);
    expect(raw(successor, playerActor("south"), `${successor.laneGrant("south")}:1`, PASS).receipt?.outcome).toBe("accepted");
  });

  it("restores an already-exhausted incarnation exhausted", () => {
    const table = createTable({
      seed: "exhausted-restore",
      incarnation: { kind: "restore", state: incarnationState(EXHAUSTION_INCARNATION, { south: INTENT_COUNTER_MAX }) },
    });
    expect(table.incarnationExhausted).toBe(true);
    INTENT_LANES.forEach((lane) => expect(table.nextIntentCounter(lane)).toBeNull());
    expect(raw(table, hostActor(), `${hostGrant}:1`, { kind: "host-announce", cue: "welcome" }).identityViolation).toBe("intent-exhausted");
  });
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
});

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
const BID_3_HIGH: TableIntent = { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } };
const PASS_PREVIEW: TableIntent = { kind: "preview", selection: { type: "pass" } };

describe("incarnation-scoped grants", () => {
  it("issues disjoint grants to two fresh authorities sharing an external table id, and each refuses the other's identity", () => {
    const first = createTable({ seed: "shared-table", tableId: "table-shared", incarnationId: "incarnation-a" });
    const second = createTable({ seed: "shared-table", tableId: "table-shared", incarnationId: "incarnation-b" });
    const firstGrants = INTENT_LANES.map((lane) => first.laneGrant(lane));
    const secondGrants = INTENT_LANES.map((lane) => second.laneGrant(lane));
    expect(firstGrants).toEqual([1, 2, 3, 4, 5].map((counter) => grantFor("incarnation-a", counter)));
    expect(secondGrants).toEqual([1, 2, 3, 4, 5].map((counter) => grantFor("incarnation-b", counter)));
    expect(new Set([...firstGrants, ...secondGrants]).size).toBe(10);

    // The old identity — the first incarnation's south grant with the exact
    // next counter — is refused by the second authority without any mutation.
    const before = laneSnapshot(second);
    const digest = stateDigest(second.committedState());
    const crossed = raw(second, playerActor("south"), `${first.laneGrant("south")}:1`, PASS_PREVIEW);
    expect(crossed.identityViolation).toBe("intent-identity");
    expect(crossed.receipt).toBeNull();
    expect(JSON.stringify(laneSnapshot(second))).toBe(JSON.stringify(before));
    expect(stateDigest(second.committedState())).toBe(digest);

    // Each authority still honours exactly its own identity.
    expect(raw(second, playerActor("south"), `${second.laneGrant("south")}:1`, PASS_PREVIEW).receipt?.outcome).toBe("accepted");
    expect(raw(first, playerActor("south"), `${first.laneGrant("south")}:1`, PASS_PREVIEW).receipt?.outcome).toBe("accepted");
    expect(raw(first, playerActor("south"), `${second.laneGrant("south")}:2`, PASS_PREVIEW).identityViolation).toBe("intent-identity");
  });

  it("refuses a fresh authority without an explicit incarnation or with a malformed incarnation id, and bounds the id to the protocol id limit", () => {
    const base = { tableId: "table-1", seed: "no-incarnation", hostParticipantId: null };
    expect(() => new TableAuthority(base as unknown as TableOptions)).toThrow(/incarnation bundle required/);
    expect(() => new TableAuthority({ ...base, incarnation: { kind: "later" } } as unknown as TableOptions)).toThrow(/incarnation bundle required/);
    for (const incarnationId of ["", "with:colon", "a".repeat(INCARNATION_ID_MAX_LENGTH + 1), "sp ace", "tab\tbed", "ünicode", ":"]) {
      expect(() => new TableAuthority({ ...base, incarnation: { kind: "new", incarnationId } }), JSON.stringify(incarnationId)).toThrow(/incarnation id rejected/);
    }
    // The longest valid id still keeps the worst-case identity inside the protocol id.
    const longest = "x".repeat(INCARNATION_ID_MAX_LENGTH);
    const table = createTable({ seed: "longest", incarnationId: longest });
    expect(table.laneGrant("south")).toBe(`${GRANT_NAMESPACE}:${longest}:1`);
    expect(`${GRANT_NAMESPACE}:${longest}:${INTENT_COUNTER_MAX}:${INTENT_COUNTER_MAX}`.length).toBe(LIMITS.id);
    expect(raw(table, playerActor("south"), `${table.laneGrant("south")}:1`, PASS_PREVIEW).receipt?.outcome).toBe("accepted");
  });
});

describe("export and atomic restore", () => {
  it("preserves consumed identities as duplicates and advertises the exact next counter after a restart", () => {
    const table = createTable({ seed: "restart", incarnationId: "restart-incarnation" });
    const south = playerActor("south");
    const preview = nextIntentId(table, "south");
    expect(raw(table, south, preview, BID_3_HIGH).receipt?.outcome).toBe("accepted");
    const confirm = nextIntentId(table, "south");
    expect(raw(table, south, confirm, { kind: "confirm" }).receipt?.committed).toBe(true);
    const announce = nextIntentId(table, "host");
    expect(raw(table, hostActor(), announce, { kind: "host-announce", cue: "welcome" }).receipt?.outcome).toBe("accepted");

    const exported = table.exportIncarnation();
    expect(exported).toEqual({
      incarnationId: "restart-incarnation",
      lanes: {
        south: { currentGrantSessionId: grantFor("restart-incarnation", 1), highestConsumedCounter: 2 },
        west: { currentGrantSessionId: grantFor("restart-incarnation", 2), highestConsumedCounter: 0 },
        north: { currentGrantSessionId: grantFor("restart-incarnation", 3), highestConsumedCounter: 0 },
        east: { currentGrantSessionId: grantFor("restart-incarnation", 4), highestConsumedCounter: 0 },
        host: { currentGrantSessionId: grantFor("restart-incarnation", 5), highestConsumedCounter: 1 },
      },
      grantHighWater: 5,
      exhausted: false,
    });
    // The export is a deep copy: changing it changes nothing in the authority.
    (exported.lanes as Record<string, IntentLaneState>).south = { currentGrantSessionId: "tampered", highestConsumedCounter: 0 };
    expect(table.laneGrant("south")).toBe(grantFor("restart-incarnation", 1));
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);

    const restarted = createTable({ seed: "restart", incarnation: { kind: "restore", state: table.exportIncarnation() } });
    expect(restarted.exportIncarnation()).toEqual(table.exportIncarnation());
    INTENT_LANES.forEach((lane) => expect(restarted.laneGrant(lane)).toBe(table.laneGrant(lane)));
    expect(restarted.nextIntentCounter("south")).toBe(3);
    expect(restarted.nextIntentCounter("host")).toBe(2);
    expect(restarted.incarnationExhausted).toBe(false);

    // Every consumed identity is a duplicate on the restarted authority, with no mutation of any kind.
    const digest = stateDigest(restarted.committedState());
    const lanes = JSON.stringify(laneSnapshot(restarted));
    const version = restarted.currentVersion;
    const consumed: [Actor, string, TableIntent][] = [
      [south, preview, BID_3_HIGH],
      [south, confirm, { kind: "confirm" }],
      [hostActor(), announce, { kind: "host-announce", cue: "welcome" }],
    ];
    for (const [actor, intentId, intent] of consumed) {
      const again = raw(restarted, actor, intentId, intent);
      expect(again.receipt?.outcome, intentId).toBe("duplicate");
      expect(again.frame).toBeNull();
      expect(again.seatUpdate).toBeNull();
    }
    expect(JSON.stringify(laneSnapshot(restarted))).toBe(lanes);
    expect(stateDigest(restarted.committedState())).toBe(digest);
    expect(restarted.currentVersion).toBe(version);

    // The exact next counter applies once; the one before it was consumed by the earlier incarnation run.
    expect(raw(restarted, south, `${restarted.laneGrant("south")}:3`, PASS_PREVIEW).receipt?.outcome).toBe("accepted");
    expect(restarted.nextIntentCounter("south")).toBe(4);
    expect(raw(restarted, hostActor(), `${restarted.laneGrant("host")}:2`, { kind: "host-announce", cue: "hand-starting" }).receipt?.outcome).toBe("accepted");
  });

  it("fails every malformed restore permutation closed, leaving no authority", () => {
    const INCARNATION = "restore-check";
    const valid = incarnationState(INCARNATION, { south: 3, host: 1 });
    const attempt = (state: unknown) => () => createTable({ seed: "restore-check", incarnation: { kind: "restore", state: state as IncarnationState } });
    expect(attempt(valid)).not.toThrow();
    const southWith = (patch: Partial<Record<keyof IntentLaneState, unknown>> & Record<string, unknown>) => ({
      ...valid,
      lanes: { ...valid.lanes, south: { ...valid.lanes.south, ...patch } },
    });
    const permutations: [string, unknown][] = [
      ["missing lane", { ...valid, lanes: (({ east: _east, ...rest }) => rest)(valid.lanes) }],
      ["extra lane", { ...valid, lanes: { ...valid.lanes, dealer: { currentGrantSessionId: grantFor(INCARNATION, 6), highestConsumedCounter: 0 } } }],
      ["extra state field", { ...valid, seed: "leak" }],
      ["missing state field", (({ exhausted: _exhausted, ...rest }) => rest)(valid)],
      ["extra lane field", southWith({ note: "x" })],
      ["missing lane field", { ...valid, lanes: { ...valid.lanes, south: { currentGrantSessionId: valid.lanes.south.currentGrantSessionId } } }],
      ["foreign namespace", southWith({ currentGrantSessionId: `grant:${INCARNATION}:1` })],
      ["foreign incarnation", southWith({ currentGrantSessionId: grantFor("other", 1) })],
      ["legacy grant form", southWith({ currentGrantSessionId: "grant-1" })],
      ["grant with an extra divider", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:1:1` })],
      ["grant that is not a string", southWith({ currentGrantSessionId: 1 })],
      ["duplicate grant", { ...valid, lanes: { ...valid.lanes, west: { ...valid.lanes.west, currentGrantSessionId: valid.lanes.south.currentGrantSessionId } } }],
      ["noncanonical grant: leading zero", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:01` })],
      ["noncanonical grant: zero", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:0` })],
      ["noncanonical grant: sign", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:+1` })],
      ["noncanonical grant: fraction", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:1.0` })],
      ["noncanonical grant: exponent", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:1e0` })],
      ["noncanonical grant: beyond the maximum", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:9007199254740992` })],
      ["noncanonical grant: empty counter", southWith({ currentGrantSessionId: `${GRANT_NAMESPACE}:${INCARNATION}:` })],
      ["grant high-water below the highest grant", { ...valid, grantHighWater: 4 }],
      ["grant high-water above the highest grant", { ...valid, grantHighWater: 6 }],
      ["grant high-water noncanonical", { ...valid, grantHighWater: 5.5 }],
      ["grant high-water not a number", { ...valid, grantHighWater: "5" }],
      ["invalid counter: negative", southWith({ highestConsumedCounter: -1 })],
      ["invalid counter: negative zero", southWith({ highestConsumedCounter: -0 })],
      ["invalid counter: fraction", southWith({ highestConsumedCounter: 1.5 })],
      ["invalid counter: beyond the maximum", southWith({ highestConsumedCounter: INTENT_COUNTER_MAX + 1 })],
      ["invalid counter: string", southWith({ highestConsumedCounter: "3" })],
      ["invalid counter: null", southWith({ highestConsumedCounter: null })],
      ["inconsistent exhaustion", { ...incarnationState(INCARNATION, { west: INTENT_COUNTER_MAX }), exhausted: false }],
      ["exhaustion not a boolean", { ...valid, exhausted: "no" }],
      ["malformed incarnation id", { ...valid, incarnationId: "restore:check" }],
      ["incarnation id of another incarnation", { ...valid, incarnationId: "other" }],
      ["incarnation id not a string", { ...valid, incarnationId: 7 }],
      ["lanes null", { ...valid, lanes: null }],
      ["lane record null", { ...valid, lanes: { ...valid.lanes, south: null } }],
      ["state null", null],
      ["state not an object", "restore-check"],
    ];
    for (const [name, state] of permutations) {
      expect(attempt(state), name).toThrow(/incarnation restore rejected/);
    }
    // True exhaustion with no lane at the maximum is valid: the maxed lane may have rotated away.
    const survivingExhaustion = createTable({ seed: "restore-check", incarnation: { kind: "restore", state: { ...valid, exhausted: true } } });
    expect(survivingExhaustion.incarnationExhausted).toBe(true);
    INTENT_LANES.forEach((lane) => expect(survivingExhaustion.nextIntentCounter(lane)).toBeNull());
  });
});

describe("duplicates and engine rejection", () => {
  it("leaves the full player projection byte-identical, feedback included, when a consumed identity is retried", () => {
    const table = createTable({ seed: "duplicate-projection" });
    const south = playerActor("south");

    // A rejected intent leaves feedback in the seat's own projection.
    const stale = nextIntentId(table, "south");
    expect(raw(table, south, stale, { kind: "cancel" }, 0).receipt?.code).toBe("stale-version");
    expect(playerSnapshot(table, "south").feedbackCode).toBe("stale-version");
    const withFeedback = JSON.stringify(playerSnapshot(table, "south"));
    const host = JSON.stringify(table.snapshot("host", null, PARTICIPANTS.host));
    const pub = JSON.stringify(table.snapshot("public", null, PARTICIPANTS.spectator));
    const revision = table.seatRevision("south");
    const lanes = JSON.stringify(laneSnapshot(table));
    const digest = stateDigest(table.committedState());
    const replay = JSON.stringify(table.exportReplay());
    const version = table.currentVersion;
    const incarnation = JSON.stringify(table.exportIncarnation());

    // The retry of the consumed identity — with any version, any intent body — changes nothing.
    for (const retry of [raw(table, south, stale, { kind: "cancel" }), raw(table, south, stale, BID_3_HIGH, 0)]) {
      expect(retry.receipt?.outcome).toBe("duplicate");
      expect(retry.receipt?.code).toBe("duplicate-input-id");
      expect(retry.frame).toBeNull();
      expect(retry.seatUpdate).toBeNull();
    }
    expect(JSON.stringify(playerSnapshot(table, "south"))).toBe(withFeedback);
    expect(playerSnapshot(table, "south").feedbackCode).toBe("stale-version");
    expect(JSON.stringify(table.snapshot("host", null, PARTICIPANTS.host))).toBe(host);
    expect(JSON.stringify(table.snapshot("public", null, PARTICIPANTS.spectator))).toBe(pub);
    expect(table.seatRevision("south")).toBe(revision);
    expect(JSON.stringify(laneSnapshot(table))).toBe(lanes);
    expect(stateDigest(table.committedState())).toBe(digest);
    expect(JSON.stringify(table.exportReplay())).toBe(replay);
    expect(table.currentVersion).toBe(version);
    expect(JSON.stringify(table.exportIncarnation())).toBe(incarnation);
    expect(table.lastFrame()?.version).toBe(version);

    // An accepted preview retried: the preview stands, the feedback stays clear, the projection is identical.
    const preview = nextIntentId(table, "south");
    expect(raw(table, south, preview, BID_3_HIGH).receipt?.outcome).toBe("accepted");
    expect(playerSnapshot(table, "south").feedbackCode).toBeNull();
    const previewed = JSON.stringify(playerSnapshot(table, "south"));
    expect(raw(table, south, preview, BID_3_HIGH).receipt?.outcome).toBe("duplicate");
    expect(JSON.stringify(playerSnapshot(table, "south"))).toBe(previewed);
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");
  });

  it("consumes the exact counter for an engine-rejected confirm like every other outcome", () => {
    const refuse: CommitEngine = (game, seat, action) => ({ ...applySeatAction(game, seat, action), error: "engine refused" });
    const table = createTable({ seed: "engine-rejected", commitEngine: refuse });
    const south = playerActor("south");
    expect(submit(table, south, BID_3_HIGH).receipt.outcome).toBe("accepted");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(1);
    const version = table.currentVersion;
    const digest = stateDigest(table.committedState());

    const confirm = nextIntentId(table, "south");
    const rejected = raw(table, south, confirm, { kind: "confirm" });
    expect(rejected.receipt?.outcome).toBe("rejected");
    expect(rejected.receipt?.code).toBe("engine-rejected");
    expect(rejected.receipt?.committed).toBe(false);
    expect(rejected.frame).toBeNull();
    expect(table.currentVersion).toBe(version);
    expect(stateDigest(table.committedState())).toBe(digest);
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);
    expect(playerSnapshot(table, "south").feedbackCode).toBe("engine-rejected");
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");

    // The consumed identity is terminal: a retry is a duplicate, a gap is refused, the exact next applies.
    expect(raw(table, south, confirm, { kind: "confirm" }).receipt?.outcome).toBe("duplicate");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);
    expect(raw(table, south, `${table.laneGrant("south")}:4`, { kind: "cancel" }).identityViolation).toBe("intent-identity");
    expect(submit(table, south, { kind: "cancel" }).receipt.outcome).toBe("accepted");
    expect(table.intentLaneState("south").highestConsumedCounter).toBe(3);

    // The production default is untouched: the same drive without the seam commits through the rules kernel.
    const production = createTable({ seed: "engine-rejected" });
    expect(submit(production, south, BID_3_HIGH).receipt.outcome).toBe("accepted");
    expect(submit(production, south, { kind: "confirm" }).receipt.committed).toBe(true);
    expect(production.currentVersion).toBe(version + 1);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
