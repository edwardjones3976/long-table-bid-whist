/**
 * Direct card handling, as decisions: what is on the table to drop a card on,
 * where my own things lie so that a seated arm reaches them, and which of
 * describeTable's buttons a drop, a pulled pile or a pushed token presses.
 * Pure, and free of three.js: the 3D table (AtTable.tsx) only draws what this
 * says and measures where a thing was let go.
 *
 * No rules live here. What is legal comes from the description's buttons and
 * `hand[].selectable`, which come from the server's own `view.legal`.
 *
 * Positions are in my seat's frame: x to my right, y up from the house floor,
 * z toward me (so the table centre is at z = -reach and everything on the
 * table has negative z). My eyes are over the origin.
 *
 * Reach. A card table is 0.65 m in radius and its middle is 1.05 m from my
 * seat, further than an arm. So everything a seated player handles lies in the
 * near field, inside ARM: my hand just short of the table's edge, the drop
 * zones and Tonk's piles on the felt in two rows beyond it, tokens on a
 * stepped rail of short arcs about my seat. The felt itself takes a played
 * card anywhere over the table top. Only Tonk's melds lie out of reach, on
 * their owners' sides: a card is added to one by picking the card (a tap) and
 * then pressing the meld with a ray or the mouse.
 *
 *   frameFor(spot, seat)                  my seat's frame at a table
 *   standSpot(spot)                       where the dealer's stand is (the host's marker and tokens go on it)
 *   tableMode(description)                what my hand can do now
 *   handFan(count, frame)                 where the cards of my hand lie
 *   tableZones(description, frame)        the drop zones, most specific first
 *   zoneAt(zones, x, z, current)          the zone a held card is over (with a little hold at the edges)
 *   dropCard(describe, staging, id, zone) what letting it go there does; foresee() says it in words; settle() makes it wait its turn
 *   layButton / buryButton                the buttons behind the two pucks
 *   tokenButtons / tokenGrid / objectName the choices laid out as tokens
 *   withinReach(x, y, z)                  whether a seated arm gets there
 *   feltTrick(cards)                      the plays on the felt: the trick, or the one just won until the next lead
 */
import type { Card } from "../../../shared/cards";
import type { TableButton, TableCards, TableDescription } from "../ui/actions";
import { EYE_HEIGHT_SEATED, TABLE_HEIGHT, TABLE_RADIUS, type TableSpot } from "../world/layout";

/** describeTable() for the table as it is now, with these cards picked. */
export type Describe = (selection: readonly string[]) => TableDescription;

/** What my hand cards can do: play to a trick, go to the kitty, Tonk's meld-and-discard, Tonk's draw, or nothing. */
export type Mode = "play" | "kitty" | "tonk-meld" | "tonk-draw" | "idle";
/** "wait" is the felt while my cards can go nowhere: it only says why. */
export type ZoneId = "play" | "wait" | "discard" | "kitty" | "spread" | "hand" | `meld-${number}`;

export interface Frame {
  /** My seat to the table centre. */
  reach: number;
  /** My seat to the near edge of the table. */
  rim: number;
  /** Where a seat is round the table from me: 0 is my own side, turning to my right. */
  seatAngle: (seat: number) => number;
  /** For the host only: how far ahead the middle of the dealer's stand is. The stand hides the table from there, so the host's tokens lie on it. */
  stand: number | null;
}

// shortcut: where the dealer's stand is and how big its top is are copied from world/plan.ts (tableFurniture), which
// keeps them to itself; export them from there and use them here if the stand ever moves.
const STAND_ALONG = 0.28;
export const STAND_TOP = 1.02;
export const STAND_RADIUS = 0.21;

/** Where the middle of a table's dealer's stand is on the floor plan: between the host's place and the table. */
export function standSpot(spot: TableSpot): { x: number; z: number } {
  return { x: spot.host.x + (spot.x - spot.host.x) * STAND_ALONG, z: spot.host.z + (spot.z - spot.host.z) * STAND_ALONG };
}

/** The frame of the player in `seat`, or of the standing host when `seat` is null. */
export function frameFor(spot: TableSpot, seat: number | null): Frame {
  const viewer = seat === null ? spot.host : spot.seats[seat];
  const reach = Math.hypot(viewer.x - spot.x, viewer.z - spot.z);
  return { reach, rim: reach - TABLE_RADIUS, seatAngle: (other) => spot.seats[other].ry - viewer.ry, stand: seat === null ? reach * STAND_ALONG : null };
}

