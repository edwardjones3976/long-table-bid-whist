// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Role projections, constructed field by field.
 *
 * The authoritative `GameState` is read here and dropped. Nothing returned
 * holds a reference into it, and no member is copied that the receiving role
 * is not entitled to: the host and public builders never read a hand, the
 * kitty, the discard pile, the seed, or the private event log. There is no
 * serialize-then-redact step and no pattern filter in this file.
 */
import { bidLabel, cardRankText, isRedCard, trumpLabel } from "../../../src/table/labels";
import {
  MANIFEST_DISABLED_NOTICES,
  MANIFEST_ID,
  SEATS,
  legalCards,
  legalSeatActions,
  teamBooks,
  type Card,
  type GameState,
  type Seat,
} from "../../../packages/rules-core/src";
import {
  DISCARD_TARGET,
  HOST_CONTROLS,
  MODE_LABELS,
  PROTOCOL_VERSION,
  SEAT_LABELS,
  type AuctionEntryView,
  type CompletedTrickView,
  type ContractView,
  type HostControl,
  type HostProjection,
  type IntentReceipt,
  type LegalChoiceView,
  type PlayerCardView,
  type PlayerProjection,
  type PublicCore,
  type PublicProjection,
  type PublicTrickCard,
  type SeatOccupancyView,
  type HostAnnouncementCue,
} from "../../../packages/protocol/src";
import type { SeatUncommitted } from "./seat-interaction";

export type SeatBinding =
  | { readonly occupant: "human"; readonly participantId: string; readonly displayName: string; readonly connected: boolean }
  | { readonly occupant: "ai" }
  | { readonly occupant: "open" };

/** The slice of table state the builders read. The seed and hands stay behind `game`. */
export interface TableView {
  readonly tableId: string;
  readonly version: number;
  readonly game: GameState;
  readonly seats: Readonly<Record<Seat, SeatBinding>>;
  readonly eventEnded: boolean;
  readonly lastAnnouncement: HostAnnouncementCue | null;
}

function contractView(game: GameState): ContractView | null {
  const contract = game.contract;
  if (!contract) return null;
  return {
    level: contract.level,
    mode: contract.mode,
    modeLabel: MODE_LABELS[contract.mode],
    trump: contract.trump,
    trumpLabel: trumpLabel(contract.trump),
    bidder: contract.bidder,
    bidderLabel: SEAT_LABELS[contract.bidder],
  };
}

function auctionView(game: GameState): AuctionEntryView[] {
  return game.auction.map((entry) => ({
    seat: entry.seat,
    bid: entry.bid ? { level: entry.bid.level, mode: entry.bid.mode } : null,
  }));
}

function publicTrick(game: GameState): PublicTrickCard[] {
  return game.currentTrick.map((played) => ({
    seat: played.seat,
    seatLabel: SEAT_LABELS[played.seat],
    cardId: played.card.id,
    label: played.card.label,
    glyph: played.card.glyph,
    rankText: cardRankText(played.card),
    red: isRedCard(played.card),
  }));
}

function completedTricks(game: GameState): CompletedTrickView[] {
  // Number, leader and winner only. The cards of a gathered book are not re-projected.
  return game.completedTricks.map((trick) => ({
    number: trick.number,
    lead: trick.lead,
    winner: trick.winner,
  }));
}

function occupancyDisplayName(binding: SeatBinding, seat: Seat): string {
  if (binding.occupant === "human") return binding.displayName.length > 0 ? binding.displayName : SEAT_LABELS[seat];
  return binding.occupant === "ai" ? "AI seat" : "Open seat";
}

function seatOccupancy(table: TableView): SeatOccupancyView[] {
  return SEATS.map((seat) => {
    const binding = table.seats[seat];
    return {
      seat,
      seatLabel: SEAT_LABELS[seat],
      occupant: binding.occupant,
      displayName: occupancyDisplayName(binding, seat),
      connected: binding.occupant === "human" ? binding.connected : binding.occupant === "ai",
      // Length only. The cards themselves are never read here.
      cardCount: table.game.hands[seat].length,
    };
  });
}

export function buildPublicCore(table: TableView): PublicCore {
  const game = table.game;
  const books = teamBooks(game);
  return {
    protocolVersion: PROTOCOL_VERSION,
    manifestId: MANIFEST_ID,
    tableId: table.tableId,
    version: table.version,
    handNumber: game.handNumber,
    phase: game.phase,
    turn: game.turn,
    turnLabel: SEAT_LABELS[game.turn],
    dealer: game.dealer,
    dealerLabel: SEAT_LABELS[game.dealer],
    contract: contractView(game),
    auction: auctionView(game),
    publicTrick: publicTrick(game),
    completedTricks: completedTricks(game),
    booksNorthSouth: books["north-south"],
    booksEastWest: books["east-west"],
    scoreNorthSouth: game.scores["north-south"],
    scoreEastWest: game.scores["east-west"],
    seats: seatOccupancy(table),
    statusLine: game.status,
    summaryLine: game.summary,
    paused: game.paused,
    eventEnded: table.eventEnded,
  };
}

