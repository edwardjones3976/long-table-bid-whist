/**
 * What the player sees of their own hands in VR. The library's controller and
 * hand models are downloads, so they are off (state/xr.ts); these are plain
 * shapes in the same tracked spaces. Render inside <XROrigin>.
 *
 *   <Hands/>             a simple body for each controller, two beads for each tracked hand
 *   <ControllerHints/>   the few prompts that matter right now, floating over the left hand
 *   aimSpace.left/right  each controller's pointing ray as an Object3D (looks down its -z), for the teleport arc
 */
import { useXRInputSourceState, XRSpace } from "@react-three/xr";
import { useMemo } from "react";
import { BoxGeometry, MeshBasicMaterial, SphereGeometry, type Object3D } from "three";
import { useLocal } from "../state/local";
import { makeTextTexture, textAspect } from "../ui/text";

export const aimSpace: { left: Object3D | null; right: Object3D | null } = { left: null, right: null };

export const noRaycast = (): void => {};

// One of each for the whole app, so every hand shares them.
const bodyGeometry = new BoxGeometry(0.04, 0.045, 0.13);
const beadGeometry = new SphereGeometry(0.012, 10, 8);
const handMaterial = new MeshBasicMaterial({ color: "#d9dde8" });

function Controller({ hand }: { hand: "left" | "right" }) {
  const state = useXRInputSourceState("controller", hand);
  if (!state) return null;
  const { targetRaySpace, gripSpace } = state.inputSource;
  return (
    <>
      <XRSpace
        space={targetRaySpace}
        ref={(space: Object3D | null) => {
          aimSpace[hand] = space;
        }}
      />
      {gripSpace && (
        <XRSpace space={gripSpace}>
          <mesh geometry={bodyGeometry} material={handMaterial} position={[0, -0.01, 0.03]} raycast={noRaycast} />
        </XRSpace>
      )}
    </>
  );
}

function TrackedHand({ hand }: { hand: "left" | "right" }) {
  const joints = useXRInputSourceState("hand", hand)?.inputSource.hand;
  const wrist = joints?.get("wrist");
  const tip = joints?.get("index-finger-tip");
  return (
    <>
      {wrist && (
        <XRSpace space={wrist}>
          <mesh geometry={beadGeometry} material={handMaterial} scale={2} raycast={noRaycast} />
        </XRSpace>
      )}
      {tip && (
        <XRSpace space={tip}>
          <mesh geometry={beadGeometry} material={handMaterial} raycast={noRaycast} />
        </XRSpace>
      )}
    </>
  );
}

export function Hands() {
  return (
    <>
      <Controller hand="left" />
      <Controller hand="right" />
      <TrackedHand hand="left" />
      <TrackedHand hand="right" />
    </>
  );
}

export function ControllerHints() {
  const controller = useXRInputSourceState("controller", "left");
  const tracked = useXRInputSourceState("hand", "left");
  const locomotion = useLocal((state) => state.comfort.locomotion);
  const dominant = useLocal((state) => state.comfort.dominantHand);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const seated = useLocal((state) => state.seated !== null);

  // Hands have no sticks or buttons: only what a pinch can do is listed.
  const hasController = controller !== undefined;

  const texture = useMemo(() => {
    if (!hasController) {
      return makeTextTexture(["Pinch: press buttons, pick cards", "Menu button beside you: settings, leave", "Pick up a controller to move or turn"], { fontPx: 44, align: "left" });
    }
    const moveStick = dominant === "right" ? "Left stick" : "Right stick";
    const turnStick = dominant === "right" ? "Right stick" : "Left stick";
    const lines = ["Trigger: press buttons, pick cards"];
    if (!seated) lines.push(locomotion === "teleport" ? `${moveStick} forward, let go: teleport` : `${moveStick}: walk`);
    lines.push(`${turnStick} left / right: turn`);
    if (seated) lines.push("Stick click: recentre the seat");
    lines.push("X: menu (settings, leave)", "Y: hide these hints");
    return makeTextTexture(lines, { fontPx: 44, align: "left" });
  }, [locomotion, dominant, seated, hasController]);

  const space = controller
    ? (controller.inputSource.gripSpace ?? controller.inputSource.targetRaySpace)
    : tracked?.inputSource.hand.get("wrist");
  if (!space) return null;
  const height = 0.1 * uiScale;
  return (
    <XRSpace space={space}>
      {/* Above the hand, leaning back so it faces the eyes when the hand is held up. */}
      <mesh position={[0, 0.1, -0.03]} rotation={[-0.7, 0, 0]} scale={[textAspect(texture) * height, height, 1]} raycast={noRaycast}>
        <planeGeometry />
        <meshBasicMaterial map={texture} />
      </mesh>
    </XRSpace>
  );
}
