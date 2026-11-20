import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CONTROLS_HELP } from "../../client/src/controls/Player";
import { Hud } from "../../client/src/hud/Hud";
import { DEFAULT_COMFORT, local } from "../../client/src/state/local";

afterEach(() => {
  cleanup();
  local.setComfort({ ...DEFAULT_COMFORT });
});

function openSettings(): void {
  render(<Hud tables={false} />);
  fireEvent.click(screen.getByTestId("settings-toggle"));
}

describe("movement settings", () => {
  it("names the two movement modes, starts on walking, and saves the same two values as before", () => {
    openSettings();
    const mode = screen.getByTestId("movement-mode") as HTMLSelectElement;
    expect(mode.value).toBe("smooth");
    expect([...mode.options].map((option) => [option.value, option.textContent])).toEqual([
      ["smooth", "Walk and teleport"],
      ["teleport", "Teleport only"],
    ]);
    fireEvent.change(mode, { target: { value: "teleport" } });
    expect(local.getState().comfort.locomotion).toBe("teleport");
  });

  it("has switches for jumping, vibration and sound effects, all on to begin with", () => {
    openSettings();
    for (const [label, key] of [["Jumping", "jump"], ["Vibration", "haptics"], ["Sound effects", "sounds"]] as const) {
      const box = screen.getByLabelText(label) as HTMLInputElement;
      expect(box.checked).toBe(true);
      fireEvent.click(box);
      expect(local.getState().comfort[key]).toBe(false);
      expect(box.checked).toBe(false);
    }
  });
});

describe("controls help", () => {
  const find = (device: string, action: RegExp) => CONTROLS_HELP.filter((row) => row.device === device && action.test(row.action)).map((row) => row.input);

  it("gives walking, running, jumping and teleporting for the keyboard, the gamepad and VR controllers", () => {
    expect(find("Keyboard", /^Jump/)).toEqual(["Space"]);
    expect(find("Keyboard", /^Run/)).toEqual(["Hold Shift"]);
    expect(find("Gamepad", /^Jump/)).toEqual(["X (left button)"]);
    expect(find("Gamepad", /^Teleport/)[0]).toMatch(/left trigger/);
    expect(find("VR controllers", /^Jump/)).toEqual(["A (right controller; X on the left controller when the main hand is left)"]);
    expect(find("VR controllers", /^Cancel/)).toEqual(["B (right controller)"]);
    expect(find("VR controllers", /^Run/)[0]).toMatch(/^Click the walking stick/);
    for (const device of ["Keyboard", "Gamepad", "VR controllers"]) {
      for (const action of [/^Walk/, /^Run/, /^Jump/, /^Teleport/]) expect(find(device, action).length).toBeGreaterThan(0);
    }
  });

  it("gives both ways to handle a card in VR: the grip in the hand, the trigger from a distance", () => {
    expect(find("VR controllers", /^Take hold/)[0]).toMatch(/^Grip, either hand/);
    expect(find("VR controllers", /^Place what a hand holds/)[0]).toMatch(/drop zone/);
    expect(find("VR controllers", /^Carry a card from a distance/)[0]).toMatch(/^Hold the trigger/);
  });
});
