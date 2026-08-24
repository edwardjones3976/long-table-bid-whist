import { describe, expect, it } from "vitest";
import {
  autoplayHand,
  bidWhistReducer,
  cardsInAuthority,
  createDeck,
  createHand,
  projectForSeat,
  replayHand,
  type Card,
  type GameAction,
  type HandState,
  type Hands,
} from "../../src/game";

const deck = createDeck();
function card(id: string): Card {
  const found = deck.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing test card ${id}`);
  return found;
}

describe("auction, kitty, and reducer invariants", () => {
  it("runs one bidding round and forces the dealer to take a minimum bid", () => {
    let state = createHand({ seed: "forced-dealer", dealer: 0 });
    const actions: GameAction[] = [
      { type: "BID", seat: 1, bid: { kind: "pass" } },
      { type: "BID", seat: 2, bid: { kind: "pass" } },
      { type: "BID", seat: 3, bid: { kind: "pass" } },
      { type: "BID", seat: 0, bid: { kind: "pass" } },
    ];
    state = actions.reduce(bidWhistReducer, state);
    expect(state.phase).toBe("declaring");
    expect(state.bidder).toBe(0);
    expect(state.highBid).toEqual({ kind: "contract", level: 3, mode: "high" });
    expect(state.bids).toHaveLength(4);
    expect(state.bids[3]).toEqual({
      seat: 0,
      bid: { kind: "contract", level: 3, mode: "high" },
      forced: true,
    });
  });

  it("rejects a non-outranking bid without advancing turn", () => {
    let state = createHand({ seed: "bid-rank", dealer: 0 });
    state = bidWhistReducer(state, {
      type: "BID",
      seat: 1,
      bid: { kind: "contract", level: 4, mode: "high" },
    });
    const rejected = bidWhistReducer(state, {
      type: "BID",
      seat: 2,
      bid: { kind: "contract", level: 4, mode: "low" },
    });
    expect(rejected.turn).toBe(2);
    expect(rejected.bids).toHaveLength(1);
    expect(rejected.lastError).toMatch(/outrank/i);
  });

  it("does not mutate the prior state while reducing an action", () => {
    const before = createHand({ seed: "immutable", dealer: 0 });
    const snapshot = structuredClone(before);
    const after = bidWhistReducer(before, {
      type: "BID",
      seat: 1,
      bid: { kind: "contract", level: 3, mode: "high" },
    });
    expect(before).toEqual(snapshot);
    expect(after).not.toBe(before);
    expect(after.bids).toHaveLength(1);
  });

  it("validates declaration, takes the kitty, and requires six unique owned discards", () => {
    let state = createHand({ seed: "kitty-flow", dealer: 0 });
    const auction: GameAction[] = [
      { type: "BID", seat: 1, bid: { kind: "contract", level: 3, mode: "no-trump" } },
      { type: "BID", seat: 2, bid: { kind: "pass" } },
      { type: "BID", seat: 3, bid: { kind: "pass" } },
      { type: "BID", seat: 0, bid: { kind: "pass" } },
    ];
    state = auction.reduce(bidWhistReducer, state);
    const badDeclaration = bidWhistReducer(state, {
      type: "DECLARE",
      seat: 1,
      declaration: { direction: "high", trump: "spades" },
    });
    expect(badDeclaration.phase).toBe("declaring");
    expect(badDeclaration.lastError).toMatch(/declaration/i);

    state = bidWhistReducer(state, {
      type: "DECLARE",
      seat: 1,
      declaration: { direction: "low", trump: null },
    });
    expect(state.phase).toBe("discarding");
    expect(state.hands[1]).toHaveLength(18);
    expect(state.kitty).toHaveLength(0);
    const discards = state.hands[1].slice(0, 6).map((candidate) => candidate.id);
    state = bidWhistReducer(state, { type: "DISCARD", seat: 1, cardIds: discards });
    expect(state.phase).toBe("playing");
    expect(state.hands[1]).toHaveLength(12);
    expect(state.buried.map((candidate) => candidate.id)).toEqual(discards);
  });

  it("rejects a renege and accepts the matching suit", () => {
    const base = createHand({ seed: "follow-suit" });
    const hands: Hands = [
      [card("C-2")],
      [card("H-3"), card("C-A")],
      [card("D-4")],
      [card("S-5")],
    ];
    const playing: HandState = {
      ...base,
      phase: "playing",
      turn: 1,
      hands,
      kitty: [],
      highBid: { kind: "contract", level: 3, mode: "high" },
      bidder: 0,
      declaration: { direction: "high", trump: "spades" },
      currentTrick: [{ seat: 0, card: card("H-K") }],
    };
    const rejected = bidWhistReducer(playing, { type: "PLAY", seat: 1, cardId: "C-A" });
    expect(rejected.currentTrick).toHaveLength(1);
    expect(rejected.lastError).toMatch(/follow/i);
    const accepted = bidWhistReducer(playing, { type: "PLAY", seat: 1, cardId: "H-3" });
    expect(accepted.currentTrick).toHaveLength(2);
    expect(accepted.hands[1].map((candidate) => candidate.id)).toEqual(["C-A"]);
  });
});

describe("complete deterministic AI hand", () => {
  it("autoplays 12 tricks plus the kitty book with all 54 cards accounted for", () => {
    const { state, actions } = autoplayHand(createHand({ seed: "showtime", dealer: 3 }));
    expect(state.phase).toBe("complete");
    expect(state.completedTricks).toHaveLength(12);
    expect(state.summary).not.toBeNull();
    expect((state.summary?.books[0] ?? 0) + (state.summary?.books[1] ?? 0)).toBe(13);
    expect(state.hands.map((hand) => hand.length)).toEqual([0, 0, 0, 0]);
    expect(state.buried).toHaveLength(6);
    const authority = cardsInAuthority(state);
    expect(authority).toHaveLength(54);
    expect(new Set(authority.map((candidate) => candidate.id)).size).toBe(54);
    expect(actions.length).toBe(54);
  });

  it("produces identical states/actions and an exact reducer replay for a seed", () => {
    const options = { seed: "replay-proof", dealer: 2 as const, scores: [1, -1] as const };
    const first = autoplayHand(createHand(options));
    const second = autoplayHand(createHand(options));
    expect(second).toEqual(first);
    expect(replayHand(options, first.actions)).toEqual(first.state);
  });

  it("projects only the acting seat's hand and public information", () => {
    const state = createHand({ seed: "hidden-info" });
    const view = projectForSeat(state, state.turn);
    expect(Object.keys(view).sort()).toEqual(["hand", "publicState", "seat"]);
    expect(view.hand).toEqual(state.hands[state.turn]);
    expect(view.hand).not.toBe(state.hands[state.turn]);
    expect(view.publicState).not.toHaveProperty("hands");
    expect(view.publicState).not.toHaveProperty("kitty");
    expect(view.publicState).not.toHaveProperty("buried");
    expect(view.publicState).not.toHaveProperty("seed");
  });

  it("maintains card and book invariants across 64 seeded AI hands", () => {
    for (let seed = 0; seed < 64; seed += 1) {
      const result = autoplayHand(
        createHand({ seed: `invariant-${seed}`, dealer: (seed % 4) as 0 | 1 | 2 | 3 }),
      );
      const { state } = result;
      expect(state.phase, `seed ${seed}`).toBe("complete");
      expect(state.completedTricks, `seed ${seed}`).toHaveLength(12);
      if (state.summary === null) throw new Error(`seed ${seed} has no hand summary`);
      expect(state.summary.books[0] + state.summary.books[1], `seed ${seed}`).toBe(13);
      expect(result.actions, `seed ${seed}`).toHaveLength(54);
      const authority = cardsInAuthority(state);
      expect(authority, `seed ${seed}`).toHaveLength(54);
      expect(new Set(authority.map((candidate) => candidate.id)).size, `seed ${seed}`).toBe(54);
    }
  });
});
