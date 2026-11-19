/**
 * "Your look" in VR. Render inside <XROrigin> (tableui/VrMenu.tsx does); it shows while a draft is open:
 *
 *   lookDraft.open(myLook.get())   the VR menu's "Your look", or the plaque beside the foyer mirror
 *
 * A panel at about arm's length, a little below eye level and tilted toward the player, that works with one hand
 * (either ray, a pinch, or a touch) and while seated. The desktop editor's tabs, one field at a time: the arrows
 * beside the field's name step through the tab's fields, Previous and Next walk the field's options (for a list,
 * such as accessories, the middle button puts the option on or takes it off). Then the six starting looks and
 * Shuffle, and Before, Undo, Cancel and Save. Choices go through the desktop editor's own rules (choose), and the
 * draft and Undo live in avatar/draft.ts.
 *
 * The view never moves. Beside the foyer mirror the reflection is the preview; elsewhere a small figure of the
 * draft stands 1.3 m in front at eye height. Buttons are 7 cm tall and their words about 1.6 cm, at uiScale 1. Seated,
 * the panel comes closer, so its lowest rows stay in front of the table's edge.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Object3D } from "three";
import { CATALOG, cleanLook, FIELD_GROUPS, hexOf, SET_FIELDS, shuffleLook, STARTING_LOOKS, type Field, type FieldGroup, type Look } from "../../../shared/avatar";
import { noRaycast } from "../controls/Hands";
import { choose, fieldName, nameOf, TABS } from "../hud/look/LookEditor";
import { mySeat, net, useStore } from "../net/store";
import { useLocal } from "../state/local";
import { Label, Pressable } from "../tableui/Tables";
import { useHeadAnchor } from "../tableui/VrMenu";
import { besideMirror } from "../world/Mirror";
import { lookDraft, shownLook, stepOption, useLookDraft, type Draft } from "./draft";
import { buildFigure, HEIGHT_M } from "./figure";

const H = 0.07;
const GAP = 0.01;
const GOLD = "#ffd166";
const PANEL = "#10131a";
/** How small the preview figure is, so all of it fits in view 1.3 m away. */
const PREVIEW_SCALE = 0.45;

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
  <mesh position={[position[0], position[1], -0.003]} scale={[size[0] + 0.02, size[1] + 0.02, 1]} raycast={noRaycast}>
    <planeGeometry />
    <meshBasicMaterial color={GOLD} />
  </mesh>
);

/** The draft as a small figure 1.3 m ahead, turned to face the player. */
function Preview({ look }: { look: Look }) {
  const holder = useRef<Group>(null);
  useEffect(() => {
    const figure = buildFigure(look, "near");
    figure.root.traverse((object: Object3D) => (object.raycast = noRaycast));
    holder.current?.add(figure.root);
    return () => figure.dispose();
  }, [look]);
  // Its middle at eye height.
  return <group ref={holder} position={[0, (-HEIGHT_M[look.height] * PREVIEW_SCALE) / 2, -1.3]} rotation={[0, Math.PI, 0]} scale={PREVIEW_SCALE} />;
}

