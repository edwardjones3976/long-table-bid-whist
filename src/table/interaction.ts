// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Pure interaction controller.
 *
 * It owns everything that happens *before* a commit: the pending preview, the
 * six discard picks, idempotent input ids, and stable illegal feedback. The
 * existing rules engine is called only from `confirm` and `next-hand`, so no
 * amount of pointing, hovering, or previewing can advance committed state.
 *
 * Every function here is pure: the input state is never mutated and a new state
 * is returned alongside a receipt.
 */
import {
  applyHumanAction,
  applyHumanDiscard,
  legalCards,
  legalHumanActions,
} from "../game/engine";
import { isManifestLegalBid, type Card, type GameState, type HumanAction } from "../game/model";
import { selectionLabel } from "./labels";
import {
  TABLE_REJECTION_MESSAGES,
  type TableDispatchReceipt,
  type TableInputEnvelope,
  type TableRejectionCode,
  type TableSelection,
} from "./intent";

export const DISCARD_PICK_TARGET = 6;

/** How many input ids are remembered for duplicate suppression. */
const PROCESSED_INPUT_MEMORY = 128;

export interface TablePreview {
  selection: TableSelection;
  label: string;
}

export interface TableInteractionState {
  readonly game: GameState;
  readonly preview: TablePreview | null;
  readonly discardIds: readonly string[];
  readonly processedInputIds: readonly string[];
  readonly lastReceipt: TableDispatchReceipt | null;
}

export interface TableDispatchResult {
  readonly state: TableInteractionState;
  readonly receipt: TableDispatchReceipt;
}

export function createInteractionState(game: GameState): TableInteractionState {
  return {
    game,
    preview: null,
    discardIds: [],
    processedInputIds: [],
    lastReceipt: null,
  };
}

/** Drops the uncommitted preview and discard picks; committed game state is untouched. */
export function clearUncommitted(state: TableInteractionState): TableInteractionState {
  if (!state.preview && state.discardIds.length === 0) return state;
  return { ...state, preview: null, discardIds: [] };
}

function southCard(game: GameState, cardId: string): Card | undefined {
  return game.hands.south.find((card) => card.id === cardId);
}

function remember(ids: readonly string[], inputId: string): readonly string[] {
  const next = [...ids, inputId];
  return next.length > PROCESSED_INPUT_MEMORY ? next.slice(-PROCESSED_INPUT_MEMORY) : next;
}

interface RouteOutcome {
  game?: GameState;
  preview?: TablePreview | null;
  discardIds?: readonly string[];
  committed?: boolean;
  code?: TableRejectionCode;
}

function reject(code: TableRejectionCode): RouteOutcome {
  return { code };
}

function previewFor(game: GameState, selection: TableSelection): TablePreview {
  const label =
    selection.type === "play"
      ? selectionLabel(selection, southCard(game, selection.cardId)?.label)
      : selectionLabel(selection);
  return { selection, label };
}

function guardActing(state: TableInteractionState): TableRejectionCode | null {
  if (state.game.paused) return "table-paused";
  if (state.game.turn !== "south") return "not-your-turn";
  return null;
}

function routePreview(state: TableInteractionState, selection: TableSelection): RouteOutcome {
  const blocked = guardActing(state);
  if (blocked) return reject(blocked);
  const game = state.game;
  const legal = legalHumanActions(game);

  switch (selection.type) {
    case "pass": {
      if (game.phase !== "auction") return reject("wrong-phase");
      if (!legal.some((action) => action.type === "pass")) return reject("illegal-bid");
      break;
    }
    case "bid": {
      if (game.phase !== "auction") return reject("wrong-phase");
      // Manifest legality is checked before engine legality so a crafted Level 7
      // or No-Trump bid always reports the published Alpha 0.1 exclusion.
      if (!isManifestLegalBid(selection.bid)) return reject("bid-outside-manifest");
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
      if (!southCard(game, selection.cardId)) return reject("card-not-in-hand");
      if (!legalCards(game, "south").some((card) => card.id === selection.cardId)) {
        return reject("illegal-card");
      }
      break;
    }
  }

  return { preview: previewFor(game, selection) };
}

