import { expect, test, type Page } from "@playwright/test";
import type { Pose } from "../../shared/protocol";
import { closeAll, enter, open, openMenu, problems } from "./helpers";

test.beforeEach(() => void (problems.length = 0));

const pose = (page: Page): Promise<Pose> =>
  page.evaluate(() => window.__mansion.local.getState().playerPose).then((at) => {
    if (!at) throw new Error("The player has no pose yet");
    return at;
  });
const walkable = (page: Page, at: Pose): Promise<boolean> => page.evaluate((p) => window.__mansion.isWalkable(p.x, p.z), at);
const apart = (a: Pose, b: Pose): number => Math.hypot(a.x - b.x, a.z - b.z);

test("movement: walking, teleport, theme switch and the Enter VR button", async ({ browser }) => {
  const { page } = await enter(browser, "Walker", undefined, true);
  await page.waitForFunction(() => window.__mansion.local.getState().playerPose !== null);
  const start = await pose(page);

  // Walk forward from the front door, then on into the west wall of the foyer: never out of bounds.
  await page.keyboard.down("KeyW");
  const seen: Pose[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.waitForTimeout(300);
    seen.push(await pose(page));
  }
  await page.keyboard.up("KeyW");
  expect(apart(start, seen.at(-1)!)).toBeGreaterThan(1);
  expect(seen.at(-1)!.z).toBeLessThan(start.z);
  await page.keyboard.press("KeyQ");
  await page.keyboard.press("KeyQ");
  await page.keyboard.press("KeyQ");
  await page.keyboard.down("KeyW");
  await page.keyboard.down("ShiftLeft");
  for (let i = 0; i < 10; i += 1) {
    await page.waitForTimeout(300);
    seen.push(await pose(page));
  }
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyW");
  for (const at of seen) expect(await walkable(page, at)).toBe(true);
  // The foyer is 16 m wide; nobody walks through its wall into the Tonk Lounge.
  expect(seen.at(-1)!.x).toBeGreaterThan(-8);

  // Teleport with the key: hold T to aim, let go to jump.
  await page.evaluate((p) => window.__mansion.teleport(p), { x: 0, z: 15.5, ry: 0 });
  await page.waitForFunction(() => Math.abs((window.__mansion.local.getState().playerPose?.z ?? 0) - 15.5) < 0.05);
  await page.keyboard.down("KeyT");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "client/.e2e-screens/teleport-aim.png" });
  await page.keyboard.up("KeyT");
  await page.waitForFunction(() => (window.__mansion.local.getState().playerPose?.z ?? 99) < 14.5);
  const landed = await pose(page);
  expect(await walkable(page, landed)).toBe(true);
  expect(apart(landed, { x: 0, z: 15.5, ry: 0 })).toBeLessThanOrEqual(7.01);

  // Walking up to a table offers its panel.
  await page.evaluate((p) => window.__mansion.teleport(p), { x: -13.5, z: 13.5, ry: Math.PI / 2 });
  await expect(page.getByTestId("table-title")).toHaveText("Tonk Table 1");
  await page.screenshot({ path: "client/.e2e-screens/near-table.png" });

  // Theme.
  await openMenu(page);
  await page.getByTestId("settings-toggle").click();
  await expect(page.locator(".mansion")).toHaveAttribute("data-theme", "july4");
  await page.getByTestId("theme").selectOption("newyear");
  expect(await page.evaluate(() => window.__mansion.local.getState().theme)).toBe("newyear");
  await expect(page.locator(".mansion")).toHaveAttribute("data-theme", "newyear");
  await page.getByTestId("settings-toggle").click();

  // No headset here: the button is there, disabled, and says why.
  await expect(page.getByTestId("enter-vr")).toBeDisabled();
  await expect(page.getByTestId("enter-vr-reason")).toHaveText(/headset|WebXR|secure/);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("a browser with no WebXR at all still runs the room and explains the disabled Enter VR button", async ({ browser }) => {
  const page = await open(browser);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "xr", { get: () => undefined, configurable: true });
  });
  await page.reload();
  await page.getByTestId("entry-name").fill("NoXR");
  await page.getByTestId("entry-create").click();
  await openMenu(page);
  await expect(page.getByTestId("enter-vr")).toBeDisabled();
  await expect(page.getByTestId("enter-vr-reason")).toHaveText("This browser has no WebXR");
  // The scene still draws and the player still gets a pose.
  await page.waitForFunction(() => window.__mansion.local.getState().playerPose !== null);
  await expect(page.locator(".scene-failed")).toHaveCount(0);
  await closeAll([page]);
  expect(problems).toEqual([]);
});
