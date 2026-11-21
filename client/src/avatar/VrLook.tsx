/**
 * "Your look" in VR. Render inside <XROrigin> (tableui/VrMenu.tsx does); it shows while a draft is open:
 *
 *   lookDraft.open(myLook.get())   the VR menu's "Your look", or the plaque beside the foyer mirror
 *
 * A panel at about arm's length, a little below eye level and off to the left, turned and tilted toward the player, that works with one hand
 * (either ray, a pinch, or a touch) and while seated. The desktop editor's tabs, one field at a time: the arrows
 * beside the field's name step through the tab's fields, Previous and Next walk the field's options (for a list,
 * such as accessories, the middle button puts the option on or takes it off). Then the six starting looks; Shuffle,
 * Shuffle tab, the preview's turn and zoom; and Before, Undo, Redo, Cancel and Save. Choices go through the desktop
 * editor's own rules (choose), and the draft, Undo and Redo live in avatar/draft.ts.
 *
 * The view never moves, and straight ahead stays clear of the panel. Close in front of the foyer mirror and facing it
 * (where the reflection stands about 1 to 2 m ahead) the reflection is the preview; elsewhere a small figure of the draft
 * stands 1.3 m in front at eye height, turned by Turn or the turning stick (which then leaves the view alone) and brought to a face view at eye height by Face (the figure comes
 * closer; the player does not), at the mirror too. Buttons are
 * 6.5 cm tall and their one-line words about 1.55 cm, at uiScale 1, and never under 4 cm at the smallest text size;
 * a larger text size grows the panel down and to the left from its top right corner. Its rows run from just below eye level to about 40
 * degrees below a level gaze; seated (a game seat or the host corner), the panel comes closer and as much smaller, so
 * it looks the same and its lowest rows stay in front of the table's edge.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { Group, Object3D } from "three";
import { CATALOG, cleanLook, FIELD_GROUPS, hexOf, SET_FIELDS, shuffleLook, STARTING_LOOKS, type Field, type FieldGroup, type Look } from "../../../shared/avatar";
import { noRaycast } from "../controls/Hands";
import { desk } from "../controls/input";
import { choose, fieldName, nameOf, TABS } from "../hud/look/LookEditor";
import type { Zoom } from "../hud/look/Preview";
import { mySeat, net, useStore } from "../net/store";
import { local, useLocal } from "../state/local";
import { Label, Pressable } from "../tableui/Tables";
import { useHeadAnchor } from "../tableui/VrMenu";
import { besideMirror } from "../world/Mirror";
import { lookDraft, shownLook, stepLines, stepOption, useLookDraft, type Draft } from "./draft";
import { buildFigure, HEIGHT_M, type Figure } from "./figure";
import { measure } from "./measure";
import { animate, blinkAt, newRig } from "./motion";
import { applyRig } from "./pose";

const H = 0.065;
const GAP = 0.01;
const GOLD = "#ffd166";
const PANEL = "#10131a";
/** How small the preview figure is, so all of it fits in view 1.3 m away. */
const PREVIEW_SCALE = 0.45;
/** One press of Turn, radians. */
const TURN = 0.5;
/** Seated, the panel comes this much closer and smaller. */
const SEATED = 0.73;
/** The backing's top right corner, about which the text and button size scales it: it grows down and to the left, never up or across the way ahead. */
const [RIGHT, TOP] = [0.34, 0.2715];

/** Where the preview figure stands (y of its feet and z, from the eyes) and its scale: straight ahead, its middle (or its face) at eye height. */
export function previewPlace(look: Look, zoom: Zoom): [y: number, z: number, scale: number] {
  const height = HEIGHT_M[look.height];
  return zoom === "face" ? [-(height - measure(look).head / 2), -0.8, 1] : [-(height * PREVIEW_SCALE) / 2, -1.3, PREVIEW_SCALE];
}

const isList = (field: Field): boolean => field in SET_FIELDS;

/** x of each of `widths` laid out in a centred row, GAP apart. */
function row(widths: readonly number[]): number[] {
  let x = -(widths.reduce((sum, w) => sum + w, 0) + GAP * (widths.length - 1)) / 2;
  return widths.map((w) => {
    const centre = x + w / 2;
    x += w + GAP;
    return centre;
  });
}