function Panel({ draft }: { draft: Draft }) {
  const group = useHeadAnchor(true);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const seated = useStore((state) => mySeat(state) !== null);
  const mirrored = useLocal((state) => (state.playerPose ? besideMirror(state.playerPose) : false));
  const [tab, setTab] = useState<FieldGroup>("body");
  const [at, setAt] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [news, setNews] = useState("Point at a button and press it. Your view stays still.");
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
  const startX = row([...STARTING_LOOKS.map(() => 0.08), 0.1]);
  const footX = row([0.14, 0.14, 0.14, 0.14]);
  const hex = hexOf(field, current.id);

  return (
    <group ref={group} visible={false}>
      {!mirrored && <Preview look={preview} />}
      <group position={[0, -0.38, seated ? -0.32 : -0.5]} rotation={[-0.55, 0, 0]} scale={uiScale}>
        {/* A backing, so a ray between two buttons does not press whatever is behind the panel. */}
        <mesh position={[0, 0, -0.006]} scale={[0.68, 0.5, 1]} onClick={(event) => event.stopPropagation()}>
          <planeGeometry />
          <meshBasicMaterial color={PANEL} />
        </mesh>
        <Label lines={[news]} box={[0.62, 0.045]} options={{ background: PANEL, fontPx: 44, padding: 6 }} position={[0, 0.205, 0]} inert />

        {TABS.map(([id, name], i) => (
          <group key={id}>
            {tab === id && <Frame size={[0.095, H]} position={[tabX[i], 0.14, 0]} />}
            <Pressable
              name={`vr-look-tab-${id}`}
              lines={[tab === id ? `✓ ${name}` : name]}
              size={[0.095, H]}
              position={[tabX[i], 0.14, 0]}
              onPress={() => {
                setTab(id);
                setAt(0);
                setCursor(0);
              }}
            />
          </group>
        ))}

        <Pressable name="vr-look-field-back" lines={["◀"]} size={[0.08, H]} position={[fieldX[0], 0.06, 0]} onPress={() => moveField(-1)} />
        <Label lines={[`${fieldName(field, look)} (${at + 1} of ${fields.length})`]} box={[0.4, 0.03]} options={{ background: PANEL, fontPx: 44, padding: 6 }} position={[fieldX[1], 0.06, 0]} inert />
        <Pressable name="vr-look-field-next" lines={["▶"]} size={[0.08, H]} position={[fieldX[2], 0.06, 0]} onPress={() => moveField(1)} />

        <Pressable name="vr-look-previous" lines={["◀ Previous"]} size={[0.13, H]} position={[optionX[0], -0.02, 0]} onPress={() => step(-1)} />
        {list ? (
          <>
            {worn && <Frame size={[0.32, H]} position={[optionX[1], -0.02, 0]} />}
            <Pressable
              name="vr-look-wear"
              lines={[current.label, worn ? "✓ On: press to take off" : "Off: press to put on"]}
              size={[0.32, H]}
              position={[optionX[1], -0.02, 0]}
              onPress={() => pick(current.id)}
            />
          </>
        ) : (
          <>
            <Frame size={[0.32, H]} position={[optionX[1], -0.02, 0]} />
            <mesh position={[optionX[1], -0.02, -0.001]} scale={[0.32, H, 1]} raycast={noRaycast}>
              <planeGeometry />
              <meshBasicMaterial color={PANEL} />
            </mesh>
            {hex && (
              <mesh position={[optionX[1] - 0.13, -0.02, 0.001]} scale={[0.04, 0.04, 1]} raycast={noRaycast}>
                <planeGeometry />
                <meshBasicMaterial color={hex} />
              </mesh>
            )}
            <Label
              lines={[`✓ ${current.label}`]}
              box={[hex ? 0.2 : 0.29, 0.03]}
              options={{ background: PANEL, fontPx: 44, padding: 6 }}
              position={[optionX[1] + (hex ? 0.025 : 0), -0.02, 0.001]}
              inert
            />
          </>
        )}
        <Pressable name="vr-look-next" lines={["Next ▶"]} size={[0.13, H]} position={[optionX[2], -0.02, 0]} onPress={() => step(1)} />

        {STARTING_LOOKS.map((start, i) => (
          <Pressable
            key={i}
            name={`vr-look-start-${i + 1}`}
            lines={[`Look ${i + 1}`]}
            size={[0.08, H]}
            position={[startX[i], -0.1, 0]}
            onPress={() => whole(cleanLook(start), `Starting look ${i + 1}: ${nameOf("hair", start.hair)}.`)}
          />
        ))}
        <Pressable
          name="vr-look-shuffle"
          lines={["Shuffle"]}
          size={[0.1, H]}
          position={[startX[STARTING_LOOKS.length], -0.1, 0]}
          onPress={() => whole(shuffleLook(Math.random), "Shuffled: a whole new look.")}
        />

        {draft.before && <Frame size={[0.14, H]} position={[footX[0], -0.18, 0]} />}
        <Pressable
          name="vr-look-before"
          lines={[draft.before ? "✓ Before" : "Before"]}
          size={[0.14, H]}
          position={[footX[0], -0.18, 0]}
          onPress={() => {
            lookDraft.before(!draft.before);
            setNews(draft.before ? "Your new look." : "Before: your saved look. Press again for the new one.");
          }}
        />
        <Pressable
          name="vr-look-undo"
          lines={["Undo"]}
          size={[0.14, H]}
          disabled={!draft.past.length}
          position={[footX[1], -0.18, 0]}
          onPress={() => {
            lookDraft.undo();
            setNews("Undone.");
          }}
        />
        <Pressable name="vr-look-cancel" lines={["Cancel"]} size={[0.14, H]} position={[footX[2], -0.18, 0]} onPress={lookDraft.close} />
        <Pressable
          name="vr-look-save"
          lines={["Save"]}
          size={[0.14, H]}
          position={[footX[3], -0.18, 0]}
          onPress={() => {
            void net.setLook(look);
            lookDraft.close();
          }}
        />
      </group>
    </group>
  );
}

export function VrLook() {
  const draft = useLookDraft();
  return draft ? <Panel draft={draft} /> : null;
}
