// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | BEGIN]]
import type { Bid, Card, PlayerView, Suit } from "./model";
import { SUITS } from "./model";

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function chooseBid(view: PlayerView, legal: Bid[]): Bid | null {
  if (!legal.length) return null;
  const strength = view.hand.reduce((sum, card) => {
    if (card.suit === "joker") return sum + 5;
    return sum + Math.max(0, card.rank - 9);
  }, 0);
  if (strength < 16 && view.auction.length < 3) return null;
  const privateHandKey = view.hand
    .map((card) => card.id)
    .sort()
    .join(",");
  const index =
    hash(`${view.seat}:bid:${view.auction.length}:${privateHandKey}`) % Math.min(legal.length, 4);
  return legal[index];
}

export function chooseTrump(view: PlayerView): Suit {
  const score = Object.fromEntries(SUITS.map((suit) => [suit, 0])) as Record<Suit, number>;
  view.hand.forEach((card) => {
    if (card.suit !== "joker") score[card.suit] += 1 + Math.max(0, card.rank - 10);
  });
  return [...SUITS].sort((a, b) => score[b] - score[a] || a.localeCompare(b))[0];
}

export function chooseDiscards(view: PlayerView, count: number): Card[] {
  return [...view.hand]
    .sort((a, b) => {
      const aj = a.suit === "joker" ? 1 : 0;
      const bj = b.suit === "joker" ? 1 : 0;
      return aj - bj || a.rank - b.rank || a.id.localeCompare(b.id);
    })
    .slice(0, count);
}

export function choosePlay(view: PlayerView, legal: Card[]): Card {
  const mode = view.contract?.mode ?? "high";
  const lowWins = mode === "low" || mode === "no-trump-low";
  const sorted = [...legal].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  const legalKey = sorted.map((card) => card.id).join(",");
  const offset =
    hash(
      `${view.seat}:play:${view.completedTricks.length}:${view.currentTrick.length}:${legalKey}`,
    ) % Math.min(2, sorted.length);
  return lowWins ? sorted[Math.max(0, sorted.length - 1 - offset)] : sorted[offset];
}
// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | END]]
