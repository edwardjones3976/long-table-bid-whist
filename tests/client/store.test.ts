import { beforeEach, describe, expect, it } from "vitest";
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
  members: [{ id: "me", name: "Ann", connected: true, tableId }],
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
    expect(fake.sent[0]).toEqual({ event: "room:create", payload: { name: "Ann" } });
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
});