/** Comfortable reach from a seat: within `reach` of a point `below` the seated eyes. */
export const ARM = { reach: 0.7, below: 0.25 } as const;

/** Whether a seated arm gets to this point of my seat's frame without leaning. */
export function withinReach(x: number, y: number, z: number): boolean {
  return Math.hypot(x, y - (EYE_HEIGHT_SEATED - ARM.below), z) <= ARM.reach;
}

/** How far public cards and plates lean back from upright, so a seated viewer reads them; tokens lean further. */
export const LEAN = -0.9;
export const TOKEN_LEAN = -1.05;

/** Height of the middle of a plate or card `tall` high leaning at `lean`, standing on the table (or on a surface at `floor`). */
export const standing = (tall: number, lean = LEAN, floor = TABLE_HEIGHT): number => floor + 0.01 + (tall / 2) * Math.cos(lean);

/**
 * The lowest a held card may go at (x, z): the table top over the table, falling steeply away past its edge, so a
 * card brought in from below the rim rides up over the edge and never jumps.
 */
export function feltFloor(frame: Frame, x: number, z: number): number {
  return TABLE_HEIGHT + 0.004 - Math.max(0, Math.hypot(x, z + frame.reach) - TABLE_RADIUS) * 8;
}

export interface Zone {
  id: ZoneId;
  /** The word shown with the outline, so the cue is never the colour alone. */
  label: string;
  x: number;
  z: number;
  /** Half the width, or the radius of a round zone. */
  halfX: number;
  halfZ: number;
  round: boolean;
}

export type Outcome =
  | { kind: "press"; button: TableButton }
  /** The shared pick list (state/local selection) becomes this: Bid Whist's kitty pile. */
  | { kind: "select"; selection: string[] }
  /** The cards staged on "Your spread" become this. */
  | { kind: "spread"; spread: string[] }
  /** Not allowed: the card goes back to the hand and `reason` is shown beside it. */
  | { kind: "reject"; reason: string }
  | { kind: "none" };

export interface Staging {
  /** Cards on the kitty spot (the shared selection). */
  selection: readonly string[];
  /** Cards on "Your spread". */
  spread: readonly string[];
}

/** A press let go within this distance of where it began is a tap, not a drag (metres). */
export const TAP_SLOP = 0.03;
/** A pile pulled this far toward me is drawn; a token pushed this far toward the centre is chosen. */
export const DRAG_COMMIT = 0.08;
/** A held card stays "over" the zone it is over until it is this far outside it, so an edge does not flicker. */
export const ZONE_SLACK = 0.03;
export const PILE_X = 0.09;
export const MELD_CARD = 0.06;
const MELD_STEP = 0.033;
const MELD_GAP = 0.02;
/** The first row of the near field (my spread, the kitty) and the second (Tonk's piles): how far past the table's edge. */
const NEAR = 0.145;
const NEAR_BACK = 0.245;

/** My hand: one row of cards in the air just short of the table's near edge, lying back toward my eyes. */
export const HAND = {
  /** Width of a card. */
  card: 0.085,
  /** How far the cards lie back from upright. */
  tilt: -1.05,
  /** Height of the row's middle above the table top. */
  rise: 0.04,
  /** How far short of the table's edge the row hangs: the felt just past the edge stays in view over it. */
  short: 0.02,
  /** The row grows to this width before its cards sit closer than `step`. */
  span: 0.72,
  step: 0.052,
  tight: 0.03,
} as const;

const payload = (button: TableButton | undefined): Record<string, unknown> => (button?.run.kind === "action" ? button.run.action : {});
const meldIds = (button: TableButton): string[] => (payload(button).cardIds as string[] | undefined) ?? [];
const isMeld = (button: TableButton): boolean => button.id.startsWith("meld-") && !button.disabled;
const find = (description: TableDescription, id: string): TableButton | undefined => description.buttons.find((button) => button.id === id);

export function tableMode(description: TableDescription): Mode {
  if (find(description, "play")) return "play";
  const discard = find(description, "discard");
  // Bid Whist buries six cards at once (cardIds); Tonk discards one (cardId).
  if (discard) return "cardIds" in payload(discard) ? "kitty" : "tonk-meld";
  return find(description, "draw-stock") ? "tonk-draw" : "idle";
}

