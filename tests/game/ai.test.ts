import { describe, expect, it } from "vitest";
import {
  autoplayAiTurns,
  bidWhistReducer,
  chooseAiAction,
  chooseAiDiscard,
  createHand,
  legalBids,
  projectForSeat,
  type GameAction,
  type HandState,
  type Hands,
} from "../../src/game";

describe("hidden-information-safe deterministic AI", () => {
  it("chooses the same action when only concealed opponent cards are rearranged", () => {
    const state = createHand({ seed: "no-peeking", dealer: 0 });
    const swappedHands: Hands = [
      state.hands[0].slice(),
      state.hands[1].slice(),
      state.hands[3].slice(),
      state.hands[2].slice(),
    ];
    const altered: HandState = { ...state, hands: swappedHands };
    const originalView = projectForSeat(state, state.turn);
    const alteredView = projectForSeat(altered, altered.turn);
    expect(alteredView.hand).toEqual(originalView.hand);
    expect(alteredView.publicState).toEqual(originalView.publicState);
    expect(chooseAiAction(alteredView)).toEqual(chooseAiAction(originalView));
  });

  it("stops cleanly when a human seat's turn arrives", () => {
    const state = createHand({ seed: "human-stop", dealer: 0 });
    // Seat 1 acts, then seat 2 is intentionally human-controlled.
    const result = autoplayAiTurns(state, { aiSeats: [0, 1, 3] });
    expect(result.actions).toHaveLength(1);
    expect(result.state.turn).toBe(2);
    expect(result.state.phase).toBe("bidding");
  });

  it("removes pass from the forced dealer's legal choices", () => {
    let state = createHand({ seed: "forced-choice", dealer: 0 });
    state = [1, 2, 3].reduce(
      (current, seat) =>
        bidWhistReducer(current, {
          type: "BID",
          seat: seat as 1 | 2 | 3,
          bid: { kind: "pass" },
        }),
      state,
    );
    const choices = legalBids(projectForSeat(state, 0));
    expect(choices).not.toContainEqual({ kind: "pass" });
    expect(choices).toContainEqual({ kind: "contract", level: 3, mode: "high" });
  });

  it("discards six deterministic cards and prioritizes worthless NT jokers", () => {
    let state = createHand({ seed: "nt-discard", dealer: 0 });
    const auction: GameAction[] = [
      { type: "BID", seat: 1, bid: { kind: "contract", level: 3, mode: "no-trump" } },
      { type: "BID", seat: 2, bid: { kind: "pass" } },
      { type: "BID", seat: 3, bid: { kind: "pass" } },
      { type: "BID", seat: 0, bid: { kind: "pass" } },
      { type: "DECLARE", seat: 1, declaration: { direction: "high", trump: null } },
    ];
    state = auction.reduce(bidWhistReducer, state);
    const view = projectForSeat(state, 1);
    const first = chooseAiDiscard(view);
    const second = chooseAiDiscard(view);
    expect(first).toEqual(second);
    expect(first).toHaveLength(6);
    for (const joker of view.hand.filter((candidate) => candidate.kind === "joker")) {
      expect(first).toContain(joker.id);
    }
  });
});
