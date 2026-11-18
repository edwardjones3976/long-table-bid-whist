// @vitest-environment node
import { describe, expect, it } from "vitest";
import { standardDeck, type Card } from "../../shared/cards";
import {
  DEFAULT_OPTIONS,
  RuleError,
  apply,
  meldKind,
  newMatch,
  nextHand,
  total,
  viewFor,
  type Action,
  type Meld,
  type Options,
  type Seat,
  type State,
} from "../../server/games/tonk";
import { chooseAction, tonk } from "../../server/games/tonk-bot";
import { Match } from "../../server/match";

const deck = () => standardDeck(false);
const card = (id: string): Card => deck().find((c) => c.id === id)!;
/** Cards from a space-separated list of ids. */
const c = (ids: string): Card[] => ids.split(" ").map(card);
const ids = (cards: readonly Card[]) => cards.map((x) => x.id);
const meldOf = (seat: Seat, kind: Meld["kind"], cards: string): Meld => ({ seat, kind, cards: c(cards) });

/** Runs actions for whoever's turn it is. */
function run(state: State, ...actions: Action[]): State {
  return actions.reduce((s, action) => apply(s, s.turn, action), state);
}

function rejects(state: State, seat: Seat, action: unknown): void {
  const before = structuredClone(state);
  expect(() => apply(state, seat, action as Action)).toThrow(RuleError);
  expect(state).toEqual(before);
}

/** A deck that deals these five-card hands (by seat) when seat 0 deals. */
function stacked(hands: string[]): Card[] {
  const dealt = Array.from({ length: 20 }, (_, i) => hands[(1 + i) % 4].split(" ")[Math.floor(i / 4)]);
  return [...dealt.map(card), ...deck().filter((x) => !dealt.includes(x.id))];
}

/** Seat 0 on turn with the given hands; rule tests do not need the other 52 cards placed. */
function table(hands: string[], over: Partial<State> = {}): State {
  return { ...newMatch(deck()), hands: hands.map(c), turn: 0, ...over };
}

const LOW = ["hearts-2 hearts-3 hearts-4 hearts-5 hearts-7", "clubs-2 clubs-3 clubs-4 clubs-5 clubs-7"];
const FIFTY = "clubs-13 diamonds-13 hearts-13 spades-13 clubs-10";
const FORTY_NINE = "clubs-12 diamonds-12 hearts-12 spades-12 clubs-9";
const SPARE = "diamonds-2 diamonds-3 diamonds-4 diamonds-5 diamonds-7";

describe("deal", () => {
  it("deals five each from left of the dealer, turns one card up and stocks the rest", () => {
    const state = newMatch(deck());
    expect(state.hands.map((hand) => hand.length)).toEqual([5, 5, 5, 5]);
    expect(ids(state.hands[1])).toEqual(["clubs-2", "clubs-6", "clubs-10", "clubs-14", "diamonds-5"]);
    expect(ids(state.discards)).toEqual(["diamonds-9"]);
    expect(state.stock).toHaveLength(31);
    expect(new Set(ids([...state.hands.flat(), ...state.discards, ...state.stock])).size).toBe(52);
    expect(state).toMatchObject({ phase: "draw", turn: 1, dealer: 0, scores: [0, 0, 0, 0], winners: [], result: null });
  });

  it("refuses a short, duplicated or jokered deck", () => {
    expect(() => newMatch(deck().slice(1))).toThrow();
    expect(() => newMatch([...deck().slice(1), card("clubs-3")])).toThrow();
    expect(() => newMatch(standardDeck(true))).toThrow();
    const over = run(table(["clubs-2", "clubs-9", "clubs-9", "clubs-9"]), { type: "drop" });
    expect(() => nextHand(over, deck().slice(1))).toThrow();
    expect(() => nextHand(over, [...deck().slice(1), card("clubs-3")])).toThrow();
  });

  it("refuses a deck whose cards do not match their ids, or that holds a non-card", () => {
    const swap = (change: unknown) => deck().map((x) => (x.id === "clubs-14" ? (change as Card) : x));
    const over = run(table(["clubs-2", "clubs-9", "clubs-9", "clubs-9"]), { type: "drop" });
    for (const bad of [{ id: "clubs-14", suit: "clubs", rank: 13 }, { id: "clubs-14", suit: "diamonds", rank: 14 }, { id: "clubs-14" }, null, "clubs-14"]) {
      expect(() => newMatch(swap(bad))).toThrow("Deck must be the 52 standard cards");
      expect(() => nextHand(over, swap(bad))).toThrow("Deck must be the 52 standard cards");
    }
  });

  it("validates house rules strictly and defaults them when absent", () => {
    expect(tonk.checkOptions(undefined)).toEqual(DEFAULT_OPTIONS);
    expect(DEFAULT_OPTIONS).toEqual({ knocking: true, initialFifty: true, target: 5 });
    expect(tonk.checkOptions({ knocking: false, initialFifty: false, target: 10, junk: 1 })).toEqual({
      knocking: false,
      initialFifty: false,
      target: 10,
    });
    for (const bad of [null, 5, "x", {}, { ...DEFAULT_OPTIONS, target: 7 }, { ...DEFAULT_OPTIONS, knocking: "yes" }, { knocking: true, target: 5 }]) {
      expect(() => tonk.checkOptions(bad)).toThrow(RuleError);
    }
    expect(() => newMatch(deck(), { ...DEFAULT_OPTIONS, target: 7 as 5 })).toThrow(RuleError);
    expect(tonk.deck(DEFAULT_OPTIONS)).toHaveLength(52);
  });

  it("counts an ace as one, pips at face value and court cards as ten", () => {
    expect(total(c("clubs-14 clubs-2 clubs-10 clubs-11 clubs-12 clubs-13"))).toBe(43);
    expect(total(c(FIFTY))).toBe(50);
    expect(total(c(FORTY_NINE))).toBe(49);
  });
});

