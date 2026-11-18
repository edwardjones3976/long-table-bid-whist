import { useState } from "react";
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from "../../../shared/protocol";
import { net, useStore } from "../net/store";
import { ConnectionBadge } from "./Hud";

/** The first screen: say who you are, then open a new room or join one by its code. */
export function Entry() {
  const error = useStore((state) => state.lastError);
  const [name, setName] = useState("");
  // An invite link carries ?room=CODE.
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get("room")?.toUpperCase() ?? "");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function enter(event: { preventDefault(): void }, how: "create" | "join") {
    event.preventDefault();
    const who = name.trim();
    if (!who) return setHint("Type your name first.");
    if (how === "join" && !code.trim()) return setHint("Type the room code first.");
    setHint(null);
    setBusy(true);
    await (how === "create" ? net.createRoom(who) : net.joinRoom(code.trim().toUpperCase(), who));
    setBusy(false);
  }

  return (
    <main className="entry">
      <h1>The Mansion</h1>
      <p>Tonk, Spades and Bid Whist with friends, in a browser or a VR headset.</p>
      <ConnectionBadge />
      <form onSubmit={(event) => void enter(event, code.trim() ? "join" : "create")}>
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
        <button type="button" data-testid="entry-create" disabled={busy} onClick={(event) => void enter(event, "create")}>
          Create a room
        </button>
        <label htmlFor="entry-code">Room code from a friend</label>
        <input
          id="entry-code"
          data-testid="entry-code"
          value={code}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setCode(event.target.value)}
        />
        <button type="button" data-testid="entry-join" disabled={busy} onClick={(event) => void enter(event, "join")}>
          Join with a code
        </button>
        {/* Enter in a field submits the form: join when a code is typed, otherwise create. */}
        <button type="submit" hidden />
      </form>
      {(hint ?? error) && (
        <p className="error" role="alert" data-testid="entry-error">
          {hint ?? error}
        </p>
      )}
    </main>
  );
}
