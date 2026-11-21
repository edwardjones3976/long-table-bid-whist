/**
 * Evidence for docs/avatar-design.html: pictures of the built avatars to set beside the proposal, and what they cost.
 * It checks no behaviour (avatars.e2e.ts does): it passes once every picture is taken, and a person judges them.
 * Everything goes to client/.e2e-screens/conformance/after/ (git-ignored), the numbers to numbers.json there.
 *
 * The other people are bare sockets opened by this test, not browser pages, so a full room of 32 costs one page.
 * Day and night are the two themes in THEMES.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import type { Camera, Mesh, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { CATALOG, cleanLook, GARMENT_PALETTE, GESTURE_MS, GESTURES, PALETTE_FAMILIES, shuffleLook, SKIN_TONES, STARTING_LOOKS, type Look } from "../../shared/avatar";
import type { Pose, Seat, TableId } from "../../shared/protocol";
import { hair } from "../../client/src/avatar/hair";
import { measure } from "../../client/src/avatar/measure";
import { triangles } from "../../client/src/avatar/shapes";
import { MIRROR, seatPose, tableSpot } from "../../client/src/world/layout";
import { enterHeadset, park, rayPress, rig, sitWithRay } from "./headset";
import { closeAll, enter, open, problems, sitAt } from "./helpers";

const DIR = "client/.e2e-screens/conformance/after";
const THEMES = [
  ["day", "july4"],
  ["night", "newyear"],
] as const;
const NUMBERS = `${DIR}/numbers.json`;
/** Relative to DIR: client/.e2e-screens/round3/, for the hair-under-hats pictures. */
const ROUND3 = "../../round3";
// Kept across runs, so one test run alone updates only its own entries.
const numbers: Record<string, unknown> = existsSync(NUMBERS) ? JSON.parse(readFileSync(NUMBERS, "utf8")) : {};
const record = (key: string, value: unknown) => {
  numbers[key] = value;
  mkdirSync(DIR, { recursive: true });
  writeFileSync(NUMBERS, `${JSON.stringify(numbers, null, 2)}\n`);
};

test.beforeEach(() => void (problems.length = 0));

/** The debug hooks this file uses beyond the shared Mansion type (client/src/main.tsx). */
interface Hooks {
  three(): { scene: Scene; camera: Camera; gl: WebGLRenderer };
  avatars(): { memberId: string; detail: string; triangles: number; gesture: string | null; animated: number }[];
  mirror(): boolean;
  net: { setLook(look: Look): Promise<{ ok: boolean }>; setReady(ready: boolean): Promise<{ ok: boolean }>; start(): Promise<{ ok: boolean; message?: string }> };
  local: { set(partial: object): void; setComfort(partial: object): void };
}

// ---- the others: sockets, not pages ----

interface Guest {
  socket: Socket;
  id: string;
}

const ask = (socket: Socket, event: string, payload: object): Promise<{ ok: boolean; memberId?: string; message?: string }> => socket.timeout(8000).emitWithAck(event, payload);

async function join(url: string, code: string, people: { name: string; look: Look }[]): Promise<Guest[]> {
  const guests: Guest[] = [];
  for (const { name, look } of people) {
    const socket = io(url, { transports: ["websocket"], forceNew: true });
    const joined = await ask(socket, "room:join", { code, name: name.slice(0, 20), look });
    expect(joined, name).toMatchObject({ ok: true });
    guests.push({ socket, id: joined.memberId! });
  }
  return guests;
}

async function leave(guests: Guest[]): Promise<void> {
  for (const { socket } of guests) {
    await ask(socket, "room:leave", {});
    socket.disconnect();
  }
}

const stand = (guests: Guest[], poses: Pose[]) => guests.forEach(({ socket }, i) => socket.emit("pose", poses[i]));

// ---- the viewer ----

const frames = (page: Page, count: number): Promise<void> =>
  page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        // The scene registers itself once it draws, which on a slow renderer can be after the page has entered the room.
        let from: number | null = null;
        const timer = setInterval(() => {
          const three = (window.__mansion as unknown as Hooks).three() as ReturnType<Hooks["three"]> | undefined;
          if (!three) return;
          const info = three.gl.info.render;
          from ??= info.frame;
          if (info.frame < from + n) return;
          clearInterval(timer);
          resolve();
        }, 10);
      }),
    count,
  );

/** The game's camera, 70 degrees tall. */
const GAME_FOV = 70;
/** 40 degrees over the 800-pixel view is 20 pixels a degree: about a headset's sharpness. */
const HEADSET_FOV = 40;
/** Sets the camera's vertical field of view, which changes no detail: a closer look at the same figures. */
const zoomTo = async (page: Page, fov: number) => {
  await page.evaluate((f) => {
    const camera = (window.__mansion as unknown as Hooks).three().camera as PerspectiveCamera;
    camera.fov = f;
    camera.updateProjectionMatrix();
  }, fov);
  await frames(page, 4);
};

const setTheme = async (page: Page, theme: string) => {
  await page.evaluate((t) => (window.__mansion as unknown as Hooks).local.set({ theme: t }), theme);
  await frames(page, 12);
};

async function viewFrom(page: Page, pose: Pose): Promise<void> {
  expect(await page.evaluate((p) => window.__mansion.isWalkable(p.x, p.z), pose), JSON.stringify(pose)).toBe(true);
  await page.evaluate((p) => window.__mansion.teleport(p), pose);
  await page.waitForFunction((p) => {
    const at = window.__mansion.local.getState().playerPose;
    return at !== null && Math.hypot(at.x - p.x, at.z - p.z) < 0.05;
  }, pose);
}

