// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * The Three.js seated room.
 *
 * Built against the pinned three@0.165.0 in package.json. It renders furniture,
 * the calibrated table root, and one plate per layout placement, and it resolves
 * a controller ray to the typed action carried by the plate it hits.
 *
 * The room only ever reads an `XrTableProjection`. It has no access to the
 * authoritative game state, so there is nothing concealed for it to draw.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  type Object3D,
  type Texture,
} from "three";

import type { XrTableProjection } from "../table/projection";
import { tableRootPosition, type XrCalibration } from "./calibration";
import { layoutRoom, type XrPlacement, type XrPlacementState } from "./layout";
import { XR_DEALER_LABEL, type XrTargetAction } from "./targets";

/** Presentation authority for the room. Neither mode can see a concealed hand. */
export type XrDealerMode = "ai-dealer" | "human-host";

const PLATE_PIXELS_PER_METRE = 620;
const MAX_PLATE_PIXELS = 1024;

const PLATE_COLORS: Record<XrPlacementState, number> = {
  idle: 0x151b21,
  legal: 0x14463f,
  illegal: 0x2b1b1b,
  selected: 0x5a4413,
  previewed: 0x2f2a63,
  disabled: 0x24242b,
};

const CARD_FACE = 0xf3ece0;
const HOVER_TINT = 1.4;

export interface XrRoomHit {
  key: string;
  action: XrTargetAction;
  distance: number;
}

export interface XrRoomHandle {
  /** World root: floor, walls, and the calibrated table root. */
  readonly root: Group;
  readonly tableRoot: Group;
  setCalibration(calibration: XrCalibration): void;
  /** Rebuilds the plates. Cheap no-op when handed the same projection object. */
  setProjection(projection: XrTableProjection): void;
  raycast(controller: Object3D): XrRoomHit | null;
  setHovered(keys: readonly string[]): void;
  dispose(): void;
}

function drawPlate(placement: XrPlacement): Texture | null {
  const [width, height] = placement.size;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(MAX_PLATE_PIXELS, Math.max(64, Math.round(width * PLATE_PIXELS_PER_METRE)));
  canvas.height = Math.min(MAX_PLATE_PIXELS, Math.max(64, Math.round(height * PLATE_PIXELS_PER_METRE)));
  // jsdom and any GL-less environment have no 2D context; the plate then falls
  // back to a flat colour rather than failing to build the room.
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext("2d");
  } catch {
    context = null;
  }
  if (!context) return null;

  const isCard = placement.kind === "card" || placement.kind === "trick";
  const background = isCard ? CARD_FACE : PLATE_COLORS[placement.state];
  context.fillStyle = `#${background.toString(16).padStart(6, "0")}`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!isCard) {
    context.strokeStyle = placement.state === "disabled" ? "#4a4a55" : "#7d8ea0";
    context.lineWidth = Math.max(2, canvas.width * 0.008);
    context.strokeRect(0, 0, canvas.width, canvas.height);
  }

  const lines = placement.lines.filter((line) => line.length > 0);
  const lineHeight = canvas.height / (lines.length + 0.6);
  const fontSize = Math.min(lineHeight * 0.62, canvas.width * 0.09);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = isCard
    ? placement.accent === "red"
      ? "#a01722"
      : "#141414"
    : placement.state === "disabled"
      ? "#9a9aa6"
      : "#eef3f7";

  lines.forEach((line, index) => {
    const size = isCard ? canvas.height * 0.3 : fontSize;
    context.font = `${Math.round(size)}px system-ui, sans-serif`;
    context.fillText(
      line,
      canvas.width / 2,
      lineHeight * (index + 0.8),
      canvas.width * 0.92,
    );
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

function buildPlate(placement: XrPlacement): Mesh {
  const texture = drawPlate(placement);
  const isCard = placement.kind === "card" || placement.kind === "trick";
  // `map` is omitted rather than set to undefined so three does not warn.
  const material = new MeshBasicMaterial(
    texture
      ? { color: 0xffffff, map: texture }
      : { color: isCard ? CARD_FACE : PLATE_COLORS[placement.state] },
  );
  const mesh = new Mesh(new PlaneGeometry(placement.size[0], placement.size[1]), material);
  mesh.position.set(...placement.position);
  mesh.rotation.set(...placement.rotation);
  mesh.userData.key = placement.key;
  mesh.userData.action = placement.action;
  mesh.userData.baseColor = material.color.getHex();
  return mesh;
}

function solid(
  width: number,
  height: number,
  depth: number,
  color: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), new MeshBasicMaterial({ color }));
  mesh.position.set(x, y, z);
  return mesh;
}

