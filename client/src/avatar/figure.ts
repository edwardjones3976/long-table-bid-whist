/**
 * The 3D contract of an avatar: a rig of rigid parts on named joints, built in code from a Look.
 *
 *   const figure = buildFigure(look, "near")   a fresh rig; add figure.root to the scene
 *   figure.joints.head.rotation.x = 0.2        animate by turning joints, a few per frame
 *   figure.face.setMouth("smile")              expressions: mouth shape, blink (0 open .. 1 closed), gaze (-1..1)
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
 * Each joint holds at most three meshes: its shapes merged into one geometry (vertex colours, one shared
 * matte material), the same geometry again as a thin dark outline (near and far only), and small surface
 * details that go without the outline. The head adds the moving irises, lids and mouth. Geometry is
 * cached by (joint, look, detail), so figures of the same look share it; "simple" is today's capsule.
 * The parts come from body.ts, face.ts, hair.ts, headwear.ts and accessories.ts, measured by measure.ts.
 */
import { BackSide, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, type BufferGeometry, type Material, type Object3D } from "three";
import { FIELDS, type Field, type Look } from "../../../shared/avatar";
import { accessories } from "./accessories";
import { body, simpleBody } from "./body";
import { face, MOUTH_SHAPES } from "./face";
import { hair } from "./hair";
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

export type MouthShape = "relaxed" | "smile" | "open" | "grin" | "surprise";

export interface Figure {
  root: Group;
  joints: Record<JointName, Object3D>;
  face: {
    setMouth(shape: MouthShape): void;
    /** 0 open to 1 closed. */
    setBlink(closed: number): void;
    /** Where the eyes look, each from -1 to 1: x to the figure's right, y up. */
    setGaze(x: number, y: number): void;
  };
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
 * themes. It scales the colour itself, which keeps its hue, so nothing turns grey or ashy.
 */
const FLAT = 0.22;
export const MATTE = new MeshLambertMaterial({ vertexColors: true });
MATTE.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <emissivemap_fragment>",
    `#include <emissivemap_fragment>
\tfloat avatarLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
\ttotalEmissiveRadiance += diffuseColor.rgb * ${FLAT.toFixed(2)} * clamp(0.15 / max(avatarLuma, 0.0001), 1.0, 2.5);`,
  );
};

