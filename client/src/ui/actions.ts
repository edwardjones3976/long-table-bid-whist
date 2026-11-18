/**
 * The ONE place that turns server state into what a person can read and do at a
 * card table. Pure: no sockets, no stores, no DOM. Both the DOM panel and the
 * in-world table interface render the TableDescription this returns and hand a
 * pressed button's `run` to net/run.ts.
 *
 * Cards are chosen by toggling them into `selection` (card ids, kept in the
 * local store); buttons such as "play" and "discard" then act on the selection.
 * What is allowed always comes from the server's own `view.legal`.
 */
import type { Card, Suit } from "../../../shared/cards";
import { TABLES, type GameId, type Seat, type TableId, type TableSnapshot, type TableSummary } from "../../../shared/protocol";
import {
  DEFAULT_OPTIONS as BID_WHIST_DEFAULTS,
  type Bid,
  type View as BidWhistView,
} from "../../../server/games/bidwhist";
import { DEFAULT_OPTIONS as SPADES_DEFAULTS, type TeamResult, type View as SpadesView } from "../../../server/games/spades";
import { DEFAULT_OPTIONS as TONK_DEFAULTS, type View as TonkView } from "../../../server/games/tonk";
import { cardLabel, SUIT_NAMES } from "./cards";

export interface TableInput {
  /** The table's public summary from the room snapshot. */
  summary: TableSummary;
  /** My private snapshot; pass net state's `table` (it is ignored unless it is for this table). */
  snapshot: TableSnapshot | null;
  meId: string;
  /** Card ids currently picked in my hand. */
  selection: readonly string[];
  /** True when I am seated at a different table, so I cannot sit here. */
  elsewhere?: boolean;
}

export type ButtonRun =
  | { kind: "socket"; call: "sit"; args: { tableId: TableId; role: "player" | "host"; seat?: Seat } }
  | { kind: "socket"; call: "stand" | "ready" | "unready" | "start" | "reset" }
  | { kind: "action"; action: { type: string; [key: string]: unknown } }
  | { kind: "select-clear" }
  | { kind: "options"; options: unknown };

export interface TableButton {
  /** Stable within a table state; used as the DOM data-testid. */
  id: string;
  label: string;
  disabled: boolean;
  /** Why it is disabled, in words. */
  reason?: string;
  run: ButtonRun;
}

export interface HandCard {
  card: Card;
  /** May be toggled into the selection right now. */
  selectable: boolean;
  selected: boolean;
}

export interface SeatDescription {
  seat: Seat;
  name: string;
  occupant: "open" | "human" | "bot";
  connected: boolean;
  ready: boolean;
  /** Cards in hand; null before the match starts. */
  cardCount: number | null;
  isTurn: boolean;
  isYou: boolean;
  /** Partnership (seats 0 and 2 against 1 and 3); null in Tonk, where everyone plays alone. */
  team: 0 | 1 | null;
  /** This seat's bid, tricks or score in words; "" when there is nothing to say. */
  note: string;
}

export interface TableCards {
  /** The trick being played, in play order. */
  trick: { seat: Seat; name: string; card: Card }[];
  lastTrick: { winner: Seat; winnerName: string; plays: { seat: Seat; name: string; card: Card }[] } | null;
  /** Tonk melds on the table; `index` is the server's meld index. */
  melds: { index: number; seat: Seat; name: string; kind: "set" | "run"; cards: Card[] }[];
  /** Tonk: the face-up top of the discard pile. */
  discardTop: Card | null;
  /** Tonk: cards left in the stock; null in the other games. */
  stockCount: number | null;
  /** Bid Whist: face-down kitty cards not yet picked up; null in the other games. */
  kittyCount: number | null;
  /** Tonk: hands shown at the end of a hand won on the deal. */
  revealed: { seat: Seat; name: string; cards: Card[] }[];
}

export interface TableDescription {
  title: string;
  statusLines: string[];
  hand: HandCard[];
  /** How many cards may be selected at once in this state (pass to toggleSelection). */
  selectionLimit: number;
  buttons: TableButton[];
  tableCards: TableCards;
  seats: SeatDescription[];
  /** Whether I am at this table, and as what. */
  role: "player" | "host" | "visitor";
}

