/**
 * The card tables as people meet them in the 3D room (inside <Canvas> and <XR>):
 *
 *   every table        a status board overhead that turns to the viewer
 *   the table I am near a marker on each open chair and at the dealer's stand: press one to sit
 *   the table I am at   AtTable.tsx: my cards, the drop zones, piles and tokens, handled directly
 *
 * Everything shown and every action comes from describeTable (ui/actions.ts)
 * through useTableActions. Each interactive mesh takes R3F pointer events
 * (the mouse, and either hand's ray or grip through @react-three/xr) and carries
 * the same handler as userData.onActivate. A pressable thing answers the hand
 * that touches it: a tick on hover, a thump when pressed, a buzz when it cannot be.
 *
 * Browser tests (dev or ?e2e=1 only), on window.__mansion:
 *   tablePoint(name)   the world position of the named in-world object, or null
 *   tableNames()       the names that can be pressed
 *   carried()          what each pointer holds now: { pointerId, thing, hand, how, from, carrying, over }[]
 *   cues()             the feedback cues given so far and the hand each went to: { cue, hand, at }[]
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleGeometry, PlaneGeometry, RingGeometry, Vector3, type BufferGeometry, type Group, type Object3D } from "three";
import type { TableId, TableStatus, TableSummary } from "../../../shared/protocol";
import { cue, cueLog } from "../controls/feedback";
import { useStore } from "../net/store";
import { useActiveTableId } from "../state/table";
import type { TableDescription } from "../ui/actions";
import { disposeCardTextures } from "../ui/cards";
import { makeTextTexture, releaseTexture, textAspect, type TextOptions } from "../ui/text";
import { SEAT_HEIGHT, tableSpot, tableSpots, type TableSpot } from "../world/layout";
import { AtTable } from "./AtTable";
import { carries, makeGate, noteAction, pressOf, wasLetGo } from "./carry";
import { STAND_TOP, standSpot, TAP_SLOP } from "./direct";
import { boardLines, STATUS_WORDS, wrap } from "./helpers";
import { useTableActions, type TableActions } from "./useTableActions";

type Vec3 = [number, number, number];

// Shared by every mesh here; passed as a prop, so React never disposes them.
const PLANE = new PlaneGeometry(1, 1);
const SEAT_RING = new RingGeometry(0.13, 0.19, 32);
/** A different outline per status, so the board never relies on its colour. */
const STATUS_ICONS: Record<TableStatus, BufferGeometry> = {
  available: new RingGeometry(0.3, 0.5, 32),
  lobby: new CircleGeometry(0.5, 3),
  playing: new CircleGeometry(0.5, 32),
  results: new CircleGeometry(0.5, 4),
};
const STATUS_COLOURS: Record<TableStatus, string> = {
  available: "#5fd38d",
  lobby: "#ffd24a",
  playing: "#ff9a6b",
  results: "#d4b3ff",
};

const BUTTON_ON = "#14408f";
const BUTTON_OFF = "#2b2f3a";

/** Props of a mesh that is only looked at: neither the mouse nor a hand's ray or grip sees it. */
export const INERT = { raycast: (): void => {}, pointerEvents: "none" } as const;

/** One hover tick per hand in any 150 ms, however many things that hand brushes past. */
export const hoverGate = makeGate(150);

/** The controller behind a pointer event, to send its cue to; undefined for the mouse. */
export const sourceOf = (event: unknown): unknown => pressOf(event as { pointerId: number }).source;

/** What the library's events add for a hand: where its pointer was, in the world. The mouse has none. */
type Placed = { pointerId: number; pointerPosition?: Vector3; nativeEvent?: unknown };

/**
 * A grip presses a thing by squeezing and letting go while touching it, the hand having moved less than 3 cm
 * (TAP_SLOP): the library's own click only asks for the same thing under both. `onPointerDown` notes where each
 * hand squeezed, and `steady(click)` says whether that click is such a press. Rays and the mouse always are,
 * unless the "release" was a controller switching off with its button down (carry.ts, wasLetGo).
 */
function useSteadyGrip(): { onPointerDown: (event: unknown) => void; steady: (event: unknown) => boolean } {
  const squeezed = useRef(new Map<number, Vector3>());
  return {
    onPointerDown: (event) => {
      const { pointerId, pointerPosition } = event as Placed;
      if (pointerPosition) squeezed.current.set(pointerId, pointerPosition.clone());
    },
    steady: (event) => {
      const { pointerId, pointerPosition, nativeEvent } = event as Placed;
      if (!wasLetGo(nativeEvent)) return false;
      const from = squeezed.current.get(pointerId);
      return !(pressOf(event as Placed).how === "grip" && from && pointerPosition) || from.distanceTo(pointerPosition) < TAP_SLOP;
    },
  };
}