/** Why my cards can go nowhere just now, in a few words. */
export function whyNot(description: TableDescription): string {
  if (description.seats.some((seat) => seat.isYou && seat.isTurn)) return tableMode(description) === "tonk-draw" ? "Draw a card first" : "You cannot play a card yet";
  return description.seats.some((seat) => seat.isTurn) ? "Not your turn" : "The hand is over";
}

/** A point on the table `radius` from its centre toward a seat. */
export function toward(frame: Frame, seat: number, radius: number): [x: number, z: number] {
  const angle = frame.seatAngle(seat);
  return [Math.sin(angle) * radius, Math.cos(angle) * radius - frame.reach];
}

/**
 * The plays on the felt. The rules clear a trick the moment its fourth card lands, so until the next card is led the
 * finished trick stays where it was played, with its winner: the last card of a trick, often a bot's straight after
 * the one before, is otherwise never seen.
 */
export function feltTrick(cards: Pick<TableCards, "trick" | "lastTrick">): {
  plays: TableCards["trick"];
  won: { seat: TableCards["trick"][number]["seat"]; name: string } | null;
} {
  if (cards.trick.length > 0 || !cards.lastTrick) return { plays: cards.trick, won: null };
  return { plays: cards.lastTrick.plays, won: { seat: cards.lastTrick.winner, name: cards.lastTrick.winnerName } };
}

/**
 * Where the cards of my hand lie: a straight row of parallel cards, each a hair nearer my eyes than the one it
 * overlaps, so its index corner always shows and the card a hand is nearest to is always the one seen under it.
 */
export function handFan(count: number, frame: Frame): { x: number; y: number; z: number }[] {
  // shortcut: the spacing is worked out for eighteen cards at most (Bid Whist with its kitty); past twenty-five the
  // row only grows wider than HAND.span, so a game with bigger hands needs narrower cards.
  const step = Math.min(HAND.step, Math.max(HAND.tight, HAND.span / Math.max(1, count - 1)));
  return Array.from({ length: count }, (_, i) => ({
    x: (i - (count - 1) / 2) * step,
    y: TABLE_HEIGHT + HAND.rise + i * 0.001 * Math.sin(-HAND.tilt),
    z: -(frame.rim - HAND.short) + i * 0.001 * Math.cos(HAND.tilt),
  }));
}

/** Where Tonk's discard pile stands (the stock is its mirror image in x): in my near field, or for the host in the middle. */
export function pileSpot(frame: Frame): { x: number; z: number } {
  return { x: PILE_X, z: frame.stand === null ? -(frame.rim + NEAR_BACK) : -frame.reach };
}

/** Where the puck that acts on a zone's cards stands: at its right-hand end. */
export function puckSpot(zone: Zone): { x: number; z: number } {
  return { x: zone.x + zone.halfX + 0.085, z: zone.z };
}

/** Where the marker that leaves the table hangs: low beside my chair, on my left (-1) or right (1). */
export function leaveSpot(side: number): [x: number, y: number, z: number] {
  return [side * 0.55, 0.72, -0.28];
}

export interface MeldRow {
  /** The server's meld index. */
  index: number;
  kind: "set" | "run";
  x: number;
  z: number;
  halfX: number;
  cards: { card: Card; x: number; z: number }[];
}

/** Tonk melds, each seat's in a row across my view on its owner's side of the table. */
export function meldRows(description: TableDescription, frame: Frame): MeldRow[] {
  const rows: MeldRow[] = [];
  for (let seat = 0; seat < 4; seat += 1) {
    const melds = description.tableCards.melds.filter((meld) => meld.seat === seat);
    if (!melds.length) continue;
    const widths = melds.map((meld) => (meld.cards.length - 1) * MELD_STEP + MELD_CARD);
    const total = widths.reduce((sum, width) => sum + width + MELD_GAP, -MELD_GAP);
    // The players to my left and right keep clear of the middle of the table.
    const beside = Math.abs(Math.sin(frame.seatAngle(seat))) > 0.5;
    const [cx, cz] = toward(frame, seat, beside ? Math.max(0.32, 0.2 + total / 2) : 0.27);
    let left = cx - total / 2;
    melds.forEach((meld, m) => {
      const start = left + MELD_CARD / 2;
      rows.push({
        index: meld.index,
        kind: meld.kind,
        x: left + widths[m] / 2,
        z: cz,
        halfX: widths[m] / 2,
        // Each card a hair nearer than the last, so the overlap does not flicker.
        cards: meld.cards.map((card, i) => ({ card, x: start + i * MELD_STEP, z: cz + i * 0.001 })),
      });
      left += widths[m] + MELD_GAP;
    });
  }
  return rows;
}

