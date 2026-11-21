/**
 * The 3D contract of an avatar: a rig of rigid parts on named joints, built in code from a Look.
 *
 *   const figure = buildFigure(look, "near")   a fresh rig; add figure.root to the scene
 *   figure.joints.head.rotation.x = 0.2        animate by turning joints, a few per frame
 *   figure.face.setMouth("smile")              expressions: mouth shape, blink (0 open .. 1 closed), gaze (-1..1), brows (-1 knit .. 1 raised)
 *   figure.setHem(0.1)                         how far the top hangs below the waist: 1 standing, about 0.1 seated
 *   figure.triangles                           what it draws, within TRIANGLE_BUDGET[detail]
 *   figure.dispose()                           takes the rig out of the scene; its geometry is kept for the next IDLE_KEEP looks, then freed
 *   const own = ownMaterials()                 for a figure drawn by a renderer of its own (the editor's preview):
 *   buildFigure(look, "near", own)             its materials and geometry are shared with nothing else, the geometry is
 *   own.dispose()                              freed as soon as it is not used, and own.dispose() goes with that renderer
 *
 * The root's origin is the feet point on the floor, and the figure faces -Z, so root.rotation.y = ry
 * turns it the way world/Avatars.tsx turns today's body. About five heads tall; HEIGHT_M gives the
 * standing height (to the crown) for each height option. Left is -X and right is +X, as the figure sees it.
 *
 * The joints are the bones of one skeleton, and a figure is at most three skinned meshes on it, one draw
 * each: the body (every part, each vertex weighted wholly to its own joint, so the parts stay rigid;
 * vertex colours, one shared matte material), the same buffers again as a thin dark outline (at every detail, so a
 * silhouette reads against a busy room at any distance; shells only, small surface details go without), and the
 * face's moving parts (irises on a bone of their own, lids that blink and brows that lift or knit by morphs, a mouth
 * swapped whole). The top below the waist hangs on a "hem" bone of its own, and a skirt below the hips on a "skirt"
 * bone, which a seated figure draws up onto the lap and the seat. Near and far are 3 draws, simple 2. Geometry is
 * cached by (look, detail), so figures of the same look share it; "simple" is today's capsule.
 * The parts come from body.ts, face.ts, hair.ts, headwear.ts and accessories.ts, measured by measure.ts.
 */
import {
  BackSide,
  Bone,
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Skeleton,
  SkinnedMesh,
  Sphere,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { FIELDS, type Field, type Look } from "../../../shared/avatar";
import { accessories } from "./accessories";
import { body, simpleBody } from "./body";
import { coilSpot, face, MOUTH_SHAPES, type Face } from "./face";
import { BELOW_HAT, hair, standOff } from "./hair";
import { headwear } from "./headwear";
import { HEIGHT_M, measure } from "./measure";
import { dressing, merge, triangles, type Dressing } from "./shapes";

export { HEIGHT_M, MOUTH_SHAPES };

export type Detail = "near" | "far" | "simple";

export type JointName =
  | "pelvis"
  | "torso"
  | "neck"
  | "head"
  | "upperArmL"
  | "foreArmL"
  | "handL"
  | "upperArmR"
  | "foreArmR"
  | "handR"
  | "thighL"
  | "shinL"
  | "footL"
  | "thighR"
  | "shinR"
  | "footR";

export type MouthShape = "relaxed" | "smile" | "open" | "grin" | "surprise" | "laugh";

export interface Figure {
  root: Group;
  joints: Record<JointName, Object3D>;
  face: {
    setMouth(shape: MouthShape): void;
    /** 0 open to 1 closed. */
    setBlink(closed: number): void;
    /** Where the eyes look, each from -1 to 1: x to the figure's right, y up. */
    setGaze(x: number, y: number): void;
    /** 0 at rest, up to 1 raised, down to -1 knit. */
    setBrows(lift: number): void;
  };
  /** How far the top hangs below the waist, 0 to 1: drawn up while seated, so the hem lies on the lap instead of through it (a skirt too, onto the seat). */
  setHem(share: number): void;
  triangles: number;
  /** Takes the rig out of its parent; its geometry is kept a while once no other figure of the same look uses it, then freed. */
  dispose(): void;
}

/** Each joint's parent, parents first. */
const PARENT: Record<JointName, JointName | null> = {
  pelvis: null,
  torso: "pelvis",
  neck: "torso",
  head: "neck",
  upperArmL: "torso",
  foreArmL: "upperArmL",
  handL: "foreArmL",
  upperArmR: "torso",
  foreArmR: "upperArmR",
  handR: "foreArmR",
  thighL: "pelvis",
  shinL: "thighL",
  footL: "shinL",
  thighR: "pelvis",
  shinR: "thighR",
  footR: "shinR",
};
export const JOINT_NAMES = Object.keys(PARENT) as JointName[];

/** Triangles a whole figure may draw, outline passes not counted: about 3,000 up close, 600 beyond 8 m. */
export const TRIANGLE_BUDGET: Record<Detail, number> = { near: 3000, far: 600, simple: 600 };

/**
 * Matte and flat-to-soft: lit by the house lights, plus a share of each surface's own colour. The share
 * grows for darker colours (up to 2.5 times below a linear luminance of 0.15), because the scene's ACES
 * tone mapping crushes the darks: without it the deepest skin tones kept about half the lightness and
 * three quarters of the colour of the lightest ones at night; with it they keep about the same, in both
 * themes. A soft rim of the same, where a surface turns away from the eye, keeps brows, nose, lips and
 * the figure's own edge readable on the deepest tones and against a busy room. Both scale the colour itself,
 * which keeps its hue, so nothing turns grey or ashy, and skin facing the eye is not lightened.
 */
const [FLAT, RIM] = [0.22, 0.35];
export const MATTE = new MeshLambertMaterial({ vertexColors: true });
MATTE.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <emissivemap_fragment>",
    `#include <emissivemap_fragment>
\tfloat avatarLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
\tfloat avatarRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
\ttotalEmissiveRadiance += diffuseColor.rgb * (${FLAT.toFixed(2)} + ${RIM.toFixed(2)} * avatarRim) * clamp(0.15 / max(avatarLuma, 0.0001), 1.0, 2.5);`,
  );
};