function cardView(
  card: Card,
  legalIds: ReadonlySet<string>,
  discardIds: readonly string[],
  previewedCardId: string | null,
): PlayerCardView {
  return {
    cardId: card.id,
    label: card.label,
    glyph: card.glyph,
    rankText: cardRankText(card),
    red: isRedCard(card),
    legal: legalIds.has(card.id),
    selectedForDiscard: discardIds.includes(card.id),
    previewed: previewedCardId === card.id,
  };
}

export function legalChoices(game: GameState, seat: Seat): LegalChoiceView[] {
  const choices: LegalChoiceView[] = [];
  if (game.phase === "kitty" && game.turn === seat && !game.paused) {
    game.hands[seat].forEach((card) => {
      choices.push({
        targetId: `discard:${card.id}`,
        kind: "discard",
        label: card.label,
        intent: { kind: "toggle-discard", cardId: card.id },
      });
    });
    return choices;
  }

  legalSeatActions(game, seat).forEach((action) => {
    switch (action.type) {
      case "pass":
        choices.push({ targetId: "pass", kind: "pass", label: "Pass", intent: { kind: "preview", selection: { type: "pass" } } });
        return;
      case "bid":
        choices.push({
          targetId: `bid:${action.bid.level}:${action.bid.mode}`,
          kind: "bid",
          label: bidLabel(action.bid.level, action.bid.mode),
          intent: { kind: "preview", selection: { type: "bid", bid: { level: action.bid.level, mode: action.bid.mode } } },
        });
        return;
      case "declare":
        choices.push({
          targetId: `declare:${action.trump ?? "none"}`,
          kind: "declare",
          label: trumpLabel(action.trump),
          intent: { kind: "preview", selection: { type: "declaration", trump: action.trump } },
        });
        return;
      case "play": {
        const card = game.hands[seat].find((candidate) => candidate.id === action.cardId);
        choices.push({
          targetId: `play:${action.cardId}`,
          kind: "play",
          label: card?.label ?? action.cardId,
          intent: { kind: "preview", selection: { type: "play", cardId: action.cardId } },
        });
        return;
      }
      case "next-hand":
        choices.push({ targetId: "next-hand", kind: "next-hand", label: "Next hand", intent: { kind: "next-hand" } });
        return;
      case "discard":
        return;
    }
  });
  return choices;
}

export function buildPlayerProjection(
  table: TableView,
  seat: Seat,
  uncommitted: SeatUncommitted,
  revision: number,
  lastReceipt: IntentReceipt | null,
): PlayerProjection {
  const game = table.game;
  const acting = game.turn === seat && !game.paused;
  const legalIds = new Set(
    acting && game.phase === "play"
      ? legalCards(game, seat).map((card) => card.id)
      : acting && game.phase === "kitty"
        ? game.hands[seat].map((card) => card.id)
        : [],
  );
  const previewedCardId =
    uncommitted.preview?.selection.type === "play" ? uncommitted.preview.selection.cardId : null;
  const feedback = lastReceipt && lastReceipt.outcome !== "accepted" ? lastReceipt : null;

  return {
    role: "player",
    ...buildPublicCore(table),
    seat,
    hand: game.hands[seat].map((card) => cardView(card, legalIds, uncommitted.discardIds, previewedCardId)),
    legalChoices: table.eventEnded ? [] : legalChoices(game, seat),
    previewLabel: uncommitted.preview?.label ?? null,
    discardPicked: uncommitted.discardIds.length,
    discardTarget: DISCARD_TARGET,
    uncommittedRevision: revision,
    feedbackCode: feedback?.code ?? null,
    feedbackLine: feedback ? feedback.message : null,
    disabledNotices: MANIFEST_DISABLED_NOTICES.map((notice) => ({
      id: notice.id,
      label: notice.label,
      explanation: notice.explanation,
    })),
  };
}

export function hostControlsFor(table: TableView): HostControl[] {
  if (table.eventEnded) return [];
  const game = table.game;
  const betweenHands = game.phase === "summary";
  return HOST_CONTROLS.filter((control) => {
    switch (control) {
      case "next-hand":
        return betweenHands && !game.paused;
      case "host-pause":
        return betweenHands && !game.paused;
      case "host-resume":
        return game.paused;
      case "host-substitute":
        return betweenHands;
      case "host-announce":
      case "host-transfer":
      case "host-end-event":
        return true;
    }
  });
}

export function buildHostProjection(table: TableView): HostProjection {
  return {
    role: "host",
    ...buildPublicCore(table),
    betweenHands: table.game.phase === "summary",
    hostControls: hostControlsFor(table),
    lastAnnouncement: table.lastAnnouncement,
  };
}

export function buildPublicProjection(table: TableView): PublicProjection {
  return { role: "public", ...buildPublicCore(table) };
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