/**
 * Where cards may be dropped in this state, most specific first (zoneAt takes the first that fits). The strip my
 * hand lies on comes before the felt, so a card put back down beside the others is not played.
 */
export function tableZones(description: TableDescription, frame: Frame): Zone[] {
  const mode = tableMode(description);
  const hand: Zone = { id: "hand", label: "Your hand", x: 0, z: -(frame.rim - HAND.short), halfX: 0.46, halfZ: 0.1, round: false };
  // The felt takes a card anywhere over the table top.
  const felt = (id: "play" | "wait", label: string): Zone => ({ id, label, x: 0, z: -frame.reach, halfX: TABLE_RADIUS, halfZ: TABLE_RADIUS, round: true });
  const near = -(frame.rim + NEAR);
  if (mode === "play") return [hand, felt("play", "Play here")];
  if (mode === "kitty") return [{ id: "kitty", label: "Kitty", x: 0, z: near, halfX: 0.19, halfZ: 0.05, round: false }, hand];
  if (mode === "tonk-meld") {
    const pile = pileSpot(frame);
    return [
      ...meldRows(description, frame).map(
        (row): Zone => ({ id: `meld-${row.index}`, label: `Add to ${row.kind}`, x: row.x, z: row.z, halfX: row.halfX + 0.012, halfZ: 0.055, round: false }),
      ),
      { id: "discard", label: "Discard", x: pile.x, z: pile.z, halfX: 0.07, halfZ: 0.05, round: false },
      { id: "spread", label: "Your spread", x: 0, z: near, halfX: 0.17, halfZ: 0.045, round: false },
      hand,
    ];
  }
  // My cards can go nowhere now (not my turn, a bid or a draw comes first): the felt says why to a card held over it.
  return description.hand.length ? [hand, felt("wait", whyNot(description))] : [];
}

/**
 * The zone a held card at (x, z) is over: the first whose outline it is inside. The zone it is already over
 * (`current`) reaches ZONE_SLACK further, so a card hovering on an edge does not flick between two answers.
 */
export function zoneAt(zones: readonly Zone[], x: number, z: number, current: ZoneId | null = null): ZoneId | null {
  for (const zone of zones) {
    const slack = zone.id === current ? ZONE_SLACK : 0;
    const dx = x - zone.x;
    const dz = z - zone.z;
    if (zone.round ? Math.hypot(dx, dz) <= zone.halfX + slack : Math.abs(dx) <= zone.halfX + slack && Math.abs(dz) <= zone.halfZ + slack) return zone.id;
  }
  return null;
}

/** Whether every one of these cards is in one meld the server would accept. */
export function canStage(description: TableDescription, cardIds: readonly string[]): boolean {
  return description.buttons.some((button) => isMeld(button) && cardIds.every((id) => meldIds(button).includes(id)));
}

/** The "lay down" button for exactly these staged cards, or null while they are not yet a legal meld. */
export function layButton(description: TableDescription, spread: readonly string[]): TableButton | null {
  if (!spread.length) return null;
  return description.buttons.find((button) => isMeld(button) && meldIds(button).length === spread.length && spread.every((id) => meldIds(button).includes(id))) ?? null;
}

/** Bid Whist's "discard the six picked cards" button (disabled, with its reason, until six are on the kitty), else null. */
export function buryButton(description: TableDescription): TableButton | null {
  return tableMode(description) === "kitty" ? (find(description, "discard") ?? null) : null;
}

/** The staged cards that still make sense: gone once the turn moves on, a card leaves my hand, or they can no longer be laid down together. */
export function pruneSpread(description: TableDescription, spread: readonly string[]): readonly string[] {
  if (!spread.length) return spread;
  const kept = tableMode(description) === "tonk-meld" && canStage(description, spread) ? spread : [];
  return kept.every((id) => description.hand.some((held) => held.card.id === id)) ? kept : [];
}

