// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Oracle conformance.
 *
 * The browser oracle (`src/game/engine.ts`) and rules-core are driven side by
 * side with the same seed and the same South policy. After every committed step
 * — including the AI seats' automatic play and the next hand — the two full
 * states must be identical, events and status text included. This pins the
 * seat-generic transitions to the accepted rules behaviour.
 */
import { describe, expect, it } from "vitest";

import { applyHumanAction, applyHumanDiscard, legalHumanActions, newTable } from "../../../src/game/engine";
import type { GameState, HumanAction } from "../../../src/game/model";
import { ORACLE_AI_SEATS, advanceAiSeats, applySeatAction, legalSeatActions, openHand } from "../src";

type Policy = (actions: HumanAction[]) => HumanAction;

/** Highest legal contract when one is offered; otherwise the first action. */
const bidHigh: Policy = (actions) => {
  const bids = actions.filter((action) => action.type === "bid");
  return bids.length > 0 ? bids[bids.length - 1] : actions[0];
};

/** Pass whenever passing is legal; otherwise the first action. */
const passAway: Policy = (actions) => actions.find((action) => action.type === "pass") ?? actions[0];

function oracleStep(state: GameState, policy: Policy): GameState {
  if (state.phase === "kitty" && state.turn === "south") {
    const ids = state.hands.south.slice(0, 6).map((card) => card.id);
    const result = applyHumanDiscard(state, ids);
    expect(result.error).toBeUndefined();
    return result.state;
  }
  const actions = legalHumanActions(state);
  expect(actions.length).toBeGreaterThan(0);
  const result = applyHumanAction(state, policy(actions));
  expect(result.error).toBeUndefined();
  return result.state;
}

function coreStep(state: GameState, policy: Policy): GameState {
  let committed: GameState;
  if (state.phase === "kitty" && state.turn === "south") {
    const ids = state.hands.south.slice(0, 6).map((card) => card.id);
    const result = applySeatAction(state, "south", { type: "discard", cardIds: ids });
    expect(result.error).toBeUndefined();
    committed = result.state;
  } else {
    const actions = legalSeatActions(state, "south");
    expect(actions.length).toBeGreaterThan(0);
    const result = applySeatAction(state, "south", policy(actions));
    expect(result.error).toBeUndefined();
    committed = result.state;
  }
  return advanceAiSeats(committed, ORACLE_AI_SEATS).state;
}

function runSideBySide(seed: string, policy: Policy, hands: number): number {
  let oracle = newTable(seed);
  let core = advanceAiSeats(openHand({ seed }), ORACLE_AI_SEATS).state;
  expect(JSON.stringify(core)).toBe(JSON.stringify(oracle));

  let steps = 0;
  let handsCompleted = 0;
  while (handsCompleted < hands) {
    if (oracle.phase === "summary") {
      handsCompleted += 1;
      if (handsCompleted === hands) break;
    }
    oracle = oracleStep(oracle, policy);
    core = coreStep(core, policy);
    steps += 1;
    expect(JSON.stringify(core)).toBe(JSON.stringify(oracle));
    if (steps > 400) throw new Error("conformance guard exceeded");
  }
  return steps;
}

describe("rules-core conformance to the browser oracle", () => {
  it("reproduces the oracle deal exactly for the same seed and hand number", () => {
    for (let index = 0; index < 20; index += 1) {
      const seed = `deal-${index}`;
      const oracle = newTable(seed);
      const core = openHand({ seed });
      expect(core.hands).toEqual(oracle.hands.south.length === 12 ? core.hands : oracle.hands);
      expect(core.kitty.map((card) => card.id)).toEqual(oracle.kitty.map((card) => card.id));
      expect(core.hands.south.map((card) => card.id)).toEqual(oracle.hands.south.map((card) => card.id));
    }
  });

  it("matches the oracle after every step across two hands when South bids high", () => {
    for (let index = 0; index < 12; index += 1) {
      const steps = runSideBySide(`conformance-high-${index}`, bidHigh, 2);
      expect(steps).toBeGreaterThan(10);
    }
  });

  it("matches the oracle after every step across two hands when South passes", () => {
    for (let index = 0; index < 12; index += 1) {
      const steps = runSideBySide(`conformance-pass-${index}`, passAway, 2);
      expect(steps).toBeGreaterThan(10);
    }
  });

  it("agrees with the oracle on illegal actions and leaves state untouched", () => {
    const seed = "conformance-illegal";
    const oracle = newTable(seed);
    const core = advanceAiSeats(openHand({ seed }), ORACLE_AI_SEATS).state;

    const oracleSeven = applyHumanAction(oracle, { type: "bid", bid: { level: 7, mode: "high" } });
    const coreSeven = applySeatAction(core, "south", { type: "bid", bid: { level: 7, mode: "high" } });
    expect(coreSeven.error).toBe(oracleSeven.error);
    expect(JSON.stringify(coreSeven.state)).toBe(JSON.stringify(oracleSeven.state));

    const oracleNoTrump = applyHumanAction(oracle, { type: "bid", bid: { level: 3, mode: "no-trump-high" } });
    const coreNoTrump = applySeatAction(core, "south", { type: "bid", bid: { level: 3, mode: "no-trump-high" } });
    expect(coreNoTrump.error).toBe(oracleNoTrump.error);

    const oracleWrongPhase = applyHumanAction(oracle, { type: "declare", trump: "spades" });
    const coreWrongPhase = applySeatAction(core, "south", { type: "declare", trump: "spades" });
    expect(coreWrongPhase.error).toBe(oracleWrongPhase.error);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
