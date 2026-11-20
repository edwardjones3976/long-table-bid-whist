// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
import { describe, expect, it, vi } from "vitest";

import {
  XR_LIFECYCLE_CODES,
  XR_LIFECYCLE_MESSAGES,
  XrLifecycleError,
  createCleanupRunner,
  isXrLifecycleError,
  lifecycleCodeOf,
  lifecycleMessageOf,
} from "../../src/xr/lifecycle";
import {
  XR_CANCEL_TARGET,
  XR_CONFIRM_TARGET,
  XR_DEALER_LABEL,
  XR_FIXED_TARGETS,
} from "../../src/xr/targets";

describe("closed lifecycle errors", () => {
  it("gives every code exactly one fixed message", () => {
    XR_LIFECYCLE_CODES.forEach((code) => {
      expect(XR_LIFECYCLE_MESSAGES[code].length).toBeGreaterThan(0);
    });
    expect(Object.keys(XR_LIFECYCLE_MESSAGES).sort()).toEqual([...XR_LIFECYCLE_CODES].sort());
  });

  it("classifies a lifecycle failure by its code", () => {
    const error = new XrLifecycleError("session-rejected");
    expect(isXrLifecycleError(error)).toBe(true);
    expect(lifecycleCodeOf(error)).toBe("session-rejected");
    expect(error.message).toBe(XR_LIFECYCLE_MESSAGES["session-rejected"]);
  });

  it("fails closed on an unclassified failure and never echoes its text", () => {
    const raw = new Error("device 0x8f serial ABC-123 refused GL context");
    expect(lifecycleCodeOf(raw)).toBe("unknown-failure");
    expect(lifecycleMessageOf(raw)).toBe(XR_LIFECYCLE_MESSAGES["unknown-failure"]);
    expect(lifecycleMessageOf(raw)).not.toContain("ABC-123");
    expect(lifecycleMessageOf("some string")).toBe(XR_LIFECYCLE_MESSAGES["unknown-failure"]);
    expect(lifecycleMessageOf(undefined)).toBe(XR_LIFECYCLE_MESSAGES["unknown-failure"]);
  });

  it("keeps the original cause for debugging without surfacing it", () => {
    const cause = new Error("raw platform detail");
    const error = new XrLifecycleError("renderer-unavailable", cause);
    expect(error.cause).toBe(cause);
    expect(error.message).not.toContain("raw platform detail");
  });
});

describe("exactly-once cleanup", () => {
  it("runs every step once no matter how many times teardown fires", () => {
    const calls: string[] = [];
    const runner = createCleanupRunner([
      { name: "animation-loop", run: () => calls.push("animation-loop") },
      { name: "room", run: () => calls.push("room") },
      { name: "canvas", run: () => calls.push("canvas") },
    ]);

    expect(runner.ran).toBe(false);
    const first = runner.run();
    const second = runner.run();
    const third = runner.run();

    expect(first).toEqual(["animation-loop", "room", "canvas"]);
    expect(second).toEqual([]);
    expect(third).toEqual([]);
    expect(calls).toEqual(["animation-loop", "room", "canvas"]);
    expect(runner.ran).toBe(true);
    expect(runner.executed).toEqual(["animation-loop", "room", "canvas"]);
  });

  it("notifies the page exactly once when the headset and the page both end", () => {
    const onEnded = vi.fn();
    const runner = createCleanupRunner([{ name: "notify", run: onEnded }]);

    // The headset "end" event and an explicit handle.end() both call run().
    runner.run();
    runner.run();

    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("completes the remaining steps when one throws, and never retries it", () => {
    const later = vi.fn();
    const thrower = vi.fn(() => {
      throw new Error("renderer already gone");
    });
    const runner = createCleanupRunner([
      { name: "renderer", run: thrower },
      { name: "canvas", run: later },
    ]);

    expect(() => runner.run()).not.toThrow();
    expect(thrower).toHaveBeenCalledTimes(1);
    expect(later).toHaveBeenCalledTimes(1);

    runner.run();
    expect(thrower).toHaveBeenCalledTimes(1);
    expect(later).toHaveBeenCalledTimes(1);
  });

  it("reports its registered steps in teardown order", () => {
    const runner = createCleanupRunner([
      { name: "animation-loop", run: () => undefined },
      { name: "controllers", run: () => undefined },
      { name: "notify", run: () => undefined },
    ]);
    expect(runner.stepNames).toEqual(["animation-loop", "controllers", "notify"]);
  });
});

describe("fixed room targets", () => {
  it("keeps Confirm and Cancel as separate targets", () => {
    expect(XR_CONFIRM_TARGET.targetId).toBe("confirm");
    expect(XR_CANCEL_TARGET.targetId).toBe("cancel");
    expect(XR_CONFIRM_TARGET.action).toEqual({ type: "table", intent: { kind: "confirm" } });
    expect(XR_CANCEL_TARGET.action).toEqual({ type: "table", intent: { kind: "cancel" } });
    expect(new Set(XR_FIXED_TARGETS.map((target) => target.targetId)).size).toBe(
      XR_FIXED_TARGETS.length,
    );
  });

  it("labels the table guide as a machine", () => {
    expect(XR_DEALER_LABEL).toBe("AI Dealer — Table Guide");
  });
});
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