/** Waits until the viewer draws every guest at its pose and turn (in `detail` when given), then a few frames more. */
async function placed(page: Page, guests: Guest[], poses: Pose[], detail?: string): Promise<void> {
  const list = guests.map(({ id }, i) => ({ id, ...poses[i] }));
  await expect
    .poll(
      () =>
        page.evaluate(
          ({ list, detail }) => {
            const hooks = window.__mansion as unknown as Hooks;
            const { scene } = hooks.three();
            const drawn = hooks.avatars();
            return list.every(({ id, x, z, ry }) => {
              const group = scene.getObjectByName(`avatar-${id}`);
              const seen = drawn.find((avatar) => avatar.memberId === id);
              return !!group?.visible && !!seen && Math.hypot(group.position.x - x, group.position.z - z) < 0.02 && Math.abs(group.children[0].rotation.y - ry) < 1e-6 && (!detail || seen.detail === detail);
            });
          },
          { list, detail },
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
  await frames(page, 6);
}

const detailsOf = (page: Page, guests: Guest[]) =>
  page.evaluate((ids) => ids.map((id) => (window.__mansion as unknown as Hooks).avatars().find((avatar) => avatar.memberId === id)?.detail ?? "none"), guests.map(({ id }) => id));

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The screen rectangle (CSS pixels) the guests' figures and name plates cover, `pad` larger, kept on the canvas. With
 * `joint` (a bone of the figure's skeleton, which carries no meshes of its own), only a box round that joint: from
 * 5 cm below it to 40 cm above and 22 cm either side, which holds a head with its hair or hat.
 */
const boxOf = (page: Page, guests: Guest[], joint: string | null, pad: number): Promise<Box> =>
  page.evaluate(
    ({ ids, joint, pad }) => {
      const { scene, camera, gl } = (window.__mansion as unknown as Hooks).three();
      scene.updateMatrixWorld(true);
      const rect = gl.domElement.getBoundingClientRect();
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      const take = (x: number, y: number, z: number, matrix: Mesh["matrixWorld"]) => {
        const p = camera.position.clone().set(x, y, z).applyMatrix4(matrix).project(camera);
        const [sx, sy] = [rect.left + ((p.x + 1) / 2) * rect.width, rect.top + ((1 - p.y) / 2) * rect.height];
        [x0, y0, x1, y1] = [Math.min(x0, sx), Math.min(y0, sy), Math.max(x1, sx), Math.max(y1, sy)];
      };
      for (const id of ids) {
        const group = scene.getObjectByName(`avatar-${id}`)!;
        if (joint) {
          const bone = group.getObjectByName(joint)!;
          for (const x of [-0.22, 0.22]) for (const y of [-0.05, 0.4]) for (const z of [-0.22, 0.22]) take(x, y, z, bone.matrixWorld);
          continue;
        }
        group.traverseVisible((object) => {
          const mesh = object as Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.computeBoundingBox();
          const { min, max } = mesh.geometry.boundingBox!;
          for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) take(x, y, z, mesh.matrixWorld);
        });
      }
      const [left, top] = [Math.max(rect.left, Math.floor(x0 - pad)), Math.max(rect.top, Math.floor(y0 - pad))];
      return { x: left, y: top, width: Math.min(rect.right, Math.ceil(x1 + pad)) - left, height: Math.min(rect.bottom, Math.ceil(y1 + pad)) - top };
    },
    { ids: guests.map(({ id }) => id), joint, pad },
  );

/** A square around a box's middle, as large as its longer side, kept on the page. */
function square(box: Box, page: Page): Box {
  const side = Math.max(box.width, box.height);
  const { width, height } = page.viewportSize()!;
  const x = Math.max(0, Math.min(width - side, Math.round(box.x + box.width / 2 - side / 2)));
  const y = Math.max(0, Math.min(height - side, Math.round(box.y + box.height / 2 - side / 2)));
  return { x, y, width: Math.min(side, width), height: Math.min(side, height) };
}

/** Meshes (each one draw call) and triangles of each guest's whole drawn figure: body, outline, plate and fan. */
const costsOf = (page: Page, guests: Guest[]) =>
  page.evaluate(
    (ids) => {
      const hooks = window.__mansion as unknown as Hooks;
      return ids.map((id) => {
        const cost = { detail: "", budgetTriangles: 0, meshes: 0, outlineMeshes: 0, plateMeshes: 0, triangles: 0, outlineTriangles: 0 };
        hooks
          .three()
          .scene.getObjectByName(`avatar-${id}`)!
          .traverseVisible((object) => {
            const mesh = object as Mesh & { isInstancedMesh?: boolean; count?: number };
            if (!mesh.isMesh) return;
            const { index, attributes } = mesh.geometry;
            const count = ((index ? index.count : attributes.position.count) / 3) * (mesh.isInstancedMesh ? (mesh.count ?? 1) : 1);
            cost.meshes += 1;
            cost.triangles += count;
            if (mesh.name === "outline") [cost.outlineMeshes, cost.outlineTriangles] = [cost.outlineMeshes + 1, cost.outlineTriangles + count];
            if (mesh.name === "plate") cost.plateMeshes += 1;
          });
        const seen = hooks.avatars().find((avatar) => avatar.memberId === id);
        return { ...cost, detail: seen?.detail ?? "none", budgetTriangles: seen?.triangles ?? 0 };
      });
    },
    guests.map(({ id }) => id),
  );

/** Draw calls and triangles of one whole frame, as three.js counts them, with the others' figures shown or hidden. */
const frameCost = (page: Page, hide: boolean) =>
  page.evaluate(
    (hidden) =>
      new Promise<{ calls: number; triangles: number; autoReset: boolean }>((resolve) => {
        const { scene, gl } = (window.__mansion as unknown as Hooks).three();
        const parts: { visible: boolean }[] = [];
        scene.traverse((object) => void (object.name.startsWith("avatar-") && parts.push(...object.children)));
        parts.forEach((part) => (part.visible = !hidden));
        const before = scene.onAfterRender;
        // The first frames after a change may still be the old one.
        let skip = 3;
        scene.onAfterRender = (...args) => {
          before.apply(scene, args);
          if (skip-- > 0) return;
          scene.onAfterRender = before;
          parts.forEach((part) => (part.visible = true));
          resolve({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, autoReset: gl.info.autoReset });
        };
      }),
    hide,
  );

// ---- contact sheets, drawn by the browser from the pictures taken ----

interface Cell {
  label: string;
  png: Buffer;
}

async function sheet(browser: Browser, file: string, title: string, cells: Cell[], columns: number): Promise<void> {
  // Small to start with, so the page measures the sheet's own size rather than the window's.
  const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
  const figures = cells.map(({ label, png }) => `<figure><img src="data:image/png;base64,${png.toString("base64")}"><figcaption>${label}</figcaption></figure>`);
  await page.setContent(
    `<style>body{margin:0;padding:8px;width:max-content;background:#202124;color:#f1f1f1;font:15px/1.3 sans-serif}p{margin:0 0 8px}div{display:grid;grid-template-columns:repeat(${columns},max-content);gap:8px;align-items:end}figure{margin:0}img{display:block}</style>` +
      `<p>${title}</p><div>${figures.join("")}</div>`,
  );
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  await page.setViewportSize(size);
  await page.screenshot({ path: `${DIR}/${file}`, fullPage: true });
  await page.close();
}

// ---- where everyone stands, in the central gallery ----

const ROW_Z = -4;
const FACING_VIEWER = Math.PI;
const rowPoses = (n: number, ry: number): Pose[] => Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * 0.9, z: ROW_Z, ry }));
const viewer = (x: number, metres: number): Pose => ({ x, z: ROW_Z + metres, ry: 0 });
const TURNS = [
  ["front", FACING_VIEWER],
  ["side", Math.PI / 2],
  ["behind", 0],
] as const;

/** A row of six turned to each of `turns`, from 3 m away: one picture of the row per turn, stacked. */
async function rowSheet(page: Page, browser: Browser, guests: Guest[], file: string, title: string, turns: readonly (readonly [string, number])[]): Promise<void> {
  const cells: Cell[] = [];
  for (const [turn, ry] of turns) {
    const poses = rowPoses(guests.length, ry);
    stand(guests, poses);
    await placed(page, guests, poses, "near");
    cells.push({ label: turn, png: await page.screenshot({ clip: await boxOf(page, guests, null, 40) }) });
  }
  await sheet(browser, file, title, cells, 1);
}

const count = (dressing: ReturnType<typeof hair>) => [...Object.values(dressing.shell), ...Object.values(dressing.detail)].flat().reduce((sum, g) => sum + triangles(g!), 0);

