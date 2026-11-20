// @vitest-environment node
import { describe, expect, it } from "vitest";
import { standardDeck, type Card } from "../../shared/cards";
import { shuffled } from "../../server/shuffle";
import {
  DEFAULT_OPTIONS,
  RuleError,
  apply,
  legalBids,
  legalCards,
  newMatch,
  nextHand,
  trickWinner,
  viewFor,
  type Action,
  type BidKind,
  type Contract,
  type Options,
  type Seat,
  type State,
} from "../../server/games/bidwhist";

const deck = () => standardDeck(true);
const card = (id: string): Card => deck().find((c) => c.id === id)!;
const bid = (level: number, kind: BidKind): Action => ({ type: "bid", bid: { level, kind } });
const pass: Action = { type: "bid", bid: null };
const plays = (...ids: string[]) => ids.map((id, i) => ({ seat: i as Seat, card: card(id) }));
const contract = (over: Partial<Contract>): Contract => ({
  seat: 0,
  level: 4,
  noTrump: false,
  direction: "high",
  trump: "spades",
  ...over,
});

/** Runs actions for whoever's turn it is. */
function run(state: State, ...actions: Action[]): State {
  return actions.reduce((s, action) => apply(s, s.turn, action), state);
}

function rejects(state: State, seat: Seat, action: unknown): void {
  const before = structuredClone(state);
  expect(() => apply(state, seat, action as Action)).toThrow(RuleError);
  expect(state).toEqual(before);
}

/** One trick from the end: seat 0 leads clubs and `aceHolder` wins it. */
function lastTrick(over: Partial<State>, c: Partial<Contract>, aceHolder: Seat): State {
  const state = newMatch(deck());
  const low = ["clubs-2", "clubs-3", "clubs-4", "clubs-5"];
  const final: State = {
    ...state,
    phase: "play",
    turn: 0,
    kitty: [],
    contract: contract({ trump: "clubs", ...c }),
    hands: low.map((id, seat) => [card(seat === aceHolder ? "clubs-14" : id)]),
    tricksPlayed: 11,
    ...over,
  };
  const play = (s: State): State => apply(s, s.turn, { type: "play", cardId: s.hands[s.turn][0].id });
  return play(play(play(play(final))));
}

describe("deal", () => {
  it("deals 12 to each seat and a six-card kitty from all 54 cards", () => {
    const state = newMatch(deck());
    expect(state.hands.map((hand) => hand.length)).toEqual([12, 12, 12, 12]);
    expect(state.kitty).toHaveLength(6);
    expect(new Set([...state.hands.flat(), ...state.kitty].map((c) => c.id)).size).toBe(54);
    expect(state.turn).toBe(1);
  });

  it("refuses a short or duplicated deck and invalid house rules", () => {
    expect(() => newMatch(deck().slice(1))).toThrow();
    expect(() => newMatch([...deck().slice(1), card("clubs-3")])).toThrow();
    expect(() => newMatch(deck().map((c) => (c.id === "clubs-3" ? { ...c, suit: "spades" as const, rank: 14 } : c)))).toThrow();
    expect(() => newMatch(deck(), { ...DEFAULT_OPTIONS, minBid: 5 as 3 })).toThrow(RuleError);
  });

  it("shuffles to a permutation of the same cards", () => {
    const out = shuffled(deck());
    expect(out.map((c) => c.id).sort()).toEqual(deck().map((c) => c.id).sort());
  });
});