describe("initial 49/50", () => {
  it("wins the hand for a lone holder of 50 or of 49 and reveals only that hand", () => {
    for (const [hand, sum] of [[FIFTY, 50], [FORTY_NINE, 49]] as const) {
      const state = newMatch(stacked([LOW[0], LOW[1], hand, SPARE]));
      expect(state).toMatchObject({ phase: "hand-over", scores: [0, 0, 2, 0], winners: [] });
      expect(state.result).toEqual({
        reason: "initial-fifty",
        seat: 2,
        totals: [21, 21, sum, 21],
        points: [0, 0, 2, 0],
        revealed: [{ seat: 2, cards: c(hand) }],
      });
      rejects(state, state.turn, { type: "draw", from: "stock" });
      rejects(state, state.turn, { type: "drop" });
      const seen = JSON.stringify(viewFor(state, null));
      expect(ids(state.hands[2]).every((id) => seen.includes(`"${id}"`))).toBe(true);
      const hidden = ids([...state.hands[0], ...state.hands[1], ...state.hands[3], ...state.stock]);
      expect(hidden.filter((id) => seen.includes(`"${id}"`))).toEqual([]);
    }
  });

  it("voids the deal when two players qualify", () => {
    const state = newMatch(stacked([FORTY_NINE, LOW[1], FIFTY, SPARE]));
    expect(state).toMatchObject({ phase: "hand-over", scores: [0, 0, 0, 0] });
    expect(state.result).toMatchObject({ reason: "void-deal", seat: null, points: [0, 0, 0, 0], totals: [49, 21, 50, 21] });
    expect(state.result!.revealed.map((r) => r.seat)).toEqual([0, 2]);
    expect(nextHand(state, deck())).toMatchObject({ phase: "draw", dealer: 1, turn: 2, handNumber: 2 });
  });

  it("is ignored when the house rule is off", () => {
    const state = newMatch(stacked([LOW[0], LOW[1], FIFTY, SPARE]), { ...DEFAULT_OPTIONS, initialFifty: false });
    expect(state).toMatchObject({ phase: "draw", result: null, turn: 1 });
  });

  it("can end the game on the deal", () => {
    const done = { ...run(table(["clubs-2", "clubs-9", "clubs-9", "clubs-9"]), { type: "drop" }), scores: [0, 3, 0, 0] };
    // Seat 1 deals the next hand, so the stacked seats shift by one.
    const again = nextHand(done, stacked([SPARE, LOW[0], LOW[1], FIFTY].map((_, i, all) => all[(i + 3) % 4])));
    expect(again.result).toMatchObject({ reason: "initial-fifty", seat: 1 });
    expect(again).toMatchObject({ phase: "game-over", scores: [0, 5, 0, 0], winners: [1] });
  });
});