/** Open anchor for a seated participant. Deliberately no human figure. */
function seatAnchor(x: number, z: number): Group {
  const group = new Group();
  group.add(solid(0.42, 0.05, 0.42, 0x2d2016, 0, -0.28, 0));
  group.add(solid(0.42, 0.36, 0.05, 0x241a12, 0, -0.08, -0.2));
  group.position.set(x, 0, z);
  return group;
}

/** The table guide is unmistakably a machine; no human model ships in this room. */
function dealerFigure(): Group {
  const group = new Group();
  group.add(solid(0.28, 0.3, 0.2, 0x152026, 0, 0.05, 0));
  group.add(solid(0.2, 0.16, 0.16, 0x2c6f84, 0, 0.28, 0));
  group.add(solid(0.14, 0.03, 0.02, 0x8fe6ff, 0, 0.3, 0.085));
  group.position.set(0.95, 0.06, -0.5);
  return group;
}

function disposeTree(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const textured = material as MeshBasicMaterial;
      textured.map?.dispose();
      material.dispose();
    });
  });
}

export function createTableRoom(dealerMode: XrDealerMode): XrRoomHandle {
  const root = new Group();
  const tableRoot = new Group();
  const plates = new Group();
  const selectable: Mesh[] = [];
  const raycaster = new Raycaster();
  const orientation = new Matrix4();
  const scratch = new Color();
  let renderedProjection: XrTableProjection | null = null;

  const floor = new Mesh(new PlaneGeometry(8, 8), new MeshBasicMaterial({ color: 0x100e0c }));
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  root.add(solid(8, 3.2, 0.06, 0x1b1512, 0, 1.6, -4));

  const pedestal = solid(0.34, 1, 0.34, 0x3a2314, 0, -0.5, 0);
  tableRoot.add(pedestal);
  tableRoot.add(solid(1.86, 0.05, 1.16, 0x50301b, 0, -0.075, 0));
  tableRoot.add(solid(1.7, 0.06, 1.0, 0x15503a, 0, -0.03, 0));
  tableRoot.add(seatAnchor(0, -0.78));
  tableRoot.add(seatAnchor(-1.05, 0));
  tableRoot.add(seatAnchor(1.05, 0));

  if (dealerMode === "ai-dealer") {
    tableRoot.add(dealerFigure());
    tableRoot.add(
      buildPlate({
        key: "dealer:label",
        kind: "opponent",
        lines: [XR_DEALER_LABEL],
        position: [0.95, 0.5, -0.5],
        rotation: [0, -0.45, 0],
        size: [0.46, 0.1],
        state: "idle",
        accent: "neutral",
        action: null,
      }),
    );
  }

  tableRoot.add(plates);
  root.add(tableRoot);

  const clearPlates = () => {
    disposeTree(plates);
    plates.clear();
    selectable.length = 0;
  };

  return {
    root,
    tableRoot,
    setCalibration(calibration) {
      const { x, y, z } = tableRootPosition(calibration);
      tableRoot.position.set(x, y, z);
      // The pedestal always reaches the floor from the calibrated surface.
      pedestal.scale.y = Math.max(0.01, y - 0.1);
      pedestal.position.y = -0.1 - Math.max(0.01, y - 0.1) / 2;
    },
    setProjection(projection) {
      if (projection === renderedProjection) return;
      renderedProjection = projection;
      clearPlates();
      layoutRoom(projection).forEach((placement) => {
        const mesh = buildPlate(placement);
        plates.add(mesh);
        if (placement.action) selectable.push(mesh);
      });
    },
    raycast(controller) {
      if (selectable.length === 0) return null;
      // Plates move with the calibrated table root, so world matrices must be
      // current before the ray is cast.
      root.updateMatrixWorld(true);
      orientation.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(orientation).normalize();
      const hit = raycaster.intersectObjects(selectable, false)[0];
      if (!hit) return null;
      const action = hit.object.userData.action as XrTargetAction | null;
      if (!action) return null;
      return { key: hit.object.userData.key as string, action, distance: hit.distance };
    },
    setHovered(keys) {
      selectable.forEach((mesh) => {
        const material = mesh.material as MeshBasicMaterial;
        const base = mesh.userData.baseColor as number;
        if (keys.includes(mesh.userData.key as string)) {
          scratch.setHex(base).multiplyScalar(HOVER_TINT);
          material.color.copy(scratch);
        } else {
          material.color.setHex(base);
        }
      });
    },
    dispose() {
      clearPlates();
      disposeTree(root);
      root.clear();
      renderedProjection = null;
    },
  };
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
