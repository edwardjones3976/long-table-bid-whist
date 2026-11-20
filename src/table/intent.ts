// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * The single typed input vocabulary shared by the desktop surface and the XR
 * room. Nothing else may reach the rules engine: both surfaces build a
 * `TableInputEnvelope`, hand it to the interaction controller, and read the
 * `TableDispatchReceipt` that comes back.
 */
import type { Bid, Suit } from "../game/model";

/** What the player is pointing at. A selection is never itself a commit. */
export type TableSelection =
  | { type: "pass" }
  | { type: "bid"; bid: Bid }
  | { type: "declaration"; trump: Suit | null }
  | { type: "play"; cardId: string };

export type TableIntent =
  | { kind: "preview"; selection: TableSelection }
  | { kind: "toggle-discard"; cardId: string }
  | { kind: "cancel" }
  | { kind: "confirm" }
  | { kind: "next-hand" };

export type TableIntentKind = TableIntent["kind"];

export type TableInputSource = "desktop" | "xr";

export interface TableInputEnvelope {
  /**
   * Idempotency key. A repeated id is never applied twice, so a duplicated
   * controller event or a double-fired DOM click cannot commit two actions.
   */
  inputId: string;
  source: TableInputSource;
  intent: TableIntent;
}

export type TableDispatchOutcome = "accepted" | "duplicate" | "rejected";

/** Closed rejection vocabulary. Feedback for a given cause is always identical. */
export type TableRejectionCode =
  | "duplicate-input-id"
  | "table-paused"
  | "not-your-turn"
  | "wrong-phase"
  | "bid-outside-manifest"
  | "illegal-bid"
  | "illegal-declaration"
  | "illegal-card"
  | "card-not-in-hand"
  | "discard-limit-reached"
  | "discard-incomplete"
  | "nothing-to-confirm"
  | "engine-rejected";

export const TABLE_REJECTION_MESSAGES: Record<TableRejectionCode, string> = {
  "duplicate-input-id": "That input was already handled.",
  "table-paused": "The table is paused.",
  "not-your-turn": "Wait for your turn.",
  "wrong-phase": "That is not available in this phase.",
  "bid-outside-manifest": "Not included in Alpha 0.1; available after the published-rules stage.",
  "illegal-bid": "That bid is not legal now.",
  "illegal-declaration": "That declaration is not legal now.",
  "illegal-card": "Follow suit.",
  "card-not-in-hand": "That card is not in your hand.",
  "discard-limit-reached": "Six discards are already selected. Unpick one first.",
  "discard-incomplete": "Select exactly six cards to discard.",
  "nothing-to-confirm": "There is nothing to confirm.",
  "engine-rejected": "The rules engine refused that action.",
};

export interface TableDispatchReceipt {
  inputId: string;
  source: TableInputSource;
  intentKind: TableIntentKind;
  outcome: TableDispatchOutcome;
  /** Present only when `outcome` is "rejected" or "duplicate". */
  code: TableRejectionCode | null;
  /** Stable, cause-derived feedback. Empty string when accepted. */
  message: string;
  /** True only when the rules engine advanced committed game state. */
  committed: boolean;
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
