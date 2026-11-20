// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Every selectable thing in the XR room is a typed target with a stable id.
 * A controller select resolves an id to one of exactly two typed actions —
 * a table intent, or a view (calibration) intent — and nothing else.
 */
import type { TableIntent } from "../table/intent";
import type { XrViewIntent, XrViewIntentKind } from "./calibration";

export type XrTargetAction =
  | { type: "table"; intent: TableIntent }
  | { type: "view"; intent: XrViewIntent };

export interface XrTargetDefinition {
  targetId: string;
  label: string;
  action: XrTargetAction;
}

/** Confirm and Cancel are separate targets; neither doubles as the other. */
export const XR_CONFIRM_TARGET: XrTargetDefinition = {
  targetId: "confirm",
  label: "Confirm",
  action: { type: "table", intent: { kind: "confirm" } },
};

export const XR_CANCEL_TARGET: XrTargetDefinition = {
  targetId: "cancel",
  label: "Cancel",
  action: { type: "table", intent: { kind: "cancel" } },
};

function viewTarget(targetId: string, label: string, kind: XrViewIntentKind): XrTargetDefinition {
  return { targetId, label, action: { type: "view", intent: { kind } } };
}

export const XR_VIEW_TARGETS: readonly XrTargetDefinition[] = [
  viewTarget("view:recenter", "Recenter", "recenter"),
  viewTarget("view:height-down", "Height -", "height-down"),
  viewTarget("view:height-up", "Height +", "height-up"),
  viewTarget("view:distance-down", "Distance -", "distance-down"),
  viewTarget("view:distance-up", "Distance +", "distance-up"),
];

export const XR_FIXED_TARGETS: readonly XrTargetDefinition[] = [
  XR_CONFIRM_TARGET,
  XR_CANCEL_TARGET,
  ...XR_VIEW_TARGETS,
];

/** The visibly non-human table guide. No human model ships in this room. */
export const XR_DEALER_LABEL = "AI Dealer — Table Guide" as const;
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