describe("draw", () => {
  it("takes the top of the stock or of the discard pile and opens the meld step", () => {
    const state = newMatch(deck());
    const top = state.stock.at(-1)!.id;
    const fromStock = run(state, { type: "draw", from: "stock" });
    expect(fromStock.hands[1].at(-1)!.id).toBe(top);
    expect(fromStock.stock).toHaveLength(30);
    expect(fromStock).toMatchObject({ phase: "meld", turn: 1, tookDiscard: null });
    const fromPile = run(state, { type: "draw", from: "discard" });
    expect(fromPile.hands[1].at(-1)!.id).toBe("diamonds-9");
    expect(fromPile.discards).toEqual([]);
    expect(fromPile).toMatchObject({ phase: "meld", turn: 1, tookDiscard: "diamonds-9" });
    expect(fromPile.stock).toHaveLength(31);
  });

  it("rejects malformed, mistimed and out-of-turn actions", () => {
    const state = newMatch(deck());
    rejects(state, 2, { type: "draw", from: "stock" });
    rejects(state, 1, { type: "draw", from: "kitty" });
    rejects(state, 1, { type: "draw", from: 0 });
    rejects(state, 1, { type: "draw" });
    rejects(state, 1, { type: "draw", from: "stock", junk: 1 });
    rejects(state, 1, { type: "nope" });
    rejects(state, 1, { type: "constructor" });
    rejects(state, 1, { type: ["draw"], from: "stock" });
    rejects(state, 1, {});
    rejects(state, 1, null);
    rejects(state, 1, undefined);
    rejects(state, 1, 7);
    rejects(state, 1, "draw");
    rejects(state, 1, { type: "discard", cardId: state.hands[1][0].id });
    rejects(state, 1, { type: "meld", cardIds: ids(state.hands[1]).slice(0, 3) });
    rejects(state, 1, { type: "extend", meldIndex: 0, cardId: state.hands[1][0].id });
    const drawn = run(state, { type: "draw", from: "stock" });
    rejects(drawn, 1, { type: "draw", from: "stock" });
    rejects(drawn, 1, { type: "drop" });
  });

  it("refuses an empty pile", () => {
    rejects({ ...newMatch(deck()), stock: [] }, 1, { type: "draw", from: "stock" });
    rejects({ ...newMatch(deck()), discards: [] }, 1, { type: "draw", from: "discard" });
  });
});

describe("drop", () => {
  it("scores one for a dropper strictly lowest", () => {
    const state = run(table(["clubs-14 clubs-2", "clubs-5", "clubs-6", "clubs-13"]), { type: "drop" });
    expect(state.result).toEqual({ reason: "drop-won", seat: 0, totals: [3, 5, 6, 10], points: [1, 0, 0, 0], revealed: [] });
    expect(state).toMatchObject({ phase: "hand-over", scores: [1, 0, 0, 0] });
  });

  it("fails on a tie or a higher total and pays two to each lowest opponent", () => {
    const tied = run(table(["clubs-5", "diamonds-5", "hearts-5", "clubs-13"]), { type: "drop" });
    expect(tied.result).toMatchObject({ reason: "drop-failed", seat: 0, totals: [5, 5, 5, 10], points: [0, 2, 2, 0] });
    expect(tied.scores).toEqual([0, 2, 2, 0]);
    const high = run(table(["clubs-13", "clubs-2", "clubs-3", "clubs-4"]), { type: "drop" });
    expect(high.result).toMatchObject({ reason: "drop-failed", points: [0, 2, 0, 0] });
  });

  it("is closed when knocking is off, after drawing, and to malformed input", () => {
    const hands = ["clubs-14", "clubs-5", "clubs-6", "clubs-13"];
    rejects(table(hands, { options: { ...DEFAULT_OPTIONS, knocking: false } }), 0, { type: "drop" });
    rejects(table(hands, { phase: "meld" }), 0, { type: "drop" });
    rejects(table(hands), 0, { type: "drop", junk: true });
    rejects(table(hands), 1, { type: "drop" });
  });
});

