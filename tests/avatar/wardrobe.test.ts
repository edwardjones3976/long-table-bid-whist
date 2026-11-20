// @vitest-environment node
/**
 * Hair, head coverings and accessories: every hairstyle bare and tucked on every build, near and far; every
 * covering over every hairstyle wears the tucked hair; under a hat the long styles keep what hangs below it; every accessory alone; the heaviest hair with the
 * heaviest three accessories within the triangle budget on every starting look, and 2,000 random looks with every
 * field at once within it too, in 3 draws near and far; sound numbers; each part
 * on its own joint; the ears (with whatever is worn behind them) left clear; four ears that differ in shape; and a
 * moustache that leaves the resting smile's corners showing.
 */
import { Mesh, Vector3, type BufferGeometry, type Object3D, type SkinnedMesh } from "three";
import { describe, expect, it } from "vitest";
import { accessories } from "../../client/src/avatar/accessories";
import { topAndBottom } from "../../client/src/avatar/body";
import { coilSpot, EARS, earShape, face, headProfile, LIPS, MOUTHS, MUSTACHE } from "../../client/src/avatar/face";
import { buildFigure, JOINT_NAMES, TRIANGLE_BUDGET, type Detail, type Figure, type JointName } from "../../client/src/avatar/figure";
import { BELOW_HAT, hair, LONG, standOff } from "../../client/src/avatar/hair";
import { headwear } from "../../client/src/avatar/headwear";
import { measure, type Measurements } from "../../client/src/avatar/measure";
import { frontZ, luma, merge, radiusAt, SEGMENTS, tint, triangles, type Dressing } from "../../client/src/avatar/shapes";
import { CATALOG, cleanLook, shuffleLook, SKIN_TONES, STARTING_LOOKS, type Look } from "../../shared/avatar";

const BASE = cleanLook({ ...STARTING_LOOKS[0], headwear: "none", accessories: [] });
const DETAILS = ["near", "far"] as const;
const ids = <F extends "hair" | "headwear" | "accessories" | "build" | "height" | "top" | "onePiece" | "bottom" | "marks" | "liner" | "cheekColor" | "facialHair">(field: F) =>
  CATALOG[field].map(({ id }) => id) as string[];
const HAIRS = ids("hair") as Look["hair"][];
const COVERINGS = (ids("headwear") as Look["headwear"][]).filter((id) => id !== "none");
const ACCESSORIES = ids("accessories") as Look["accessories"];
const BUILDS = ids("build") as Look["build"][];

/** What is wrong with a built figure: off the rig, a bad number, more draws than body, outline and face, over budget (empty when sound). */
function problems(figure: Figure, detail: Detail): string[] {
  const found: string[] = [];
  for (const name of JOINT_NAMES) {
    let top: Object3D | null = figure.joints[name];
    while (top?.parent) top = top.parent;
    if (top !== figure.root) found.push(`${name} is not on the rig`);
  }
  let draws = 0;
  figure.root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    draws += 1;
    if (!(node.geometry.attributes.position.array as Float32Array).every(Number.isFinite)) found.push(`${node.name} has a bad vertex`);
  });
  if (draws !== 3) found.push(`${draws} draws`);
  if (!(figure.triangles > 0 && figure.triangles <= TRIANGLE_BUDGET[detail])) found.push(`${figure.triangles} triangles`);
  return found;
}

/** Builds, checks and disposes; returns the problems found, the triangle count and the body's vertices on the head. */
function check(look: Look, detail: Detail): { problems: string[]; triangles: number; head: number } {
  const figure = buildFigure(look, detail);
  const body = figure.root.getObjectByName("body") as SkinnedMesh;
  const [on, bone] = [body.geometry.attributes.skinIndex, body.skeleton.bones.indexOf(figure.joints.head as never)];
  let head = 0;
  for (let i = 0; i < on.count; i++) if (on.getX(i) === bone) head += 1;
  const result = { problems: problems(figure, detail), triangles: figure.triangles, head };
  figure.dispose();
  return result;
}