/** Adds or removes a card from the selection; with a limit of one, picking another card replaces it. */
export function toggleSelection(selection: readonly string[], cardId: string, limit: number): string[] {
  if (selection.includes(cardId)) return selection.filter((id) => id !== cardId);
  if (limit <= 1) return [cardId];
  return selection.length >= limit ? [...selection] : [...selection, cardId];
}

const SEATS: readonly Seat[] = [0, 1, 2, 3];
const TEAMS = [0, 1] as const;
const yesNo = (value: unknown): string => (value ? "yes" : "no");
const allowed = (value: unknown): string => (value ? "allowed" : "not allowed");
const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;
const list = (items: readonly string[]): string =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

interface OptionSpec {
  key: string;
  label: string;
  values: readonly unknown[];
  say: (value: unknown) => string;
}

const DEFAULTS: Record<GameId, object> = { "bid-whist": BID_WHIST_DEFAULTS, spades: SPADES_DEFAULTS, tonk: TONK_DEFAULTS };

/** The house rules of each game, mirroring the Options types in server/games/*.ts. */
const OPTION_SPECS: Record<GameId, OptionSpec[]> = {
  "bid-whist": [
    { key: "minBid", label: "Lowest bid", values: [3, 4], say: String },
    { key: "lowOverHigh", label: "A low bid outranks a high bid of the same number", values: [false, true], say: yesNo },
    { key: "overtricks", label: "A made bid scores every book above six", values: [true, false], say: yesNo },
    { key: "noTrumpDouble", label: "No-trump bids score double", values: [true, false], say: yesNo },
  ],
  spades: [
    {
      key: "preset",
      label: "Deck",
      values: ["standard", "jokers"],
      say: (value) => (value === "jokers" ? "jokers and the 2 of Diamonds are the top spades" : "standard 52 cards"),
    },
    { key: "target", label: "Play to", values: [500, 250, 100], say: (value) => `${value} points` },
    { key: "nil", label: "Nil bids", values: [true, false], say: allowed },
    { key: "bagPenalty", label: "Ten bags cost 100 points", values: [true, false], say: yesNo },
  ],
  tonk: [
    { key: "knocking", label: "Dropping before you draw", values: [true, false], say: allowed },
    { key: "initialFifty", label: "A dealt 49 or 50 wins the hand", values: [true, false], say: yesNo },
    { key: "target", label: "Play to", values: [5, 10], say: (value) => `${value} points` },
  ],
};

const SUIT_ORDER: Record<Card["suit"], number> = { joker: 0, spades: 1, hearts: 2, clubs: 3, diamonds: 4 };
const sorted = (hand: readonly Card[]): Card[] =>
  [...hand].sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || b.rank - a.rank);

const action = (id: string, label: string, payload: { type: string; [key: string]: unknown }): TableButton => ({
  id,
  label,
  disabled: false,
  run: { kind: "action", action: payload },
});

const off = (button: TableButton, reason: string | false): TableButton =>
  reason ? { ...button, disabled: true, reason } : button;

/** What one game adds to the description while a match is running. */
interface Play {
  lines: string[];
  buttons: TableButton[];
  /** Hand cards that may be picked now. */
  selectable: string[];
  limit: number;
  notes: string[];
  cards: Partial<TableCards>;
}

interface Context {
  names: string[];
  /** My seat, or null for the host. */
  you: Seat | null;
  picked: string[];
  hand: Card[];
  team: (team: number) => string;
}

const BID_KINDS: Record<Bid["kind"], string> = { high: "High", low: "Low", "no-trump": "No Trump" };
const bidLabel = (bid: Bid): string => `${bid.level} ${BID_KINDS[bid.kind]}`;

