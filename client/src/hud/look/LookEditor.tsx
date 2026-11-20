/**
 * "Your look": how others see me, edited on a desktop or a phone (in VR, avatar/VrLook.tsx).
 *
 *   {editing && <LookEditor onClose={() => { setEditing(false); button.focus(); }} />}
 *
 * Opened from the entry screen and from the Menu. It edits a draft: six starting looks and Shuffle, then
 * tabs of labelled options, a live preview that shows an option while it is pointed at (its name in the
 * heading), Before (held, or switched by Enter) for the saved look, Undo and Redo. What each choice did is
 * said under the tabs. At a table, my table's status stays in sight. Save keeps the draft (state/look.ts)
 * and, in a room, sends it with net.setLook; Cancel or Escape throws it away. Either way onClose runs, and
 * the opener puts focus back.
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  CATALOG,
  cleanLook,
  FIELD_GROUPS,
  hexOf,
  MAX_ACCESSORIES,
  SET_FIELDS,
  shuffleLook,
  STARTING_LOOKS,
  type Field,
  type FieldGroup,
  type Look,
} from "../../../../shared/avatar";
import { hiddenUnder } from "../../avatar/accessories";
import { mySeat, myTable, net, useStore } from "../../net/store";
import { useLocal, type Theme } from "../../state/local";
import { myLook, useMyLook } from "../../state/look";
import { useTableDescription } from "../../state/table";
import { useTurnClock } from "../../tableui/clock";
import { Preview, type Zoom } from "./Preview";
import "./look.css";

export const TABS: readonly (readonly [FieldGroup, string])[] = [
  ["body", "Body"],
  ["face", "Face"],
  ["hair", "Hair"],
  ["outfit", "Outfit"],
  ["shoes", "Shoes"],
  ["extras", "Extras"],
];

const FIELD_NAMES: Record<Field, string> = {
  build: "Build",
  height: "Height",
  skin: "Skin tone",
  eyes: "Eye shape",
  eyeColor: "Eye colour",
  brows: "Brow shape",
  browColor: "Brow and beard colour",
  nose: "Nose",
  mouth: "Mouth and lips",
  ears: "Ears",
  marks: "Marks",
  facialHair: "Facial hair",
  liner: "Eye liner",
  lipColor: "Lip colour",
  cheekColor: "Cheek colour",
  hair: "Hair style",
  hairColor: "Hair colour",
  headwear: "Head covering",
  headwearColor: "Head covering and hat colour",
  top: "Top",
  topColor: "Top colour",
  topTrim: "Top second colour",
  bottom: "Bottom",
  bottomColor: "Bottom colour",
  bottomTrim: "Bottom second colour",
  onePiece: "Outfit style",
  shoes: "Shoes",
  shoeColor: "Shoe colour",
  accessories: "Accessories",
  assistive: "Hearing devices",
  plateColor: "Name plate colour",
  plateSymbol: "Name plate symbol",
};

/** A one-piece wears the top's two colours, so those groups say so while one is on. */
const ONE_PIECE_NAMES: Partial<Record<Field, string>> = { topColor: "Outfit colour", topTrim: "Outfit second colour" };
export const fieldName = (field: Field, look: Look): string => (look.onePiece !== "none" && ONE_PIECE_NAMES[field]) || FIELD_NAMES[field];

export const nameOf = (field: Field, id: string): string => CATALOG[field].find((option) => option.id === id)?.label ?? id;
const isList = (field: Field): field is keyof typeof SET_FIELDS => field in SET_FIELDS;
const outfitOf = (look: Look): string =>
  look.onePiece === "none" ? `${nameOf("top", look.top)}, ${nameOf("bottom", look.bottom)}` : nameOf("onePiece", look.onePiece);
const same = (a: Look, b: Look): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The look in words, for the preview's label. */
export function describe(look: Look): string {
  const covering = look.headwear === "none" ? "" : `; ${nameOf("headwear", look.headwear)}`;
  return [
    `${nameOf("build", look.build)} build`,
    `${nameOf("height", look.height)} height`,
    `skin ${nameOf("skin", look.skin)}`,
    `${nameOf("hair", look.hair)}, ${nameOf("hairColor", look.hairColor)}${covering}`,
    outfitOf(look),
    nameOf("shoes", look.shoes),
  ].join("; ");
}

/** Whether two accessories cannot be worn together (two pairs of glasses, say), by cleanLook's own rules. */
function clash(a: string, b: string): boolean {
  return a !== b && cleanLook({ ...STARTING_LOOKS[0], headwear: "none", accessories: [a, b] }).accessories.length < 2;
}

