/**
 * "Press what I am pointing at" for devices with no pointer of their own: the
 * centre reticle (keyboard F / Enter, gamepad A, a click while the mouse is
 * captured), and gamepad focus through the DOM table panel.
 *
 * How in-world targets are found: a ray from the camera through a screen point;
 * the nearest visible mesh that has, on itself or an ancestor,
 *   1. userData.onActivate: () => void    (the table interface sets this), or
 *   2. an R3F onClick handler             (called with a minimal click event).
 * Like R3F's own mouse events, things without a handler do not block the ray.
 */
import { Raycaster, type Camera, type Intersection, type Object3D, type Vector2 } from "three";

interface R3FInstance {
  eventCount: number;
  handlers: { onClick?: (event: unknown) => void };
}

const raycaster = new Raycaster();
const hits: Intersection[] = [];

const r3f = (object: Object3D): R3FInstance | undefined => (object as { __r3f?: R3FInstance }).__r3f;

/** The object in `object`'s ancestry that takes pointer input, or null if there is none or any of the chain is hidden. */
function interactive(object: Object3D): Object3D | null {
  let found: Object3D | null = null;
  for (let at: Object3D | null = object; at; at = at.parent) {
    if (!at.visible) return null;
    if (!found && (typeof at.userData.onActivate === "function" || (r3f(at)?.eventCount ?? 0) > 0)) found = at;
  }
  return found;
}

function pick(scene: Object3D, camera: Camera, at: Vector2): { owner: Object3D; hit: Intersection } | null {
  raycaster.setFromCamera(at, camera);
  hits.length = 0;
  raycaster.intersectObject(scene, true, hits);
  for (const hit of hits) {
    const owner = interactive(hit.object);
    if (owner) return { owner, hit };
  }
  return null;
}

/** Whether a click at this screen point (-1..1 both ways) would land on in-world interface. */
export function isInteractiveAt(scene: Object3D, camera: Camera, at: Vector2): boolean {
  return pick(scene, camera, at) !== null;
}

/** Presses the in-world target at this screen point. Returns whether there was one. */
export function activateAt(scene: Object3D, camera: Camera, at: Vector2): boolean {
  const target = pick(scene, camera, at);
  if (!target) return false;
  const { owner, hit } = target;
  if (typeof owner.userData.onActivate === "function") owner.userData.onActivate();
  else {
    r3f(owner)?.handlers.onClick?.({
      object: hit.object,
      eventObject: owner,
      point: hit.point,
      distance: hit.distance,
      intersections: [hit],
      stopPropagation() {},
    });
  }
  return true;
}

/** Moves DOM focus to the next (1) or previous (-1) enabled control among these data-testid values. */
export function cycleFocus(testIds: readonly string[], direction: 1 | -1): void {
  const controls = testIds
    .map((id) => document.querySelector<HTMLButtonElement>(`[data-testid="${CSS.escape(id)}"]`))
    .filter((control): control is HTMLButtonElement => control !== null && !control.disabled);
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement as HTMLButtonElement);
  const next = current < 0 ? (direction > 0 ? 0 : controls.length - 1) : (current + direction + controls.length) % controls.length;
  controls[next].focus();
}

/** Presses the DOM button that has focus. Returns whether there was one. */
export function clickFocused(): boolean {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLButtonElement) || focused.disabled) return false;
  focused.click();
  return true;
}