describe("melds", () => {
  const hand = "clubs-7 diamonds-7 hearts-7 spades-7 clubs-14 clubs-2 clubs-3 clubs-4 clubs-12 clubs-13 hearts-2";
  const state = table([hand, "clubs-5", "clubs-6", "clubs-8"], { phase: "meld" });
  const meld = (...cardIds: string[]): Action => ({ type: "meld", cardIds });

  it("lays sets of three or four and runs of three or more with the ace low", () => {
    const three = run(state, meld("clubs-7", "diamonds-7", "hearts-7"));
    expect(three.melds).toEqual([meldOf(0, "set", "clubs-7 diamonds-7 hearts-7")]);
    expect(three.hands[0]).toHaveLength(8);
    expect(three).toMatchObject({ phase: "meld", turn: 0 });
    expect(run(state, meld("clubs-7", "diamonds-7", "hearts-7", "spades-7")).melds[0].cards).toHaveLength(4);
    expect(run(state, meld("clubs-3", "clubs-14", "clubs-2")).melds).toEqual([meldOf(0, "run", "clubs-14 clubs-2 clubs-3")]);
    const two = run(state, meld("clubs-4", "clubs-2", "clubs-3", "clubs-14"), meld("clubs-7", "hearts-7", "spades-7"));
    expect(two.melds.map((m) => [m.kind, m.cards.length])).toEqual([["run", 4], ["set", 3]]);
    expect(two.hands[0]).toHaveLength(4);
  });

  it("rejects anything that is not a set or a run from the player's own hand", () => {
    rejects(state, 0, meld("clubs-12", "clubs-13", "clubs-14"));
    rejects(state, 0, meld("clubs-13", "clubs-14", "clubs-2"));
    rejects(state, 0, meld("clubs-7", "diamonds-7"));
    rejects(state, 0, meld("clubs-14", "hearts-2", "clubs-3"));
    rejects(state, 0, meld("clubs-2", "clubs-3", "clubs-12"));
    rejects(state, 0, meld("clubs-7", "clubs-7", "diamonds-7"));
    rejects(state, 0, meld("clubs-3", "clubs-4", "clubs-5"));
    rejects(state, 0, meld());
    rejects(state, 0, { type: "meld", cardIds: "clubs-7" });
    rejects(state, 0, { type: "meld", cardIds: [1, 2, 3] });
    rejects(state, 0, { type: "meld", cardIds: [null, {}, ["clubs-7"]] });
    rejects(state, 0, { type: "meld", cardIds: null });
    rejects(state, 0, { type: "meld" });
    rejects(state, 0, { type: "meld", cardIds: ["clubs-7", "diamonds-7", "hearts-7"], junk: 1 });
    rejects(state, 1, meld("clubs-7", "diamonds-7", "hearts-7"));
    expect(meldKind(c("clubs-12 clubs-13 clubs-14"))).toBeNull();
    expect(meldKind(c("clubs-14 clubs-2 clubs-3"))).toBe("run");
  });

  it("scores two for going out through melds", () => {
    const out = run(table(["clubs-7 diamonds-7 hearts-7", "clubs-5", "clubs-6", "clubs-8"], { phase: "meld" }), meld("clubs-7", "diamonds-7", "hearts-7"));
    expect(out.result).toEqual({ reason: "out-by-melds", seat: 0, totals: [0, 5, 6, 8], points: [2, 0, 0, 0], revealed: [] });
    expect(out).toMatchObject({ phase: "hand-over", scores: [2, 0, 0, 0] });
    rejects(out, 0, { type: "discard", cardId: "clubs-7" });
  });
});

