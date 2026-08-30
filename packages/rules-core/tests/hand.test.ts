// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import {
  SEATS,
  applySeatAction,
  legalSeatActions,
  nextSeat,
  openHand,
  setPaused,
  teamBooks,
  type GameState,
  type Seat,
  type SeatAction,
} from "../src";

function cardsInPlay(state: GameState): number {
  return (
    SEATS.reduce((sum, seat) => sum + state.hands[seat].length, 0) +
    state.kitty.length +
    state.discardPile.length +
    state.currentTrick.length +
    state.completedTricks.reduce((sum, trick) => sum + trick.cards.length, 0)
  );
}

/** Drives four human seats with one policy until the summary. */
function playFourHumans(seed: string, prefer: (actions: SeatAction[]) => SeatAction): GameState {
  let state = openHand({ seed });
  let guard = 0;
  while (state.phase !== "summary") {
    const seat = state.turn;
    let action: SeatAction;
    if (state.phase === "kitty") {
      action = { type: "discard", cardIds: state.hands[seat].slice(0, 6).map((card) => card.id) };
    } else {
      const actions = legalSeatActions(state, seat);
      expect(actions.length, `no action for ${seat} in ${state.phase}`).toBeGreaterThan(0);
      action = prefer(actions);
    }
    const result = applySeatAction(state, seat, action);
    expect(result.error).toBeUndefined();
    state = result.state;
    expect(cardsInPlay(state)).toBe(54);
    guard += 1;
    if (guard > 200) throw new Error("four-human guard exceeded");
  }
  return state;
}

describe("seat-generic hand", () => {
  it("opens a hand with no automatic play and the seat after the dealer to act", () => {
    const state = openHand({ seed: "open-only", dealer: "north" });
    expect(state.auction).toHaveLength(0);
    expect(state.turn).toBe(nextSeat("north"));
    expect(state.turn).toBe("east");
    SEATS.forEach((seat) => expect(state.hands[seat]).toHaveLength(12));
    expect(state.kitty).toHaveLength(6);
    expect(cardsInPlay(state)).toBe(54);
  });

  it("lets four human seats complete a hand with cards conserved at every step", () => {
    const state = playFourHumans("four-humans", (actions) => {
      const bids = actions.filter((action) => action.type === "bid");
      return bids.length > 0 ? bids[bids.length - 1] : actions[0];
    });
    expect(state.completedTricks).toHaveLength(12);
    expect(Object.values(state.hands).flat()).toHaveLength(0);
    const books = teamBooks(state);
    expect(books["north-south"] + books["east-west"]).toBe(12);
    expect(state.summary).toContain("Score");
    expect(legalSeatActions(state, "west")).toEqual([{ type: "next-hand" }]);
  });

  it("forces the dealer to bid after three passes", () => {
    let state = openHand({ seed: "forced-dealer", dealer: "east" });
    for (const seat of ["south", "west", "north"] as Seat[]) {
      const result = applySeatAction(state, seat, { type: "pass" });
      expect(result.error).toBeUndefined();
      state = result.state;
    }
    expect(state.turn).toBe("east");
    expect(legalSeatActions(state, "east").some((action) => action.type === "pass")).toBe(false);
    const forcedPass = applySeatAction(state, "east", { type: "pass" });
    expect(forcedPass.error).toBe("That action is not legal now");
    const bid = applySeatAction(state, "east", { type: "bid", bid: { level: 3, mode: "low" } });
    expect(bid.error).toBeUndefined();
    expect(bid.state.contract?.bidder).toBe("east");
    expect(bid.state.phase).toBe("declaration");
  });

  it("refuses an action from a seat that is not on turn", () => {
    const state = openHand({ seed: "not-on-turn" });
    const result = applySeatAction(state, "west", { type: "pass" });
    expect(result.error).toBe("Wait for your turn");
    expect(result.state).toEqual(state);
    expect(legalSeatActions(state, "west")).toEqual([]);
  });

  it("withholds level 7 and No Trump under the active manifest", () => {
    const state = openHand({ seed: "withheld" });
    const offered = legalSeatActions(state, "south").filter((action) => action.type === "bid");
    expect(offered.length).toBeGreaterThan(0);
    offered.forEach((action) => {
      if (action.type !== "bid") return;
      expect(action.bid.level).toBeLessThanOrEqual(6);
      expect(["high", "low"]).toContain(action.bid.mode);
    });
    expect(applySeatAction(state, "south", { type: "bid", bid: { level: 7, mode: "high" } }).error).toBe(
      "That action is not legal now",
    );
    expect(
      applySeatAction(state, "south", { type: "bid", bid: { level: 4, mode: "no-trump-low" } }).error,
    ).toBe("That action is not legal now");
  });

  it("enforces follow suit for any seat", () => {
    const state = openHand({ seed: "follow-suit" });
    state.phase = "play";
    state.contract = { bidder: "west", level: 3, mode: "high", trump: "spades" };
    state.turn = "west";
    state.currentTrick = [
      { seat: "east", card: { id: "lead", suit: "hearts", rank: 10, label: "10♥", glyph: "♥" } },
    ];
    state.hands.west = [
      { id: "heart", suit: "hearts", rank: 2, label: "2♥", glyph: "♥" },
      { id: "club", suit: "clubs", rank: 14, label: "A♣", glyph: "♣" },
    ];
    expect(legalSeatActions(state, "west")).toEqual([{ type: "play", cardId: "heart" }]);
    const illegal = applySeatAction(state, "west", { type: "play", cardId: "club" });
    expect(illegal.error).toBe("Follow suit");
    expect(illegal.state.hands.west).toHaveLength(2);
  });

  it("pauses without touching cards, bids, tricks or score, and resumes", () => {
    const state = openHand({ seed: "pause" });
    const paused = setPaused(state, true);
    expect(paused.paused).toBe(true);
    expect(paused.hands).toEqual(state.hands);
    expect(paused.auction).toEqual(state.auction);
    expect(paused.scores).toEqual(state.scores);
    expect(legalSeatActions(paused, "south")).toEqual([]);
    expect(applySeatAction(paused, "south", { type: "pass" }).error).toBe("Table is paused");
    const resumed = setPaused(paused, false);
    expect(resumed.paused).toBe(false);
    expect(applySeatAction(resumed, "south", { type: "pass" }).error).toBeUndefined();
    expect(setPaused(resumed, false)).toBe(resumed);
  });

  it("rotates the dealer and carries the score into the next hand", () => {
    const first = playFourHumans("rotate", (actions) => actions[0]);
    const next = applySeatAction(first, "north", { type: "next-hand" });
    expect(next.error).toBeUndefined();
    expect(next.state.handNumber).toBe(2);
    expect(next.state.dealer).toBe(nextSeat(first.dealer));
    expect(next.state.scores).toEqual(first.scores);
    expect(next.state.phase).toBe("auction");
    expect(cardsInPlay(next.state)).toBe(54);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
