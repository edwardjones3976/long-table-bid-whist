// @vitest-environment node
/**
 * The avatar builder: every option of every field, on every build and every height, near and far, makes a
 * whole rig with sound numbers, its draws (skinned meshes on one skeleton, each vertex on one joint), an
 * outline at every detail and no more triangles than its budget. Fields are changed one at a time from a base
 * look, not crossed with each other. Also: the starting looks and a sample of random looks at every detail,
 * the figure's place and facing, the face controls, and geometry shared by one look, kept a while after
 * dispose and then freed, or freed at once for a figure with materials of its own.
 */
import { BackSide, Box3, Group, Mesh, SkinnedMesh, Vector3, type BufferGeometry, type Material, type Object3D } from "three";
import { beforeEach, describe, expect, it } from "vitest";
import { buildFigure, HEIGHT_M, IDLE_KEEP, JOINT_NAMES, MOUTH_SHAPES, ownMaterials, TRIANGLE_BUDGET, type Detail, type Figure } from "../../client/src/avatar/figure";
import { CATALOG, cleanLook, FIELDS, SET_FIELDS, shuffleLook, STARTING_LOOKS, type Field, type Look } from "../../shared/avatar";

const BASE = STARTING_LOOKS[0];

function meshes(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((node) => node instanceof Mesh && found.push(node));
  return found;
}

const isOutline = (mesh: Mesh) => (mesh.material as Material).side === BackSide;

/** Draws per figure: body, outline and face near and far; the capsule and its outline when simple. */
const DRAWS: Record<Detail, number> = { near: 3, far: 3, simple: 2 };

/** Where the vertices on one bone are drawn, on average, skinned through the figure's skeleton. */
function drawnOn(figure: Figure, mesh: string, bone: Object3D): Vector3 {
  figure.root.updateMatrixWorld(true);
  const skinned = figure.root.getObjectByName(mesh) as SkinnedMesh;
  const on = skinned.skeleton.bones.indexOf(bone as never);
  const index = skinned.geometry.attributes.skinIndex;
  const [sum, at] = [new Vector3(), new Vector3()];
  let count = 0;
  for (let i = 0; i < index.count; i++) {
    if (index.getX(i) !== on) continue;
    sum.add(skinned.getVertexPosition(i, at).applyMatrix4(skinned.matrixWorld));
    count += 1;
  }
  expect(count).toBeGreaterThan(0);
  return sum.divideScalar(count);
}

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
  if (all.length !== DRAWS[detail]) found.push(`${all.length} draws`);
  const { skeleton } = all[0] as SkinnedMesh;
  for (const name of JOINT_NAMES) if (!skeleton.bones.includes(figure.joints[name] as never)) found.push(`${name} is not a bone`);
  for (const mesh of all) {
    if (!(mesh instanceof SkinnedMesh) || mesh.skeleton !== skeleton) found.push(`${mesh.name} is off the skeleton`);
    if (Array.isArray(mesh.material) || mesh.geometry.groups.length) found.push(`${mesh.name} draws more than once`);
    const { skinIndex, skinWeight } = mesh.geometry.attributes;
    for (let i = 0; i < skinIndex.count; i++) {
      if (skinWeight.getX(i) !== 1 || skinWeight.getY(i) || skinWeight.getZ(i) || skinWeight.getW(i) || !skeleton.bones[skinIndex.getX(i)]) {
        found.push(`${mesh.name} vertex ${i} is not wholly on one bone`);
        break;
      }
    }
  }
  const outlines = all.filter(isOutline);
  // At every detail one outline redraws the body's shells from the body's own buffers.
  if (outlines.length !== 1) found.push(`${outlines.length} outlines`);
  const body = figure.root.getObjectByName("body") as Mesh;
  for (const { geometry } of outlines) {
    const { start, count } = geometry.drawRange;
    if (geometry.attributes.position !== body.geometry.attributes.position || start !== 0 || !(count > 0 && count <= body.geometry.attributes.position.count)) found.push("an outline of nothing");
  }
  return found;
}

const valuesOf = (field: Field): unknown[] => CATALOG[field].map(({ id }) => (field in SET_FIELDS ? [id] : id));

