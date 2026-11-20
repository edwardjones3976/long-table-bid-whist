/**
 * Avatars end to end: a look chosen in the editor (by mouse and by keyboard) is the look the others draw, a change
 * made in a room reaches them within 2 s, a wave plays on their screen, and "Show others as simple shapes" changes
 * the detail they draw. My own body is only in the mirror's reflection. A table of four is drawn seated, each holding
 * a fan of card backs and never a face. In an emulated headset the look panel saves a look the others see (pressing
 * Your look again keeps the edits), the gesture wheel plays a wave, and seated at a table the panel still saves.
 *
 * Screenshots for a person to judge, in client/.e2e-screens/: avatars-starts (the editor's six starting looks),
 * avatars-face (a close look at a face), avatars-foyer-day and avatars-foyer-night (a group in the foyer),
 * avatars-mirror (the foyer mirror), avatars-table (four seated people) and avatars-vr-look-seated (the look panel
 * seen from a chair).
 */
import { expect, test, type Page } from "@playwright/test";
import { CATALOG, cleanLook, STARTING_LOOKS, type Look } from "../../shared/avatar";
import type { Pose, RoomSnapshot } from "../../shared/protocol";
import { MIRROR, seatPose, spawn, tableSpot } from "../../client/src/world/layout";
import { enterHeadset, park, rayPress, sitWithRay } from "./headset";
import { closeAll, enter, open, openMenu, problems, settle, shoot, standBy } from "./helpers";

test.beforeEach(() => void (problems.length = 0));

interface Drawn {
  memberId: string;
  lookKey: string;
  detail: string;
  triangles: number;
  gesture: string | null;
}
/** The debug hooks this file needs beyond the shared Mansion type. */
interface Hooks {
  avatars(): Drawn[];
  mirror(): boolean;
  net: { setLook(look: Look): Promise<{ ok: boolean }>; sendPose(pose: Pose): void };
  local: { set(partial: object): void; setComfort(partial: object): void };
}
const hooks = (page: Page) => ({
  drawn: (id: string) => page.evaluate((i) => (window.__mansion as unknown as Hooks).avatars().find((a) => a.memberId === i) ?? null, id),
  me: () => page.evaluate(() => window.__mansion.getState().room!.you),
  saved: () => page.evaluate(() => (JSON.parse(localStorage.getItem("mansion.look") ?? "null") as { look: Look } | null)?.look ?? null),
});

/** Wears `look` and stands at `pose`, as a page without the 3D view (it sends no pose of its own). */
async function standAs(page: Page, look: Look, pose: Pose): Promise<void> {
  expect(await page.evaluate((l) => (window.__mansion as unknown as Hooks).net.setLook(l), look)).toMatchObject({ ok: true });
  await page.evaluate((p) => (window.__mansion as unknown as Hooks).net.sendPose(p), pose);
}

