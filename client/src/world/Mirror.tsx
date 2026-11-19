/**
 * The foyer's tall dressing mirror (MIRROR in world/layout.ts): a three.js Reflector in a dark wood frame with a
 * gold rim. In VR a "Your look" plaque beside it opens the look panel (avatar/VrLook.tsx).
 *
 *   <Mirror />            inside the R3F canvas (World draws it)
 *   mirrorShown.rendered  whether the reflection was drawn last frame (the browser tests' hook, main.tsx)
 *   besideMirror(pose)    in front of the glass and close to it: there the reflection is the look panel's preview
 *   inFront(x, z)         how far in front of the glass a point is, in metres (negative behind it)
 *
 * My own body is drawn only in the reflection: its meshes are on MIRROR_LAYER, which the reflection's camera
 * sees and the main camera never does, so nobody's view of the room changes. It is my saved look (or the draft
 * being edited in VR) at my pose this frame, with my VR head and hands and my own gestures. The reflection costs
 * a second drawing of the scene, so it is drawn only within REFLECT_M and while the glass is in view: three.js
 * skips a mesh outside the view, and the Reflector skips glass seen from behind. Further off it is plain glass.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshBasicMaterial, PlaneGeometry, Vector3, type Group, type Mesh, type Object3D } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import type { Pose } from "../../../shared/protocol";
import { lookDraft, shownLook, useLookDraft } from "../avatar/draft";
import { buildFigure, type Figure } from "../avatar/figure";
import { ME, myGestures } from "../avatar/gestures";
import { measure } from "../avatar/measure";
import { actNow, animate, blinkAt, isFloating, newRig, seedOf, stepAir, stepGait, tuckOf } from "../avatar/motion";
import { applyRig } from "../avatar/pose";
import { desk } from "../controls/input";
import { noRaycast } from "../controls/Hands";
import { local, useLocal } from "../state/local";
import { myLook, useMyLook } from "../state/look";
import { Pressable } from "../tableui/Tables";
import { MIRROR } from "./layout";

/** A camera layer of its own: the reflection's camera sees it, the main camera (and XR's eye layers 1 and 2) do not. */
export const MIRROR_LAYER = 5;
/** The reflection is drawn only while the viewer is this close to the glass. */
const REFLECT_M = 10;
/** Close enough to see oneself in it while using the look panel. */
const BESIDE_M = 3.5;

const NORMAL = { x: Math.sin(MIRROR.ry), z: Math.cos(MIRROR.ry) };
/** How far in front of the glass (x, z) is; negative behind it. */
export const inFront = (x: number, z: number): number => (x - MIRROR.x) * NORMAL.x + (z - MIRROR.z) * NORMAL.z;

export const besideMirror = (pose: Pose): boolean => inFront(pose.x, pose.z) > 0.2 && Math.hypot(pose.x - MIRROR.x, pose.z - MIRROR.z) < BESIDE_M;

export const mirrorShown = { rendered: false };
let drew = false;
const eye = new Vector3();
const CENTRE = new Vector3(MIRROR.x, MIRROR.y, MIRROR.z);

