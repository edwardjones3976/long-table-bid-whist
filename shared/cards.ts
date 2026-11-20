export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export const SUITS: readonly Suit[] = ["clubs", "diamonds", "hearts", "spades"];

/** rank 2-14 with ace = 14; little joker = 15, big joker = 16. */
export interface Card {
  id: string;
  suit: Suit | "joker";
  rank: number;
}

export function standardDeck(jokers = false): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: `${suit}-${rank}`, suit, rank });
  }
  if (jokers) {
    deck.push({ id: "joker-little", suit: "joker", rank: 15 });
    deck.push({ id: "joker-big", suit: "joker", rank: 16 });
  }
  return deck;
}