/** A "play the picked card" button shared by the trick-taking games. */
function playButton(ctx: Context, legalIds: readonly string[]): TableButton {
  const card = ctx.hand.find((held) => held.id === ctx.picked[0] && legalIds.includes(held.id));
  return off(
    action("play", card ? `Play ${cardLabel(card)}` : "Play a card", { type: "play", cardId: card?.id }),
    !card && "Pick a card from your hand first",
  );
}

function bidWhist(view: BidWhistView, ctx: Context): Play {
  const { contract, result, legal } = view;
  const lines: string[] = [`Hand ${view.handNumber}. ${ctx.names[view.dealer]} dealt.`];
  const buttons: TableButton[] = [];
  let selectable: string[] = [];
  let limit = 1;

  if (view.phase === "auction") {
    lines.push("Bidding: bid how many books above six your side will take. High means high cards win, Low means low cards win.");
  }
  if (contract) {
    const how = contract.noTrump
      ? contract.direction
        ? `no trump, ${contract.direction} cards win`
        : "no trump, high or low still to be named"
      : `${contract.direction === "low" ? "low" : "high"} cards win, ${contract.trump ? `trump is ${SUIT_NAMES[contract.trump]}` : "trump still to be named"}`;
    lines.push(`${ctx.names[contract.seat]} won the bid at ${contract.level}: ${how}. The bid needs ${6 + contract.level} books; the kitty counts as one.`);
  }
  if (view.phase === "play" || view.phase === "hand-over" || view.phase === "game-over") {
    lines.push(`Books this hand: ${ctx.team(0)} ${view.tricksWon[0]}, ${ctx.team(1)} ${view.tricksWon[1]}.`);
  }
  if (result) {
    lines.push(
      `${ctx.team(result.team)} bid ${result.level} and took ${plural(result.books, "book")} with the kitty: ` +
        `${result.made ? "they made it" : "they were set"}, ${signed(result.delta)} points.`,
    );
  }
  lines.push(`Score (first to 7 wins, minus 7 loses): ${ctx.team(0)} ${view.scores[0]}, ${ctx.team(1)} ${view.scores[1]}.`);
  if (view.winner !== null) lines.push(`${ctx.team(view.winner)} won the game.`);

  if (legal) {
    if (view.phase === "auction") {
      for (const bid of legal.bids) {
        buttons.push(action(`bid-${bid.level}-${bid.kind}`, `Bid ${bidLabel(bid)}`, { type: "bid", bid }));
      }
      buttons.push(
        off(action("bid-pass", "Pass", { type: "bid", bid: null }), legal.mustBid && "Everyone else passed, so the dealer must bid"),
      );
    } else if (view.phase === "declare" && contract) {
      if (contract.noTrump) {
        buttons.push(action("declare-high", "No trump: high cards win", { type: "declare", direction: "high" }));
        buttons.push(action("declare-low", "No trump: low cards win", { type: "declare", direction: "low" }));
      } else {
        for (const suit of ["spades", "hearts", "clubs", "diamonds"] as Suit[]) {
          buttons.push(action(`declare-${suit}`, `Trump: ${SUIT_NAMES[suit]}`, { type: "declare", trump: suit }));
        }
      }
    } else if (view.phase === "kitty") {
      selectable = ctx.hand.map((card) => card.id);
      limit = 6;
      lines.push(`You picked up the kitty. Pick six cards to discard: ${ctx.picked.length} of 6 picked.`);
      buttons.push(
        off(
          action("discard", "Discard the six picked cards", { type: "discard", cardIds: ctx.picked }),
          ctx.picked.length !== 6 && `Pick exactly six cards (${ctx.picked.length} picked)`,
        ),
      );
      buttons.push(
        off({ id: "clear", label: "Clear picks", disabled: false, run: { kind: "select-clear" } }, !ctx.picked.length && "Nothing is picked"),
      );
    } else if (view.phase === "play") {
      selectable = legal.cardIds;
      buttons.push(playButton(ctx, legal.cardIds));
    }
  }

  const bids = new Map(view.auction.map((entry) => [entry.seat, entry.bid ? `Bid ${bidLabel(entry.bid)}` : "Passed"]));
  return {
    lines,
    buttons,
    selectable,
    limit,
    notes: SEATS.map((seat) => bids.get(seat) ?? ""),
    cards: { kittyCount: view.kittyCount },
  };
}

