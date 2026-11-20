/**
 * Without a 3D view the text panel is the whole interface, so a gamepad has to work it on its own: the bumpers step
 * through the table's controls and A presses the one with focus (App.tsx PadFocus).
 */
import { expect, test, type Page } from "@playwright/test";
import { closeAll, enter, problems } from "./helpers";

type Pad = { mapping: string; axes: number[]; buttons: { pressed: boolean; value: number }[] };

/** Connects a standard gamepad that the page reads through navigator.getGamepads. */
async function connectPad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const pad = { mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    (window as unknown as { pad: Pad }).pad = pad;
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    window.dispatchEvent(new Event("gamepadconnected"));
  });
}

/** Holds a gamepad button down for a few frames, then lets it go. */
async function press(page: Page, index: number): Promise<void> {
  for (const down of [true, false]) {
    await page.evaluate(([i, d]) => {
      const button = (window as unknown as { pad: Pad }).pad.buttons[i];
      button.pressed = d;
      button.value = d ? 1 : 0;
    }, [index, down] as const);
    await page.waitForTimeout(150);
  }
}

test("without a 3D view, the gamepad bumpers and A still work the table panel", async ({ browser }) => {
  const { page } = await enter(browser, "Pad");
  await connectPad(page);
  await page.getByTestId("table-spades-1").click();
  // The right bumper goes to the table's first enabled control, and A presses it.
  await press(page, 5);
  await expect(page.getByTestId("sit-0")).toBeFocused();
  await press(page, 0);
  await expect(page.getByTestId("seat-0")).toContainText("You");
  await closeAll([page]);
  expect(problems).toEqual([]);
});
