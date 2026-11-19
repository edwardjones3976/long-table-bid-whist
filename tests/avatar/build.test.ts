// @vitest-environment node
/**
 * The avatar builder: every option of every field, on every build and every height, near and far, makes a
 * whole rig with sound numbers, an outline and no more triangles than its budget. Fields are changed one
 * at a time from a base look, not crossed with each other. Also: the starting looks at every detail, the
 * figure's place and facing, the face controls, and geometry shared by one look, kept a while after dispose and then
 * freed, or freed at once for a figure with materials of its own.
 */
import { BackSide, Box3, Group, Mesh, Vector3, type BufferGeometry, type Material, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import { buildFigure, HEIGHT_M, IDLE_KEEP, JOINT_NAMES, MOUTH_SHAPES, ownMaterials, TRIANGLE_BUDGET, type Detail, type Figure } from "../../client/src/avatar/figure";
import { CATALOG, cleanLook, FIELDS, SET_FIELDS, shuffleLook, STARTING_LOOKS, type Field, type Look } from "../../shared/avatar";

const BASE = STARTING_LOOKS[0];

function meshes(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((node) => node instanceof Mesh && found.push(node));
  return found;
}

const isOutline = (mesh: Mesh) => (mesh.material as Material).side === BackSide;

/** Everything that must hold for any look, as a list of what went wrong (empty when sound). */
function problems(figure: Figure, detail: Detail): string[] {
  const found: string[] = [];
  for (const name of JOINT_NAMES) {
    let top: Object3D | null = figure.joints[name] ?? null;
    while (top?.parent) top = top.parent;
    if (top !== figure.root) found.push(`${name} is not on the rig`);
  }
  figure.root.updateMatrixWorld(true);
  const all = meshes(figure.root);
  for (const mesh of all) {
    if (!mesh.matrixWorld.elements.every(Number.isFinite)) found.push(`${mesh.parent?.name} is placed at a bad number`);
    if (!(mesh.geometry.attributes.position.array as Float32Array).every(Number.isFinite)) found.push(`${mesh.parent?.name} has a bad vertex`);
  }
  if (!(figure.triangles > 0 && figure.triangles <= TRIANGLE_BUDGET[detail])) found.push(`${figure.triangles} triangles`);
  const outlines = all.filter(isOutline);
  // Every joint has a shape to outline, and an outline redraws a shape of its own joint.
  if (outlines.length !== (detail === "simple" ? 0 : JOINT_NAMES.length)) found.push(`${outlines.length} outlines`);
  for (const outline of outlines) {
    if (!outline.parent?.children.some((other) => other instanceof Mesh && !isOutline(other) && other.geometry === outline.geometry)) found.push("an outline of nothing");
  }
  return found;
}

const valuesOf = (field: Field): unknown[] => CATALOG[field].map(({ id }) => (field in SET_FIELDS ? [id] : id));

describe("every option on every build and height", () => {
  it.each(FIELDS)("%s", (field) => {
    const failures: string[] = [];
    for (const value of valuesOf(field)) {
      for (const { id: build } of CATALOG.build) {
        for (const { id: height } of CATALOG.height) {
          const look = cleanLook({ ...BASE, build, height, [field]: value });
          for (const detail of ["near", "far"] as const) {
            const figure = buildFigure(look, detail);
            for (const problem of problems(figure, detail)) failures.push(`${field}=${String(value)} ${build} ${height} ${detail}: ${problem}`);
            figure.dispose();
          }
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  }, 60_000);
});

it("builds every starting look near, far and simple", () => {
  for (const look of STARTING_LOOKS) {
    for (const detail of ["near", "far", "simple"] as const) {
      const figure = buildFigure(look, detail);
      expect(problems(figure, detail)).toEqual([]);
      figure.dispose();
    }
  }
});

it("stands on the floor at its height, faces -Z, and has its left on -X", () => {
  for (const [{ id }, look] of CATALOG.height.flatMap((height) => STARTING_LOOKS.map((look) => [height, look] as const))) {
    const height = id as Look["height"];
    for (const detail of ["near", "far", "simple"] as const) {
      // Bald and bareheaded, so the crown is the head's own.
      const bare = buildFigure(cleanLook({ ...look, height, hair: "bald", headwear: "none", accessories: [] }), detail);
      const box = new Box3().setFromObject(bare.root);
      expect(box.min.y).toBeCloseTo(0, 2);
      expect(box.max.y).toBeCloseTo(HEIGHT_M[height], 2);
      bare.dispose();
    }
    const figure = buildFigure(cleanLook({ ...look, height }), "near");
    const at = (object: Object3D) => object.getWorldPosition(new Vector3());
    const irises = figure.joints.head.getObjectByName("irises")!;
    const eyes = new Box3().setFromObject(irises).getCenter(new Vector3());
    expect(eyes.z).toBeLessThan(at(figure.joints.head).z);
    expect(at(figure.joints.handL).x).toBeLessThan(0);
    expect(at(figure.joints.handR).x).toBeGreaterThan(0);
    figure.dispose();
  }
});

it("swaps the mouth, closes the lids and moves the irises a little; a simple figure ignores all three", () => {
  const figure = buildFigure(STARTING_LOOKS[2], "near");
  const part = (name: string) => figure.joints.head.getObjectByName(name) as Mesh;
  const [mouth, lids, irises] = [part("mouth"), part("lids"), part("irises")];
  const shapes = new Set<BufferGeometry>();
  for (const shape of MOUTH_SHAPES) {
    figure.face.setMouth(shape);
    shapes.add(mouth.geometry);
  }
  expect(shapes.size).toBe(MOUTH_SHAPES.length);
  const rest = lids.scale.y;
  expect(rest).toBeGreaterThan(0);
  figure.face.setBlink(1);
  expect(lids.scale.y).toBe(1);
  figure.face.setBlink(0);
  expect(lids.scale.y).toBe(rest);
  figure.face.setGaze(1, 1);
  expect(irises.position.x).toBeGreaterThan(0);
  expect(irises.position.y).toBeGreaterThan(0);
  expect(irises.position.length()).toBeLessThan(0.02);
  figure.face.setGaze(Number.NaN, -9);
  expect([irises.position.x, irises.position.y].every(Number.isFinite)).toBe(true);
  figure.dispose();

  const simple = buildFigure(STARTING_LOOKS[2], "simple");
  simple.face.setMouth("grin");
  simple.face.setBlink(1);
  simple.face.setGaze(0.5, -0.5);
  simple.dispose();
});

it("shares geometry between figures of one look, and keeps it for the next IDLE_KEEP unused looks before freeing it", () => {
  const look = STARTING_LOOKS[4];
  const [one, two] = [buildFigure(look, "near"), buildFigure(look, "near")];
  expect(one.root).not.toBe(two.root);
  const [a, b] = [meshes(one.root), meshes(two.root)];
  expect(a).toHaveLength(b.length);
  expect(a.every((mesh, i) => mesh !== b[i] && mesh.geometry === b[i].geometry && mesh.material === b[i].material)).toBe(true);

  const made = new Set(a.map((mesh) => mesh.geometry));
  const mouth = one.joints.head.getObjectByName("mouth") as Mesh;
  for (const shape of MOUTH_SHAPES) {
    one.face.setMouth(shape);
    made.add(mouth.geometry);
  }
  const freed = new Set<BufferGeometry>();
  for (const geometry of made) geometry.addEventListener("dispose", () => freed.add(geometry));

  const scene = new Group();
  scene.add(two.root);
  two.dispose();
  two.dispose();
  expect(scene.children).toEqual([]);
  expect(freed.size).toBe(0);
  one.dispose();
  // Unused, but kept: walking back over the near line builds nothing.
  expect(freed.size).toBe(0);
  const back = buildFigure(look, "near");
  expect(meshes(back.root).every((mesh) => made.has(mesh.geometry))).toBe(true);
  back.dispose();

  // Once IDLE_KEEP other looks have gone unused since, it is freed and a new figure builds afresh.
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const others = new Set<string>();
  while (others.size < IDLE_KEEP) {
    const other = shuffleLook(random);
    const key = JSON.stringify(other);
    if (others.has(key) || key === JSON.stringify(look)) continue;
    others.add(key);
    buildFigure(other, "simple").dispose();
  }
  expect(freed).toEqual(made);
  const again = buildFigure(look, "near");
  expect(meshes(again.root).some((mesh) => made.has(mesh.geometry))).toBe(false);
  again.dispose();
});

it("gives a figure with materials of its own geometry shared with nothing else, freed as soon as it is unused", () => {
  const look = STARTING_LOOKS[5];
  const own = ownMaterials();
  const shared = buildFigure(look, "near");
  const mine = buildFigure(look, "near", own);
  const [a, b] = [meshes(shared.root), meshes(mine.root)];
  expect(b.every((mesh, i) => mesh.geometry !== a[i].geometry && mesh.material !== a[i].material)).toBe(true);
  expect(new Set(b.map((mesh) => mesh.material))).toEqual(new Set([own.matte, own.outline]));
  const freed = new Set<BufferGeometry>();
  for (const mesh of b) mesh.geometry.addEventListener("dispose", () => freed.add(mesh.geometry));
  mine.dispose();
  expect(freed.size).toBe(new Set(b.map((mesh) => mesh.geometry)).size);
  let gone = 0;
  own.matte.addEventListener("dispose", () => (gone += 1));
  own.outline.addEventListener("dispose", () => (gone += 1));
  own.dispose();
  expect(gone).toBe(2);
  shared.dispose();
});
