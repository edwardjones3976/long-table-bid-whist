/**
 * The VR path, on the WebXR emulator the XR library depends on (iwer), loaded
 * from node_modules into the page: no headset, no network. It stands in for a
 * headset with two controllers, so this shows the session starts and that a
 * seat can be taken, a hand played and the table left with controller rays
 * alone, with the HUD and table panel gone and the in-world menu in their
 * place. It says nothing about comfort, legibility or frame rate in a real
 * headset.
 */
import { expect, test, type Page } from "@playwright/test";
import { closeAll, open, problems } from "./helpers";

test.beforeEach(() => void (problems.length = 0));

interface Vec {
  x: number;
  y: number;
  z: number;
  clone(): Vec;
  sub(v: Vec): Vec;
  add(v: Vec): Vec;
  setLength(l: number): Vec;
  distanceTo(v: Vec): number;
  copy(v: Vec): Vec;
}
interface Obj {
  name: string;
  visible: boolean;
  parent: Obj | null;
  position: Vec;
  quaternion: { x: number; y: number; z: number; w: number };
  constructor: new () => Obj;
  traverse(visit: (o: Obj) => void): void;
  updateMatrixWorld(force: boolean): void;
  getWorldPosition(v: Vec): Vec;
  worldToLocal(v: Vec): Vec;
  lookAt(v: Vec): void;
  rotateY(angle: number): void;
}
interface Controller {
  position: { set(x: number, y: number, z: number): void };
  quaternion: { set(x: number, y: number, z: number, w: number): void };
  updateButtonValue(id: string, value: number): void;
}
type XrWindow = {
  __xr: { controllers: { right: Controller } };
  __mansion: { three(): { scene: Obj; gl: { xr: { getCamera(): Obj } } } | undefined };
};

const frames = (page: Page, count: number): Promise<void> =>
  page.evaluate(async (wanted) => {
    const info = (window as unknown as { __mansion: { three(): { gl: { info: { render: { frame: number } } } } } }).__mansion.three().gl.info.render;
    const from = info.frame;
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (info.frame < from + wanted) return;
        clearInterval(timer);
        resolve();
      }, 20);
    });
  }, count);

/** Points the right controller's ray at the in-world control with this name and pulls the trigger. */
async function press(page: Page, name: string | RegExp): Promise<void> {
  const pattern = typeof name === "string" ? `^${name}$` : name.source;
  await page.waitForFunction((source) => {
    const w = window as unknown as XrWindow;
    const three = w.__mansion.three();
    if (!three) return false;
    let target: Obj | null = null;
    three.scene.traverse((o) => {
      if (!target && new RegExp(source).test(o.name)) target = o;
    });
    if (!target) return false;
    const found = target as Obj;
    three.scene.updateMatrixWorld(true);
    // The controller lives in the XR origin's space, which the rig moves about the house.
    const camera = three.gl.xr.getCamera();
    const origin = camera.parent!;
    const at = origin.worldToLocal(found.getWorldPosition(found.position.clone()));
    const head = origin.worldToLocal(camera.getWorldPosition(found.position.clone()));
    // 0.4 m short of the control: the library's ray ignores anything nearer than 0.2 m.
    const from = at.clone().add(head.sub(at).setLength(0.4));
    const aimer = new found.constructor();
    aimer.position.copy(from);
    aimer.lookAt(at);
    // lookAt turns +z to the target; a controller's ray runs along -z.
    aimer.rotateY(Math.PI);
    const controller = w.__xr.controllers.right;
    controller.position.set(from.x, from.y, from.z);
    controller.quaternion.set(aimer.quaternion.x, aimer.quaternion.y, aimer.quaternion.z, aimer.quaternion.w);
    return true;
  }, pattern);
  const trigger = (value: number) =>
    page.evaluate((v) => (window as unknown as XrWindow).__xr.controllers.right.updateButtonValue("trigger", v), value);
  // Counted in drawn frames, not time: the ray is aimed, pressed and released once per frame, and software GL is slow.
  await frames(page, 3);
  await trigger(1);
  await frames(page, 2);
  await trigger(0);
  await frames(page, 3);
}

const table = (page: Page) =>
  page.evaluate(() => {
    const snapshot = window.__mansion.getState().table as unknown as {
      you: number | null;
      revision: number;
      view: { phase: string; hand: unknown[] } | null;
    } | null;
    return snapshot && { you: snapshot.you, revision: snapshot.revision, phase: snapshot.view?.phase ?? null, hand: snapshot.view?.hand.length ?? 0 };
  });

