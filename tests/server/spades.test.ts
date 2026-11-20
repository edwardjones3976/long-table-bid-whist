// @vitest-environment node
import { describe, expect, it } from "vitest";
import { standardDeck, type Card } from "../../shared/cards";
import {
  DEFAULT_OPTIONS,
  RuleError,
  apply,
  deck,
  legalBids,
  legalCards,
  newMatch,
  nextHand,
  trickWinner,
  viewFor,
  type Action,
  type Options,
  type Seat,
  type State,
} from "../../server/games/spades";
import { chooseAction, spades } from "../../server/games/spades-bot";

const JOKERS: Options = { ...DEFAULT_OPTIONS, preset: "jokers" };
const card = (id: string): Card => standardDeck(true).find((c) => c.id === id)!;
const cards = (...ids: string[]) => ids.map(card);
const bid = (tricks: number): Action => ({ type: "bid", tricks });
const playCard = (cardId: string): Action => ({ type: "play", cardId });
const plays = (...ids: string[]) => ids.map((id, i) => ({ seat: i as Seat, card: card(id) }));
const ids = (list: Card[]) => list.map((c) => c.id);

/** Runs actions for whoever's turn it is. */
function run(state: State, ...actions: Action[]): State {
  return actions.reduce((s, action) => apply(s, s.turn, action), state);
}

function rejects(state: State, seat: Seat, action: unknown): void {
  const before = structuredClone(state);
  expect(() => apply(state, seat, action as Action)).toThrow(RuleError);
  expect(state).toEqual(before);
}

/** Mid-play with seat 0 on turn; `over` sets the hands and anything else. */
function table(over: Partial<State>, options: Partial<Options> = {}): State {
  return {
    ...newMatch(deck(DEFAULT_OPTIONS)),
    options: { ...DEFAULT_OPTIONS, ...options },
    phase: "play",
    turn: 0,
    bids: [3, 3, 3, 3],
    ...over,
  };
}

/** Plays the thirteenth trick so the hand ends with these bids and these tricks per seat. */
function end(bids: number[], tricks: number[], over: Partial<State> = {}, options: Partial<Options> = {}): State {
  const winner = tricks.findIndex((n) => n > 0);
  const state = table(
    {
      bids,
      tricks: tricks.map((n, seat) => n - (seat === winner ? 1 : 0)),
      tricksPlayed: 12,
      hands: [3, 4, 5, 6].map((rank, seat) => [card(seat === winner ? "clubs-14" : `clubs-${rank}`)]),
      ...over,
    },
    options,
  );
  const last = (s: State): State => apply(s, s.turn, playCard(s.hands[s.turn][0].id));
  return last(last(last(last(state))));
}

