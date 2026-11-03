// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Receipts and the closed rejection vocabulary.
 *
 * The first thirteen codes and their messages are the browser oracle's
 * (`src/table/intent.ts`), imported rather than retyped so the two surfaces can
 * never drift. The remaining codes exist only at the authoritative boundary.
 */
import { TABLE_REJECTION_MESSAGES } from "../../../src/table/intent";
import * as s from "./schema";
import { INTENT_KINDS, type IntentKind } from "./intents";
import { LIMITS } from "./vocabulary";

export const OUTCOMES = ["accepted", "duplicate", "rejected"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const REJECTION_CODES = [
  "duplicate-input-id",
  "table-paused",
  "not-your-turn",
  "wrong-phase",
  "bid-outside-manifest",
  "illegal-bid",
  "illegal-declaration",
  "illegal-card",
  "card-not-in-hand",
  "discard-limit-reached",
  "discard-incomplete",
  "nothing-to-confirm",
  "engine-rejected",
  "stale-version",
  "unauthorized-role",
  "seat-not-bound",
  "unknown-table",
  "not-between-hands",
  "seat-not-substitutable",
  "unknown-participant",
  "event-ended",
] as const;
export type RejectionCode = (typeof REJECTION_CODES)[number];

export const REJECTION_MESSAGES: Readonly<Record<RejectionCode, string>> = {
  ...TABLE_REJECTION_MESSAGES,
  "stale-version": "Your view of the table is out of date. Resyncing.",
  "unauthorized-role": "Your role cannot do that at this table.",
  "seat-not-bound": "You are not seated at this table.",
  "unknown-table": "That table does not exist.",
  "not-between-hands": "That is only available between hands.",
  "seat-not-substitutable": "That seat cannot be substituted now.",
  "unknown-participant": "That participant is not at this table.",
  "event-ended": "This event has ended.",
};

export interface IntentReceipt {
  intentId: string;
  intentKind: IntentKind;
  outcome: Outcome;
  code: RejectionCode | null;
  message: string;
  /** True only when the authority advanced committed table state. */
  committed: boolean;
  /** The table version after this intent was handled. */
  version: number;
}

export const INTENT_RECEIPT = s.object<IntentReceipt>({
  intentId: s.string({ maxLength: LIMITS.id }),
  intentKind: s.enumOf(INTENT_KINDS),
  outcome: s.enumOf(OUTCOMES),
  code: s.nullable(s.enumOf(REJECTION_CODES)),
  message: s.string({ maxLength: LIMITS.line, allowEmpty: true }),
  committed: s.boolean(),
  version: s.int({ min: 0, max: LIMITS.maxVersion }),
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
