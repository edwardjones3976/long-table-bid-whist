// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Presentation strings shared by the desktop surface, the interaction
 * controller, and the XR projection so both surfaces read identically.
 */
import type { Card, ContractMode, Seat, Suit } from "../game/model";
import type { TableSelection } from "./intent";

export const MODE_LABELS: Record<ContractMode, string> = {
  high: "High",
  low: "Low",
  "no-trump-high": "No Trump High",
  "no-trump-low": "No Trump Low",
};

export const SEAT_LABELS: Record<Seat, string> = {
  south: "South (You)",
  west: "West",
  north: "North",
  east: "East",
};

const RANK_TEXT: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

export function bidLabel(level: number, mode: ContractMode): string {
  return `${level} ${MODE_LABELS[mode]}`;
}

export function trumpLabel(trump: Suit | null): string {
  return trump ?? "No Trump";
}

/** Rank text derived from the card's structure, never parsed back out of a label. */
export function cardRankText(card: Card): string {
  if (card.suit === "joker") return card.joker === "big" ? "BJ" : "LJ";
  return RANK_TEXT[card.rank] ?? String(card.rank);
}

export function isRedCard(card: Card): boolean {
  return card.suit === "hearts" || card.suit === "diamonds";
}

export function selectionLabel(selection: TableSelection, cardLabel?: string): string {
  switch (selection.type) {
    case "pass":
      return "Pass";
    case "bid":
      return bidLabel(selection.bid.level, selection.bid.mode);
    case "declaration":
      return trumpLabel(selection.trump);
    case "play":
      return cardLabel ?? selection.cardId;
  }
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