/** A spot `radius` in front of the viewer, `angle` to their right, turned to face them. */
export const arc = (angle: number, radius: number, y: number): { position: Vec3; rotation: Vec3 } => ({
  position: [Math.sin(angle) * radius, y, -Math.cos(angle) * radius],
  rotation: [0, -angle, 0],
});

/** Text on a plane, as large as fits in `box` (width, height in metres). The texture is remade only when the words change. */
export function Label({
  lines,
  box,
  options,
  position,
  rotation,
  onActivate,
  inert = false,
}: {
  lines: string[];
  box: [number, number];
  options?: TextOptions;
  position?: Vec3;
  rotation?: Vec3;
  onActivate?: () => void;
  /** Only to be read: pointers pass through it to what it labels. */
  inert?: boolean;
}) {
  const key = JSON.stringify([lines, options]);
  const texture = useMemo(() => makeTextTexture(lines, options), [key]);
  useEffect(() => () => releaseTexture(texture), [texture]);
  const aspect = textAspect(texture);
  const width = Math.min(box[0], box[1] * aspect);
  return (
    <mesh geometry={PLANE} position={position} rotation={rotation} scale={[width, width / aspect, 1]} userData={{ onActivate }} {...(inert ? INERT : null)}>
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

/** Turns its children about the vertical axis to face the viewer. Its position is in world space. */
function Facing({ x, y, z, children }: { x: number; y: number; z: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    // The world matrix, because in VR the camera sits inside the moving rig.
    const world = camera.matrixWorld.elements;
    if (ref.current) ref.current.rotation.y = Math.atan2(world[12] - x, world[14] - z);
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      {children}
    </group>
  );
}

/**
 * A pressable panel button, named by its button id: pressed by a click of the mouse or of either hand's ray, or by
 * a grip squeezed and let go while that hand touches it. Hover grows it and adds a white frame; a disabled one is
 * flat, says why, and only buzzes.
 */
export function Pressable({
  name,
  lines,
  size,
  disabled = false,
  onPress,
  position,
  rotation,
}: {
  name: string;
  lines: string[];
  size: [number, number];
  disabled?: boolean;
  onPress: () => void;
  position?: Vec3;
  rotation?: Vec3;
}) {
  // Either hand, or both, may be on it.
  const over = useRef(new Set<number>());
  const [hover, setHover] = useState(false);
  const grip = useSteadyGrip();
  const lit = hover && !disabled;
  const background = disabled ? BUTTON_OFF : BUTTON_ON;
  const [width, height] = size;
  return (
    <group position={position} rotation={rotation} scale={lit ? 1.08 : 1}>
      {lit && (
        <mesh geometry={PLANE} position={[0, 0, -0.002]} scale={[width + 0.014, height + 0.014, 1]} {...INERT}>
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      <mesh
        name={name}
        geometry={PLANE}
        scale={[width, height, 1]}
        userData={{ onActivate: onPress }}
        onPointerDown={grip.onPointerDown}
        onClick={(event) => {
          event.stopPropagation();
          if (!grip.steady(event)) return;
          cue(disabled ? "refuse" : "place", sourceOf(event));
          if (!disabled) onPress();
        }}
        onPointerEnter={(event) => {
          event.stopPropagation();
          const press = pressOf(event);
          // A hand that is carrying something is not pointing at buttons.
          if (carries.blocked(press.pointerId, press.hand)) return;
          over.current.add(press.pointerId);
          setHover(true);
          if (!disabled && hoverGate(press.hand, performance.now())) cue("hover", press.source);
        }}
        onPointerLeave={(event) => {
          over.current.delete(event.pointerId);
          setHover(over.current.size > 0);
        }}
      >
        <meshBasicMaterial color={background} />
      </mesh>
      <Label
        lines={lines}
        box={[width * 0.94, Math.min(height * 0.9, lines.length * height * 0.36)]}
        options={{ background, color: disabled ? "#d0d4dc" : "#ffffff", fontPx: 44, padding: 6 }}
        position={[0, 0, 0.002]}
        onActivate={onPress}
      />
    </group>
  );
}

function StatusBoard({ spot, summary }: { spot: TableSpot; summary: TableSummary }) {
  return (
    <Facing x={spot.x} y={0} z={spot.z}>
      <Label lines={[spot.label]} box={[1.7, 0.26]} options={{ fontPx: 96 }} position={[0, 2.7, 0]} />
      <mesh geometry={STATUS_ICONS[summary.status]} position={[-0.62, 2.43, 0]} scale={0.2}>
        <meshBasicMaterial color={STATUS_COLOURS[summary.status]} />
      </mesh>
      <Label lines={[STATUS_WORDS[summary.status]]} box={[1, 0.2]} options={{ fontPx: 80 }} position={[0.1, 2.43, 0]} />
      <Label lines={boardLines(summary)} box={[1.7, 0.42]} position={[0, 2.1, 0]} />
    </Facing>
  );
}

/** Shown to someone standing at a table they have not joined: one marker per place they may take. */
function SeatMarkers({ spot, actions }: { spot: TableSpot; actions: TableActions & { description: TableDescription } }) {
  const { description, error, press } = actions;
  const grip = useSteadyGrip();
  return (
    <>
      {description.buttons
        .filter((button) => button.id.startsWith("sit-") && !button.disabled)
        .map((button) => {
          const host = button.id === "sit-host";
          const pose = host ? standSpot(spot) : spot.seats[Number(button.id.slice(4))];
          const sit = (): void => void press(button);
          return (
            <group key={button.id}>
              {/* On the chair itself, or for the host on top of the dealer's stand: pressing the place takes it. */}
              <mesh
                geometry={SEAT_RING}
                position={[pose.x, host ? STAND_TOP + 0.01 : SEAT_HEIGHT + 0.03, pose.z]}
                rotation={[-Math.PI / 2, 0, 0]}
                userData={{ onActivate: sit }}
                onPointerDown={grip.onPointerDown}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!grip.steady(event)) return;
                  cue("place", sourceOf(event));
                  sit();
                }}
              >
                <meshBasicMaterial color="#ffd24a" />
              </mesh>
              <Facing x={pose.x} y={host ? 1.3 : 0.95} z={pose.z}>
                <Pressable
                  name={button.id}
                  lines={host ? ["Stand here as host / dealer", "(does not play)"] : ["Sit here", `Seat ${Number(button.id.slice(4)) + 1}`]}
                  size={[0.36, 0.13]}
                  onPress={sit}
                />
              </Facing>
            </group>
          );
        })}
      {error && (
        <Facing x={spot.x} y={1.55} z={spot.z}>
          <Label lines={wrap(`Problem: ${error}`, 36)} box={[0.9, 0.3]} />
        </Facing>
      )}
    </>
  );
}

function ActiveTable({ tableId }: { tableId: TableId }) {
  const actions = useTableActions(tableId);
  const { description } = actions;
  if (!description) return null;
  const spot = tableSpot(tableId);
  const props = { spot, actions: { ...actions, description } };
  return description.role === "visitor" ? <SeatMarkers {...props} /> : <AtTable {...props} />;
}

/**
 * For browser tests: where named in-world things are. Only where main.tsx has made window.__mansion (dev or ?e2e=1).
 * A hand card's point is its middle, which the card after it covers in a hand of fifteen or more: press it half a
 * step back toward the card before it, where its index corner shows.
 */
function useTestHook(): void {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const hook = (window as unknown as { __mansion?: Record<string, unknown> }).__mansion;
    if (!hook) return;
    hook.tablePoint = (name: string): { x: number; y: number; z: number } | null => {
      const found = scene.getObjectByName(name);
      if (!found) return null;
      scene.updateMatrixWorld();
      const { x, y, z } = found.getWorldPosition(new Vector3());
      return { x, y, z };
    };
    hook.tableNames = (): string[] => {
      const names: string[] = [];
      scene.traverse((object: Object3D) => {
        if (object.name && (typeof object.userData.onActivate === "function" || /^(zone|pile|puck|card)-/.test(object.name))) names.push(object.name);
      });
      return names;
    };
    hook.carried = () => carries.report();
    hook.cues = () => cueLog.map((entry) => ({ ...entry }));
    return () => {
      delete hook.tablePoint;
      delete hook.tableNames;
      delete hook.carried;
      delete hook.cues;
    };
  }, [scene]);
}

