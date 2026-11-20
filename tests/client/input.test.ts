/**
 * The gamepad as client/src/controls/input.ts reads it (standard mapping): the buttons the controls help and the
 * docs name, read through a stubbed navigator.getGamepads.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { desk, pollGamepad } from "../../client/src/controls/input";
import { local } from "../../client/src/state/local";

const pad = {
  mapping: "standard",
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
};

/** Sets a button (value 0 to 1; pressed past half way) and reads the pad once, as the rig does each frame. */
function hold(index: number, value: number): void {
  pad.buttons[index] = { pressed: value > 0.5, value };
  pollGamepad();
}

beforeAll(() => {
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
  // jsdom has no CSS.escape, which the bumpers use to find a control by its test id; these ids need no escaping.
  if (typeof CSS === "undefined" || !CSS.escape) vi.stubGlobal("CSS", { escape: (text: string) => text });
  window.dispatchEvent(new Event("gamepadconnected"));
});

afterEach(() => {
  // Everything let go and read once, so the next press is seen as a new press.
  for (const button of pad.buttons) Object.assign(button, { pressed: false, value: 0 });
  pad.axes = [0, 0, 0, 0];
  pollGamepad();
  desk.activate = desk.cancel = false;
  document.body.innerHTML = "";
});

describe("gamepad", () => {
  it("jumps on X (button 2) while it is held", () => {
    hold(2, 1);
    expect(desk.padActive).toBe(true);
    expect(desk.padJump).toBe(true);
    hold(2, 0);
    expect(desk.padJump).toBe(false);
  });

  it("aims a teleport with the left trigger (button 6) only past half way", () => {
    hold(6, 0.4);
    expect(desk.padAim).toBe(false);
    hold(6, 0.6);
    expect(desk.padAim).toBe(true);
    hold(6, 0);
    expect(desk.padAim).toBe(false);
  });

  it("runs from a click of the left stick (button 10) while walking, until the stick is back at rest", () => {
    pad.axes = [0, -1, 0, 0];
    pollGamepad();
    expect(desk.padY).toBe(-1);
    expect(desk.padRun).toBe(false);
    hold(10, 1);
    expect(desk.padRun).toBe(true);
    hold(10, 0);
    expect(desk.padRun).toBe(true);
    pad.axes = [0, 0, 0, 0];
    pollGamepad();
    expect(desk.padRun).toBe(false);
  });

  it("walks on the left stick and turns on the right", () => {
    pad.axes = [1, 0, -1, 0];
    pollGamepad();
    expect(desk.padX).toBe(1);
    expect(desk.padTurn).toBe(-1);
  });

  it("cancels on B (button 1): a teleport aim, carried cards and the picked cards, once per press", () => {
    local.set({ selection: ["AS"] });
    const before = desk.cancelCount;
    hold(1, 1);
    hold(1, 1);
    expect(desk.cancelCount).toBe(before + 1);
    expect(desk.cancel).toBe(true);
    expect(local.getState().selection).toEqual([]);
  });

  it("confirms on A (button 0): the focused button, else what the centre ring points at", () => {
    hold(0, 1);
    expect(desk.activate).toBe(true);
    hold(0, 0);
    desk.activate = false;
    document.body.innerHTML = '<button data-testid="go">Go</button>';
    const go = document.querySelector("button")!;
    const pressed = vi.fn();
    go.addEventListener("click", pressed);
    go.focus();
    hold(0, 1);
    expect(pressed).toHaveBeenCalledTimes(1);
    expect(desk.activate).toBe(false);
  });

  it("in an open window walks its own buttons with the bumpers, radios and all, and sends it Escape on B", () => {
    document.body.innerHTML =
      '<button data-testid="a">A</button><div role="dialog"><button id="one">One</button><button id="two" role="radio" tabindex="-1">Two</button><button id="off" disabled>Off</button></div>' +
      '<div hidden><div role="dialog"><button id="shut">Shut</button></div></div>';
    desk.focusIds = ["a"];
    const at = () => document.activeElement?.id;
    hold(5, 1);
    expect(at()).toBe("one");
    hold(5, 0);
    hold(5, 1);
    expect(at()).toBe("two");
    hold(5, 0);
    hold(5, 1);
    expect(at()).toBe("one");
    hold(5, 0);
    hold(4, 1);
    expect(at()).toBe("two");
    hold(4, 0);
    const escape = vi.fn((event: KeyboardEvent) => event.key);
    window.addEventListener("keydown", escape);
    const before = desk.cancelCount;
    hold(1, 1);
    window.removeEventListener("keydown", escape);
    expect(escape).toHaveBeenCalledTimes(1);
    expect(escape.mock.results[0].value).toBe("Escape");
    // The window's Escape closes it; the world's own cancel is not also sent.
    expect(desk.cancelCount).toBe(before);
    desk.focusIds = [];
  });

  it("gives a modal window (the look editor) the pad to itself: no walking, turning, jumping, aiming, world presses or Start", () => {
    document.body.innerHTML =
      '<button data-testid="hud-menu">Menu</button><div role="dialog" aria-modal="true"><label><input type="checkbox" id="tick" /> Tick</label><button id="save">Save</button></div>';
    const menu = vi.fn();
    document.querySelector('[data-testid="hud-menu"]')!.addEventListener("click", menu);
    pad.axes = [1, -1, 1, -1];
    hold(2, 1);
    hold(6, 1);
    expect([desk.padX, desk.padY, desk.padTurn, desk.padLook, desk.padJump, desk.padAim]).toEqual([0, 0, 0, 0, false, false]);
    // The right stick turns the look editor's preview instead of the view.
    expect(desk.padSpin).toBe(1);
    // A with nothing focused presses nothing behind it.
    (document.activeElement as HTMLElement | null)?.blur();
    hold(0, 1);
    expect(desk.activate).toBe(false);
    hold(0, 0);
    hold(9, 1);
    expect(menu).not.toHaveBeenCalled();
    hold(9, 0);
    // The bumpers reach its switches too, and A turns one.
    hold(5, 1);
    expect(document.activeElement?.id).toBe("tick");
    hold(5, 0);
    hold(0, 1);
    expect((document.getElementById("tick") as HTMLInputElement).checked).toBe(true);
  });

  it("steps focus with the bumpers (4 back, 5 on) and opens the menu with Start (9)", () => {
    document.body.innerHTML = '<button data-testid="a">A</button><button data-testid="b">B</button><button data-testid="hud-menu">Menu</button>';
    desk.focusIds = ["a", "b"];
    hold(5, 1);
    expect(document.activeElement?.getAttribute("data-testid")).toBe("a");
    hold(5, 0);
    hold(5, 1);
    expect(document.activeElement?.getAttribute("data-testid")).toBe("b");
    hold(5, 0);
    hold(4, 1);
    expect(document.activeElement?.getAttribute("data-testid")).toBe("a");
    hold(4, 0);
    const menu = vi.fn();
    document.querySelector('[data-testid="hud-menu"]')!.addEventListener("click", menu);
    hold(9, 1);
    hold(9, 1);
    expect(menu).toHaveBeenCalledTimes(1);
    desk.focusIds = [];
  });
});
