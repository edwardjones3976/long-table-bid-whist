/**
 * Draws a list of plan.ts Parts as one instanced mesh per (material, texture, shape):
 * the whole house and its furniture cost under two dozen draw calls.
 *
 *   <Parts parts={structure()} />
 *
 * The unit geometries and shared materials live as long as the page; only the
 * per-batch instance buffers are freed.
 */
import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  Shape,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from "three";
import { DOOR_HEIGHT, WALL_HEIGHT, WALL_THICKNESS } from "./layout";
import type { Part } from "./plan";
import { getSurfaceTexture, type PartTex } from "./textures";

/** The wall above a door, with an arched underside, `width` metres wide. Drawn in metres, base at the floor. */
function archGeometry(width: number): BufferGeometry {
  const half = width / 2;
  const spring = DOOR_HEIGHT - 0.2;
  const shape = new Shape();
  shape.moveTo(half, spring);
  shape.absellipse(0, spring, half, 0.6, 0, Math.PI, false);
  shape.lineTo(-half, WALL_HEIGHT);
  shape.lineTo(half, WALL_HEIGHT);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: WALL_THICKNESS, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -WALL_THICKNESS / 2);
}

function starGeometry(): BufferGeometry {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? 0.2 : 0.5;
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 2;
    shape[i ? "lineTo" : "moveTo"](Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false }).translate(0, 0, -0.08);
}

const geometries = new Map<string, BufferGeometry>();

function geometryFor(shape: string): BufferGeometry {
  let geometry = geometries.get(shape);
  if (!geometry) {
    if (shape === "box") geometry = new BoxGeometry(1, 1, 1);
    else if (shape === "cyl") geometry = new CylinderGeometry(0.5, 0.5, 1, 20);
    else if (shape === "ball") geometry = new SphereGeometry(0.5, 16, 12);
    else if (shape === "cone") geometry = new ConeGeometry(0.5, 1, 16);
    else if (shape === "star") geometry = starGeometry();
    else geometry = archGeometry(Number(shape.split(":")[1]));
    geometries.set(shape, geometry);
  }
  return geometry;
}

let materials: Record<Part["mat"], Material> | null = null;
const litTexturedMaterials = new Map<PartTex, MeshLambertMaterial>();

function materialFor(mat: Part["mat"], tex?: PartTex): Material {
  // Lambert, not Standard: per-pixel physically based shading is too dear for a headset browser.
  materials ??= {
    lit: new MeshLambertMaterial(),
    glow: new MeshBasicMaterial({ toneMapped: false }),
    glass: new MeshBasicMaterial({ transparent: true, opacity: 0.25, depthWrite: false }),
    water: new MeshLambertMaterial({ transparent: true, opacity: 0.72 }),
  };
  if (mat !== "lit" || !tex) return materials[mat];
  let textured = litTexturedMaterials.get(tex);
  if (!textured) {
    const map = getSurfaceTexture(tex);
    if (!map) return materials.lit;
    textured = new MeshLambertMaterial({ map });
    litTexturedMaterials.set(tex, textured);
  }
  return textured;
}

function buildMeshes(parts: readonly Part[]): InstancedMesh[] {
  const groups = new Map<string, Part[]>();
  for (const p of parts) {
    const texKey = p.mat === "lit" && p.tex ? p.tex : "";
    const key = `${p.mat}|${texKey}|${p.shape}`;
    const group = groups.get(key);
    if (group) group.push(p);
    else groups.set(key, [p]);
  }
  const placer = new Object3D();
  const color = new Color();
  return [...groups.values()].map((group) => {
    const sample = group[0];
    const mesh = new InstancedMesh(geometryFor(sample.shape), materialFor(sample.mat, sample.tex), group.length);
    group.forEach((p, i) => {
      placer.position.set(p.x, p.y, p.z);
      placer.rotation.set(p.rx, p.ry, p.rz);
      placer.scale.set(p.sx, p.sy, p.sz);
      placer.updateMatrix();
      mesh.setMatrixAt(i, placer.matrix);
      mesh.setColorAt(i, color.set(p.color));
    });
    // A batch spans the whole property, so it is always in view.
    mesh.frustumCulled = false;
    return mesh;
  });
}

export function Parts({ parts }: { parts: readonly Part[] }) {
  const meshes = useMemo(() => buildMeshes(parts), [parts]);
  useEffect(() => () => meshes.forEach((mesh) => mesh.dispose()), [meshes]);
  return (
    <>
      {meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}