function spadesResult(team: string, result: TeamResult): string {
  const took = result.tricks[0] + result.tricks[1];
  const contract =
    result.made === null ? "both partners bid nil" : `bid ${result.contract} and took ${took}: ${result.made ? "made" : "set"}`;
  const nils = result.nils.filter(Boolean).map((nil) => `a nil bid ${nil}`);
  const extras = [
    ...nils,
    ...(result.bagsAdded ? [plural(result.bagsAdded, "bag")] : []),
    ...(result.penalty ? [`${result.penalty} points lost for ten bags`] : []),
  ];
  return `${team} ${contract}${extras.length ? `, ${list(extras)}` : ""}: ${signed(result.delta)} points.`;
}

function spades(view: SpadesView, ctx: Context): Play {
  const { legal, result } = view;
  const lines: string[] = [`Hand ${view.handNumber}. ${ctx.names[view.dealer]} dealt. Spades are trump.`];
  const buttons: TableButton[] = [];
  if (view.phase === "bidding") lines.push("Bidding: say how many tricks you will take.");
  if (view.phase === "play") {
    lines.push(view.spadesBroken ? "Spades are broken: anyone may lead a spade." : "Spades are not broken: you may not lead a spade yet.");
  }
  if (result) TEAMS.forEach((team) => lines.push(spadesResult(ctx.team(team), result[team])));
  lines.push(
    `Score (play to ${view.options.target}): ` +
      TEAMS
        .map((team) => `${ctx.team(team)} ${view.scores[team]} with ${plural(view.bags[team], "bag")}`)
        .join(", ") +
      ".",
  );
  if (view.winner !== null) lines.push(`${ctx.team(view.winner)} won the game.`);

  let selectable: string[] = [];
  if (legal && view.phase === "bidding") {
    for (const tricks of legal.bids) {
      buttons.push(action(`bid-${tricks}`, tricks === 0 ? "Bid nil (take no tricks)" : `Bid ${tricks}`, { type: "bid", tricks }));
    }
  } else if (legal && view.phase === "play") {
    selectable = legal.cardIds;
    buttons.push(playButton(ctx, legal.cardIds));
  }
  return {
    lines,
    buttons,
    selectable,
    limit: 1,
    notes: SEATS.map((seat) => {
      const bid = view.bids[seat];
      if (bid === null) return "";
      return `${bid === 0 ? "Bid nil" : `Bid ${bid}`}, won ${view.tricks[seat]}`;
    }),
    cards: {},
  };
}

function tonkResult(view: TonkView, names: string[]): string[] {
  const result = view.result;
  if (!result) return [];
  const who = result.seat === null ? "" : names[result.seat];
  const scorers = list(SEATS.filter((seat) => result.points[seat] > 0).map((seat) => names[seat]));
  const reason = {
    "initial-fifty": `${who === "You" ? "You were" : `${who} was`} dealt 49 or 50: that wins the hand and 2 points.`,
    "void-deal": "More than one player was dealt 49 or 50, so the hand is void and nobody scores.",
    "drop-won": `${who} dropped with the lowest hand and scores 1 point.`,
    "drop-failed": `${who} dropped without the lowest hand, so ${scorers} scored 2 points.`,
    "out-by-melds": `${who} melded every card (Tonk!) and scores 2 points.`,
    "out-by-discard": `${who} went out on the discard and scores 1 point.`,
    "stock-empty": `The stock ran out. Lowest hand scores 1 point: ${scorers}.`,
  }[result.reason];
  return [reason, `Hand totals: ${SEATS.map((seat) => `${names[seat]} ${result.totals[seat]}`).join(", ")}.`];
}

