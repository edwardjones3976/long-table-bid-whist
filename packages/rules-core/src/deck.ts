// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Deck and deal. The 54-card deck and the seeded shuffle are the oracle's; the
 * deal order (twelve rounds, South first, six left for the kitty) is pinned by
 * the conformance suite against `newTable`.
 */
import { shuffledDeck } from "../../../src/game/engine";
import { SEATS, type Card, type Seat } from "./model";

export { createDeck, shuffledDeck } from "../../../src/game/engine";

export const CARDS_PER_SEAT = 12;
export const KITTY_SIZE = 6;

/** The per-hand seed the oracle derives from the table seed. */
export function handSeed(seed: string, handNumber: number): string {
  return `${seed}:${handNumber}`;
}

export interface Deal {
  hands: Record<Seat, Card[]>;
  kitty: Card[];
}

export function dealHand(seed: string, handNumber: number): Deal {
  const deck = shuffledDeck(handSeed(seed, handNumber));
  const hands: Record<Seat, Card[]> = { south: [], west: [], north: [], east: [] };
  for (let round = 0; round < CARDS_PER_SEAT; round += 1) {
    SEATS.forEach((seat) => hands[seat].push(deck.shift()!));
  }
  return { hands, kitty: deck };
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