test("in an emulated headset a player sits, plays a Tonk turn and leaves using controller rays only", async ({ browser }) => {
  const page = await open(browser);
  await page.addInitScript({ path: "node_modules/iwer/build/iwer.min.js" });
  await page.addInitScript(() => {
    const { XRDevice, metaQuest3 } = (window as unknown as { IWER: { XRDevice: new (config: unknown) => { installRuntime(options: object): void }; metaQuest3: unknown } }).IWER;
    const device = new XRDevice(metaQuest3);
    // Chromium has its own WebXR (with no headset behind it), which the emulator will not replace unless told to.
    device.installRuntime({ forceInstall: true });
    (window as unknown as { __xr: unknown }).__xr = device;
  });
  await page.reload();
  await page.getByTestId("entry-name").fill("Headset");
  await page.getByTestId("entry-create").click();

  await expect(page.getByTestId("enter-vr")).toBeEnabled();
  await page.getByTestId("enter-vr").click();
  await page.waitForFunction(() => (window.__mansion.local.getState() as unknown as { xrActive: boolean }).xrActive);
  // An immersive session shows no page content: everything from here is in-world.
  await expect(page.getByTestId("hud")).toHaveCount(0);
  await expect(page.getByTestId("table-picker")).toHaveCount(0);
  await expect(page.getByTestId("table-panel")).toHaveCount(0);

  // The in-world menu stands in for the HUD: its button opens it, a setting changes, and it closes again.
  const locomotion = () => page.evaluate(() => (window.__mansion.local.getState() as unknown as { comfort: { locomotion: string } }).comfort.locomotion);
  expect(await locomotion()).toBe("teleport");
  await press(page, "vr-menu");
  await press(page, "vr-menu-move");
  await expect.poll(locomotion).toBe("smooth");
  await press(page, "vr-menu-move");
  await expect.poll(locomotion).toBe("teleport");
  await press(page, "vr-menu");
  await page.waitForFunction(() => !(window.__mansion.local.getState() as unknown as { vrMenu: boolean }).vrMenu);

  // Walk-up distance from Tonk Table 1, south-east of it.
  await page.evaluate(() => window.__mansion.teleport({ x: -14.3, z: 15.3, ry: 0.8 }));
  await page.waitForFunction(() => {
    const at = window.__mansion.local.getState().playerPose;
    return at !== null && Math.hypot(at.x + 14.3, at.z - 15.3) < 0.5;
  });

  await press(page, "sit-0");
  await expect.poll(() => table(page).then((t) => t?.you)).toBe(0);
  await page.waitForFunction(() => window.__mansion.local.getState().seated !== null);
  const ready = () => page.evaluate(() => (window.__mansion.getState().room as unknown as { tables: { seats: { ready: boolean }[] }[] }).tables[0].seats[0].ready);
  await press(page, "ready");
  // The start button is only live once the server has heard it.
  await expect.poll(ready).toBe(true);
  await press(page, "start");
  await expect.poll(() => table(page).then((t) => t?.phase)).not.toBeNull();

  // The bots play before seat 0, and the deal (a 49 or 50) or a bot can end the hand first: deal again until it is my turn.
  let dealt = (await table(page))!;
  for (let i = 0; i < 5 && dealt.phase === "hand-over"; i += 1) {
    const before = dealt.revision;
    await press(page, "next-hand");
    await expect.poll(() => table(page).then((t) => t!.revision)).toBeGreaterThan(before);
    dealt = (await table(page))!;
  }
  expect(dealt.phase).toBe("draw");
  // One whole turn.
  await press(page, "draw-stock");
  await expect.poll(() => table(page).then((t) => t?.hand)).toBe(6);
  await press(page, /^card-/);
  await press(page, "discard");
  await expect.poll(() => table(page).then((t) => t?.hand)).toBe(5);
  expect((await table(page))!.revision).toBeGreaterThan(dealt.revision + 1);

  await press(page, "leave");
  await expect.poll(() => table(page)).toBeNull();
  await page.waitForFunction(() => window.__mansion.local.getState().seated === null);

  // Ending the session brings the page interface back.
  await page.evaluate(async () => {
    const three = (window as unknown as { __mansion: { three(): { gl: { xr: { getSession(): { end(): Promise<void> } | null } } } } }).__mansion.three();
    await three.gl.xr.getSession()?.end();
  });
  await expect(page.getByTestId("hud")).toBeVisible();
  await expect(page.getByTestId("enter-vr")).toBeEnabled();
  await closeAll([page]);
  expect(problems).toEqual([]);
});
