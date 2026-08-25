// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | BEGIN]]
import { describe, expect, it } from "vitest";
import {
  applyHumanAction,
  applyHumanDiscard,
  createDeck,
  legalCards,
  legalHumanActions,
  makePlayerView,
  newTable,
  publicDigest,
  type GameState,
  type HumanAction,
} from "../../src/game";

function driveHand(seed: string): GameState {
  let state = newTable(seed);
  let guard = 0;
  while (state.phase !== "summary") {
    if (state.phase === "kitty" && state.turn === "south") {
      state = applyHumanDiscard(state, state.hands.south.slice(0, 6).map((card) => card.id)).state;
    } else {
      const actions = legalHumanActions(state);
      const preferred = actions.find((action) => action.type !== "pass") ?? actions[0];
      expect(preferred).toBeTruthy();
      state = applyHumanAction(state, preferred as HumanAction).state;
    }
    guard += 1;
    if (guard > 80) throw new Error("hand did not complete");
  }
  return state;
}

describe("fresh Strict Table engine", () => {
  it("creates exactly 54 unique cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(54);
    expect(new Set(deck.map((card) => card.id)).size).toBe(54);
  });

  it("deals deterministically with 12 cards per seat and six in the kitty", () => {
    const first = newTable("same-seed");
    const second = newTable("same-seed");
    expect(first.hands.south.map((card) => card.id)).toEqual(second.hands.south.map((card) => card.id));
    expect(Object.values(first.hands).map((hand) => hand.length)).toEqual([12, 12, 12, 12]);
    expect(first.kitty).toHaveLength(6);
  });

  it("gives AI only its hand and public state", () => {
    const state = newTable("boundary-seed");
    const view = makePlayerView(state, "west") as unknown as Record<string, unknown>;
    expect(view.hand).toEqual(state.hands.west);
    expect(view).not.toHaveProperty("hands");
    expect(view).not.toHaveProperty("kitty");
    expect(view).not.toHaveProperty("seed");
    expect(JSON.stringify(view)).not.toContain(state.seed);
    expect(JSON.stringify(view)).not.toContain(state.hands.north[0].id);
  });

  it("fails closed on level 7 and unresolved No-Trump bids", () => {
    const state = newTable("provisional-contract-surface");
    const bidActions = legalHumanActions(state).filter(
      (action): action is Extract<HumanAction, { type: "bid" }> => action.type === "bid",
    );
    expect(bidActions.length).toBeGreaterThan(0);
    expect(bidActions.every((action) => action.bid.level >= 3 && action.bid.level <= 6)).toBe(true);
    expect(bidActions.every((action) => action.bid.mode === "low" || action.bid.mode === "high")).toBe(true);

    const before = structuredClone(state);
    const levelSeven = applyHumanAction(state, { type: "bid", bid: { level: 7, mode: "high" } });
    expect(levelSeven.error).toBe("That action is not legal now");
    expect(levelSeven.state).toEqual(before);

    const noTrump = applyHumanAction(state, {
      type: "bid",
      bid: { level: 3, mode: "no-trump-high" },
    });
    expect(noTrump.error).toBe("That action is not legal now");
    expect(noTrump.state).toEqual(before);
  });

  it("keeps the internal seed out of the public digest input", () => {
    const first = newTable("digest-seed-a");
    const second = structuredClone(first);
    second.seed = "digest-seed-b";
    expect(publicDigest(first)).toBe(publicDigest(second));
  });

  it("enforces follow suit", () => {
    const state = newTable("follow-suit");
    state.phase = "play";
    state.contract = { bidder: "south", level: 3, mode: "high", trump: "spades" };
    state.turn = "south";
    state.currentTrick = [{ seat: "east", card: { id: "lead", suit: "hearts", rank: 10, label: "10♥", glyph: "♥" } }];
    state.hands.south = [
      { id: "heart", suit: "hearts", rank: 2, label: "2♥", glyph: "♥" },
      { id: "club", suit: "clubs", rank: 14, label: "A♣", glyph: "♣" },
    ];
    expect(legalCards(state, "south").map((card) => card.id)).toEqual(["heart"]);
    const illegal = applyHumanAction(state, { type: "play", cardId: "club" });
    expect(illegal.error).toBe("Follow suit");
    expect(illegal.state.hands.south).toHaveLength(2);
  });

  it("completes a full hand without deadlock and exposes next hand", () => {
    const state = driveHand("complete-seed");
    expect(state.completedTricks).toHaveLength(12);
    expect(Object.values(state.hands).flat()).toHaveLength(0);
    expect(state.summary).toMatch(/Score/);
    expect(legalHumanActions(state)).toEqual([{ type: "next-hand" }]);
  });

  it("replays the same public result for the same seed and action policy", () => {
    const first = driveHand("replay-seed");
    const second = driveHand("replay-seed");
    expect(publicDigest(first)).toBe(publicDigest(second));
    expect(first.summary).toBe(second.summary);
  });
});
// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | END]]
