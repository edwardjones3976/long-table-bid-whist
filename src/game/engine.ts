import { nextSeat, shuffleDeck, teamOf } from "./cards";
import {
  STRICT_TABLE_RULES,
  isDeclarationValid,
  isHigherBid,
  isLegalCardPlay,
  scoreCompletedHand,
  trickWinner,
} from "./rules";
import type {
  AiView,
  BidRecord,
  Card,
  ContractBid,
  CreateHandOptions,
  GameAction,
  HandState,
  Hands,
  PublicHandState,
  Seat,
  TrickRecord,
} from "./types";

function withError(state: HandState, message: string): HandState {
  return { ...state, lastError: message };
}

function isSeat(value: number): value is Seat {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

function cloneHands(hands: Hands): Hands {
  return [hands[0].slice(), hands[1].slice(), hands[2].slice(), hands[3].slice()];
}

function findWinningBidder(records: readonly BidRecord[]): Seat | null {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index].bid.kind === "contract") return records[index].seat;
  }
  return null;
}

export function createHand(options: CreateHandOptions): HandState {
  const dealer = options.dealer ?? 0;
  if (!isSeat(dealer)) throw new Error("Dealer must be seat 0, 1, 2, or 3.");
  const seed = String(options.seed);
  const deck = shuffleDeck(seed);
  const hands: Hands = [[], [], [], []];

  // Deal clockwise one card at a time. The last six become the concealed kitty.
  for (let index = 0; index < 48; index += 1) {
    const seat = (index % 4) as Seat;
    hands[seat].push(deck[index]);
  }

  return {
    rules: STRICT_TABLE_RULES,
    seed,
    phase: "bidding",
    dealer,
    turn: nextSeat(dealer),
    hands,
    kitty: deck.slice(48),
    buried: [],
    bids: [],
    highBid: null,
    bidder: null,
    declaration: null,
    currentTrick: [],
    completedTricks: [],
    trickBooks: [0, 0],
    scoresBefore: options.scores
      ? [options.scores[0], options.scores[1]]
      : [0, 0],
    summary: null,
    lastError: null,
  };
}

function reduceBid(state: HandState, action: Extract<GameAction, { type: "BID" }>): HandState {
  if (state.phase !== "bidding") return withError(state, "Bidding is closed.");
  if (action.seat !== state.turn) return withError(state, "It is not that seat's turn to bid.");
  if (state.bids.some((record) => record.seat === action.seat)) {
    return withError(state, "Each seat bids only once.");
  }

  const dealerMustBid =
    action.seat === state.dealer &&
    state.bids.length === 3 &&
    state.highBid === null;
  let bid = action.bid;
  let forced = false;
  if (bid.kind === "pass" && dealerMustBid) {
    bid = { kind: "contract", level: 3, mode: "high" };
    forced = true;
  }
  if (bid.kind === "contract") {
    if (bid.level < 3 || bid.level > 7) return withError(state, "Bid level must be 3 through 7.");
    if (!isHigherBid(bid, state.highBid)) return withError(state, "That bid does not outrank the current bid.");
  }

  const bids: BidRecord[] = [...state.bids, { seat: action.seat, bid, forced }];
  const highBid: ContractBid | null = bid.kind === "contract" ? bid : state.highBid;
  if (bids.length < 4) {
    return {
      ...state,
      bids,
      highBid,
      turn: nextSeat(action.seat),
      lastError: null,
    };
  }

  const bidder = findWinningBidder(bids);
  // Forced dealer makes this unreachable for valid play; keep the invariant
  // fail-closed if a malformed state reaches the reducer.
  if (bidder === null || highBid === null) {
    return withError(state, "Auction ended without a contract.");
  }
  return {
    ...state,
    phase: "declaring",
    bids,
    highBid,
    bidder,
    turn: bidder,
    lastError: null,
  };
}

function reduceDeclare(
  state: HandState,
  action: Extract<GameAction, { type: "DECLARE" }>,
): HandState {
  if (state.phase !== "declaring" || state.bidder === null || state.highBid === null) {
    return withError(state, "There is no contract to declare.");
  }
  if (action.seat !== state.bidder || action.seat !== state.turn) {
    return withError(state, "Only the successful bidder can declare.");
  }
  if (!isDeclarationValid(state.highBid, action.declaration)) {
    return withError(state, "Declaration does not match the winning bid.");
  }

  const hands = cloneHands(state.hands);
  hands[action.seat] = [...hands[action.seat], ...state.kitty];
  return {
    ...state,
    phase: "discarding",
    hands,
    kitty: [],
    declaration: action.declaration,
    lastError: null,
  };
}