test("in the gallery: the six starting looks, faces at three distances, heavy hair and head coverings, gestures, costs, and the mirror", async ({ browser, baseURL }) => {
  test.setTimeout(1_200_000);
  const { page, code } = await enter(browser, "Viewer", undefined, true, false);
  const url = baseURL!;
  const starts = await join(
    url,
    code,
    STARTING_LOOKS.map((look, i) => ({ name: `Start ${i + 1}`, look })),
  );
  const front = rowPoses(6, FACING_VIEWER);

  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    // 1. The row from the front, the side and behind.
    await viewFrom(page, viewer(0, 3.5));
    await rowSheet(page, browser, starts, `01-starting-looks-${theme}.png`, `The six starting looks (Start 1 to 6, left to right), 3.5 m away, ${theme}`, TURNS);

    // 2. Faces at about 1 m, one at a time, then the row at 3 m and 8 m.
    stand(starts, front);
    const faces: Cell[] = [];
    for (const [i, pose] of front.entries()) {
      await viewFrom(page, viewer(pose.x, 1));
      await placed(page, starts, front, "near");
      faces.push({ label: `Start ${i + 1}`, png: await page.screenshot({ clip: square(await boxOf(page, [starts[i]], "head", 40), page) }) });
    }
    await sheet(browser, `02-faces-1m-${theme}.png`, `Each starting look's face from 1 m, ${theme}`, faces, 3);

    await viewFrom(page, viewer(0, 3));
    await placed(page, starts, front, "near");
    await page.screenshot({ path: `${DIR}/02-faces-3m-${theme}.png`, clip: await boxOf(page, starts, null, 40) });

    // At 8 m a figure keeps the detail it had (the half-metre band round the near line): near walking out, far walking in.
    // Each is also taken through a lens 3 times narrower (fov 24), which leaves the detail as it is: a closer look at the same figures.
    const eight: Cell[] = [];
    const zoomed: Cell[] = [];
    const lens = async (fov: number) => {
      await page.evaluate((f) => {
        const camera = (window.__mansion as unknown as Hooks).three().camera as PerspectiveCamera;
        camera.fov = f;
        camera.updateProjectionMatrix();
      }, fov);
      await frames(page, 4);
    };
    const take = async (label: string) => {
      eight.push({ label, png: await page.screenshot({ clip: await boxOf(page, starts, null, 30) }) });
      await lens(24);
      zoomed.push({ label, png: await page.screenshot({ clip: await boxOf(page, starts, null, 20) }) });
      await lens(70);
    };
    await viewFrom(page, viewer(0, 8));
    await placed(page, starts, front, "near");
    await take(`walked out to 8 m: ${(await detailsOf(page, starts)).join(", ")}`);
    await viewFrom(page, viewer(0, 12));
    await placed(page, starts, front, "far");
    await viewFrom(page, viewer(0, 8));
    await placed(page, starts, front, "far");
    await take(`walked in to 8 m: ${(await detailsOf(page, starts)).join(", ")}`);
    await sheet(browser, `02-faces-8m-${theme}.png`, `The six starting looks at 8 m, ${theme}: near detail above, far detail below`, eight, 1);
    await sheet(browser, `02-faces-8m-zoom3x-${theme}.png`, `The same at 8 m through a 3x narrower lens (fov 24), ${theme}: near detail above, far detail below`, zoomed, 1);

    // Across a lounge (16 by 18 m), at about a headset's sharpness: far detail at 12, 16 and 18 m.
    const across: Cell[] = [];
    for (const metres of [12, 16, 18]) {
      await viewFrom(page, viewer(0, metres));
      await placed(page, starts, front, "far");
      await zoomTo(page, HEADSET_FOV);
      across.push({ label: `${metres} m, fov ${HEADSET_FOV} (about 20 pixels a degree)`, png: await page.screenshot({ clip: await boxOf(page, starts, null, 20) }) });
      await zoomTo(page, GAME_FOV);
    }
    await sheet(browser, `02-faces-lounge-distances-${theme}.png`, `The six starting looks across a lounge, at a headset's sharpness, ${theme}`, across, 1);
  }

  // What one figure costs, near, far and as simple shapes.
  const perFigure: Record<string, unknown> = {};
  await viewFrom(page, viewer(0, 3));
  await placed(page, starts, front, "near");
  perFigure.near = await costsOf(page, starts);
  await viewFrom(page, viewer(0, 12));
  await placed(page, starts, front, "far");
  perFigure.far = await costsOf(page, starts);
  await viewFrom(page, viewer(0, 3));
  await page.evaluate(() => (window.__mansion as unknown as Hooks).local.setComfort({ simpleShapes: true }));
  await placed(page, starts, front, "simple");
  perFigure.simple = await costsOf(page, starts);
  await page.evaluate(() => (window.__mansion as unknown as Hooks).local.setComfort({ simpleShapes: false }));
  record("perFigure", perFigure);
  await leave(starts);

  // 3. The heaviest hair styles (most triangles), every head covering over a large afro, and the hats.
  const base = cleanLook({ ...STARTING_LOOKS[1], accessories: [], headwear: "none" });
  const heavy = CATALOG.hair
    .map(({ id, label }) => ({ id, label, triangles: count(hair(cleanLook({ ...base, hair: id }), measure(base), "near")) }))
    .sort((a, b) => b.triangles - a.triangles);
  record("hairTrianglesNear", heavy);
  const colours = ["plum", "gold", "emerald", "black", "wine", "charcoal"];
  const rows: [string, string, { name: string; look: Look }[]][] = [
    ["heavy-hair", "The six heaviest hair styles", heavy.slice(0, 6).map(({ id, label }) => ({ name: label, look: cleanLook({ ...base, hair: id }) }))],
    [
      "head-coverings",
      "Every head covering, each over a large afro",
      CATALOG.headwear.filter(({ id }) => id !== "none").map(({ id, label }, i) => ({ name: label, look: cleanLook({ ...base, hair: "afro-l", headwear: id, headwearColor: colours[i] }) })),
    ],
    [
      "hats",
      "The hats, over a large afro, long locs, box braids and a durag",
      (
        [
          ["cap", "afro-l", "none"],
          ["bucket", "afro-l", "none"],
          ["fedora", "afro-l", "none"],
          ["cap", "locs-long", "none"],
          ["bucket", "box-braids", "none"],
          ["fedora", "waves", "durag"],
        ] as const
      ).map(([hat, style, headwear]) => ({ name: `${hat} ${style}${headwear === "none" ? "" : ` ${headwear}`}`, look: cleanLook({ ...base, hair: style, headwear, accessories: [hat] }) })),
    ],
    [
      "hats-over-locs-and-braids",
      "Short locs, cornrows, knots and box braids under the hats, and long styles under the crown hat and the beanie",
      (
        [
          ["cap", "locs-short", "none"],
          ["fedora", "cornrows", "none"],
          ["fedora", "knots", "none"],
          ["fedora", "box-braids", "none"],
          [null, "silk-press", "crown-hat"],
          [null, "locs-long", "beanie"],
        ] as const
      ).map(([hat, style, headwear]) => ({
        name: `${hat ?? headwear} ${style}`,
        look: cleanLook({ ...base, hair: style, headwear, headwearColor: "plum", accessories: hat ? [hat] : [] }),
      })),
    ],
  ];
  for (const [file, title, people] of rows) {
    const guests = await join(url, code, people);
    for (const [theme, id] of THEMES) {
      await setTheme(page, id);
      await viewFrom(page, viewer(0, 3));
      await rowSheet(page, browser, guests, `03-${file}-${theme}.png`, `${title}, left to right: ${people.map(({ name }) => name).join(", ")}; ${theme}`, TURNS);
    }
    await leave(guests);
  }

  // 7. Each gesture mid-play, on one figure 2.5 m away.
  const [actor] = await join(url, code, [{ name: "Start 1", look: STARTING_LOOKS[0] }]);
  const spot = [{ x: 0, z: ROW_Z, ry: FACING_VIEWER }];
  stand([actor], spot);
  await viewFrom(page, viewer(0, 2.5));
  await placed(page, [actor], spot, "near");
  const clip = await boxOf(page, [actor], null, 150);
  const played: Record<string, string[]> = {};
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    const cells: Cell[] = [];
    for (const { id: kind, label } of GESTURES) {
      expect(await ask(actor.socket, "gesture", { kind })).toMatchObject({ ok: true });
      const gesture = () => page.evaluate((i) => (window.__mansion as unknown as Hooks).avatars().find((avatar) => avatar.memberId === i)?.gesture ?? null, actor.id);
      await expect.poll(gesture, { intervals: [30] }).toBe(kind);
      // The card slap where the card has landed; the rest part way in.
      const share = kind === "slap" ? 0.65 : 0.4;
      await page.waitForTimeout(GESTURE_MS[kind] * share);
      cells.push({ label: `${label} (${share * 100}%)`, png: await page.screenshot({ clip }) });
      (played[theme] ??= []).push(`${kind}: ${(await gesture()) ?? "over before the picture was read back"}`);
      // The server allows three gestures in four seconds.
      await page.waitForTimeout(GESTURE_MS[kind] + 400);
    }
    await sheet(browser, `07-gestures-${theme}.png`, `The seven gestures part way through their play, 2.5 m away, ${theme}`, cells, 4);
  }
  record("gesturesStillPlayingAfterPicture", played);
  await leave([actor]);

  // Costs with a full room: 31 others (the room holds 32 people, the viewer included) in view.
  await setTheme(page, "july4");
  const random = ((seed: number) => () => {
    // mulberry32: the same crowd on every run.
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  })(7);
  const crowdLooks = [...STARTING_LOOKS, ...Array.from({ length: 25 }, () => shuffleLook(random))];
  const crowd = await join(
    url,
    code,
    crowdLooks.map((look, i) => ({ name: `Guest ${i + 1}`, look })),
  );
  const grid = crowd.map((_, i): Pose => ({ x: ((i % 8) - 3.5) * 0.75, z: -3 - Math.floor(i / 8) * 0.9, ry: FACING_VIEWER }));
  stand(crowd, grid);
  const room: Record<string, unknown> = { figures: crowd.length, distinctLooks: new Set(crowdLooks.map((look) => JSON.stringify(look))).size };
  for (const [detail, at] of [
    ["near", { x: 0, z: 0, ry: 0 }],
    ["far", { x: 0, z: 8, ry: 0 }],
    ["simple", { x: 0, z: 0, ry: 0 }],
  ] as const) {
    await viewFrom(page, at);
    if (detail === "simple") await page.evaluate(() => (window.__mansion as unknown as Hooks).local.setComfort({ simpleShapes: true }));
    await placed(page, crowd, grid, detail);
    const costs = await costsOf(page, crowd);
    const shown = await frameCost(page, false);
    const hidden = await frameCost(page, true);
    room[detail] = {
      meshesCounted: costs.reduce((sum, cost) => sum + cost.meshes, 0),
      trianglesCounted: costs.reduce((sum, cost) => sum + cost.triangles, 0),
      frame: shown,
      frameWithoutFigures: hidden,
      callsForFigures: shown.calls - hidden.calls,
      callsPerFigure: (shown.calls - hidden.calls) / crowd.length,
      callsFor32Figures: Math.round(((shown.calls - hidden.calls) / crowd.length) * 32),
    };
    if (detail === "near") {
      await page.screenshot({ path: `${DIR}/04-crowd-31-near-day.png` });
      // The same crowd at about a headset's sharpness: every plate a whole plate above or below its neighbours'.
      await zoomTo(page, HEADSET_FOV);
      await page.screenshot({ path: `${DIR}/04-crowd-31-near-headset-lens-day.png` });
      await zoomTo(page, GAME_FOV);
    }
  }
  await page.evaluate(() => (window.__mansion as unknown as Hooks).local.setComfort({ simpleShapes: false }));
  record("fullRoom", room);
  await leave(crowd);

  // 6. My own look in the foyer mirror.
  expect(await page.evaluate((look) => (window.__mansion as unknown as Hooks).net.setLook(look), STARTING_LOOKS[2])).toMatchObject({ ok: true });
  await viewFrom(page, { x: MIRROR.x + 2.2, z: MIRROR.z, ry: MIRROR.ry });
  await expect.poll(() => page.evaluate(() => (window.__mansion as unknown as Hooks).mirror())).toBe(true);
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/06-mirror-${theme}.png` });
  }

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("a table of four seated with card backs, from across the room and from a seat", async ({ browser, baseURL }) => {
  test.setTimeout(600_000);
  const { page, code } = await enter(browser, "Viewer", undefined, true, false);
  const seatAll = async (tableId: TableId, guests: Guest[], seats: Seat[]) => {
    stand(
      guests,
      seats.map((seat) => seatPose(tableId, seat)),
    );
    for (const [i, { socket }] of guests.entries()) {
      expect(await ask(socket, "table:sit", { tableId, role: "player", seat: seats[i] })).toMatchObject({ ok: true });
      expect(await ask(socket, "table:ready", { ready: true })).toMatchObject({ ok: true });
    }
  };
  const fans = (guests: Guest[]) =>
    page.evaluate(
      (ids) => ids.map((id) => ((window.__mansion as unknown as Hooks).three().scene.getObjectByName(`avatar-${id}`)?.getObjectByName("fan") as unknown as { count: number } | undefined)?.count ?? 0),
      guests.map(({ id }) => id),
    );

  // Four at Tonk Table 1, seen from across the Tonk Lounge.
  const four = await join(
    baseURL!,
    code,
    STARTING_LOOKS.slice(0, 4).map((look, i) => ({ name: `Start ${i + 1}`, look })),
  );
  await seatAll("tonk-1", four, [0, 1, 2, 3]);
  expect(await ask(four[0].socket, "table:start", {})).toMatchObject({ ok: true });
  const table = tableSpot("tonk-1");
  const from = { x: -9.5, z: 9 };
  await viewFrom(page, { ...from, ry: Math.atan2(from.x - table.x, from.z - table.z) });
  await expect.poll(() => fans(four).then((counts) => counts.every((n) => n > 0))).toBe(true);
  const away = Math.hypot(from.x - table.x, from.z - table.z);
  record("tableAcross", { metres: away, details: await detailsOf(page, four), fans: await fans(four) });
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    await page.screenshot({ path: `${DIR}/04-table-across-room-${theme}.png` });
    await zoomTo(page, HEADSET_FOV);
    await page.screenshot({ path: `${DIR}/04-table-across-room-headset-lens-${theme}.png` });
    await zoomTo(page, GAME_FOV);
  }

  // Beyond 15 m, where figures hold still: each is still posed seated (thigh level with the hip) after being built far.
  const out = { x: from.x - table.x, z: from.z - table.z };
  const farther = await page.evaluate(
    ({ table, out }) => {
      const length = Math.hypot(out.x, out.z);
      for (const metres of [16, 17, 18, 19]) {
        const at = { x: table.x + (out.x / length) * metres, z: table.z + (out.z / length) * metres };
        if (window.__mansion.isWalkable(at.x, at.z)) return { ...at, metres };
      }
      return null;
    },
    { table, out },
  );
  expect(farther, "a walkable spot 16 to 19 m from the table").not.toBeNull();
  await viewFrom(page, { x: farther!.x, z: farther!.z, ry: Math.atan2(farther!.x - table.x, farther!.z - table.z) });
  await expect.poll(() => detailsOf(page, four)).toEqual(["far", "far", "far", "far"]);
  await frames(page, 10);
  const thighs = await page.evaluate(
    (ids) => ids.map((id) => (window.__mansion as unknown as Hooks).three().scene.getObjectByName(`avatar-${id}`)?.getObjectByName("thighL")?.rotation.x ?? 0),
    four.map(({ id }) => id),
  );
  record("tableBeyond15m", { metres: farther!.metres, thighTurns: thighs });
  for (const turn of thighs) expect(turn).toBeGreaterThan(1);

  // Close by, from between two seats: the seated laps, the hems over them and the plates.
  const beside = { x: table.x + 2.2 * Math.SQRT1_2, z: table.z + 2.2 * Math.SQRT1_2 };
  await viewFrom(page, { ...beside, ry: Math.atan2(beside.x - table.x, beside.z - table.z) });
  await expect.poll(() => detailsOf(page, four)).toEqual(["near", "near", "near", "near"]);
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/04-table-near-${theme}.png`, clip: await boxOf(page, four, null, 30) });
  }

  // I sit at Tonk Table 2 with three others.
  await sitAt(page, tableSpot("tonk-2"));
  const three = await join(baseURL!, code, [
    { name: "Start 5", look: STARTING_LOOKS[4] },
    { name: "Start 6", look: STARTING_LOOKS[5] },
    { name: "Start 2", look: STARTING_LOOKS[1] },
  ]);
  await seatAll("tonk-2", three, [1, 2, 3]);
  expect(await page.evaluate(() => (window.__mansion as unknown as Hooks).net.setReady(true))).toMatchObject({ ok: true });
  expect(await page.evaluate(() => (window.__mansion as unknown as Hooks).net.start())).toMatchObject({ ok: true });
  await expect.poll(() => fans(three).then((counts) => counts.every((n) => n > 0))).toBe(true);
  record("tableSeated", { details: await detailsOf(page, three), fans: await fans(three) });
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/04-table-from-seat-${theme}.png` });
  }

  // Across the table from my seat, through a little narrower lens (fov 60: the seated view looks down at the cards, so a
  // narrower one leaves the face above the picture), the status bar hidden: the player opposite (seat 2) mid-gesture. Bow
  // and applause wait for the end of the hand, so they are not among these.
  const opposite = three[1];
  const hud = (shown: boolean) => page.evaluate((on) => void (document.querySelector<HTMLElement>('[data-testid="hud"]')!.style.visibility = on ? "" : "hidden"), shown);
  await hud(false);
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    const cells: Cell[] = [];
    await zoomTo(page, 60);
    cells.push({ label: "at rest", png: await page.screenshot({ clip: square(await boxOf(page, [opposite], "head", 60), page) }) });
    for (const [kind, share] of [["wave", 0.5], ["laugh", 0.5], ["boston", 0.08], ["boston", 0.6], ["shake", 0.5], ["slap", 0.65]] as const) {
      expect(await ask(opposite.socket, "gesture", { kind })).toMatchObject({ ok: true });
      await expect.poll(() => page.evaluate((i) => (window.__mansion as unknown as Hooks).avatars().find((avatar) => avatar.memberId === i)?.gesture ?? null, opposite.id), { intervals: [30] }).toBe(kind);
      await page.waitForTimeout(GESTURE_MS[kind] * share);
      const clip = kind === "slap" ? await boxOf(page, [opposite], null, 40) : square(await boxOf(page, [opposite], "head", 60), page);
      cells.push({ label: `${kind} at ${share * 100}%`, png: await page.screenshot({ clip }) });
      // The server allows three gestures in four seconds.
      await page.waitForTimeout(GESTURE_MS[kind] * (1 - share) + 1400);
    }
    await zoomTo(page, GAME_FOV);
    await sheet(browser, `04-table-expressions-from-seat-${theme}.png`, `The player across the table from my seat, fov 60, mid-gesture (the slap: the card landed), ${theme}`, cells, 4);
  }
  await hud(true);

  await leave([...four, ...three]);
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("every garment colour worn as top, bottom and shoes on light, middle and deep skin, by day and by night", async ({ browser, baseURL }) => {
  test.setTimeout(600_000);
  const { page, code } = await enter(browser, "Viewer", undefined, true, false);
  const base = cleanLook({ ...STARTING_LOOKS[0], hair: "buzz", facialHair: "none", headwear: "none", accessories: [], top: "tee", bottom: "chinos", onePiece: "none", shoes: "sneakers" });
  // First on light, middle and deep skin in turn; then every colour again on the deepest skin.
  for (const [pass, skins] of [
    ["", ["2w", "8n", "14c"]],
    ["-on-14c", ["14c"]],
  ] as const) {
    const people = GARMENT_PALETTE.map(({ id, label }, i) => ({
      name: label,
      look: cleanLook({ ...base, skin: skins[i % skins.length], topColor: id, topTrim: id, bottomColor: id, bottomTrim: id, shoeColor: id, plateColor: id }),
    }));
    const guests = await join(baseURL!, code, people);
    // Three rows of nine, six metres apart, each seen whole from 4.5 m in front of it (the next row small behind it).
    const poses = guests.map((_, i): Pose => ({ x: ((i % 9) - 4) * 0.75, z: ROW_Z - 6 * Math.floor(i / 9), ry: FACING_VIEWER }));
    stand(guests, poses);
    for (const [theme, id] of THEMES) {
      await setTheme(page, id);
      const cells: Cell[] = [];
      for (let at = 0; at < guests.length; at += 9) {
        const row = guests.slice(at, at + 9);
        await viewFrom(page, { x: 0, z: poses[at].z + 4.5, ry: 0 });
        await placed(page, row, poses.slice(at, at + 9), "near");
        await frames(page, 10);
        cells.push({ label: people.slice(at, at + 9).map(({ name }) => name).join(", "), png: await page.screenshot({ clip: await boxOf(page, row, null, 20) }) });
      }
      await sheet(browser, `09-garment-colours${pass}-${theme}.png`, `Every garment colour as top, bottom and shoes, nine at a time${pass ? ", on skin tone 14c" : ""}, by ${theme}`, cells, 1);
    }
    await leave(guests);
  }
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("by the pool at night: the six starting looks against the water", async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  const { page, code } = await enter(browser, "Viewer", undefined, true, false);
  const starts = await join(
    baseURL!,
    code,
    STARTING_LOOKS.map((look, i) => ({ name: `Start ${i + 1}`, look })),
  );
  // On the deck along the pool's east side, facing the viewer, the water and the sky behind them: from here no light
  // pole or umbrella stands between, as one does from the north deck.
  const poses = starts.map((_, i): Pose => ({ x: -3.4, z: -35.75 - (i - 2.5) * 0.9, ry: -Math.PI / 2 }));
  stand(starts, poses);
  await viewFrom(page, { x: 0.6, z: -35.75, ry: Math.PI / 2 });
  await setTheme(page, "newyear");
  await placed(page, starts, poses, "near");
  await frames(page, 10);
  await page.screenshot({ path: `${DIR}/10-pool-night.png` });
  await leave(starts);

  // Floating in the deep end, as a swimmer's own body sends it (feet 1.6 m below eyes held 0.25 m over the water):
  // the head over the water, a gentle bob, and the hands paddling at the surface.
  const [swimmer] = await join(baseURL!, code, [{ name: "Start 4", look: STARTING_LOOKS[3] }]);
  // Near detail is within 7.5 m of the eyes, the drop to the water's feet height included.
  const deep: Pose[] = [{ x: -5.5, y: -0.12 + 0.25 - 1.6, z: -35, ry: -Math.PI / 2 }];
  stand([swimmer], deep);
  await viewFrom(page, { x: 0.6, z: -35, ry: Math.PI / 2 });
  await placed(page, [swimmer], deep, "near");
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    const cells: Cell[] = [];
    for (const at of ["", " a moment later"]) {
      await page.waitForTimeout(700);
      cells.push({ label: `floating${at}`, png: await page.screenshot({ clip: await boxOf(page, [swimmer], null, 80) }) });
    }
    await sheet(browser, `10-pool-floating-${theme}.png`, `Floating in the deep end, ${theme}`, cells, 2);
  }
  await leave([swimmer]);
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("the look editor at 1280x800 and at phone size: every tab, Before, and a keyboard focus", async ({ browser }) => {
  test.setTimeout(600_000);
  const page = await open(browser, true, false);
  await page.getByTestId("entry-name").fill("Ana");
  const editor = page.getByRole("dialog", { name: "Your look" });
  const tabs = ["Body", "Face", "Hair", "Outfit", "Shoes", "Extras"];
  // Saved: Starting look 1. Each draft below is Starting look 4, so Before shows something else.
  await page.getByTestId("entry-look").click();
  await editor.getByRole("button", { name: /^Starting look 1:/ }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  for (const [theme, id] of THEMES) {
    await page.evaluate((t) => window.__mansion.local.set({ theme: t }), id);
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.getByTestId("entry-look").click();
      await expect(editor).toBeVisible();
      await editor.getByRole("button", { name: /^Starting look 4:/ }).click();
      const night: Cell[] = [];
      for (const tab of tabs) {
        await editor.getByRole("tab", { name: tab }).click();
        await editor.getByRole("tablist").evaluate((list) => list.scrollIntoView({ block: "start" }));
        await page.waitForTimeout(900);
        if (theme === "day") await page.screenshot({ path: `${DIR}/05-editor-${width}-${tab.toLowerCase()}-day.png` });
        else night.push({ label: tab, png: await page.screenshot() });
      }
      if (night.length) await sheet(browser, `05-editor-${width}-tabs-night.png`, `The editor's six tabs at ${width}x${height}, night`, night, width > 400 ? 2 : 6);

      // Before, switched by Enter: the saved look in the preview.
      const before = editor.getByRole("button", { name: "Before", exact: true });
      await before.focus();
      await page.keyboard.press("Enter");
      await expect(editor.getByRole("img", { name: /^Your saved look/ })).toBeVisible();
      await editor.getByRole("img", { name: /^Your saved look/ }).evaluate((preview) => preview.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/05-editor-${width}-before-${theme}.png` });
      await page.keyboard.press("Enter");
      await expect(editor.getByRole("img", { name: /^Your new look/ })).toBeVisible();
      // Held by a pointer: the saved look while the button is down, the new one again on letting go.
      await before.hover();
      await page.mouse.down();
      await expect(editor.getByRole("img", { name: /^Your saved look/ })).toBeVisible();
      await page.mouse.up();
      await expect(editor.getByRole("img", { name: /^Your new look/ })).toBeVisible();

      // By keyboard: arrows walk the tabs to Hair, Tab reaches the hair styles, an arrow moves to the next style.
      await editor.getByRole("tab", { name: "Body" }).click();
      await editor.getByRole("tab", { name: "Body" }).focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowRight");
      const next = CATALOG.hair[(CATALOG.hair.findIndex(({ id }) => id === STARTING_LOOKS[3].hair) + 1) % CATALOG.hair.length];
      await expect(editor.getByRole("radio", { name: next.label, exact: true })).toBeFocused();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${DIR}/05-editor-${width}-keyboard-focus-${theme}.png` });
      await editor.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(editor).toHaveCount(0);
    }
  }
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("the look editor by touch on a phone, and on a short phone: tap, hold Before, turn the preview, every starting look in reach", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto("/?e2e=1");
  await page.getByTestId("entry-name").fill("Ana");
  await page.getByTestId("entry-look").tap();
  const editor = page.getByRole("dialog", { name: "Your look" });
  await expect(editor).toBeVisible();
  // A tap on a tab and on an option chooses it at once (a phone has no pointing first).
  await editor.getByRole("tab", { name: "Hair" }).tap();
  const option = editor.getByRole("radio", { name: CATALOG.hair[3].label, exact: true });
  await option.scrollIntoViewIfNeeded();
  await option.tap();
  await expect(option).toHaveAttribute("aria-checked", "true");
  const label = await editor.getByRole("img", { name: /^Your new look/ }).getAttribute("aria-label");
  expect(label).toContain(CATALOG.hair[3].label);
  // Before, held by a finger: the saved look while it is down, the new one again on letting go.
  const cdp = await context.newCDPSession(page);
  const before = editor.getByRole("button", { name: "Before", exact: true });
  await before.scrollIntoViewIfNeeded();
  const held = (await before.boundingBox())!;
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await touch("touchStart", held.x + held.width / 2, held.y + held.height / 2);
  await page.waitForTimeout(800);
  await expect(editor.getByRole("img", { name: /^Your saved look/ })).toBeVisible();
  await touch("touchEnd");
  await expect(editor.getByRole("img", { name: /^Your new look/ })).toBeVisible();
  // A finger dragged across the preview turns it, and does not scroll the editor.
  const preview = editor.getByRole("img", { name: /^Your new look/ });
  await preview.scrollIntoViewIfNeeded();
  const box = (await preview.boundingBox())!;
  const scrolled = () => editor.evaluate((dialog) => [dialog.scrollTop, ...[...dialog.querySelectorAll("*")].map((part) => part.scrollTop)].reduce((a, b) => a + b, 0));
  const from = await scrolled();
  await touch("touchStart", box.x + box.width * 0.3, box.y + box.height / 2);
  for (let i = 1; i <= 6; i += 1) await touch("touchMove", box.x + box.width * (0.3 + 0.06 * i), box.y + box.height / 2);
  await touch("touchEnd");
  expect(await scrolled()).toBe(from);
  await page.screenshot({ path: `${DIR}/05-editor-390-touch-day.png` });
  // The first tap after a quick drag: it once only stopped a fling the drag had left running, and Save did nothing.
  await editor.getByRole("button", { name: "Save", exact: true }).tap();
  await expect(editor).toHaveCount(0);
  record("touchEditor", { tapTabOption: true, holdBefore: true, dragTurnsWithoutScroll: true, savedByTap: true });

  // A short phone: the six starting looks as equal tiles, none off screen, and the preview's buttons above the tabs.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByTestId("entry-look").click();
  await expect(editor).toBeVisible();
  const starts = editor.getByRole("button", { name: /^Starting look \d:/ });
  await expect(starts).toHaveCount(STARTING_LOOKS.length);
  const tiles = await starts.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect()).map(({ left, right, width }) => ({ left, right, width })));
  for (const tile of tiles) {
    expect(Math.abs(tile.width - tiles[0].width)).toBeLessThan(1);
    expect(tile.left).toBeGreaterThanOrEqual(0);
    expect(tile.right).toBeLessThanOrEqual(375);
  }
  await page.screenshot({ path: `${DIR}/05-editor-375x667-starts-day.png` });
  const tools = await editor.locator(".look-tools").evaluateAll((rows) => Math.max(...rows.map((row) => row.getBoundingClientRect().bottom)));
  const tabsTop = await editor.getByRole("tablist").evaluate((list) => list.getBoundingClientRect().top);
  record("phone375x667", { startingLookWidths: tiles.map((tile) => Math.round(tile.width)), previewButtonsBottom: Math.round(tools), tabsTop: Math.round(tabsTop) });
  expect(tools).toBeLessThanOrEqual(tabsTop);
  await editor.locator(".look-tools").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${DIR}/05-editor-375x667-preview-day.png` });
  await context.close();
  expect(problems).toEqual([]);
});

test("the entry screen: your saved look waving beside the way in, wide and at phone size", async ({ browser }) => {
  test.setTimeout(300_000);
  const page = await open(browser, true, false);
  await page.getByTestId("entry-name").fill("Ana");
  for (const [theme, id] of THEMES) {
    await page.evaluate((t) => window.__mansion.local.set({ theme: t }), id);
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      const preview = page.getByRole("img", { name: /^Your saved look, waving/ });
      await expect(preview).toBeVisible();
      const box = (await preview.boundingBox())!;
      expect(box.width * box.height, `${width} ${theme}`).toBeGreaterThan(0);
      // The first wave starts as the preview mounts; part way into one, by the clock of the page.
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}/11-entry-${width}-${theme}.png` });
    }
  }
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("a wave from the backyard, 22 m off, plays while the figure otherwise holds still", async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  const { page, code } = await enter(browser, "Viewer", undefined, true, false);
  const [actor] = await join(baseURL!, code, [{ name: "Start 3", look: STARTING_LOOKS[2] }]);
  const spot: Pose[] = [{ x: 0, z: -34, ry: FACING_VIEWER }];
  stand([actor], spot);
  await viewFrom(page, { x: 0, z: -12, ry: 0 });
  await placed(page, [actor], spot, "far");
  const animated = () => page.evaluate((i) => (window.__mansion as unknown as Hooks).avatars().find((avatar) => avatar.memberId === i)?.animated ?? -1, actor.id);
  const waves: Record<string, unknown> = {};
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    // Beyond 15 m with no gesture: posed once, then still.
    const resting = await animated();
    await frames(page, 20);
    expect(await animated(), `${theme} at rest`).toBe(resting);
    expect(await ask(actor.socket, "gesture", { kind: "wave" })).toMatchObject({ ok: true });
    await expect.poll(() => page.evaluate((i) => (window.__mansion as unknown as Hooks).avatars().find((avatar) => avatar.memberId === i)?.gesture ?? null, actor.id), { intervals: [30] }).toBe("wave");
    const first = await animated();
    await page.waitForTimeout(250);
    const second = await animated();
    expect(second, `${theme} waving`).toBeGreaterThan(first);
    await page.screenshot({ path: `${DIR}/11-backyard-wave-${theme}.png` });
    waves[theme] = { distanceM: 22, restingHeldStill: true, animatedWhileWaving: [first, second] };
    await page.waitForTimeout(GESTURE_MS.wave + 2500);
  }
  record("backyardWave", waves);
  await leave([actor]);
  await closeAll([page]);
  expect(problems).toEqual([]);
});

