import { expect, test } from "@playwright/test";
import type { Pose } from "../../shared/protocol";
import { closeAll, enter, open, problems } from "./helpers";

const SCREENS = "client/.e2e-screens";

test.beforeEach(() => void (problems.length = 0));
const VIEWS: [name: string, pose: Pose][] = [
  ["foyer-spawn", { x: 0, z: 15.5, ry: 0 }],
  ["tonk-lounge", { x: -10, z: 9, ry: Math.PI / 2 }],
  ["spades-lounge", { x: -10, z: -9, ry: Math.PI / 2 }],
  ["bid-whist-lounge", { x: 10, z: 9, ry: -Math.PI / 2 }],
  ["kitchen", { x: 10, z: -4, ry: -Math.PI / 2 - 0.5 }],
  ["backyard", { x: 0, z: -19.5, ry: 0 }],
  ["backyard-pool", { x: -2, z: -29, ry: 0.9 }],
];

test("a walk round the house in all three themes draws without errors", async ({ browser }) => {
  const entry = await open(browser);
  await expect(entry.getByTestId("entry-name")).toBeVisible();
  await entry.screenshot({ path: `${SCREENS}/entry.png` });
  await entry.context().close();

  const { page } = await enter(browser, "Walker", undefined, true);
  for (const theme of ["golden", "july4", "newyear"]) {
    await page.evaluate((t) => window.__mansion.local.set({ theme: t }), theme);
    for (const [name, pose] of VIEWS) {
      await page.evaluate((p) => window.__mansion.teleport(p), pose);
      await page.waitForFunction((p) => {
        const at = window.__mansion.local.getState().playerPose;
        return at !== null && Math.hypot(at.x - p.x, at.z - p.z) < 0.05;
      }, pose);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENS}/${theme}-${name}.png` });
    }
  }
  await closeAll([page]);
  expect(problems).toEqual([]);
});
