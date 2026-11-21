import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { LOOK_VERSION, STARTING_LOOKS } from "../../shared/avatar";
import { myLook } from "../../client/src/state/look";
import type { Reply, RoomSnapshot, TableSnapshot, TableSummary } from "../../shared/protocol";
import { amManager, createNet, mySeat, myTable, withoutMeAt, type ClientSocket } from "../../client/src/net/store";
import { describeTable } from "../../client/src/ui/actions";

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

  it("leaves the room on the spot, before the server has answered", async () => {
    // The server never answers: the person must still be out of the room at once, not after the timeout.
    const fake = fakeSocket((event) => (event === "room:leave" ? "timeout" : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    expect(net.getState().room).not.toBeNull();

    const leaving = net.leaveRoom();
    // Checked before awaiting: nothing has come back from the server yet.
    expect(net.getState()).toMatchObject({ room: null, table: null, me: null, poses: {}, gestures: [], lastError: null });
    expect(sessionStorage.getItem("mansion.token")).toBeNull();
    expect(fake.sent.map((entry) => entry.event)).toEqual(["room:join", "room:leave"]);

    expect(await leaving).toMatchObject({ ok: false, error: "internal" });
    // A leave the server never acknowledged is not an error worth showing: the room is gone either way.
    expect(net.getState().lastError).toBeNull();
  });

  it("drops stale snapshots while the leave is in flight, then follows the next room joined", async () => {
    let release: (reply: Reply) => void = () => {};
    const gate = new Promise<Reply>((resolve) => (release = resolve));
    // The fake's emitWithAck returns whatever the answer gives, so a promise holds the leave's answer open.
    let answerNext: () => Reply = () => joined;
    const fake = fakeSocket((event) => (event === "room:leave" ? (gate as unknown as Reply) : answerNext()));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));

    const leaving = net.leaveRoom();
    expect(net.getState().room).toBeNull();
    // Snapshots the server had already queued for the old room arrive after the local leave: they change nothing.
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    fake.serve("poses", { other: { x: 1 } });
    fake.serve("gesture", { memberId: "other", kind: "wave" });
    fake.serve("table:left", { tableId: "spades-1", reason: "stale" });
    expect(net.getState()).toMatchObject({ room: null, table: null, me: null, poses: {}, gestures: [], lastError: null });

    release({ ok: true });
    await leaving;
    // Once answered, the next room's snapshots are followed as usual. A rejoin is a new membership with a new id,
    // as the server issues one per join.
    answerNext = () => ({ ...joined, memberId: "me2", token: "second-token" }) as unknown as Reply;
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", { ...room(null), you: "me2", members: [{ ...room(null).members[0], id: "me2" }] });
    expect(net.getState().room?.code).toBe("ABCDEFGH");
    expect(net.getState().me).toBe("me2");
    expect(sessionStorage.getItem("mansion.token")).toBe("second-token");
  });

  it("ignores a late create or join answer for a membership already left", async () => {
    // The server sends the room's first snapshot before the create's answer, so Leave can be pressed in between.
    let releaseCreate: (reply: Reply) => void = () => {};
    const createGate = new Promise<Reply>((resolve) => (releaseCreate = resolve));
    const fake = fakeSocket((event) => (event === "room:create" ? (createGate as unknown as Reply) : { ok: true }));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();

    const creating = net.createRoom("Ann");
    fake.serve("room", room(null)); // the snapshot arrives first and puts the room on screen
    expect(net.getState().room?.code).toBe("ABCDEFGH");
    expect(net.getState().me).toBe("me");

    const leaving = net.leaveRoom(); // pressed before the create has been answered
    expect(net.getState().room).toBeNull();

    releaseCreate(joined); // the late answer names the membership just left
    expect(await creating).toEqual(joined);
    await leaving;
    // Nothing comes back: no token to resume with, no member id, and the departed room's snapshots stay stale.
    expect(net.getState()).toMatchObject({ room: null, me: null });
    expect(sessionStorage.getItem("mansion.token")).toBeNull();
    fake.serve("room", room(null));
    expect(net.getState().room).toBeNull();

    // A genuinely new membership is still followed.
    const fresh = { ...joined, memberId: "me2", token: "second-token" } as unknown as Reply;
    const fake2 = fakeSocket(() => fresh);
    const net2 = createNet(() => fake2.socket);
    net2.open();
    fake2.connect();
    await net2.createRoom("Ann");
    fake2.serve("room", { ...room(null), you: "me2", members: [{ ...room(null).members[0], id: "me2" }] });
    expect(net2.getState().me).toBe("me2");
  });

  it("follows the next room even when its first snapshot lands before the create is acknowledged", async () => {
    // Over long polling, one poll response can carry [ack room:leave][room NEW][ack room:create] and Socket.IO hands
    // them over as consecutive microtasks: the new room's snapshot is seen before the leave's await has even resumed.
    // The guard is by member id, not by timing, so the new room (a fresh id) is followed and only the old id is stale.
    let releaseLeave: (reply: Reply) => void = () => {};
    let releaseCreate: (reply: Reply) => void = () => {};
    const leaveGate = new Promise<Reply>((resolve) => (releaseLeave = resolve));
    const createGate = new Promise<Reply>((resolve) => (releaseCreate = resolve));
    const fake = fakeSocket((event) => {
      if (event === "room:leave") return leaveGate as unknown as Reply;
      if (event === "room:create") return createGate as unknown as Reply;
      return joined;
    });
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room(null));

    const leaving = net.leaveRoom();
    const creating = net.createRoom("Ann");
    releaseLeave({ ok: true });
    await Promise.resolve(); // the ack is in, but leaveRoom's continuation has not run yet
    // A stale snapshot of the old membership is dropped; the new room, under a new member id, is not.
    fake.serve("room", room("spades-1"));
    expect(net.getState().room).toBeNull();
    const fresh: RoomSnapshot = { ...room(null), code: "NEWROOM1", you: "me2", members: [{ ...room(null).members[0], id: "me2" }] };
    fake.serve("room", fresh);
    expect(net.getState().room?.code).toBe("NEWROOM1");
    expect(net.getState().me).toBe("me2");

    releaseCreate({ ...joined, code: "NEWROOM1", memberId: "me2" } as unknown as Reply);
    await Promise.all([leaving, creating]);
    expect(net.getState().room?.code).toBe("NEWROOM1");
    expect(sessionStorage.getItem("mansion.token")).toBe("secret-token");
  });

  it("follows a new room joined before an unanswered leave times out", async () => {
    let release: (reply: Reply) => void = () => {};
    const gate = new Promise<Reply>((resolve) => (release = resolve));
    const fresh = { ...joined, code: "NEWROOM1", memberId: "me2", token: "second-token" } as unknown as Reply;
    const fake = fakeSocket((event) => (event === "room:leave" ? (gate as unknown as Reply) : event === "room:create" ? fresh : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room(null));

    const leaving = net.leaveRoom();
    // The server answers the create (it handles requests in order, so the leave is done) while the leave's ack is still missing.
    await net.createRoom("Ann");
    fake.serve("room", { ...room(null), code: "NEWROOM1", you: "me2", members: [{ ...room(null).members[0], id: "me2" }] });
    expect(net.getState().room?.code).toBe("NEWROOM1");
    expect(net.getState().me).toBe("me2");
    release({ ok: true });
    await leaving;
    expect(net.getState().room?.code).toBe("NEWROOM1");
  });

  it("stands up from a table on the spot, before the server answers, and ignores that table's leftovers", async () => {
    let releaseStand: (reply: Reply) => void = () => {};
    const standGate = new Promise<Reply>((resolve) => (releaseStand = resolve));
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    expect(myTable(net.getState())?.id).toBe("spades-1");
    expect(net.getState().table).toEqual(snapshot);

    const standing = net.stand();
    // Checked before awaiting: my hand is gone and the room no longer seats me, so the seat pose and panels change now.
    expect(net.getState().table).toBeNull();
    expect(myTable(net.getState())).toBeNull();
    expect(net.getState().room?.members.find((m) => m.id === "me")?.tableId).toBeNull();
    // The rest of the room is still there.
    expect(net.getState().room?.code).toBe("ABCDEFGH");
    expect(fake.sent.at(-1)).toEqual({ event: "table:stand", payload: {} });

    // Queued before the server heard the stand: a bot's move at the old table, and a room snapshot still seating me.
    fake.serve("table", { ...snapshot, revision: 8 });
    expect(net.getState().table).toBeNull();
    fake.serve("room", room("spades-1"));
    expect(myTable(net.getState())).toBeNull();

    // The server confirms: table:left, then a room snapshot with me unseated.
    fake.serve("table:left", { tableId: "spades-1" });
    fake.serve("room", room(null));
    releaseStand({ ok: true });
    expect(await standing).toEqual({ ok: true });
    expect(net.getState()).toMatchObject({ table: null, lastError: null });
    expect(myTable(net.getState())).toBeNull();

    // Once confirmed, that table's snapshots are no longer dropped (e.g. after sitting there again).
    fake.serve("room", room("spades-1"));
    fake.serve("table", { ...snapshot, revision: 9 });
    expect(myTable(net.getState())?.id).toBe("spades-1");
    expect(net.getState().table?.revision).toBe(9);
  });

  it("keeps the old table's leftovers aside through a sit pressed before the stand is answered, even at the same table", async () => {
    let releaseStand: (reply: Reply) => void = () => {};
    let releaseSit: (reply: Reply) => void = () => {};
    const standGate = new Promise<Reply>((resolve) => (releaseStand = resolve));
    const sitGate = new Promise<Reply>((resolve) => (releaseSit = resolve));
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : event === "table:sit" ? (sitGate as unknown as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);

    const standing = net.stand();
    expect(myTable(net.getState())).toBeNull();
    const sitting = net.sit("spades-1", "player", 2);
    // Queued before the server heard the stand: a bot's move at the old table and a room snapshot still seating me
    // there. They must not sit me back down in the old seat while the sit is on its way.
    fake.serve("table", { ...snapshot, revision: 8 });
    fake.serve("room", room("spades-1"));
    expect(myTable(net.getState())).toBeNull();
    expect(net.getState().table).toBeNull();

    // The server handles stand then sit, in order, and says so before it answers either.
    fake.serve("table:left", { tableId: "spades-1" });
    fake.serve("room", room(null));
    fake.serve("room", room("spades-1"));
    fake.serve("table", { ...snapshot, revision: 12 });
    expect(myTable(net.getState())?.id).toBe("spades-1");
    expect(net.getState().table?.revision).toBe(12);
    releaseStand({ ok: true });
    releaseSit({ ok: true, seat: 2 } as Reply);
    await standing;
    expect(await sitting).toEqual({ ok: true, seat: 2 });
    // The late answers change nothing about the new seat.
    expect(myTable(net.getState())?.id).toBe("spades-1");
    expect(net.getState().table?.revision).toBe(12);
    expect(net.getState().lastError).toBeNull();
  });

  it("takes a sit answered before the old table's leftovers as the end of them", async () => {
    const standGate = new Promise<Reply>(() => {});
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : event === "table:sit" ? ({ ok: true, seat: 0 } as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    void net.stand();
    expect(await net.sit("spades-2", "player", 0)).toEqual({ ok: true, seat: 0 });
    const elsewhere: TableSummary = { ...table, id: "spades-2", seats: [table.seats[2], table.seats[0], table.seats[1], table.seats[3]] };
    fake.serve("room", { ...room("spades-2"), tables: [{ ...table, seats: [table.seats[0], table.seats[1], table.seats[0], table.seats[3]] }, elsewhere] });
    fake.serve("table", { ...snapshot, tableId: "spades-2", revision: 1, you: 0 });
    expect(myTable(net.getState())?.id).toBe("spades-2");
    expect(net.getState().table?.tableId).toBe("spades-2");
  });

  it("standing while not at a table sends the request and changes nothing locally", async () => {
    const fake = fakeSocket((event) => (event === "table:stand" ? ({ ok: false, error: "not-at-table", message: "Sit at a table first" } as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room(null));
    const before = net.getState().room;
    expect(await net.stand()).toMatchObject({ ok: false, error: "not-at-table" });
    expect(net.getState().room).toBe(before);
    expect(net.getState().lastError).toBe("Sit at a table first");
    // Snapshots are followed as usual afterwards.
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    expect(myTable(net.getState())?.id).toBe("spades-1");
    expect(net.getState().table).toEqual(snapshot);
  });

  it("shows the table as the server will once I have stood, so the panel treats me as a visitor at once", async () => {
    const bob = { occupant: "human", memberId: "bob", name: "Bob", ready: true, connected: true } as const;
    const open = { occupant: "open", memberId: null, name: null, ready: false, connected: false } as const;
    const playing: TableSummary = { ...table, status: "playing", seats: [bob, open, table.seats[2], open], managerId: "me", matchTime: { elapsedMs: 5000, running: true } };
    const members = [
      { id: "me", name: "Ann", connected: true, tableId: "spades-1" as const, look: STARTING_LOOKS[0] },
      { id: "bob", name: "Bob", connected: true, tableId: "spades-1" as const, look: STARTING_LOOKS[1] },
    ];
    const standGate = new Promise<Reply>(() => {});
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", { ...room("spades-1"), members, tables: [playing] });
    fake.serve("table", { ...snapshot, revision: 8 });
    const describe = () => describeTable({ summary: net.getState().room!.tables[0], snapshot: net.getState().table, meId: "me", selection: [] });
    expect(describe().role).toBe("player");

    void net.stand();
    // In a match my seat goes to a bot, as the server does it, and Bob now manages the table.
    const shown = net.getState().room!.tables[0];
    expect(shown.seats[2]).toEqual({ occupant: "bot", memberId: null, name: null, ready: false, connected: false });
    expect(shown.seats[0]).toEqual(bob);
    expect(shown).toMatchObject({ status: "playing", managerId: "bob", matchTime: { elapsedMs: 5000, running: true } });
    const gap = describe();
    expect(gap.role).toBe("visitor");
    expect(gap.buttons.map((button) => button.id)).not.toContain("leave");

    // Without me the match has nobody left to play it: the table is free again.
    const alone = withoutMeAt({ ...room("spades-1"), tables: [{ ...playing, seats: [open, open, table.seats[2], open] }] }, "me", "spades-1");
    expect(alone.tables[0]).toMatchObject({ status: "available", managerId: null, matchTime: null });
    expect(alone.tables[0].seats.every((seat) => seat.occupant === "open")).toBe(true);
    // A lobby seat opens; a lobby with nobody left is available.
    expect(withoutMeAt(room("spades-1"), "me", "spades-1").tables[0]).toMatchObject({ status: "available", managerId: null, seats: [open, open, open, open] });
    // The host's chair is simply left, and the players keep their seats and the table.
    const hosted: TableSummary = { ...table, seats: [bob, open, open, open], host: { memberId: "me", name: "Ann", connected: true }, managerId: "me" };
    expect(withoutMeAt({ ...room("spades-1"), tables: [hosted] }, "me", "spades-1").tables[0]).toMatchObject({ status: "lobby", host: null, managerId: "bob", seats: [bob, open, open, open] });
    // Other tables are untouched.
    const other: TableSummary = { ...table, id: "spades-2" };
    expect(withoutMeAt({ ...room("spades-1"), tables: [table, other] }, "me", "spades-1").tables[1]).toBe(other);
  });

  it("puts me back at the table when the server does not answer the stand, as it last described it", async () => {
    let failStand: (error: Error) => void = () => {};
    const standGate = new Promise<Reply>((_, reject) => (failStand = reject));
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);

    const standing = net.stand();
    expect(myTable(net.getState())).toBeNull();
    // Meanwhile the server, which never heard the stand, keeps talking about the table and the room.
    fake.serve("table", { ...snapshot, revision: 8 });
    const bob = { id: "bob", name: "Bob", connected: true, tableId: null, look: STARTING_LOOKS[1] };
    const later = { ...room("spades-1"), members: [...room("spades-1").members, bob] };
    fake.serve("room", later);
    expect(myTable(net.getState())).toBeNull();
    expect(net.getState().room?.members.map((member) => member.id)).toEqual(["me", "bob"]);
    fake.serve("look", { memberId: "bob", look: STARTING_LOOKS[2] });

    failStand(new Error("operation has timed out"));
    expect(await standing).toMatchObject({ ok: false, error: "internal" });
    // Still seated as far as the server knows: the room is as it last sent it (with Bob's new look), and the hand is the latest one.
    expect(net.getState().room).toMatchObject({ ...later, members: [later.members[0], { ...bob, look: STARTING_LOOKS[2] }] });
    expect(myTable(net.getState())?.id).toBe("spades-1");
    expect(net.getState().table?.revision).toBe(8);
    expect(net.getState().lastError).toBe("The server did not answer. Check your connection.");
    // Snapshots are followed as usual afterwards.
    fake.serve("table", { ...snapshot, revision: 9 });
    expect(net.getState().table?.revision).toBe(9);
  });

  it("puts a kept-aside snapshot back as of when it arrived, and tells the strike it brought", async () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    vi.setSystemTime(1_000_000);
    let failStand: (error: Error) => void = () => {};
    const standGate = new Promise<Reply>((_, reject) => (failStand = reject));
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", { ...snapshot, strikes: [0, 0, 0, 0] });
    expect(net.getState().tableAt).toBe(1_000_000);

    vi.setSystemTime(1_020_000);
    const standing = net.stand();
    vi.setSystemTime(1_025_000);
    // My time ran out at the old table while the stand was on its way: kept aside, not told yet.
    fake.serve("table", { ...snapshot, revision: 8, strikes: [0, 0, 1, 0] });
    expect(net.getState().table).toBeNull();
    expect(net.getState().lastError).toBeNull();

    vi.setSystemTime(1_028_000);
    failStand(new Error("operation has timed out"));
    await standing;
    // Back at the table with the snapshot the server sent, timed from its arrival (so the turn clock is right), and the strike told once.
    expect(net.getState().table?.revision).toBe(8);
    expect(net.getState().tableAt).toBe(1_025_000);
    expect(net.getState().lastError).toContain("Strike 1 of 3");
    fake.serve("table", { ...snapshot, revision: 9, strikes: [0, 0, 1, 0] });
    expect(net.getState().lastError).toContain("Strike 1 of 3");
  });

  it("keeps the server's own reason when it took me off the table before my stand reached it", async () => {
    let releaseStand: (reply: Reply) => void = () => {};
    const standGate = new Promise<Reply>((resolve) => (releaseStand = resolve));
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    const standing = net.stand();
    const reason = "Time ran out on 3 of your turns, so a bot took your seat. You can take a seat again in 5 minutes.";
    fake.serve("table:left", { tableId: "spades-1", reason });
    fake.serve("room", room(null));
    releaseStand({ ok: false, error: "not-at-table", message: "You are not at a table" });
    expect(await standing).toMatchObject({ ok: false, error: "not-at-table" });
    expect(net.getState().lastError).toBe(reason);
    expect(myTable(net.getState())).toBeNull();
  });

  it("a stand that goes unanswered after sitting elsewhere leaves no message", async () => {
    let failStand: (error: Error) => void = () => {};
    const standGate = new Promise<Reply>((_, reject) => (failStand = reject));
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : event === "table:sit" ? ({ ok: true, seat: 0 } as Reply) : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    const standing = net.stand();
    fake.serve("table:left", { tableId: "spades-1" });
    fake.serve("room", room(null));
    await net.sit("spades-2", "player", 0);
    fake.serve("room", { ...room("spades-2"), tables: [table, { ...table, id: "spades-2" }] });
    failStand(new Error("operation has timed out"));
    await standing;
    expect(myTable(net.getState())?.id).toBe("spades-2");
    expect(net.getState().lastError).toBeNull();
  });

  it("pressing Leave table while reconnecting sends nothing and moves nothing", async () => {
    const fake = fakeSocket(() => joined);
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);
    (fake.socket as unknown as { connected: boolean }).connected = false;
    fake.serve("disconnect", "transport close");
    const before = net.getState();
    const sentBefore = fake.sent.length;

    expect(await net.stand()).toMatchObject({ ok: false, error: "internal", message: "Reconnecting. Try again in a moment." });
    expect(fake.sent.length).toBe(sentBefore);
    expect(net.getState().room).toBe(before.room);
    expect(net.getState().table).toBe(before.table);
    expect(myTable(net.getState())?.id).toBe("spades-1");
  });

  it("a late refusal of the stand does not bring back a room already left", async () => {
    let failStand: (error: Error) => void = () => {};
    const standGate = new Promise<Reply>((_, reject) => (failStand = reject));
    const fake = fakeSocket((event) => (event === "table:stand" ? (standGate as unknown as Reply) : event === "room:leave" ? { ok: true } : joined));
    const net = createNet(() => fake.socket);
    net.open();
    fake.connect();
    await net.joinRoom("ABCDEFGH", "Ann");
    fake.serve("room", room("spades-1"));
    fake.serve("table", snapshot);

    const standing = net.stand();
    await net.leaveRoom();
    expect(net.getState().room).toBeNull();
    failStand(new Error("operation has timed out"));
    await standing;
    expect(net.getState()).toMatchObject({ room: null, table: null, me: null, lastError: null });
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
    // A rejoin is a new membership with a new id and token, as the server issues one per join.
    const rejoined = { ...joined, memberId: "me2", token: "second-token" } as const;
    let answer: Reply<Record<string, unknown>> = joined;
    const fake = fakeSocket(() => answer);
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
    // A later join is a new membership, and its snapshots are taken as usual.
    answer = rejoined;
    expect(await net.joinRoom("ABCDEFGH", "Ann")).toEqual(rejoined);
    fake.serve("room", { ...room(null), you: "me2", members: [{ ...room(null).members[0], id: "me2" }] });
    fake.serve("table", { ...snapshot, you: 2 });
    expect(net.getState()).toMatchObject({ me: "me2", table: { ...snapshot, you: 2 } });
    expect(net.getState().room?.code).toBe("ABCDEFGH");
    expect(sessionStorage.getItem("mansion.token")).toBe("second-token");
  });

  it("can join again while the leave is still unanswered", async () => {
    let pending: ((reply: Reply<Record<string, unknown>>) => void) | null = null;
    // Each join is a new membership with its own id, as the server issues one per join.
    const ids = ["me", "me2", "me3"];
    let joins = 0;
    const fake = fakeSocket(() => ({ ...joined, memberId: ids[joins++], token: `token-${joins}` }));
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
    // The new join is answered first (in practice the server answers in order); it is a new membership, "me2".
    expect(await net.joinRoom("ABCDEFGH", "Ann")).toMatchObject({ ok: true, memberId: "me2" });
    const as = (id: string, tableId: RoomSnapshot["members"][number]["tableId"]): RoomSnapshot => ({
      ...room(tableId),
      you: id,
      members: [{ ...room(tableId).members[0], id }],
    });
    fake.serve("room", as("me2", null));
    expect(net.getState()).toMatchObject({ me: "me2" });
    expect(net.getState().room?.code).toBe("ABCDEFGH");
    // Left again before the first leave was answered: the first answer must not open the door for the second room.
    const first = pending!;
    const again = net.leaveRoom();
    expect(net.getState().room).toBeNull();
    first({ ok: true });
    await leaving;
    fake.serve("room", as("me2", "spades-1"));
    expect(net.getState().room).toBeNull();
    pending!({ ok: true });
    await again;
    // Both answered: a further join is a new membership whose snapshots are taken.
    expect(await net.joinRoom("ABCDEFGH", "Ann")).toMatchObject({ ok: true, memberId: "me3" });
    fake.serve("room", as("me3", "spades-1"));
    expect(myTable(net.getState())?.id).toBe("spades-1");
    expect(net.getState().me).toBe("me3");
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
