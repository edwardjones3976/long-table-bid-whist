// @vitest-environment node
import { Box3, Group, Mesh, SkinnedMesh, Vector3, type Object3D } from "three";
import { expect, it } from "vitest";
import { buildFigure, HEIGHT_M, JOINT_NAMES, type Detail, type JointName } from "../../client/src/avatar/figure";
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
  const at = (object: Object3D) => object.getWorldPosition(new Vector3());
  // The irises are drawn by the face mesh on a bone of their own, in front of the head's joint.
  const face = figure.root.getObjectByName("face") as SkinnedMesh;
  expect(new Box3().setFromObject(face).getCenter(new Vector3()).z).toBeLessThan(at(figure.joints.head).z);
  expect(face.skeleton.bones).toContain(figure.joints.head.getObjectByName("irises"));
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
  one.face.setMouth("grin");
  one.face.setBlink(1);
  one.face.setGaze(0.5, -0.5);
});

it("skins each vertex wholly to its own joint, so a turned joint carries its own part and its children's, exactly as a rigid part", () => {
  for (const detail of DETAILS) {
    const figure = buildFigure(STARTING_LOOKS[3], detail);
    const skinned = meshes(figure.root) as SkinnedMesh[];
    const drawn = () => {
      figure.root.updateMatrixWorld(true);
      return skinned.map((mesh) => Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld)));
    };
    const onBone = (mesh: SkinnedMesh, i: number) => mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getX(i)];
    const rest = drawn();
    const joint = (name: JointName) => figure.joints[name];
    joint("upperArmL").rotation.set(-1.1, 0.2, 0.4);
    const raised = drawn();
    // The left arm's three parts move; nothing else does.
    const arm = new Set<Object3D>([joint("upperArmL"), joint("foreArmL"), joint("handL")]);
    for (const [m, mesh] of skinned.entries()) {
      for (let i = 0; i < rest[m].length; i++) {
        const moved = raised[m][i].distanceTo(rest[m][i]);
        if (arm.has(onBone(mesh, i))) expect(moved).toBeGreaterThan(0.001);
        else expect(moved).toBe(0);
      }
    }
    // Posed and placed anywhere, every vertex is where its joint carries it, as if it hung on that joint.
    joint("pelvis").position.y -= 0.3;
    joint("torso").rotation.set(0.3, -0.4, 0.1);
    joint("head").rotation.set(-0.2, 0.6, 0);
    joint("shinR").rotation.x = -1.2;
    figure.root.position.set(4, 0.5, -2);
    figure.root.rotation.y = 2.1;
    figure.face.setGaze(0.7, -0.4);
    const posed = drawn();
    for (const [m, mesh] of skinned.entries()) {
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const hung = new Vector3().fromBufferAttribute(position, i).applyMatrix4(onBone(mesh, i).matrixWorld);
        expect(posed[m][i].distanceTo(hung)).toBeLessThan(1e-5);
      }
    }
    figure.dispose();
  }
});