function routeToggleDiscard(state: TableInteractionState, cardId: string): RouteOutcome {
  const blocked = guardActing(state);
  if (blocked) return reject(blocked);
  if (state.game.phase !== "kitty") return reject("wrong-phase");
  if (!southCard(state.game, cardId)) return reject("card-not-in-hand");

  if (state.discardIds.includes(cardId)) {
    return { discardIds: state.discardIds.filter((id) => id !== cardId) };
  }
  // A seventh pick is refused outright; the first six survive untouched.
  if (state.discardIds.length >= DISCARD_PICK_TARGET) return reject("discard-limit-reached");
  return { discardIds: [...state.discardIds, cardId] };
}

function actionForPreview(preview: TablePreview): HumanAction {
  switch (preview.selection.type) {
    case "pass":
      return { type: "pass" };
    case "bid":
      return { type: "bid", bid: preview.selection.bid };
    case "declaration":
      return { type: "declare", trump: preview.selection.trump };
    case "play":
      return { type: "play", cardId: preview.selection.cardId };
  }
}

function routeConfirm(state: TableInteractionState): RouteOutcome {
  const blocked = guardActing(state);
  if (blocked) return reject(blocked);
  if (state.game.phase === "summary") return reject("wrong-phase");

  if (state.game.phase === "kitty") {
    if (state.discardIds.length !== DISCARD_PICK_TARGET) return reject("discard-incomplete");
    const result = applyHumanDiscard(state.game, [...state.discardIds]);
    if (result.error) return reject("engine-rejected");
    return { game: result.state, preview: null, discardIds: [], committed: true };
  }

  // A repeat confirm carrying a fresh input id still finds no pending preview,
  // so it can never re-commit the action that was just played.
  if (!state.preview) return reject("nothing-to-confirm");
  const result = applyHumanAction(state.game, actionForPreview(state.preview));
  if (result.error) return reject("engine-rejected");
  return { game: result.state, preview: null, discardIds: [], committed: true };
}

function routeNextHand(state: TableInteractionState): RouteOutcome {
  if (state.game.phase !== "summary") return reject("wrong-phase");
  const result = applyHumanAction(state.game, { type: "next-hand" });
  if (result.error) return reject("engine-rejected");
  return { game: result.state, preview: null, discardIds: [], committed: true };
}

function route(state: TableInteractionState, envelope: TableInputEnvelope): RouteOutcome {
  switch (envelope.intent.kind) {
    case "preview":
      return routePreview(state, envelope.intent.selection);
    case "toggle-discard":
      return routeToggleDiscard(state, envelope.intent.cardId);
    case "cancel":
      return { preview: null, discardIds: [] };
    case "confirm":
      return routeConfirm(state);
    case "next-hand":
      return routeNextHand(state);
  }
}

export function dispatchTableInput(
  state: TableInteractionState,
  envelope: TableInputEnvelope,
): TableDispatchResult {
  if (state.processedInputIds.includes(envelope.inputId)) {
    const receipt: TableDispatchReceipt = {
      inputId: envelope.inputId,
      source: envelope.source,
      intentKind: envelope.intent.kind,
      outcome: "duplicate",
      code: "duplicate-input-id",
      message: TABLE_REJECTION_MESSAGES["duplicate-input-id"],
      committed: false,
    };
    return { state: { ...state, lastReceipt: receipt }, receipt };
  }

  const outcome = route(state, envelope);
  const rejected = outcome.code !== undefined;
  const receipt: TableDispatchReceipt = {
    inputId: envelope.inputId,
    source: envelope.source,
    intentKind: envelope.intent.kind,
    outcome: rejected ? "rejected" : "accepted",
    code: outcome.code ?? null,
    message: outcome.code ? TABLE_REJECTION_MESSAGES[outcome.code] : "",
    committed: Boolean(outcome.committed),
  };

  const next: TableInteractionState = {
    game: outcome.game ?? state.game,
    preview: outcome.preview !== undefined ? outcome.preview : state.preview,
    discardIds: outcome.discardIds ?? state.discardIds,
    // An id is consumed whatever the outcome, so a replay is always a duplicate
    // rather than a second attempt.
    processedInputIds: remember(state.processedInputIds, envelope.inputId),
    lastReceipt: receipt,
  };

  return { state: next, receipt };
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
