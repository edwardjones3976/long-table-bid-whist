/**
 * The menu a headset wearer has in place of the page HUD, which an immersive
 * session cannot show. Render inside <XROrigin> (App passes it to <Player>).
 *
 *   A small "Menu" button is always beside the player, on the off-hand side, so
 *   tracked hands can pinch it; the left controller's X button does the same.
 *   Open, a panel in front shows the connection and room code and offers "Your look"
 *   (the VR look panel, avatar/VrLook.tsx), a wheel of gestures, the comfort settings
 *   (the others as simple shapes, their gestures, reactions at the table among them),
 *   music, theme, leave table, leave room and exit VR.
 *
 * It stays at the head's position and turns to the head only when the head has
 * turned well away, so it can be looked at and pointed at without sliding off
 * (useHeadAnchor, which the look panel shares).
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Group } from "three";
import { GESTURES } from "../../../shared/avatar";
import { lookDraft } from "../avatar/draft";
import { playGesture, useGestureReady } from "../avatar/gestures";
import { VrLook } from "../avatar/VrLook";
import { CONNECTION } from "../hud/Hud";
import { runButton } from "../net/run";
import { myTable, net, useStore } from "../net/store";
import { local, useLocal } from "../state/local";
import { myLook } from "../state/look";
import { useTableDescription } from "../state/table";
import { xrStore } from "../state/xr";
import { arc, Label, Pressable } from "./Tables";

/** The head may turn this far (radians) from the menu before the menu comes round to it. */
const FOLLOW = 1.3;
const BUTTON: [number, number] = [0.22, 0.07];
const COLUMNS = 3;

/**
 * For a group inside the XR origin: keeps it at the head, turned to where the head looked when `open` last became
 * true, and brings it round only once the head has turned more than FOLLOW away. Hidden until the headset has a pose.
 */
export function useHeadAnchor(open: boolean): RefObject<Group | null> {
  const group = useRef<Group>(null);
  const yaw = useRef<number | null>(null);
  useEffect(() => {
    // Opening brings the panel to where the player is looking now.
    if (open) yaw.current = null;
  }, [open]);
  useFrame(({ camera }) => {
    const anchored = group.current;
    // Only once the camera is the headset inside the same origin: then its own transform is the head in the rig.
    if (!anchored || camera.parent !== anchored.parent) return;
    const q = camera.quaternion;
    const head = Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
    const off = yaw.current === null ? Infinity : Math.abs(Math.atan2(Math.sin(head - yaw.current), Math.cos(head - yaw.current)));
    if (off > FOLLOW) yaw.current = head;
    anchored.position.copy(camera.position);
    anchored.rotation.y = yaw.current!;
    anchored.visible = true;
  });
  return group;
}

/** Seven large buttons round a Back button. All wait out the cooldown after any gesture (avatar/gestures.ts). */
function GestureWheel({ onBack }: { onBack: () => void }) {
  const ready = useGestureReady();
  return (
    <>
      {GESTURES.map(({ id, label }, i) => {
        const angle = (i / GESTURES.length) * Math.PI * 2;
        return (
          <Pressable
            key={id}
            name={`vr-gesture-${id}`}
            lines={ready ? [label] : [label, "(in a moment)"]}
            size={[0.16, 0.08]}
            disabled={!ready}
            onPress={() => void playGesture(id)}
            position={[Math.sin(angle) * 0.22, -0.11 + Math.cos(angle) * 0.2, 0]}
          />
        );
      })}
      <Pressable name="vr-gesture-back" lines={["Back"]} size={[0.13, 0.07]} onPress={onBack} position={[0, -0.11, 0]} />
    </>
  );
}