describe("every option on every build and height", () => {
  // A break between fields: the worker answers the runner's progress calls only between macrotasks, and over a minute without one they time out.
  beforeEach(() => new Promise((resolve) => setTimeout(resolve)));
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

it("builds every starting look and 60 random looks near, far and simple, in 3, 3 and 2 draws", () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const looks = [...STARTING_LOOKS, ...Array.from({ length: 60 }, () => shuffleLook(random))];
  const failures: string[] = [];
  for (const [i, look] of looks.entries()) {
    for (const detail of ["near", "far", "simple"] as const) {
      const figure = buildFigure(look, detail);
      failures.push(...problems(figure, detail).map((problem) => `look ${i} ${detail}: ${problem}`));
      figure.dispose();
    }
  }
  expect(failures).toEqual([]);
}, 60_000);

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
    const eyes = drawnOn(figure, "face", figure.joints.head.getObjectByName("irises")!);
    expect(eyes.z).toBeLessThan(at(figure.joints.head).z);
    expect(at(figure.joints.handL).x).toBeLessThan(0);
    expect(at(figure.joints.handR).x).toBeGreaterThan(0);
    figure.dispose();
  }
});

it("swaps the mouth, closes the lids, lifts or knits the brows and moves the irises a little; a simple figure ignores them all", () => {
  const figure = buildFigure(STARTING_LOOKS[2], "near");
  const face = figure.root.getObjectByName("face") as SkinnedMesh;
  const irises = figure.joints.head.getObjectByName("irises")!;
  const shapes = new Set<BufferGeometry>();
  for (const shape of MOUTH_SHAPES) {
    figure.face.setMouth(shape);
    shapes.add(face.geometry);
  }
  expect(shapes.size).toBe(MOUTH_SHAPES.length);
  figure.root.updateMatrixWorld(true);
  const drawn = () => Array.from({ length: face.geometry.attributes.position.count }, (_, i) => face.getVertexPosition(i, new Vector3()));
  const open = drawn();
  figure.face.setBlink(1);
  const drop = drawn().map((p, i) => p.y - open[i].y);
  // The lids come down over the eyes, and nothing goes up.
  expect(Math.min(...drop)).toBeLessThan(-0.01);
  expect(Math.max(...drop)).toBeLessThan(1e-6);
  figure.face.setBlink(0);
  expect(drawn().every((p, i) => p.distanceTo(open[i]) < 1e-6)).toBe(true);
  // Raised, the brows go up (the inner ends most) and nothing comes down; knit, the inner ends come down and in.
  figure.face.setBrows(1);
  const up = drawn().map((p, i) => p.y - open[i].y);
  expect(Math.max(...up)).toBeGreaterThan(0.007);
  expect(Math.min(...up)).toBeGreaterThan(-1e-6);
  figure.face.setBrows(-1);
  const knit = drawn().map((p, i) => [p.y - open[i].y, Math.abs(p.x) - Math.abs(open[i].x)]);
  expect(Math.min(...knit.map(([dy]) => dy))).toBeLessThan(-0.003);
  expect(Math.min(...knit.map(([, dx]) => dx))).toBeLessThan(-0.002);
  figure.face.setBrows(Number.NaN);
  expect(drawn().every((p, i) => p.distanceTo(open[i]) < 1e-6)).toBe(true);
  const ahead = drawnOn(figure, "face", irises);
  figure.face.setGaze(1, 1);
  expect(irises.position.x).toBeGreaterThan(0);
  expect(irises.position.y).toBeGreaterThan(0);
  expect(irises.position.length()).toBeLessThan(0.02);
  // The drawn irises follow their bone.
  expect(drawnOn(figure, "face", irises).sub(ahead).distanceTo(irises.position)).toBeLessThan(1e-6);
  figure.face.setGaze(Number.NaN, -9);
  expect([irises.position.x, irises.position.y].every(Number.isFinite)).toBe(true);
  figure.dispose();

  const simple = buildFigure(STARTING_LOOKS[2], "simple");
  simple.face.setMouth("grin");
  simple.face.setBlink(1);
  simple.face.setGaze(0.5, -0.5);
  simple.face.setBrows(1);
  simple.setHem(0.1);
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
  const mouth = one.root.getObjectByName("face") as Mesh;
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
  expect(new Set(b.map((mesh) => mesh.material))).toEqual(new Set([own.matte, own.face, own.outline]));
  const freed = new Set<BufferGeometry>();
  for (const mesh of b) mesh.geometry.addEventListener("dispose", () => freed.add(mesh.geometry));
  mine.dispose();
  expect(freed.size).toBe(new Set(b.map((mesh) => mesh.geometry)).size);
  let gone = 0;
  own.matte.addEventListener("dispose", () => (gone += 1));
  own.face.addEventListener("dispose", () => (gone += 1));
  own.outline.addEventListener("dispose", () => (gone += 1));
  own.dispose();
  expect(gone).toBe(3);
  shared.dispose();
});