/**
 * The outline: the shapes drawn again from behind, pushed out along their normals by OUTLINE_M metres within 2 m,
 * and further for a figure further off (4 times at 8 m), so it stays about as many pixels wide.
 */
const OUTLINE_M = 0.006;
export const OUTLINE = new MeshBasicMaterial({ color: "#1c1512", side: BackSide });
OUTLINE.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
\tfloat outlineDepth = -(modelViewMatrix * vec4(0.0, 0.9, 0.0, 1.0)).z;
\ttransformed += normalize(normal) * ${OUTLINE_M.toFixed(4)} * clamp(outlineDepth / 2.0, 1.0, 10.0);`,
  );
};

const copy = <T extends Material>(material: T): T => Object.assign(material.clone(), { onBeforeCompile: material.onBeforeCompile });
/** The face morphs, which needs another shader: a material of its own keeps the renderer from switching shaders between body and face. */
const FACE = copy(MATTE);

export interface OwnMaterials {
  matte: Material;
  face: Material;
  outline: Material;
  dispose(): void;
}

/**
 * A renderer keeps a dispose listener on each material and geometry it draws, and its whole self alive through it.
 * A short-lived renderer gets materials of its own, so shared ones never hold a closed renderer.
 */
export function ownMaterials(): OwnMaterials {
  const [matte, face, outline] = [copy(MATTE), copy(FACE), copy(OUTLINE)];
  return { matte, face, outline, dispose: () => [matte, face, outline].forEach((material) => material.dispose()) };
}

interface Built {
  offsets: Record<JointName, [number, number, number]>;
  body: BufferGeometry;
  outline: BufferGeometry | null;
  /** The face's moving parts, one geometry per mouth shape. */
  faces: Record<MouthShape, BufferGeometry> | null;
  gaze: [number, number];
  /** Wide enough for any pose, so a figure is culled whole and never posed vertex by vertex on the CPU. */
  bounds: Sphere;
  triangles: number;
  users: number;
}

const [HEAD, TORSO, PELVIS] = [JOINT_NAMES.indexOf("head"), JOINT_NAMES.indexOf("torso"), JOINT_NAMES.indexOf("pelvis")];
/** The irises' bone, the hem's and the skirt's come after the joints. */
const [IRISES, HEM, SKIRT] = [JOINT_NAMES.length, JOINT_NAMES.length + 1, JOINT_NAMES.length + 2];
/** Below this, in the pelvis's own space (m), only a skirt or a dress hangs: the trousers' seat ends above it. */
const SKIRT_Y = -0.15;
const IDENTITY = new Matrix4();

/**
 * Weights every vertex wholly to one bone, so the geometry moves rigidly with it; on the torso all below the waist goes
 * to the hem, and with `hangs` all of a skirt below the hips to the skirt.
 */
function skinned<G extends BufferGeometry | null>(geometry: G, bone: number, hangs = false): G {
  if (!geometry) return geometry;
  const { position } = geometry.attributes;
  const count = position.count;
  const [index, weight] = [new Uint8Array(count * 4), new Uint8Array(count * 4)];
  const to = (y: number) => (bone === TORSO && y < 0 ? HEM : hangs && bone === PELVIS && y < SKIRT_Y ? SKIRT : bone);
  for (let i = 0; i < count; i++) [index[4 * i], weight[4 * i]] = [to(position.getY(i)), 255];
  geometry.setAttribute("skinIndex", new BufferAttribute(index, 4));
  geometry.setAttribute("skinWeight", new BufferAttribute(weight, 4, true));
  return geometry;
}

/** Every joint's pieces as one geometry, shells first, so the outline draws just them from the same buffers. `hangs`: see skinned. */
function bodyOf(dressings: Dressing[], outlined: boolean, hangs = true): { body: BufferGeometry; outline: BufferGeometry | null } {
  const joined = (kind: "shell" | "detail") => JOINT_NAMES.flatMap((name, bone) => skinned(merge(dressings.flatMap((d) => d[kind][name] ?? [])), bone, hangs) ?? []);
  const shells = joined("shell");
  const body = merge([...shells, ...joined("detail")]);
  if (!body) throw new Error("a figure has no pieces");
  if (!outlined) return { body, outline: null };
  const outline = new BufferGeometry();
  for (const name of ["position", "normal", "skinIndex", "skinWeight"]) outline.setAttribute(name, body.getAttribute(name));
  outline.setDrawRange(0, shells.reduce((sum, shell) => sum + shell.attributes.position.count, 0));
  return { body, outline };
}

const whole = (pieces: BufferGeometry[]) => {
  const geometry = merge(pieces);
  if (!geometry) throw new Error("a face part has no pieces");
  return geometry;
};

/** Lids, brows, irises and one mouth for each shape. Three morphs: the lids from their resting height to shut, the brows raised, the brows knit. */
function facesOf(head: Face): Record<MouthShape, BufferGeometry> {
  const lids = whole(head.lids);
  const lidAt = (scale: number) => new Matrix4().makeTranslation(0, head.lidAt, 0).scale(new Vector3(1, scale, 1));
  const open = skinned(lids.clone().applyMatrix4(lidAt(head.lidRest)), HEAD);
  const shut = lids.applyMatrix4(lidAt(1));
  const [brows, raised, knit] = (["rest", "raised", "knit"] as const).map((key) => whole(head.brows[key]));
  skinned(brows, HEAD);
  const irises = skinned(whole(head.irises), IRISES);
  const faces = MOUTH_SHAPES.map((shape) => {
    const geometry = merge([open, brows, irises, skinned(whole(head.mouths[shape]), HEAD)])!;
    // The lids come first, then the brows; each morph moves one of them, and every vertex after them stays put.
    const target = (name: "position" | "normal", from: BufferGeometry, to: BufferGeometry, start: number) => {
      const [a, b] = [from.attributes[name].array, to.attributes[name].array];
      const delta = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < a.length; i++) delta[start + i] = b[i] - a[i];
      return new BufferAttribute(delta, 3);
    };
    const after = open.attributes.position.count * 3;
    const targets = (name: "position" | "normal") => [target(name, open, shut, 0), target(name, brows, raised, after), target(name, brows, knit, after)];
    geometry.morphAttributes = { position: targets("position"), normal: targets("normal") };
    geometry.morphTargetsRelative = true;
    return [shape, geometry] as const;
  });
  return Object.fromEntries(faces) as Record<MouthShape, BufferGeometry>;
}

const built = new Map<string, Built>();
/** How many looks no figure uses are kept, so someone crossing back over the near line is not built again. */
export const IDLE_KEEP = 64;
/** Keys of sets no figure uses, the longest unused first. */
const idle: string[] = [];
/** The name plate is drawn elsewhere, so its fields never change the body. */
const SHAPE_FIELDS = FIELDS.filter((field: Field) => field !== "plateColor" && field !== "plateSymbol");
// shortcut: figures share geometry only when their whole look matches; cache each joint's pieces on its own fields before the merge if crowds of different looks cost too much.
const keyOf = (look: Look, detail: Detail) => `${detail}|${SHAPE_FIELDS.map((field) => String(look[field])).join("|")}`;

function make(look: Look, detail: Detail): Built {
  const m = measure(look);
  const bounds = new Sphere(new Vector3(0, m.height / 2, 0), m.height);
  if (detail === "simple") {
    const { body: shapes, outline } = bodyOf([simpleBody(look, m)], true, false);
    return { offsets: m.joints, body: shapes, outline, faces: null, gaze: [0, 0], bounds, triangles: triangles(shapes), users: 0 };
  }
  const wear = headwear(look, m, detail);
  const extras = accessories(look, m, detail);
  // Beyond 8 m hair tucked under a head covering cannot be seen.
  // Under a hat (a crown hat and a beanie too), what shows below its edge still does.
  const hairs =
    detail === "far" && wear.tucksHair && !(wear.hatEdge && BELOW_HAT.includes(look.hair))
      ? dressing()
      : hair(look, m, detail, wear.hatEdge ?? (wear.tucksHair || (extras.hatEdge ?? extras.tucksHair)), !!wear.hatEdge, wear.hatEdge ? wear.hatDrop : extras.hatDrop);
  const coil = detail === "near" && look.assistive.includes("implant") ? coilSpot(m) : null;
  const head = face(look, m, detail, coil ? standOff(hairs, coil.at, coil.normal) : 0);
  const dressings: Dressing[] = [body(look, m, detail), { shell: { head: head.shell }, detail: { head: head.detail }, tucksHair: false }, hairs, wear, extras];
  const { body: shapes, outline } = bodyOf(dressings, true);
  const faces = facesOf(head);
  // Whichever mouth is showing, the figure stays within its budget.
  const count = triangles(shapes) + Math.max(...MOUTH_SHAPES.map((shape) => triangles(faces[shape])));
  return { offsets: m.joints, body: shapes, outline, faces, gaze: head.gaze, bounds, triangles: count, users: 0 };
}

function release(key: string, keep: boolean): void {
  const set = built.get(key);
  if (!set || --set.users > 0) return;
  if (!keep) return free(key);
  idle.push(key);
  if (idle.length > IDLE_KEEP) free(idle.shift()!);
}

function free(key: string): void {
  const set = built.get(key);
  if (!set) return;
  built.delete(key);
  [set.body, set.outline, ...Object.values(set.faces ?? {})].forEach((geometry) => geometry?.dispose());
}

const unit = (value: number, low: number) => Math.min(1, Math.max(low, Number.isFinite(value) ? value : 0));

export function buildFigure(look: Look, detail: Detail, own?: OwnMaterials): Figure {
  const key = `${own ? "own|" : ""}${keyOf(look, detail)}`;
  const matte = own?.matte ?? MATTE;
  const outline = own?.outline ?? OUTLINE;
  let set = built.get(key);
  if (!set) built.set(key, (set = make(look, detail)));
  if (idle.includes(key)) idle.splice(idle.indexOf(key), 1);
  set.users += 1;

  const root = new Group();
  root.name = "avatar";
  // The bones go in first, so a walk over the root places them before the meshes they pose.
  const joints = {} as Record<JointName, Bone>;
  for (const name of JOINT_NAMES) {
    const joint = Object.assign(new Bone(), { name });
    joint.position.set(...set.offsets[name]);
    const parent = PARENT[name];
    (parent ? joints[parent] : root).add(joint);
    joints[name] = joint;
  }
  const irises = Object.assign(new Bone(), { name: "irises" });
  joints.head.add(irises);
  const hem = Object.assign(new Bone(), { name: "hem" });
  joints.torso.add(hem);
  const skirt = Object.assign(new Bone(), { name: "skirt" });
  joints.pelvis.add(skirt);
  const bones = [...JOINT_NAMES.map((name) => joints[name]), irises, hem, skirt];
  // Identity inverses and bind matrix: the vertices are already in their own joint's space.
  const skeleton = new Skeleton(bones, bones.map(() => new Matrix4()));
  const skin = (geometry: BufferGeometry, material: Material, name: string) => {
    const mesh = Object.assign(new SkinnedMesh(geometry, material), { name, boundingSphere: set.bounds });
    mesh.bind(skeleton, IDENTITY);
    root.add(mesh);
    return mesh;
  };
  skin(set.body, matte, "body");
  if (set.outline) skin(set.outline, outline, "outline");

  let faceControls: Figure["face"] = { setMouth() {}, setBlink() {}, setGaze() {}, setBrows() {} };
  if (set.faces) {
    const { faces, gaze } = set;
    const moving = skin(faces.relaxed, own?.face ?? FACE, "face");
    const influences = moving.morphTargetInfluences!;
    faceControls = {
      setMouth: (shape) => void (moving.geometry = faces[shape] ?? faces.relaxed),
      setBlink: (closed) => void (influences[0] = unit(closed, 0)),
      setGaze: (x, y) => void irises.position.set(unit(x, -1) * gaze[0], unit(y, -1) * gaze[1], 0),
      setBrows: (lift) => void ([influences[1], influences[2]] = [unit(lift, 0), unit(-lift, 0)]),
    };
  }

  let disposed = false;
  return {
    root,
    joints,
    face: faceControls,
    setHem: (share) => {
      const drawn = unit(share, 0.02);
      hem.scale.setY(drawn);
      // A skirt hangs from the hips, much further than a top below the waist: drawn up twice as far, even a maxi ends on the seat.
      skirt.scale.setY(drawn < 1 ? drawn / 2 : 1);
    },
    triangles: set.triangles,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      // Its bone texture is its own.
      skeleton.dispose();
      release(key, !own);
    },
  };
}
