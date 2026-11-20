import { afterEach, describe, expect, it, vi } from "vitest";
import { BUZZ, buzz, cue } from "../../client/src/controls/feedback";
import { DEFAULT_COMFORT, local } from "../../client/src/state/local";

const controller = (pulse: (value: number, duration: number) => unknown) => ({ gamepad: { hapticActuators: [{ pulse }] } });

afterEach(() => local.setComfort({ ...DEFAULT_COMFORT }));

describe("feedback cues", () => {
  it("buzzes the named controller with that cue's strength and length", () => {
    const pulse = vi.fn(() => Promise.resolve(true));
    buzz("grab", controller(pulse));
    expect(pulse).toHaveBeenCalledWith(...BUZZ.grab);
  });

  it("stays still when vibration is switched off", () => {
    const pulse = vi.fn();
    local.setComfort({ haptics: false });
    cue("place", controller(pulse));
    expect(pulse).not.toHaveBeenCalled();
  });

  it("ignores a hand, a mouse, or a controller that cannot vibrate", async () => {
    for (const source of [undefined, null, {}, { gamepad: null }, { gamepad: { hapticActuators: [] } }, { gamepad: { hapticActuators: [{}] } }]) {
      expect(() => cue("refuse", source)).not.toThrow();
    }
    // A sleeping controller rejects; that must not surface as an unhandled rejection.
    const rejected = vi.fn(() => Promise.reject(new Error("asleep")));
    buzz("land", controller(rejected));
    await Promise.resolve();
    expect(rejected).toHaveBeenCalled();
    // A throwing actuator is swallowed too.
    expect(() =>
      buzz(
        "hover",
        controller(() => {
          throw new Error("gone");
        }),
      ),
    ).not.toThrow();
  });
});