type Choice = { look: Look; said: string } | { refused: string };

/** Says what else came off to make room: a hat under a new head covering, or the other pair of glasses. */
function said(before: Look, look: Look, id: string, words: string): Choice {
  const off = before.accessories.filter((worn) => worn !== id && !(look.accessories as readonly string[]).includes(worn));
  return { look, said: off.length ? `${words} ${off.map((worn) => nameOf("accessories", worn)).join(" and ")} taken off.` : words };
}

/** The draft after choosing option `id` of `field` (a list field toggles it), or why it cannot be worn. */
export function choose(look: Look, field: Field, id: string): Choice {
  const name = nameOf(field, id);
  if (!isList(field)) {
    // Choosing a top or a bottom means wearing one, so a one-piece comes off.
    const outfit = field === "top" || field === "bottom" ? { onePiece: "none" } : {};
    return said(look, cleanLook({ ...look, ...outfit, [field]: id }), id, `${fieldName(field, look)}: ${name}.`);
  }
  const worn: readonly string[] = look[field];
  if (worn.includes(id)) return said(look, cleanLook({ ...look, [field]: worn.filter((other) => other !== id) }), id, `${name} off.`);
  if (field !== "accessories") return said(look, cleanLook({ ...look, [field]: [...worn, id] }), id, `${name} on.`);
  // A second pair of glasses (or earrings, or a second hat) takes the place of the first.
  const kept = worn.filter((other) => !clash(other, id));
  if (kept.length >= MAX_ACCESSORIES) return { refused: `${MAX_ACCESSORIES} accessories is the most at once. Take one off to add ${name}.` };
  const next = cleanLook({ ...look, accessories: [...kept, id] });
  if (!(next.accessories as readonly string[]).includes(id)) {
    return { refused: `${name} does not fit over a ${nameOf("headwear", look.headwear).toLowerCase()}.` };
  }
  return said(look, next, id, `${name} on.${hiddenUnder(next, id) ? " Hidden under the hijab." : ""}`);
}

/** Arrow keys, Home and End move focus among `items`, wrapping round; returns the index now focused, or -1. */
function roam(event: KeyboardEvent, items: HTMLElement[]): number {
  const at = items.indexOf(document.activeElement as HTMLElement);
  const { key } = event;
  const to =
    key === "Home" ? 0 : key === "End" ? items.length - 1 : /^Arrow(Right|Down)$/.test(key) ? at + 1 : /^Arrow(Left|Up)$/.test(key) ? at - 1 : null;
  if (to === null || at < 0) return -1;
  event.preventDefault();
  const index = (to + items.length) % items.length;
  items[index].focus();
  return index;
}

interface Pointing {
  onPick(field: Field, id: string): void;
  onPoint(field: Field, id: string): void;
  onUnpoint(): void;
}

/**
 * One field's options: a radio group, or checkboxes for a list field. Arrow keys move through a radio
 * group (focus shows the option on the preview) and Enter or Space chooses, so trying is not choosing.
 */
