import type { Card, JokerCard, Rank, Seat, Suit, SuitedCard, Team } from "./types";
import { SUITS } from "./types";

const RANKS: readonly Rank[] = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
];

const SUIT_CODE: Readonly<Record<Suit, string>> = {
  clubs: "C",
  diamonds: "D",
  hearts: "H",
  spades: "S",
};

const RANK_LABEL: Readonly<Record<Rank, string>> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export function createDeck(): Card[] {
  const suited: SuitedCard[] = SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${SUIT_CODE[suit]}-${RANK_LABEL[rank]}`,
      kind: "suited" as const,
      suit,
      rank,
    })),
  );
  const jokers: JokerCard[] = [
    { id: "J-BIG", kind: "joker", joker: "big" },
    { id: "J-LITTLE", kind: "joker", joker: "little" },
  ];
  return [...suited, ...jokers];
}
/** FNV-1a gives stable string-to-uint32 seed conversion across runtimes. */
export function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Small deterministic PRNG; never used for security or gambling. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(seed: string | number): Card[] {
  const deck = createDeck();
  const random = mulberry32(hashSeed(seed));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

export function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

export function cardLabel(card: Card): string {
  if (card.kind === "joker") {
    return card.joker === "big" ? "Big Joker" : "Little Joker";
  }
  return `${RANK_LABEL[card.rank]} of ${card.suit}`;
}

export function suitOrder(suit: Suit): number {
  return SUITS.indexOf(suit);
}