describe("auction", () => {
  it("goes once clockwise and needs a strictly higher bid; no-trump outranks a suit bid", () => {
    let state = run(newMatch(deck()), bid(4, "high"));
    expect(state.turn).toBe(2);
    rejects(state, 2, bid(4, "low"));
    rejects(state, 2, bid(3, "no-trump"));
    rejects(state, 3, bid(5, "high"));
    state = run(state, bid(4, "no-trump"), pass, bid(7, "low"));
    expect(state.phase).toBe("declare");
    expect(state.contract).toMatchObject({ seat: 0, level: 7, noTrump: false, direction: "low" });
    expect(state.turn).toBe(0);
  });

  it("lets low overcall high at the same level only under that house rule", () => {
    const state = run(newMatch(deck(), { ...DEFAULT_OPTIONS, lowOverHigh: true }), bid(4, "low"));
    rejects(state, 2, bid(4, "high"));
    expect(run(newMatch(deck(), { ...DEFAULT_OPTIONS, lowOverHigh: true }), bid(4, "high"), bid(4, "low")).turn).toBe(3);
  });

  it("applies the minimum bid and the 3-7 range, and rejects malformed bids", () => {
    rejects(newMatch(deck(), { ...DEFAULT_OPTIONS, minBid: 4 }), 1, bid(3, "high"));
    const state = newMatch(deck());
    rejects(state, 1, bid(8, "high"));
    rejects(state, 1, bid(2, "high"));
    rejects(state, 1, { type: "bid", bid: { level: "4", kind: "high" } });
    rejects(state, 1, { type: "bid" });
    rejects(state, 1, { type: "nope" });
    rejects(state, 1, { type: ["bid"], bid: null });
    rejects(state, 1, { type: "toString" });
    rejects(state, 1, null);
    rejects(state, 1, { type: "play", cardId: state.hands[1][0].id });
    expect(legalBids(state)).toHaveLength(15);
  });

  it("forces the dealer to bid after three passes", () => {
    const state = run(newMatch(deck()), pass, pass, pass);
    rejects(state, 0, pass);
    expect(run(state, bid(3, "high")).contract).toMatchObject({ seat: 0, level: 3 });
  });
});

describe("declaration and kitty", () => {
  const won = (kind: BidKind) => run(newMatch(deck()), bid(4, kind), pass, pass, pass);

  it("needs a trump suit for a suit bid and high or low for no-trump", () => {
    rejects(won("high"), 1, { type: "declare" });
    rejects(won("high"), 1, { type: "declare", trump: "joker" });
    rejects(won("no-trump"), 1, { type: "declare", trump: "spades" });
    expect(run(won("no-trump"), { type: "declare", direction: "low" }).contract).toMatchObject({
      noTrump: true,
      direction: "low",
      trump: null,
    });
  });

  it("gives the kitty to the declarer privately, then takes six discards and the lead", () => {
    const before = won("high");
    const kittyIds = before.kitty.map((c) => c.id);
    let state = run(before, { type: "declare", trump: "hearts" });
    expect(state.hands[1]).toHaveLength(18);
    for (const seat of [0, 2, 3, null] as const) {
      const seen = JSON.stringify(viewFor(state, seat));
      expect(kittyIds.filter((id) => seen.includes(`"${id}"`))).toEqual([]);
    }
    const ids = state.hands[1].map((c) => c.id);
    rejects(state, 1, { type: "discard", cardIds: ids.slice(0, 5) });
    rejects(state, 1, { type: "discard", cardIds: [...ids.slice(0, 5), ids[0]] });
    rejects(state, 1, { type: "discard", cardIds: [...ids.slice(0, 5), state.hands[2][0].id] });
    rejects(state, 1, { type: "discard", cardIds: "abcdef" });
    state = run(state, { type: "discard", cardIds: ids.slice(0, 6) });
    expect(state.hands[1]).toHaveLength(12);
    expect(state.discards).toHaveLength(6);
    expect([state.phase, state.turn]).toEqual(["play", 1]);
  });
});

