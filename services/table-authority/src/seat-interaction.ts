// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Per-seat commit boundary: preview, discard picks, cancel, confirm.
 *
 * This is the browser oracle's interaction controller (`src/table/interaction.ts`)
 * expressed for an arbitrary seat. Pointing and previewing never touch
 * committed state; only `confirm` and `next-hand` yield an action for the rules
 * kernel, and the kernel alone decides whether it is legal.
 */
import type { TableSelection as OracleSelection } from "../../../src/table/intent";
import { selectionLabel } from "../../../src/table/labels";
import {
  isManifestLegalBid,
  legalCards,
  legalSeatActions,
  type Bid,
  type Card,
  type GameState,
  type Seat,
  type SeatAction,
} from "../../../packages/rules-core/src";
import type { BidView, RejectionCode, TableIntent, TableSelection } from "../../../packages/protocol/src";
import { DISCARD_TARGET } from "../../../packages/protocol/src";

/** The wire schema bounds `level` to 3..7, which is exactly the oracle's literal union. */
function oracleBid(bid: BidView): Bid {
  return { level: bid.level as Bid["level"], mode: bid.mode };
}

function oracleSelection(selection: TableSelection): OracleSelection {
  return selection.type === "bid" ? { type: "bid", bid: oracleBid(selection.bid) } : selection;
}

export interface SeatPreview {
  readonly selection: TableSelection;
  readonly label: string;
}

/** Everything a seat has pointed at but not committed. */
export interface SeatUncommitted {
  readonly preview: SeatPreview | null;
  readonly discardIds: readonly string[];
}

export const EMPTY_UNCOMMITTED: SeatUncommitted = { preview: null, discardIds: [] };

export type PlayerIntent = Extract<
  TableIntent,
  { kind: "preview" | "toggle-discard" | "cancel" | "confirm" | "next-hand" }
>;

export type SeatRouteOutcome =
  | { readonly code: RejectionCode }
  | { readonly uncommitted: SeatUncommitted; readonly commit: SeatAction | null };

function reject(code: RejectionCode): SeatRouteOutcome {
  return { code };
}

function seatCard(game: GameState, seat: Seat, cardId: string): Card | undefined {
  return game.hands[seat].find((card) => card.id === cardId);
}

function guardActing(game: GameState, seat: Seat): RejectionCode | null {
  if (game.paused) return "table-paused";
  if (game.turn !== seat) return "not-your-turn";
  return null;
}

function previewFor(game: GameState, seat: Seat, selection: TableSelection): SeatPreview {
  const label =
    selection.type === "play"
      ? selectionLabel(oracleSelection(selection), seatCard(game, seat, selection.cardId)?.label)
      : selectionLabel(oracleSelection(selection));
  return { selection, label };
}

function routePreview(
  game: GameState,
  seat: Seat,
  current: SeatUncommitted,
  selection: TableSelection,
): SeatRouteOutcome {
  const blocked = guardActing(game, seat);
  if (blocked) return reject(blocked);
  const legal = legalSeatActions(game, seat);

  switch (selection.type) {
    case "pass": {
      if (game.phase !== "auction") return reject("wrong-phase");
      if (!legal.some((action) => action.type === "pass")) return reject("illegal-bid");
      break;
    }
    case "bid": {
      if (game.phase !== "auction") return reject("wrong-phase");
      // Manifest legality first, so a crafted Level 7 or No-Trump bid always
      // reports the one published exclusion notice.
      if (!isManifestLegalBid(oracleBid(selection.bid))) return reject("bid-outside-manifest");
      const offered = legal.some(
        (action) =>
          action.type === "bid" &&
          action.bid.level === selection.bid.level &&
          action.bid.mode === selection.bid.mode,
      );
      if (!offered) return reject("illegal-bid");
      break;
    }
    case "declaration": {
      if (game.phase !== "declaration") return reject("wrong-phase");
      const offered = legal.some(
        (action) => action.type === "declare" && action.trump === selection.trump,
      );
      if (!offered) return reject("illegal-declaration");
      break;
    }
    case "play": {
      if (game.phase !== "play") return reject("wrong-phase");
      if (!seatCard(game, seat, selection.cardId)) return reject("card-not-in-hand");
      if (!legalCards(game, seat).some((card) => card.id === selection.cardId)) {
        return reject("illegal-card");
      }
      break;
    }
  }

  return {
    uncommitted: { preview: previewFor(game, seat, selection), discardIds: current.discardIds },
    commit: null,
  };
}

function routeToggleDiscard(
  game: GameState,
  seat: Seat,
  current: SeatUncommitted,
  cardId: string,
): SeatRouteOutcome {
  const blocked = guardActing(game, seat);
  if (blocked) return reject(blocked);
  if (game.phase !== "kitty") return reject("wrong-phase");
  if (!seatCard(game, seat, cardId)) return reject("card-not-in-hand");

  if (current.discardIds.includes(cardId)) {
    return {
      uncommitted: { preview: current.preview, discardIds: current.discardIds.filter((id) => id !== cardId) },
      commit: null,
    };
  }
  // A seventh pick is refused outright; the first six survive untouched.
  if (current.discardIds.length >= DISCARD_TARGET) return reject("discard-limit-reached");
  return {
    uncommitted: { preview: current.preview, discardIds: [...current.discardIds, cardId] },
    commit: null,
  };
}

function actionForPreview(preview: SeatPreview): SeatAction {
  switch (preview.selection.type) {
    case "pass":
      return { type: "pass" };
    case "bid":
      return { type: "bid", bid: oracleBid(preview.selection.bid) };
    case "declaration":
      return { type: "declare", trump: preview.selection.trump };
    case "play":
      return { type: "play", cardId: preview.selection.cardId };
  }
}

function routeConfirm(game: GameState, seat: Seat, current: SeatUncommitted): SeatRouteOutcome {
  const blocked = guardActing(game, seat);
  if (blocked) return reject(blocked);
  if (game.phase === "summary") return reject("wrong-phase");

  if (game.phase === "kitty") {
    if (current.discardIds.length !== DISCARD_TARGET) return reject("discard-incomplete");
    return { uncommitted: EMPTY_UNCOMMITTED, commit: { type: "discard", cardIds: [...current.discardIds] } };
  }

  // A repeat confirm carrying a fresh intent id finds no pending preview, so it
  // can never re-commit the action that was just played.
  if (!current.preview) return reject("nothing-to-confirm");
  return { uncommitted: EMPTY_UNCOMMITTED, commit: actionForPreview(current.preview) };
}

function routeNextHand(game: GameState): SeatRouteOutcome {
  if (game.paused) return reject("table-paused");
  if (game.phase !== "summary") return reject("wrong-phase");
  return { uncommitted: EMPTY_UNCOMMITTED, commit: { type: "next-hand" } };
}

export function routePlayerIntent(
  game: GameState,
  seat: Seat,
  current: SeatUncommitted,
  intent: PlayerIntent,
): SeatRouteOutcome {
  switch (intent.kind) {
    case "preview":
      return routePreview(game, seat, current, intent.selection);
    case "toggle-discard":
      return routeToggleDiscard(game, seat, current, intent.cardId);
    case "cancel":
      return { uncommitted: EMPTY_UNCOMMITTED, commit: null };
    case "confirm":
      return routeConfirm(game, seat, current);
    case "next-hand":
      return routeNextHand(game);
  }
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