describe("extending", () => {
  const melds = [
    meldOf(1, "set", "clubs-9 diamonds-9 hearts-9"),
    meldOf(0, "run", "hearts-5 hearts-6 hearts-7"),
    meldOf(2, "run", "spades-11 spades-12 spades-13"),
  ];
  const state = table(["spades-9 hearts-4 hearts-8 spades-14 spades-10 clubs-2", "clubs-5", "clubs-6", "clubs-8"], { phase: "meld", melds });
  const extend = (meldIndex: unknown, cardId: unknown) => ({ type: "extend", meldIndex, cardId }) as Action;

  it("adds the fourth card of a set or either end of a run, on anyone's meld", () => {
    const set = run(state, extend(0, "spades-9"));
    expect(set.melds[0]).toEqual(meldOf(1, "set", "clubs-9 diamonds-9 hearts-9 spades-9"));
    expect(set.hands[0]).toHaveLength(5);
    const both = run(state, extend(1, "hearts-8"), extend(1, "hearts-4"), extend(2, "spades-10"));
    expect(ids(both.melds[1].cards)).toEqual(["hearts-4", "hearts-5", "hearts-6", "hearts-7", "hearts-8"]);
    expect(ids(both.melds[2].cards)).toEqual(["spades-10", "spades-11", "spades-12", "spades-13"]);
    expect(both).toMatchObject({ phase: "meld", turn: 0 });
    expect(state.melds).toEqual(melds);
  });

  it("rejects a card that does not fit, is not held, or names no meld", () => {
    rejects(state, 0, extend(2, "spades-14"));
    rejects(state, 0, extend(0, "clubs-2"));
    rejects(state, 0, extend(1, "spades-9"));
    rejects(state, 0, extend(1, "hearts-9"));
    rejects(state, 0, extend(0, "clubs-5"));
    rejects(state, 0, extend(3, "spades-9"));
    rejects(state, 0, extend(-1, "spades-9"));
    rejects(state, 0, extend(0.5, "spades-9"));
    rejects(state, 0, extend("0", "spades-9"));
    rejects(state, 0, extend(null, "spades-9"));
    rejects(state, 0, extend(0, 9));
    rejects(state, 0, { type: "extend", meldIndex: 0 });
    rejects(state, 0, { type: "extend", cardId: "spades-9" });
    rejects(state, 0, { type: "extend", meldIndex: 0, cardId: "spades-9", junk: 1 });
    rejects(state, 1, extend(0, "spades-9"));
  });

  it("scores two when the last card goes onto a meld", () => {
    const out = run(table(["spades-9", "clubs-5", "clubs-6", "clubs-8"], { phase: "meld", melds }), extend(0, "spades-9"));
    expect(out.result).toMatchObject({ reason: "out-by-melds", seat: 0, points: [2, 0, 0, 0] });
  });
});

