import { partnerOf, suitOrder } from "./cards";
import { bidWhistReducer, projectForSeat } from "./engine";
import {
  allContractBids,
  isHigherBid,
  legalBidChoices,
  legalCardIds,
  suitedRankStrength,
  trickWinner,
} from "./rules";
import type {
  AiView,
  AutoplayOptions,
  AutoplayResult,
  Bid,
  BidMode,
  Card,
  ContractBid,
  ContractDeclaration,
  Direction,
  GameAction,
  HandState,
  Seat,
  Suit,
} from "./types";
import { SEATS, SUITS } from "./types";

function compareCardIds(left: Card, right: Card): number {
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function isHandState(value: AiView | HandState): value is HandState {
  return "hands" in value;
}

export function legalBids(subject: AiView | HandState): Bid[] {
  const publicState = isHandState(subject) ? subject : subject.publicState;
  const seat = isHandState(subject) ? subject.turn : subject.seat;
  if (publicState.phase !== "bidding" || publicState.turn !== seat) return [];
  const mustBid =
    seat === publicState.dealer &&
    publicState.bids.length === 3 &&
    publicState.highBid === null;
  return legalBidChoices(publicState.highBid, mustBid);
}

function highCardValue(card: Card): number {
  if (card.kind === "joker") return 3.4;
  if (card.rank === 14) return 2.2;
  if (card.rank === 13) return 1.45;
  if (card.rank === 12) return 0.85;
  if (card.rank === 11) return 0.4;
  return 0;
}

function lowCardValue(card: Card): number {
  if (card.kind === "joker") return 3.4;
  if (card.rank === 14) return 2.2;
  if (card.rank === 2) return 1.6;
  if (card.rank === 3) return 1.05;
  if (card.rank === 4) return 0.65;
  if (card.rank === 5) return 0.25;
  return 0;
}

function suitBidScore(hand: readonly Card[], suit: Suit, direction: Direction): number {
  const suited = hand.filter(
    (card): card is Extract<Card, { kind: "suited" }> =>
      card.kind === "suited" && card.suit === suit,
  );
  const jokers = hand.filter((card) => card.kind === "joker");
  const cardValue = direction === "high" ? highCardValue : lowCardValue;
  const shape = Math.max(0, suited.length - 3) * 0.9;
  return [...suited, ...jokers].reduce((sum, card) => sum + cardValue(card), 0) + shape;
}

function noTrumpScore(hand: readonly Card[], direction: Direction): number {
  const cardValue = direction === "high" ? highCardValue : lowCardValue;
  const suited = hand.filter((card) => card.kind === "suited");
  const counts = SUITS.map(
    (suit) => suited.filter((card) => card.kind === "suited" && card.suit === suit).length,
  );
  const balance = Math.min(...counts) >= 2 ? 1.1 : 0;
  // Jokers cannot win in no-trump and therefore add no bid strength.
  return suited.reduce((sum, card) => sum + cardValue(card), 0) + balance;
}

function strongestMode(hand: readonly Card[]): { mode: BidMode; score: number } {
  const candidates: { mode: BidMode; score: number }[] = [
    {
      mode: "high",
      score: Math.max(...SUITS.map((suit) => suitBidScore(hand, suit, "high"))),
    },
    {
      mode: "low",
      score: Math.max(...SUITS.map((suit) => suitBidScore(hand, suit, "low"))),
    },
    {
      mode: "no-trump",
      score: Math.max(noTrumpScore(hand, "high"), noTrumpScore(hand, "low")),
    },
  ];
  // Stable tie order deliberately favors high, then low, then no-trump.
  return candidates.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  );
}

function supportedLevel(score: number): 3 | 4 | 5 | 6 | 7 | null {
  if (score >= 13) return 7;
  if (score >= 11) return 6;
  if (score >= 9) return 5;
  if (score >= 7) return 4;
  if (score >= 5.25) return 3;
  return null;
}

export function chooseAiBid(view: AiView): Bid {
  const choices = legalBids(view);
  if (choices.length === 0) return { kind: "pass" };
  const contracts = choices.filter(
    (bid): bid is ContractBid => bid.kind === "contract",
  );
  const assessment = strongestMode(view.hand);
  const maximum = supportedLevel(assessment.score);
  if (maximum !== null) {
    // Select the highest supported legal contract in the preferred mode. If a
    // same-level high/low tie blocks it, do not leak information by adapting to
    // unseen hands; pass unless a higher supported number is available.
    const preferred = contracts
      .filter((bid) => bid.mode === assessment.mode && bid.level <= maximum)
      .at(-1);
    if (preferred) return preferred;
  }
  const pass = choices.find((bid) => bid.kind === "pass");
  if (pass) return pass;
  // Forced dealer: deterministic minimum high is the Strict Table default.
  return contracts.find((bid) => bid.level === 3 && bid.mode === "high") ?? contracts[0];
}

function strongestSuit(hand: readonly Card[], direction: Direction): Suit {
  return SUITS.reduce((best, suit) => {
    const difference = suitBidScore(hand, suit, direction) - suitBidScore(hand, best, direction);
    return difference > 0 ? suit : best;
  });
}

