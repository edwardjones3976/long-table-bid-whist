/**
 * Cards handled with both controllers of an emulated headset (tests/e2e/headset.ts): grip and trigger, each hand on
 * its own, against bots. Every move is checked against what the server says (window.__mansion.getState()), what each
 * pointer holds (carried()), and which hand each cue and buzz went to (cues(), and the pulses the emulator's
 * actuators were sent). It says nothing about how any of it feels in a real headset.
 */
import { expect, test, type Page } from "@playwright/test";
import { closeAll, problems, still, tableOf } from "./helpers";
import {
  aim,
  apart,
  button,
  carried,
  carryOver,
  click,
  connect,
  distance,
  enterHeadset,
  feedbackFrom,
  frames,
  gripOn,
  moveBy,
  myTurn,
  park,
  pull,
  rayPress,
  readyAndStart,
  sitWithRay,
  startTrace,
  stick,
  stopTrace,
  where,
  type CueEntry,
  type Drawn,
  type Pulse,
  type Side,
} from "./headset";

test.beforeEach(() => void (problems.length = 0));

const SPADES = { x: -16, z: -4.5 };
const TONK = { x: -16, z: 13.5 };

/** The buzz each moment sends (client/src/controls/feedback.ts): strength. */
const GRAB = 0.5;
const PLACE = 0.8;
const REFUSE = 0.4;

/** The cards picked by a tap (the local selection). */
const picked = (page: Page): Promise<readonly string[]> => page.evaluate(() => window.__mansion.local.getState().selection);

const view = <T>(page: Page, read: (view: Record<string, unknown>) => T): Promise<T> =>
  page.evaluate(`(${read.toString()})(window.__mansion.getState().table.view)`) as Promise<T>;

/** Every cue and buzz went to `hand`, never the other one, and these moments are among them. */
function onlyTo(hand: Side, given: { cues: CueEntry[]; pulses: Pulse[] }, moments: string[], strengths: number[]): void {
  const other = hand === "left" ? "right" : "left";
  expect(given.cues.filter((c) => c.hand === other)).toEqual([]);
  expect(given.pulses.filter((p) => p.hand === other)).toEqual([]);
  for (const moment of moments) expect(given.cues.filter((c) => c.hand === hand).map((c) => c.cue)).toContain(moment);
  for (const strength of strengths) expect(given.pulses.map((p) => p.value)).toContain(strength);
}

/** The largest change over a run of drawn frames in how far a held thing is from the grip that holds it. */
function slip(trace: Drawn[], hand: Side): number {
  const gaps = trace.map((row) => apart(row.things[0], row.grips[hand]));
  return Math.max(...gaps) - Math.min(...gaps);
}

/** Squeezes the grip on a hand card, carries it over the felt and lets go: the server must show it played. */
async function gripPlay(page: Page, hand: Side, card: string, before: { hand: string[] }): Promise<void> {
  const name = `card-${card}`;
  await gripOn(page, hand, name);
  const feedback = await feedbackFrom(page);
  const rest = await where(page, name);
  await button(page, hand, "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: name, hand, how: "grip" })]);
  // Taken where it lay: no jump to the hand.
  expect(apart(await where(page, name), rest)).toBeLessThan(0.02);
  // Held still, it stays exactly with the hand, frame after frame.
  await startTrace(page, [name]);
  await frames(page, 6);
  const steady = await stopTrace(page);
  expect(slip(steady, hand)).toBeLessThan(0.001);
  expect(Math.max(...steady.map((row) => apart(row.things[0], steady[0].things[0])))).toBeLessThan(0.001);

  await carryOver(page, hand, name, "zone-play");
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: name, hand, carrying: true, over: "play" })]);
  await button(page, hand, "squeeze", 0);
  await expect.poll(() => tableOf(page).then((t) => t!.hand.includes(card))).toBe(false);
  expect(await view(page, (v) => JSON.stringify([v.trick, v.lastTrick]))).toContain(card);
  expect((await tableOf(page))!.hand.length).toBe(before.hand.length - 1);
  expect(await carried(page)).toEqual([]);
  onlyTo(hand, await feedback(), ["grab", "place"], [GRAB, PLACE]);
  await park(page, hand);
}