const reject = (reason: string): Outcome => ({ kind: "reject", reason });

/** What letting a hand card go over `zone` does. */
export function dropCard(describe: Describe, staging: Staging, cardId: string, zone: ZoneId | null): Outcome {
  const none: Outcome = { kind: "none" };
  if (!zone) return none;
  // Described with this card picked, so "play" and "discard" carry this card and say whether the server allows it.
  const now = describe([cardId]);
  const mode = tableMode(now);
  if (!now.hand.some((held) => held.card.id === cardId)) return none;
  const without = (ids: readonly string[]): string[] => ids.filter((id) => id !== cardId);

  if (zone === "hand") {
    if (mode === "kitty" && staging.selection.includes(cardId)) return { kind: "select", selection: without(staging.selection) };
    return staging.spread.includes(cardId) ? { kind: "spread", spread: without(staging.spread) } : none;
  }
  // Over the felt with nothing my cards can do: also when my turn ended while the card was in the air.
  if (zone === "wait" || (zone === "play" && (mode === "idle" || mode === "tonk-draw"))) return reject(whyNot(now));
  if ((zone === "play" && mode === "play") || (zone === "discard" && mode === "tonk-meld")) {
    const button = find(now, zone)!;
    if (!button.disabled) return { kind: "press", button };
    // shortcut: the only specific reason there is (Tonk's "not the card you just took") is read out of the button's
    // bracketed words; give describeTable a per-card reason if a game ever needs to say more.
    const why = /\(([^)]+)\)/.exec(button.reason ?? "")?.[1];
    return reject(why ? why[0].toUpperCase() + why.slice(1) : zone === "play" ? "You cannot play that card now" : "You cannot discard that card now");
  }
  if (zone === "kitty" && mode === "kitty") {
    if (staging.selection.includes(cardId)) return none;
    if (staging.selection.length >= now.selectionLimit) return reject(`The kitty already holds ${now.selectionLimit} cards`);
    return { kind: "select", selection: [...staging.selection, cardId] };
  }
  if (mode !== "tonk-meld") return none;
  if (zone === "spread") {
    if (staging.spread.includes(cardId)) return none;
    const next = [...staging.spread, cardId];
    if (canStage(now, next)) return { kind: "spread", spread: next };
    return reject(staging.spread.length ? "That card does not make a set or run with these" : "That card is not in a set or run you can lay down");
  }
  if (zone.startsWith("meld-")) {
    const button = find(now, `extend-${zone.slice(5)}-${cardId}`);
    return button && !button.disabled ? { kind: "press", button } : reject("That card does not fit there");
  }
  return none;
}

/** One move at a time: while the last one is still on its way to the server, a second waits and its card goes back. */
export function settle(outcome: Outcome, busy: boolean): Outcome {
  return busy && outcome.kind === "press" ? reject("Wait for the last move") : outcome;
}

/** What letting the card go over `zone` will do, in words, shown before it is let go. "" when it would only stay put. */
export function foresee(outcome: Outcome, zone: ZoneId | null): string {
  switch (outcome.kind) {
    case "press":
      return outcome.button.label;
    case "select":
      return zone === "hand" ? "Back to your hand" : "Put on the kitty";
    case "spread":
      return zone === "hand" ? "Back to your hand" : "Add to your spread";
    case "reject":
      return zone === "wait" ? outcome.reason : `Not allowed: ${outcome.reason}`;
    default:
      return zone === "hand" ? "Back to your hand" : "";
  }
}

/** A pile (start z, end z) was pulled toward me far enough to draw from it. */
export const pulled = (startZ: number, endZ: number): boolean => endZ - startZ >= DRAG_COMMIT;
/** A token was pushed toward the table centre far enough to choose it. */
export const pushed = (startZ: number, endZ: number): boolean => startZ - endZ >= DRAG_COMMIT;

/** Buttons that are things on the table (cards, zones, piles, pucks, chairs, the leave marker) and so are not tokens. */
const NOT_TOKENS = /^(play|discard|clear|draw-stock|draw-discard|leave)$|^(meld|extend|sit)-/;

