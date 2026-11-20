import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { LOOK_VERSION, STARTING_LOOKS } from "../../shared/avatar";
import { myLook } from "../../client/src/state/look";
import type { Reply, RoomSnapshot, TableSnapshot, TableSummary } from "../../shared/protocol";
import { amManager, createNet, mySeat, myTable, type ClientSocket } from "../../client/src/net/store";

type Answer = (event: string, payload: any) => Reply<Record<string, unknown>> | "timeout";

/** Just enough of a Socket.IO client: records what is sent and lets the test play the server. */
function fakeSocket(answer: Answer) {
  const handlers = new Map<string, (payload?: any) => void>();
  const sent: { event: string; payload: any }[] = [];
  const socket = {
    connected: false,
    on(event: string, handler: (payload?: any) => void) {
      handlers.set(event, handler);
      return socket;
    },
    timeout: () => ({
      async emitWithAck(event: string, payload: any) {
        sent.push({ event, payload });
        const reply = answer(event, payload);
        if (reply === "timeout") throw new Error("operation has timed out");
        return reply;
      },
    }),
    connect: () => sent.push({ event: "(connect)", payload: null }),
    volatile: { emit: (event: string, payload: any) => sent.push({ event, payload }) },
  };
  return {
    socket: socket as unknown as ClientSocket,
    sent,
    connect() {
      socket.connected = true;
      handlers.get("connect")!();
    },
    serve: (event: string, payload?: unknown) => handlers.get(event)!(payload),
  };
}

const joined = { ok: true, code: "ABCDEFGH", memberId: "me", token: "secret-token" } as const;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const table: TableSummary = {
  id: "spades-1",
  game: "spades",
  status: "lobby",
  seats: [
    { occupant: "open", memberId: null, name: null, ready: false, connected: false },
    { occupant: "open", memberId: null, name: null, ready: false, connected: false },
    { occupant: "human", memberId: "me", name: "Ann", ready: false, connected: true },
    { occupant: "open", memberId: null, name: null, ready: false, connected: false },
  ],
  host: null,
  managerId: "me",
  options: {},
};
const room = (tableId: RoomSnapshot["members"][number]["tableId"]): RoomSnapshot => ({
  code: "ABCDEFGH",
  you: "me",
  members: [{ id: "me", name: "Ann", connected: true, tableId, look: STARTING_LOOKS[0] }],
  tables: [table],
});
const snapshot: TableSnapshot = { tableId: "spades-1", game: "spades", revision: 7, you: 2, view: null };

beforeEach(() => sessionStorage.clear());

