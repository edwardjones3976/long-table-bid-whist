import { useRef, useState } from "react";
import { MAX_NAME_LENGTH, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "../../../shared/protocol";
import { net, useStore } from "../net/store";
import { useLocal } from "../state/local";
import { useMyLook } from "../state/look";
import { ConnectionBadge } from "./Hud";
import { describe, LookEditor } from "./look/LookEditor";
import { Preview } from "./look/Preview";
import "./entry.css";

const NAME_KEY = "mansion.name";

function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.slice(0, MAX_NAME_LENGTH) ?? "";
  } catch {
    return "";
  }
}

/** Upper case, and only characters a room code can hold, so a pasted "abcd-2345" becomes "ABCD2345". */
export function cleanCode(text: string): string {
  return [...text.toUpperCase()].filter((ch) => ROOM_CODE_ALPHABET.includes(ch)).join("").slice(0, ROOM_CODE_LENGTH);
}

/** The first screen: say who you are, then host a new room or join one by its code. */
export function Entry() {
  const error = useStore((state) => state.lastError);
  const theme = useLocal((state) => state.theme);
  const still = useLocal((state) => state.comfort.reducedMotion);
  const look = useMyLook();
  const [name, setName] = useState(savedName);
  // An invite link carries ?room=CODE.
  const [invited] = useState(() => cleanCode(new URLSearchParams(location.search).get("room") ?? ""));
  const [code, setCode] = useState(invited);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const lookButton = useRef<HTMLButtonElement>(null);

  async function enter(event: { preventDefault(): void }, how: "create" | "join") {
    event.preventDefault();
    const who = name.trim();
    if (!who) return setHint("Type your name first.");
    if (how === "join" && !code) return setHint("Type the room code first.");
    setHint(null);
    try {
      localStorage.setItem(NAME_KEY, who);
    } catch {
      // Private browsing: the name is simply not remembered.
    }
    setBusy(true);
    await (how === "create" ? net.createRoom(who) : net.joinRoom(code, who));
    setBusy(false);
  }

  const host = (
    <section key="host" className="way" aria-labelledby="way-host">
      <h2 id="way-host">Host a room</h2>
      <p>Start a new room, then share its code or invite link from the Menu.</p>
      <button
        type="button"
        className={invited ? undefined : "primary"}
        data-testid="entry-create"
        disabled={busy}
        onClick={(event) => void enter(event, "create")}
      >
        Create a room
      </button>
    </section>
  );
  const join = (
    <section key="join" className="way" aria-labelledby="way-join">
      <h2 id="way-join">Join friends</h2>
      <label htmlFor="entry-code">Room code from a friend</label>
      <input
        id="entry-code"
        className="code"
        data-testid="entry-code"
        value={code}
        placeholder="ABCD2345"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setCode(cleanCode(event.target.value))}
      />
      <button
        type="button"
        className={invited ? "primary" : undefined}
        data-testid="entry-join"
        disabled={busy}
        onClick={(event) => void enter(event, "join")}
      >
        Join with a code
      </button>
    </section>
  );

  return (
    <>
      <main className={still ? "door still" : "door"} data-theme={theme}>
        <span className="burst" aria-hidden="true" />
        <span className="burst" aria-hidden="true" />
        <span className="burst" aria-hidden="true" />
        <div className="door-card">
          <header className="door-head">
            <ul className="fan" aria-label="The three games">
              <li>
                <span className="suit" aria-hidden="true">♣</span>Tonk
              </li>
              <li>
                <span className="suit" aria-hidden="true">♠</span>Spades
              </li>
              <li>
                <span className="suit red" aria-hidden="true">♦</span>Bid Whist
              </li>
            </ul>
            <h1>The Mansion</h1>
            <p>Cards with friends at six tables, in a browser or a VR headset.</p>
          </header>

          {invited && (
            <p className="invite" data-testid="entry-invite">
              You're invited to room <strong>{invited}</strong>. Type your name and join.
            </p>
          )}

          <form onSubmit={(event) => void enter(event, code ? "join" : "create")}>
            <label htmlFor="entry-name">Your name</label>
            <input
              id="entry-name"
              data-testid="entry-name"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="nickname"
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
            <div className="look-step">
              {/* Gone while the editor is open, so only one preview draws at a time. */}
              {!editing && <Preview look={look} label={`Your saved look, waving: ${describe(look)}`} zoom="full" light={theme} still={still} wave />}
              <button type="button" ref={lookButton} data-testid="entry-look" onClick={() => setEditing(true)}>
                Your look
              </button>
              <span>Optional: choose how others see you, or skip it to keep your saved look.</span>
            </div>
            <div className="ways">
              {/* Invited: joining comes first, in reading and keyboard order too. */}
              {invited ? [join, host] : [host, join]}
            </div>
            {/* Enter in a field submits the form: join when a code is typed, otherwise create. */}
            <button type="submit" hidden />
          </form>

          {(hint ?? error) && (
            <p className="error" role="alert" data-testid="entry-error">
              {hint ?? error}
            </p>
          )}

          <footer className="door-foot">
            <ConnectionBadge />
            <span>In a headset? Open this page in its browser, then choose Enter VR in the Menu.</span>
          </footer>
        </div>
      </main>
      {editing && (
        <LookEditor
          onClose={() => {
            setEditing(false);
            lookButton.current?.focus();
          }}
        />
      )}
    </>
  );
}
