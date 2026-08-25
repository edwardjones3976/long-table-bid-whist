// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | BEGIN]]
import { chooseBid, chooseDiscards, choosePlay, chooseTrump } from "./ai";
import {
  MANIFEST_ID,
  SEATS,
  SUITS,
  nextSeat,
  teamFor,
  type ActionResult,
  type AuctionEntry,
  type Bid,
  type Card,
  type ContractMode,
  type GameState,
  type HumanAction,
  type PlayedCard,
  type PlayerView,
  type Seat,
  type Suit,
  type Team,
} from "./model";

const MODE_ORDER: ContractMode[] = ["low", "high", "no-trump-low", "no-trump-high"];
const PROVISIONAL_ENABLED_MODES: ContractMode[] = ["low", "high"];
const RANK_LABELS: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

function seedHash(seed: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

function randomSequence(seed: string): () => number {
  let value = seedHash(seed) || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeck(): Card[] {
  const glyph: Record<Suit, string> = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    for (let rank = 2; rank <= 14; rank += 1) {
      const face = RANK_LABELS[rank] ?? String(rank);
      deck.push({ id: `${suit}-${rank}`, suit, rank, label: `${face}${glyph[suit]}`, glyph: glyph[suit] });
    }
  });
  deck.push({ id: "joker-little", suit: "joker", rank: 15, label: "Little Joker", glyph: "★", joker: "little" });
  deck.push({ id: "joker-big", suit: "joker", rank: 16, label: "Big Joker", glyph: "✦", joker: "big" });
  return deck;
}