const finite = (dressing: Dressing) =>
  [...Object.values(dressing.shell), ...Object.values(dressing.detail)].flat().every((g) => (g!.attributes.position.array as Float32Array).every(Number.isFinite));
const joints = (dressing: Dressing): JointName[] => [...new Set([...Object.keys(dressing.shell), ...Object.keys(dressing.detail)])].sort() as JointName[];
const count = (dressing: Dressing) => [...Object.values(dressing.shell), ...Object.values(dressing.detail)].flat().reduce((sum, g) => sum + triangles(g!), 0);
/** Each hat, the crown hat and the beanie, worn over this look: its lower edge (hatEdge) and brim (hatDrop) with it. */
const hats = (look: Look, m: Measurements) => [
  ...(["cap", "bucket", "fedora"] as const).map((hat) => [hat, accessories({ ...look, accessories: [hat] }, m, "near")] as const),
  ...(["crown-hat", "beanie"] as const).map((covering) => [covering, headwear({ ...look, headwear: covering }, m, "near")] as const),
];

describe("hair", () => {
  it.each(HAIRS)("%s, bare and tucked, on every build, near and far", (style) => {
    const failures: string[] = [];
    for (const build of BUILDS) {
      const look = cleanLook({ ...BASE, build, hair: style });
      const m = measure(look);
      for (const detail of DETAILS) {
        failures.push(...check(look, detail).problems.map((p) => `${build} ${detail} bare: ${p}`));
        const [bare, tucked] = [hair(look, m, detail), hair(look, m, detail, true)];
        for (const [name, part] of [["bare", bare], ["tucked", tucked]] as const) {
          if (!finite(part)) failures.push(`${build} ${detail} ${name}: a bad vertex`);
          const on = joints(part);
          if (style === "bald" ? on.length : on.join() !== "head") failures.push(`${build} ${detail} ${name}: on ${on.join() || "nothing"}`);
        }
      }
    }
    expect(failures).toEqual([]);
  }, 30_000);

  it("gives each style its own shape near, and keeps the far versions light", () => {
    const m = measure(BASE);
    const shapes = new Set<string>();
    for (const style of HAIRS.filter((id) => id !== "bald")) {
      const part = hair({ ...BASE, hair: style }, m, "near");
      const pieces = [...Object.values(part.shell), ...Object.values(part.detail)].flat() as BufferGeometry[];
      const geometry = merge(pieces)!;
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      shapes.add([box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z, triangles(geometry)].map((n) => n.toFixed(3)).join());
      expect(count(hair({ ...BASE, hair: style }, m, "far"))).toBeLessThanOrEqual(70);
    }
    expect(shapes.size).toBe(HAIRS.length - 1);
  });
});

describe("head coverings", () => {
  it.each(COVERINGS)("%s wears the tucked hair under it, whatever the style", (covering) => {
    for (const detail of DETAILS) {
      const heads = new Set<number>();
      // A crown hat and a beanie let long hair hang below them, as hats do (checked with the hats below).
      const hatLike = covering === "crown-hat" || covering === "beanie";
      for (const style of HAIRS) {
        const look = cleanLook({ ...BASE, hair: style, headwear: covering });
        const result = check(look, detail);
        expect(result.problems, `${style} ${detail}`).toEqual([]);
        if (style !== "bald" && !(hatLike && BELOW_HAT.includes(style))) heads.add(result.head);
      }
      // Every other style under the covering is the same close layer.
      expect(heads.size).toBe(1);
    }
    const m = measure(BASE);
    const worn = headwear({ ...BASE, headwear: covering }, m, "near");
    expect(worn.tucksHair).toBe(true);
    expect(finite(worn)).toBe(true);
    expect(joints(worn)).toEqual(covering === "hijab" ? ["head", "neck"] : ["head"]);
  }, 30_000);

  it("draws nothing and tucks nothing with no covering", () => {
    const worn = headwear(BASE, measure(BASE), "near");
    expect(worn.tucksHair).toBe(false);
    expect(joints(worn)).toEqual([]);
  });
});

