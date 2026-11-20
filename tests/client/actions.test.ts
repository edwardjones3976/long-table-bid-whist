import { describe, expect, it } from "vitest";
import type { Card } from "../../shared/cards";
import type { GameId, GameView, Seat, SeatInfo, TableId, TableSnapshot, TableSummary } from "../../shared/protocol";
import { GAMES } from "../../server/games/index";
import { describeTable, toggleSelection, type TableButton, type TableDescription } from "../../client/src/ui/actions";
import { cardLabel } from "../../client/src/ui/cards";

const TABLE_OF: Record<GameId, TableId> = { tonk: "tonk-1", spades: "spades-1", "bid-whist": "bid-whist-1" };
const SEATS: Seat[] = [0, 1, 2, 3];

const human = (seat: number, ready = true): SeatInfo => ({
  occupant: "human",
  memberId: `m${seat}`,
  name: `P${seat + 1}`,
  ready,
  connected: true,
});
const open: SeatInfo = { occupant: "open", memberId: null, name: null, ready: false, connected: false };

function summaryOf(game: GameId, patch: Partial<TableSummary> = {}): TableSummary {
  return {
    id: TABLE_OF[game],
    game,
    status: "lobby",
    seats: [human(0), human(1), human(2), human(3)],
    host: null,
    managerId: "m0",
    options: GAMES[game].checkOptions(undefined),
    ...patch,
  };
}

function snapshotOf(game: GameId, you: Seat | null, view: unknown, revision = 1): TableSnapshot {
  return { tableId: TABLE_OF[game], game, revision, you, view: view as GameView | null };
}

