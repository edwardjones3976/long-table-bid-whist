import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector2 } from "three";
import { describe, expect, it, vi } from "vitest";
import { activateAt, isInteractiveAt } from "../../client/src/controls/activate";

const CENTRE = new Vector2(0, 0);

/** A camera at the origin looking down -z, and a way to put a box `distance` in front of it. */
function setup() {
  const scene = new Scene();
  const camera = new PerspectiveCamera(70, 1, 0.05, 100);
  camera.updateMatrixWorld();
  const box = (distance: number, parent: Group | Scene = scene) => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 0.1), new MeshBasicMaterial());
    mesh.position.z = -distance;
    parent.add(mesh);
    scene.updateMatrixWorld(true);
    return mesh;
  };
  return { scene, camera, box };
}

describe("reticle activation", () => {
  it("calls userData.onActivate on the mesh under the screen centre", () => {
    const { scene, camera, box } = setup();
    const onActivate = vi.fn();
    box(2).userData.onActivate = onActivate;
    expect(isInteractiveAt(scene, camera, CENTRE)).toBe(true);
    expect(activateAt(scene, camera, CENTRE)).toBe(true);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("finds the handler on an ancestor", () => {
    const { scene, camera, box } = setup();
    const card = new Group();
    card.userData.onActivate = vi.fn();
    scene.add(card);
    box(2, card);
    activateAt(scene, camera, CENTRE);
    expect(card.userData.onActivate).toHaveBeenCalledTimes(1);
  });

  it("presses only the nearest target, and looks past things with no handler", () => {
    const { scene, camera, box } = setup();
    box(1);
    const near = vi.fn();
    const far = vi.fn();
    box(3).userData.onActivate = far;
    box(2).userData.onActivate = near;
    activateAt(scene, camera, CENTRE);
    expect(near).toHaveBeenCalledTimes(1);
    expect(far).not.toHaveBeenCalled();
  });

  it("ignores hidden targets and misses", () => {
    const { scene, camera, box } = setup();
    expect(activateAt(scene, camera, CENTRE)).toBe(false);
    const hidden = new Group();
    hidden.visible = false;
    scene.add(hidden);
    const onActivate = vi.fn();
    box(2, hidden).userData.onActivate = onActivate;
    expect(isInteractiveAt(scene, camera, CENTRE)).toBe(false);
    expect(activateAt(scene, camera, CENTRE)).toBe(false);
    expect(activateAt(scene, camera, new Vector2(0.99, 0.99))).toBe(false);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("falls back to an R3F onClick handler", () => {
    const { scene, camera, box } = setup();
    const onClick = vi.fn();
    const mesh = box(2);
    (mesh as unknown as { __r3f: object }).__r3f = { eventCount: 1, handlers: { onClick } };
    expect(activateAt(scene, camera, CENTRE)).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toMatchObject({ object: mesh, eventObject: mesh });
  });
});
