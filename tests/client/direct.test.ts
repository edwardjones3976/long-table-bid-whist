/**
 * Direct card handling as decisions (client/src/tableui/direct.ts), played against the real rule
 * engines: what a dropped card, a pulled pile, a pushed token and the two pucks do in each game,
 * which zone a held card is over, and whether a seated arm reaches everything it handles.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Card } from "../../shared/cards";
import type { GameId, Seat, SeatInfo, TableId, TableSnapshot, TableSummary } from "../../shared/protocol";
import { GAMES } from "../../server/games/index";
import { GRAB_RADIUS } from "../../client/src/tableui/carry";
import {
  ARM,
  buryButton,
  canStage,
  DRAG_COMMIT,
  dropCard,
  feltFloor,
  foresee,
  frameFor,
  HAND,
  handFan,
  layButton,
  leaveSpot,
  meldRows,
  objectName,
  pileSpot,
  pruneSpread,
  puckSpot,
  pulled,
  pushed,
  settle,
  stagedRow,
  STAND_RADIUS,
  STAND_TOP,
  standing,
  tableMode,
  tableZones,
  TOKEN_LEAN,
  tokenButtons,
  tokenGrid,
  whyNot,
  withinReach,
  ZONE_SLACK,
  zoneAt,
  type Frame,
  type Outcome,
  type TokenGrid,
  type Zone,
} from "../../client/src/tableui/direct";
import { describeTable, type TableButton, type TableDescription } from "../../client/src/ui/actions";
import { CARD_ASPECT } from "../../client/src/ui/cards";
import { EYE_HEIGHT_SEATED, TABLE_HEIGHT, TABLE_RADIUS, tableSpot } from "../../client/src/world/layout";

const ME = "me";
const TABLE_OF: Record<GameId, TableId> = { tonk: "tonk-1", spades: "spades-1", "bid-whist": "bid-whist-1" };

/** A repeatable shuffle, so a failing hand can be replayed. */
function shuffler(seed: number) {
  let state = seed;
  return (deck: Card[]): Card[] => {
    const out = [...deck];
    for (let i = out.length - 1; i > 0; i -= 1) {
      state = (state * 1664525 + 1013904223) % 0x100000000;
      const j = Math.floor((state / 0x100000000) * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
}

/** One table run by the real rule engine with me in `seat` and the engine's bots in the others. */
function bench(game: GameId, seed = 1, seat: Seat = 0) {
  const engine = GAMES[game];
  const options = engine.checkOptions(undefined);
  const people = ([0, 1, 2, 3] as Seat[]).map(
    (n): SeatInfo =>
      n === seat
        ? { occupant: "human", memberId: ME, name: "Ann", ready: true, connected: true }
        : { occupant: "bot", memberId: null, name: null, ready: false, connected: true },
  );
  const summary: TableSummary = { id: TABLE_OF[game], game, status: "playing", seats: people as TableSummary["seats"], host: null, managerId: ME, options };
  const table = {
    engine,
    seat,
    frame: frameFor(tableSpot(TABLE_OF[game]), seat),
    state: engine.newMatch(shuffler(seed)(engine.deck(options)), options) as any,
    describe: (selection: readonly string[] = []): TableDescription =>
      describeTable({
        summary,
        snapshot: { tableId: summary.id, game, revision: 1, you: seat, view: engine.viewFor(table.state, seat) as TableSnapshot["view"] },
        meId: ME,
        selection,
      }),
    live: () => table.state.phase !== "hand-over" && table.state.phase !== "game-over",
    /** The other seats play (by `policy`, else the engine's bot) until it is my turn or the hand ends. */
    bots(policy: (view: any) => unknown = engine.chooseAction) {
      while (table.live() && table.state.turn !== seat) {
        table.state = engine.apply(table.state, table.state.turn, policy(engine.viewFor(table.state, table.state.turn)));
      }
    },
    /** Carries out a described button the way the server would, as me. */
    press(button: TableButton) {
      expect(button.disabled).toBe(false);
      if (button.run.kind !== "action") throw new Error(`${button.id} is not a game action`);
      table.state = engine.apply(table.state, seat, button.run.action);
    },
    zones: (): Zone[] => tableZones(table.describe(), table.frame),
    drop: (cardId: string, zone: Parameters<typeof dropCard>[3], staging = { selection: [] as readonly string[], spread: [] as readonly string[] }): Outcome =>
      dropCard(table.describe, staging, cardId, zone),
  };
  return table;
}

/** A table still in its lobby, with me in seat 0 managing it. */
function lobby(game: GameId): TableDescription {
  const summary: TableSummary = {
    id: TABLE_OF[game],
    game,
    status: "lobby",
    seats: [
      { occupant: "human", memberId: ME, name: "Ann", ready: false, connected: true },
      { occupant: "open", memberId: null, name: null, ready: false, connected: false },
      { occupant: "open", memberId: null, name: null, ready: false, connected: false },
      { occupant: "open", memberId: null, name: null, ready: false, connected: false },
    ],
    host: null,
    managerId: ME,
    options: GAMES[game].checkOptions(undefined),
  };
  return describeTable({ summary, snapshot: null, meId: ME, selection: [] });
}

/** Spades with the bidding done and me to play, in seat 0. */
function spadesInPlay() {
  const table = bench("spades", 3);
  table.bots();
  table.press(table.describe().buttons.find((button) => button.id === "bid-2")!);
  table.bots();
  expect(tableMode(table.describe())).toBe("play");
  return table;
}

/** Bid Whist with me in seat 2 and everyone else passing, so I win the bid, name trump and pick up the kitty. */
function toKitty() {
  const table = bench("bid-whist", 4, 2);
  const passing = (view: any) => (view.phase === "auction" ? { type: "bid", bid: null } : table.engine.chooseAction(view));
  table.bots(passing);
  return { table, passing };
}

/** Bid Whist with the kitty in my hand: eighteen cards, six to bury. */
function withKitty() {
  const { table, passing } = toKitty();
  table.press(tokenButtons(table.describe()).find((button) => /^bid-\d-high$/.test(button.id))!);
  table.bots(passing);
  table.press(table.describe().buttons.find((button) => button.id === "declare-hearts")!);
  expect(tableMode(table.describe())).toBe("kitty");
  return { table, passing };
}

/** A Tonk deal where the first player can lay a meld down after drawing from the stock; I am that player, about to draw. */
function toMeld() {
  for (let seed = 1; seed < 400; seed += 1) {
    const probe = bench("tonk", seed);
    if (probe.state.phase !== "draw") continue;
    const table = bench("tonk", seed, probe.state.turn);
    const drawn = table.engine.apply(table.state, table.seat, { type: "draw", from: "stock" });
    if (!(table.engine.viewFor(drawn, table.seat).legal as { melds: unknown[] }).melds.length) continue;
    return table;
  }
  throw new Error("no such deal");
}

const ids = (zones: Zone[]): string[] => zones.map((zone) => zone.id);
const zone = (id: string, zones: Zone[]): Zone => zones.find((entry) => entry.id === id)!;
const pressed = (outcome: Outcome): TableButton => {
  expect(outcome.kind).toBe("press");
  return (outcome as { button: TableButton }).button;
};
const action = (button: TableButton): Record<string, unknown> => (button.run.kind === "action" ? button.run.action : {});

describe("direct.ts", () => {
  it("is free of three.js: nothing but types and the pure room layout is imported", () => {
    const source = readFileSync("client/src/tableui/direct.ts", "utf8");
    const imports = [...source.matchAll(/^import (type )?.* from "(.*)";$/gm)];
    expect(imports.length).toBeGreaterThan(0);
    for (const [, typeOnly, from] of imports) expect(typeOnly === "type " || from === "../world/layout", from).toBe(true);
    expect(readFileSync("client/src/world/layout.ts", "utf8")).not.toMatch(/from "three|@react-three/);
  });
});

describe("Spades by hand", () => {
  it("lays the bids out as tokens, and tells a card held over the felt why it cannot be played yet", () => {
    const table = bench("spades", 3);
    table.bots();
    const now = table.describe();
    expect(now.seats[0].isTurn).toBe(true);
    expect(tableMode(now)).toBe("idle");
    expect(table.zones().map((entry) => [entry.id, entry.label])).toEqual([
      ["hand", "Your hand"],
      ["wait", "You cannot play a card yet"],
    ]);
    const tokens = tokenButtons(now);
    expect(tokens.map((button) => button.id)).toEqual(Array.from({ length: 14 }, (_, n) => `bid-${n}`));
    expect(objectName("bid-4")).toBe("token-bid-4");
    // Nothing a card or a marker handles is also a token.
    expect(tokens.some((button) => button.id === "leave")).toBe(false);
    // Let go over the felt, a card goes back and says why; let go anywhere else it only goes back.
    const card = now.hand[0].card.id;
    expect(table.drop(card, "wait")).toEqual({ kind: "reject", reason: "You cannot play a card yet" });
    expect(table.drop(card, null)).toEqual({ kind: "none" });
    expect(table.drop(card, "hand")).toEqual({ kind: "none" });
  });

  it("says it is not my turn to a card held over the felt, also when my turn ended while it was in the air", () => {
    // A deal in which somebody else bids first.
    let table = bench("spades", 1, 2);
    for (let seed = 2; table.state.turn === 2; seed += 1) table = bench("spades", seed, 2);
    const now = table.describe();
    expect(now.seats.find((seat) => seat.isYou)!.isTurn).toBe(false);
    expect(whyNot(now)).toBe("Not your turn");
    expect(table.zones().map((entry) => [entry.id, entry.label])).toEqual([
      ["hand", "Your hand"],
      ["wait", "Not your turn"],
    ]);
    const card = now.hand[0].card.id;
    const refused = table.drop(card, "wait");
    expect(refused).toEqual({ kind: "reject", reason: "Not your turn" });
    expect(foresee(refused, "wait")).toBe("Not your turn");
    // The zone it was over a moment ago was still "play": that is refused the same way, never sent.
    expect(table.drop(card, "play")).toEqual({ kind: "reject", reason: "Not your turn" });
  });

  it("says the hand is over once nobody is to move", () => {
    const table = bench("spades", 3);
    while (table.live()) {
      table.bots();
      if (table.live()) table.state = table.engine.apply(table.state, table.seat, table.engine.chooseAction(table.engine.viewFor(table.state, table.seat)));
    }
    expect(whyNot(table.describe())).toBe("The hand is over");
    // No cards are left to hold, so there is nowhere to put one.
    expect(table.zones()).toEqual([]);
  });

  it("plays a legal card dropped on the felt and sends an illegal one back with a reason", () => {
    // A hand where I must follow suit, so some of my cards are not legal.
    let table = bench("spades", 1);
    for (let seed = 1; seed < 200; seed += 1) {
      table = bench("spades", seed, 2);
      table.bots();
      table.press(table.describe().buttons.find((button) => button.id === "bid-3")!);
      table.bots();
      const hand = table.describe().hand;
      if (table.state.trick.length && hand.some((held) => !held.selectable) && hand.some((held) => held.selectable)) break;
    }
    const now = table.describe();
    expect(tableMode(now)).toBe("play");
    expect(ids(table.zones())).toEqual(["hand", "play"]);
    expect(tokenButtons(now)).toEqual([]);

    const illegal = now.hand.find((held) => !held.selectable)!.card.id;
    const refused = table.drop(illegal, "play");
    expect(refused).toEqual({ kind: "reject", reason: "You cannot play that card now" });
    // Said before it is let go, in words.
    expect(foresee(refused, "play")).toBe("Not allowed: You cannot play that card now");
    // Let go anywhere else, any card just goes back.
    expect(table.drop(illegal, null)).toEqual({ kind: "none" });
    expect(table.drop(illegal, "hand")).toEqual({ kind: "none" });
    expect(foresee(table.drop(illegal, "hand"), "hand")).toBe("Back to your hand");
    expect(foresee(table.drop(illegal, null), null)).toBe("");

    const legal = now.hand.find((held) => held.selectable)!.card.id;
    // The button is the one describeTable makes for that card, whatever was picked before the drop.
    const button = pressed(table.drop(legal, "play", { selection: [illegal], spread: [] }));
    expect(button.id).toBe("play");
    expect(action(button)).toEqual({ type: "play", cardId: legal });
    expect(foresee({ kind: "press", button }, "play")).toBe(button.label);
    const before = table.state.hands[2].length;
    table.press(button);
    expect(table.state.hands[2]).toHaveLength(before - 1);
  });

  it("makes a second move wait while the first is on its way: the card goes back with the reason", () => {
    const table = spadesInPlay();
    const legal = table.describe().hand.find((held) => held.selectable)!.card.id;
    const play = table.drop(legal, "play");
    expect(play.kind).toBe("press");
    // Nothing pending: the move goes.
    expect(settle(play, false)).toBe(play);
    // One pending: this one is not sent.
    expect(settle(play, true)).toEqual({ kind: "reject", reason: "Wait for the last move" });
    // What changes nothing on the server needs no waiting: putting a card back, staging, a refusal.
    for (const outcome of [{ kind: "none" }, { kind: "select", selection: [legal] }, { kind: "spread", spread: [legal] }, { kind: "reject", reason: "No" }] as Outcome[]) {
      expect(settle(outcome, true)).toBe(outcome);
    }
  });
});

describe("the zone under a held card", () => {
  it("is found from where the card's middle is: the felt anywhere over the table top, the strip my hand lies on first", () => {
    const table = spadesInPlay();
    const zones = table.zones();
    const { reach, rim } = table.frame;
    const felt = zone("play", zones);
    expect(felt).toMatchObject({ round: true, x: 0, z: -reach, halfX: TABLE_RADIUS, label: "Play here" });
    expect(zoneAt(zones, 0, -reach)).toBe("play");
    expect(zoneAt(zones, 0.2, -reach + 0.3)).toBe("play");
    // The near field too: just past my cards, and out to either side.
    expect(zoneAt(zones, 0, -(rim + 0.15))).toBe("play");
    expect(zoneAt(zones, -0.3, -(rim + 0.2))).toBe("play");
    expect(zoneAt(zones, 0.55, -reach + 0.1)).toBe("play");
    // The strip my hand lies on wins where it overlaps the table's edge: a card put down beside the others is not played.
    expect(zoneAt(zones, 0, -(rim - HAND.short))).toBe("hand");
    expect(zoneAt(zones, 0.1, -(rim + 0.05))).toBe("hand");
    // Off the table and behind me: no zone, so the card returns.
    expect(zoneAt(zones, 0.9, -reach)).toBeNull();
    expect(zoneAt(zones, 0, 0.3)).toBeNull();
    expect(zoneAt([], 0, -reach)).toBeNull();
  });

  it("is held on to until the card is 3 cm clear of it, so an edge does not flicker", () => {
    const table = spadesInPlay();
    const zones = table.zones();
    const { reach } = table.frame;
    expect(ZONE_SLACK).toBeCloseTo(0.03);
    // Just off the felt's edge: nothing for a card arriving, still the felt for a card that was over it.
    expect(zoneAt(zones, TABLE_RADIUS + 0.02, -reach)).toBeNull();
    expect(zoneAt(zones, TABLE_RADIUS + 0.02, -reach, "play")).toBe("play");
    expect(zoneAt(zones, TABLE_RADIUS + ZONE_SLACK + 0.01, -reach, "play")).toBeNull();
    // Leaving my hand's strip for the felt beyond it.
    const hand = zone("hand", zones);
    const far = hand.z - hand.halfZ;
    expect(zoneAt(zones, 0, far - 0.01)).toBe("play");
    expect(zoneAt(zones, 0, far - 0.01, "hand")).toBe("hand");
    expect(zoneAt(zones, 0, far - ZONE_SLACK - 0.01, "hand")).toBe("play");
    // Coming back, the strip has the card as soon as its middle is over it.
    expect(zoneAt(zones, 0, far + 0.01, "play")).toBe("hand");
    // A rectangle holds on the same way, on every side.
    const { table: whist } = withKitty();
    const kitty = zone("kitty", whist.zones());
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = kitty.x + dx * (kitty.halfX + 0.02);
      const z = kitty.z + dz * (kitty.halfZ + 0.02);
      expect(zoneAt([kitty], x, z)).toBeNull();
      expect(zoneAt([kitty], x, z, "kitty")).toBe("kitty");
      expect(zoneAt([kitty], kitty.x + dx * (kitty.halfX + 0.04), kitty.z + dz * (kitty.halfZ + 0.04), "kitty")).toBeNull();
    }
  });
});

describe("Bid Whist by hand", () => {
  it("offers the bids and then trump as tokens", () => {
    const { table, passing } = toKitty();
    let tokens = tokenButtons(table.describe());
    expect(tokens.map((button) => button.id)).toContain("bid-pass");
    expect(tokens.filter((button) => /^bid-\d-(high|low|no-trump)$/.test(button.id)).length).toBeGreaterThan(5);
    expect(tokens.every((button) => objectName(button.id) === `token-${button.id}`)).toBe(true);
    // No card can go anywhere while I bid: the felt only says so.
    expect(ids(table.zones())).toEqual(["hand", "wait"]);

    table.press(tokens.find((button) => /^bid-\d-high$/.test(button.id))!);
    table.bots(passing);
    tokens = tokenButtons(table.describe());
    expect(tokens.map((button) => button.id)).toEqual(["declare-spades", "declare-hearts", "declare-clubs", "declare-diamonds"]);
  });

  it("stacks six cards on the kitty one at a time, takes one back, and buries exactly six with the puck", () => {
    const { table, passing } = withKitty();
    const hand = table.describe().hand.map((held) => held.card.id);
    expect(hand).toHaveLength(18);
    expect(ids(table.zones())).toEqual(["kitty", "hand"]);
    expect(tokenButtons(table.describe())).toEqual([]);

    let selection: readonly string[] = [];
    const put = (cardId: string, where: "kitty" | "hand" | "play"): Outcome => {
      const outcome = table.drop(cardId, where, { selection, spread: [] });
      if (outcome.kind === "select") selection = outcome.selection;
      return outcome;
    };
    expect(foresee(table.drop(hand[0], "kitty"), "kitty")).toBe("Put on the kitty");
    for (const cardId of hand.slice(0, 5)) expect(put(cardId, "kitty").kind).toBe("select");
    // The puck is there from the start, struck through, and says why.
    expect(buryButton(table.describe(selection))).toMatchObject({ id: "discard", disabled: true, reason: "Pick exactly six cards (5 picked)" });
    // A card already on the kitty stays put; one dragged back to my hand comes off; another zone does nothing.
    expect(put(hand[0], "kitty")).toEqual({ kind: "none" });
    expect(foresee(table.drop(hand[0], "hand", { selection, spread: [] }), "hand")).toBe("Back to your hand");
    expect(put(hand[0], "hand")).toEqual({ kind: "select", selection: hand.slice(1, 5) });
    expect(put(hand[9], "hand")).toEqual({ kind: "none" });
    expect(put(hand[9], "play")).toEqual({ kind: "none" });
    for (const cardId of hand.slice(5, 7)) expect(put(cardId, "kitty").kind).toBe("select");
    expect(selection).toEqual(hand.slice(1, 7));
    // Six is the limit.
    const full = put(hand[8], "kitty");
    expect(full).toEqual({ kind: "reject", reason: "The kitty already holds 6 cards" });
    expect(foresee(full, "kitty")).toBe("Not allowed: The kitty already holds 6 cards");

    const bury = buryButton(table.describe(selection))!;
    expect(bury.disabled).toBe(false);
    expect(action(bury)).toEqual({ type: "discard", cardIds: hand.slice(1, 7) });
    table.press(bury);
    expect(table.state.phase).toBe("play");
    expect(table.state.hands[2]).toHaveLength(12);
    // Now it is trick play: the felt takes a card, and there is no kitty puck.
    table.bots(passing);
    expect(buryButton(table.describe())).toBeNull();
    expect(ids(table.zones())).toEqual(["hand", "play"]);
    const legal = table.describe().hand.find((held) => held.selectable)!.card.id;
    expect(action(pressed(table.drop(legal, "play")))).toEqual({ type: "play", cardId: legal });
  });
});

describe("Tonk by hand", () => {
  it("draws by the piles, with a drop token at my seat, and tells a held card to draw first", () => {
    const table = toMeld();
    const now = table.describe();
    expect(tableMode(now)).toBe("tonk-draw");
    expect(table.zones().map((entry) => [entry.id, entry.label])).toEqual([
      ["hand", "Your hand"],
      ["wait", "Draw a card first"],
    ]);
    expect(table.drop(now.hand[0].card.id, "wait")).toEqual({ kind: "reject", reason: "Draw a card first" });
    expect(tokenButtons(now).map((button) => objectName(button.id))).toEqual(["token-drop"]);
    expect(now.buttons.find((button) => button.id === "draw-stock")).toMatchObject({ disabled: false });
    // A pile pulled far enough toward me (z grows toward my seat) is drawn; a nudge, or a push away, is not.
    expect(pulled(-0.65, -0.65 + DRAG_COMMIT + 0.001)).toBe(true);
    expect(pulled(-0.65, -0.65 + DRAG_COMMIT / 2)).toBe(false);
    expect(pulled(-0.65, -0.9)).toBe(false);
    // Tokens are the other way: pushed toward the middle.
    expect(pushed(-0.5, -0.5 - DRAG_COMMIT - 0.001)).toBe(true);
    expect(pushed(-0.5, -0.5 - DRAG_COMMIT / 2)).toBe(false);
    expect(pushed(-0.5, -0.4)).toBe(false);
  });

  it("stages a meld on my spread, lays it down with the puck only when it is legal, then adds to it and discards", () => {
    const table = toMeld();
    table.press(table.describe().buttons.find((button) => button.id === "draw-stock")!);
    let now = table.describe();
    expect(tableMode(now)).toBe("tonk-meld");
    expect(ids(table.zones())).toEqual(["discard", "spread", "hand"]);
    expect(tokenButtons(now)).toEqual([]);

    const meld = action(now.buttons.find((button) => button.id === "meld-0")!).cardIds as string[];
    const loose = now.hand.map((held) => held.card.id).find((id) => !now.buttons.some((button) => button.id.startsWith("meld-") && (action(button).cardIds as string[]).includes(id)));

    let spread: readonly string[] = [];
    const stage = (cardId: string, where: "spread" | "hand"): Outcome => {
      const outcome = table.drop(cardId, where, { selection: [], spread });
      if (outcome.kind === "spread") spread = outcome.spread;
      return outcome;
    };
    expect(layButton(now, spread)).toBeNull();
    expect(foresee(table.drop(meld[0], "spread"), "spread")).toBe("Add to your spread");
    expect(stage(meld[0], "spread").kind).toBe("spread");
    expect(stage(meld[0], "spread")).toEqual({ kind: "none" });
    // One card is not a meld yet: the puck stays struck through.
    expect(layButton(now, spread)).toBeNull();
    if (loose) {
      expect(stage(loose, "spread")).toEqual({ kind: "reject", reason: "That card does not make a set or run with these" });
      expect(dropCard(table.describe, { selection: [], spread: [] }, loose, "spread")).toEqual({
        kind: "reject",
        reason: "That card is not in a set or run you can lay down",
      });
    }
    // Dragged back to my hand it leaves the spread; then the whole meld goes down.
    expect(stage(meld[0], "hand")).toEqual({ kind: "spread", spread: [] });
    for (const cardId of meld) expect(stage(cardId, "spread").kind).toBe("spread");
    expect(canStage(now, spread)).toBe(true);
    const lay = layButton(now, spread)!;
    expect(action(lay)).toEqual({ type: "meld", cardIds: meld });
    // The same cards staged in another order are the same meld.
    expect(layButton(now, [...spread].reverse())).toBe(lay);
    table.press(lay);

    now = table.describe();
    // The cards have left my hand, so nothing is staged any more.
    expect(pruneSpread(now, spread)).toEqual([]);
    expect(now.tableCards.melds).toHaveLength(1);
    const rows = meldRows(now, table.frame);
    expect(rows).toHaveLength(1);
    expect(rows[0].cards.map((placed) => placed.card.id)).toEqual(now.tableCards.melds[0].cards.map((card) => card.id));
    // My own melds lie between my spread and the middle; each is a zone a card can be added to.
    const zones = table.zones();
    expect(ids(zones)).toEqual(["meld-0", "discard", "spread", "hand"]);
    expect(zoneAt(zones, rows[0].x, rows[0].z)).toBe("meld-0");
    expect(zones[0].label).toBe(`Add to ${now.tableCards.melds[0].kind}`);

    if (table.live()) {
      const extension = now.buttons.find((button) => button.id.startsWith("extend-0-"));
      const misfit = now.hand.map((held) => held.card.id).find((id) => !now.buttons.some((button) => button.id === `extend-0-${id}`))!;
      expect(table.drop(misfit, "meld-0")).toEqual({ kind: "reject", reason: "That card does not fit there" });
      if (extension) {
        const cardId = action(extension).cardId as string;
        expect(pressed(table.drop(cardId, "meld-0")).id).toBe(extension.id);
      }
      // Dropping a card on the discard pile discards that card and ends my turn.
      const out = now.hand.find((held) => held.selectable)!.card.id;
      const discard = pressed(table.drop(out, "discard"));
      expect(action(discard)).toEqual({ type: "discard", cardId: out });
      table.press(discard);
      expect(table.state.phase === "draw" ? table.state.turn !== table.seat : true).toBe(true);
    }
  });

  it("adds a card to a meld on the table when it is dropped on that meld", () => {
    // Play Tonk hands by the engine's own bot until, on my turn, a card of mine fits a meld on the table.
    for (let seed = 1; seed < 300; seed += 1) {
      const table = bench("tonk", seed);
      for (let turns = 0; turns < 20 && table.live(); turns += 1) {
        table.bots();
        if (!table.live()) break;
        if (table.state.phase === "draw") table.press(table.describe().buttons.find((button) => button.id === "draw-stock" && !button.disabled) ?? table.describe().buttons.find((button) => button.id === "draw-discard")!);
        if (!table.live()) break;
        const now = table.describe();
        const extension = now.buttons.find((button) => button.id.startsWith("extend-"));
        if (!extension) {
          table.state = table.engine.apply(table.state, table.seat, table.engine.chooseAction(table.engine.viewFor(table.state, table.seat)));
          continue;
        }
        const { meldIndex, cardId } = action(extension) as { meldIndex: number; cardId: string };
        const zones = table.zones();
        expect(ids(zones)).toContain(`meld-${meldIndex}`);
        const before = table.state.melds[meldIndex].cards.length;
        const pressedButton = pressed(table.drop(cardId, `meld-${meldIndex}`));
        expect(pressedButton.id).toBe(extension.id);
        table.press(pressedButton);
        expect(table.state.melds[meldIndex].cards).toHaveLength(before + 1);
        return;
      }
    }
    throw new Error("no deal reached a legal extension");
  });

  it("will not discard the card just taken from the discard pile, and says so", () => {
    const table = toMeld();
    const top = table.describe().tableCards.discardTop!;
    table.press(table.describe().buttons.find((button) => button.id === "draw-discard")!);
    expect(table.describe().hand.find((held) => held.card.id === top.id)).toMatchObject({ selectable: false });
    const refused = table.drop(top.id, "discard");
    expect(refused).toEqual({ kind: "reject", reason: "Not the card you just took" });
    expect(foresee(refused, "discard")).toBe("Not allowed: Not the card you just took");
    // Zones of the other games do nothing here.
    expect(table.drop(top.id, "play")).toEqual({ kind: "none" });
    expect(table.drop(top.id, "kitty")).toEqual({ kind: "none" });
  });

  it("gives every seat's melds their own row and zone, clear of my piles, my spread and my hand", () => {
    const table = toMeld();
    table.press(table.describe().buttons.find((button) => button.id === "draw-stock")!);
    const card = (id: string): Card => ({ id, suit: "hearts", rank: 5 });
    const now = table.describe();
    const melds = ([0, 1, 2, 3] as Seat[]).flatMap((seat) => [
      { index: seat * 2, seat, name: `P${seat}`, kind: "set" as const, cards: [card(`a${seat}`), card(`b${seat}`), card(`c${seat}`)] },
      { index: seat * 2 + 1, seat, name: `P${seat}`, kind: "run" as const, cards: [card(`d${seat}`), card(`e${seat}`), card(`f${seat}`), card(`g${seat}`)] },
    ]);
    const crowded = { ...now, tableCards: { ...now.tableCards, melds } };
    const rows = meldRows(crowded, table.frame);
    expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const zones = tableZones(crowded, table.frame);
    const discard = zone("discard", zones);
    const spread = zone("spread", zones);
    const hand = zone("hand", zones);
    const apart = (a: Zone, b: Zone): boolean => Math.abs(a.x - b.x) >= a.halfX + b.halfX - 0.005 || Math.abs(a.z - b.z) >= a.halfZ + b.halfZ - 0.005;
    const mine = [discard, { ...discard, id: "play" as const, x: -discard.x }, spread, hand];
    // The stock is the discard pile's mirror image; none of my own places touches another.
    mine.forEach((a, i) => mine.slice(i + 1).forEach((b) => expect(apart(a, b), `${a.id} ${b.id}`).toBe(true)));
    const meldZones = zones.filter((entry) => entry.id.startsWith("meld-"));
    expect(meldZones).toHaveLength(8);
    for (const entry of meldZones) {
      for (const other of mine) expect(apart(entry, other), `${entry.id} ${other.id}`).toBe(true);
      for (const other of meldZones) if (other !== entry) expect(apart(entry, other), `${entry.id} ${other.id}`).toBe(true);
    }
  });
});

/** The two ends of a token's plate on the floor plan: it is turned by `ry` about the vertical. */
const ends = (cell: TokenGrid["cells"][number], width: number): [number, number][] => {
  const [dx, dz] = [(Math.cos(cell.ry) * width) / 2, (-Math.sin(cell.ry) * width) / 2];
  return [
    [cell.x - dx, cell.z - dz],
    [cell.x + dx, cell.z + dz],
  ];
};
const onTable = (frame: Frame, x: number, z: number): boolean => Math.hypot(x, z + frame.reach) <= TABLE_RADIUS;
const radius = (cell: { x: number; z: number }): number => Math.hypot(cell.x, cell.z);

/** Every token set a seated player meets: the lobby of each game, both games' bids, trump, and Tonk's drop. */
function tokenSets(): { name: string; labels: string[]; frame: Frame }[] {
  const sets: { name: string; labels: string[]; frame: Frame }[] = [];
  const add = (name: string, description: TableDescription, frame: Frame): void => {
    sets.push({ name, labels: tokenButtons(description).map((button) => button.label), frame });
  };
  for (const game of ["spades", "bid-whist", "tonk"] as GameId[]) add(`${game} lobby`, lobby(game), frameFor(tableSpot(TABLE_OF[game]), 0));
  const spades = bench("spades", 3);
  spades.bots();
  add("spades bids", spades.describe(), spades.frame);
  const { table: whist, passing } = toKitty();
  add("bid whist bids", whist.describe(), whist.frame);
  whist.press(tokenButtons(whist.describe()).find((button) => /^bid-\d-high$/.test(button.id))!);
  whist.bots(passing);
  add("bid whist trump", whist.describe(), whist.frame);
  const tonk = toMeld();
  add("tonk drop", tonk.describe(), tonk.frame);
  return sets;
}

describe("tokens and places on the table", () => {
  it("names the lobby tokens as the headset test already knows them, and keeps chairs and the leave marker out", () => {
    const description = lobby("spades");
    const tokens = tokenButtons(description);
    expect(tokens.map((button) => objectName(button.id))).toEqual([
      "ready",
      "token-option-preset",
      "token-option-target",
      "token-option-nil",
      "token-option-bagPenalty",
      "start",
    ]);
    // Start is there but disabled until I am ready: drawn struck through, and it does nothing.
    expect(tokens.at(-1)).toMatchObject({ disabled: true });
    expect(description.buttons.some((button) => button.id === "leave")).toBe(true);
    expect(["unready", "next-hand", "reset"].map(objectName)).toEqual(["unready", "next-hand", "reset"]);
    expect(objectName("drop")).toBe("token-drop");
  });

  it("stands a player's tokens on a rail of arcs about the seat: over the table, turned to the seat, no two touching", () => {
    const sets = tokenSets();
    expect(sets.map((set) => set.labels.length)).toEqual([6, 6, 5, 14, expect.any(Number), 4, 1]);
    for (const { name, labels, frame } of sets) {
      const grid = tokenGrid(labels, frame);
      expect(grid.cells, name).toHaveLength(labels.length);
      // How deep a leaning plate is on the floor plan.
      const depth = grid.height * Math.sin(-TOKEN_LEAN);
      grid.cells.forEach((cell, i) => {
        // Past my cards, over the table top from end to end, and above it.
        expect(radius(cell), `${name} ${i}`).toBeGreaterThan(frame.rim + 0.08);
        for (const [x, z] of [[cell.x, cell.z], ...ends(cell, grid.width)]) expect(onTable(frame, x, z), `${name} ${i}`).toBe(true);
        expect(cell.y - (grid.height / 2) * Math.cos(TOKEN_LEAN), `${name} ${i}`).toBeGreaterThan(TABLE_HEIGHT);
        // Turned about the vertical to face my seat.
        expect(cell.ry, `${name} ${i}`).toBeCloseTo(-Math.atan2(cell.x, -cell.z));
        for (const other of grid.cells.slice(i + 1)) {
          const sameRow = Math.abs(radius(cell) - radius(other)) < 1e-6;
          if (sameRow) expect(Math.hypot(cell.x - other.x, cell.z - other.z), `${name} ${i}`).toBeGreaterThanOrEqual(grid.width);
          else expect(Math.abs(radius(cell) - radius(other)), `${name} ${i}`).toBeGreaterThanOrEqual(depth);
        }
      });
      // Each row stands higher than the one in front of it, so none hides the next.
      const rows = [...new Map(grid.cells.map((cell) => [radius(cell).toFixed(4), cell.y])).entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
      rows.slice(1).forEach(([, y], i) => expect(y, name).toBeGreaterThan(rows[i][1]));
    }
  });

  it("grows the tokens and the rail's steps with the text and button size, and still no two touch and each row stands higher", () => {
    for (const { name, labels, frame } of tokenSets()) {
      const normal = tokenGrid(labels, frame);
      const grid = tokenGrid(labels, frame, 1.6);
      expect(grid.width, name).toBeCloseTo(normal.width * 1.6, 9);
      expect(grid.height, name).toBeCloseTo(normal.height * 1.6, 9);
      expect(grid.cells, name).toHaveLength(labels.length);
      const depth = grid.height * Math.sin(-TOKEN_LEAN);
      grid.cells.forEach((cell, i) => {
        for (const other of grid.cells.slice(i + 1)) {
          const sameRow = Math.abs(radius(cell) - radius(other)) < 1e-6;
          if (frame.stand !== null) expect(Math.hypot(cell.x - other.x, cell.z - other.z), `${name} ${i}`).toBeGreaterThanOrEqual(Math.min(grid.width, depth));
          else if (sameRow) expect(Math.hypot(cell.x - other.x, cell.z - other.z), `${name} ${i}`).toBeGreaterThanOrEqual(grid.width);
          else expect(Math.abs(radius(cell) - radius(other)), `${name} ${i}`).toBeGreaterThanOrEqual(depth);
        }
      });
      if (frame.stand !== null) continue;
      const rows = [...new Map(grid.cells.map((cell) => [radius(cell).toFixed(4), cell.y])).entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
      rows.slice(1).forEach(([, y], i) => expect(y, name).toBeGreaterThan(rows[i][1]));
    }
  });

  it("keeps every token's lower edge above the top of my hand row as my seated eyes see it", () => {
    for (const { name, labels, frame } of tokenSets()) {
      if (frame.stand !== null) continue;
      // How far below level the eye looks to see a point straight ahead of it (the row and the rail both face me).
      const below = (y: number, z: number): number => Math.atan2(EYE_HEIGHT_SEATED - y, -z);
      const card = handFan(1, frame)[0];
      const top = below(card.y + (HAND.card / CARD_ASPECT / 2) * Math.cos(HAND.tilt), card.z + (HAND.card / CARD_ASPECT / 2) * Math.sin(HAND.tilt));
      const grid = tokenGrid(labels, frame);
      for (const cell of grid.cells) {
        const lowY = cell.y - (grid.height / 2) * Math.cos(TOKEN_LEAN);
        const lowZ = cell.z - (grid.height / 2) * Math.sin(TOKEN_LEAN) * Math.cos(cell.ry);
        expect(below(lowY, lowZ), `${name} token at ${cell.x.toFixed(2)}`).toBeLessThan(top);
      }
    }
  });

  it("gives long house-rule labels wider tokens, and short bids narrow ones", () => {
    const frame = frameFor(tableSpot("spades-1"), 0);
    const wide = tokenGrid(
      tokenButtons(lobby("spades")).map((button) => button.label),
      frame,
    );
    const narrow = tokenGrid(["Bid 1", "Bid 2", "Bid 3", "Bid 4", "Bid 5"], frame);
    expect(wide.width).toBeGreaterThan(narrow.width * 2);
    expect(wide.wrapAt).toBeGreaterThan(narrow.wrapAt);
    // The first arc is short: one wide token, or four narrow ones.
    expect(wide.cells.filter((cell) => Math.abs(radius(cell) - radius(wide.cells[0])) < 1e-6)).toHaveLength(1);
    expect(narrow.cells.filter((cell) => Math.abs(radius(cell) - radius(narrow.cells[0])) < 1e-6)).toHaveLength(4);
  });

  it("lays the host's tokens on the dealer's stand, which hides the table from where the host stands", () => {
    const labels = tokenButtons(lobby("spades")).map((button) => button.label);
    const frame = frameFor(tableSpot("spades-1"), 0);
    const host = frameFor(tableSpot("spades-1"), null);
    expect(frame.stand).toBeNull();
    expect(host.stand).toBeGreaterThan(0.3);
    const onStand = tokenGrid(labels, host);
    expect(onStand.cells).toHaveLength(6);
    for (const cell of onStand.cells) {
      expect(Math.hypot(cell.x, cell.z + host.stand!)).toBeLessThan(STAND_RADIUS);
      expect(cell.y).toBeCloseTo(standing(onStand.height, TOKEN_LEAN, STAND_TOP));
      expect(cell.ry).toBe(0);
    }
    onStand.cells.forEach((cell, i) => {
      for (const other of onStand.cells.slice(i + 1)) expect(Math.abs(cell.x - other.x) >= onStand.width || Math.abs(cell.z - other.z) >= onStand.height).toBe(true);
    });
    // The host's piles stay in the middle of the table; a player's come to the near field.
    expect(pileSpot(host).z).toBeCloseTo(-host.reach);
    expect(pileSpot(frame).z).toBeGreaterThan(-frame.reach + 0.3);
  });

  it("lays staged cards in a row centred on their zone, each a hair nearer than the last", () => {
    const row = stagedRow(6, 0, -0.55);
    expect(row).toHaveLength(6);
    expect(row[0].x).toBeCloseTo(-row[5].x);
    expect(row[5].z).toBeGreaterThan(row[0].z);
  });
});

describe("my hand", () => {
  const frame = frameFor(tableSpot("bid-whist-1"), 2);
  const height = HAND.card / CARD_ASPECT;
  // A card's own "up" and the way its face looks, in my seat's frame: it lies back by HAND.tilt about the x axis.
  const up = [0, Math.cos(HAND.tilt), Math.sin(HAND.tilt)];
  const out = [0, -Math.sin(HAND.tilt), Math.cos(HAND.tilt)];

  /** How far a point is from a card's face: what the library's grab sphere measures (intersections/sphere.js). */
  function gap(point: number[], card: { x: number; y: number; z: number }): number {
    const d = [point[0] - card.x, point[1] - card.y, point[2] - card.z];
    const clamp = (value: number, half: number): number => Math.max(-half, Math.min(half, value));
    const across = clamp(d[0], HAND.card / 2);
    const along = clamp(d[1] * up[1] + d[2] * up[2], height / 2);
    return Math.hypot(d[0] - across, d[1] - along * up[1], d[2] - along * up[2]);
  }

  it("is one row just short of the table's edge, facing my eyes, never wider than its strip", () => {
    expect(frame.reach).toBeCloseTo(1.05);
    expect(frame.rim).toBeCloseTo(0.4);
    const strip = zone("hand", withKitty().table.zones());
    for (const count of [1, 5, 13, 18]) {
      const fan = handFan(count, frame);
      expect(fan).toHaveLength(count);
      expect(fan[0].x).toBeCloseTo(-fan[count - 1].x);
      for (const card of fan) {
        // Short of the edge, above the table, inside the strip a card is put back on.
        expect(card.z).toBeGreaterThan(-frame.rim);
        expect(card.y - (height / 2) * Math.cos(HAND.tilt)).toBeGreaterThan(TABLE_HEIGHT);
        expect(zoneAt([strip], card.x, card.z)).toBe("hand");
      }
      // The faces look up at my eyes, not at the ceiling or the far wall.
      const toEyes = [0 - fan[0].x, EYE_HEIGHT_SEATED - fan[0].y, 0 - fan[0].z];
      const cos = (toEyes[1] * out[1] + toEyes[2] * out[2]) / Math.hypot(...toEyes);
      expect(cos).toBeGreaterThan(0.7);
    }
    // Every card's index corner shows: no card sits closer to the next than HAND.tight.
    const packed = handFan(18, frame);
    expect(packed[1].x - packed[0].x).toBeGreaterThanOrEqual(HAND.tight);
    // Small hands are not spread thin.
    const few = handFan(5, frame);
    expect(few[1].x - few[0].x).toBeCloseTo(HAND.step);
  });

  it("gives a reaching hand the card whose face shows under it, with no tie, in a hand of any size", () => {
    for (const count of [1, 5, 13, 18]) {
      const fan = handFan(count, frame);
      const step = count > 1 ? fan[1].x - fan[0].x : HAND.card;
      fan.forEach((card, i) => {
        // The part of a card that shows is its left edge, up to where the next card begins; the last card shows whole.
        const shows = i === count - 1 ? HAND.card : step;
        const x = card.x - HAND.card / 2 + shows / 2;
        // A hand anywhere in front of that part, from touching it to the edge of its grab sphere.
        for (const off of [0.002, 0.03, 0.06, GRAB_RADIUS - 0.005]) {
          for (const rise of [-0.3, 0, 0.3]) {
            const point = [x, card.y + rise * height * up[1] + off * out[1], card.z + rise * height * up[2] + off * out[2]];
            const gaps = fan.map((other) => gap(point, other));
            const nearest = Math.min(...gaps);
            expect(gaps.indexOf(nearest), `${count} cards, card ${i}, ${off} m off`).toBe(i);
            expect(nearest).toBeLessThan(GRAB_RADIUS);
            // Clear of every other card by more than rounding.
            expect(gaps.filter((other) => other < nearest + 0.0005), `${count} cards, card ${i}, ${off} m off`).toHaveLength(1);
          }
        }
      });
    }
  });
});

describe("reach: a seated arm gets to everything it handles", () => {
  const frame = frameFor(tableSpot("tonk-1"), 1);
  const reaches = (x: number, y: number, z: number, what: string): void => expect(withinReach(x, y, z), `${what} at ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`).toBe(true);

  it("measures 0.7 m from a point 0.25 m below the seated eyes", () => {
    expect(ARM).toEqual({ reach: 0.7, below: 0.25 });
    const shoulder = EYE_HEIGHT_SEATED - 0.25;
    expect(withinReach(0, shoulder, -0.7)).toBe(true);
    expect(withinReach(0, shoulder, -0.71)).toBe(false);
    expect(withinReach(0.5, shoulder, -0.5)).toBe(false);
    expect(withinReach(0, shoulder - 0.7, 0)).toBe(true);
    // The middle of the table is out of reach: nothing a player handles lies there.
    expect(frame.reach).toBeCloseTo(1.05);
    expect(withinReach(0, TABLE_HEIGHT, -frame.reach)).toBe(false);
  });

  it("every card of my hand, up to Bid Whist's eighteen", () => {
    for (let count = 1; count <= 18; count += 1) handFan(count, frame).forEach((card, i) => reaches(card.x, card.y, card.z, `card ${i} of ${count}`));
  });

  it("every token of every set a player meets", () => {
    for (const { name, labels, frame: at } of tokenSets()) {
      tokenGrid(labels, at).cells.forEach((cell, i) => reaches(cell.x, cell.y, cell.z, `${name} token ${i}`));
    }
  });

  it("the kitty, my spread, the discard pile, their pucks, Tonk's piles and the leave marker", () => {
    const { table: whist } = withKitty();
    const kitty = zone("kitty", whist.zones());
    const tonk = toMeld();
    tonk.press(tonk.describe().buttons.find((button) => button.id === "draw-stock")!);
    const zones = tonk.zones();
    // A card is put on a zone by bringing its middle over it, a little above the felt.
    for (const entry of [kitty, zone("spread", zones), zone("discard", zones)]) {
      reaches(entry.x, TABLE_HEIGHT + 0.05, entry.z, `zone ${entry.id}`);
      expect(onTable(frame, entry.x - entry.halfX, entry.z - entry.halfZ) && onTable(frame, entry.x + entry.halfX, entry.z - entry.halfZ), entry.id).toBe(true);
    }
    for (const entry of [kitty, zone("spread", zones)]) {
      const puck = puckSpot(entry);
      reaches(puck.x, TABLE_HEIGHT + 0.013, puck.z, `puck of ${entry.id}`);
      expect(onTable(frame, puck.x + 0.05, puck.z)).toBe(true);
      // Beside its zone, not on it.
      expect(puck.x - 0.05).toBeGreaterThanOrEqual(entry.x + entry.halfX);
    }
    const pile = pileSpot(tonk.frame);
    const pileY = standing(0.09 / CARD_ASPECT);
    reaches(pile.x, pileY, pile.z, "discard pile");
    reaches(-pile.x, pileY, pile.z, "stock");
    // The discard zone is the place the pile stands.
    expect(zoneAt(zones, pile.x, pile.z)).toBe("discard");
    for (const side of [-1, 1]) reaches(...leaveSpot(side), "leave marker");
  });

  it("the felt: past my cards there is table within reach to play a card on", () => {
    const table = spadesInPlay();
    const zones = table.zones();
    const { rim } = table.frame;
    for (const [x, z] of [[0, -(rim + 0.12)], [0, -(rim + 0.24)], [-0.3, -(rim + 0.15)], [0.3, -(rim + 0.15)]]) {
      reaches(x, TABLE_HEIGHT + 0.05, z, "felt");
      expect(zoneAt(zones, x, z)).toBe("play");
    }
  });

  it("but not Tonk's melds, which lie on their owners' sides: those take a picked card by a ray or the mouse", () => {
    const tonk = toMeld();
    tonk.press(tonk.describe().buttons.find((button) => button.id === "draw-stock")!);
    const now = tonk.describe();
    const card = (id: string): Card => ({ id, suit: "hearts", rank: 5 });
    const melds = ([0, 1, 2, 3] as Seat[]).map((seat) => ({ index: seat, seat, name: `P${seat}`, kind: "set" as const, cards: [card(`a${seat}`), card(`b${seat}`), card(`c${seat}`)] }));
    for (const row of meldRows({ ...now, tableCards: { ...now.tableCards, melds } }, tonk.frame)) {
      expect(withinReach(row.x, TABLE_HEIGHT + 0.05, row.z), `meld ${row.index}`).toBe(false);
    }
  });
});

describe("a held card and the table top", () => {
  it("may go no lower than the felt over the table, and as low as it likes past the edge", () => {
    const frame = frameFor(tableSpot("spades-1"), 0);
    const top = feltFloor(frame, 0, -frame.reach);
    expect(top).toBeGreaterThan(TABLE_HEIGHT);
    expect(top).toBeLessThan(TABLE_HEIGHT + 0.01);
    // The same height all over the table top.
    expect(feltFloor(frame, 0.3, -frame.reach + 0.4)).toBe(top);
    expect(feltFloor(frame, 0, -(frame.rim + 0.001))).toBeCloseTo(top, 2);
    // Past the edge it falls away, steadily, so a card coming up from my lap rides over the rim and does not jump.
    const a = feltFloor(frame, 0, -(frame.rim - 0.05));
    const b = feltFloor(frame, 0, -(frame.rim - 0.1));
    expect(a).toBeLessThan(top - 0.3);
    expect(b).toBeLessThan(a);
    expect(feltFloor(frame, 0, 0)).toBeLessThan(0);
  });
});