/** Holds the trigger on a hand card from `back` metres: the card comes to that hand; carried over the felt and let go, it is played. */
async function farPlay(page: Page, hand: Side, card: string, before: { hand: string[] }): Promise<void> {
  const name = `card-${card}`;
  await aim(page, hand, name, 0.6);
  const feedback = await feedbackFrom(page);
  await button(page, hand, "trigger", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: name, hand, how: "ray", carrying: true })]);
  // It has come to the hand: a quarter of a metre down the ray, about 0.3 m from the grip behind the ray's start.
  await still(page, name);
  const near = (await distance(page, hand, name))!;
  expect(near).toBeGreaterThan(0.25);
  expect(near).toBeLessThan(0.35);
  await carryOver(page, hand, name, "zone-play");
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: name, over: "play" })]);
  await button(page, hand, "trigger", 0);
  await expect.poll(() => tableOf(page).then((t) => t!.hand.includes(card))).toBe(false);
  expect(await view(page, (v) => JSON.stringify([v.trick, v.lastTrick]))).toContain(card);
  expect((await tableOf(page))!.hand.length).toBe(before.hand.length - 1);
  expect(await carried(page)).toEqual([]);
  onlyTo(hand, await feedback(), ["grab", "place"], [GRAB, PLACE]);
  await park(page, hand);
}