describe("tricks", () => {
  it("ranks jokers above every trump and trump above the led suit", () => {
    const c = contract({});
    expect(trickWinner(plays("hearts-14", "spades-2", "hearts-13", "hearts-12"), c)).toBe(1);
    expect(trickWinner(plays("spades-14", "joker-little", "spades-13", "spades-12"), c)).toBe(1);
    expect(trickWinner(plays("spades-14", "joker-little", "joker-big", "spades-12"), c)).toBe(2);
    expect(trickWinner(plays("hearts-3", "clubs-14", "diamonds-14", "hearts-2"), c)).toBe(0);
  });

  it("plays low with the ace best, then 2 up to the king", () => {
    const c = contract({ direction: "low" });
    expect(trickWinner(plays("hearts-13", "hearts-2", "hearts-3", "hearts-12"), c)).toBe(1);
    expect(trickWinner(plays("hearts-13", "hearts-2", "hearts-14", "hearts-12"), c)).toBe(2);
    expect(trickWinner(plays("spades-2", "joker-little", "spades-14", "joker-big"), c)).toBe(3);
  });

  it("never lets a joker win in no-trump; the first non-joker sets the suit", () => {
    const c = contract({ noTrump: true, trump: null });
    expect(trickWinner(plays("joker-big", "hearts-5", "hearts-9", "joker-little"), c)).toBe(2);
    expect(trickWinner(plays("joker-big", "hearts-5", "spades-14", "hearts-4"), c)).toBe(1);
  });

  it("makes a joker follow trump in a suit contract", () => {
    const state: State = {
      ...newMatch(deck()),
      phase: "play",
      turn: 1,
      contract: contract({}),
      trick: plays("spades-3"),
      hands: [[], [card("joker-big"), card("hearts-14")], [card("hearts-2")], []],
    };
    expect(legalCards(state, 1).map((c) => c.id)).toEqual(["joker-big"]);
    rejects(state, 1, { type: ["play"], cardId: "joker-big" });
    rejects(state, 1, { type: "play", cardId: "hearts-14" });
    rejects(state, 1, { type: "play", cardId: "hearts-2" });
    expect(legalCards(state, 2).map((c) => c.id)).toEqual(["hearts-2"]);
  });

  it("handles a joker lead and joker discards in no-trump", () => {
    const base: State = {
      ...newMatch(deck()),
      phase: "play",
      turn: 1,
      contract: contract({ noTrump: true, trump: null }),
      hands: [[], [card("hearts-5"), card("clubs-2")], [card("hearts-9"), card("clubs-3")], [card("joker-little"), card("clubs-4")]],
    };
    const jokerLed = { ...base, trick: plays("joker-big") };
    expect(legalCards(jokerLed, 1)).toHaveLength(2);
    const suitSet = run(jokerLed, { type: "play", cardId: "hearts-5" });
    expect(legalCards(suitSet, 2).map((c) => c.id)).toEqual(["hearts-9"]);
    expect(legalCards(run(suitSet, { type: "play", cardId: "hearts-9" }), 3)).toHaveLength(2);
  });
});

describe("scoring", () => {
  const result = (over: Partial<State>, c: Partial<Contract>, aceHolder: Seat, options: Partial<Options> = {}) =>
    lastTrick({ ...over, options: { ...DEFAULT_OPTIONS, ...options } }, c, aceHolder);

  it("counts the kitty as a book for the declaring team", () => {
    expect(result({ tricksWon: [9, 2] }, {}, 1).result).toEqual({ team: 0, level: 4, books: 10, made: true, delta: 4 });
    expect(result({ tricksWon: [8, 3] }, {}, 1).result).toMatchObject({ books: 9, made: false, delta: -4 });
  });

  it("credits overtricks unless the house rule is off", () => {
    expect(result({ tricksWon: [10, 1] }, {}, 0).result).toMatchObject({ books: 12, delta: 6 });
    expect(result({ tricksWon: [10, 1] }, {}, 0, { overtricks: false }).result).toMatchObject({ delta: 4 });
  });

  it("doubles no-trump both ways unless the house rule is off", () => {
    const nt = { noTrump: true, trump: null };
    expect(result({ tricksWon: [9, 2] }, nt, 1).result).toMatchObject({ made: true, delta: 8 });
    expect(result({ tricksWon: [8, 3] }, nt, 1).result).toMatchObject({ made: false, delta: -8 });
    expect(result({ tricksWon: [9, 2] }, nt, 1, { noTrumpDouble: false }).result).toMatchObject({ delta: 4 });
  });

  it("ends the game at +7 or when the declarers fall to -7", () => {
    expect(result({ tricksWon: [9, 2], scores: [3, 0] }, {}, 1)).toMatchObject({ phase: "game-over", winner: 0 });
    expect(result({ tricksWon: [8, 3], scores: [-3, 0] }, {}, 1)).toMatchObject({ phase: "game-over", winner: 1 });
    const over = result({ tricksWon: [8, 3], scores: [-3, 0] }, {}, 1);
    expect(() => nextHand(over, deck())).toThrow(RuleError);
    rejects(over, over.turn, pass);
  });

  it("rotates the dealer clockwise for the next hand", () => {
    const done = result({ tricksWon: [9, 2] }, {}, 1);
    expect(done).toMatchObject({ phase: "hand-over", winner: null, scores: [4, 0] });
    const again = nextHand(done, deck());
    expect(again).toMatchObject({ dealer: 1, turn: 2, handNumber: 2, phase: "auction", scores: [4, 0] });
    expect(() => nextHand(again, deck())).toThrow(RuleError);
  });
});