/**
 * Each of `people` alone from 1 m, in a row of them 0.8 m apart turned to `ry`: one cell each, boxed round `joint` (the
 * whole figure when null). At most eight at a time, so the row stays near detail and in the gallery.
 */
async function closeUps(page: Page, url: string, code: string, people: { name: string; look: Look }[], ry: number, joint: string | null = "head"): Promise<Cell[]> {
  const cells: Cell[] = [];
  for (let from = 0; from < people.length; from += 8) {
    const batch = people.slice(from, from + 8);
    const guests = await join(url, code, batch);
    const poses = guests.map((_, i): Pose => ({ x: (i - (guests.length - 1) / 2) * 0.8, z: ROW_Z, ry }));
    stand(guests, poses);
    for (const [i, pose] of poses.entries()) {
      await viewFrom(page, viewer(pose.x, 1));
      await placed(page, guests, poses, "near");
      const clip = joint ? square(await boxOf(page, [guests[i]], joint, 40), page) : await boxOf(page, [guests[i]], null, 30);
      cells.push({ label: batch[i].name, png: await page.screenshot({ clip }) });
    }
    await leave(guests);
  }
  return cells;
}

test("close-ups at 1 m: ears, marks and grey hair, facial hair, accessories, assistive devices, the turban, brows and the glance", async ({ browser, baseURL }) => {
  test.setTimeout(1_200_000);
  const { page, code } = await enter(browser, "Viewer", undefined, true, false);
  const url = baseURL!;
  const bare = cleanLook({ ...STARTING_LOOKS[2], hair: "buzz", facialHair: "none", headwear: "none", accessories: [], assistive: [], marks: [] });
  const side = Math.PI / 2;
  const sheets: [string, string, { name: string; look: Look }[], number, string | null][] = [
    ["ears", "The four ears on a bare, close-cropped head, from the side", CATALOG.ears.map(({ id, label }) => ({ name: label, look: cleanLook({ ...bare, ears: id }) })), side, "head"],
    [
      "marks",
      "Marks and grey hair: freckles, a beauty mark, vitiligo, laugh lines; grey and white hair with laugh lines; on light and deep skin",
      [
        ...CATALOG.marks.map(({ id, label }) => ({ name: label, look: cleanLook({ ...bare, marks: [id] }) })),
        { name: "grey hair, laugh lines", look: cleanLook({ ...bare, hair: "afro-s", hairColor: "grey", browColor: "grey", marks: ["laugh-lines"] }) },
        { name: "white hair, laugh lines, deep skin", look: cleanLook({ ...bare, skin: "14c", hair: "coils", hairColor: "white", browColor: "white", marks: ["laugh-lines", "vitiligo"] }) },
      ],
      FACING_VIEWER,
      "head",
    ],
    ["facial-hair", "Every facial-hair option, salt and pepper on deep skin", CATALOG.facialHair.map(({ id, label }) => ({ name: label, look: cleanLook({ ...bare, skin: "13w", browColor: "salt-pepper", facialHair: id }) })), FACING_VIEWER, "head"],
    [
      "glasses-and-earrings",
      "The five glasses from the front, and the three earrings from the side",
      [
        ...CATALOG.accessories.filter(({ id }) => id.startsWith("glasses")).map(({ id, label }) => ({ name: label, look: cleanLook({ ...bare, accessories: [id] }) })),
        ...["studs", "hoops", "drops"].map((id) => ({ name: `${id} (side)`, look: cleanLook({ ...bare, accessories: [id] }) })),
      ],
      FACING_VIEWER,
      "head",
    ],
    [
      "assistive",
      "Hearing aids and a cochlear-implant processor under a curly bob, short locs and a large afro, from the side",
      (["curly-bob", "locs-short", "afro-l"] as const).map((hair) => ({ name: hair, look: cleanLook({ ...bare, hair, hairColor: "dark-brown", assistive: ["hearing-aids", "implant"] }) })),
      -side,
      "head",
    ],
    ["turban", "The turban from the front and the side", [{ name: "turban, gold", look: cleanLook({ ...bare, headwear: "turban", headwearColor: "gold" }) }], FACING_VIEWER, "head"],
  ];
  for (const [file, title, people, ry, joint] of sheets) {
    // Earrings read from the side: those cells are taken again turned.
    const cells = await closeUps(page, url, code, people.filter(({ name }) => !name.endsWith("(side)")), ry, joint);
    const sideways = people.filter(({ name }) => name.endsWith("(side)"));
    if (sideways.length) cells.push(...(await closeUps(page, url, code, sideways, side, joint)));
    if (file === "turban") cells.push(...(await closeUps(page, url, code, people, side, joint)));
    await sheet(browser, `12-closeup-${file}-day.png`, `${title}, 1 m, day`, cells, 4);
  }
  // The necklace, watch and bracelets, on the whole figure.
  const jewellery = await closeUps(page, url, code, [{ name: "necklace, watch, bracelets", look: cleanLook({ ...bare, top: "tee", accessories: ["necklace", "watch", "bracelets"] }) }], FACING_VIEWER, null);
  await sheet(browser, `12-closeup-necklace-watch-bracelets-day.png`, "A necklace, a watch (left wrist) and bracelets (right), 1 m, day", jewellery, 1);

  // Brows and mouths through the gestures, on one face from 1 m: at rest, then each at the middle of its play.
  const [actor] = await join(url, code, [{ name: "Start 1", look: STARTING_LOOKS[0] }]);
  const spot: Pose[] = [{ x: 0, z: ROW_Z, ry: FACING_VIEWER }];
  stand([actor], spot);
  await viewFrom(page, viewer(0, 1));
  await placed(page, [actor], spot, "near");
  const face = square(await boxOf(page, [actor], "head", 40), page);
  const faces: Cell[] = [{ label: "at rest", png: await page.screenshot({ clip: face }) }];
  for (const [kind, share] of [["wave", 0.5], ["laugh", 0.5], ["boston", 0.08], ["boston", 0.6], ["shake", 0.5], ["clap", 0.5]] as const) {
    expect(await ask(actor.socket, "gesture", { kind })).toMatchObject({ ok: true });
    await expect.poll(() => page.evaluate((i) => (window.__mansion as unknown as Hooks).avatars().find((avatar) => avatar.memberId === i)?.gesture ?? null, actor.id), { intervals: [30] }).toBe(kind);
    await page.waitForTimeout(GESTURE_MS[kind] * share);
    faces.push({ label: `${kind} at ${share * 100}%`, png: await page.screenshot({ clip: face }) });
    await page.waitForTimeout(GESTURE_MS[kind] * (1 - share) + 1400);
  }
  await sheet(browser, "12-closeup-brows-and-mouths-day.png", "One face from 1 m: at rest, then mid-gesture (brows lifted, the mouth's shapes), day", faces, 4);

  // The glance: someone walks past to one side, then the other, 2 m off at about 45 degrees; the eyes follow.
  const [walker] = await join(url, code, [{ name: "Start 2", look: STARTING_LOOKS[1] }]);
  const glances: Cell[] = [];
  for (const sideOf of [1, -1]) {
    for (let step = 0; step < 12; step += 1) {
      walker.socket.emit("pose", { x: sideOf * (1.4 + 0.1 * step), z: ROW_Z + 2, ry: -sideOf * side });
      await page.waitForTimeout(100);
    }
    glances.push({ label: `someone walking past on the figure's ${sideOf > 0 ? "left" : "right"}`, png: await page.screenshot({ clip: face }) });
    walker.socket.emit("pose", { x: sideOf * 4, z: ROW_Z + 2, ry: 0 });
    await page.waitForTimeout(800);
  }
  await sheet(browser, "12-closeup-glance-day.png", "The eyes glance toward someone walking past, from 1 m, day", glances, 2);
  await leave([actor, walker]);

  // One tee over light chinos and over light shorts on all four builds, from 3.5 m, front and side.
  const builds = CATALOG.build.flatMap(({ id }) => (["chinos", "shorts"] as const).map((bottom) => ({ name: `${id}, ${bottom}`, look: cleanLook({ ...bare, build: id, top: "tee", topColor: "royal", bottom, bottomColor: "cream", onePiece: "none" }) })));
  const four = await join(url, code, builds);
  await viewFrom(page, viewer(0, 3.5));
  await rowSheet(page, browser, four, "12-builds-one-outfit-day.png", `One outfit on the four builds, left to right: ${builds.map(({ name }) => name).join("; ")}; day`, TURNS.slice(0, 2));
  await leave(four);

  // Every hair style, six at a time from 3 m, from the front, the side and behind.
  for (let from = 0; from < CATALOG.hair.length; from += 6) {
    const styles = CATALOG.hair.slice(from, from + 6).map(({ id, label }) => ({ name: label, look: cleanLook({ ...bare, hair: id, hairColor: "dark-brown" }) }));
    const guests = await join(url, code, styles);
    await viewFrom(page, viewer(0, 3));
    await rowSheet(page, browser, guests, `12-hair-styles-${from / 6 + 1}-day.png`, `Hair styles, left to right: ${styles.map(({ name }) => name).join(", ")}; 3 m, day`, TURNS);
    await leave(guests);
  }
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("hats and coverings over a large afro, and the curly bob, from 3 m and from 1 m", async ({ browser, baseURL }) => {
  test.setTimeout(600_000);
  const { page, code } = await enter(browser, "Viewer", undefined, true, false);
  const base = cleanLook({ ...STARTING_LOOKS[1], accessories: [], headwear: "none", headwearColor: "plum" });
  const afro = cleanLook({ ...base, hair: "afro-l" });
  const people = [
    ...(["cap", "bucket", "fedora"] as const).map((hat) => ({ name: hat, look: cleanLook({ ...afro, accessories: [hat] }) })),
    ...(["crown-hat", "beanie", "turban"] as const).map((headwear) => ({ name: headwear, look: cleanLook({ ...afro, headwear }) })),
    { name: "curly-bob", look: cleanLook({ ...base, hair: "curly-bob" }) },
  ];
  const guests = await join(baseURL!, code, people);
  await viewFrom(page, viewer(0, 3));
  await setTheme(page, "july4");
  const title = `A large afro under a cap, a bucket hat, a fedora, a crown hat, a beanie and a turban, then a curly bob`;
  await rowSheet(page, browser, guests, `${ROUND3}/hats-3m-day.png`, `${title}; 3 m, day`, TURNS);
  await leave(guests);
  for (const [turn, ry] of TURNS) await sheet(browser, `${ROUND3}/hats-1m-${turn}-day.png`, `${title}; 1 m, ${turn}, day`, await closeUps(page, baseURL!, code, people, ry), 4);
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("in an emulated headset: the look panel and the gesture wheel", async ({ browser }) => {
  test.setTimeout(600_000);
  const page = await enterHeadset(browser, "Ana");
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    await rayPress(page, "right", "vr-menu");
    await rayPress(page, "right", "vr-menu-look");
    await park(page, "right");
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/06-vr-look-panel-${theme}.png` });
    await rayPress(page, "right", "vr-look-cancel");
    await rayPress(page, "right", "vr-menu");
    await rayPress(page, "right", "vr-menu-gestures");
    await park(page, "right");
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/06-vr-gesture-wheel-${theme}.png` });
    await page.evaluate(() => (window.__mansion as unknown as Hooks).local.set({ vrMenu: false }));
  }

  // At the foyer mirror, close in front of the glass: the plaque opens the panel, which stands off to the left, so the
  // reflection straight ahead is the preview; Face brings a life-size face close, and the player does not move.
  await page.evaluate((p) => window.__mansion.teleport(p), { x: MIRROR.x + 0.8, z: MIRROR.z, ry: MIRROR.ry });
  await expect.poll(() => rig(page).then((r) => Math.hypot(r.x - MIRROR.x - 0.8, r.z - MIRROR.z) < 0.01)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window.__mansion as unknown as Hooks).mirror())).toBe(true);
  const placeOf = (r: { x: number; z: number; ry: number }) => [r.x, r.z, r.ry];
  const mirrorRecord: Record<string, unknown> = {};
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    await rayPress(page, "right", "mirror-look");
    await park(page, "right");
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/06-mirror-vr-panel-${theme}.png` });
    const before = placeOf(await rig(page));
    await rayPress(page, "right", "vr-look-zoom-face");
    await park(page, "right");
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/06-mirror-vr-face-${theme}.png` });
    const after = placeOf(await rig(page));
    after.forEach((value, i) => expect(Math.abs(value - before[i]), `${theme} pose ${i}`).toBeLessThan(0.01));
    mirrorRecord[theme] = { before, afterFace: after };
    await rayPress(page, "right", "vr-look-zoom-full");
    await rayPress(page, "right", "vr-look-cancel");
  }
  record("vrMirror", mirrorRecord);

  // Seated at a table, with the left hand alone: the panel opens, and its lowest row saves.
  await park(page, "right");
  await sitWithRay(page, tableSpot("tonk-1"), "left");
  const saved = () => page.evaluate(() => (JSON.parse(localStorage.getItem("mansion.look") ?? "null") as { look: Look } | null)?.look ?? null);
  for (const [theme, id] of THEMES) {
    await setTheme(page, id);
    const was = await saved();
    await rayPress(page, "left", "vr-menu");
    await rayPress(page, "left", "vr-menu-look");
    await park(page, "left");
    await frames(page, 10);
    await page.screenshot({ path: `${DIR}/06-vr-look-seated-${theme}.png` });
    await rayPress(page, "left", "vr-look-next");
    await rayPress(page, "left", "vr-look-save");
    await expect.poll(saved).not.toEqual(was);
    await park(page, "left");
    await page.evaluate(() => (window.__mansion as unknown as Hooks).local.set({ vrMenu: false }));
  }
  await closeAll([page]);
  expect(problems).toEqual([]);
});