describe("discard", () => {
  const hands = ["clubs-2 clubs-9 hearts-12", "clubs-5", "clubs-6", "clubs-8"];
  const discard = (cardId: unknown) => ({ type: "discard", cardId }) as Action;

  it("ends the turn face up on the pile and passes clockwise", () => {
    const before = table(hands, { phase: "meld" });
    const state = run(before, discard("clubs-9"));
    expect(state.discards.at(-1)!.id).toBe("clubs-9");
    expect(state.discards).toHaveLength(before.discards.length + 1);
    expect(ids(state.hands[0])).toEqual(["clubs-2", "hearts-12"]);
    expect(state).toMatchObject({ phase: "draw", turn: 1, result: null });
    rejects(before, 0, discard("clubs-5"));
    rejects(before, 0, discard(3));
    rejects(before, 0, discard(["clubs-9"]));
    rejects(before, 0, { type: "discard" });
    rejects(before, 0, { type: "discard", cardId: "clubs-9", junk: 1 });
    rejects(before, 1, discard("clubs-5"));
  });

  it("may not return the card just taken from the pile, but may return a stock card", () => {
    const start = newMatch(deck());
    const took = run(start, { type: "draw", from: "discard" });
    rejects(took, 1, discard("diamonds-9"));
    const passed = run(took, discard("clubs-10"));
    expect(passed).toMatchObject({ turn: 2, tookDiscard: null });
    const drew = run(start, { type: "draw", from: "stock" });
    expect(run(drew, discard(drew.hands[1].at(-1)!.id)).turn).toBe(2);
  });

  it("never returns the taken card, even as the last card held", () => {
    const state = table(["clubs-9", "clubs-5", "clubs-6", "clubs-8"], { phase: "meld", tookDiscard: "clubs-9" });
    rejects(state, 0, discard("clubs-9"));
  });

  it("refuses a meld or extension that would strand the taken card, so a move always exists", () => {
    const hands = ["hearts-5 diamonds-5 spades-5", "clubs-5", "clubs-6", "clubs-8"];
    const took = run(table(hands, { discards: c("clubs-13") }), { type: "draw", from: "discard" });
    rejects(took, 0, { type: "meld", cardIds: ["hearts-5", "diamonds-5", "spades-5"] });
    expect(viewFor(took, 0).legal).toMatchObject({ melds: [], extensions: [], discardIds: ["hearts-5", "diamonds-5", "spades-5"] });
    expect(chooseAction(viewFor(took, 0))).toEqual({ type: "discard", cardId: "hearts-5" });

    const melds = [meldOf(1, "run", "hearts-2 hearts-3 hearts-4")];
    const last = table(["hearts-5 clubs-13", "clubs-5", "clubs-6", "clubs-8"], { phase: "meld", melds, tookDiscard: "clubs-13" });
    rejects(last, 0, { type: "extend", meldIndex: 0, cardId: "hearts-5" });
    expect(viewFor(last, 0).legal).toMatchObject({ extensions: [], discardIds: ["hearts-5"] });

    // The taken card completes the set it leaves behind, so the hand can still go out through melds.
    const fits = run(table(hands, { discards: c("clubs-5") }), { type: "draw", from: "discard" });
    expect(viewFor(fits, 0).legal!.melds).toHaveLength(5);
    const laid = run(fits, { type: "meld", cardIds: ["hearts-5", "diamonds-5", "spades-5"] });
    expect(viewFor(laid, 0).legal).toMatchObject({ extensions: [{ meldIndex: 0, cardId: "clubs-5" }], discardIds: [] });
    expect(run(laid, { type: "extend", meldIndex: 0, cardId: "clubs-5" }).result).toMatchObject({ reason: "out-by-melds", points: [2, 0, 0, 0] });
  });

  it("scores one for going out by the final discard", () => {
    const out = run(table(["hearts-12", "clubs-5", "clubs-6", "clubs-8"], { phase: "meld" }), discard("hearts-12"));
    expect(out.result).toEqual({ reason: "out-by-discard", seat: 0, totals: [0, 5, 6, 8], points: [1, 0, 0, 0], revealed: [] });
    expect(out).toMatchObject({ phase: "hand-over", scores: [1, 0, 0, 0] });
    expect(out.discards.at(-1)!.id).toBe("hearts-12");
  });
});

describe("purity", () => {
  it("leaves its input untouched when an action is accepted", () => {
    const melds = [meldOf(1, "set", "clubs-9 diamonds-9 hearts-9")];
    const hands = ["spades-9 clubs-2 clubs-3 clubs-4 hearts-12", "clubs-5", "clubs-6", "clubs-8"];
    const drawing = table(hands, { melds });
    const melding = table(hands, { melds, phase: "meld" });
    const cases: [State, Action][] = [
      [drawing, { type: "drop" }],
      [drawing, { type: "draw", from: "stock" }],
      [drawing, { type: "draw", from: "discard" }],
      [melding, { type: "meld", cardIds: ["clubs-2", "clubs-3", "clubs-4"] }],
      [melding, { type: "extend", meldIndex: 0, cardId: "spades-9" }],
      [melding, { type: "discard", cardId: "hearts-12" }],
    ];
    for (const [state, action] of cases) {
      const before = structuredClone(state);
      expect(apply(state, 0, action)).not.toEqual(before);
      expect(state).toEqual(before);
    }
    const over = run(drawing, { type: "drop" });
    const snapshot = structuredClone(over);
    nextHand(over, deck());
    expect(over).toEqual(snapshot);
  });
});

