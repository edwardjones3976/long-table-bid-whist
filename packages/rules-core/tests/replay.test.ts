// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import {
  ORACLE_AI_SEATS,
  advanceAiSeats,
  applySeatAction,
  legalSeatActions,
  manifestDigest,
  newReplayRecord,
  openHand,
  publicDigest,
  replayManifestError,
  replayMatches,
  replayRecord,
  stateDigest,
  type GameState,
  type ReplayRecord,
} from "../src";

/** South plays against three AI seats; every committed action is recorded. */
function playRecorded(seed: string): { record: ReplayRecord; live: GameState } {
  const record = newReplayRecord(seed);
  let state = openHand({ seed });
  const opening = advanceAiSeats(state, ORACLE_AI_SEATS);
  record.entries.push(...opening.actions);
  state = opening.state;

  let guard = 0;
  while (state.phase !== "summary") {
    const action =
      state.phase === "kitty"
        ? { type: "discard" as const, cardIds: state.hands.south.slice(0, 6).map((card) => card.id) }
        : (() => {
            const actions = legalSeatActions(state, "south");
            const bids = actions.filter((candidate) => candidate.type === "bid");
            return bids.length > 0 ? bids[bids.length - 1] : actions[0];
          })();
    const committed = applySeatAction(state, "south", action);
    expect(committed.error).toBeUndefined();
    record.entries.push({ seat: "south", action });
    const advanced = advanceAiSeats(committed.state, ORACLE_AI_SEATS);
    record.entries.push(...advanced.actions);
    state = advanced.state;
    guard += 1;
    if (guard > 100) throw new Error("replay guard exceeded");
  }
  return { record, live: state };
}

describe("deterministic replay", () => {
  it("reconstructs the identical state from the seed and the committed actions", () => {
    for (let index = 0; index < 6; index += 1) {
      const { record, live } = playRecorded(`replay-${index}`);
      expect(record.entries.length).toBeGreaterThan(40);
      const outcome = replayRecord(record);
      expect(outcome.failedAt).toBe(-1);
      expect(outcome.state).not.toBeNull();
      expect(outcome.publicDigest).toBe(publicDigest(live));
      expect(outcome.stateDigest).toBe(stateDigest(live));
      expect(replayMatches(record, live)).toBe(true);
    }
  });

  it("fails closed when an entry is tampered with", () => {
    const { record, live } = playRecorded("replay-tamper");
    const tampered: ReplayRecord = structuredClone(record);
    const target = tampered.entries.findIndex((entry) => entry.action.type === "play");
    tampered.entries[target] = { ...tampered.entries[target], seat: "north" };
    const outcome = replayRecord(tampered);
    expect(outcome.failedAt === target || outcome.stateDigest !== stateDigest(live)).toBe(true);
    expect(replayMatches(tampered, live)).toBe(false);
  });

  it("does not depend on wall-clock time or any state outside the record", () => {
    const { record } = playRecorded("replay-twice");
    const first = replayRecord(record);
    const second = replayRecord(structuredClone(record));
    expect(second.stateDigest).toBe(first.stateDigest);
    expect(second.publicDigest).toBe(first.publicDigest);
  });

  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
  it("binds a new record to the active manifest identity and digest", () => {
    const record = newReplayRecord("bound");
    expect(record.manifestId).toBe("RESTRICTED_TABLE_SLICE_0_1");
    expect(record.manifestDigest).toBe(manifestDigest());
    expect(replayManifestError(record)).toBeNull();
  });

  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
  it("detects a manifest digest mismatch before replay and reconstructs no state", () => {
    const { record, live } = playRecorded("replay-manifest-digest");
    const rebound: ReplayRecord = { ...structuredClone(record), manifestDigest: "00000000" };
    expect(replayManifestError(rebound)).not.toBeNull();
    const outcome = replayRecord(rebound);
    expect(outcome.failedAt).toBe(0);
    expect(outcome.error).toContain("manifest digest");
    // Nothing was reconstructed: no opening deal, no digests of any state.
    expect(outcome.state).toBeNull();
    expect(outcome.publicDigest).toBeNull();
    expect(outcome.stateDigest).toBeNull();
    expect(replayMatches(rebound, live)).toBe(false);
  });

  it("detects a manifest identity mismatch before replay and reconstructs no state", () => {
    const { record, live } = playRecorded("replay-manifest-id");
    const rebound = { ...structuredClone(record), manifestId: "SOME_OTHER_MANIFEST" } as unknown as ReplayRecord;
    const outcome = replayRecord(rebound);
    expect(outcome.failedAt).toBe(0);
    expect(outcome.error).toContain("manifest identity");
    expect(outcome.state).toBeNull();
    expect(outcome.publicDigest).toBeNull();
    expect(outcome.stateDigest).toBeNull();
    expect(replayMatches(rebound, live)).toBe(false);
  });

  it("validates the manifest binding even when the record would otherwise be unplayable", () => {
    // An unknown dealer would be reconstructed from the seed only after validation; a
    // manifest mismatch must win before any deal is attempted.
    const rebound = { ...newReplayRecord("unplayable", "nowhere" as unknown as "east"), manifestDigest: "ffffffff" } as ReplayRecord;
    const outcome = replayRecord(rebound);
    expect(outcome.state).toBeNull();
    expect(outcome.error).toContain("manifest digest");
  });
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