describe("deal", () => {
  it("deals 13 to each seat from all 52 cards, left of the dealer first", () => {
    const pack = deck(DEFAULT_OPTIONS);
    const state = newMatch(pack);
    expect(state.hands.map((hand) => hand.length)).toEqual([13, 13, 13, 13]);
    expect(new Set(ids(state.hands.flat())).size).toBe(52);
    expect(state.hands[1][0]).toEqual(pack[0]);
    expect(state.hands[0][0]).toEqual(pack[3]);
    expect(state).toMatchObject({ phase: "bidding", dealer: 0, turn: 1 });
    expect(newMatch(pack, DEFAULT_OPTIONS, 3).turn).toBe(0);
  });

  it("builds each preset's 52 cards", () => {
    expect(ids(deck(DEFAULT_OPTIONS)).sort()).toEqual(ids(standardDeck()).sort());
    const jokers = ids(deck(JOKERS));
    expect(jokers).toHaveLength(52);
    expect(jokers).toEqual(expect.arrayContaining(["joker-big", "joker-little", "diamonds-2", "spades-2"]));
    expect(jokers).not.toContain("clubs-2");
    expect(jokers).not.toContain("hearts-2");
  });

  it("refuses a short, duplicated or wrong-preset deck", () => {
    const pack = deck(DEFAULT_OPTIONS);
    expect(() => newMatch(pack.slice(1))).toThrow();
    expect(() => newMatch([...pack.slice(1), card("clubs-3")])).toThrow();
    expect(() => newMatch(deck(JOKERS))).toThrow();
    expect(() => newMatch(pack, JOKERS)).toThrow();
    expect(() => newMatch(standardDeck(true), JOKERS)).toThrow();
    const done = end([4, 3, 3, 3], [4, 3, 3, 3]);
    expect(() => nextHand(done, pack.slice(1))).toThrow();
    expect(() => nextHand(done, deck(JOKERS))).toThrow();
  });

  it("refuses a deck whose ids are right but whose suits or ranks are not", () => {
    for (const options of [DEFAULT_OPTIONS, JOKERS]) {
      const pack = deck(options);
      const forged = pack.map((c) => (c.id === "clubs-3" ? { ...c, suit: "spades" as const, rank: 14 } : c));
      const wrongRank = pack.map((c) => (c.id === "hearts-9" ? { ...c, rank: 10 } : c));
      const allAces = pack.map((c) => ({ ...c, suit: "spades" as const, rank: 14 }));
      const done = { ...newMatch(pack, options), phase: "hand-over" as const };
      for (const bad of [forged, wrongRank, allAces]) {
        expect(() => newMatch(bad, options)).toThrow();
        expect(() => nextHand(done, bad)).toThrow();
      }
      expect(nextHand(done, pack).phase).toBe("bidding");
    }
  });

  it("validates house rules strictly, drops unknown keys and defaults when undefined", () => {
    expect(spades.checkOptions(undefined)).toEqual(DEFAULT_OPTIONS);
    expect(spades.checkOptions({ ...JOKERS, target: 100, extra: 1 })).toEqual({ ...JOKERS, target: 100 });
    for (const bad of [
      null,
      "standard",
      {},
      { ...DEFAULT_OPTIONS, preset: "whiz" },
      { ...DEFAULT_OPTIONS, target: 300 },
      { ...DEFAULT_OPTIONS, target: "500" },
      { ...DEFAULT_OPTIONS, nil: "yes" },
      { ...DEFAULT_OPTIONS, bagPenalty: 1 },
      { preset: "standard", target: 500, nil: true },
    ]) {
      expect(() => spades.checkOptions(bad)).toThrow(RuleError);
    }
    expect(() => newMatch(deck(DEFAULT_OPTIONS), { ...DEFAULT_OPTIONS, target: 300 as 500 })).toThrow(RuleError);
  });
});