describe("empty stock", () => {
  const hands = ["clubs-2 clubs-9", "clubs-3", "diamonds-3", "clubs-13"];
  const discard = (cardId: string): Action => ({ type: "discard", cardId });

  it("ends the hand before the next player acts and pays one to the lowest total", () => {
    const state = run(table(hands, { phase: "meld", stock: [] }), discard("clubs-9"));
    expect(state.result).toEqual({ reason: "stock-empty", seat: null, totals: [2, 3, 3, 13 - 3], points: [1, 0, 0, 0], revealed: [] });
    expect(state).toMatchObject({ phase: "hand-over", scores: [1, 0, 0, 0] });
    rejects(state, state.turn, { type: "draw", from: "discard" });
  });

  it("pays every player tied for lowest", () => {
    const state = run(table(hands, { phase: "meld", stock: [] }), discard("clubs-2"));
    expect(state.result).toMatchObject({ reason: "stock-empty", totals: [9, 3, 3, 10], points: [0, 1, 1, 0] });
  });

  it("triggers once the last stock card has been drawn and the turn passes", () => {
    const drawn = run(table(hands, { stock: c("spades-5") }), { type: "draw", from: "stock" });
    expect(drawn).toMatchObject({ phase: "meld", result: null });
    expect(run(drawn, discard("spades-5")).result).toMatchObject({ reason: "stock-empty" });
    expect(run(table(hands, { stock: c("spades-5 spades-6") }), { type: "draw", from: "stock" }, discard("spades-6"))).toMatchObject({
      phase: "draw",
      turn: 1,
      result: null,
    });
  });
});

describe("game end", () => {
  const hands = ["clubs-2 clubs-9", "clubs-3", "diamonds-3", "clubs-13"];
  const finish = (cardId: string, options: Partial<Options> = {}) =>
    run(table(hands, { phase: "meld", stock: [], scores: [4, 4, 4, 0], options: { ...DEFAULT_OPTIONS, ...options } }), { type: "discard", cardId });

  it("ends when a player reaches the target and shares a simultaneous win", () => {
    expect(finish("clubs-9")).toMatchObject({ phase: "game-over", scores: [5, 4, 4, 0], winners: [0] });
    const shared = finish("clubs-2");
    expect(shared).toMatchObject({ phase: "game-over", scores: [4, 5, 5, 0], winners: [1, 2] });
    expect(() => nextHand(shared, deck())).toThrow(RuleError);
    rejects(shared, shared.turn, { type: "draw", from: "stock" });
    expect(viewFor(shared, shared.turn).legal).toBeNull();
  });

  it("plays on to ten under that house rule, rotating the dealer", () => {
    const state = finish("clubs-2", { target: 10 });
    expect(state).toMatchObject({ phase: "hand-over", winners: [] });
    const again = nextHand(state, deck());
    expect(again).toMatchObject({ dealer: 1, turn: 2, handNumber: 2, phase: "draw", scores: [4, 5, 5, 0], result: null, melds: [] });
    expect(() => nextHand(again, deck())).toThrow(RuleError);
    expect(state.phase).toBe("hand-over");
  });
});

describe("views", () => {
  it("shows a player only their own cards and the host none that are concealed", () => {
    const state = run(newMatch(deck()), { type: "draw", from: "stock" }, { type: "discard", cardId: "clubs-10" });
    const view = viewFor(state, 2);
    const seen = JSON.stringify(view);
    const hidden = ids([...state.hands[0], ...state.hands[1], ...state.hands[3], ...state.stock]);
    expect(hidden.filter((id) => seen.includes(`"${id}"`))).toEqual([]);
    expect(view.hand).toEqual(state.hands[2]);
    const host = viewFor(state, null);
    const hostSeen = JSON.stringify(host);
    expect(ids([...state.hands.flat(), ...state.stock]).filter((id) => hostSeen.includes(`"${id}"`))).toEqual([]);
    expect(host).toMatchObject({ hand: null, legal: null, handCounts: [5, 5, 5, 5], stockCount: 30, turn: 2, phase: "draw" });
    expect(ids(host.discards)).toEqual(["diamonds-9", "clubs-10"]);
    expect("stock" in host || "hands" in host).toBe(false);
  });

  it("publishes totals but no cards when a hand is compared", () => {
    const state = run(newMatch(deck()), { type: "drop" });
    expect(state.phase).toBe("hand-over");
    for (const seat of [0, 2, null] as const) {
      const seen = JSON.stringify(viewFor(state, seat));
      const hidden = ids([...state.hands.filter((_, i) => i !== seat).flat(), ...state.stock]);
      expect(hidden.filter((id) => seen.includes(`"${id}"`))).toEqual([]);
      expect(viewFor(state, seat).result!.totals).toEqual(state.hands.map(total));
    }
  });

  it("lists the open moves for the player on turn only", () => {
    const start = newMatch(deck());
    expect(viewFor(start, 1).legal).toEqual({ canDrop: true, canDrawStock: true, canDrawDiscard: true, melds: [], extensions: [], discardIds: [] });
    expect(viewFor(start, 0).legal).toBeNull();
    expect(viewFor({ ...start, options: { ...DEFAULT_OPTIONS, knocking: false } }, 1).legal!.canDrop).toBe(false);
    const melds = [meldOf(1, "set", "clubs-9 diamonds-9 hearts-9"), meldOf(2, "run", "hearts-5 hearts-6 hearts-7")];
    const state = table(["spades-9 hearts-4 hearts-8 clubs-2 clubs-3 clubs-4", "clubs-5", "clubs-6", "clubs-8"], {
      phase: "meld",
      melds,
      tookDiscard: "clubs-4",
    });
    expect(viewFor(state, 0).legal).toEqual({
      canDrop: false,
      canDrawStock: false,
      canDrawDiscard: false,
      melds: [["clubs-2", "clubs-3", "clubs-4"]],
      extensions: [
        { meldIndex: 0, cardId: "spades-9" },
        { meldIndex: 1, cardId: "hearts-4" },
        { meldIndex: 1, cardId: "hearts-8" },
      ],
      discardIds: ["spades-9", "hearts-4", "hearts-8", "clubs-2", "clubs-3"],
    });
    expect(viewFor(state, 0).melds).toEqual(melds);
  });
});