describe("accessories", () => {
  const ON: Record<string, JointName[]> = { necklace: ["torso"], watch: ["handL"], bracelets: ["handR"] };

  it.each(ACCESSORIES)("%s alone, on every build, on its joint", (id) => {
    for (const build of BUILDS) {
      const look = cleanLook({ ...BASE, build, accessories: [id] });
      for (const detail of DETAILS) expect(check(look, detail).problems, `${build} ${detail}`).toEqual([]);
      const worn = accessories(look, measure(look), "near");
      expect(finite(worn)).toBe(true);
      expect(joints(worn)).toEqual(ON[id] ?? ["head"]);
      expect(worn.tucksHair).toBe(id === "cap" || id === "bucket" || id === "fedora");
    }
  }, 30_000);

  it("keeps long locs, braids, long hair and a ponytail hanging below a hat, a crown hat or a beanie, the ends of short locs, cornrows and knots and an afro's volume below a hat's edge, and tucks every other style under it", () => {
    const m = measure(BASE);
    const tucked = count(hair(BASE, m, "near", true));
    for (const [hat, { hatEdge: edge }] of hats(BASE, m)) {
      expect(edge, hat).toBeDefined();
      for (const style of HAIRS.filter((id) => id !== "bald")) {
        for (const detail of DETAILS) {
          const under = hair({ ...BASE, hair: style }, m, detail, edge);
          if (!BELOW_HAT.includes(style)) {
            expect(count(under), `${hat} ${style} ${detail}`).toBe(count(hair(BASE, m, detail, true)));
            continue;
          }
          if (!LONG.includes(style)) {
            // Short locs and cornrows keep their ends below a brimmed hat's edge up close; knots only those below its edge.
            const shown = count(under) - count(hair(BASE, m, detail, true));
            if (detail === "near" && style !== "knots" && (hat === "cap" || hat === "bucket" || hat === "fedora")) expect(shown, `${hat} ${style}`).toBeGreaterThan(0);
            else expect(shown, `${hat} ${style} ${detail}`).toBeGreaterThanOrEqual(0);
            continue;
          }
          expect(count(under), `${hat} ${style} ${detail}`).toBeGreaterThan(count(hair(BASE, m, detail, true)));
          // What it keeps hangs to the jaw or below, far under the hat's edge.
          const lowest = Math.min(...(under.shell.head ?? []).map((g) => (g.computeBoundingBox(), g.boundingBox!.min.y)));
          expect(lowest, `${hat} ${style} ${detail}`).toBeLessThan(0.3 * m.head);
        }
      }
    }
    expect(tucked).toBeGreaterThan(0);
  });

  it("shows a large afro from the front below every hat, a crown hat and a beanie, and out past the brim", () => {
    const m = measure(BASE);
    const look = cleanLook({ ...BASE, hair: "afro-l" });
    // The head pieces' points on the front half, seen from the front.
    const front = (worn: Dressing) =>
      (worn.shell.head ?? []).flatMap((geometry) => Array.from({ length: geometry.attributes.position.count }, (_, i) => new Vector3().fromBufferAttribute(geometry.attributes.position, i))).filter((p) => p.z < 0.01);
    for (const [hat, worn] of hats(look, m)) {
      // Below the hat's lowest point and wider than its brim, so no brim hides it, even seen from a little above.
      const lowest = Math.min(...front(worn).map((p) => p.y));
      const widest = Math.max(...front(worn).map((p) => Math.abs(p.x)));
      const shown = front(hair(look, m, "near", worn.hatEdge, false, worn.hatDrop)).filter((p) => p.y < lowest - 0.005 && Math.abs(p.x) > widest);
      expect(shown.length, hat).toBeGreaterThan(0);
    }
  });

  it("wears the first of two hats and ignores the second", () => {
    const m = measure(BASE);
    const both = accessories({ ...BASE, accessories: ["fedora", "cap"] }, m, "near");
    expect(count(both)).toBe(count(accessories({ ...BASE, accessories: ["fedora"] }, m, "near")));
  });

  it("hides earrings and a necklace under a hijab, and puts glasses over it", () => {
    const m = measure(BASE);
    const look = { ...BASE, headwear: "hijab" as const, accessories: ["hoops", "necklace", "glasses-round"] as Look["accessories"] };
    const worn = accessories(look, m, "near");
    expect(count(worn)).toBe(count(accessories({ ...look, accessories: ["glasses-round"] }, m, "near")));
    const bare = accessories({ ...look, headwear: "none", accessories: ["glasses-round"] }, m, "near");
    const reach = (d: Dressing) => Math.max(...(d.detail.head ?? []).map((g) => (g.computeBoundingBox(), g.boundingBox!.max.x)));
    expect(reach(worn)).toBeGreaterThan(reach(bare));
  });
});

