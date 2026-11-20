// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Immersive session lifecycle.
 *
 * Two guarantees live here:
 *
 * 1. A closed error vocabulary. Every way the room can fail to open maps onto
 *    one of `XR_LIFECYCLE_CODES`, and the text shown to a player is read from
 *    the fixed table below. A raw browser/device message is never surfaced, so
 *    an unclassified failure fails closed onto the generic code rather than
 *    leaking whatever string the platform produced.
 * 2. Exactly-once cleanup. A session can end from the headset, from the page,
 *    or from both at once; every teardown step still runs exactly one time.
 */
export const XR_LIFECYCLE_CODES = [
  "xr-unavailable",
  "already-active",
  "session-rejected",
  "renderer-unavailable",
  "reference-space-unavailable",
  "unknown-failure",
] as const;

export type XrLifecycleCode = (typeof XR_LIFECYCLE_CODES)[number];

export const XR_LIFECYCLE_MESSAGES: Record<XrLifecycleCode, string> = {
  "xr-unavailable": "Immersive WebXR is unavailable in this browser.",
  "already-active": "An immersive room is already open on this page.",
  "session-rejected": "The immersive session request was refused.",
  "renderer-unavailable": "An immersive drawing surface could not be created.",
  "reference-space-unavailable": "The seated local-floor reference space was refused.",
  "unknown-failure": "The immersive room could not be opened.",
};

export class XrLifecycleError extends Error {
  readonly code: XrLifecycleCode;

  constructor(code: XrLifecycleCode, cause?: unknown) {
    super(XR_LIFECYCLE_MESSAGES[code]);
    this.name = "XrLifecycleError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export function isXrLifecycleError(value: unknown): value is XrLifecycleError {
  return value instanceof XrLifecycleError;
}

/**
 * Classifies any thrown value onto the closed vocabulary. An unrecognised
 * failure becomes `unknown-failure`; its original text is never returned.
 */
export function lifecycleCodeOf(value: unknown): XrLifecycleCode {
  return isXrLifecycleError(value) ? value.code : "unknown-failure";
}

/** The only text a surface may show for a failed room entry. */
export function lifecycleMessageOf(value: unknown): string {
  return XR_LIFECYCLE_MESSAGES[lifecycleCodeOf(value)];
}

export interface XrCleanupStep {
  readonly name: string;
  readonly run: () => void;
}

export interface XrCleanupRunner {
  /** Names of the registered steps, in teardown order. */
  readonly stepNames: readonly string[];
  /** True once `run` has been called at least once. */
  readonly ran: boolean;
  /** Names of the steps that were actually executed, in order. */
  readonly executed: readonly string[];
  /**
   * Runs every registered step exactly once across the lifetime of the runner.
   * Later calls are no-ops and return an empty list. A step that throws does
   * not prevent the remaining steps from running, and is still consumed.
   */
  run(): readonly string[];
}

export function createCleanupRunner(steps: readonly XrCleanupStep[]): XrCleanupRunner {
  const pending = [...steps];
  const executed: string[] = [];
  let ran = false;

  return {
    stepNames: steps.map((step) => step.name),
    get ran() {
      return ran;
    },
    get executed() {
      return [...executed];
    },
    run() {
      if (ran) return [];
      ran = true;
      const performed: string[] = [];
      while (pending.length > 0) {
        const step = pending.shift()!;
        performed.push(step.name);
        executed.push(step.name);
        try {
          step.run();
        } catch {
          // Teardown is best-effort per step but must never abort the rest of
          // the sequence; the step is consumed either way.
        }
      }
      return performed;
    },
  };
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