// ---- 8. the palette, and how it looks with each common colour-vision deficiency ----

/** Machado, Oliveira and Fernandes (2009), severity 1.0, applied to linear RGB. */
const SIMULATIONS: Record<string, number[][] | null> = {
  normal: null,
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (c: number) => Math.min(1, Math.max(0, c));

/** The colour as seen through `matrix`, in linear RGB. */
function seen(hex: string, matrix: number[][] | null): number[] {
  const rgb = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return matrix ? matrix.map((row) => clamp01(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])) : rgb;
}
const hexFrom = (linear: number[]) => `#${linear.map((c) => Math.round(clamp01(toSrgb(c)) * 255).toString(16).padStart(2, "0")).join("")}`;
function oklab([r, g, b]: number[]): number[] {
  const [l, m, s] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

test("the palette as labelled swatches, and through protanopia, deuteranopia and tritanopia", async ({ browser }) => {
  // White stays white through every simulation, and is the top of OKLab's lightness.
  for (const matrix of Object.values(SIMULATIONS)) expect(hexFrom(seen("#ffffff", matrix))).toBe("#ffffff");
  expect(oklab([1, 1, 1])[0]).toBeCloseTo(1, 3);

  const page = await browser.newPage({ viewport: { width: 1320, height: 900 } });
  const closest: Record<string, string[]> = {};
  for (const [name, matrix] of Object.entries(SIMULATIONS)) {
    const swatch = (label: string, hex: string) => {
      const shown = hexFrom(seen(hex, matrix));
      const ink = oklab(seen(hex, matrix))[0] > 0.6 ? "#000" : "#fff";
      return `<div class="sw" style="background:${shown};color:${ink}">${label}<br><small>${hex}${matrix ? ` → ${shown}` : ""}</small></div>`;
    };
    const families = Object.entries(PALETTE_FAMILIES).map(
      ([family, title]) => `<h3>${title}</h3><div class="row">${GARMENT_PALETTE.filter((colour) => colour.family === family).map(({ label, hex }) => swatch(label, hex)).join("")}</div>`,
    );
    const skins = CATALOG.skin.map(({ label, hex }) => swatch(label.replace(" of 14", ""), hex!));
    const pairs: [number, string][] = [];
    for (const [i, a] of GARMENT_PALETTE.entries())
      for (const b of GARMENT_PALETTE.slice(i + 1)) {
        const [p, q] = [oklab(seen(a.hex, matrix)), oklab(seen(b.hex, matrix))];
        pairs.push([Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), `${a.label} / ${b.label}`]);
      }
    closest[name] = pairs
      .sort((a, b) => a[0] - b[0])
      .slice(0, 6)
      .map(([d, pair]) => `${pair}: ${(d * 100).toFixed(1)}`);
    await page.setContent(
      `<style>body{margin:0;padding:10px;background:#fff;color:#111;font:13px/1.25 sans-serif}h2{margin:0 0 6px;font-size:17px}h3{margin:6px 0 3px;font-size:13px}` +
        `.cols{display:flex;gap:18px}.row{display:grid;grid-template-columns:repeat(5,112px);gap:4px}.skin{display:grid;grid-template-columns:repeat(3,112px);gap:3px}` +
        `.sw{height:38px;padding:3px 5px;box-sizing:border-box;border:1px solid #888;font-size:11px}.sw small{font-size:10px}p{margin:8px 0 0;max-width:1290px}</style>` +
        `<h2>Garment palette (${GARMENT_PALETTE.length}) and skin tones (${SKIN_TONES.length}): ${name === "normal" ? "as defined" : `simulated ${name} (Machado 2009, full severity)`}</h2>` +
        `<div class="cols"><div>${families.join("")}</div><div><h3>Skin tones: warm, neutral, cool</h3><div class="skin">${skins.join("")}</div></div></div>` +
        `<p>Closest garment pairs (OKLab distance x100): ${closest[name].join("; ")}.</p>`,
    );
    await page.screenshot({ path: `${DIR}/08-palette-${name}.png`, fullPage: true });
  }
  record("paletteClosestGarmentPairs", closest);
  await page.close();
});