test("a look chosen in the editor is what the others see: saved, changed in the room, waving, and as simple shapes", async ({ browser }) => {
  const ana = await open(browser, true);
  await ana.evaluate(() => (window.__mansion as unknown as Hooks).local.setComfort({ reducedMotion: true }));
  await ana.getByTestId("entry-name").fill("Ana");
  await ana.getByTestId("entry-look").click();
  const editor = ana.getByRole("dialog", { name: "Your look" });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("button", { name: /^Starting look \d:/ })).toHaveCount(6);
  await settle(ana, 800);
  await shoot(ana, "avatars-starts");

  // By mouse: the first starting look, then a hair colour.
  const start = STARTING_LOOKS[0];
  await editor.getByRole("button", { name: /^Starting look 1:/ }).click();
  // By keyboard: arrows walk the tabs to Hair, Tab reaches the hair styles, an arrow tries the next style, Enter chooses it.
  await editor.getByRole("tab", { name: "Body" }).focus();
  await ana.keyboard.press("ArrowRight");
  await ana.keyboard.press("ArrowRight");
  await expect(editor.getByRole("tab", { name: "Hair" })).toHaveAttribute("aria-selected", "true");
  await ana.keyboard.press("Tab");
  await ana.keyboard.press("Tab");
  const styles = CATALOG.hair.map(({ id }) => id as string);
  const style = CATALOG.hair[(styles.indexOf(start.hair) + 1) % styles.length];
  await ana.keyboard.press("ArrowRight");
  await expect(editor.getByRole("radio", { name: style.label, exact: true })).toBeFocused();
  await ana.keyboard.press("Enter");
  await expect(editor.getByRole("radio", { name: style.label, exact: true })).toHaveAttribute("aria-checked", "true");
  const colour = CATALOG.hairColor.find(({ id }) => id !== start.hairColor && id !== "black")!;
  await editor.getByRole("radiogroup", { name: "Hair colour" }).getByRole("radio", { name: colour.label, exact: true }).click();
  await expect(ana.getByTestId("look-news")).toHaveText(`Hair colour: ${colour.label}.`);

  await editor.getByRole("button", { name: "Face", exact: true }).click();
  await settle(ana, 800);
  await editor.getByRole("img", { name: /^Your new look/ }).screenshot({ path: "client/.e2e-screens/avatars-face.png" });
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(ana.getByTestId("entry-look")).toBeFocused();
  const chosen = cleanLook({ ...start, hair: style.id, hairColor: colour.id });
  expect(await hooks(ana).saved()).toEqual(chosen);

  await ana.getByTestId("entry-create").click();
  await expect(ana.getByTestId("hud")).toBeVisible();
  const code = (await ana.getByTestId("room-code").textContent()) ?? "";
  const bo = (await enter(browser, "Bo", code, true)).page;
  const anaId = await hooks(ana).me();

  // Bo draws Ana in the look she saved, near (they stand together at the door): both read from one frame.
  await expect
    .poll(async () => {
      const seen = await hooks(bo).drawn(anaId);
      return seen && { look: JSON.parse(seen.lookKey), detail: seen.detail };
    })
    .toEqual({ look: chosen, detail: "near" });

  // Ana changes her look in the room: Bo sees the new one within 2 s.
  await openMenu(ana);
  await ana.getByTestId("hud-look").click();
  await editor.getByRole("button", { name: /^Starting look 6:/ }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  const next = cleanLook(STARTING_LOOKS[5]);
  await expect.poll(async () => JSON.parse((await hooks(bo).drawn(anaId))?.lookKey ?? "null"), { timeout: 2000, intervals: [50] }).toEqual(next);
  expect(await hooks(ana).saved()).toEqual(next);

  // G opens the gestures, 1 waves: Bo's figure of Ana plays it.
  await ana.keyboard.press("g");
  await expect(ana.getByTestId("gestures")).toBeVisible();
  await ana.keyboard.press("1");
  await expect.poll(async () => (await hooks(bo).drawn(anaId))?.gesture, { intervals: [50] }).toBe("wave");
  await ana.keyboard.press("Escape");
  await expect(ana.getByTestId("gestures")).toHaveCount(0);

  // Bo's comfort switch: the others become simple shapes.
  await openMenu(bo);
  await bo.getByTestId("settings-toggle").click();
  await bo.getByLabel("Show others as simple shapes").check();
  await expect.poll(async () => (await hooks(bo).drawn(anaId))?.detail).toBe("simple");
  await expect.poll(async () => (await hooks(bo).drawn(anaId))!.triangles).toBeLessThanOrEqual(600);

  await closeAll([ana, bo]);
  expect(problems).toEqual([]);
});