/** Me, as only the reflection sees me. */
function Self({ reflecting }: { reflecting: { current: boolean } }) {
  const saved = useMyLook();
  const draft = useLookDraft();
  const shown = draft ? shownLook(draft) : saved;
  const lookKey = JSON.stringify(shown);
  const look = useMemo(() => shown, [lookKey]);
  const m = useMemo(() => measure(look), [look]);
  const holder = useRef<Group>(null);
  const figure = useRef<Figure | null>(null);
  const st = useRef({ gait: { phase: 0, speed: 0 }, air: { ground: 0, settled: 0 }, rig: newRig(), seed: seedOf(ME), mouth: "", x: 0, z: 0 });

  useEffect(() => {
    const built = buildFigure(look, "near");
    built.root.traverse((object: Object3D) => {
      object.layers.set(MIRROR_LAYER);
      object.raycast = noRaycast;
    });
    holder.current?.add(built.root);
    figure.current = built;
    st.current.mouth = "";
    return () => {
      built.dispose();
      figure.current = null;
    };
  }, [look]);

  useFrame(({ clock }, delta) => {
    const pose = desk.pose;
    const built = figure.current;
    const group = holder.current;
    if (!group || !built || !pose || !reflecting.current) return;
    const s = st.current;
    const dt = Math.min(delta, 0.1);
    const y = pose.y ?? 0;
    const moved = Math.hypot(pose.x - s.x, pose.z - s.z);
    [s.x, s.z] = [pose.x, pose.z];
    s.gait = stepGait(s.gait, moved > 3 ? 0 : moved, dt, m);
    s.air = stepAir(s.air, y, dt > 0 ? (y - group.position.y) / dt : 0, dt);
    group.position.set(pose.x, y, pose.z);
    group.rotation.y = pose.ry;
    const t = clock.elapsedTime;
    const rig = animate(
      {
        t,
        m,
        seed: s.seed,
        gait: s.gait,
        tuck: tuckOf(s.air, y),
        floating: isFloating(pose.x, pose.z, y),
        seated: null,
        act: actNow(ME, Date.now(), myGestures),
        head: pose.head,
        hands: pose.hands,
        calm: local.getState().comfort.reducedMotion,
      },
      s.rig,
    );
    applyRig(built, rig);
    if (rig.mouth !== s.mouth) built.face.setMouth((s.mouth = rig.mouth));
    built.face.setBlink(blinkAt(s.seed, t));
  });

  return <group ref={holder} />;
}

export function Mirror() {
  const xrActive = useLocal((state) => state.xrActive);
  const glass = useRef<Mesh>(null);
  const reflecting = useRef(false);
  const plain = useMemo(() => new MeshBasicMaterial({ color: "#9aa3ad" }), []);
  const reflector = useMemo(() => {
    // shortcut: a 512 x 1024 target with three's default multisampling; lower it if the headset's frame rate suffers at the mirror.
    const made = new Reflector(new PlaneGeometry(MIRROR.w, MIRROR.h), { textureWidth: 512, textureHeight: 1024 });
    made.camera.layers.enable(MIRROR_LAYER);
    made.raycast = noRaycast;
    const draw = made.onBeforeRender.bind(made);
    made.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      // The Reflector draws nothing for a camera behind the glass; it is called once per eye in VR.
      eye.setFromMatrixPosition(camera.matrixWorld);
      if (inFront(eye.x, eye.z) > 0) drew = true;
      draw(renderer, scene, camera, geometry, material, group);
    };
    return made;
  }, []);
  useEffect(
    () => () => {
      reflector.geometry.dispose();
      reflector.dispose();
      plain.dispose();
    },
    [reflector, plain],
  );

  useFrame(({ camera }) => {
    mirrorShown.rendered = drew;
    drew = false;
    camera.getWorldPosition(eye);
    reflecting.current = eye.distanceTo(CENTRE) < REFLECT_M;
    reflector.visible = reflecting.current;
    if (glass.current) glass.current.visible = !reflecting.current;
  });

  return (
    <>
      <group position={[MIRROR.x, MIRROR.y, MIRROR.z]} rotation={[0, MIRROR.ry, 0]}>
        <mesh position={[0, 0, -0.04]} raycast={noRaycast}>
          <boxGeometry args={[MIRROR.w + 0.16, MIRROR.h + 0.16, 0.05]} />
          <meshLambertMaterial color="#6f5239" />
        </mesh>
        <mesh position={[0, 0, -0.012]} raycast={noRaycast}>
          <boxGeometry args={[MIRROR.w + 0.05, MIRROR.h + 0.05, 0.02]} />
          <meshLambertMaterial color="#c9a24a" />
        </mesh>
        <primitive object={reflector} />
        <mesh ref={glass} material={plain} raycast={noRaycast}>
          <planeGeometry args={[MIRROR.w, MIRROR.h]} />
        </mesh>
        {xrActive && (
          <Pressable
            name="mirror-look"
            lines={["Your look"]}
            size={[0.3, 0.1]}
            // Local -x is the room's +z: toward the lounge door, on the wall beside the frame.
            position={[-(MIRROR.w / 2 + 0.33), 0.1, 0]}
            onPress={() => lookDraft.open(myLook.get())}
          />
        )}
      </group>
      <Self reflecting={reflecting} />
    </>
  );
}