function Options({ field, look, peek, onPick, onPoint, onUnpoint }: { field: Field; look: Look; peek: Look | null } & Pointing) {
  const value = look[field];
  const chosen: readonly string[] = Array.isArray(value) ? value : [value];
  const list = isList(field);
  const full = field === "accessories" && chosen.length >= MAX_ACCESSORIES;
  const nameId = `look-${field}`;
  return (
    <section className="look-group">
      <h3>
        <span id={nameId}>{fieldName(field, look)}</span>
        {/* The option pointed at or focused, so a swatch's name shows before it is chosen. */}
        {!list && <span className="look-now">: {nameOf(field, String((peek ?? look)[field]))}</span>}
      </h3>
      {field === "accessories" && (
        <p id="look-accessories-note" className="look-note">
          {full ? `${MAX_ACCESSORIES} of ${MAX_ACCESSORIES} on, the most at once. Take one off to add another.` : `Up to ${MAX_ACCESSORIES} at once.`}
        </p>
      )}
      <div
        role={list ? "group" : "radiogroup"}
        aria-labelledby={nameId}
        aria-describedby={field === "accessories" ? "look-accessories-note" : undefined}
        className="look-options"
        onKeyDown={list ? undefined : (event) => roam(event, [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')])}
      >
        {CATALOG[field].map(({ id, label, hex }) => {
          const on = chosen.includes(id);
          return (
            <button
              key={id}
              type="button"
              role={list ? "checkbox" : "radio"}
              aria-checked={on}
              aria-disabled={(list && !on && "refused" in choose(look, field, id)) || undefined}
              aria-label={hex ? label : undefined}
              title={hex ? label : undefined}
              tabIndex={list || on ? 0 : -1}
              className={hex ? "swatch" : undefined}
              style={hex ? ({ "--swatch": hex } as CSSProperties) : undefined}
              onClick={() => onPick(field, id)}
              onPointerEnter={() => onPoint(field, id)}
              onPointerLeave={onUnpoint}
              onFocus={() => onPoint(field, id)}
              onBlur={onUnpoint}
            >
              {on && (
                <span className="tick" aria-hidden="true">
                  ✓
                </span>
              )}
              {!hex && label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** My table's status line, as the top bar shows it, and my seconds while my turn clock runs: the editor covers both. */
function TableLine() {
  const table = useTableDescription(useStore((state) => myTable(state)?.id ?? null));
  const seat = useStore((state) => mySeat(state));
  const clock = useTurnClock();
  if (!table) return null;
  return (
    <p className="look-table" data-testid="look-table">
      <span aria-live="polite">{`${table.title}: ${table.statusLines[0] ?? ""}`}</span>
      {clock && clock.seat === seat && ` Your time: ${clock.seconds} s left.`}
    </p>
  );
}

export function LookEditor({ onClose }: { onClose: () => void }) {
  const saved = useMyLook();
  const theme = useLocal((state) => state.theme);
  const still = useLocal((state) => state.comfort.reducedMotion);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const [history, setHistory] = useState(() => ({ past: [] as Look[], draft: myLook.get(), future: [] as Look[] }));
  const [tab, setTab] = useState<FieldGroup>("body");
  const [peek, setPeek] = useState<Look | null>(null);
  const [before, setBefore] = useState(false);
  const [zoom, setZoom] = useState<Zoom>("full");
  const [light, setLight] = useState<Theme>(theme);
  // Counted, so the same words said twice (Undo, Undo) are a new line the screen reader reads again.
  const [news, setNews] = useState({ words: "", n: 0 });
  const say = (words: string) => setNews(({ n }) => ({ words, n: n + 1 }));
  const box = useRef<HTMLDivElement>(null);
  const { draft } = history;

  useEffect(() => box.current?.focus(), []);

  function change(look: Look, words: string) {
    say(words);
    setPeek(null);
    if (!same(look, draft)) setHistory(({ past, draft: now }) => ({ past: [...past, now].slice(-50), draft: look, future: [] }));
  }

  function step(back: boolean) {
    if (!(back ? history.past : history.future).length) return;
    setHistory(({ past, draft: now, future }) => {
      if (back) return past.length ? { past: past.slice(0, -1), draft: past[past.length - 1], future: [now, ...future] } : { past, draft: now, future };
      return future.length ? { past: [...past, now], draft: future[0], future: future.slice(1) } : { past, draft: now, future };
    });
    say(back ? "Undone." : "Redone.");
  }

  function save() {
    if (net.getState().room) void net.setLook(draft);
    else myLook.set(draft);
    onClose();
  }

  const pointing: Pointing = {
    onPick(field, id) {
      const result = choose(draft, field, id);
      if ("refused" in result) say(result.refused);
      else change(result.look, result.said);
    },
    onPoint(field, id) {
      const result = choose(draft, field, id);
      setPeek("look" in result ? result.look : null);
    },
    onUnpoint: () => setPeek(null),
  };

  function keys(event: KeyboardEvent) {
    // The world's own keys (walking, jumping, Esc for the Menu) stay still while the editor is open.
    event.stopPropagation();
    if (event.key === "Escape") return onClose();
    if (event.key !== "Tab" || !box.current) return;
    // Focus stays inside: Tab from the last stop goes to the first, Shift+Tab from the first to the last.
    const stops = [...box.current.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]')];
    const edge = event.shiftKey ? [stops[0], box.current] : [stops[stops.length - 1]];
    if (!edge.includes(document.activeElement as HTMLElement)) return;
    event.preventDefault();
    (event.shiftKey ? stops[stops.length - 1] : stops[0])?.focus();
  }

  const shown = before ? saved : (peek ?? draft);
  const tabName = TABS.find(([id]) => id === tab)?.[1] ?? "";
  const hold = (held: boolean) => () => setBefore(held);
  return (
    <div className="look-editor" data-theme={theme} style={{ fontSize: `${uiScale}rem` }} onKeyDown={keys}>
      <div className="look-box" role="dialog" aria-modal="true" aria-labelledby="look-title" tabIndex={-1} ref={box}>
        <header className="look-head">
          <h2 id="look-title">Your look</h2>
          <p>How others see you in the house. Point at a choice to try it on.</p>
          <TableLine />
        </header>

        <section className="look-starts" aria-label="Starting looks">
          {STARTING_LOOKS.map((look, i) => (
            <button
              key={i}
              type="button"
              className="look-start"
              onClick={() => change(cleanLook(look), `Starting look ${i + 1}: ${nameOf("hair", look.hair)}.`)}
              onPointerEnter={() => setPeek(look)}
              onPointerLeave={() => setPeek(null)}
              onFocus={() => setPeek(look)}
              onBlur={() => setPeek(null)}
            >
              <span className="look-dots" aria-hidden="true">
                {[hexOf("skin", look.skin), hexOf("hairColor", look.hairColor), hexOf("topColor", look.topColor)].map((hex, j) => (
                  <span key={j} style={{ background: hex }} />
                ))}
              </span>
              <span className="sr-only">Starting look {i + 1}: </span>
              {nameOf("hair", look.hair)}
              <small>{outfitOf(look)}</small>
            </button>
          ))}
          <button type="button" onClick={() => change(shuffleLook(Math.random), "Shuffled: a whole new look.")}>
            Shuffle
          </button>
        </section>

        <div className="look-main">
          <div className="look-stage">
            <Preview look={shown} label={`${before ? "Your saved look" : "Your new look"}: ${describe(shown)}`} zoom={zoom} light={light} still={still} />
            <p className="look-caption" aria-hidden="true">
              {before ? "Before: your saved look" : "Your new look"}
            </p>
            <div className="look-tools">
              <span role="group" aria-label="Zoom">
                {(["face", "full"] as const).map((to) => (
                  <button key={to} type="button" aria-pressed={zoom === to} onClick={() => setZoom(to)}>
                    {to === "face" ? "Face" : "Full"}
                  </button>
                ))}
              </span>
              <span role="group" aria-label="Light">
                {(["golden", "july4", "newyear"] as const).map((to) => (
                  <button key={to} type="button" aria-pressed={light === to} onClick={() => setLight(to)}>
                    {to === "golden" ? "Golden" : to === "july4" ? "Day" : "Night"}
                  </button>
                ))}
              </span>
              <button
                type="button"
                aria-describedby="look-before-hint"
                aria-pressed={before}
                // Enter, a screen reader, voice control or a switch sends a click with no pointer (detail 0): it switches.
                onClick={(event) => event.detail === 0 && setBefore((on) => !on)}
                onPointerDown={hold(true)}
                onPointerUp={hold(false)}
                onPointerLeave={hold(false)}
                onPointerCancel={hold(false)}
                onBlur={hold(false)}
                onKeyDown={(event) => {
                  if (event.key !== " ") return;
                  event.preventDefault();
                  setBefore(true);
                }}
                onKeyUp={(event) => {
                  if (event.key !== " ") return;
                  // Some browsers click on the release of Space even when its press was held back: a hold must not switch.
                  event.preventDefault();
                  setBefore(false);
                }}
                // A long press on a phone would otherwise open the browser's menu.
                onContextMenu={(event) => event.preventDefault()}
              >
                Before
              </button>
              <span id="look-before-hint" hidden>
                Hold, or press Enter, to see your saved look.
              </span>
              {/* aria-disabled, not disabled: a disabled button drops the keyboard's focus out of the editor. */}
              <button type="button" aria-disabled={!history.past.length || undefined} onClick={() => step(true)}>
                Undo
              </button>
              <button type="button" aria-disabled={!history.future.length || undefined} onClick={() => step(false)}>
                Redo
              </button>
            </div>
          </div>

          <div className="look-pick">
            <div
              role="tablist"
              aria-label="Parts of your look"
              className="look-tabs"
              onKeyDown={(event) => {
                const index = roam(event, [...event.currentTarget.children] as HTMLElement[]);
                if (index >= 0) setTab(TABS[index][0]);
              }}
            >
              {TABS.map(([id, name]) => (
                <button
                  key={id}
                  id={`look-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls="look-panel"
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => setTab(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="look-news" aria-live="polite" data-testid="look-news">
              <span key={news.n}>{news.words}</span>
            </p>
            {/* Keyed by tab, so a new tab starts at its top. */}
            <div key={tab} id="look-panel" role="tabpanel" aria-labelledby={`look-tab-${tab}`} className="look-panel">
              <button type="button" onClick={() => change(shuffleLook(Math.random, draft, tab), `Shuffled the ${tabName} tab.`)}>
                Shuffle this tab
              </button>
              {FIELD_GROUPS[tab].map((field) => (
                <Options key={field} field={field} look={draft} peek={peek} {...pointing} />
              ))}
            </div>
          </div>
        </div>

        <footer className="look-foot">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={save}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
