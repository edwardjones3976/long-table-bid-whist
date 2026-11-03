// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Room layout.
 *
 * Pure geometry: it turns an `XrTableProjection` into placed plates. It holds no
 * Three.js, no WebGL, and no game state, so the arrangement of the room can be
 * reasoned about and tested without a headset or a GL context.
 *
 * All coordinates are relative to the table root, whose world position comes
 * from the seated calibration. The player sits at +Z looking toward -Z.
 */
import type { XrTableProjection } from "../table/projection";
import {
  XR_CANCEL_TARGET,
  XR_CONFIRM_TARGET,
  XR_VIEW_TARGETS,
  type XrTargetAction,
} from "./targets";

export type XrPlacementKind =
  | "readout"
  | "choice"
  | "card"
  | "trick"
  | "opponent"
  | "fixed"
  | "view"
  | "notice";

export type XrPlacementState =
  | "idle"
  | "legal"
  | "illegal"
  | "selected"
  | "previewed"
  | "disabled";

export interface XrPlacement {
  /** Stable across frames so the scene can be rebuilt without flicker. */
  key: string;
  kind: XrPlacementKind;
  lines: string[];
  position: [number, number, number];
  rotation: [number, number, number];
  /** Plate width and height in metres. */
  size: [number, number];
  state: XrPlacementState;
  /** Suit colour for card faces; every other plate is neutral. */
  accent: "red" | "neutral";
  /** Null for anything a controller select must not activate. */
  action: XrTargetAction | null;
}

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
const UPRIGHT: [number, number, number] = [0, 0, 0];
const LEFT_PANEL: [number, number, number] = [0, 0.45, 0];
const RIGHT_PANEL: [number, number, number] = [0, -0.45, 0];

const CARD_SIZE: [number, number] = [0.085, 0.125];
const CHOICE_SIZE: [number, number] = [0.2, 0.1];
const CHOICE_ROW_Z = -0.34;
const CHOICE_ROWS = [0.34, 0.21];
const CHOICE_PER_ROW = 5;

const TRICK_SLOTS: Record<string, [number, number, number]> = {
  south: [0, 0.012, 0.11],
  north: [0, 0.012, -0.11],
  west: [-0.13, 0.012, 0],
  east: [0.13, 0.012, 0],
};

interface Slot {
  position: [number, number, number];
  rotation: [number, number, number];
}

const OPPONENT_SLOTS: Record<string, Slot> = {
  north: { position: [0, 0.14, -0.52], rotation: UPRIGHT },
  west: { position: [-0.72, 0.14, 0], rotation: LEFT_PANEL },
  east: { position: [0.72, 0.14, 0], rotation: RIGHT_PANEL },
};

function contractLine(projection: XrTableProjection): string {
  const contract = projection.contract;
  if (!contract) return "Contract: none yet";
  return `Contract: ${contract.level} ${contract.modeLabel} · ${contract.trumpLabel} · ${contract.bidderLabel}`;
}

/** The far board. Build identity is always on it, so the room can be attributed. */
function boardPlacement(projection: XrTableProjection): XrPlacement {
  const lines = [
    `THE LONG TABLE — ${projection.manifestId}`,
    `Build ${projection.buildShortSha}`,
    `Hand ${projection.handNumber} · ${projection.phase} · ${projection.turnLabel} to act`,
    contractLine(projection),
    `NS ${projection.scoreNorthSouth} (${projection.booksNorthSouth} books) · EW ${projection.scoreEastWest} (${projection.booksEastWest} books)`,
    projection.statusLine,
  ];
  if (projection.summaryLine) lines.push(projection.summaryLine);
  return {
    key: "readout:board",
    kind: "readout",
    lines,
    position: [0, 0.64, -0.76],
    rotation: UPRIGHT,
    size: [1.3, 0.62],
    state: "idle",
    accent: "neutral",
    action: null,
  };
}

/** The near prompt: what is pending, and why the last input was refused. */
function promptPlacement(projection: XrTableProjection): XrPlacement {
  const lines: string[] = [
    projection.previewLabel ? `Pending: ${projection.previewLabel}` : "Pending: nothing",
  ];
  if (projection.phase === "kitty") {
    lines.push(`Discards ${projection.discardPicked}/${projection.discardTarget}`);
  }
  if (projection.feedbackLine) lines.push(projection.feedbackLine);
  return {
    key: "readout:prompt",
    kind: "readout",
    lines,
    position: [0, 0.08, CHOICE_ROW_Z],
    rotation: UPRIGHT,
    size: [0.9, 0.12],
    state: "idle",
    accent: "neutral",
    action: null,
  };
}

function choicePlacements(projection: XrTableProjection): XrPlacement[] {
  // Card-shaped choices are the cards themselves, not extra plates.
  const plated = projection.legalChoices.filter(
    (choice) => choice.kind !== "play" && choice.kind !== "discard",
  );
  const pitch = CHOICE_SIZE[0] + 0.03;
  return plated.slice(0, CHOICE_ROWS.length * CHOICE_PER_ROW).map((choice, index) => {
    const row = Math.floor(index / CHOICE_PER_ROW);
    const column = index % CHOICE_PER_ROW;
    const inRow = Math.min(CHOICE_PER_ROW, plated.length - row * CHOICE_PER_ROW);
    const span = pitch * (inRow - 1);
    return {
      key: `choice:${choice.targetId}`,
      kind: "choice" as const,
      lines: [choice.label],
      position: [pitch * column - span / 2, CHOICE_ROWS[row], CHOICE_ROW_Z] as [
        number,
        number,
        number,
      ],
      rotation: UPRIGHT,
      size: CHOICE_SIZE,
      state: "legal" as const,
      accent: "neutral" as const,
      action: { type: "table" as const, intent: choice.intent },
    };
  });
}

