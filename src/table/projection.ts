// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * XrTableProjection — the only shape that crosses into the XR room.
 *
 * Per director/privacy-control-policy.md this is a typed data-transfer object
 * built field by field from an explicit allowlist. The authoritative GameState
 * is read locally and then dropped: no reference to it, to the seed, to any
 * hand other than South's, to kitty or discard identities, to private events,
 * to host records, or to processed input ids is retained or reachable from the
 * returned object.
 *
 * There is deliberately no serialize-then-redact step and no pattern, regex, or
 * blacklist filter anywhere in this file. Adding a field to the room means
 * adding it to `XR_PROJECTION_KEYS` and constructing it here on purpose.
 */
import { teamBooks } from "../game/engine";
import { legalCards, legalHumanActions } from "../game/engine";
import {
  MANIFEST_DISABLED_NOTICES,
  MANIFEST_ID,
  SEATS,
  type Card,
  type ContractMode,
  type GameState,
  type Phase,
  type Seat,
  type Suit,
} from "../game/model";
import type { TableIntent } from "./intent";
import type { TableInteractionState } from "./interaction";
import { DISCARD_PICK_TARGET } from "./interaction";
import { MODE_LABELS, SEAT_LABELS, bidLabel, cardRankText, isRedCard, trumpLabel } from "./labels";

export interface XrBuildIdentity {
  manifestId: typeof MANIFEST_ID;
  buildShortSha: string;
}

export interface XrContractView {
  level: number;
  mode: ContractMode;
  modeLabel: string;
  trump: Suit | null;
  trumpLabel: string;
  bidder: Seat;
  bidderLabel: string;
}

/** A card already face-up on the table; public to every seat by the rules. */
export interface XrPublicTrickCard {
  seat: Seat;
  seatLabel: string;
  cardLabel: string;
  glyph: string;
  rankText: string;
  red: boolean;
}

/** South's own cards. No other seat's card identities are ever projected. */
export interface XrSouthCardView {
  cardId: string;
  label: string;
  glyph: string;
  rankText: string;
  red: boolean;
  legal: boolean;
  selectedForDiscard: boolean;
  previewed: boolean;
}

/** Opponents contribute a count only — never a card identity. */
export interface XrOpponentView {
  seat: Seat;
  seatLabel: string;
  cardCount: number;
}

export type XrChoiceKind = "pass" | "bid" | "declare" | "discard" | "play" | "next-hand";

export interface XrLegalChoice {
  targetId: string;
  kind: XrChoiceKind;
  label: string;
  intent: TableIntent;
}

export interface XrDisabledNotice {
  id: string;
  label: string;
  explanation: string;
}

export interface XrTableProjection {
  manifestId: typeof MANIFEST_ID;
  buildShortSha: string;
  handNumber: number;
  phase: Phase;
  turn: Seat;
  turnLabel: string;
  dealer: Seat;
  dealerLabel: string;
  contract: XrContractView | null;
  publicTrick: XrPublicTrickCard[];
  scoreNorthSouth: number;
  scoreEastWest: number;
  booksNorthSouth: number;
  booksEastWest: number;
  southHand: XrSouthCardView[];
  opponents: XrOpponentView[];
  legalChoices: XrLegalChoice[];
  previewLabel: string | null;
  /** Stable, cause-derived feedback for the last rejected input. */
  feedbackLine: string | null;
  discardPicked: number;
  discardTarget: number;
  statusLine: string;
  summaryLine: string | null;
  disabledNotices: XrDisabledNotice[];
}

/**
 * The closed allowlist. `buildXrTableProjection` is asserted against this in
 * tests, so a field cannot reach the room by accident.
 */
export const XR_PROJECTION_KEYS: readonly (keyof XrTableProjection)[] = [
  "manifestId",
  "buildShortSha",
  "handNumber",
  "phase",
  "turn",
  "turnLabel",
  "dealer",
  "dealerLabel",
  "contract",
  "publicTrick",
  "scoreNorthSouth",
  "scoreEastWest",
  "booksNorthSouth",
  "booksEastWest",
  "southHand",
  "opponents",
  "legalChoices",
  "previewLabel",
  "feedbackLine",
  "discardPicked",
  "discardTarget",
  "statusLine",
  "summaryLine",
  "disabledNotices",
];

export const XR_SOUTH_CARD_KEYS: readonly (keyof XrSouthCardView)[] = [
  "cardId",
  "label",
  "glyph",
  "rankText",
  "red",
  "legal",
  "selectedForDiscard",
  "previewed",
];

export const XR_OPPONENT_KEYS: readonly (keyof XrOpponentView)[] = [
  "seat",
  "seatLabel",
  "cardCount",
];