export function Tables() {
  const tables = useStore((state) => state.room?.tables ?? null);
  const activeId = useActiveTableId();
  const canvas = useThree((state) => state.gl.domElement);
  const session = useXR((xr) => xr.session);
  useTestHook();
  // Which presses of a controller ran to their end, so that one cut short is never taken for a release (carry.ts).
  useEffect(() => {
    if (!session) return;
    const note = (event: Event): void => noteAction(event as unknown as { type: string; inputSource: object });
    const kinds = ["selectstart", "select", "squeezestart", "squeeze"];
    for (const kind of kinds) session.addEventListener(kind, note);
    return () => {
      for (const kind of kinds) session.removeEventListener(kind, note);
    };
  }, [session]);
  // A finger dragging a card must not be taken by the browser as a scroll or a pinch, which cancels the drag.
  useEffect(() => {
    const before = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    return () => {
      canvas.style.touchAction = before;
    };
  }, [canvas]);
  // Card faces are only drawn here, so their textures go when the tables do.
  useEffect(() => disposeCardTextures, []);
  if (!tables) return null;
  return (
    <>
      {tableSpots.map((spot) => {
        const summary = tables.find((table) => table.id === spot.id);
        return summary && <StatusBoard key={spot.id} spot={spot} summary={summary} />;
      })}
      {activeId && <ActiveTable key={activeId} tableId={activeId} />}
    </>
  );
}
