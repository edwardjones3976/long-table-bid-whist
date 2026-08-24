import { describe, expect, it } from "vitest";
import {
  cardsInAuthority,
  createDeck,
  createHand,
  hashSeed,
  shuffleDeck,
} from "../../src/game";

describe("54-card deck and deterministic deal", () => {
  it("contains all 52 suited cards and two distinct jokers exactly once", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(54);
    expect(new Set(deck.map((card) => card.id)).size).toBe(54);
    expect(deck.filter((card) => card.kind === "suited")).toHaveLength(52);
    expect(deck.filter((card) => card.kind === "joker").map((card) => card.id)).toEqual([
      "J-BIG",
      "J-LITTLE",
    ]);
  });

  it("repeats the exact shuffle for a seed and changes it for another seed", () => {
    const first = shuffleDeck("long-table-001").map((card) => card.id);
    const replay = shuffleDeck("long-table-001").map((card) => card.id);
    const other = shuffleDeck("long-table-002").map((card) => card.id);
    expect(replay).toEqual(first);
    expect(other).not.toEqual(first);
    expect(hashSeed("long-table-001")).toBe(hashSeed("long-table-001"));
  });

  it("deals twelve cards per seat and a six-card kitty without loss", () => {
    const state = createHand({ seed: 3976, dealer: 2 });
    expect(state.hands.map((hand) => hand.length)).toEqual([12, 12, 12, 12]);
    expect(state.kitty).toHaveLength(6);
    const cards = cardsInAuthority(state);
    expect(cards).toHaveLength(54);
    expect(new Set(cards.map((card) => card.id)).size).toBe(54);
    expect(state.turn).toBe(3);
  });
});
