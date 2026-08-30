// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import {
  ORACLE_AI_SEATS,
  advanceAiSeats,
  applySeatAction,
  legalSeatActions,
  newReplayRecord,
  openHand,
  publicDigest,
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
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
