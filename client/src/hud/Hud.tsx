import { useEffect, useRef, useState } from "react";
import { CONTROLS_HELP } from "../controls/Player";
import { mySeat, myTable, net, useStore, type Connection } from "../net/store";
import { local, useLocal, type Comfort, type Theme } from "../state/local";
import { useTableDescription } from "../state/table";
import { enterVR, vrBlocker } from "../state/xr";
import { TablePicker } from "../tableui/TablePanelDom";

// A different shape per state, so the state never depends on colour.
export const CONNECTION: Record<Connection, [shape: string, words: string]> = {
  connecting: ["◌", "Connecting"],
  online: ["●", "Online"],
  reconnecting: ["▲", "Reconnecting"],
  offline: ["■", "Offline: cannot reach the server"],
};

export function ConnectionBadge() {
  const connection = useStore((state) => state.connection);
  const [shape, words] = CONNECTION[connection];
  return (
    <span className="badge" data-testid="connection" data-state={connection} role="status">
      <span aria-hidden="true">{shape}</span> {words}
    </span>
  );
}

function Invite({ code }: { code: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?room=${code}`;
  async function copy() {
    setShown(true);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // No clipboard permission (or not a secure page): the link is shown to copy by hand.
      setCopied(false);
    }
  }
  return (
    <>
      <button data-testid="invite" onClick={() => void copy()}>
        Copy invite link
      </button>
      {shown && (
        <label>
          {copied ? "Copied. Invite link:" : "Invite link (select and copy):"}
          <input data-testid="invite-link" readOnly value={link} onFocus={(event) => event.target.select()} />
        </label>
      )}
    </>
  );
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /> {label}
    </label>
  );
}

function Settings() {
  const theme = useLocal((state) => state.theme);
  const comfort = useLocal((state) => state.comfort);
  const set = (partial: Partial<Comfort>) => local.setComfort(partial);
  return (
    <fieldset className="settings" data-testid="settings">
      <legend>Settings</legend>
      <label>
        Party theme{" "}
        <select data-testid="theme" value={theme} onChange={(event) => local.set({ theme: event.target.value as Theme })}>
          <option value="july4">Fourth of July</option>
          <option value="newyear">New Year's Eve</option>
        </select>
      </label>
      <label>
        Moving in VR{" "}
        <select data-testid="movement-mode" value={comfort.locomotion} onChange={(event) => set({ locomotion: event.target.value as Comfort["locomotion"] })}>
          <option value="smooth">Walk and teleport</option>
          <option value="teleport">Teleport only</option>
        </select>
      </label>
      <Check label="Jumping" value={comfort.jump} onChange={(jump) => set({ jump })} />
      <Check label={`Snap turn (${comfort.snapDegrees} degrees)`} value={comfort.snapTurn} onChange={(snapTurn) => set({ snapTurn })} />
      <Check label="Comfort vignette while moving" value={comfort.vignette} onChange={(vignette) => set({ vignette })} />
      <Check label="Vibration" value={comfort.haptics} onChange={(haptics) => set({ haptics })} />
      <Check label="Sound effects" value={comfort.sounds} onChange={(sounds) => set({ sounds })} />
      <label>
        Main hand{" "}
        <select value={comfort.dominantHand} onChange={(event) => set({ dominantHand: event.target.value as Comfort["dominantHand"] })}>
          <option value="right">Right</option>
          <option value="left">Left</option>
        </select>
      </label>
      <Check label="Reduce motion" value={comfort.reducedMotion} onChange={(reducedMotion) => set({ reducedMotion })} />
      <Check label="Text table panel" value={comfort.textPanel} onChange={(textPanel) => set({ textPanel })} />
      <label>
        Text and button size{" "}
        <input
          type="range"
          min={0.8}
          max={1.6}
          step={0.1}
          value={comfort.uiScale}
          onChange={(event) => set({ uiScale: Number(event.target.value) })}
        />{" "}
        {Math.round(comfort.uiScale * 100)}%
      </label>
      <Check label="Music" value={comfort.music} onChange={(music) => set({ music })} />
      <label>
        Music volume{" "}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={comfort.musicVolume}
          disabled={!comfort.music}
          onChange={(event) => set({ musicVolume: Number(event.target.value) })}
        />{" "}
        {Math.round(comfort.musicVolume * 100)}%
      </label>
    </fieldset>
  );
}

function ControlsHelp() {
  return (
    <table className="controls-help" data-testid="controls-help">
      <caption>Controls</caption>
      <thead>
        <tr>
          <th scope="col">Device</th>
          <th scope="col">To</th>
          <th scope="col">Do this</th>
        </tr>
      </thead>
      <tbody>
        {CONTROLS_HELP.map((row, i) => (
          <tr key={i}>
            <td>{row.device}</td>
            <td>{row.action}</td>
            <td>{row.input}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The 2D overlay while in a room: one slim line at the top, and everything else in the
 * Menu popover, so the 3D view stays clear. An immersive session cannot show DOM, so it
 * is not rendered then. `tables` puts the table list in the menu (App passes false while
 * the text panel, which has its own list, is showing).
 *
 * The menu stays mounted while closed (with the hidden attribute); the gamepad's Start button
 * presses "hud-menu" by its test id (controls/input.ts) to open and close it.
 */
export function Hud({ tables }: { tables: boolean }) {
  const code = useStore((state) => state.room?.code ?? "");
  const members = useStore((state) => state.room?.members);
  const error = useStore((state) => state.lastError);
  const tableId = useStore((state) => myTable(state)?.id ?? null);
  const table = useTableDescription(tableId);
  const xrActive = useLocal((state) => state.xrActive);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<"settings" | "controls" | null>(null);
  // Undefined until the check answers; null means VR can start.
  const [vrBlocked, setVrBlocked] = useState<string | null | undefined>(undefined);
  const [vrError, setVrError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void vrBlocker().then((reason) => live && setVrBlocked(reason));
    return () => {
      live = false;
    };
  }, []);

  // Opening moves focus into the dialog.
  useEffect(() => {
    if (menu) dialog.current?.focus();
  }, [menu]);

  if (xrActive) return null;
  const toggle = (panel: "settings" | "controls") => {
    // Pressed while the menu is closed (a click on the hidden button): open the menu on that section.
    setOpen(menu && open === panel ? null : panel);
    setMenu(true);
  };
  return (
    <header
      className="hud"
      data-testid="hud"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !menu) return;
        setMenu(false);
        // Nothing keeps focus, so the next Space is a jump (controls/input.ts), not a press that opens the menu again.
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <div className="hud-strip">
        <ConnectionBadge />
        <span className="badge">
          Room <strong data-testid="room-code">{code}</strong>
        </span>
        <p className="hud-status" data-testid="hud-table" aria-live="polite">
          {table ? `${table.title}: ${table.statusLines[0] ?? ""}` : "You are not at a table."}
        </p>
        <button
          data-testid="hud-menu"
          aria-haspopup="dialog"
          aria-expanded={menu}
          aria-controls="hud-menu"
          onClick={() => setMenu(!menu)}
        >
          Menu
        </button>
      </div>
      {(error ?? vrError) && (
        <p className="error" role="alert" data-testid="hud-error">
          {error ?? vrError}{" "}
          <button
            onClick={() => {
              net.clearError();
              setVrError(null);
            }}
          >
            Dismiss
          </button>
        </p>
      )}
      <div id="hud-menu" className="hud-menu" role="dialog" aria-label="Menu" tabIndex={-1} hidden={!menu} ref={dialog}>
        <div className="buttons">
          <Invite code={code} />
          <span className="action">
            <button data-testid="enter-vr" disabled={vrBlocked !== null} onClick={() => void enterVR().then(setVrError)}>
              Enter VR
            </button>
            {vrBlocked !== null && <small data-testid="enter-vr-reason"> {vrBlocked ?? "Checking for a headset"}</small>}
          </span>
          <button data-testid="settings-toggle" aria-expanded={open === "settings"} onClick={() => toggle("settings")}>
            Settings
          </button>
          <button data-testid="controls-toggle" aria-expanded={open === "controls"} onClick={() => toggle("controls")}>
            Controls
          </button>
          <button data-testid="leave-room" onClick={() => void net.leaveRoom()}>
            Leave room
          </button>
        </div>
        {open === "settings" && <Settings />}
        {open === "controls" && <ControlsHelp />}
        <p data-testid="members">
          In the room ({members?.length ?? 0}): {members?.map((member) => (member.connected ? member.name : `${member.name} (away)`)).join(", ")}
        </p>
        {tables && <TablePicker heading="Tables" className="menu-tables" />}
      </div>
    </header>
  );
}

// shortcut: "first time" lasts for this page load only, so a reload shows the hint once more; save it with the settings if that nags.
let hintDone = false;

/** A line or two at the top left, under the strip, while I am seated: gone after my first card leaves my hand, 20 s of holding cards, or its button. */
export function Hint() {
  const seated = useStore((state) => mySeat(state) !== null);
  const cards = useStore((state) => state.table?.view?.hand?.length ?? 0);
  const xrActive = useLocal((state) => state.xrActive);
  const still = useLocal((state) => state.comfort.reducedMotion);
  const [done, setDone] = useState(hintDone);
  const most = useRef(0);
  const finish = () => {
    hintDone = true;
    setDone(true);
  };
  const holding = seated && cards > 0;

  useEffect(() => {
    if (!seated) most.current = 0;
    else if (cards < most.current) finish();
    else most.current = cards;
  }, [seated, cards]);

  useEffect(() => {
    if (done || !holding) return;
    const timer = setTimeout(finish, 20_000);
    return () => clearTimeout(timer);
  }, [done, holding]);

  if (done || !seated || xrActive) return null;
  return (
    <p className={still ? "hint" : "hint hint-in"} data-testid="hint" aria-live="polite">
      Grab a card and drop it on the table. Menu has the controls.{" "}
      <button aria-label="Dismiss hint" onClick={finish}>
        Got it
      </button>
    </p>
  );
}