/** The choices laid out as tokens in front of me: bids, trump, house rules, ready, start, deal, new game, drop. */
export function tokenButtons(description: TableDescription): TableButton[] {
  return description.buttons.filter((button) => !NOT_TOKENS.test(button.id));
}

/** The three.js object name of a button's token. The names browser tests already use stay as they were. */
export function objectName(buttonId: string): string {
  return /^(ready|unready|start|next-hand|reset)$/.test(buttonId) ? buttonId : `token-${buttonId}`;
}

export interface TokenGrid {
  width: number;
  height: number;
  /** Characters per line of a token's words. */
  wrapAt: number;
  /** One per label, row by row from the row nearest me: the middle of each token, and the turn about the vertical that faces it to my seat. */
  cells: { x: number; y: number; z: number; ry: number }[];
}

/**
 * The token rail: arcs about my seat, the first this far past the table's edge, each one further out and higher than the last.
 * `lift` raises the first row clear of the top of my hand row as the seated eye sees it, so no card hides a token's words.
 */
const RAIL = { first: 0.1, step: 0.06, rise: 0.03, lift: 0.065 } as const;

/**
 * Where tokens stand. For a player: on a stepped rail of arcs about the seat, every token turned to the player and
 * within reach; each row holds as many as fit over the table top there, and each row stands higher than the one in
 * front so none hides the next. Long labels (house rules) get wider tokens. The host's go two to a row on the
 * dealer's stand. `scale` is the "Text and button size" setting: tokens and the gaps between them grow with it.
 */
export function tokenGrid(labels: readonly string[], frame: Frame, scale = 1): TokenGrid {
  if (frame.stand !== null) {
    // The host looks across the stand from close and low, so its rows are shallow and far apart: none hides the next.
    const [width, height, step] = [0.18 * scale, 0.055 * scale, 0.14 * scale];
    const first = frame.stand - ((Math.ceil(labels.length / 2) - 1) * step) / 2;
    const y = standing(height, TOKEN_LEAN, STAND_TOP);
    return {
      width,
      height,
      wrapAt: 26,
      cells: labels.map((_, i) => {
        const row = Math.floor(i / 2);
        const inRow = Math.min(2, labels.length - row * 2);
        return { x: ((i % 2) - (inRow - 1) / 2) * (width + 0.012), y, z: -(first + row * step), ry: 0 };
      }),
    };
  }
  const wide = labels.some((label) => label.length > 26);
  const width = (wide ? 0.25 : 0.105) * scale;
  const height = (wide ? 0.062 : 0.058) * scale;
  const pitch = width + 0.012 * scale;
  const cells: TokenGrid["cells"] = [];
  // shortcut: four rows (22 tokens, or 8 wide ones) are within reach; a game with more choices at once would run on
  // into rows past ARM, and should page them or shrink the tokens. A large `scale` pushes more rows out, and the
  // outer ones can pass ARM: they are reached by the ray.
  for (let row = 0; cells.length < labels.length; row += 1) {
    // The rows step out and up with the tokens' size, so a larger plate still clears the row in front.
    const radius = frame.rim + RAIL.first + row * RAIL.step * scale;
    // As many as fit on the part of this arc that lies over the table top.
    const cos = (radius * radius + frame.reach * frame.reach - TABLE_RADIUS * TABLE_RADIUS) / (2 * frame.reach * radius);
    const arc = 2 * radius * Math.acos(Math.min(1, Math.max(-1, cos)));
    const count = Math.min(labels.length - cells.length, Math.max(1, Math.floor((arc - width) / pitch) + 1));
    const y = standing(height, TOKEN_LEAN, TABLE_HEIGHT + RAIL.lift + row * RAIL.rise * scale);
    for (let i = 0; i < count; i += 1) {
      const angle = ((i - (count - 1) / 2) * pitch) / radius;
      cells.push({ x: Math.sin(angle) * radius, y, z: -Math.cos(angle) * radius, ry: -angle });
    }
  }
  return { width, height, wrapAt: wide ? 27 : 12, cells };
}

/** Where staged cards lie: a row centred on (x, z), overlapped so each can still be taken back. */
export function stagedRow(count: number, x: number, z: number, step = 0.04): { x: number; z: number }[] {
  return Array.from({ length: count }, (_, i) => ({ x: x + (i - (count - 1) / 2) * step, z: z + i * 0.001 }));
}