describe("bots", () => {
  it("play whole games to a winner with every card accounted for at each step", () => {
    let seed = 11;
    const testDeck = () => {
      const out = deck();
      for (let i = out.length - 1; i > 0; i -= 1) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        const j = seed % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    for (const knocking of [true, false]) {
      for (const initialFifty of [true, false]) {
        for (const target of [5, 10] as const) {
          const options: Options = { knocking, initialFifty, target };
          const reasons = new Set<string>();
          for (let game = 0; game < 3; game += 1) {
            let state = tonk.newMatch(testDeck(), options);
            for (let step = 0; state.phase !== "game-over"; step += 1) {
              expect(step).toBeLessThan(20000);
              if (state.phase === "hand-over") {
                reasons.add(state.result!.reason);
                state = tonk.nextHand(state, testDeck());
              } else {
                const seat = state.turn;
                state = tonk.apply(state, seat, tonk.chooseAction(tonk.viewFor(state, seat)));
              }
              const live = [...state.hands.flat(), ...state.stock, ...state.discards, ...state.melds.flatMap((m) => m.cards)];
              expect(live).toHaveLength(52);
              expect(new Set(ids(live)).size).toBe(52);
            }
            reasons.add(state.result!.reason);
            expect(state.winners.length).toBeGreaterThan(0);
            expect(state.winners).toEqual(([0, 1, 2, 3] as Seat[]).filter((s) => state.scores[s] >= target));
          }
          // The bot must use each way of ending a hand that the table allows, not just run the stock out.
          expect(reasons.has("out-by-melds") || reasons.has("out-by-discard"), JSON.stringify(options)).toBe(true);
          expect(reasons.has("drop-won") || reasons.has("drop-failed"), JSON.stringify(options)).toBe(knocking);
          if (!initialFifty) expect(reasons.has("initial-fifty") || reasons.has("void-deal")).toBe(false);
        }
      }
    }
  }, 30000);

  it("finish every hand inside the match server's bot loop", () => {
    let seed = 5;
    const shuffle = (cards: Card[]) => {
      for (let i = cards.length - 1; i > 0; i -= 1) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        const j = seed % (i + 1);
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      return cards;
    };
    for (const options of [undefined, { knocking: false, initialFifty: false, target: 10 }]) {
      const match = new Match(tonk, options, shuffle);
      match.start();
      for (let hand = 1; match.state!.phase !== "game-over"; hand += 1) {
        expect(hand).toBeLessThan(200);
        expect(match.state!.phase).toBe("hand-over");
        expect(match.act(0, { actionId: String(hand), expectedRevision: match.revision, action: { type: "next-hand" } }).ok).toBe(true);
      }
      expect(match.state!.winners.length).toBeGreaterThan(0);
    }
  });

  it("refuses to act out of turn", () => {
    expect(() => chooseAction(viewFor(newMatch(deck()), 0))).toThrow();
  });
});