test("spades in a headset: each hand bids by ray, plays by grip and by a far trigger grab; grip and trigger together are one grab; every cue goes to the hand that acted", async ({ browser }) => {
  test.setTimeout(420_000);
  const page = await enterHeadset(browser, "Hands");
  await sitWithRay(page, SPADES, "right");
  await readyAndStart(page, "spades-1", "left", "right");

  // Bidding. The right grip on a card while that hand's ray runs through a bid token, grip and trigger squeezed in the
  // same frame: one grab, the card's, and the token is not pressed.
  let table = await myTurn(page, "bidding");
  const bids = table.legal!.bids as number[];
  const bid = bids.includes(3) ? 3 : bids[0];
  const middle = table.hand[Math.floor(table.hand.length / 2)];
  expect(await gripOn(page, "right", `card-${middle}`, `token-bid-${bid}`)).toBeLessThan(0.005);
  let feedback = await feedbackFrom(page);
  await page.evaluate(() => {
    const hs = (window as unknown as { __hs: { button(h: string, id: string, v: number): void } }).__hs;
    hs.button("right", "trigger", 1);
    hs.button("right", "squeeze", 1);
  });
  await frames(page, 4);
  expect(await carried(page)).toEqual([expect.objectContaining({ thing: `card-${middle}`, hand: "right", how: "grip" })]);
  await page.evaluate(() => {
    const hs = (window as unknown as { __hs: { button(h: string, id: string, v: number): void } }).__hs;
    hs.button("right", "trigger", 0);
    hs.button("right", "squeeze", 0);
  });
  await frames(page, 4);
  await page.waitForTimeout(1000);
  expect(await carried(page)).toEqual([]);
  let now = (await tableOf(page))!;
  expect(now.revision).toBe(table.revision);
  expect(await view(page, (v) => (v.bids as (number | null)[])[0])).toBeNull();
  let given = await feedback();
  expect(given.cues.filter((c) => c.cue === "grab")).toEqual([expect.objectContaining({ hand: "right" })]);
  expect(given.cues.filter((c) => c.cue === "place")).toEqual([]);
  expect(await picked(page)).toEqual([]);
  await park(page, "right");

  // The left hand's ray bids.
  feedback = await feedbackFrom(page);
  await rayPress(page, "left", `token-bid-${bid}`);
  await expect.poll(() => view(page, (v) => (v.bids as (number | null)[])[0])).toBe(bid);
  onlyTo("left", await feedback(), ["place"], [PLACE]);
  await park(page, "left");

  // A grip squeezed and let go in place is no tap: twice on a legal card, and it is neither picked nor played.
  table = await myTurn(page, "play");
  const kept = `card-${(table.legal!.cardIds as string[])[0]}`;
  for (let i = 0; i < 2; i += 1) {
    await gripOn(page, "right", kept);
    await button(page, "right", "squeeze", 1);
    await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: kept, hand: "right", how: "grip", carrying: false })]);
    await button(page, "right", "squeeze", 0);
    await frames(page, 4);
    await page.waitForTimeout(600);
    expect(await carried(page)).toEqual([]);
    expect(await picked(page)).toEqual([]);
    now = (await tableOf(page))!;
    expect(now.revision).toBe(table.revision);
    expect(now.hand).toEqual(table.hand);
  }
  await park(page, "right");
  // B puts back only what a hand carries: a card picked by the ray stays picked.
  await rayPress(page, "left", kept);
  await expect.poll(() => picked(page)).toEqual([kept.slice(5)]);
  await park(page, "left");
  await click(page, "right", "b-button");
  await frames(page, 4);
  expect(await picked(page)).toEqual([kept.slice(5)]);
  expect((await tableOf(page))!.revision).toBe(table.revision);
  await page.evaluate(() => window.__mansion.local.set({ selection: [] }));

  // Play: a grip with each hand.
  for (const hand of ["left", "right"] as const) {
    table = await myTurn(page, "play");
    await gripPlay(page, hand, (table.legal!.cardIds as string[])[0], table);
  }
  // Play: a far trigger grab with each hand.
  for (const hand of ["right", "left"] as const) {
    table = await myTurn(page, "play");
    await farPlay(page, hand, (table.legal!.cardIds as string[])[0], table);
  }

  // Turning in the seat with a card in the hand: the card turns with the hand in the same frame, never a frame behind.
  table = await myTurn(page, "play");
  const card = `card-${table.hand[0]}`;
  await gripOn(page, "left", card);
  await button(page, "left", "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: card, hand: "left" })]);
  await startTrace(page, [card]);
  await stick(page, "right", 1, 0);
  await frames(page, 4);
  await stick(page, "right", 0, 0);
  await frames(page, 4);
  await stick(page, "right", -1, 0);
  await frames(page, 4);
  await stick(page, "right", 0, 0);
  await frames(page, 4);
  const turning = await stopTrace(page);
  expect(Math.max(...turning.map((row) => row.rig.ry)) - Math.min(...turning.map((row) => row.rig.ry))).toBeGreaterThan(0.4);
  expect(slip(turning, "left")).toBeLessThan(0.002);
  now = (await tableOf(page))!;
  await button(page, "left", "squeeze", 0);
  await frames(page, 4);
  expect((await tableOf(page))!.hand).toEqual(now.hand);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

const HOVER = 0.15;

/** Grips the stock with one hand and pulls it toward me: the server deals me its top card. */
async function pullStock(page: Page, hand: Side, before: { hand: string[] }): Promise<void> {
  const feedback = await feedbackFrom(page);
  await gripOn(page, hand, "pile-stock");
  await button(page, hand, "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: "pile-stock", hand, how: "grip" })]);
  await pull(page, hand, 0.15);
  await button(page, hand, "squeeze", 0);
  await expect.poll(() => tableOf(page).then((t) => t!.hand.length)).toBe(before.hand.length + 1);
  expect(await carried(page)).toEqual([]);
  onlyTo(hand, await feedback(), ["hover", "grab", "place"], [HOVER, GRAB, PLACE]);
  await park(page, hand);
}

/** Lets the grip go and waits past the 1.5 s a placed card waits for the server: nothing more may happen. */
async function letGoQuietly(page: Page, hand: Side): Promise<void> {
  await button(page, hand, "squeeze", 0);
  await frames(page, 3);
  await page.waitForTimeout(1600);
}

test("tonk in a headset: a card in each hand at once, let go away from the table, B puts back, a controller switched off while carrying puts its card back", async ({ browser }) => {
  test.setTimeout(420_000);
  const page = await enterHeadset(browser, "Twohands");
  await sitWithRay(page, TONK, "left");
  await readyAndStart(page, "tonk-1", "right", "left");

  // Draw: the left grip pulls the stock toward me.
  let table = await myTurn(page, "draw");
  await pullStock(page, "left", table);

  // A card in each hand. The left takes one and lifts it toward me, clear of the row; the right takes another.
  table = await myTurn(page, "meld");
  const b = (table.legal!.discardIds as string[])[0];
  const a = table.hand.find((id) => id !== b)!;
  const [cardA, cardB] = [`card-${a}`, `card-${b}`];
  const homeA = await where(page, cardA);
  let feedback = await feedbackFrom(page);
  await gripOn(page, "left", cardA);
  await button(page, "left", "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: cardA, hand: "left", how: "grip" })]);
  await pull(page, "left", 0.35, 7);
  await moveBy(page, "left", [0, 0.1, 0]);
  await frames(page, 3);
  onlyTo("left", await feedback(), ["hover", "grab"], [HOVER, GRAB]);

  feedback = await feedbackFrom(page);
  await gripOn(page, "right", cardB);
  await button(page, "right", "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ thing: cardA, hand: "left", carrying: true, over: null }),
      expect.objectContaining({ thing: cardB, hand: "right", how: "grip" }),
    ]),
  );
  expect(await carried(page)).toHaveLength(2);
  onlyTo("right", await feedback(), ["grab"], [GRAB]);

  // Independent: the right carries its card to the discard pile while the left's card stays exactly where the left hand is.
  await startTrace(page, [cardA, cardB]);
  await carryOver(page, "right", cardB, "zone-discard");
  const both = await stopTrace(page);
  const aSteps = both.map((row) => apart(row.things[0], both[0].things[0]));
  expect(Math.max(...aSteps)).toBeLessThan(0.001);
  expect(Math.max(...both.map((row) => apart(row.grips.left, both[0].grips.left)))).toBeLessThan(0.001);
  expect(apart(both.at(-1)!.things[1], both[0].things[1])).toBeGreaterThan(0.1);
  expect(Math.max(...both.map((row) => apart(row.things[1], row.grips.right))) - Math.min(...both.map((row) => apart(row.things[1], row.grips.right)))).toBeLessThan(0.001);
  await expect.poll(() => carried(page)).toEqual(
    expect.arrayContaining([expect.objectContaining({ thing: cardA, over: null }), expect.objectContaining({ thing: cardB, hand: "right", carrying: true, over: "discard" })]),
  );

  // The left lets go away from the table: its card goes home, nothing is sent, and the right still has its card.
  const revision = table.revision;
  feedback = await feedbackFrom(page);
  const heldB = (await distance(page, "right", cardB))!;
  await letGoQuietly(page, "left");
  expect(await carried(page)).toEqual([expect.objectContaining({ thing: cardB, hand: "right", carrying: true, over: "discard" })]);
  expect(Math.abs((await distance(page, "right", cardB))! - heldB)).toBeLessThan(0.001);
  await still(page, cardA);
  expect(apart(await where(page, cardA), homeA)).toBeLessThan(0.02);
  let now = (await tableOf(page))!;
  expect(now.revision).toBe(revision);
  expect(now.hand).toEqual(table.hand);
  onlyTo("left", await feedback(), ["refuse"], [REFUSE]);
  await park(page, "left");

  // B, with the right's card over the discard pile: it goes home and nothing is discarded, then or when the grip is let go.
  feedback = await feedbackFrom(page);
  await click(page, "right", "b-button");
  await expect.poll(() => carried(page)).toEqual([]);
  await letGoQuietly(page, "right");
  await still(page, cardB);
  now = (await tableOf(page))!;
  expect(now.revision).toBe(revision);
  expect(now.hand).toEqual(table.hand);
  onlyTo("right", await feedback(), ["refuse"], [REFUSE]);
  await park(page, "right");

  // And the right discards it for real.
  feedback = await feedbackFrom(page);
  await gripOn(page, "right", cardB);
  await button(page, "right", "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: cardB, hand: "right" })]);
  await carryOver(page, "right", cardB, "zone-discard");
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: cardB, over: "discard" })]);
  await button(page, "right", "squeeze", 0);
  await expect.poll(() => tableOf(page).then((t) => t!.hand.includes(b))).toBe(false);
  expect(await view(page, (v) => JSON.stringify(v.discards))).toContain(b);
  expect((await tableOf(page))!.hand.length).toBe(table.hand.length - 1);
  onlyTo("right", await feedback(), ["grab", "place"], [GRAB, PLACE]);
  await park(page, "right");

  // Next turn: draw with a quick press of the right trigger on the stock.
  table = await myTurn(page, "draw");
  await rayPress(page, "right", "pile-stock");
  await expect.poll(() => tableOf(page).then((t) => t!.hand.length)).toBe(table.hand.length + 1);
  await park(page, "right");

  // The left carries a card over the discard pile and switches off, grip still squeezed: the card goes home, unplayed.
  table = await myTurn(page, "meld");
  const c = (table.legal!.discardIds as string[])[0];
  const cardC = `card-${c}`;
  feedback = await feedbackFrom(page);
  await gripOn(page, "left", cardC);
  await button(page, "left", "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: cardC, hand: "left" })]);
  await carryOver(page, "left", cardC, "zone-discard");
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: cardC, over: "discard" })]);
  await connect(page, "left", false);
  await expect.poll(() => carried(page)).toEqual([]);
  await frames(page, 3);
  await page.waitForTimeout(1600);
  await still(page, cardC);
  now = (await tableOf(page))!;
  expect(now.revision).toBe(table.revision);
  expect(now.hand).toEqual(table.hand);
  expect((await feedback()).cues.filter((entry) => entry.cue === "place")).toEqual([]);

  // The other hand's next grab works: the right discards that card.
  feedback = await feedbackFrom(page);
  await gripOn(page, "right", cardC);
  await button(page, "right", "squeeze", 1);
  await expect.poll(() => carried(page)).toEqual([expect.objectContaining({ thing: cardC, hand: "right" })]);
  await carryOver(page, "right", cardC, "zone-discard");
  await button(page, "right", "squeeze", 0);
  await expect.poll(() => tableOf(page).then((t) => t!.hand.includes(c))).toBe(false);
  expect(await view(page, (v) => JSON.stringify(v.discards))).toContain(c);
  onlyTo("right", await feedback(), ["grab", "place"], [GRAB, PLACE]);
  await park(page, "right");

  // Switched on again (its grip let go while it was off), the left draws on my next turn as before.
  await button(page, "left", "squeeze", 0);
  await park(page, "left");
  await connect(page, "left", true);
  await frames(page, 3);
  table = await myTurn(page, "draw");
  await pullStock(page, "left", table);

  await closeAll([page]);
  expect(problems).toEqual([]);
});