function contractView(game: GameState): XrContractView | null {
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

function publicTrick(game: GameState): XrPublicTrickCard[] {
  return game.currentTrick.map((played) => ({
    seat: played.seat,
    seatLabel: SEAT_LABELS[played.seat],
    cardLabel: played.card.label,
    glyph: played.card.glyph,
    rankText: cardRankText(played.card),
    red: isRedCard(played.card),
  }));
}

function southCardView(
  card: Card,
  legalIds: ReadonlySet<string>,
  discardIds: readonly string[],
  previewedCardId: string | null,
): XrSouthCardView {
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

function opponentViews(game: GameState): XrOpponentView[] {
  return SEATS.filter((seat) => seat !== "south").map((seat) => ({
    seat,
    seatLabel: SEAT_LABELS[seat],
    // Length only. The cards themselves are never read into the projection.
    cardCount: game.hands[seat].length,
  }));
}

function legalChoices(state: TableInteractionState): XrLegalChoice[] {
  const game = state.game;
  const choices: XrLegalChoice[] = [];

  if (game.phase === "kitty" && game.turn === "south" && !game.paused) {
    game.hands.south.forEach((card) => {
      choices.push({
        targetId: `discard:${card.id}`,
        kind: "discard",
        label: card.label,
        intent: { kind: "toggle-discard", cardId: card.id },
      });
    });
    return choices;
  }

  legalHumanActions(game).forEach((action) => {
    if (action.type === "pass") {
      choices.push({
        targetId: "pass",
        kind: "pass",
        label: "Pass",
        intent: { kind: "preview", selection: { type: "pass" } },
      });
      return;
    }
    if (action.type === "bid") {
      choices.push({
        targetId: `bid:${action.bid.level}:${action.bid.mode}`,
        kind: "bid",
        label: bidLabel(action.bid.level, action.bid.mode),
        intent: { kind: "preview", selection: { type: "bid", bid: action.bid } },
      });
      return;
    }
    if (action.type === "declare") {
      choices.push({
        targetId: `declare:${action.trump ?? "none"}`,
        kind: "declare",
        label: trumpLabel(action.trump),
        intent: { kind: "preview", selection: { type: "declaration", trump: action.trump } },
      });
      return;
    }
    if (action.type === "play") {
      const card = game.hands.south.find((candidate) => candidate.id === action.cardId);
      choices.push({
        targetId: `play:${action.cardId}`,
        kind: "play",
        label: card?.label ?? action.cardId,
        intent: { kind: "preview", selection: { type: "play", cardId: action.cardId } },
      });
      return;
    }
    if (action.type === "next-hand") {
      choices.push({
        targetId: "next-hand",
        kind: "next-hand",
        label: "Next hand",
        intent: { kind: "next-hand" },
      });
    }
  });

  return choices;
}

/**
 * Constructs the projection field by field. `state` is read here and not
 * captured: the returned object holds only primitives and freshly built records.
 */
export function buildXrTableProjection(
  state: TableInteractionState,
  identity: XrBuildIdentity,
): XrTableProjection {
  const game = state.game;
  const books = teamBooks(game);
  const southActing = game.turn === "south" && !game.paused;
  const legalIds = new Set(
    southActing && game.phase === "play"
      ? legalCards(game, "south").map((card) => card.id)
      : southActing && game.phase === "kitty"
        ? game.hands.south.map((card) => card.id)
        : [],
  );
  const previewedCardId =
    state.preview?.selection.type === "play" ? state.preview.selection.cardId : null;

  return {
    manifestId: identity.manifestId,
    buildShortSha: identity.buildShortSha,
    handNumber: game.handNumber,
    phase: game.phase,
    turn: game.turn,
    turnLabel: SEAT_LABELS[game.turn],
    dealer: game.dealer,
    dealerLabel: SEAT_LABELS[game.dealer],
    contract: contractView(game),
    publicTrick: publicTrick(game),
    scoreNorthSouth: game.scores["north-south"],
    scoreEastWest: game.scores["east-west"],
    booksNorthSouth: books["north-south"],
    booksEastWest: books["east-west"],
    southHand: game.hands.south.map((card) =>
      southCardView(card, legalIds, state.discardIds, previewedCardId),
    ),
    opponents: opponentViews(game),
    legalChoices: legalChoices(state),
    previewLabel: state.preview?.label ?? null,
    feedbackLine:
      state.lastReceipt && state.lastReceipt.outcome !== "accepted"
        ? state.lastReceipt.message
        : null,
    discardPicked: state.discardIds.length,
    discardTarget: DISCARD_PICK_TARGET,
    statusLine: game.status,
    summaryLine: game.summary,
    disabledNotices: MANIFEST_DISABLED_NOTICES.map((notice) => ({
      id: notice.id,
      label: notice.label,
      explanation: notice.explanation,
    })),
  };
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