function southHandPlacements(projection: XrTableProjection): XrPlacement[] {
  const hand = projection.southHand;
  const pitch = CARD_SIZE[0] + 0.012;
  const span = pitch * Math.max(0, hand.length - 1);
  // A card is selectable only if the projection also published a choice for it.
  const choiceByCardId = new Map(
    projection.legalChoices
      .filter((choice) => choice.kind === "play" || choice.kind === "discard")
      .map((choice) => [choice.targetId.slice(choice.targetId.indexOf(":") + 1), choice] as const),
  );
  return hand.map((card, index) => {
    const choice = choiceByCardId.get(card.cardId);
    const state: XrPlacementState = card.selectedForDiscard
      ? "selected"
      : card.previewed
        ? "previewed"
        : choice
          ? "legal"
          : "illegal";
    return {
      key: `card:${card.cardId}`,
      kind: "card",
      lines: [card.rankText, card.glyph],
      position: [pitch * index - span / 2, 0.012, 0.3],
      rotation: FLAT,
      size: CARD_SIZE,
      state,
      accent: card.red ? "red" : "neutral",
      action: choice ? { type: "table", intent: choice.intent } : null,
    };
  });
}

function trickPlacements(projection: XrTableProjection): XrPlacement[] {
  return projection.publicTrick.map((played) => ({
    key: `trick:${played.seat}`,
    kind: "trick" as const,
    lines: [played.rankText, played.glyph],
    position: TRICK_SLOTS[played.seat] ?? [0, 0.012, 0],
    rotation: FLAT,
    size: CARD_SIZE,
    state: "idle" as const,
    accent: played.red ? ("red" as const) : ("neutral" as const),
    action: null,
  }));
}

function opponentPlacements(projection: XrTableProjection): XrPlacement[] {
  return projection.opponents.map((opponent) => {
    const slot = OPPONENT_SLOTS[opponent.seat] ?? OPPONENT_SLOTS.north;
    return {
      key: `opponent:${opponent.seat}`,
      kind: "opponent" as const,
      // Count only. No opponent card identity exists in the projection to draw.
      lines: [opponent.seatLabel, `${opponent.cardCount} cards`],
      position: slot.position,
      rotation: slot.rotation,
      size: [0.3, 0.1] as [number, number],
      state: "idle" as const,
      accent: "neutral" as const,
      action: null,
    };
  });
}

/** Confirm and Cancel are always present and always distinct plates. */
function fixedPlacements(): XrPlacement[] {
  return [
    {
      key: `fixed:${XR_CONFIRM_TARGET.targetId}`,
      kind: "fixed",
      lines: [XR_CONFIRM_TARGET.label],
      position: [0.66, 0.24, 0.1],
      rotation: RIGHT_PANEL,
      size: [0.26, 0.12],
      state: "legal",
      accent: "neutral",
      action: XR_CONFIRM_TARGET.action,
    },
    {
      key: `fixed:${XR_CANCEL_TARGET.targetId}`,
      kind: "fixed",
      lines: [XR_CANCEL_TARGET.label],
      position: [0.66, 0.09, 0.1],
      rotation: RIGHT_PANEL,
      size: [0.26, 0.12],
      state: "legal",
      accent: "neutral",
      action: XR_CANCEL_TARGET.action,
    },
  ];
}

const VIEW_SLOTS: [number, number, number][] = [
  [-0.66, 0.31, 0.1],
  [-0.74, 0.2, 0.1],
  [-0.58, 0.2, 0.1],
  [-0.74, 0.09, 0.1],
  [-0.58, 0.09, 0.1],
];

function viewPlacements(): XrPlacement[] {
  return XR_VIEW_TARGETS.map((target, index) => ({
    key: `view:${target.targetId}`,
    kind: "view" as const,
    lines: [target.label],
    position: VIEW_SLOTS[index] ?? VIEW_SLOTS[0],
    rotation: LEFT_PANEL,
    size: [0.15, 0.09] as [number, number],
    state: "legal" as const,
    accent: "neutral" as const,
    action: target.action,
  }));
}

/**
 * Withheld Alpha 0.1 contracts. They are shown, never selectable, and carry the
 * single published explanation.
 */
function noticePlacements(projection: XrTableProjection): XrPlacement[] {
  return projection.disabledNotices.map((notice, index) => ({
    key: `notice:${notice.id}`,
    kind: "notice" as const,
    lines: [notice.label, notice.explanation],
    position: [-0.72, 0.34 - index * 0.14, -0.2] as [number, number, number],
    rotation: LEFT_PANEL,
    size: [0.44, 0.12] as [number, number],
    state: "disabled" as const,
    accent: "neutral" as const,
    action: null,
  }));
}

export function layoutRoom(projection: XrTableProjection): XrPlacement[] {
  return [
    boardPlacement(projection),
    promptPlacement(projection),
    ...noticePlacements(projection),
    ...choicePlacements(projection),
    ...southHandPlacements(projection),
    ...trickPlacements(projection),
    ...opponentPlacements(projection),
    ...fixedPlacements(),
    ...viewPlacements(),
  ];
}

/** Only placements carrying an action may ever be hit by a controller ray. */
export function selectablePlacements(placements: readonly XrPlacement[]): XrPlacement[] {
  return placements.filter((placement): placement is XrPlacement & { action: XrTargetAction } =>
    placement.action !== null,
  );
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