export function chooseAiDeclaration(view: AiView): ContractDeclaration {
  const bid = view.publicState.highBid;
  if (!bid) throw new Error("AI cannot declare without a winning bid.");
  if (bid.mode === "no-trump") {
    const high = noTrumpScore(view.hand, "high");
    const low = noTrumpScore(view.hand, "low");
    return { direction: low > high ? "low" : "high", trump: null };
  }
  return { direction: bid.mode, trump: strongestSuit(view.hand, bid.mode) };
}

function cardKeepValue(
  card: Card,
  declaration: ContractDeclaration,
  hand: readonly Card[],
): number {
  if (card.kind === "joker") {
    return declaration.trump === null
      ? -100
      : card.joker === "big"
        ? 400
        : 390;
  }
  const strength = suitedRankStrength(card, declaration.direction);
  const length = hand.filter(
    (candidate) => candidate.kind === "suited" && candidate.suit === card.suit,
  ).length;
  const trumpBonus = card.suit === declaration.trump ? 200 : 0;
  return trumpBonus + strength * 4 + length;
}

export function chooseAiDiscard(view: AiView): string[] {
  const declaration = view.publicState.declaration;
  if (!declaration) throw new Error("AI cannot discard before a declaration.");
  return [...view.hand]
    .sort((left, right) => {
      const valueDifference =
        cardKeepValue(left, declaration, view.hand) -
        cardKeepValue(right, declaration, view.hand);
      return valueDifference !== 0 ? valueDifference : compareCardIds(left, right);
    })
    .slice(0, view.publicState.rules.kittySize)
    .map((card) => card.id);
}

function playValue(card: Card, declaration: ContractDeclaration): number {
  if (card.kind === "joker") {
    if (declaration.trump === null) return -100;
    return card.joker === "big" ? 500 : 490;
  }
  const trumpBonus = card.suit === declaration.trump ? 200 : 0;
  return trumpBonus + suitedRankStrength(card, declaration.direction) * 4 + suitOrder(card.suit);
}

export function chooseAiPlay(view: AiView): string {
  const declaration = view.publicState.declaration;
  if (!declaration) throw new Error("AI cannot play before a declaration.");
  const legalIds = legalCardIds(view.hand, view.publicState.currentTrick, declaration);
  const legal = view.hand
    .filter((card) => legalIds.includes(card.id))
    .sort((left, right) => {
      const difference = playValue(left, declaration) - playValue(right, declaration);
      return difference !== 0 ? difference : compareCardIds(left, right);
    });
  if (legal.length === 0) throw new Error("AI has no legal card to play.");

  const trick = view.publicState.currentTrick;
  if (trick.length > 0 && trickWinner(trick, declaration) === partnerOf(view.seat)) {
    return legal[0].id;
  }
  const cheapestWinner = legal.find(
    (card) =>
      trickWinner([...trick, { seat: view.seat, card }], declaration) === view.seat,
  );
  return (cheapestWinner ?? legal[0]).id;
}

export function chooseAiAction(view: AiView): GameAction | null {
  if (view.publicState.turn !== view.seat || view.publicState.phase === "complete") return null;
  switch (view.publicState.phase) {
    case "bidding":
      return { type: "BID", seat: view.seat, bid: chooseAiBid(view) };
    case "declaring":
      return {
        type: "DECLARE",
        seat: view.seat,
        declaration: chooseAiDeclaration(view),
      };
    case "discarding":
      return { type: "DISCARD", seat: view.seat, cardIds: chooseAiDiscard(view) };
    case "playing":
      return { type: "PLAY", seat: view.seat, cardId: chooseAiPlay(view) };
    default:
      return null;
  }
}

/** Advance until completion or until a non-AI seat needs to act. */
export function autoplayAiTurns(
  initialState: HandState,
  options: AutoplayOptions = {},
): AutoplayResult {
  const aiSeats = new Set(options.aiSeats ?? SEATS);
  const maxActions = options.maxActions ?? 128;
  let state = initialState;
  const actions: GameAction[] = [];

  while (state.phase !== "complete" && actions.length < maxActions) {
    if (!aiSeats.has(state.turn)) break;
    const action = chooseAiAction(projectForSeat(state, state.turn));
    if (!action) break;
    const next = bidWhistReducer(state, action);
    if (next.lastError !== null) {
      throw new Error(`AI produced an illegal action: ${next.lastError}`);
    }
    actions.push(action);
    state = next;
  }
  if (actions.length >= maxActions && state.phase !== "complete") {
    throw new Error(`Autoplay exceeded its ${maxActions}-action guard.`);
  }
  return { state, actions };
}

/** Convenience helper for a complete four-AI hand. */
export function autoplayHand(
  initialState: HandState,
  maxActions = 128,
): AutoplayResult {
  return autoplayAiTurns(initialState, { aiSeats: SEATS, maxActions });
}

/** Exposed for explainable-AI debug panels without exposing any hidden cards. */
export function aiBidAssessment(view: AiView): {
  readonly preferredMode: BidMode;
  readonly score: number;
  readonly supportedLevel: 3 | 4 | 5 | 6 | 7 | null;
  readonly legalContracts: readonly ContractBid[];
} {
  const assessment = strongestMode(view.hand);
  return {
    preferredMode: assessment.mode,
    score: assessment.score,
    supportedLevel: supportedLevel(assessment.score),
    legalContracts: allContractBids().filter((bid) =>
      isHigherBid(bid, view.publicState.highBid),
    ),
  };
}
