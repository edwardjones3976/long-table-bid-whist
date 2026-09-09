// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import {
  ORACLE_AI_SEATS,
  SEATS,
  advanceAiSeats,
  aiDecision,
  aiLegalOptions,
  applySeatAction,
  buildAiSeatView,
  openHand,
  type Card,
  type GameState,
  type Seat,
} from "../src";

function replacementCards(tag: string, count: number): Card[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `other-${tag}-${index}`,
    suit: "clubs" as const,
    rank: 3,
    label: "OTHER",
    glyph: "!",
  }));
}

/** Same public facts and the same own hand; every other concealed fact replaced. */
function counterfactualFor(state: GameState, seat: Seat): GameState {
  const variant = structuredClone(state);
  variant.seed = "counterfactual-seed";
  SEATS.filter((other) => other !== seat).forEach((other) => {
    variant.hands[other] = replacementCards(other, variant.hands[other].length);
  });
  variant.kitty = replacementCards("kitty", variant.kitty.length);
  variant.discardPile = replacementCards("discard", variant.discardPile.length);
  variant.events = [{ id: 1, text: "private record" }];
  return variant;
}

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
const AI_VIEW_INVENTORY = ["seat", "phase", "turn", "hand", "dealer", "auction", "contract", "currentTrick", "completedTricks", "tricksWon", "scores"];
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]

describe("AI seats", () => {
  it("receive exactly the own-hand-plus-public inventory", () => {
    const state = openHand({ seed: "ai-view" });
    const view = buildAiSeatView(state, "west") as unknown as Record<string, unknown>;
    expect(Object.keys(view)).toEqual(AI_VIEW_INVENTORY);
    expect(view.hand).toEqual(state.hands.west);
    // The view is constructed from the seat's own hand and public records only;
    // the counterfactual below proves no other concealed fact reaches it.
    expect(buildAiSeatView(counterfactualFor(state, "west"), "west")).toEqual(buildAiSeatView(state, "west"));
  });

  it("decide identically when every other concealed card is replaced", () => {
    let checked = 0;
    for (let index = 0; index < 8; index += 1) {
      let state = openHand({ seed: `ai-counterfactual-${index}` });
      // South commits first so an AI seat is on turn in the auction, then let
      // the hand progress through the phases to sample decisions in each one.
      state = applySeatAction(state, "south", { type: "bid", bid: { level: 3, mode: "high" } }).state;
      let guard = 0;
      while (state.phase !== "summary" && guard < 60) {
        const seat = state.turn;
        const options = aiLegalOptions(state, seat);
        const decision = aiDecision(buildAiSeatView(state, seat), options);
        const twin = counterfactualFor(state, seat);
        expect(buildAiSeatView(twin, seat)).toEqual(buildAiSeatView(state, seat));
        expect(aiDecision(buildAiSeatView(twin, seat), aiLegalOptions(twin, seat))).toEqual(decision);
        checked += 1;
        const result = applySeatAction(state, seat, decision);
        expect(result.error).toBeUndefined();
        state = result.state;
        guard += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("advance until a human seat must act and report every action taken", () => {
    const opened = openHand({ seed: "ai-advance", dealer: "south" });
    expect(opened.turn).toBe("west");
    const advanced = advanceAiSeats(opened, ORACLE_AI_SEATS);
    expect(advanced.state.turn).toBe("south");
    expect(advanced.actions.map((entry) => entry.seat)).toEqual(["west", "north", "east"]);

    let replayed = opened;
    advanced.actions.forEach((entry) => {
      const result = applySeatAction(replayed, entry.seat, entry.action);
      expect(result.error).toBeUndefined();
      replayed = result.state;
    });
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(advanced.state));
  });

  it("do nothing while the table is paused or when no seat is AI", () => {
    const opened = openHand({ seed: "ai-idle", dealer: "south" });
    expect(advanceAiSeats(opened, () => false).actions).toHaveLength(0);
    const paused = { ...opened, paused: true };
    expect(advanceAiSeats(paused, ORACLE_AI_SEATS).actions).toHaveLength(0);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
