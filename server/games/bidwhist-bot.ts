/**
 * A simple, legal Bid Whist bot. It is handed only its own seat's view, so it
 * cannot use anything a human in that seat could not see.
 * shortcut: plays by rank alone with no card counting; upgrade when bot quality matters.
 */
import { SUITS, type Card, type Suit } from "../../shared/cards";
import type { Action, View } from "./bidwhist";

function longestSuit(hand: readonly Card[]): Suit {
  const count = (suit: Suit) => hand.filter((card) => card.suit === suit).length;
  return [...SUITS].sort((a, b) => count(b) - count(a))[0];
}

export function chooseAction(view: View): Action {
  const hand = view.hand ?? [];
  const legal = view.legal;
  if (!legal) throw new Error("Bot asked to act out of turn");

  if (view.phase === "auction") {
    const strength = hand.reduce((sum, card) => sum + (card.suit === "joker" ? 5 : Math.max(0, card.rank - 9)), 0);
    const opening = legal.bids.find((bid) => bid.kind === "high") ?? legal.bids[0];
    const bids = opening && (legal.mustBid || (strength >= 16 && opening.level <= 4));
    return { type: "bid", bid: bids ? opening : null };
  }
  if (view.phase === "declare") {
    return view.contract?.noTrump ? { type: "declare", direction: "high" } : { type: "declare", trump: longestSuit(hand) };
  }
  if (view.phase === "kitty") {
    // Keep jokers and trump; throw the lowest of the rest.
    const keep = (card: Card) => (card.suit === "joker" ? 2 : card.suit === view.contract?.trump ? 1 : 0);
    const ordered = [...hand].sort((a, b) => keep(a) - keep(b) || a.rank - b.rank);
    return { type: "discard", cardIds: ordered.slice(0, 6).map((card) => card.id) };
  }
  const options = hand.filter((card) => legal.cardIds.includes(card.id)).sort((a, b) => a.rank - b.rank);
  const pick = view.trick.length === 0 ? options[options.length - 1] : options[0];
  return { type: "play", cardId: pick.id };
}