describe("budgets", () => {
  const m = measure(BASE);
  const heaviest = HAIRS.reduce((a, b) => (count(hair({ ...BASE, hair: b }, m, "near")) > count(hair({ ...BASE, hair: a }, m, "near")) ? b : a));
  /** Every three accessories cleanLook allows together. */
  const triples: Look["accessories"][] = [];
  for (let i = 0; i < ACCESSORIES.length; i++)
    for (let j = i + 1; j < ACCESSORIES.length; j++)
      for (let k = j + 1; k < ACCESSORIES.length; k++) {
        const three = [ACCESSORIES[i], ACCESSORIES[j], ACCESSORIES[k]];
        if (cleanLook({ ...BASE, accessories: three }).accessories.length === 3) triples.push(three);
      }

  it("keeps the heaviest hair with the heaviest three accessories within budget on every starting look and build", () => {
    const failures: string[] = [];
    for (const detail of DETAILS) {
      const look = (base: Look, three: Look["accessories"]) => cleanLook({ ...base, hair: heaviest, headwear: "none", accessories: three });
      const costs = triples.map((three) => check(look(BASE, three), detail).triangles);
      const worst = triples[costs.indexOf(Math.max(...costs))];
      for (const start of STARTING_LOOKS) {
        for (const build of BUILDS) {
          const result = check(look({ ...start, build }, worst), detail);
          failures.push(...result.problems.map((p) => `${detail} ${start.hair} ${build} ${heaviest} + ${worst.join(" ")}: ${p}`));
        }
      }
    }
    expect(failures).toEqual([]);
  }, 60_000);

  it("keeps 2,000 random looks, every field at once, within budget near and far", () => {
    // mulberry32: the same looks on every run.
    let seed = 2024;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const failures: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const look = shuffleLook(random);
      for (const detail of DETAILS) {
        const result = check(look, detail);
        const worn = [look.build, look.hair, look.headwear, look.facialHair, look.onePiece === "none" ? `${look.top} ${look.bottom}` : look.onePiece, look.shoes, ...look.marks, ...look.assistive, ...look.accessories];
        failures.push(...result.problems.map((p) => `${detail} ${worn.join(" ")}: ${p}`));
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);
});

it("keeps hair, coverings and hats clear of the ears and anything worn behind them", () => {
  const failures: string[] = [];
  for (const build of BUILDS) {
    const look = cleanLook({ ...BASE, build });
    const m = measure(look);
    const [high, deep] = [0.075 * m.head * EARS.large.size, 0.05 * m.head * EARS.large.size];
    const [x, y, z] = [-m.ear[0], m.ear[1], m.ear[2]];
    // The largest ear, a hearing aid or processor behind it, and the aid's tube over its top.
    const inside = (px: number, py: number, pz: number) =>
      Math.abs(px) > x - 0.005 && Math.abs(px) < x + 0.022 && py > y - high && py < y + 1.02 * high + 0.008 && pz > z - deep - 0.005 && pz < z + deep + 0.017;
    const parts: [string, Dressing][] = [
      ...HAIRS.map((style) => [style, hair({ ...look, hair: style }, m, "near")] as [string, Dressing]),
      ["tucked", hair(look, m, "near", true)],
      ...COVERINGS.filter((id) => id !== "hijab").map((id) => [id, headwear({ ...look, headwear: id }, m, "near")] as [string, Dressing]),
      ...(["cap", "bucket", "fedora"] as const).map((id) => [id, accessories({ ...look, accessories: [id] }, m, "near")] as [string, Dressing]),
      ...hats({ ...look, hair: "afro-l" }, m).map(([id, worn]) => [`afro-l under ${id}`, hair({ ...look, hair: "afro-l" }, m, "near", worn.hatEdge, false, worn.hatDrop)] as [string, Dressing]),
    ];
    for (const [name, part] of parts) {
      for (const geometry of [...(part.shell.head ?? []), ...(part.detail.head ?? [])]) {
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          if (inside(p.getX(i), p.getY(i), p.getZ(i))) {
            failures.push(`${build} ${name}`);
            break;
          }
        }
      }
    }
  }
  expect([...new Set(failures)]).toEqual([]);
});

it("keeps every top outside what is worn under it below the waist, on every build and height, standing and seated", () => {
  const failures: string[] = [];
  const tops = [...(ids("top") as Look["top"][]).map((top) => ({ top, onePiece: "none" as const })), ...(ids("onePiece") as Look["onePiece"][]).filter((id) => id !== "none").map((onePiece) => ({ top: BASE.top, onePiece }))];
  for (const build of BUILDS) {
    for (const height of ids("height") as Look["height"][]) {
      for (const worn of tops) {
        for (const bottom of ids("bottom") as Look["bottom"][]) {
          const look = cleanLook({ ...BASE, build, height, bottom, ...worn });
          const m = measure(look);
          for (const near of [true, false]) {
            const { top, under } = topAndBottom(look, m, near);
            for (let i = 0; i <= 20; i++) {
              const y = top[0][1] * (1 - i / 20);
              // Seated, the top below the waist is drawn up to a tenth of its hang (motion.ts SEATED_HEM); what is under it is not.
              for (const [pose, at] of [["standing", y], ["seated", y / 10]] as const) {
                const gap = radiusAt(top, y) - radiusAt(under, m.pelvis + at);
                if (gap < 0.001) failures.push(`${build} ${height} ${worn.onePiece === "none" ? worn.top : worn.onePiece} over ${bottom} ${near ? "near" : "far"} ${pose} at ${y.toFixed(3)}: ${gap.toFixed(4)}`);
              }
            }
          }
        }
      }
    }
  }
  expect(failures.slice(0, 10)).toEqual([]);
});

it("sits an implant processor's coil on whatever hair covers the head there, so no style hides it", () => {
  const look = cleanLook({ ...BASE, assistive: ["implant"] });
  const m = measure(look);
  const { at, normal } = coilSpot(m);
  for (const style of HAIRS) {
    const over = standOff(hair({ ...look, hair: style }, m, "near"), at, normal);
    const coil = standOff({ shell: {}, detail: { head: face({ ...look, hair: style }, m, "near", over).detail }, tucksHair: false }, at, normal, 0.012);
    expect(coil, style).toBeGreaterThan(over + 0.003);
  }
});

describe("the face", () => {
  it("offers four ears a player can tell apart: by how far they stand out, how tall, or how round", () => {
    const m = measure(BASE);
    const shapes = (Object.keys(EARS) as Look["ears"][]).map((id) => {
      const { at, flare, half } = earShape(id, m, 1);
      const out = Math.abs(at.x) + Math.hypot(half[0] * Math.cos(flare), half[2] * Math.sin(flare)) - m.headWidth;
      return { id, out, tall: 2 * half[1], ratio: half[1] / half[2] };
    });
    for (const [i, a] of shapes.entries()) {
      for (const b of shapes.slice(i + 1)) {
        const apart = Math.abs(a.out - b.out) >= 0.002 || Math.abs(a.tall - b.tall) >= 0.002 || Math.abs(a.ratio - b.ratio) >= 0.2;
        expect(apart, `${a.id} / ${b.id}`).toBe(true);
      }
    }
    // Round really is round, and close sits close.
    expect(shapes.find((shape) => shape.id === "round")!.ratio).toBeCloseTo(1, 5);
    expect(shapes.find((shape) => shape.id === "close")!.out).toBeLessThan(0.003);
  });

  it("draws every mark, make-up accent and facial hair up close, laugh lines on the skin rather than under it", () => {
    const m = measure(BASE);
    const plain = cleanLook({ ...BASE, marks: [], liner: "none", cheekColor: "none", facialHair: "none" });
    const drawn = (look: Look) => face(look, m, "near");
    const size = (f: ReturnType<typeof face>) => [...f.shell, ...f.detail].reduce((sum, g) => sum + triangles(g), 0);
    const bare = size(drawn(plain));
    for (const mark of ids("marks") as Look["marks"]) expect(size(drawn({ ...plain, marks: [mark] })), mark).toBeGreaterThan(bare);
    for (const liner of (ids("liner") as Look["liner"][]).filter((id) => id !== "none")) expect(size(drawn({ ...plain, liner })), liner).toBeGreaterThan(bare);
    for (const cheekColor of (ids("cheekColor") as Look["cheekColor"][]).filter((id) => id !== "none")) expect(size(drawn({ ...plain, cheekColor })), cheekColor).toBeGreaterThan(bare);
    const beards = new Set([bare]);
    for (const facialHair of (ids("facialHair") as Look["facialHair"][]).filter((id) => id !== "none")) beards.add(size(drawn({ ...plain, facialHair })));
    // Every style draws something of its own: no two cost the same, and none costs what a bare face does.
    expect(beards.size).toBe(ids("facialHair").length);
    // The laugh lines' tubes sit with their middles in front of the faceted head's surface.
    const lines = drawn({ ...plain, marks: ["laugh-lines"] }).detail.slice(drawn(plain).detail.length);
    const profile = headProfile(m, SEGMENTS.near.headRows);
    for (const geometry of lines) {
      const p = geometry.attributes.position;
      let out = 0;
      for (let i = 0; i < p.count; i++) out += frontZ(profile, SEGMENTS.near.head, m.headDepth / m.headWidth, p.getX(i), p.getY(i)) - p.getZ(i);
      expect(out / p.count).toBeGreaterThan(0.0005);
    }
  });

  it("draws a salt-and-pepper beard up close in more than one tone, so the mix reads as mixed", () => {
    const m = measure(BASE);
    const plain = cleanLook({ ...BASE, marks: [], liner: "none", cheekColor: "none", facialHair: "none" });
    const look: Look = { ...plain, browColor: "salt-pepper", facialHair: "short-beard" };
    // The beard's masses: what it adds to the face's detail.
    const masses = face(look, m, "near").detail.slice(face(plain, m, "near").detail.length);
    const tones = new Set<string>();
    for (const { attributes: { color } } of masses) for (let i = 0; i < color.count; i++) tones.add(`${color.getX(i)} ${color.getY(i)} ${color.getZ(i)}`);
    expect(masses.length).toBeGreaterThan(0);
    expect(tones.size).toBeGreaterThan(1);
  });

  it("tints the nose's top, a bare lower lip and a blush quietly on every skin tone, the deepest no more than the lightest", () => {
    for (const skin of SKIN_TONES) {
      // The same tints face.ts uses: none may stand out from the skin by more than a shade.
      for (const [part, colour, share, most] of [["nose", "#fff1e2", 0.1, 1.08], ["lip", "#c06a63", 0.32, 1.15], ["blush", "#d6a32b", 0.2, 1.06]] as const) {
        // Within one 8-bit step of the cap: the colour is rounded to 8 bits a channel.
        expect(luma(tint(skin, colour, share, most)) - luma(skin) * most, `${part} on ${skin}`).toBeLessThanOrEqual(0.002);
      }
    }
  });

  it("smiles at rest on every mouth, with any moustache stopping short of the corners and lifted clear of them", () => {
    for (const [mouth, { width, t }] of Object.entries(LIPS)) {
      const corner = MOUTHS.relaxed.corner * width;
      // The corners sit above the upper lip's middle: the mouth curves up.
      expect(corner, mouth).toBeGreaterThan(t + MOUTHS.relaxed.top * width);
      expect(MUSTACHE.reach, mouth).toBeLessThan(1);
      // The moustache's ends, less their full thickness, are still above the corners (upper lip top is 2t over the mouth line).
      expect(2 * t + MUSTACHE.end - 0.022, mouth).toBeGreaterThan(corner);
    }
  });
});