const ids = (description: TableDescription): string[] => description.buttons.map((button) => button.id);
const button = (description: TableDescription, id: string): TableButton => {
  const found = description.buttons.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no button ${id} among ${ids(description).join(", ")}`);
  return found;
};

/** A repeatable shuffle, so a failing hand can be replayed. */
function shuffler(seed: number) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 0x100000000;
    return state / 0x100000000;
  };
  const shuffle = (deck: Card[]): Card[] => {
    const out = [...deck];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { random, shuffle };
}

/**
 * Plays whole hands using nothing but what describeTable offers: it presses a
 * random enabled action button, picking hand cards first when no button is
 * enabled yet. The real rule engine applies each action, so an offered move
 * that the rules refuse fails the test.
 */
function playHands(game: GameId, seed: number, hands: number, allowDrop = false): Set<string> {
  const engine = GAMES[game];
  const options = engine.checkOptions(undefined);
  const { random, shuffle } = shuffler(seed);
  let state = engine.newMatch(shuffle(engine.deck(options)), options);
  const pressed = new Set<string>();
  let dealt = 1;

  for (let step = 0; step < 4000; step += 1) {
    if (state.phase === "game-over") break;
    const over = state.phase === "hand-over";
    if (over && dealt === hands) break;
    const seat = over ? 0 : state.turn;
    const summary = summaryOf(game, { status: "playing" });
    const describeFor = (who: Seat | null, selection: string[] = []) =>
      describeTable({
        summary: who === null ? { ...summary, host: { memberId: "host", name: "Dealer", connected: true } } : summary,
        snapshot: snapshotOf(game, who, engine.viewFor(state, who)),
        meId: who === null ? "host" : `m${who}`,
        selection,
      });

    if (!over) {
      // Only the seat on turn is offered a move; the host never is.
      for (const other of [...SEATS.filter((s) => s !== seat), null]) {
        const theirs = describeFor(other);
        expect(theirs.buttons.filter((b) => b.run.kind === "action")).toEqual([]);
        expect(theirs.hand.some((held) => held.selectable)).toBe(false);
      }
      expect(describeFor(seat).seats[seat]).toMatchObject({ isTurn: true, isYou: true });
    }

    let selection: string[] = [];
    let description = describeFor(seat);
    const choices = () =>
      description.buttons.filter((b) => b.run.kind === "action" && !b.disabled && (allowDrop || b.id !== "drop"));
    while (!choices().length) {
      const next = description.hand.find((held) => held.selectable && !held.selected);
      if (!next) throw new Error(`${game} seed ${seed}: stuck in ${state.phase} with buttons ${ids(description).join(", ")}`);
      selection = toggleSelection(selection, next.card.id, description.selectionLimit);
      description = describeFor(seat, selection);
    }
    const offered = choices();
    // Squaring leans toward the first buttons (low bids), so auctions do not always end at seven.
    const chosen = offered[Math.floor(random() ** 2 * offered.length)];
    // "bid-4-low" counts as "bid"; the few two-word ids are kept whole.
    pressed.add(/^(bid-pass|draw-stock|draw-discard|next-hand)$/.test(chosen.id) ? chosen.id : chosen.id.split("-")[0]);
    const run = chosen.run as { kind: "action"; action: { type: string } };
    if (run.action.type === "next-hand") {
      state = engine.nextHand(state, shuffle(engine.deck(options)));
      dealt += 1;
    } else {
      state = engine.apply(state, seat, run.action);
    }
  }
  expect(["hand-over", "game-over"]).toContain(state.phase);

  // The finished hand is explained in words to everyone, and the table offers the right way on.
  const summary = summaryOf(game, { status: state.phase === "game-over" ? "results" : "playing" });
  const end = (who: Seat) =>
    describeTable({ summary, snapshot: snapshotOf(game, who, engine.viewFor(state, who)), meId: `m${who}`, selection: [] });
  expect(end(1).statusLines.join(" ")).toMatch(/points|scores|void/);
  if (state.phase === "hand-over") {
    expect(ids(end(1))).toContain("next-hand");
    // The host deals too, with the same action a player sends.
    const host = describeTable({
      summary: { ...summary, host: { memberId: "host", name: "Dealer", connected: true } },
      snapshot: snapshotOf(game, null, engine.viewFor(state, null)),
      meId: "host",
      selection: [],
    });
    expect(button(host, "next-hand").run).toEqual(button(end(1), "next-hand").run);
    expect(host.statusLines.join(" ")).toContain("You can deal the next hand");
  } else {
    expect(ids(end(0))).toContain("reset");
    expect(ids(end(1))).not.toContain("reset");
    expect(end(1).statusLines.join(" ")).toContain("won the game");
  }
  expect(ids(end(2))).toContain("leave");
  return pressed;
}

describe("describeTable while playing", () => {
  it("plays Bid Whist hands through every phase with only the offered moves", () => {
    const pressed = new Set<string>();
    for (let seed = 1; seed <= 25; seed += 1) playHands("bid-whist", seed, 2).forEach((id) => pressed.add(id));
    expect([...pressed].sort()).toEqual(["bid", "bid-pass", "declare", "discard", "next-hand", "play"]);
  });

  it("plays Spades hands with only the offered moves", () => {
    const pressed = new Set<string>();
    for (let seed = 1; seed <= 4; seed += 1) playHands("spades", seed, 2).forEach((id) => pressed.add(id));
    expect([...pressed].sort()).toEqual(["bid", "next-hand", "play"]);
  });

  it("plays Tonk hands with only the offered moves, including melds, extensions and drops", () => {
    const pressed = new Set<string>();
    for (let seed = 1; seed <= 30; seed += 1) playHands("tonk", seed, 3, seed % 5 === 0).forEach((id) => pressed.add(id));
    expect([...pressed].sort()).toEqual(["discard", "draw-discard", "draw-stock", "drop", "extend", "meld", "next-hand"]);
  }, 30000);

  it("offers nil in Spades only when the house rules allow it", () => {
    const engine = GAMES.spades;
    for (const nil of [true, false]) {
      const options = engine.checkOptions({ preset: "standard", target: 500, nil, bagPenalty: true });
      const state = engine.newMatch(shuffler(3).shuffle(engine.deck(options)), options);
      const seat = state.turn;
      const description = describeTable({
        summary: summaryOf("spades", { status: "playing" }),
        snapshot: snapshotOf("spades", seat, engine.viewFor(state, seat)),
        meId: `m${seat}`,
        selection: [],
      });
      expect(ids(description).includes("bid-0")).toBe(nil);
      expect(ids(description)).toContain("bid-13");
    }
  });

  it("shows the Bid Whist kitty as a six-card choice", () => {
    const engine = GAMES["bid-whist"];
    const options = engine.checkOptions(undefined);
    let state = engine.newMatch(shuffler(7).shuffle(engine.deck(options)), options);
    state = engine.apply(state, state.turn, { type: "bid", bid: { level: 4, kind: "high" } });
    while (state.phase === "auction") state = engine.apply(state, state.turn, { type: "bid", bid: null });
    const seat = state.turn;
    const describeWith = (selection: string[]) =>
      describeTable({
        summary: summaryOf("bid-whist", { status: "playing" }),
        snapshot: snapshotOf("bid-whist", seat, engine.viewFor(state, seat)),
        meId: `m${seat}`,
        selection,
      });
    expect(ids(describeWith([]))).toEqual(["declare-spades", "declare-hearts", "declare-clubs", "declare-diamonds", "leave"]);
    state = engine.apply(state, seat, { type: "declare", trump: "hearts" });

    let description = describeWith([]);
    expect(description.hand).toHaveLength(18);
    expect(description.selectionLimit).toBe(6);
    expect(button(description, "discard")).toMatchObject({ disabled: true, reason: "Pick exactly six cards (0 picked)" });
    expect(button(description, "clear").disabled).toBe(true);
    expect(description.statusLines.join(" ")).toContain("trump is Hearts");

    let selection: string[] = [];
    for (const held of description.hand.slice(0, 7)) selection = toggleSelection(selection, held.card.id, description.selectionLimit);
    expect(selection).toHaveLength(6);
    description = describeWith(selection);
    expect(description.hand.filter((held) => held.selected)).toHaveLength(6);
    expect(button(description, "discard").disabled).toBe(false);
    expect(button(description, "clear").run).toEqual({ kind: "select-clear" });
    // A stale pick (a card no longer held) is ignored rather than sent.
    expect(describeWith(["not-a-card"]).hand.some((held) => held.selected)).toBe(false);
  });
});

describe("describeTable before play", () => {
  const empty = summaryOf("tonk", { status: "available", seats: [open, open, open, open], managerId: null });

  it("offers a visitor each open seat and the host role", () => {
    const description = describeTable({ summary: empty, snapshot: null, meId: "me", selection: [] });
    expect(description.title).toBe("Tonk Table 1");
    expect(description.role).toBe("visitor");
    expect(ids(description)).toEqual(["sit-0", "sit-1", "sit-2", "sit-3", "sit-host"]);
    expect(description.buttons.every((b) => !b.disabled)).toBe(true);
    expect(button(description, "sit-2").run).toEqual({ kind: "socket", call: "sit", args: { tableId: "tonk-1", role: "player", seat: 2 } });
    expect(button(description, "sit-host").run).toEqual({ kind: "socket", call: "sit", args: { tableId: "tonk-1", role: "host" } });
  });

  it("explains why a seat cannot be taken", () => {
    const taken = summaryOf("tonk", {
      seats: [human(0), open, open, open],
      host: { memberId: "h", name: "Dee", connected: true },
    });
    const description = describeTable({ summary: taken, snapshot: null, meId: "me", selection: [] });
    expect(button(description, "sit-0")).toMatchObject({ disabled: true, reason: "Taken by P1" });
    expect(button(description, "sit-1").disabled).toBe(false);
    expect(button(description, "sit-host")).toMatchObject({ disabled: true, reason: "Dee is already the host" });

    const playing = describeTable({ summary: { ...taken, status: "playing", host: null }, snapshot: null, meId: "me", selection: [] });
    expect(button(playing, "sit-1")).toMatchObject({ disabled: true, reason: "Wait for this match to finish" });
    expect(button(playing, "sit-host").disabled).toBe(false);

    const elsewhere = describeTable({ summary: empty, snapshot: null, meId: "me", selection: [], elsewhere: true });
    expect(elsewhere.buttons.every((b) => b.disabled && b.reason === "Leave your table first")).toBe(true);
  });

  it("gives a seated player ready and leave, and the manager the house rules and start", () => {
    const summary = summaryOf("bid-whist", { seats: [human(0, false), human(1, true), open, open] });
    const manager = describeTable({ summary, snapshot: snapshotOf("bid-whist", 0, null, 0), meId: "m0", selection: [] });
    expect(ids(manager)).toEqual(["ready", "option-minBid", "option-lowOverHigh", "option-overtricks", "option-noTrumpDouble", "start", "leave"]);
    expect(button(manager, "start")).toMatchObject({ disabled: true, reason: "Waiting for you to be ready" });
    expect(button(manager, "option-minBid").label).toContain("Lowest bid: 3");
    expect(button(manager, "option-minBid").run).toEqual({
      kind: "options",
      options: { minBid: 4, lowOverHigh: false, overtricks: true, noTrumpDouble: true },
    });
    expect(manager.statusLines.join(" ")).toContain("House rules: Lowest bid: 3");

    const other = describeTable({ summary, snapshot: snapshotOf("bid-whist", 1, null, 0), meId: "m1", selection: [] });
    expect(ids(other)).toEqual(["unready", "leave"]);
    expect(other.statusLines.join(" ")).toContain("P1 manages this table");

    const allReady = summaryOf("bid-whist", { seats: [human(0), human(1), open, open] });
    const ready = describeTable({ summary: allReady, snapshot: snapshotOf("bid-whist", 0, null, 0), meId: "m0", selection: [] });
    expect(button(ready, "start").disabled).toBe(false);
    expect(ids(ready)).toContain("unready");
  });

  it("cycles every house rule of every game through values the rules accept", () => {
    for (const game of ["tonk", "spades", "bid-whist"] as GameId[]) {
      let options: unknown = GAMES[game].checkOptions(undefined);
      const seen = new Set<string>();
      for (let presses = 0; presses < 12; presses += 1) {
        const description = describeTable({
          summary: summaryOf(game, { options }),
          snapshot: snapshotOf(game, 0, null, 0),
          meId: "m0",
          selection: [],
        });
        const rules = description.buttons.filter((b) => b.id.startsWith("option-"));
        expect(rules.length).toBe(Object.keys(options as object).length);
        const pressed = rules[presses % rules.length];
        options = (pressed.run as { options: unknown }).options;
        // The engine's own validator accepts what the button would send, unchanged.
        expect(GAMES[game].checkOptions(options)).toEqual(options);
        seen.add(JSON.stringify(options));
      }
      expect(seen.size).toBeGreaterThan(3);
    }
  });

  it("lets a host who manages the table start it without a ready button", () => {
    const summary = summaryOf("spades", {
      seats: [human(0), open, open, open],
      host: { memberId: "h", name: "Dee", connected: true },
      managerId: "h",
    });
    const host = describeTable({ summary, snapshot: snapshotOf("spades", null, null, 0), meId: "h", selection: [] });
    expect(host.role).toBe("host");
    expect(ids(host)).toEqual(["option-preset", "option-target", "option-nil", "option-bagPenalty", "start", "leave"]);
    expect(button(host, "start").disabled).toBe(false);
  });

  it("says who lost connection", () => {
    const summary = summaryOf("tonk", { seats: [human(0), { ...human(1), connected: false }, open, open] });
    const description = describeTable({ summary, snapshot: snapshotOf("tonk", 0, null, 0), meId: "m0", selection: [] });
    expect(description.statusLines.join(" ")).toContain("P2 lost connection");
    expect(description.seats[1]).toMatchObject({ connected: false, name: "P2", team: null });
  });
});

describe("selection and card names", () => {
  it("toggles within the limit and replaces when the limit is one", () => {
    expect(toggleSelection([], "a", 1)).toEqual(["a"]);
    expect(toggleSelection(["a"], "b", 1)).toEqual(["b"]);
    expect(toggleSelection(["a"], "a", 1)).toEqual([]);
    expect(toggleSelection(["a", "b"], "c", 2)).toEqual(["a", "b"]);
    expect(toggleSelection(["a", "b"], "c", 3)).toEqual(["a", "b", "c"]);
  });

  it("names cards in words", () => {
    expect(cardLabel({ id: "spades-14", suit: "spades", rank: 14 })).toBe("A of Spades");
    expect(cardLabel({ id: "hearts-10", suit: "hearts", rank: 10 })).toBe("10 of Hearts");
    expect(cardLabel({ id: "clubs-11", suit: "clubs", rank: 11 })).toBe("J of Clubs");
    expect(cardLabel({ id: "joker-big", suit: "joker", rank: 16 })).toBe("Big Joker");
    expect(cardLabel({ id: "joker-little", suit: "joker", rank: 15 })).toBe("Little Joker");
  });
});