test("the others in the foyer by day and by night, my own look in the mirror, and a table of four seated with card backs", async ({ browser }) => {
  const viewer = await enter(browser, "Bo", undefined, true, false);
  const bo = viewer.page;
  expect(await bo.evaluate((l) => (window.__mansion as unknown as Hooks).net.setLook(l), STARTING_LOOKS[1])).toMatchObject({ ok: true });
  // Six people, one in each starting look, in a loose row across the foyer, facing Bo at the door.
  const guests: Page[] = [];
  for (const [i, look] of STARTING_LOOKS.entries()) {
    const page = (await enter(browser, ["Ana", "Cy", "Dee", "Eli", "Fay", "Gus"][i], viewer.code)).page;
    await standAs(page, look, { x: spawn.x + (i - 2.5) * 0.85, z: spawn.z - 3.2 - (i % 2) * 0.5, ry: Math.PI + (i - 2.5) * 0.12 });
    guests.push(page);
  }
  const ids = await Promise.all(guests.map((page) => hooks(page).me()));
  await expect.poll(async () => (await Promise.all(ids.map((id) => hooks(bo).drawn(id)))).every(Boolean)).toBe(true);
  await settle(bo, 1500);
  await bo.screenshot({ path: "client/.e2e-screens/avatars-foyer-day.png" });
  await bo.evaluate(() => (window.__mansion as unknown as Hooks).local.set({ theme: "newyear" }));
  await settle(bo, 1500);
  await bo.screenshot({ path: "client/.e2e-screens/avatars-foyer-night.png" });
  await bo.evaluate(() => (window.__mansion as unknown as Hooks).local.set({ theme: "july4" }));

  // Bo walks up to the mirror and sees himself in it.
  const front = { x: MIRROR.x + 2.2, z: MIRROR.z, ry: MIRROR.ry };
  expect(await bo.evaluate((p) => window.__mansion.isWalkable(p.x, p.z), front)).toBe(true);
  await bo.evaluate((p) => window.__mansion.teleport(p), front);
  await expect.poll(() => bo.evaluate(() => (window.__mansion as unknown as Hooks).mirror())).toBe(true);
  // My own figure is all on the mirror layer (5), which the reflection's camera sees and the main camera never does.
  const layers = await bo.evaluate(() => {
    const { scene, camera } = (window.__mansion as unknown as { three(): { scene: import("three").Scene; camera: import("three").Camera } }).three();
    const others = (object: import("three").Object3D | null): boolean => !!object && (object.name.startsWith("avatar-") || others(object.parent));
    const mine: number[] = [];
    let reflects = false;
    scene.traverse((object) => {
      if (object.name === "avatar" && !others(object)) object.traverse((part) => void ((part as import("three").Mesh).isMesh && mine.push(part.layers.mask)));
      const glass = object as unknown as { isReflector?: boolean; camera: import("three").Camera };
      if (glass.isReflector) reflects = glass.camera.layers.isEnabled(5);
    });
    return { meshes: mine.length, offLayer: mine.filter((mask) => mask !== 1 << 5).length, mainSees: camera.layers.isEnabled(5), reflects };
  });
  expect(layers.meshes).toBeGreaterThan(0);
  expect(layers).toMatchObject({ offLayer: 0, mainSees: false, reflects: true });
  await settle(bo, 1500);
  await bo.screenshot({ path: "client/.e2e-screens/avatars-mirror.png" });

  // Four of them sit down at Tonk Table 1 and start; Bo watches from beside it.
  const tableId = "tonk-1";
  for (const [seat, page] of guests.slice(0, 4).entries()) {
    await page.getByTestId(`table-${tableId}`).click();
    await page.getByTestId(`sit-${seat}`).click();
    await page.getByTestId("ready").click();
  }
  await guests[0].getByTestId("start").click();
  await standBy(bo, tableSpot(tableId));
  const seated = (id: string) =>
    bo.evaluate((i) => {
      const group = (window.__mansion as unknown as { three(): { scene: import("three").Scene } }).three().scene.getObjectByName(`avatar-${i}`);
      if (!group) return null;
      group.updateMatrixWorld(true);
      const y = (name: string) => group.getObjectByName(name)!.getWorldPosition(group.position.clone()).y;
      const fan = group.getObjectByName("fan") as import("three").InstancedMesh;
      const material = fan.material as import("three").MeshBasicMaterial;
      const textured: string[] = [];
      group.traverse((object) => {
        const own = (object as import("three").Mesh).material as import("three").MeshBasicMaterial | undefined;
        if (own?.map) textured.push(object.name);
      });
      const back = [...(material.map!.image as HTMLCanvasElement).getContext("2d")!.getImageData(8, 8, 1, 1).data.slice(0, 3)];
      return { x: group.position.x, z: group.position.z, thigh: y("thighL") - y("shinL"), fan: fan.count, both: material.side, back, textured: textured.sort() };
    }, id);
  for (const [seat, id] of ids.slice(0, 4).entries()) {
    const chair = seatPose(tableId, seat as 0 | 1 | 2 | 3);
    // Sat 0.18 m forward of the chair's middle, on its cushion, knees under the table top (world/Avatars.tsx sitPlace).
    const at = { x: chair.x - Math.sin(chair.ry) * 0.18, z: chair.z - Math.cos(chair.ry) * 0.18 };
    await expect.poll(async () => (await seated(id))?.fan ?? 0).toBeGreaterThan(0);
    const seen = (await seated(id))!;
    expect(Math.hypot(seen.x - at.x, seen.z - at.z)).toBeLessThan(0.05);
    // Seated: the knee is about as high as the hip.
    expect(Math.abs(seen.thigh)).toBeLessThan(0.2);
    // Only the card backs (the fan, and the one card of a card slap, shown only while it plays) and the name plate carry a
    // picture, and the fan's is the card back (deep blue), on both sides.
    expect(seen.textured).toEqual(["fan", "plate", "slap-card"]);
    expect(seen.back).toEqual([0x14, 0x30, 0x6b]);
    expect(seen.both).toBe(2);
  }
  await settle(bo, 1500);
  await bo.screenshot({ path: "client/.e2e-screens/avatars-table.png" });

  await closeAll([bo, ...guests]);
  expect(problems).toEqual([]);
});