function tonk(view: TonkView, ctx: Context): Play {
  const { legal } = view;
  const top = view.discards.at(-1) ?? null;
  const lines: string[] = [`Hand ${view.handNumber}. ${ctx.names[view.dealer]} dealt. Everyone plays alone.`];
  if (view.phase === "draw" || view.phase === "meld") {
    lines.push(`Stock: ${plural(view.stockCount, "card")}. Discard pile: ${top ? `${cardLabel(top)} on top` : "empty"}.`);
  }
  lines.push(...tonkResult(view, ctx.names));
  lines.push(`Score (play to ${view.options.target}): ${SEATS.map((seat) => `${ctx.names[seat]} ${view.scores[seat]}`).join(", ")}.`);
  if (view.winners.length) lines.push(`${list(view.winners.map((seat) => ctx.names[seat]))} won the game.`);

  const buttons: TableButton[] = [];
  let selectable: string[] = [];
  const byId = new Map(ctx.hand.map((card) => [card.id, card]));
  const namesOf = (ids: readonly string[]) => list(ids.map((id) => cardLabel(byId.get(id)!)));
  if (legal && view.phase === "draw") {
    lines.push("Your turn: draw a card, or drop to end the hand now if you think your hand is the lowest.");
    buttons.push(off(action("draw-stock", "Draw from the stock", { type: "draw", from: "stock" }), !legal.canDrawStock && "The stock is empty"));
    buttons.push(
      off(
        action("draw-discard", top ? `Take the ${cardLabel(top)} from the discard pile` : "Take the top discard", { type: "draw", from: "discard" }),
        !legal.canDrawDiscard && "The discard pile is empty",
      ),
    );
    buttons.push(off(action("drop", "Drop (end the hand now)", { type: "drop" }), !legal.canDrop && "Dropping is not allowed at this table"));
  } else if (legal && view.phase === "meld") {
    lines.push("Your turn: lay down sets or runs if you can, then pick a card and discard it to end your turn.");
    legal.melds.forEach((cardIds, i) => {
      const cards = cardIds.map((id) => byId.get(id)!);
      const kind = cards.every((card) => card.rank === cards[0].rank) ? "set" : "run";
      buttons.push(action(`meld-${i}`, `Lay down a ${kind}: ${namesOf(cardIds)}`, { type: "meld", cardIds }));
    });
    for (const { meldIndex, cardId } of legal.extensions) {
      const target = view.melds[meldIndex];
      buttons.push(
        action(`extend-${meldIndex}-${cardId}`, `Add the ${namesOf([cardId])} to ${ctx.names[target.seat]}'s ${target.kind}`, {
          type: "extend",
          meldIndex,
          cardId,
        }),
      );
    }
    selectable = legal.discardIds;
    const card = legal.discardIds.includes(ctx.picked[0]) ? byId.get(ctx.picked[0]) : undefined;
    const blocked = view.tookDiscard && byId.has(view.tookDiscard) ? " (not the card you just took)" : "";
    buttons.push(
      off(
        action("discard", card ? `Discard the ${cardLabel(card)}` : "Discard a card", { type: "discard", cardId: card?.id }),
        !card && `Pick a card from your hand first${blocked}`,
      ),
    );
  }
  return {
    lines,
    buttons,
    selectable,
    limit: 1,
    notes: SEATS.map((seat) => `Score ${view.scores[seat]}`),
    cards: {
      melds: view.melds.map((meld, index) => ({ index, seat: meld.seat, name: ctx.names[meld.seat], kind: meld.kind, cards: meld.cards })),
      discardTop: top,
      stockCount: view.stockCount,
      revealed: (view.result?.revealed ?? []).map((shown) => ({ ...shown, name: ctx.names[shown.seat] })),
    },
  };
}

function houseRules(game: GameId, options: object): string {
  const values = options as Record<string, unknown>;
  return `House rules: ${OPTION_SPECS[game].map((spec) => `${spec.label}: ${spec.say(values[spec.key])}`).join("; ")}.`;
}