describe("views", () => {
  it("shows a player only their own cards and the host none", () => {
    const state = newMatch(deck());
    const hidden = [...state.hands[0], ...state.hands[1], ...state.hands[3], ...state.kitty].map((c) => c.id);
    const seen = JSON.stringify(viewFor(state, 2));
    expect(hidden.filter((id) => seen.includes(`"${id}"`))).toEqual([]);
    expect(viewFor(state, 2).hand).toEqual(state.hands[2]);
    expect(JSON.stringify(viewFor(state, null))).not.toMatch(/"(clubs|diamonds|hearts|spades|joker)-/);
    expect(viewFor(state, null)).toMatchObject({ handCounts: [12, 12, 12, 12], kittyCount: 6 });
  });
});

describe("full match", () => {
  it("plays to a winner with every card accounted for at each step", () => {
    let seed = 7;
    const testDeck = () => {
      const out = deck();
      for (let i = out.length - 1; i > 0; i -= 1) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        const j = seed % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    const kinds = new Set<string>();
    // Three matches, each opening with a different bid kind, so all kinds get played.
    for (let match = 0; match < 3; match += 1) {
    let state = newMatch(testDeck());
    for (let step = 0; state.phase !== "game-over"; step += 1) {
      expect(step).toBeLessThan(20000);
      if (state.phase === "hand-over") state = nextHand(state, testDeck());
      const seat = state.turn;
      const view = viewFor(state, seat);
      let action: Action;
      if (view.phase === "auction") {
        const options = legalBids(state);
        // First seat opens; the kind rotates by hand so no-trump and low get played.
        action = view.auction.length === 0 ? { type: "bid", bid: options[(view.handNumber + match) % 3] } : pass;
      } else if (view.phase === "declare") {
        kinds.add(`${view.contract!.noTrump}:${view.contract!.direction}`);
        action = view.contract!.noTrump ? { type: "declare", direction: "low" } : { type: "declare", trump: "spades" };
      } else if (view.phase === "kitty") {
        action = { type: "discard", cardIds: view.hand!.slice(0, 6).map((c) => c.id) };
      } else {
        action = { type: "play", cardId: legalCards(state, seat)[0].id };
      }
      state = apply(state, seat, action);
      const live = [...state.hands.flat(), ...state.kitty, ...state.discards, ...state.trick.map((p) => p.card)];
      expect(new Set(live.map((c) => c.id)).size).toBe(live.length);
      expect(live.length + state.tricksPlayed * 4).toBe(54);
    }
    expect(state.winner).not.toBeNull();
    expect(Math.max(...state.scores.map(Math.abs))).toBeGreaterThanOrEqual(7);
    }
    expect(kinds.size).toBe(3);
  });
});