describe("net store", () => {
  it("joins, keeps the token for this tab only, and follows snapshots", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    expect(net.getState().connection).toBe("connecting");
    net.open();
    fake.connect();
    expect(net.getState().connection).toBe("online");

    expect(await net.createRoom("Ann")).toEqual(joined);
    expect(fake.sent[0]).toEqual({ event: "room:create", payload: { name: "Ann", look: expect.any(Object) } });
    expect(sessionStorage.getItem("mansion.token")).toBe("secret-token");
    expect(JSON.stringify(net.getState())).not.toContain("secret-token");

    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    const state = net.getState();
    expect(state.me).toBe("me");
    expect(myTable(state)?.id).toBe("spades-1");
    expect(mySeat(state)).toBe(2);
    expect(amManager(state)).toBe(true);

    fake.serve("table:left", { tableId: "spades-1" });
    expect(net.getState().table).toBeNull();
    fake.serve("table", snapshot);
    // A room snapshot that says I am at no table also clears a table snapshot left behind.
    fake.serve("room", room(null));
    expect(net.getState().table).toBeNull();
    expect(myTable(net.getState())).toBeNull();
  });

  it("acts on the revision on screen with a fresh id each time, and stays quiet about a stale one", async () => {
    let reply: Reply<Record<string, unknown>> = { ok: true, revision: 8 };
    const fake = fakeSocket((event) => (event === "table:action" ? reply : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();

    expect(await net.act({ type: "bid", tricks: 3 })).toMatchObject({ ok: false, error: "not-at-table" });
    expect(fake.sent).toEqual([]);

    fake.serve("table", snapshot);
    await net.act({ type: "bid", tricks: 3 });
    await net.act({ type: "bid", tricks: 3 });
    const [first, second] = fake.sent.map((entry) => entry.payload);
    expect(first).toMatchObject({ expectedRevision: 7, action: { type: "bid", tricks: 3 } });
    expect(first.actionId).not.toBe(second.actionId);
    expect(first.actionId.length).toBeLessThanOrEqual(64);
    expect(net.getState().lastError).toBeNull();

    reply = { ok: false, error: "stale-revision", message: "The table has changed" };
    expect((await net.act({ type: "bid", tricks: 3 })).ok).toBe(false);
    expect(net.getState().lastError).toBeNull();

    reply = { ok: false, error: "illegal", message: "You must follow suit" };
    await net.act({ type: "play", cardId: "x" });
    expect(net.getState().lastError).toBe("You must follow suit");
  });

  it("resumes with the saved token when the connection comes back", async () => {
    sessionStorage.setItem("mansion.token", "old-token");
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await settle();
    expect(fake.sent).toEqual([{ event: "room:resume", payload: { token: "old-token" } }]);
    expect(net.getState().me).toBe("me");

    fake.serve("room", room(null));
    fake.serve("disconnect");
    expect(net.getState().connection).toBe("reconnecting");
    expect(net.getState().room).not.toBeNull();
    fake.connect();
    await settle();
    expect(fake.sent).toHaveLength(2);
    expect(net.getState().connection).toBe("online");
  });

  it("returns to the entry screen with a message when the token is refused", async () => {
    sessionStorage.setItem("mansion.token", "old-token");
    const fake = fakeSocket(() => ({ ok: false, error: "bad-token", message: "Unknown token" }));
    const net = createNet(() => fake.socket);
    net.open();
    fake.serve("room", room(null));
    fake.connect();
    await settle();
    expect(net.getState().room).toBeNull();
    expect(net.getState().me).toBeNull();
    expect(net.getState().lastError).toContain("Join again");
    expect(sessionStorage.getItem("mansion.token")).toBeNull();
  });

  it("keeps the room when a resume merely goes unanswered", async () => {
    sessionStorage.setItem("mansion.token", "old-token");
    const fake = fakeSocket(() => "timeout");
    const net = createNet(() => fake.socket);
    net.open();
    fake.serve("room", room(null));
    fake.connect();
    await settle();
    expect(net.getState().room).not.toBeNull();
    expect(sessionStorage.getItem("mansion.token")).toBe("old-token");
    expect(net.getState().lastError).toContain("did not answer");
  });

  it("reports offline before the first connection and forgets the room on leaving", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.serve("connect_error");
    expect(net.getState().connection).toBe("offline");
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room(null));
    await net.leaveRoom();
    expect(net.getState()).toMatchObject({ room: null, table: null, me: null, lastError: null });
    expect(sessionStorage.getItem("mansion.token")).toBeNull();
  });

  it("leaves for good when Leave is pressed while reconnecting", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.createRoom("Ann");
    fake.serve("room", room(null));
    fake.serve("disconnect", "transport close");
    const leaving = net.leaveRoom();
    // The connection returns before the answer: nothing is left to resume with.
    fake.connect();
    await leaving;
    await settle();
    expect(fake.sent.map((entry) => entry.event)).toEqual(["room:create", "room:leave"]);
    expect(net.getState().room).toBeNull();
  });

  it("shows the entry page the moment Leave is pressed, before the server answers", async () => {
    // A server that never answers: the room must still be gone from the screen at once.
    const fake = fakeSocket((event) => (event === "room:leave" ? "timeout" : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    fake.serve("poses", { bo: { x: 1, z: 2, ry: 0 } });
    const leaving = net.leaveRoom();
    expect(net.getState()).toMatchObject({ room: null, table: null, me: null, poses: {}, lastError: null });
    expect(sessionStorage.getItem("mansion.token")).toBeNull();
    expect(fake.sent.at(-1)).toEqual({ event: "room:leave", payload: {} });
    await leaving;
  });

  it("does not let a snapshot queued before the leave bring the room back, and joins again afterwards", async () => {
    let release: () => void = () => {};
    const fake = fakeSocket(() => joined);
    // The leave's answer is held until the test releases it.
    const sender = (fake.socket as unknown as { timeout(): { emitWithAck(event: string, payload: unknown): Promise<unknown> } }).timeout;
    (fake.socket as unknown as { timeout: unknown }).timeout = () => ({
      emitWithAck: (event: string, payload: unknown) =>
        event === "room:leave"
          ? new Promise((resolve) => {
              fake.sent.push({ event, payload });
              release = () => resolve({ ok: true });
            })
          : sender().emitWithAck(event, payload),
    });
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    const leaving = net.leaveRoom();
    expect(net.getState().room).toBeNull();

    // Served after the leave was asked but before its answer: already on its way from the server.
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    fake.serve("table:left", { tableId: "spades-1", reason: "A stale notice." });
    fake.serve("poses", { bo: { x: 1, z: 2, ry: 0 } });
    fake.serve("look", { memberId: "me", look: STARTING_LOOKS[3] });
    fake.serve("gesture", { memberId: "bo", kind: "wave" });
    expect(net.getState()).toMatchObject({ room: null, table: null, me: null, poses: {}, gestures: [], lastError: null });

    release();
    expect(await leaving).toEqual({ ok: true });
    // A later join is a new room, and its snapshots are taken as usual.
    expect(await net.joinRoom("ABCDEFGH", "Ann")).toEqual(joined);
    fake.serve("room", room(null));
    fake.serve("table", snapshot);
    expect(net.getState()).toMatchObject({ me: "me", table: snapshot });
    expect(net.getState().room?.code).toBe("ABCDEFGH");
    expect(sessionStorage.getItem("mansion.token")).toBe("secret-token");
  });

  it("can join again while the leave is still unanswered", async () => {
    let pending: ((reply: Reply<Record<string, unknown>>) => void) | null = null;
    const fake = fakeSocket(() => joined);
    const sender = (fake.socket as unknown as { timeout(): { emitWithAck(event: string, payload: unknown): Promise<unknown> } }).timeout;
    (fake.socket as unknown as { timeout: unknown }).timeout = () => ({
      emitWithAck: (event: string, payload: unknown) =>
        event === "room:leave"
          ? new Promise((resolve) => {
              fake.sent.push({ event, payload });
              pending = resolve;
            })
          : sender().emitWithAck(event, payload),
    });
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.createRoom("Ann");
    fake.serve("room", room(null));
    const leaving = net.leaveRoom();
    expect(net.getState().room).toBeNull();
    // The new join is answered first (in practice the server answers in order; the join clears the guard either way).
    expect(await net.joinRoom("ABCDEFGH", "Ann")).toEqual(joined);
    fake.serve("room", room(null));
    expect(net.getState()).toMatchObject({ me: "me" });
    expect(net.getState().room?.code).toBe("ABCDEFGH");
    // Left again before the first leave was answered: the first answer must not open the door for the second room.
    const first = pending!;
    const again = net.leaveRoom();
    expect(net.getState().room).toBeNull();
    first({ ok: true });
    await leaving;
    fake.serve("room", room("spades-1"));
    expect(net.getState().room).toBeNull();
    pending!({ ok: true });
    await again;
    // Both answered: the next room's snapshots are taken.
    fake.serve("room", room("spades-1"));
    expect(myTable(net.getState())?.id).toBe("spades-1");
  });

  it("resolves Leave with the no-answer reply after the wait, long after the room left the screen", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeSocket(() => joined);
      // A server that never answers, as the real socket reports it once ANSWER_TIMEOUT_MS has passed.
      (fake.socket as unknown as { timeout: unknown }).timeout = (ms: number) => ({
        emitWithAck: (event: string, payload: unknown) =>
          new Promise((_, reject) => {
            fake.sent.push({ event, payload });
            setTimeout(() => reject(new Error("operation has timed out")), ms);
          }),
      });
      const net = createNet(() => fake.socket);
      net.open();
      fake.connect();
      fake.serve("room", room(null));
      let reply: Reply | null = null;
      void net.leaveRoom().then((answer) => (reply = answer));
      expect(net.getState().room).toBeNull();
      await vi.advanceTimersByTimeAsync(7_999);
      expect(reply).toBeNull();
      await vi.advanceTimersByTimeAsync(1);
      expect(reply).toMatchObject({ ok: false, message: "The server did not answer. Check your connection." });
      expect(net.getState()).toMatchObject({ room: null, me: null, lastError: null });
    } finally {
      vi.useRealTimers();
    }
  });

  it("goes back to the entry screen and reconnects when another tab takes the room", async () => {
    sessionStorage.setItem("mansion.token", "old-token");
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await settle();
    fake.serve("room", room(null));
    fake.serve("disconnect", "io server disconnect");
    expect(net.getState()).toMatchObject({ room: null, me: null, lastError: "This room was opened in another tab." });
    expect(sessionStorage.getItem("mansion.token")).toBeNull();
    expect(fake.sent.at(-1)?.event).toBe("(connect)");
    fake.connect();
    await settle();
    expect(fake.sent.filter((entry) => entry.event === "room:resume")).toHaveLength(1);
  });

  it("resumes after a reconnect even when storage kept nothing, and gives up a room it holds no token for", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.createRoom("Ann");
    sessionStorage.clear();
    fake.connect();
    await settle();
    expect(fake.sent.at(-1)).toEqual({ event: "room:resume", payload: { token: "secret-token" } });

    // The join answer was lost, but the server's room snapshot arrived.
    const lost = fakeSocket(() => "timeout");
    const other = createNet(() => lost.socket);
    other.open();
    lost.connect();
    await other.joinRoom("ABCDEFGH", "Ann");
    lost.serve("room", room(null));
    lost.connect();
    expect(other.getState().room).toBeNull();
    expect(other.getState().lastError).toContain("Join again");
  });

  it("refuses a table request at once while disconnected instead of buffering it", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.serve("table", snapshot);
    expect(await net.act({ type: "play", cardId: "x" })).toMatchObject({ ok: false, message: "Reconnecting. Try again in a moment." });
    expect(await net.stand()).toMatchObject({ ok: false });
    expect(fake.sent).toEqual([]);
    expect(net.getState().lastError).toContain("Reconnecting");
  });

  it("tells a strike once as it is given, and why the server took me off a table", () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    const struck = (strikes: [number, number, number, number], revision: number): TableSnapshot => ({ ...snapshot, revision, strikes });
    // My first snapshot of a table (as after a reload) tells nothing, though I already have a strike.
    fake.serve("table", struck([0, 0, 1, 0], 7));
    expect(net.getState().lastError).toBeNull();
    // Another seat's strike is not mine.
    fake.serve("table", struck([1, 0, 1, 0], 8));
    expect(net.getState().lastError).toBeNull();
    fake.serve("table", struck([1, 0, 2, 0], 9));
    expect(net.getState().lastError).toBe("Your time ran out, so a bot played your turn. Strike 2 of 3: at 3 a bot takes your seat.");
    net.clearError();
    // Told once; a new match clears strikes without a word.
    fake.serve("table", struck([1, 0, 2, 0], 10));
    fake.serve("table", struck([0, 0, 0, 0], 1));
    expect(net.getState().lastError).toBeNull();
    // The arrival time is kept, so the clocks count from it.
    expect(Math.abs(net.getState().tableAt - Date.now())).toBeLessThan(1000);

    const reason = "Time ran out on 3 of your turns, so a bot took your seat.";
    fake.serve("table:left", { tableId: "spades-1", reason });
    expect(net.getState()).toMatchObject({ table: null, lastError: reason });
    // Standing up says nothing new.
    net.clearError();
    fake.serve("table", snapshot);
    fake.serve("table:left", { tableId: "spades-1" });
    expect(net.getState()).toMatchObject({ table: null, lastError: null });
  });

  it("sends poses at most ten times a second, and only while in a room", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    net.sendPose({ x: 1, z: 2, ry: 0 });
    expect(fake.sent).toEqual([]);
    fake.serve("room", room(null));
    net.sendPose({ x: 1, z: 2, ry: 0 });
    net.sendPose({ x: 3, z: 4, ry: 0 });
    expect(fake.sent).toEqual([{ event: "pose", payload: { x: 1, z: 2, ry: 0 } }]);
  });

  it("sends a VR player's head and hands with the pose when there are some", () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    fake.serve("room", room(null));
    const pose = { x: 1, z: 2, ry: 0, head: { pitch: 0.1, yaw: -0.2 }, hands: [null, { x: 0.2, y: 1.1, z: -0.3 }] as const };
    net.sendPose({ ...pose, hands: [...pose.hands] });
    expect(fake.sent).toEqual([{ event: "pose", payload: pose }]);
  });

  it("carries my saved look into a room, and saves and shows each change", async () => {
    // The test runner's Node has no usable localStorage, so one is supplied here.
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) });
    onTestFinished(() => void vi.unstubAllGlobals());
    myLook.set(STARTING_LOOKS[2]);
    const fake = fakeSocket((event) => (event === "look" ? { ok: true } : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    // Outside a room a change is only saved: the next create or join carries it.
    expect(await net.setLook(STARTING_LOOKS[3])).toEqual({ ok: true });
    expect(fake.sent).toEqual([]);
    expect(JSON.parse(stored.get("mansion.look")!)).toEqual({ v: LOOK_VERSION, look: STARTING_LOOKS[3] });
    await net.joinRoom("ABCDEFGH", "Ann");
    expect(fake.sent[0]).toEqual({ event: "room:join", payload: { code: "ABCDEFGH", name: "Ann", look: STARTING_LOOKS[3] } });

    fake.serve("room", room(null));
    expect(await net.setLook(STARTING_LOOKS[4])).toEqual({ ok: true });
    expect(fake.sent.at(-1)).toEqual({ event: "look", payload: { look: STARTING_LOOKS[4] } });
    expect(myLook.get()).toEqual(STARTING_LOOKS[4]);
  });

  it("sends a look changed while reconnecting once the room is resumed", async () => {
    const fake = fakeSocket((event) => (event === "look" ? { ok: true } : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.createRoom("Ann");
    fake.serve("room", room(null));
    fake.serve("disconnect", "transport close");
    (fake.socket as unknown as { connected: boolean }).connected = false;
    expect(await net.setLook(STARTING_LOOKS[5])).toEqual({ ok: true });
    expect(fake.sent.map((entry) => entry.event)).toEqual(["room:create"]);
    fake.connect();
    await settle();
    expect(fake.sent.map((entry) => entry.event)).toEqual(["room:create", "room:resume", "look"]);
    expect(fake.sent.at(-1)?.payload).toEqual({ look: STARTING_LOOKS[5] });
  });

  it("sends the latest look again once the server's window has passed, after a refusal or no answer", async () => {
    for (const refusal of [{ ok: false, error: "rate-limited", message: "Too many look changes; wait a moment" } as const, "timeout" as const]) {
      vi.useFakeTimers();
      try {
        let reply: Reply<Record<string, unknown>> | "timeout" = refusal;
        const fake = fakeSocket((event) => (event === "look" ? reply : joined));
        const net = createNet(() => fake.socket);
        net.open();
        fake.connect();
        await net.createRoom("Ann");
        fake.serve("room", room(null));
        expect(await net.setLook(STARTING_LOOKS[1])).toMatchObject({ ok: false });
        myLook.set(STARTING_LOOKS[2]);
        reply = { ok: true };
        await vi.advanceTimersByTimeAsync(9_999);
        expect(fake.sent.filter((entry) => entry.event === "look")).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(fake.sent.filter((entry) => entry.event === "look").map((entry) => entry.payload)).toEqual([{ look: STARTING_LOOKS[1] }, { look: STARTING_LOOKS[2] }]);
        // Once only.
        await vi.advanceTimersByTimeAsync(20_000);
        expect(fake.sent.filter((entry) => entry.event === "look")).toHaveLength(2);
      } finally {
        vi.useRealTimers();
      }
    }
  });

  it("takes another member's look change into the room", () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    const two = room(null);
    two.members.push({ id: "bo", name: "Bo", connected: true, tableId: null, look: STARTING_LOOKS[1] });
    fake.serve("room", two);
    fake.serve("look", { memberId: "bo", look: STARTING_LOOKS[4] });
    expect(net.getState().room!.members.map((member) => member.look)).toEqual([STARTING_LOOKS[0], STARTING_LOOKS[4]]);
  });

  it("plays gestures, keeps others' gestures for three seconds, and says only a refusal", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      let reply: Reply<Record<string, unknown>> = { ok: true };
      const fake = fakeSocket((event) => (event === "gesture" ? reply : joined));
      const net = createNet(() => fake.socket);
      net.open();
      fake.connect();
      fake.serve("table:left", { tableId: "spades-1", reason: "A notice still on screen." });
      expect(await net.gesture("wave")).toEqual({ ok: true });
      expect(fake.sent.at(-1)).toEqual({ event: "gesture", payload: { kind: "wave" } });
      expect(net.getState().lastError).toBe("A notice still on screen.");
      reply = { ok: false, error: "rate-limited", message: "Too many gestures; wait a moment" };
      await net.gesture("clap");
      expect(net.getState().lastError).toBe("Too many gestures; wait a moment");

      fake.serve("gesture", { memberId: "bo", kind: "clap" });
      vi.setSystemTime(Date.now() + 2000);
      fake.serve("gesture", { memberId: "cy", kind: "bow" });
      vi.setSystemTime(Date.now() + 1500);
      fake.serve("gesture", { memberId: "bo", kind: "boston" });
      expect(net.getState().gestures.map(({ memberId, kind }) => [memberId, kind])).toEqual([
        ["cy", "bow"],
        ["bo", "boston"],
      ]);
      expect(net.getState().gestures.at(-1)!.at).toBe(Date.now());
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses a gesture at once while disconnected instead of buffering it", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    expect(await net.gesture("wave")).toMatchObject({ ok: false, message: "Reconnecting. Try again in a moment." });
    expect(fake.sent).toEqual([]);
  });
});