function reduceDiscard(
  state: HandState,
  action: Extract<GameAction, { type: "DISCARD" }>,
): HandState {
  if (state.phase !== "discarding" || state.bidder === null) {
    return withError(state, "The hand is not waiting for a discard.");
  }
  if (action.seat !== state.bidder || action.seat !== state.turn) {
    return withError(state, "Only the bidder can discard.");
  }
  if (action.cardIds.length !== state.rules.kittySize) {
    return withError(state, `Discard exactly ${state.rules.kittySize} cards.`);
  }
  if (new Set(action.cardIds).size !== action.cardIds.length) {
    return withError(state, "Discard contains a duplicate card.");
  }
  const selected = new Set(action.cardIds);
  const hand = state.hands[action.seat];
  const buried = hand.filter((card) => selected.has(card.id));
  if (buried.length !== state.rules.kittySize) {
    return withError(state, "Every discarded card must be in the bidder's hand.");
  }

  const hands = cloneHands(state.hands);
  hands[action.seat] = hand.filter((card) => !selected.has(card.id));
  return {
    ...state,
    phase: "playing",
    hands,
    buried,
    turn: action.seat,
    lastError: null,
  };
}

function reducePlay(state: HandState, action: Extract<GameAction, { type: "PLAY" }>): HandState {
  if (state.phase !== "playing" || state.declaration === null) {
    return withError(state, "Cards cannot be played now.");
  }
  if (action.seat !== state.turn) return withError(state, "It is not that seat's turn to play.");
  const hand = state.hands[action.seat];
  const card = hand.find((candidate) => candidate.id === action.cardId);
  if (!card) return withError(state, "That card is not in the acting seat's hand.");
  if (!isLegalCardPlay(hand, state.currentTrick, state.declaration, action.cardId)) {
    return withError(state, "Follow the led suit when able.");
  }

  const hands = cloneHands(state.hands);
  hands[action.seat] = hand.filter((candidate) => candidate.id !== action.cardId);
  const currentTrick = [...state.currentTrick, { seat: action.seat, card }];
  if (currentTrick.length < 4) {
    return {
      ...state,
      hands,
      currentTrick,
      turn: nextSeat(action.seat),
      lastError: null,
    };
  }

  const winner = trickWinner(currentTrick, state.declaration);
  const trick: TrickRecord = {
    index: state.completedTricks.length,
    leader: currentTrick[0].seat,
    plays: currentTrick,
    ledSuit: (() => {
      for (const play of currentTrick) {
        if (play.card.kind === "suited") return play.card.suit;
        if (state.declaration?.trump !== null) return state.declaration.trump;
      }
      return null;
    })(),
    winner,
  };
  const completedTricks = [...state.completedTricks, trick];
  const trickBooks: [number, number] = [state.trickBooks[0], state.trickBooks[1]];
  trickBooks[teamOf(winner)] += 1;

  if (completedTricks.length < state.rules.handSize) {
    return {
      ...state,
      hands,
      currentTrick: [],
      completedTricks,
      trickBooks,
      turn: winner,
      lastError: null,
    };
  }

  if (state.bidder === null || state.highBid === null) {
    return withError(state, "Completed play is missing its contract.");
  }
  const summary = scoreCompletedHand({
    rules: state.rules,
    bidder: state.bidder,
    bid: state.highBid,
    declaration: state.declaration,
    trickBooks,
    scoresBefore: state.scoresBefore,
  });
  return {
    ...state,
    phase: "complete",
    hands,
    currentTrick: [],
    completedTricks,
    trickBooks,
    turn: winner,
    summary,
    lastError: null,
  };
}

/** Pure React-compatible reducer. Invalid actions preserve play state and expose an error. */
export function bidWhistReducer(state: HandState, action: GameAction): HandState {
  switch (action.type) {
    case "BID":
      return reduceBid(state, action);
    case "DECLARE":
      return reduceDeclare(state, action);
    case "DISCARD":
      return reduceDiscard(state, action);
    case "PLAY":
      return reducePlay(state, action);
    case "CLEAR_ERROR":
      return state.lastError === null ? state : { ...state, lastError: null };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function publicState(state: HandState): PublicHandState {
  return {
    rules: state.rules,
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    handCounts: [
      state.hands[0].length,
      state.hands[1].length,
      state.hands[2].length,
      state.hands[3].length,
    ],
    bids: state.bids,
    highBid: state.highBid,
    bidder: state.bidder,
    declaration: state.declaration,
    currentTrick: state.currentTrick,
    completedTricks: state.completedTricks,
    trickBooks: state.trickBooks,
    scoresBefore: state.scoresBefore,
    summary: state.summary,
  };
}

/** Seat projection prevents AI/UI callers from receiving any opponent hand or kitty. */
export function projectForSeat(state: HandState, seat: Seat): AiView {
  return {
    seat,
    hand: state.hands[seat].slice(),
    publicState: publicState(state),
  };
}

export function replayHand(options: CreateHandOptions, actions: readonly GameAction[]): HandState {
  return actions.reduce(bidWhistReducer, createHand(options));
}

export function cardsInAuthority(state: HandState): Card[] {
  return [
    ...state.hands[0],
    ...state.hands[1],
    ...state.hands[2],
    ...state.hands[3],
    ...state.kitty,
    ...state.buried,
    ...state.currentTrick.map((play) => play.card),
    ...state.completedTricks.flatMap((trick) => trick.plays.map((play) => play.card)),
  ];
}