function Menu() {
  const open = useLocal((state) => state.vrMenu);
  const group = useHeadAnchor(open);
  const comfort = useLocal((state) => state.comfort);
  const theme = useLocal((state) => state.theme);
  const connection = useStore((state) => state.connection);
  const code = useStore((state) => state.room?.code ?? "");
  const leaveTable = useTableDescription(useStore((state) => myTable(state)?.id ?? null))?.buttons.find((button) => button.id === "leave");
  const [sure, setSure] = useState(false);
  const [page, setPage] = useState<"settings" | "gestures">("settings");

  useEffect(() => {
    setSure(false);
    setPage("settings");
  }, [open]);

  const side = comfort.dominantHand === "right" ? 1 : -1;
  const rows: { name: string; lines: string[]; disabled?: boolean; onPress: () => void }[] = [
    {
      name: "vr-menu-look",
      lines: ["Your look"],
      onPress: () => {
        local.set({ vrMenu: false });
        lookDraft.open(myLook.get());
      },
    },
    { name: "vr-menu-gestures", lines: ["Gestures"], onPress: () => setPage("gestures") },
    {
      name: "vr-menu-move",
      lines: [`Move: ${comfort.locomotion === "teleport" ? "teleport only" : "walk and teleport"}`],
      onPress: () => local.setComfort({ locomotion: comfort.locomotion === "teleport" ? "smooth" : "teleport" }),
    },
    { name: "vr-menu-turn", lines: [`Turn: ${comfort.snapTurn ? "snap" : "smooth"}`], onPress: () => local.setComfort({ snapTurn: !comfort.snapTurn }) },
    {
      // Which stick walks and which turns, and which hand jumps: a one-handed or left-handed player sets it here, in VR.
      name: "vr-menu-hand",
      lines: [`Main hand: ${comfort.dominantHand}`],
      onPress: () => local.setComfort({ dominantHand: comfort.dominantHand === "right" ? "left" : "right" }),
    },
    { name: "vr-menu-jump", lines: [`Jumping: ${comfort.jump ? "on" : "off"}`], onPress: () => local.setComfort({ jump: !comfort.jump }) },
    { name: "vr-menu-vignette", lines: [`Vignette: ${comfort.vignette ? "on" : "off"}`], onPress: () => local.setComfort({ vignette: !comfort.vignette }) },
    { name: "vr-menu-haptics", lines: [`Vibration: ${comfort.haptics ? "on" : "off"}`], onPress: () => local.setComfort({ haptics: !comfort.haptics }) },
    { name: "vr-menu-sounds", lines: [`Sound effects: ${comfort.sounds ? "on" : "off"}`], onPress: () => local.setComfort({ sounds: !comfort.sounds }) },
    { name: "vr-menu-music", lines: [`Music: ${comfort.music ? "on" : "off"}`], onPress: () => local.setComfort({ music: !comfort.music }) },
    {
      name: "vr-menu-shapes",
      lines: [`Others: ${comfort.simpleShapes ? "simple shapes" : "full look"}`],
      onPress: () => local.setComfort({ simpleShapes: !comfort.simpleShapes }),
    },
    {
      name: "vr-menu-their-gestures",
      lines: [`Their gestures: ${comfort.hideGestures ? "hidden" : "shown"}`],
      onPress: () => local.setComfort({ hideGestures: !comfort.hideGestures }),
    },
    {
      name: "vr-menu-reactions",
      lines: [`Reactions at table: ${comfort.reactions ? "on" : "off"}`],
      onPress: () => local.setComfort({ reactions: !comfort.reactions }),
    },
    {
      name: "vr-menu-theme",
      lines: [`Theme: ${theme === "july4" ? "Fourth of July" : "New Year"}`],
      onPress: () => local.set({ theme: theme === "july4" ? "newyear" : "july4" }),
    },
    {
      name: "vr-menu-leave-table",
      lines: leaveTable ? [leaveTable.label] : ["Leave table", "(you are not at a table)"],
      disabled: !leaveTable,
      onPress: () => {
        if (leaveTable) void runButton(leaveTable);
      },
    },
    {
      name: "vr-menu-leave-room",
      lines: sure ? ["Press again to leave the room"] : ["Leave room"],
      // Leaving the room ends VR (App), so the entry page is seen.
      onPress: () => (sure ? void net.leaveRoom() : setSure(true)),
    },
    { name: "vr-menu-exit", lines: ["Exit VR"], onPress: () => void xrStore.getState().session?.end().catch(() => {}) },
  ];

  return (
    <group ref={group} visible={false}>
      <Pressable
        name="vr-menu"
        lines={[open ? "Close menu" : "Menu"]}
        size={[0.12, 0.05]}
        onPress={() => local.set({ vrMenu: !open })}
        {...arc(-side * 1.1, 0.6, -0.35)}
      />
      {open && (
        <group position={[0, -0.02, -0.7]} scale={comfort.uiScale}>
          {/* A backing, so a ray between two buttons does not press whatever is behind the menu. It is sized for six rows of three. */}
          <mesh position={[0, -0.07, -0.006]} scale={[0.74, 0.65, 1]} onClick={(event) => event.stopPropagation()}>
            <planeGeometry />
            <meshBasicMaterial color="#10131a" />
          </mesh>
          <Label
            lines={[`${CONNECTION[connection][1]}. Room ${code}`, page === "gestures" ? "Press a gesture: everyone sees it" : "Press a setting to change it"]}
            box={[0.5, 0.08]}
            options={{ background: "#10131a", fontPx: 44 }}
            position={[0, 0.17, 0]}
          />
          {page === "gestures" ? (
            <GestureWheel onBack={() => setPage("settings")} />
          ) : (
            rows.map((row, i) => (
              <Pressable key={row.name} {...row} size={BUTTON} position={[((i % COLUMNS) - 1) * 0.235, 0.08 - Math.floor(i / COLUMNS) * 0.08, 0]} />
            ))
          )}
        </group>
      )}
    </group>
  );
}

export function VrMenu() {
  const active = useLocal((state) => state.xrActive);
  // A look still being edited when the session ends is thrown away, as Cancel would.
  useEffect(() => {
    if (!active) lookDraft.close();
  }, [active]);
  return active ? (
    <>
      <Menu />
      <VrLook />
    </>
  ) : null;
}