describe("bidding", () => {
  it("goes once clockwise from left of the dealer, then that seat leads", () => {
    let state = newMatch(deck(DEFAULT_OPTIONS));
    rejects(state, 0, bid(3));
    rejects(state, 2, bid(3));
    state = run(state, bid(3));
    expect(state.turn).toBe(2);
    state = run(state, bid(0), bid(13), bid(1));
    expect(state).toMatchObject({ phase: "play", turn: 1, bids: [1, 3, 0, 13] });
    rejects(state, 1, bid(3));
  });

  it("allows 1-13, and nil only under that house rule", () => {
    const state = newMatch(deck(DEFAULT_OPTIONS));
    expect(legalBids(state)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    const noNil = newMatch(deck(DEFAULT_OPTIONS), { ...DEFAULT_OPTIONS, nil: false });
    expect(legalBids(noNil)).toHaveLength(13);
    rejects(noNil, 1, bid(0));
    expect(run(noNil, bid(1)).bids[1]).toBe(1);
    rejects(state, 1, bid(14));
    rejects(state, 1, bid(-1));
  });

  it("rejects malformed actions", () => {
    const state = newMatch(deck(DEFAULT_OPTIONS));
    for (const bad of [
      null,
      undefined,
      7,
      "bid",
      [],
      {},
      { type: "bid" },
      { type: "bid", tricks: "4" },
      { type: "bid", tricks: 2.5 },
      { type: "bid", tricks: NaN },
      { type: "bid", tricks: null },
      { type: "bid", tricks: [4] },
      { type: "bid", tricks: 4, cardId: "clubs-3" },
      { type: "pass" },
      { type: "toString", tricks: 4 },
      { type: ["bid"], tricks: 4 },
      { type: "play", cardId: state.hands[1][0].id },
    ]) {
      rejects(state, 1, bad);
    }
    const playing = run(state, bid(3), bid(3), bid(3), bid(3));
    const held = legalCards(playing, playing.turn)[0].id;
    for (const type of [["play"], [["play"]], ["bid"], { toString: () => "play" }, "toString", "constructor"]) {
      rejects(playing, playing.turn, { type, cardId: held });
    }
    expect(run(playing, playCard(held)).trick).toHaveLength(1);
    rejects(state, 9 as Seat, bid(4));
    rejects(state, "1" as unknown as Seat, bid(4));
  });
});

describe("tricks", () => {
  it("ranks spades over the led suit, ace high, and ignores other suits", () => {
    const o = DEFAULT_OPTIONS;
    expect(trickWinner(plays("hearts-14", "spades-2", "hearts-13", "hearts-12"), o)).toBe(1);
    expect(trickWinner(plays("hearts-3", "clubs-14", "diamonds-14", "hearts-2"), o)).toBe(0);
    expect(trickWinner(plays("hearts-3", "spades-2", "spades-14", "spades-13"), o)).toBe(2);
    expect(trickWinner(plays("hearts-3", "diamonds-2", "hearts-4", "clubs-14"), o)).toBe(2);
  });

  it("promotes the jokers, the 2 of diamonds and the 2 of spades in the jokers preset", () => {
    expect(trickWinner(plays("spades-14", "spades-2", "spades-13", "spades-12"), JOKERS)).toBe(1);
    expect(trickWinner(plays("spades-14", "spades-2", "diamonds-2", "spades-12"), JOKERS)).toBe(2);
    expect(trickWinner(plays("diamonds-2", "joker-little", "spades-2", "spades-14"), JOKERS)).toBe(1);
    expect(trickWinner(plays("joker-little", "joker-big", "diamonds-2", "spades-2"), JOKERS)).toBe(1);
    expect(trickWinner(plays("diamonds-14", "diamonds-2", "diamonds-13", "diamonds-3"), JOKERS)).toBe(1);
    expect(trickWinner(plays("hearts-14", "hearts-3", "spades-3", "hearts-13"), JOKERS)).toBe(2);
  });

  it("makes players follow the led suit and frees a void hand", () => {
    const state = table({
      turn: 1,
      trick: plays("hearts-3"),
      hands: [[], cards("hearts-14", "clubs-2", "spades-14"), cards("clubs-3", "spades-5"), cards("hearts-9")],
    });
    expect(ids(legalCards(state, 1))).toEqual(["hearts-14"]);
    rejects(state, 1, playCard("clubs-2"));
    rejects(state, 1, playCard("spades-14"));
    rejects(state, 1, playCard("hearts-9"));
    rejects(state, 1, playCard("nope"));
    rejects(state, 1, { type: "play" });
    rejects(state, 1, { type: "play", cardId: 7 });
    rejects(state, 1, { type: "play", cardId: "hearts-14", tricks: 1 });
    rejects(state, 2, playCard("clubs-3"));
    rejects(state, 1, bid(3));
    const after = run(state, playCard("hearts-14"));
    expect(after.hands[1]).toHaveLength(2);
    expect(ids(legalCards(after, 2))).toEqual(["clubs-3", "spades-5"]);
    expect(run(after, playCard("clubs-3")).turn).toBe(3);
  });

  it("treats promoted cards as spades when following in the jokers preset", () => {
    const hands = [[], cards("joker-big", "diamonds-2", "hearts-14", "diamonds-5"), [], []];
    const spadeLed = table({ turn: 1, trick: plays("spades-3"), hands }, JOKERS);
    expect(ids(legalCards(spadeLed, 1))).toEqual(["joker-big", "diamonds-2"]);
    rejects(spadeLed, 1, playCard("hearts-14"));
    expect(run(spadeLed, playCard("diamonds-2")).trick).toHaveLength(2);
    const diamondLed = table({ turn: 1, trick: plays("diamonds-9"), hands }, JOKERS);
    expect(ids(legalCards(diamondLed, 1))).toEqual(["diamonds-5"]);
    rejects(diamondLed, 1, playCard("diamonds-2"));
    const standard = table({ turn: 1, trick: plays("diamonds-9"), hands: [[], cards("diamonds-2", "diamonds-5"), [], []] });
    expect(run(standard, playCard("diamonds-2")).spadesBroken).toBe(false);
  });

  it("bars a spade lead until spades are broken", () => {
    const hands = [cards("spades-14", "hearts-3"), cards("hearts-4", "clubs-4"), cards("spades-2"), cards("hearts-5")];
    const state = table({ hands });
    expect(ids(legalCards(state, 0))).toEqual(["hearts-3"]);
    rejects(state, 0, playCard("spades-14"));
    expect(run(table({ hands, spadesBroken: true }), playCard("spades-14")).trick).toHaveLength(1);

    // A heart lead that is followed leaves spades unbroken; a spade thrown on it breaks them.
    const followed = run(state, playCard("hearts-3"), playCard("hearts-4"));
    expect(followed.spadesBroken).toBe(false);
    const trumped = run(followed, playCard("spades-2"), playCard("hearts-5"));
    expect(trumped).toMatchObject({ spadesBroken: true, turn: 2, tricks: [0, 0, 1, 0], tricksPlayed: 1, trick: [] });
    expect(trumped.lastTrick).toMatchObject({ winner: 2 });
    expect(ids(legalCards(trumped, 0))).toEqual(["spades-14"]);
  });

  it("lets a hand of nothing but spades lead one, which breaks them", () => {
    const state = table({ hands: [cards("spades-14", "spades-3"), [], [], []] });
    expect(legalCards(state, 0)).toHaveLength(2);
    expect(run(state, playCard("spades-3")).spadesBroken).toBe(true);
  });

  it("counts jokers and the 2 of diamonds as spades for leading in the jokers preset", () => {
    const state = table({ hands: [cards("joker-big", "diamonds-2", "diamonds-3"), [], [], []] }, JOKERS);
    expect(ids(legalCards(state, 0))).toEqual(["diamonds-3"]);
    rejects(state, 0, playCard("joker-big"));
    rejects(state, 0, playCard("diamonds-2"));
    const onlySpades = table({ hands: [cards("joker-little", "diamonds-2"), [], [], []] }, JOKERS);
    expect(run(onlySpades, playCard("diamonds-2")).spadesBroken).toBe(true);
  });
});

describe("scoring", () => {
  it("pays 10 a trick for a made contract, plus a point and a bag per overtrick", () => {
    const exact = end([4, 3, 3, 3], [4, 3, 3, 3]);
    expect(exact.result![0]).toEqual({
      bids: [4, 3],
      tricks: [4, 3],
      nils: [null, null],
      contract: 7,
      made: true,
      bagsAdded: 0,
      penalty: 0,
      delta: 70,
    });
    expect(exact).toMatchObject({ scores: [70, 60], bags: [0, 0], phase: "hand-over", winner: null });
    const over = end([3, 3, 2, 3], [4, 3, 3, 3]);
    expect(over.result![0]).toMatchObject({ contract: 5, made: true, bagsAdded: 2, delta: 52 });
    expect(over).toMatchObject({ scores: [52, 60], bags: [2, 0] });
  });

  it("charges 10 a trick for a set contract, with no bags", () => {
    const set = end([5, 3, 4, 3], [4, 3, 3, 3]);
    expect(set.result![0]).toMatchObject({ contract: 9, made: false, bagsAdded: 0, delta: -90 });
    expect(set).toMatchObject({ scores: [-90, 60], bags: [0, 0] });
  });

  it("scores a made nil +100 beside the partner's contract", () => {
    const state = end([0, 3, 4, 3], [0, 4, 5, 4]);
    expect(state.result![0]).toMatchObject({ nils: ["made", null], contract: 4, made: true, bagsAdded: 1, delta: 141 });
    expect(state.result![1]).toMatchObject({ nils: [null, null], contract: 6, bagsAdded: 2, delta: 62 });
  });

  it("scores a failed nil -100 and turns its tricks into bags, not contract tricks", () => {
    const made = end([0, 3, 4, 3], [2, 3, 5, 3]);
    expect(made.result![0]).toMatchObject({ nils: ["failed", null], made: true, bagsAdded: 3, delta: -57 });
    // Six tricks between them, but the nil bidder's two do not help a bid of five.
    const set = end([0, 3, 5, 3], [2, 4, 4, 3]);
    expect(set.result![0]).toMatchObject({ nils: ["failed", null], made: false, bagsAdded: 2, delta: -148 });
    expect(set.bags).toEqual([2, 1]);
  });

  it("has no contract when both partners bid nil", () => {
    const state = end([0, 3, 0, 3], [0, 7, 1, 5]);
    expect(state.result![0]).toEqual({
      bids: [0, 0],
      tricks: [0, 1],
      nils: ["made", "failed"],
      contract: 0,
      made: null,
      bagsAdded: 1,
      penalty: 0,
      delta: 1,
    });
    expect(end([0, 3, 0, 3], [0, 7, 0, 6]).result![0]).toMatchObject({ made: null, bagsAdded: 0, delta: 200 });
  });

  it("scores a jokers hand and deals the next one from the jokers deck", () => {
    const state = table(
      {
        bids: [4, 3, 3, 4],
        tricks: [3, 3, 3, 3],
        tricksPlayed: 12,
        hands: [cards("diamonds-2"), cards("spades-14"), cards("spades-2"), cards("joker-little")],
      },
      JOKERS,
    );
    const done = run(state, playCard("diamonds-2"), playCard("spades-14"), playCard("spades-2"), playCard("joker-little"));
    expect(done.lastTrick).toMatchObject({ winner: 3 });
    expect(done.result![0]).toMatchObject({ contract: 7, tricks: [3, 3], made: false, delta: -70 });
    expect(done.result![1]).toMatchObject({ contract: 7, tricks: [3, 4], made: true, bagsAdded: 0, delta: 70 });
    expect(() => nextHand(done, deck(DEFAULT_OPTIONS))).toThrow();
    const again = nextHand(done, deck(JOKERS));
    expect(again).toMatchObject({ phase: "bidding", dealer: 1, turn: 2, scores: [-70, 70] });
    expect(ids(again.hands.flat()).sort()).toEqual(ids(deck(JOKERS)).sort());
    expect(again.hands.map((hand) => hand.length)).toEqual([13, 13, 13, 13]);
  });

  it("carries bags across hands and takes 100 at every tenth unless the house rule is off", () => {
    const hit = end([3, 3, 2, 3], [4, 3, 3, 3], { bags: [8, 0] });
    expect(hit.result![0]).toMatchObject({ bagsAdded: 2, penalty: 100, delta: -48 });
    expect(hit.bags).toEqual([0, 0]);
    expect(end([3, 3, 2, 3], [4, 3, 3, 3], { bags: [7, 0] })).toMatchObject({ bags: [9, 0], scores: [52, 60] });
    const twice = end([1, 3, 1, 3], [7, 0, 6, 0], { bags: [9, 0] });
    expect(twice.result![0]).toMatchObject({ bagsAdded: 11, penalty: 200, delta: -169 });
    expect(twice).toMatchObject({ bags: [0, 0], scores: [-169, -60] });
    const off = end([3, 3, 2, 3], [4, 3, 3, 3], { bags: [8, 0] }, { bagPenalty: false });
    expect(off.result![0]).toMatchObject({ bagsAdded: 2, penalty: 0, delta: 52 });
    expect(off.bags).toEqual([10, 0]);
  });

  it("ends the game when a team reaches the target, the higher score winning", () => {
    const short = { target: 100 } as const;
    expect(end([4, 3, 3, 3], [4, 3, 3, 3], { scores: [40, 0] }, short)).toMatchObject({
      phase: "game-over",
      winner: 0,
      scores: [110, 60],
    });
    expect(end([4, 3, 3, 3], [4, 3, 3, 3], { scores: [40, 60] }, short)).toMatchObject({ phase: "game-over", winner: 1 });
    expect(end([4, 3, 3, 3], [4, 3, 3, 3], { scores: [40, 0] }, { target: 250 })).toMatchObject({ phase: "hand-over" });
    expect(end([4, 3, 3, 3], [4, 3, 3, 3], { scores: [440, 0] })).toMatchObject({ phase: "game-over", winner: 0 });
    // No losing threshold: a deep negative score does not end the game.
    expect(end([13, 3, 0, 3], [4, 3, 3, 3], { scores: [-900, 0] })).toMatchObject({ phase: "hand-over", winner: null });
    const over = end([4, 3, 3, 3], [4, 3, 3, 3], { scores: [40, 0] }, short);
    expect(() => nextHand(over, deck(DEFAULT_OPTIONS))).toThrow(RuleError);
    rejects(over, over.turn, bid(3));
    rejects(over, over.turn, playCard("clubs-3"));
  });

  it("plays on when the scores are tied at the target", () => {
    const tied = end([4, 3, 3, 3], [4, 3, 3, 3], { scores: [50, 60] }, { target: 100 });
    expect(tied).toMatchObject({ phase: "hand-over", winner: null, scores: [120, 120] });
    expect(nextHand(tied, deck(DEFAULT_OPTIONS)).phase).toBe("bidding");
  });

  it("rotates the dealer clockwise for the next hand and keeps scores and bags", () => {
    const done = end([3, 3, 2, 3], [4, 3, 3, 3]);
    rejects(done, done.turn, bid(3));
    const again = nextHand(done, deck(DEFAULT_OPTIONS));
    expect(again).toMatchObject({
      dealer: 1,
      turn: 2,
      handNumber: 2,
      phase: "bidding",
      scores: [52, 60],
      bags: [2, 0],
      bids: [null, null, null, null],
      tricks: [0, 0, 0, 0],
      spadesBroken: false,
      result: null,
    });
    expect(() => nextHand(again, deck(DEFAULT_OPTIONS))).toThrow(RuleError);
  });
});

describe("purity", () => {
  it("leaves its input untouched when a bid, a play, the last trick or the next deal succeeds", () => {
    const untouched = (state: State, step: (s: State) => State): State => {
      const before = structuredClone(state);
      const after = step(state);
      expect(state).toEqual(before);
      expect(after).not.toBe(state);
      return after;
    };
    const bidding = newMatch(deck(DEFAULT_OPTIONS));
    const bidOnce = untouched(bidding, (s) => apply(s, s.turn, bid(3)));
    const playing = run(bidOnce, bid(3), bid(3), bid(3));
    untouched(playing, (s) => apply(s, s.turn, playCard(legalCards(s, s.turn)[0].id)));
    let last = table({
      bids: [3, 3, 2, 3],
      tricks: [3, 3, 3, 3],
      tricksPlayed: 12,
      bags: [9, 0],
      hands: [cards("clubs-14"), cards("clubs-3"), cards("clubs-4"), cards("clubs-5")],
    });
    for (let i = 0; i < 3; i += 1) last = run(last, playCard(last.hands[last.turn][0].id));
    const done = untouched(last, (s) => apply(s, s.turn, playCard(s.hands[s.turn][0].id)));
    expect(done).toMatchObject({ phase: "hand-over", scores: [-48, 60], bags: [1, 0] });
    const again = untouched(done, (s) => nextHand(s, deck(DEFAULT_OPTIONS)));
    expect(again).toMatchObject({ handNumber: 2, dealer: 1 });
  });
});

describe("views", () => {
  const hiddenFrom = (state: State, seat: Seat | null) => {
    const seen = JSON.stringify(viewFor(state, seat));
    const others = state.hands.filter((_, s) => s !== seat).flat();
    return ids(others).filter((id) => seen.includes(`"${id}"`));
  };

  it("shows a player only their own cards and the host none", () => {
    const state = newMatch(deck(JOKERS), JOKERS);
    expect(hiddenFrom(state, 2)).toEqual([]);
    expect(viewFor(state, 2).hand).toEqual(state.hands[2]);
    const host = viewFor(state, null);
    expect(JSON.stringify(host)).not.toMatch(/"(clubs|diamonds|hearts|spades|joker)-/);
    expect(host).toMatchObject({ handCounts: [13, 13, 13, 13], hand: null, legal: null });
  });

  it("keeps unplayed cards hidden during play while showing the table", () => {
    let state = run(newMatch(deck(DEFAULT_OPTIONS)), bid(3), bid(3), bid(3), bid(3));
    for (let i = 0; i < 6; i += 1) state = run(state, playCard(legalCards(state, state.turn)[0].id));
    for (const seat of [0, 1, 2, 3, null] as const) expect(hiddenFrom(state, seat)).toEqual([]);
    const host = viewFor(state, null);
    expect(host.trick).toEqual(state.trick);
    expect(host.lastTrick).toEqual(state.lastTrick);
    expect(host.handCounts).toEqual(state.hands.map((hand) => hand.length));
  });

  it("offers legal moves only to the seat on turn, and none once the hand is over", () => {
    const state = newMatch(deck(DEFAULT_OPTIONS));
    expect(viewFor(state, 0).legal).toBeNull();
    expect(viewFor(state, 1).legal).toEqual({ bids: legalBids(state), cardIds: [] });
    const playing = run(state, bid(3), bid(3), bid(3), bid(3));
    expect(viewFor(playing, 1).legal).toEqual({ bids: [], cardIds: ids(legalCards(playing, 1)) });
    const done = end([4, 3, 3, 3], [4, 3, 3, 3]);
    expect(viewFor(done, done.turn).legal).toBeNull();
    expect(viewFor(done, null).result).toEqual(done.result);
  });
});

describe("bots", () => {
  it("play complete games with every card accounted for at each step", () => {
    let seed = 11;
    const shuffle = (pack: Card[]) => {
      for (let i = pack.length - 1; i > 0; i -= 1) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        const j = seed % (i + 1);
        [pack[i], pack[j]] = [pack[j], pack[i]];
      }
      return pack;
    };
    const tables: Options[] = [];
    for (const preset of ["standard", "jokers"] as const) {
      for (const target of [100, 250, 500] as const) {
        for (const nil of [true, false]) {
          for (const bagPenalty of [true, false]) tables.push({ preset, target, nil, bagPenalty });
        }
      }
    }
    const nils = { made: 0, failed: 0 };
    for (const raw of tables) {
      const options = spades.checkOptions(raw);
      let state = spades.newMatch(shuffle(spades.deck(options)), options);
      for (let step = 0; state.phase !== "game-over"; step += 1) {
        expect(step).toBeLessThan(20000);
        if (state.phase === "hand-over") state = spades.nextHand(state, shuffle(spades.deck(options)));
        const seat = state.turn;
        const before = state.scores;
        // The bot never bids nil, so seat 0 does it by hand on odd hands to put nil scoring through whole games.
        const forceNil = options.nil && state.phase === "bidding" && seat === 0 && state.handNumber % 2 === 1;
        state = spades.apply(state, seat, forceNil ? bid(0) : spades.chooseAction(spades.viewFor(state, seat)));
        if (state.tricksPlayed === 13 && state.result) {
          const nil = state.result[0].nils[0];
          if (nil) nils[nil] += 1;
          expect(state.result[0].delta + state.result[1].delta).toBe(
            state.scores[0] + state.scores[1] - before[0] - before[1],
          );
        }
        const live = [...state.hands.flat(), ...state.trick.map((p) => p.card)];
        expect(new Set(ids(live)).size).toBe(live.length);
        expect(live.length + state.tricksPlayed * 4).toBe(52);
        expect(ids(live).every((id) => spades.deck(options).some((c) => c.id === id))).toBe(true);
      }
      expect(state.winner).not.toBeNull();
      expect(state.scores[state.winner!]).toBeGreaterThanOrEqual(options.target);
      expect(state.scores[state.winner!]).toBeGreaterThan(state.scores[1 - state.winner!]);
    }
    expect(nils.made).toBeGreaterThan(0);
    expect(nils.failed).toBeGreaterThan(0);
    expect(() => chooseAction(viewFor(newMatch(deck(DEFAULT_OPTIONS)), 0))).toThrow();
  }, 30000);
});