test("in an emulated headset the look panel saves a look the others see, and the gesture wheel plays a wave", async ({ browser }) => {
  test.setTimeout(240_000);
  const ana = await enterHeadset(browser, "Ana");
  const room = () => ana.evaluate(() => window.__mansion.getState().room as unknown as RoomSnapshot);
  const bo = (await enter(browser, "Bo", (await room()).code, true)).page;
  const anaId = await hooks(ana).me();
  const before = (await room()).members.find((member) => member.id === anaId)!.look;

  // VR menu, Your look, then Next on the first field (the build).
  await rayPress(ana, "right", "vr-menu");
  await rayPress(ana, "right", "vr-menu-look");
  await rayPress(ana, "right", "vr-look-next");
  const builds = CATALOG.build.map(({ id }) => id as string);
  const next = cleanLook({ ...before, build: builds[(builds.indexOf(before.build) + 1) % builds.length] });
  // Your look pressed again while editing keeps the edit.
  await rayPress(ana, "right", "vr-menu");
  await rayPress(ana, "right", "vr-menu-look");
  await rayPress(ana, "right", "vr-look-save");
  await expect.poll(() => hooks(ana).saved()).toEqual(next);
  await expect.poll(async () => JSON.parse((await hooks(bo).drawn(anaId))?.lookKey ?? "null")).toEqual(next);

  // The gesture wheel: Bo's figure of Ana waves.
  await rayPress(ana, "right", "vr-menu");
  await rayPress(ana, "right", "vr-menu-gestures");
  await rayPress(ana, "right", "vr-gesture-wave");
  await expect.poll(async () => (await hooks(bo).drawn(anaId))?.gesture, { intervals: [50] }).toBe("wave");
  await park(ana, "right");

  // Seated at a table, by one hand: the panel comes closer and a little higher, and its lowest row still saves.
  await ana.evaluate(() => (window.__mansion as unknown as Hooks).local.set({ vrMenu: false }));
  await sitWithRay(ana, tableSpot("tonk-1"));
  await rayPress(ana, "right", "vr-menu");
  await rayPress(ana, "right", "vr-menu-look");
  await park(ana, "right");
  await settle(ana, 300);
  await ana.screenshot({ path: "client/.e2e-screens/avatars-vr-look-seated.png" });
  await rayPress(ana, "right", "vr-look-next");
  await rayPress(ana, "right", "vr-look-save");
  const seatedNext = cleanLook({ ...next, build: builds[(builds.indexOf(next.build) + 1) % builds.length] });
  await expect.poll(() => hooks(ana).saved()).toEqual(seatedNext);
  await park(ana, "right");

  await closeAll([ana, bo]);
  expect(problems).toEqual([]);
});