/** A thick gold frame behind a chosen thing: chosen is shown by a frame and a check, never by colour alone. */
const Frame = ({ size, position }: { size: [number, number]; position: [number, number, number] }) => (
  <mesh position={[position[0], position[1], -0.003]} scale={[size[0] + 0.012, size[1] + 0.012, 1]} raycast={noRaycast}>
    <planeGeometry />
    <meshBasicMaterial color={GOLD} />
  </mesh>
);

/** The draft as a small figure 1.3 m ahead, just above the panel, turned to face the player and then by `turn`; or its face 0.8 m ahead. */
function Preview({ look, zoom, turn }: { look: Look; zoom: Zoom; turn: RefObject<number> }) {
  const holder = useRef<Group>(null);
  const figure = useRef<Figure | null>(null);
  const m = useMemo(() => measure(look), [look]);
  const rig = useMemo(newRig, []);
  useEffect(() => {
    const built = buildFigure(look, "near");
    built.root.traverse((object: Object3D) => (object.raycast = noRaycast));
    holder.current?.add(built.root);
    figure.current = built;
    return () => {
      figure.current = null;
      built.dispose();
    };
  }, [look]);
  // It breathes and blinks; Reduce motion stills it.
  useFrame(({ clock }, delta) => {
    // The turning stick turns it too, as a gamepad's right stick turns the desktop preview (controls/input.ts spinOrTurn).
    turn.current += desk.padSpin * Math.min(delta, 0.1) * 2.5;
    if (holder.current) holder.current.rotation.y = Math.PI + turn.current;
    const built = figure.current;
    if (!built) return;
    const calm = local.getState().comfort.reducedMotion;
    animate({ t: clock.elapsedTime, m, seed: 0, gait: { phase: 0, speed: 0 }, tuck: 0, floating: false, seated: null, act: null, calm }, rig);
    applyRig(built, rig);
    built.face.setBlink(calm ? 0 : blinkAt(0, clock.elapsedTime));
  });
  const [y, z, scale] = previewPlace(look, zoom);
  return <group ref={holder} position={[0, y, z]} scale={scale} />;
}

