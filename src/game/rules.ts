import { teamOf } from "./cards";
import type {
  Bid,
  BidLevel,
  BidMode,
  Card,
  ContractBid,
  ContractDeclaration,
  HandSummary,
  PlayedCard,
  Seat,
  Suit,
  TableRules,
  Team,
} from "./types";

/**
 * A deliberately fixed first-table preset derived from Pagat's 54-card rules.
 * House-rule options belong in a later versioned manifest, never implicit UI
 * switches inside this engine.
 */
export const STRICT_TABLE_RULES: TableRules = Object.freeze({
  id: "strict-table-pagat-54-v1",
  name: "Strict Table (Pagat-derived 54-card)",
  deckSize: 54,
  handSize: 12,
  kittySize: 6,
  minimumBid: 3,
  maximumBid: 7,
  forcedDealerBid: true,
  kittyCountsAsBidderBook: true,
  noTrumpScoresDouble: true,
  downtownAceRanksFirst: true,
  targetScore: 7,
  losingScore: -7,
  source: "https://www.pagat.com/auctionwhist/bidwhist.html",
});

export function contractBid(level: BidLevel, mode: BidMode): ContractBid {
  return { kind: "contract", level, mode };
}
export function isHigherBid(candidate: ContractBid, current: ContractBid | null): boolean {
  if (current === null) return true;
  if (candidate.level !== current.level) return candidate.level > current.level;
  // Pagat: high and low are equal; no-trump alone can overcall either at the
  // same number. Nothing can overcall a no-trump at that same number.
  return candidate.mode === "no-trump" && current.mode !== "no-trump";
}

export function allContractBids(): ContractBid[] {
  const levels: BidLevel[] = [3, 4, 5, 6, 7];
  return levels.flatMap((level) => [
    contractBid(level, "high"),
    contractBid(level, "low"),
    contractBid(level, "no-trump"),
  ]);
}

export function legalBidChoices(
  highBid: ContractBid | null,
  mustBid: boolean,
): Bid[] {
  const contracts = allContractBids().filter((bid) => isHigherBid(bid, highBid));
  return mustBid ? contracts : [{ kind: "pass" }, ...contracts];
}

export function isDeclarationValid(
  bid: ContractBid,
  declaration: ContractDeclaration,
): boolean {
  if (bid.mode === "no-trump") return declaration.trump === null;
  return declaration.trump !== null && declaration.direction === bid.mode;
}

/** Suit a card follows. Jokers are trump in suit contracts and suitless in NT. */
export function effectiveSuit(
  card: Card,
  declaration: ContractDeclaration,
): Suit | null {
  if (card.kind === "suited") return card.suit;
  return declaration.trump;
}

export function ledSuitFor(
  trick: readonly PlayedCard[],
  declaration: ContractDeclaration,
): Suit | null {
  for (const play of trick) {
    const suit = effectiveSuit(play.card, declaration);
    if (suit !== null) return suit;
  }
  return null;
}

export function legalCardIds(
  hand: readonly Card[],
  trick: readonly PlayedCard[],
  declaration: ContractDeclaration,
): string[] {
  const ledSuit = ledSuitFor(trick, declaration);
  if (ledSuit === null) return hand.map((card) => card.id);
  const following = hand.filter(
    (card) => effectiveSuit(card, declaration) === ledSuit,
  );
  return (following.length > 0 ? following : hand).map((card) => card.id);
}

export function isLegalCardPlay(
  hand: readonly Card[],
  trick: readonly PlayedCard[],
  declaration: ContractDeclaration,
  cardId: string,
): boolean {
  return legalCardIds(hand, trick, declaration).includes(cardId);
}

/**
 * Larger values win within a suit. Downtown follows Pagat's ace-first order:
 * A, 2, 3, ... Q, K (rather than treating ace as the lowest card).
 */
export function suitedRankStrength(card: Card, direction: "high" | "low"): number {
  if (card.kind === "joker") return card.joker === "big" ? 100 : 99;
  if (direction === "high") return card.rank;
  return card.rank === 14 ? 14 : 15 - card.rank;
}

export function trickWinner(
  trick: readonly PlayedCard[],
  declaration: ContractDeclaration,
): Seat {
  if (trick.length === 0) throw new Error("Cannot determine an empty trick winner.");
  const ledSuit = ledSuitFor(trick, declaration);
  if (ledSuit === null) {
    // A four-card trick cannot contain only jokers in a two-joker deck, but
    // this deterministic fallback makes the helper total for malformed input.
    return trick[0].seat;
  }

  const hasTrump =
    declaration.trump !== null &&
    trick.some(
      (play) => effectiveSuit(play.card, declaration) === declaration.trump,
    );
  const winningSuit = hasTrump ? declaration.trump : ledSuit;
  const eligible = trick.filter(
    (play) => effectiveSuit(play.card, declaration) === winningSuit,
  );
  let winner = eligible[0];
  let best = suitedRankStrength(winner.card, declaration.direction);
  for (const play of eligible.slice(1)) {
    const strength = suitedRankStrength(play.card, declaration.direction);
    if (strength > best) {
      winner = play;
      best = strength;
    }
  }
  return winner.seat;
}

function gameWinner(scores: readonly [number, number], rules: TableRules): Team | null {
  if (scores[0] >= rules.targetScore || scores[1] <= rules.losingScore) return 0;
  if (scores[1] >= rules.targetScore || scores[0] <= rules.losingScore) return 1;
  return null;
}

export function scoreCompletedHand(args: {
  rules: TableRules;
  bidder: Seat;
  bid: ContractBid;
  declaration: ContractDeclaration;
  trickBooks: readonly [number, number];
  scoresBefore: readonly [number, number];
}): HandSummary {
  const { rules, bidder, bid, declaration, trickBooks, scoresBefore } = args;
  const biddingTeam = teamOf(bidder);
  const books: [number, number] = [trickBooks[0], trickBooks[1]];
  if (rules.kittyCountsAsBidderBook) books[biddingTeam] += 1;
  const targetBooks = 6 + bid.level;
  const made = books[biddingTeam] >= targetBooks;
  const rawPoints = made ? books[biddingTeam] - 6 : -bid.level;
  const multiplier: 1 | 2 = bid.mode === "no-trump" ? 2 : 1;
  const scoreDelta: [number, number] = [0, 0];
  scoreDelta[biddingTeam] = rawPoints * multiplier;
  const scoreAfter: [number, number] = [
    scoresBefore[0] + scoreDelta[0],
    scoresBefore[1] + scoreDelta[1],
  ];

  return {
    bidder,
    biddingTeam,
    bid,
    declaration,
    tricks: [trickBooks[0], trickBooks[1]],
    books,
    targetBooks,
    made,
    rawPoints,
    multiplier,
    scoreDelta,
    scoreBefore: [scoresBefore[0], scoresBefore[1]],
    scoreAfter,
    gameWinner: gameWinner(scoreAfter, rules),
  };
}