/** The outline: the shapes drawn again from behind, pushed out along their normals by OUTLINE_M metres. */
const OUTLINE_M = 0.006;
export const OUTLINE = new MeshBasicMaterial({ color: "#1c1512", side: BackSide });
OUTLINE.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n\ttransformed += normalize(normal) * ${OUTLINE_M.toFixed(4)};`);
};

export interface OwnMaterials {
  matte: Material;
  outline: Material;
  dispose(): void;
}

/**
 * A renderer keeps a dispose listener on each material and geometry it draws, and its whole self alive through it.
 * A short-lived renderer gets materials of its own, so shared ones never hold a closed renderer.
 */
export function ownMaterials(): OwnMaterials {
  const matte = Object.assign(MATTE.clone(), { onBeforeCompile: MATTE.onBeforeCompile });
  const outline = Object.assign(OUTLINE.clone(), { onBeforeCompile: OUTLINE.onBeforeCompile });
  return { matte, outline, dispose: () => [matte, outline].forEach((material) => material.dispose()) };
}

interface Built {
  offsets: Record<JointName, [number, number, number]>;
  joints: Partial<Record<JointName, { shell: BufferGeometry | null; detail: BufferGeometry | null }>>;
  face: { irises: BufferGeometry; lids: BufferGeometry; lidAt: number; lidRest: number; gaze: [number, number]; mouths: Record<MouthShape, BufferGeometry> } | null;
  triangles: number;
  users: number;
}

const built = new Map<string, Built>();
/** How many looks no figure uses are kept, so someone crossing back over the near line is not built again. */
export const IDLE_KEEP = 64;
/** Keys of sets no figure uses, the longest unused first. */
const idle: string[] = [];
/** The name plate is drawn elsewhere, so its fields never change the body. */
const SHAPE_FIELDS = FIELDS.filter((field: Field) => field !== "plateColor" && field !== "plateSymbol");
// shortcut: figures share geometry only when their whole look matches; key each joint on its own fields if crowds of different looks cost too much.
const keyOf = (look: Look, detail: Detail) => `${detail}|${SHAPE_FIELDS.map((field) => String(look[field])).join("|")}`;

function make(look: Look, detail: Detail): Built {
  const m = measure(look);
  const joints: Built["joints"] = {};
  let count = 0;
  const take = (geometry: BufferGeometry | null) => {
    if (geometry) count += triangles(geometry);
    return geometry;
  };
  if (detail === "simple") {
    const parts = simpleBody(look, m);
    for (const name of JOINT_NAMES) if (parts.shell[name]) joints[name] = { shell: take(merge(parts.shell[name])), detail: null };
    return { offsets: m.joints, joints, face: null, triangles: count, users: 0 };
  }
  const head = face(look, m, detail);
  const wear = headwear(look, m, detail);
  const extras = accessories(look, m, detail);
  const dressings: Dressing[] = [
    body(look, m, detail),
    { shell: { head: head.shell }, detail: { head: head.detail }, tucksHair: false },
    // Beyond 8 m hair tucked under a head covering cannot be seen.
    detail === "far" && wear.tucksHair ? dressing() : hair(look, m, detail, wear.tucksHair || extras.tucksHair),
    wear,
    extras,
  ];
  for (const name of JOINT_NAMES) {
    const shell = take(merge(dressings.flatMap((d) => d.shell[name] ?? [])));
    const small = take(merge(dressings.flatMap((d) => d.detail[name] ?? [])));
    if (shell || small) joints[name] = { shell, detail: small };
  }
  const whole = (pieces: BufferGeometry[]) => {
    const geometry = merge(pieces);
    if (!geometry) throw new Error("a face part has no pieces");
    return geometry;
  };
  const mouths = Object.fromEntries(MOUTH_SHAPES.map((shape) => [shape, whole(head.mouths[shape])])) as Record<MouthShape, BufferGeometry>;
  const moving = { irises: take(whole(head.irises))!, lids: take(whole(head.lids))! };
  // Whichever mouth is showing, the figure stays within its budget.
  count += Math.max(...MOUTH_SHAPES.map((shape) => triangles(mouths[shape])));
  return { offsets: m.joints, joints, face: { ...moving, mouths, lidAt: head.lidAt, lidRest: head.lidRest, gaze: head.gaze }, triangles: count, users: 0 };
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
  for (const joint of Object.values(set.joints)) {
    joint?.shell?.dispose();
    joint?.detail?.dispose();
  }
  if (set.face) [set.face.irises, set.face.lids, ...Object.values(set.face.mouths)].forEach((geometry) => geometry.dispose());
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
  const joints = {} as Record<JointName, Object3D>;
  for (const name of JOINT_NAMES) {
    const joint = new Group();
    joint.name = name;
    joint.position.set(...set.offsets[name]);
    const parent = PARENT[name];
    (parent ? joints[parent] : root).add(joint);
    joints[name] = joint;
    const geometry = set.joints[name];
    if (geometry?.shell) {
      joint.add(new Mesh(geometry.shell, matte));
      if (detail !== "simple") joint.add(Object.assign(new Mesh(geometry.shell, outline), { name: "outline" }));
    }
    if (geometry?.detail) joint.add(new Mesh(geometry.detail, matte));
  }

  let faceControls: Figure["face"] = { setMouth() {}, setBlink() {}, setGaze() {} };
  if (set.face) {
    const { irises, lids, mouths, lidAt, lidRest, gaze } = set.face;
    const eyes = Object.assign(new Mesh(irises, matte), { name: "irises" });
    const lid = Object.assign(new Mesh(lids, matte), { name: "lids" });
    const mouth = Object.assign(new Mesh(mouths.relaxed, matte), { name: "mouth" });
    lid.position.y = lidAt;
    lid.scale.y = lidRest;
    joints.head.add(eyes, lid, mouth);
    faceControls = {
      setMouth: (shape) => void (mouth.geometry = mouths[shape] ?? mouths.relaxed),
      setBlink: (closed) => void (lid.scale.y = lidRest + (1 - lidRest) * unit(closed, 0)),
      setGaze: (x, y) => void eyes.position.set(unit(x, -1) * gaze[0], unit(y, -1) * gaze[1], 0),
    };
  }

  let disposed = false;
  return {
    root,
    joints,
    face: faceControls,
    triangles: set.triangles,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      release(key, !own);
    },
  };
}