export function describeTable(input: TableInput): TableDescription {
  const { summary, meId } = input;
  const game = summary.game;
  const mySeat = summary.seats.findIndex((info) => info.memberId === meId);
  const you = mySeat < 0 ? null : (mySeat as Seat);
  const role = you !== null ? "player" : summary.host?.memberId === meId ? "host" : "visitor";
  const manager = summary.managerId === meId;
  const snapshot = role !== "visitor" && input.snapshot?.tableId === summary.id ? input.snapshot : null;
  const view = snapshot?.view ?? null;
  const live = view !== null && view.phase !== "hand-over" && view.phase !== "game-over";

  const names = summary.seats.map((info, seat) =>
    seat === you ? "You" : (info.name ?? (info.occupant === "bot" ? `Bot ${seat + 1}` : `Seat ${seat + 1}`)),
  );
  const team = (t: number): string => `${names[t]} and ${names[t + 2]}`;
  const managerName =
    summary.managerId === null
      ? null
      : manager
        ? "You"
        : summary.host?.memberId === summary.managerId
          ? summary.host.name
          : (summary.seats.find((info) => info.memberId === summary.managerId)?.name ?? null);

  const hand = sorted(view?.hand ?? []);
  const held = new Set(hand.map((card) => card.id));
  const ctx: Context = { names, you, picked: input.selection.filter((id) => held.has(id)), hand, team };
  const play: Play | null = !view
    ? null
    : game === "bid-whist"
      ? bidWhist(view as BidWhistView, ctx)
      : game === "spades"
        ? spades(view as SpadesView, ctx)
        : tonk(view as TonkView, ctx);
  const picked = ctx.picked.filter((id) => play?.selectable.includes(id));

  const statusLines: string[] = [];
  const buttons: TableButton[] = [];

  if (role === "visitor") {
    statusLines.push(
      summary.status === "available"
        ? "Nobody is here yet. Take a seat to open the table."
        : summary.status === "lobby"
          ? "Players are getting ready. Take an open seat to join."
          : summary.status === "playing"
            ? "A match is being played. You can join as the host, or wait for it to finish to take a seat."
            : "The match is over. Seats open again when the table starts a new game.",
    );
    const inPlay = summary.status === "playing" || summary.status === "results";
    summary.seats.forEach((info, seat) => {
      buttons.push(
        off(
          {
            id: `sit-${seat}`,
            label: `Sit in seat ${seat + 1}`,
            disabled: false,
            run: { kind: "socket", call: "sit", args: { tableId: summary.id, role: "player", seat: seat as Seat } },
          },
          input.elsewhere
            ? "Leave your table first"
            : inPlay
              ? "Wait for this match to finish"
              : info.occupant !== "open" && `Taken by ${info.name ?? "another player"}`,
        ),
      );
    });
    buttons.push(
      off(
        {
          id: "sit-host",
          label: "Join as host (dealer, does not play)",
          disabled: false,
          run: { kind: "socket", call: "sit", args: { tableId: summary.id, role: "host" } },
        },
        input.elsewhere ? "Leave your table first" : summary.host !== null && `${summary.host.name} is already the host`,
      ),
    );
  } else if (!view) {
    const options = { ...DEFAULTS[game], ...(summary.options as object | null) } as Record<string, unknown>;
    const seated = summary.seats.filter((info) => info.occupant === "human");
    const waiting = seated.filter((info) => !info.ready).map((info) => (info.memberId === meId ? "you" : (info.name ?? "a player")));
    statusLines.push(
      !seated.length
        ? "Waiting for at least one player to sit down."
        : waiting.length
          ? `Waiting for ${list(waiting)} to be ready.`
          : `Everyone is ready. ${manager ? "You can start the game" : `Waiting for ${managerName ?? "the manager"} to start`}. Open seats are played by bots.`,
    );
    statusLines.push(
      role === "host"
        ? "You are the host: you do not play, and you set the house rules and start the game."
        : manager
          ? "You manage this table: you set the house rules and start the game."
          : `${managerName ?? "Nobody yet"} manages this table.`,
    );
    if (you !== null) {
      const ready = summary.seats[you].ready;
      buttons.push({
        id: ready ? "unready" : "ready",
        label: ready ? "I am not ready" : "I am ready",
        disabled: false,
        run: { kind: "socket", call: ready ? "unready" : "ready" },
      });
    }
    if (manager) {
      for (const spec of OPTION_SPECS[game]) {
        const next = spec.values[(spec.values.indexOf(options[spec.key]) + 1) % spec.values.length];
        buttons.push({
          id: `option-${spec.key}`,
          label: `${spec.label}: ${spec.say(options[spec.key])} (press to change)`,
          disabled: false,
          run: { kind: "options", options: { ...options, [spec.key]: next } },
        });
      }
      buttons.push(
        off(
          { id: "start", label: "Start the game", disabled: false, run: { kind: "socket", call: "start" } },
          !seated.length ? "Seat at least one player first" : waiting.length > 0 && `Waiting for ${list(waiting)} to be ready`,
        ),
      );
    }
    statusLines.push(houseRules(game, options));
  } else if (play) {
    if (live) {
      statusLines.push(view.turn === you ? "It is your turn." : `Waiting for ${names[view.turn]}.`);
    } else if (view.phase === "hand-over") {
      statusLines.push(
        role === "host"
          ? "The hand is over. You can deal the next hand."
          : you !== null
            ? "The hand is over. Any player can deal the next hand."
            : "The hand is over. Waiting for a player to deal the next hand.",
      );
    } else {
      statusLines.push(`The game is over. ${manager ? "You can start a new game" : `Waiting for ${managerName ?? "the manager"} to start a new game`}.`);
    }
    if (role === "host") statusLines.push("You are the host: you see the table but hold no cards.");
    statusLines.push(...play.lines);
    buttons.push(...play.buttons);
    if (view.phase === "hand-over" && (you !== null || role === "host")) buttons.push(action("next-hand", "Deal next hand", { type: "next-hand" }));
    if (view.phase === "game-over" && manager) {
      buttons.push({ id: "reset", label: "New game", disabled: false, run: { kind: "socket", call: "reset" } });
    }
    statusLines.push(houseRules(game, view.options));
  }

  const away = [
    ...summary.seats.filter((info) => info.occupant === "human" && !info.connected).map((info) => info.name ?? "A player"),
    ...(summary.host && !summary.host.connected ? [summary.host.name] : []),
  ];
  if (away.length) statusLines.push(`${list(away)} lost connection; the place is held for about a minute.`);
  if (summary.host && role !== "host") statusLines.push(`${summary.host.name} is the host.`);
  if (role !== "visitor") {
    buttons.push({
      id: "leave",
      label: live && you !== null ? "Leave table (a bot takes your seat)" : "Leave table",
      disabled: false,
      run: { kind: "socket", call: "stand" },
    });
  }

  const name = (seat: Seat): string => names[seat];
  const plays = (list: readonly { seat: Seat; card: Card }[]) => list.map((p) => ({ seat: p.seat, name: name(p.seat), card: p.card }));
  const tricks = view && "trick" in view ? view : null;
  return {
    title: TABLES.find((table) => table.id === summary.id)?.label ?? summary.id,
    statusLines,
    hand: hand.map((card) => ({
      card,
      selectable: play?.selectable.includes(card.id) ?? false,
      selected: picked.includes(card.id),
    })),
    selectionLimit: play?.limit ?? 1,
    buttons,
    tableCards: {
      trick: plays(tricks?.trick ?? []),
      lastTrick: tricks?.lastTrick
        ? { winner: tricks.lastTrick.winner, winnerName: name(tricks.lastTrick.winner), plays: plays(tricks.lastTrick.plays) }
        : null,
      melds: [],
      discardTop: null,
      stockCount: null,
      kittyCount: null,
      revealed: [],
      ...play?.cards,
    },
    seats: SEATS.map((seat) => {
      const info = summary.seats[seat];
      return {
        seat,
        name: names[seat],
        occupant: info.occupant,
        connected: info.connected,
        ready: info.ready,
        cardCount: view?.handCounts[seat] ?? null,
        isTurn: live && view.turn === seat,
        isYou: seat === you,
        team: game === "tonk" ? null : ((seat % 2) as 0 | 1),
        note: play?.notes[seat] ?? "",
      };
    }),
    role,
  };
}
