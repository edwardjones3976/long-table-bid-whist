// @vitest-environment node
/**
 * Hair, head coverings and accessories: every hairstyle bare and tucked on every build, near and far; every
 * covering over every hairstyle wears the tucked hair; every accessory alone; the heaviest hair with the
 * heaviest three accessories within the triangle budget on every starting look, and 2,000 random looks with every
 * field at once within it too; sound numbers; each part
 * on its own joint; and the ears (with whatever is worn behind them) left clear.
 */
import { Mesh, type BufferGeometry, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import { accessories } from "../../client/src/avatar/accessories";
import { EARS } from "../../client/src/avatar/face";
import { buildFigure, JOINT_NAMES, TRIANGLE_BUDGET, type Detail, type Figure, type JointName } from "../../client/src/avatar/figure";
import { hair } from "../../client/src/avatar/hair";
import { headwear } from "../../client/src/avatar/headwear";
import { measure } from "../../client/src/avatar/measure";
import { merge, triangles, type Dressing } from "../../client/src/avatar/shapes";
import { CATALOG, cleanLook, shuffleLook, STARTING_LOOKS, type Look } from "../../shared/avatar";

const BASE = cleanLook({ ...STARTING_LOOKS[0], headwear: "none", accessories: [] });
const DETAILS = ["near", "far"] as const;
const ids = <F extends "hair" | "headwear" | "accessories" | "build">(field: F) => CATALOG[field].map(({ id }) => id) as string[];
const HAIRS = ids("hair") as Look["hair"][];
const COVERINGS = (ids("headwear") as Look["headwear"][]).filter((id) => id !== "none");
const ACCESSORIES = ids("accessories") as Look["accessories"];
const BUILDS = ids("build") as Look["build"][];

/** What is wrong with a built figure: off the rig, a bad number, over budget (empty when sound). */
function problems(figure: Figure, detail: Detail): string[] {
  const found: string[] = [];
  for (const name of JOINT_NAMES) {
    let top: Object3D | null = figure.joints[name];
    while (top?.parent) top = top.parent;
    if (top !== figure.root) found.push(`${name} is not on the rig`);
  }
  figure.root.traverse((node) => {
    if (node instanceof Mesh && !(node.geometry.attributes.position.array as Float32Array).every(Number.isFinite)) found.push(`${node.parent?.name} has a bad vertex`);
  });
  if (!(figure.triangles > 0 && figure.triangles <= TRIANGLE_BUDGET[detail])) found.push(`${figure.triangles} triangles`);
  return found;
}

/** Builds, checks and disposes; returns the problems found and the triangle count. */
function check(look: Look, detail: Detail): { problems: string[]; triangles: number; head: number } {
  const figure = buildFigure(look, detail);
  const head = figure.joints.head.children.filter((child): child is Mesh => child instanceof Mesh).reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0);
  const result = { problems: problems(figure, detail), triangles: figure.triangles, head };
  figure.dispose();
  return result;
}

const finite = (dressing: Dressing) =>
  [...Object.values(dressing.shell), ...Object.values(dressing.detail)].flat().every((g) => (g!.attributes.position.array as Float32Array).every(Number.isFinite));
const joints = (dressing: Dressing): JointName[] => [...new Set([...Object.keys(dressing.shell), ...Object.keys(dressing.detail)])].sort() as JointName[];
const count = (dressing: Dressing) => [...Object.values(dressing.shell), ...Object.values(dressing.detail)].flat().reduce((sum, g) => sum + triangles(g!), 0);

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
      for (const style of HAIRS) {
        const look = cleanLook({ ...BASE, hair: style, headwear: covering });
        const result = check(look, detail);
        expect(result.problems, `${style} ${detail}`).toEqual([]);
        if (style !== "bald") heads.add(result.head);
      }
      // Every style under the covering is the same close layer.
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
