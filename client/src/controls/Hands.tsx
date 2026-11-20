/**
 * What the player sees of their own hands in VR. The library's controller and
 * hand models are downloads, so they are off (state/xr.ts); these are plain
 * shapes in the same tracked spaces. Render inside <XROrigin>.
 *
 *   <Hands/>             a simple body for each controller, two beads for each tracked hand. Each hand changes
 *                        shape while it has hold of something on the table (tableui/carry.ts), so the two hands
 *                        show their own state: a slim block when free, a short fat one with a bar across its
 *                        front when holding; a tracked hand's fingertip bead swells. A holding hand is also seen
 *                        through, so it never hides the card it holds.
 *   <ControllerHints/>   the few prompts that matter right now, floating over the left hand (words: hints.ts)
 *   aimSpace.left/right  each controller's pointing ray as an Object3D (looks down its -z), for the teleport arc
 *   handSpace.left/right where each hand is: a controller's grip or a tracked hand's wrist, for the pose the room is
 *                        sent (avatar/pose.ts). Each is a child of the XR origin; trust it only while it is visible
 *                        (tracked) and still has a parent (a hand that went away leaves its last one behind).
 */
import { useXRInputSourceState, XRSpace } from "@react-three/xr";
import { useMemo, useSyncExternalStore } from "react";
import { BoxGeometry, MeshBasicMaterial, SphereGeometry, type Object3D } from "three";
import { useLocal } from "../state/local";
import { carries } from "../tableui/carry";
import { makeTextTexture, textAspect } from "../ui/text";
import { hintLines } from "./hints";

export const aimSpace: { left: Object3D | null; right: Object3D | null } = { left: null, right: null };
export const handSpace: { left: Object3D | null; right: Object3D | null } = { left: null, right: null };
const holdSpace = (hand: "left" | "right") => (space: Object3D | null) => void (space && (handSpace[hand] = space));

export const noRaycast = (): void => {};

// One of each for the whole app, so every hand shares them.
const bodyGeometry = new BoxGeometry(0.04, 0.045, 0.13);
const barGeometry = new BoxGeometry(0.08, 0.022, 0.02);
const beadGeometry = new SphereGeometry(0.012, 10, 8);
const handMaterial = new MeshBasicMaterial({ color: "#d9dde8" });
const holdingMaterial = new MeshBasicMaterial({ color: "#d9dde8", transparent: true, opacity: 0.35, depthWrite: false });

/** Whether that hand has hold of something on the table right now. */
function useHolding(hand: "left" | "right"): boolean {
  return useSyncExternalStore(carries.subscribe, () => carries.inHand(hand) !== undefined);
}

function Controller({ hand }: { hand: "left" | "right" }) {
  const state = useXRInputSourceState("controller", hand);
  const holding = useHolding(hand);
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
        <XRSpace space={gripSpace} ref={holdSpace(hand)}>
          <mesh geometry={bodyGeometry} material={holding ? holdingMaterial : handMaterial} position={[0, -0.01, 0.03]} scale={holding ? [1.3, 1.1, 0.72] : [1, 1, 1]} raycast={noRaycast} />
          {/* Closed across the front of the hand: told from the free hand by shape, not colour. */}
          {holding && <mesh geometry={barGeometry} material={holdingMaterial} position={[0, -0.005, -0.03]} raycast={noRaycast} />}
        </XRSpace>
      )}
    </>
  );
}

function TrackedHand({ hand }: { hand: "left" | "right" }) {
  const joints = useXRInputSourceState("hand", hand)?.inputSource.hand;
  const holding = useHolding(hand);
  const wrist = joints?.get("wrist");
  const tip = joints?.get("index-finger-tip");
  return (
    <>
      {wrist && (
        <XRSpace space={wrist} ref={holdSpace(hand)}>
          <mesh geometry={beadGeometry} material={handMaterial} scale={2} raycast={noRaycast} />
        </XRSpace>
      )}
      {tip && (
        <XRSpace space={tip}>
          <mesh geometry={beadGeometry} material={holding ? holdingMaterial : handMaterial} scale={holding ? 2.2 : 1} raycast={noRaycast} />
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
  const jump = useLocal((state) => state.comfort.jump);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const seated = useLocal((state) => state.seated !== null);
  // Out of the way while this hand carries: the panel must never cover the card it is placing.
  const holding = useHolding("left");

  // Hands have no sticks or buttons: only what a pinch can do is listed.
  const hasController = controller !== undefined;

  const [texture, lines] = useMemo(() => {
    const words = hintLines({ controller: hasController, seated, dominant, locomotion, jump });
    return [makeTextTexture(words, { fontPx: 44, align: "left" }), words.length] as const;
  }, [locomotion, dominant, seated, jump, hasController]);

  const space = controller
    ? (controller.inputSource.gripSpace ?? controller.inputSource.targetRaySpace)
    : tracked?.inputSource.hand.get("wrist");
  if (!space || holding) return null;
  // Every line the same easy size, however many there are.
  const height = (0.018 * lines + 0.012) * uiScale;
  return (
    <XRSpace space={space}>
      {/* Above the hand, leaning back so it faces the eyes when the hand is held up. */}
      <mesh position={[0, 0.07 + height / 2, -0.03]} rotation={[-0.7, 0, 0]} scale={[textAspect(texture) * height, height, 1]} raycast={noRaycast}>
        <planeGeometry />
        <meshBasicMaterial map={texture} />
      </mesh>
    </XRSpace>
  );
}