export function shuffledDeck(seed: string): Card[] {
  const deck = createDeck();
  const random = randomSequence(seed);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function emptyHands(): Record<Seat, Card[]> {
  return { south: [], west: [], north: [], east: [] };
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function log(state: GameState, text: string): void {
  state.events.push({ id: state.events.length + 1, text });
  if (state.events.length > 80) state.events = state.events.slice(-80);
  state.status = text;
}

function deal(seed: string): { hands: Record<Seat, Card[]>; kitty: Card[] } {
  const deck = shuffledDeck(seed);
  const hands = emptyHands();
  for (let round = 0; round < 12; round += 1) {
    SEATS.forEach((seat) => hands[seat].push(deck.shift()!));
  }
  return { hands, kitty: deck };
}

export function newTable(
  seed = "long-table-001",
  scores: Record<Team, number> = { "north-south": 0, "east-west": 0 },
  dealer: Seat = "east",
  handNumber = 1,
): GameState {
  const dealt = deal(`${seed}:${handNumber}`);
  const state: GameState = {
    manifestId: MANIFEST_ID,
    seed,
    handNumber,
    phase: "auction",
    dealer,
    turn: nextSeat(dealer),
    hands: dealt.hands,
    kitty: dealt.kitty,
    discardPile: [],
    auction: [],
    contract: null,
    currentTrick: [],
    completedTricks: [],
    tricksWon: { south: 0, west: 0, north: 0, east: 0 },
    scores: { ...scores },
    events: [],
    status: `Hand ${handNumber}. ${nextSeat(dealer)} opens the auction.`,
    summary: null,
    paused: false,
  };
  state.events.push({ id: 1, text: state.status });
  return advanceAutomations(state);
}

export function makePlayerView(state: GameState, seat: Seat): PlayerView {
  return {
    seat,
    phase: state.phase,
    turn: state.turn,
    hand: state.hands[seat].map((card) => ({ ...card })),
    dealer: state.dealer,
    auction: structuredClone(state.auction),
    contract: state.contract ? { ...state.contract } : null,
    currentTrick: structuredClone(state.currentTrick),
    completedTricks: structuredClone(state.completedTricks),
    tricksWon: { ...state.tricksWon },
    scores: { ...state.scores },
  };
}

function bidValue(bid: Bid): number {
  return bid.level * 10 + MODE_ORDER.indexOf(bid.mode);
}

export function legalBids(state: GameState): Bid[] {
  const high = state.auction.filter((entry) => entry.bid).map((entry) => entry.bid!).sort((a, b) => bidValue(b) - bidValue(a))[0];
  const result: Bid[] = [];
  for (let level = 3; level <= 6; level += 1) {
    PROVISIONAL_ENABLED_MODES.forEach((mode) => {
      const bid = { level: level as Bid["level"], mode };
      if (!high || bidValue(bid) > bidValue(high)) result.push(bid);
    });
  }
  return result;
}

function canPass(state: GameState): boolean {
  const isLastDealerTurn = state.auction.length === 3 && state.turn === state.dealer;
  return !(isLastDealerTurn && state.auction.every((entry) => !entry.bid));
}

function completeAuction(state: GameState): void {
  const winning = state.auction.filter((entry): entry is AuctionEntry & { bid: Bid } => Boolean(entry.bid)).sort((a, b) => bidValue(b.bid) - bidValue(a.bid))[0];
  if (!winning) throw new Error("Forced dealer invariant failed");
  state.contract = { ...winning.bid, bidder: winning.seat, trump: null };
  state.phase = "declaration";
  state.turn = winning.seat;
  log(state, `${winning.seat} wins ${winning.bid.level} ${modeLabel(winning.bid.mode)} and must declare.`);
}

function recordBid(state: GameState, seat: Seat, bid: Bid | null): void {
  state.auction.push({ seat, bid: bid ? { ...bid } : null });
  log(state, bid ? `${seat} bids ${bid.level} ${modeLabel(bid.mode)}.` : `${seat} passes.`);
  if (state.auction.length === 4) completeAuction(state);
  else state.turn = nextSeat(seat);
}

function modeLabel(mode: ContractMode): string {
  return mode.replaceAll("-", " ");
}

function declare(state: GameState, trump: Suit | null): void {
  if (!state.contract) throw new Error("Missing contract");
  const noTrump = state.contract.mode.startsWith("no-trump");
  if (noTrump && trump !== null) throw new Error("No-trump contract cannot declare a suit");
  if (!noTrump && !trump) throw new Error("Trump suit required");
  state.contract.trump = trump;
  state.hands[state.contract.bidder].push(...state.kitty);
  state.kitty = [];
  state.phase = "kitty";
  state.turn = state.contract.bidder;
  log(state, `${state.contract.bidder} declares ${trump ?? modeLabel(state.contract.mode)} and takes the kitty.`);
}

function discard(state: GameState, cardIds: string[]): void {
  if (!state.contract) throw new Error("Missing contract");
  if (cardIds.length !== 6 || new Set(cardIds).size !== 6) throw new Error("Choose exactly six different cards");
  const hand = state.hands[state.contract.bidder];
  const cards = cardIds.map((id) => hand.find((card) => card.id === id));
  if (cards.some((card) => !card)) throw new Error("Discard must come from the bidder hand");
  state.discardPile = cards as Card[];
  state.hands[state.contract.bidder] = hand.filter((card) => !cardIds.includes(card.id));
  if (state.hands[state.contract.bidder].length !== 12) throw new Error("Bidder must retain twelve cards");
  state.phase = "play";
  state.turn = state.contract.bidder;
  log(state, `${state.contract.bidder} closes the kitty. Opening lead.`);
}

function effectiveSuit(card: Card, state: GameState): Suit | "joker" {
  if (card.suit === "joker" && state.contract?.trump) return state.contract.trump;
  return card.suit;
}

export function legalCards(state: GameState, seat: Seat): Card[] {
  const hand = state.hands[seat];
  if (!state.currentTrick.length) return [...hand];
  const ledSuit = effectiveSuit(state.currentTrick[0].card, state);
  const following = hand.filter((card) => effectiveSuit(card, state) === ledSuit);
  return following.length ? following : [...hand];
}

function trickPower(card: Card, ledSuit: Suit | "joker", state: GameState): number {
  const suit = effectiveSuit(card, state);
  const trump = state.contract?.trump;
  const isTrump = Boolean(trump && suit === trump);
  const follows = suit === ledSuit;
  if (!isTrump && !follows) return -100 + card.rank;
  const lowWins = state.contract?.mode === "low" || state.contract?.mode === "no-trump-low";
  let rank = lowWins ? 20 - card.rank : card.rank;
  if (card.suit === "joker" && trump) rank = card.joker === "big" ? 40 : 39;
  return (isTrump ? 100 : 0) + rank;
}

function resolveTrick(state: GameState): void {
  const cards = state.currentTrick;
  const ledSuit = effectiveSuit(cards[0].card, state);
  const winner = [...cards].sort((a, b) => trickPower(b.card, ledSuit, state) - trickPower(a.card, ledSuit, state))[0].seat;
  state.tricksWon[winner] += 1;
  state.completedTricks.push({ number: state.completedTricks.length + 1, lead: cards[0].seat, winner, cards: structuredClone(cards) });
  state.currentTrick = [];
  state.turn = winner;
  log(state, `${winner} takes trick ${state.completedTricks.length}.`);
  if (state.completedTricks.length === 12) scoreHand(state);
}

function play(state: GameState, seat: Seat, cardId: string): void {
  const card = state.hands[seat].find((candidate) => candidate.id === cardId);
  if (!card) throw new Error("Card is not in the acting hand");
  if (!legalCards(state, seat).some((candidate) => candidate.id === cardId)) throw new Error("Follow suit");
  state.hands[seat] = state.hands[seat].filter((candidate) => candidate.id !== cardId);
  state.currentTrick.push({ seat, card });
  log(state, `${seat} plays ${card.label}.`);
  if (state.currentTrick.length === 4) resolveTrick(state);
  else state.turn = nextSeat(seat);
}

function scoreHand(state: GameState): void {
  if (!state.contract) throw new Error("Missing contract");
  const declaringTeam = teamFor(state.contract.bidder);
  const teamTricks = SEATS.filter((seat) => teamFor(seat) === declaringTeam).reduce((sum, seat) => sum + state.tricksWon[seat], 0);
  const target = 6 + state.contract.level;
  const made = teamTricks >= target;
  state.scores[declaringTeam] += made ? state.contract.level : -state.contract.level;
  state.phase = "summary";
  state.turn = "south";
  state.summary = `${declaringTeam} ${made ? "made" : "was set on"} ${state.contract.level} ${modeLabel(state.contract.mode)} with ${teamTricks} tricks. Score ${state.scores["north-south"]}–${state.scores["east-west"]}.`;
  log(state, state.summary);
}

function performAI(state: GameState): void {
  const seat = state.turn;
  const view = makePlayerView(state, seat);
  if (state.phase === "auction") {
    const options = legalBids(state);
    const selected = chooseBid(view, options);
    recordBid(state, seat, selected ?? (canPass(state) ? null : options[0]));
  } else if (state.phase === "declaration") {
    const noTrump = state.contract?.mode.startsWith("no-trump");
    declare(state, noTrump ? null : chooseTrump(view));
  } else if (state.phase === "kitty") {
    discard(state, chooseDiscards(makePlayerView(state, seat), 6).map((card) => card.id));
  } else if (state.phase === "play") {
    const options = legalCards(state, seat);
    play(state, seat, choosePlay(view, options).id);
  }
}

export function advanceAutomations(input: GameState): GameState {
  const state = cloneState(input);
  let guard = 0;
  while (state.phase !== "summary" && state.turn !== "south" && !state.paused) {
    performAI(state);
    guard += 1;
    if (guard > 160) throw new Error("AI advancement guard exceeded");
  }
  return state;
}

export function legalHumanActions(state: GameState): HumanAction[] {
  if (state.paused || state.turn !== "south") return [];
  if (state.phase === "auction") {
    const actions: HumanAction[] = legalBids(state).map((bid) => ({ type: "bid", bid }));
    if (canPass(state)) actions.unshift({ type: "pass" });
    return actions;
  }
  if (state.phase === "declaration") {
    if (state.contract?.mode.startsWith("no-trump")) return [{ type: "declare", trump: null }];
    return SUITS.map((trump) => ({ type: "declare", trump }));
  }
  if (state.phase === "play") return legalCards(state, "south").map((card) => ({ type: "play", cardId: card.id }));
  if (state.phase === "summary") return [{ type: "next-hand" }];
  return [];
}

export function applyHumanAction(input: GameState, action: HumanAction): ActionResult {
  const state = cloneState(input);
  if (state.paused) return { state, error: "Table is paused" };
  if (state.turn !== "south" && action.type !== "next-hand") return { state, error: "Wait for your turn" };
  try {
    if (action.type === "pass" && state.phase === "auction" && canPass(state)) recordBid(state, "south", null);
    else if (action.type === "bid" && state.phase === "auction" && legalBids(state).some((bid) => bidValue(bid) === bidValue(action.bid))) recordBid(state, "south", action.bid);
    else if (action.type === "declare" && state.phase === "declaration") declare(state, action.trump);
    else if (action.type === "discard" && state.phase === "kitty") discard(state, action.cardIds);
    else if (action.type === "play" && state.phase === "play") play(state, "south", action.cardId);
    else if (action.type === "next-hand" && state.phase === "summary") return { state: newTable(state.seed, state.scores, nextSeat(state.dealer), state.handNumber + 1) };
    else return { state, error: "That action is not legal now" };
    return { state: advanceAutomations(state) };
  } catch (error) {
    return { state: input, error: error instanceof Error ? error.message : "Action failed" };
  }
}

export function applyHumanDiscard(input: GameState, cardIds: string[]): ActionResult {
  return applyHumanAction(input, { type: "discard", cardIds });
}

export function togglePause(input: GameState): GameState {
  const state = cloneState(input);
  state.paused = !state.paused;
  log(state, state.paused ? "Host requested a table pause." : "Table resumed.");
  return state.paused ? state : advanceAutomations(state);
}

export function publicDigest(state: GameState): string {
  const publicState = {
    manifestId: state.manifestId,
    handNumber: state.handNumber,
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    handCounts: Object.fromEntries(SEATS.map((seat) => [seat, state.hands[seat].length])),
    auction: state.auction,
    contract: state.contract,
    currentTrick: state.currentTrick,
    completedTricks: state.completedTricks,
    tricksWon: state.tricksWon,
    scores: state.scores,
    summary: state.summary,
  };
  const text = JSON.stringify(publicState);
  return seedHash(text).toString(16).padStart(8, "0");
}
// [[Codex | GPT-5.6 | 2026-08-25 | 03:10 UTC | END]]
