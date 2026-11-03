// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Immersive session boundary.
 *
 * Entry is driven by the pinned three@0.165.0 WebXR manager: the page requests
 * the session so it can keep control of the feature list, hands it to the
 * renderer, and attaches one ray per controller. A controller `select` is the
 * only way a target fires, and it resolves to exactly one typed action — a
 * `TableIntent` for the shared preview/cancel/confirm path, or a view intent for
 * the seated calibration.
 *
 * Failures are reported through the closed lifecycle vocabulary, and teardown
 * runs exactly once no matter whether the headset, the page, or both end the
 * session.
 */
import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";

import type { TableIntent } from "../table/intent";
import type { XrTableProjection } from "../table/projection";
import { readPageCalibration, updatePageCalibration, type XrCalibration } from "./calibration";
import { XrLifecycleError, createCleanupRunner } from "./lifecycle";
import { createTableRoom, type XrDealerMode } from "./room";

export type { XrDealerMode } from "./room";
export type XrSupport = "checking" | "supported" | "unsupported";

const RAY_LENGTH_METRES = 5;

export interface XrSessionHandle {
  end(): Promise<void>;
}

export interface XrTableSessionOptions {
  /** DOM overlay root, used when the runtime offers `dom-overlay`. */
  overlayRoot: Element;
  dealerMode: XrDealerMode;
  /** Read once per frame. The room never receives the authoritative state. */
  getProjection: () => XrTableProjection;
  /** Typed intents rejoin the same interaction controller the desktop uses. */
  onTableIntent: (intent: TableIntent) => void;
  onCalibration: (calibration: XrCalibration) => void;
  onEnded: () => void;
}

export function immersiveSessionOptions(root: Element) {
  return {
    requiredFeatures: ["local-floor"],
    optionalFeatures: ["bounded-floor", "hand-tracking", "dom-overlay"],
    domOverlay: { root },
  };
}

function xrSystem(): XRSystem | null {
  return navigator.xr ?? null;
}

export async function queryImmersiveVrSupport(): Promise<XrSupport> {
  const system = xrSystem();
  if (!system) return "unsupported";
  try {
    return (await system.isSessionSupported("immersive-vr")) ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}

let activeHandle: XrSessionHandle | null = null;

function controllerRay(): Line {
  const geometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0),
    new Vector3(0, 0, -1),
  ]);
  const line = new Line(geometry, new LineBasicMaterial({ color: 0x8fe6ff }));
  line.scale.z = RAY_LENGTH_METRES;
  return line;
}

export async function startImmersiveTable(
  options: XrTableSessionOptions,
): Promise<XrSessionHandle> {
  const system = xrSystem();
  if (!system) throw new XrLifecycleError("xr-unavailable");
  if (activeHandle) throw new XrLifecycleError("already-active");

  let session: XRSession;
  try {
    session = await system.requestSession(
      "immersive-vr",
      immersiveSessionOptions(options.overlayRoot) as XRSessionInit,
    );
  } catch (cause) {
    throw new XrLifecycleError("session-rejected", cause);
  }

  let canvas: HTMLCanvasElement;
  let renderer: WebGLRenderer;
  try {
    canvas = document.createElement("canvas");
    canvas.className = "xr-layer-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.xr.enabled = true;
  } catch (cause) {
    await session.end().catch(() => undefined);
    throw new XrLifecycleError("renderer-unavailable", cause);
  }

  try {
    renderer.xr.setReferenceSpaceType("local-floor");
    await renderer.xr.setSession(session);
  } catch (cause) {
    renderer.dispose();
    canvas.remove();
    await session.end().catch(() => undefined);
    throw new XrLifecycleError("reference-space-unavailable", cause);
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(70, 1, 0.05, 40);
  const room = createTableRoom(options.dealerMode);
  scene.add(room.root);
  room.setCalibration(readPageCalibration());
  room.setProjection(options.getProjection());

  const controllers: Object3D[] = [];
  const detachers: (() => void)[] = [];

  /** A select fires exactly one typed action, or nothing at all. */
  const activate = (controller: Object3D) => {
    const hit = room.raycast(controller);
    if (!hit) return;
    if (hit.action.type === "table") {
      options.onTableIntent(hit.action.intent);
      return;
    }
    // Calibration is page-scoped, so it survives leaving and re-entering XR.
    const calibration = updatePageCalibration(hit.action.intent);
    room.setCalibration(calibration);
    options.onCalibration(calibration);
  };

  for (let index = 0; index < 2; index += 1) {
    const controller = renderer.xr.getController(index);
    controller.add(controllerRay());
    const onSelect = () => activate(controller);
    controller.addEventListener("select", onSelect);
    detachers.push(() => controller.removeEventListener("select", onSelect));
    scene.add(controller);
    controllers.push(controller);
  }

  renderer.setAnimationLoop(() => {
    room.setProjection(options.getProjection());
    const hovered: string[] = [];
    controllers.forEach((controller) => {
      const hit = room.raycast(controller);
      const ray = controller.children[0] as Line | undefined;
      if (ray) ray.scale.z = hit ? Math.max(0.05, hit.distance) : RAY_LENGTH_METRES;
      if (hit) hovered.push(hit.key);
    });
    room.setHovered(hovered);
    renderer.render(scene, camera);
  });

  const cleanup = createCleanupRunner([
    { name: "animation-loop", run: () => renderer.setAnimationLoop(null) },
    {
      name: "controllers",
      run: () => {
        detachers.forEach((detach) => detach());
        controllers.forEach((controller) => controller.clear());
      },
    },
    { name: "room", run: () => room.dispose() },
    { name: "renderer", run: () => renderer.dispose() },
    { name: "canvas", run: () => canvas.remove() },
    { name: "active-handle", run: () => void (activeHandle = null) },
    { name: "notify", run: () => options.onEnded() },
  ]);

  session.addEventListener("end", () => cleanup.run(), { once: true });

  const handle: XrSessionHandle = {
    end: async () => {
      try {
        await session.end();
      } finally {
        // Idempotent: if the `end` event already fired, this is a no-op.
        cleanup.run();
      }
    },
  };
  activeHandle = handle;
  return handle;
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
