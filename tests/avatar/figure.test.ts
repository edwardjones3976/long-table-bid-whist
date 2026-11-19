// @vitest-environment node
import { Box3, Group, Mesh, Vector3, type Object3D } from "three";
import { expect, it } from "vitest";
import { buildFigure, HEIGHT_M, JOINT_NAMES, type Detail } from "../../client/src/avatar/figure";
import { CATALOG, cleanLook, STARTING_LOOKS, type Look } from "../../shared/avatar";

const DETAILS: Detail[] = ["near", "far", "simple"];
const meshes = (root: Object3D): Mesh[] => {
  const found: Mesh[] = [];
  root.traverse((node) => node instanceof Mesh && found.push(node));
  return found;
};

it("builds a rig with every joint, standing on its feet at the chosen height, within the triangle budget", () => {
  for (const { id } of CATALOG.height) {
    for (const detail of DETAILS) {
      const height = id as Look["height"];
      // Bald and bareheaded, so the top of the figure is the crown itself.
      const figure = buildFigure(cleanLook({ ...STARTING_LOOKS[2], height, hair: "bald", headwear: "none", accessories: [] }), detail);
      expect(Object.keys(figure.joints).sort()).toEqual([...JOINT_NAMES].sort());
      for (const joint of Object.values(figure.joints)) {
        let top = joint;
        while (top.parent) top = top.parent;
        expect(top).toBe(figure.root);
      }
      const box = new Box3().setFromObject(figure.root);
      expect(box.min.y).toBeCloseTo(0, 2);
      expect(box.max.y).toBeCloseTo(HEIGHT_M[height], 2);
      for (const mesh of meshes(figure.root)) expect(mesh.matrixWorld.elements.every(Number.isFinite)).toBe(true);
      expect(figure.triangles).toBeGreaterThan(0);
      expect(figure.triangles).toBeLessThanOrEqual(detail === "near" ? 3000 : 600);
    }
  }
});

it("faces -Z, with the left arm on -X", () => {
  const figure = buildFigure(STARTING_LOOKS[0], "near");
  figure.root.updateMatrixWorld(true);
  const irises = figure.joints.head.getObjectByName("irises")!;
  const at = (object: Object3D) => object.getWorldPosition(new Vector3());
  expect(new Box3().setFromObject(irises).getCenter(new Vector3()).z).toBeLessThan(at(figure.joints.head).z);
  expect(at(figure.joints.handL).x).toBeLessThan(0);
  expect(at(figure.joints.handR).x).toBeGreaterThan(0);
  expect(at(figure.joints.footL).y).toBeGreaterThan(0);
});

it("gives each call its own rig on shared geometries and materials, and dispose only takes it out", () => {
  const one = buildFigure(STARTING_LOOKS[1], "far");
  const two = buildFigure(STARTING_LOOKS[1], "far");
  expect(one.root).not.toBe(two.root);
  const [a, b] = [meshes(one.root), meshes(two.root)];
  expect(a).toHaveLength(b.length);
  expect(a.every((mesh, i) => mesh !== b[i] && mesh.geometry === b[i].geometry && mesh.material === b[i].material)).toBe(true);
  const scene = new Group();
  scene.add(two.root);
  two.dispose();
  expect(scene.children).toEqual([]);
  // A far figure has no moving face parts, but the face stays callable.
  one.face.setMouth("grin");
  one.face.setBlink(1);
  one.face.setGaze(0.5, -0.5);
});
