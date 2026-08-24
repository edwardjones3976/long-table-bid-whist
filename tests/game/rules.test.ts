import { describe, expect, it } from "vitest";
import {
  STRICT_TABLE_RULES,
  createDeck,
  effectiveSuit,
  isHigherBid,
  legalCardIds,
  scoreCompletedHand,
  trickWinner,
  type Card,
  type ContractBid,
  type ContractDeclaration,
  type PlayedCard,
  type Seat,
} from "../../src/game";

const deck = createDeck();
function card(id: string): Card {
  const found = deck.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing test card ${id}`);
  return found;
}

function play(seat: Seat, id: string): PlayedCard {
  return { seat, card: card(id) };
}

const highSpades: ContractDeclaration = { direction: "high", trump: "spades" };
const lowHearts: ContractDeclaration = { direction: "low", trump: "hearts" };
const noHigh: ContractDeclaration = { direction: "high", trump: null };
const noLow: ContractDeclaration = { direction: "low", trump: null };

describe("Strict Table bid ordering", () => {
  const bid = (level: 3 | 4 | 5 | 6 | 7, mode: ContractBid["mode"]): ContractBid => ({
    kind: "contract",
    level,
    mode,
  });

  it("treats same-level high and low as equal and no-trump as the overcall", () => {
    expect(isHigherBid(bid(3, "low"), bid(3, "high"))).toBe(false);
    expect(isHigherBid(bid(3, "high"), bid(3, "low"))).toBe(false);
    expect(isHigherBid(bid(3, "no-trump"), bid(3, "high"))).toBe(true);
    expect(isHigherBid(bid(3, "high"), bid(3, "no-trump"))).toBe(false);
    expect(isHigherBid(bid(4, "high"), bid(3, "no-trump"))).toBe(true);
  });
});

describe("follow-suit and trick resolution", () => {
  it("requires the led natural suit when a player holds it", () => {
    const hand = [card("H-2"), card("C-A"), card("D-5")];
    const trick = [play(0, "H-K")];
    expect(legalCardIds(hand, trick, highSpades)).toEqual(["H-2"]);
  });

  it("treats both jokers as trump for following suit in a trump contract", () => {
    const hand = [card("J-BIG"), card("C-A")];
    const trick = [play(0, "S-3")];
    expect(effectiveSuit(card("J-BIG"), highSpades)).toBe("spades");
    expect(legalCardIds(hand, trick, highSpades)).toEqual(["J-BIG"]);
  });

  it("lets the first suited card after a no-trump joker establish the led suit", () => {
    const jokerLead = [play(0, "J-BIG")];
    expect(legalCardIds([card("H-4"), card("C-K")], jokerLead, noHigh)).toEqual([
      "H-4",
      "C-K",
    ]);
    const established = [...jokerLead, play(1, "C-2")];
    expect(legalCardIds([card("C-7"), card("H-A")], established, noHigh)).toEqual([
      "C-7",
    ]);
    expect(legalCardIds([card("C-7"), card("J-LITTLE")], established, noHigh)).toEqual([
      "C-7",
    ]);
  });

  it("awards high trump tricks correctly with big and little jokers on top", () => {
    expect(
      trickWinner(
        [play(0, "H-A"), play(1, "S-2"), play(2, "J-LITTLE"), play(3, "S-A")],
        highSpades,
      ),
    ).toBe(2);
    expect(
      trickWinner(
        [play(0, "J-LITTLE"), play(1, "S-A"), play(2, "J-BIG"), play(3, "S-K")],
        highSpades,
      ),
    ).toBe(2);
  });

  it("uses Pagat downtown order A, 2, 3 ... Q, K", () => {
    expect(
      trickWinner(
        [play(0, "C-K"), play(1, "C-2"), play(2, "C-A"), play(3, "C-3")],
        lowHearts,
      ),
    ).toBe(2);
    expect(
      trickWinner(
        [play(0, "C-K"), play(1, "C-2"), play(2, "C-Q"), play(3, "C-3")],
        lowHearts,
      ),
    ).toBe(1);
  });

  it("keeps big joker, little joker, and ace atop downtown trumps", () => {
    expect(
      trickWinner(
        [play(0, "H-2"), play(1, "H-A"), play(2, "J-LITTLE"), play(3, "H-3")],
        lowHearts,
      ),
    ).toBe(2);
    expect(
      trickWinner(
        [play(0, "H-2"), play(1, "H-A"), play(2, "H-K"), play(3, "H-3")],
        lowHearts,
      ),
    ).toBe(1);
  });

  it("makes jokers worthless in no-trump, including after a joker lead", () => {
    expect(
      trickWinner(
        [play(0, "J-BIG"), play(1, "D-3"), play(2, "D-A"), play(3, "J-LITTLE")],
        noHigh,
      ),
    ).toBe(2);
    expect(
      trickWinner(
        [play(0, "J-BIG"), play(1, "D-K"), play(2, "D-2"), play(3, "C-A")],
        noLow,
      ),
    ).toBe(2);
  });
});

describe("Strict Table scoring", () => {
  const highBid: ContractBid = { kind: "contract", level: 3, mode: "high" };
  const noBid: ContractBid = { kind: "contract", level: 4, mode: "no-trump" };

  it("counts the kitty as the bidder's thirteenth book and scores every book over six", () => {
    const summary = scoreCompletedHand({
      rules: STRICT_TABLE_RULES,
      bidder: 0,
      bid: highBid,
      declaration: highSpades,
      trickBooks: [9, 3],
      scoresBefore: [0, 0],
    });
    expect(summary.books).toEqual([10, 3]);
    expect(summary.targetBooks).toBe(9);
    expect(summary.made).toBe(true);
    expect(summary.scoreDelta).toEqual([4, 0]);
  });

  it("subtracts the contract when the bidder is set", () => {
    const summary = scoreCompletedHand({
      rules: STRICT_TABLE_RULES,
      bidder: 1,
      bid: highBid,
      declaration: highSpades,
      trickBooks: [5, 7],
      scoresBefore: [2, 1],
    });
    expect(summary.books).toEqual([5, 8]);
    expect(summary.made).toBe(false);
    expect(summary.scoreDelta).toEqual([0, -3]);
    expect(summary.scoreAfter).toEqual([2, -2]);
  });

  it("doubles both successful and set no-trump results", () => {
    const made = scoreCompletedHand({
      rules: STRICT_TABLE_RULES,
      bidder: 1,
      bid: noBid,
      declaration: noHigh,
      trickBooks: [2, 10],
      scoresBefore: [0, 0],
    });
    expect(made.books).toEqual([2, 11]);
    expect(made.scoreDelta).toEqual([0, 10]);
    expect(made.gameWinner).toBe(1);

    const set = scoreCompletedHand({
      rules: STRICT_TABLE_RULES,
      bidder: 0,
      bid: noBid,
      declaration: noLow,
      trickBooks: [8, 4],
      scoresBefore: [0, 0],
    });
    expect(set.books).toEqual([9, 4]);
    expect(set.scoreDelta).toEqual([-8, 0]);
    expect(set.gameWinner).toBe(1);
  });
});