function Panel({ draft }: { draft: Draft }) {
  const group = useHeadAnchor(true);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  // Seated as the camera is: a game seat or the host's corner.
  const seated = useLocal((state) => state.seated !== null);
  // At the host's corner the dealer's stand is straight ahead, so the panel sits further to the left, clear of it.
  const host = useStore((state) => mySeat(state) === null) && seated;
  const mirrored = useLocal((state) => (state.playerPose ? besideMirror(state.playerPose) : false));
  const [tab, setTab] = useState<FieldGroup>("body");
  const [at, setAt] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [news, setNews] = useState("Point at a button and press it. Your view stays still.");
  const [zoom, setZoom] = useState<Zoom>("full");
  const turn = useRef(0);
  const look = draft.draft;
  const fields: readonly Field[] = FIELD_GROUPS[tab];
  const field = fields[Math.min(at, fields.length - 1)];
  const options = CATALOG[field];
  const list = isList(field);
  const value = look[field];
  const current = list ? options[cursor % options.length] : options.find((option) => option.id === value)!;
  const worn = list && (value as readonly string[]).includes(current.id);
  const shown = shownLook(draft);
  const shownKey = JSON.stringify(shown);
  const preview = useMemo(() => shown, [shownKey]);

  function pick(id: string): void {
    const result = choose(look, field, id);
    if ("refused" in result) return setNews(result.refused);
    lookDraft.change(result.look);
    setNews(result.said);
  }
  function step(dir: 1 | -1): void {
    if (list) setCursor((cursor + dir + options.length) % options.length);
    else pick(stepOption(field, value as string, dir));
  }
  function moveField(dir: 1 | -1): void {
    setAt((at + dir + fields.length) % fields.length);
    setCursor(0);
  }
  function whole(next: Look, words: string): void {
    lookDraft.change(next);
    setNews(words);
  }

  const tabX = row(TABS.map(() => 0.095));
  const fieldX = row([0.08, 0.4, 0.08]);
  const optionX = row([0.13, 0.32, 0.13]);
  const startX = row(STARTING_LOOKS.map(() => 0.09));
  const toolX = row([0.1, 0.13, 0.1, 0.1, 0.08, 0.08]);
  const footX = row([0.12, 0.12, 0.12, 0.12, 0.12]);
  const hex = hexOf(field, current.id);
  const tabName = TABS.find(([id]) => id === tab)?.[1] ?? "";
  // A list option that cannot be worn now says why before it is pressed.
  const tried = list && !worn ? choose(look, field, current.id) : null;
  const why = tried && "refused" in tried ? tried.refused : null;
  // Beside the mirror the reflection is the preview: the figure shows only for Face, and Turn waits.
  const reflected = mirrored && zoom === "full";
  // Text and button size grows the panel from its top right corner, never into the preview; targets stay 4 cm tall at the smallest setting.
  const size = Math.max(uiScale, 0.04 / H / (seated ? SEATED : 1));

  return (
    <group ref={group} visible={false}>
      {!reflected && <Preview look={preview} zoom={zoom} turn={turn} />}
      {/* It turns in from the left, so straight ahead stays clear for the preview figure or the mirror's glass. Seated it comes
          closer, scaled down by as much, so it looks the same and its lowest rows stay in front of the table's edge. */}
      <group position={[host ? -0.62 : seated ? -0.45 * SEATED : -0.45, seated ? -0.18 : -0.25, seated ? -0.45 : -0.62]} rotation={[0, 0.6, 0]}>
      <group rotation={[-0.45, 0, 0]} scale={seated ? SEATED : 1}>
      <group position={[RIGHT, TOP, 0]} scale={size}>
      <group position={[-RIGHT, -TOP, 0]}>
        {/* A backing, so a ray between two buttons does not press whatever is behind the panel. */}
        <mesh position={[0, 0.004, -0.006]} scale={[0.68, 0.535, 1]} onClick={(event) => event.stopPropagation()}>
          <planeGeometry />
          <meshBasicMaterial color={PANEL} />
        </mesh>
        <Label lines={[news]} box={[0.62, 0.045]} options={{ background: PANEL, fontPx: 44, padding: 6 }} position={[0, 0.2325, 0]} inert />

        {TABS.map(([id, name], i) => (
          <group key={id}>
            {tab === id && <Frame size={[0.095, H]} position={[tabX[i], 0.165, 0]} />}
            <Pressable
              name={`vr-look-tab-${id}`}
              lines={[tab === id ? `✓ ${name}` : name]}
              size={[0.095, H]}
              position={[tabX[i], 0.165, 0]}
              onPress={() => {
                setTab(id);
                setAt(0);
                setCursor(0);
              }}
            />
          </group>
        ))}

        <Pressable name="vr-look-field-back" lines={["◀"]} size={[0.08, H]} position={[fieldX[0], 0.09, 0]} onPress={() => moveField(-1)} />
        <Label lines={[`${fieldName(field, look)} (${at + 1} of ${fields.length})`]} box={[0.4, 0.03]} options={{ background: PANEL, fontPx: 44, padding: 6 }} position={[fieldX[1], 0.09, 0]} inert />
        <Pressable name="vr-look-field-next" lines={["▶"]} size={[0.08, H]} position={[fieldX[2], 0.09, 0]} onPress={() => moveField(1)} />

        <Pressable name="vr-look-previous" lines={["◀ Previous"]} size={[0.13, H]} position={[optionX[0], 0.015, 0]} onPress={() => step(-1)} />
        {list ? (
          <>
            {worn && <Frame size={[0.32, H]} position={[optionX[1], 0.015, 0]} />}
            <Pressable
              name="vr-look-wear"
              lines={[current.label, worn ? "✓ On: press to take off" : (why ?? "Off: press to put on")]}
              size={[0.32, H]}
              position={[optionX[1], 0.015, 0]}
              onPress={() => pick(current.id)}
            />
          </>
        ) : (
          <>
            <Frame size={[0.32, H]} position={[optionX[1], 0.015, 0]} />
            <mesh position={[optionX[1], 0.015, -0.001]} scale={[0.32, H, 1]} raycast={noRaycast}>
              <planeGeometry />
              <meshBasicMaterial color={PANEL} />
            </mesh>
            {hex && (
              <mesh position={[optionX[1] - 0.13, 0.015, 0.001]} scale={[0.04, 0.04, 1]} raycast={noRaycast}>
                <planeGeometry />
                <meshBasicMaterial color={hex} />
              </mesh>
            )}
            <Label
              lines={[`✓ ${current.label}`]}
              box={[hex ? 0.2 : 0.29, 0.03]}
              options={{ background: PANEL, fontPx: 44, padding: 6 }}
              position={[optionX[1] + (hex ? 0.025 : 0), 0.015, 0.001]}
              inert
            />
          </>
        )}
        <Pressable name="vr-look-next" lines={["Next ▶"]} size={[0.13, H]} position={[optionX[2], 0.015, 0]} onPress={() => step(1)} />

        {STARTING_LOOKS.map((start, i) => (
          <Pressable
            key={i}
            name={`vr-look-start-${i + 1}`}
            lines={[`Look ${i + 1}`]}
            size={[0.09, H]}
            position={[startX[i], -0.06, 0]}
            onPress={() => whole(cleanLook(start), `Starting look ${i + 1}: ${nameOf("hair", start.hair)}.`)}
          />
        ))}

        <Pressable name="vr-look-shuffle" lines={["Shuffle"]} size={[0.1, H]} position={[toolX[0], -0.135, 0]} onPress={() => whole(shuffleLook(Math.random), "Shuffled: a whole new look.")} />
        <Pressable
          name="vr-look-shuffle-tab"
          lines={["Shuffle tab"]}
          size={[0.13, H]}
          position={[toolX[1], -0.135, 0]}
          onPress={() => whole(shuffleLook(Math.random, look, tab), `Shuffled the ${tabName} tab.`)}
        />
        {/* Turn and zoom move the preview figure, never the player. Beside the mirror the reflection is the full preview,
            so Turn waits there (and says why) while Face still brings a life-size face close. */}
        <Pressable name="vr-look-turn-left" lines={reflected ? ["↺ Turn", "(mirror)"] : ["↺ Turn"]} size={[0.1, H]} disabled={reflected} position={[toolX[2], -0.135, 0]} onPress={() => void (turn.current += TURN)} />
        <Pressable name="vr-look-turn-right" lines={reflected ? ["Turn ↻", "(mirror)"] : ["Turn ↻"]} size={[0.1, H]} disabled={reflected} position={[toolX[3], -0.135, 0]} onPress={() => void (turn.current -= TURN)} />
        {(["face", "full"] as const).map((to, i) => (
          <group key={to}>
            {zoom === to && <Frame size={[0.08, H]} position={[toolX[4 + i], -0.135, 0]} />}
            <Pressable
              name={`vr-look-zoom-${to}`}
              lines={[zoom === to ? `✓ ${to === "face" ? "Face" : "Full"}` : to === "face" ? "Face" : "Full"]}
              size={[0.08, H]}
              position={[toolX[4 + i], -0.135, 0]}
              onPress={() => setZoom(to)}
            />
          </group>
        ))}

        {draft.before && <Frame size={[0.12, H]} position={[footX[0], -0.21, 0]} />}
        {/* Held: the saved look while the button is held, the new one again on letting go. */}
        <Pressable
          name="vr-look-before"
          lines={[draft.before ? "✓ Before" : "Hold: Before"]}
          size={[0.12, H]}
          position={[footX[0], -0.21, 0]}
          onPress={() => undefined}
          onHold={(held) => {
            lookDraft.before(held);
            setNews(held ? "Before: your saved look. Let go for the new one." : "Your new look.");
          }}
        />
        <Pressable
          name="vr-look-undo"
          lines={stepLines("Undo", draft.past.length)}
          size={[0.12, H]}
          disabled={!draft.past.length}
          position={[footX[1], -0.21, 0]}
          onPress={() => {
            lookDraft.undo();
            setNews("Undone.");
          }}
        />
        <Pressable
          name="vr-look-redo"
          lines={stepLines("Redo", draft.future.length)}
          size={[0.12, H]}
          disabled={!draft.future.length}
          position={[footX[2], -0.21, 0]}
          onPress={() => {
            lookDraft.redo();
            setNews("Redone.");
          }}
        />
        <Pressable name="vr-look-cancel" lines={["Cancel"]} size={[0.12, H]} position={[footX[3], -0.21, 0]} onPress={lookDraft.close} />
        <Pressable
          name="vr-look-save"
          lines={["Save"]}
          size={[0.12, H]}
          position={[footX[4], -0.21, 0]}
          onPress={() => {
            void net.setLook(look);
            lookDraft.close();
          }}
        />
      </group>
      </group>
      </group>
      </group>
    </group>
  );
}

export function VrLook() {
  const draft = useLookDraft();
  return draft ? <Panel draft={draft} /> : null;
}
