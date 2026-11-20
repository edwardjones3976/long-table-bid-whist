// @vitest-environment node
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGameServer, type GameServer, type GameServerOptions } from "../../server/index";
import { STARTING_LOOKS, type Look } from "../../shared/avatar";
import type { Joined, Pose, RoomSnapshot } from "../../shared/protocol";

interface Client {
  socket: Socket;
  rooms: RoomSnapshot[];
  poses: Record<string, Pose>[];
  gestures: { memberId: string; kind: string }[];
  tables: unknown[];
  /** Each member's look as this client knows it: from room snapshots, then each "look" event. */
  looks: Map<string, Look>;
  joined?: Joined;
}

let server: GameServer;
let clients: Client[] = [];

async function boot(options: GameServerOptions = {}): Promise<void> {
  // Tests act far faster than the per-socket limit allows a person; the look and gesture limits still apply.
  server = createGameServer({ rateLimit: { burst: 1e9, perSecond: 1e9 }, holdMs: 60, ...options });
  await new Promise<void>((resolve) => server.http.listen(0, resolve));
}

async function client(): Promise<Client> {
  if (!server) await boot();
  const { port } = server.http.address() as AddressInfo;
  const socket = connect(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true, reconnection: false });
  const made: Client = { socket, rooms: [], poses: [], gestures: [], tables: [], looks: new Map() };
  socket.on("room", (snap: RoomSnapshot) => {
    made.rooms.push(snap);
    for (const member of snap.members) made.looks.set(member.id, member.look);
  });
  socket.on("look", ({ memberId, look }) => made.looks.set(memberId, look));
  socket.on("table", (snap) => made.tables.push(snap));
  socket.on("poses", (poses) => made.poses.push(poses));
  socket.on("gesture", (gesture) => made.gestures.push(gesture));
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  clients.push(made);
  return made;
}

afterEach(async () => {
  vi.useRealTimers();
  clients.forEach((c) => c.socket.close());
  clients = [];
  await server?.io.close();
  server = undefined as unknown as GameServer;
});

const send = (c: Client, event: string, payload: unknown = {}): Promise<any> => c.socket.emitWithAck(event, payload);

async function until(condition: () => boolean, what = "the server"): Promise<void> {
  for (let i = 0; i < 5000; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error(`Timed out waiting for ${what}`);
}

/** A new connection that creates a room (no code) or joins one, bringing `look` when given. */
async function enter(name: string, code?: string, look?: unknown): Promise<Client> {
  const c = await client();
  const payload = { name, ...(code ? { code } : {}), ...(look === undefined ? {} : { look }) };
  const reply = await send(c, code ? "room:join" : "room:create", payload);
  expect(reply).toMatchObject({ ok: true });
  c.joined = reply;
  return c;
}

const lookOf = (viewer: Client, of: Client): Look | undefined => viewer.looks.get(of.joined!.memberId);

describe("looks", () => {
  it("shows a joiner's look in the other members' snapshots", async () => {
    const a = await enter("Ana", undefined, STARTING_LOOKS[3]);
    const b = await enter("Bo", a.joined!.code, STARTING_LOOKS[4]);
    await until(() => lookOf(a, b) !== undefined && lookOf(b, a) !== undefined, "both looks");
    expect(lookOf(a, b)).toEqual(STARTING_LOOKS[4]);
    expect(lookOf(b, a)).toEqual(STARTING_LOOKS[3]);
  });

  it("gives anyone who brings no look a starting look by arrival order, so nobody is a default person", async () => {
    const a = await enter("Ana");
    const b = await enter("Bo", a.joined!.code, "not a look");
    const c = await enter("Cy", a.joined!.code, STARTING_LOOKS[5]);
    const d = await enter("Di", a.joined!.code);
    await until(() => a.rooms.at(-1)?.members.length === 4, "four members");
    expect([a, b, c, d].map((who) => lookOf(a, who))).toEqual([STARTING_LOOKS[0], STARTING_LOOKS[1], STARTING_LOOKS[5], STARTING_LOOKS[3]]);
  });

  it("cleans a bad look on the way in", async () => {
    const a = await enter("Ana");
    const sent = { ...STARTING_LOOKS[1], skin: "99x", extra: "dropped", accessories: ["hoops", "studs", "watch", "necklace", "bracelets", "nope"] };
    const b = await enter("Bo", a.joined!.code, sent);
    await until(() => lookOf(a, b) !== undefined, "the look");
    expect(lookOf(a, b)).toEqual({ ...STARTING_LOOKS[1], skin: STARTING_LOOKS[0].skin, accessories: ["hoops", "watch", "necklace"] });
    expect(lookOf(a, b)).not.toHaveProperty("extra");
  });

  it("changes a look for everyone, refusing malformed and oversized ones", async () => {
    const a = await enter("Ana");
    const b = await enter("Bo", a.joined!.code);
    await until(() => a.rooms.at(-1)?.members.length === 2, "both members");
    const snapshots = a.rooms.length;
    expect(await send(b, "look", { look: { ...STARTING_LOOKS[2], hair: "afro-l" } })).toEqual({ ok: true });
    await until(() => lookOf(a, b)?.hair === "afro-l" && lookOf(b, b)?.hair === "afro-l", "the new look");
    expect(lookOf(a, b)).toEqual({ ...STARTING_LOOKS[2], hair: "afro-l" });
    // Only the one look goes out, not a room snapshot carrying everyone's.
    expect(a.rooms).toHaveLength(snapshots);
    for (const look of [undefined, null, "bun", 7, [STARTING_LOOKS[2]]]) {
      expect(await send(b, "look", { look })).toMatchObject({ ok: false, error: "bad-request" });
    }
    expect(await send(b, "look", { look: { hair: "x".repeat(5000) } })).toMatchObject({ ok: false, error: "bad-request" });
    expect(lookOf(a, b)?.hair).toBe("afro-l");
    const outsider = await client();
    expect(await send(outsider, "look", { look: STARTING_LOOKS[0] })).toMatchObject({ ok: false, error: "not-in-room" });
  });

  it("allows five look changes in ten seconds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const a = await enter("Ana");
    for (let i = 0; i < 5; i += 1) expect(await send(a, "look", { look: STARTING_LOOKS[i] })).toEqual({ ok: true });
    expect(await send(a, "look", { look: STARTING_LOOKS[5] })).toMatchObject({ ok: false, error: "rate-limited" });
    vi.setSystemTime(Date.now() + 10_000);
    expect(await send(a, "look", { look: STARTING_LOOKS[5] })).toEqual({ ok: true });
  });

  it("keeps a look through a resume, and a change during a match leaves the table alone", async () => {
    await boot({ holdMs: 30_000 });
    const a = await enter("Ana", undefined, STARTING_LOOKS[3]);
    const b = await enter("Bo", a.joined!.code);
    for (const [seat, who] of [a, b].entries()) {
      expect(await send(who, "table:sit", { tableId: "tonk-1", role: "player", seat })).toMatchObject({ ok: true });
      expect(await send(who, "table:ready", { ready: true })).toEqual({ ok: true });
    }
    expect(await send(a, "table:start")).toEqual({ ok: true });
    await until(() => [a, b].every((who) => (who.tables.at(-1) as { view?: unknown } | undefined)?.view), "the match");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const tables = [a.tables.length, b.tables.length];
    expect(await send(a, "look", { look: { ...STARTING_LOOKS[3], hair: "afro-l" } })).toEqual({ ok: true });
    await until(() => lookOf(b, a)?.hair === "afro-l", "the new look");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect([a.tables.length, b.tables.length]).toEqual(tables);

    const { memberId, token } = a.joined!;
    a.socket.close();
    const back = await client();
    expect(await send(back, "room:resume", { token })).toMatchObject({ ok: true, memberId });
    await until(() => back.rooms.length > 0, "the room");
    expect(back.rooms.at(-1)!.members.find((member) => member.id === memberId)?.look).toEqual({ ...STARTING_LOOKS[3], hair: "afro-l" });
    expect(lookOf(b, a)?.hair).toBe("afro-l");
  });
});

describe("gestures", () => {
  it("reach everyone else in the room, never the sender or another room", async () => {
    const a = await enter("Ana");
    const b = await enter("Bo", a.joined!.code);
    const c = await enter("Cy", a.joined!.code);
    const elsewhere = await enter("Di");
    expect(await send(a, "gesture", { kind: "boston" })).toEqual({ ok: true });
    const expected = { memberId: a.joined!.memberId, kind: "boston" };
    await until(() => b.gestures.length === 1 && c.gestures.length === 1, "the gesture");
    expect(b.gestures).toEqual([expected]);
    expect(c.gestures).toEqual([expected]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(a.gestures).toEqual([]);
    expect(elsewhere.gestures).toEqual([]);
  });

  it("refuses unknown kinds, people outside a room, and more than three in four seconds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const a = await enter("Ana");
    for (const kind of ["dance", "", undefined, 3, "toString", "__proto__"]) {
      expect(await send(a, "gesture", { kind })).toMatchObject({ ok: false, error: "bad-request" });
    }
    const outsider = await client();
    expect(await send(outsider, "gesture", { kind: "wave" })).toMatchObject({ ok: false, error: "not-in-room" });
    for (let i = 0; i < 3; i += 1) expect(await send(a, "gesture", { kind: "wave" })).toEqual({ ok: true });
    expect(await send(a, "gesture", { kind: "clap" })).toMatchObject({ ok: false, error: "rate-limited" });
    vi.setSystemTime(Date.now() + 4_000);
    expect(await send(a, "gesture", { kind: "clap" })).toEqual({ ok: true });
  });

  it("keeps a bow and applause for the end of the hand while a match is in play at the sender's table", async () => {
    const a = await enter("Ana");
    const b = await enter("Bo", a.joined!.code);
    for (const [seat, who] of [a, b].entries()) {
      expect(await send(who, "table:sit", { tableId: "tonk-1", role: "player", seat })).toMatchObject({ ok: true });
      expect(await send(who, "table:ready", { ready: true })).toEqual({ ok: true });
    }
    expect(await send(a, "table:start")).toEqual({ ok: true });
    await until(() => (a.tables.at(-1) as { view?: { phase: string } } | undefined)?.view?.phase === "draw", "the hand");
    for (const kind of ["bow", "clap"]) expect(await send(a, "gesture", { kind })).toMatchObject({ ok: false, error: "in-play" });
    expect(await send(a, "gesture", { kind: "wave" })).toEqual({ ok: true });
  });
});

describe("a VR player's head and hands", () => {
  it("are clamped into reach and relayed with the pose", async () => {
    const a = await enter("Ana");
    const b = await enter("Bo", a.joined!.code);
    const seen = () => b.poses.at(-1)?.[a.joined!.memberId];
    a.socket.emit("pose", { x: 1, z: 2, ry: 0, head: { pitch: 2, yaw: -0.5, roll: 9 }, hands: [{ x: 5, y: -1, z: 0.3, w: 1 }, null] });
    await until(() => seen() !== undefined, "the pose");
    expect(seen()).toEqual({ x: 1, z: 2, ry: 0, head: { pitch: 1.2, yaw: -0.5 }, hands: [{ x: 1.2, y: 0, z: 0.3 }, null] });
    a.socket.emit("pose", { x: 2, z: 2, ry: 0, head: { pitch: -9, yaw: 9 }, hands: [{ x: -0.2, y: 9, z: -9 }, { x: 0.1, y: 1, z: -0.4 }] });
    await until(() => seen()?.x === 2, "the second pose");
    expect(seen()).toEqual({
      x: 2,
      z: 2,
      ry: 0,
      head: { pitch: -1.2, yaw: 1.2 },
      hands: [
        { x: -0.2, y: 2.4, z: -1.2 },
        { x: 0.1, y: 1, z: -0.4 },
      ],
    });
  });

  it("are left out when malformed, keeping the rest of the pose", async () => {
    const a = await enter("Ana");
    const b = await enter("Bo", a.joined!.code);
    const seen = () => b.poses.at(-1)?.[a.joined!.memberId];
    const bad: [unknown, unknown][] = [
      [{ pitch: "1", yaw: 0 }, [{ x: 0, y: 1, z: 0 }]],
      [{ pitch: null, yaw: 0 }, [null, null]],
      [[0.1, 0.2], [{ x: 0, y: 1 }, { x: "0", y: 1, z: 0 }]],
      ["up", { 0: { x: 0, y: 1, z: 0 }, 1: null, length: 2 }],
      [{ pitch: 0 }, [{ x: 0, y: 1, z: 0 }, null, null]],
    ];
    for (const [i, [head, hands]] of bad.entries()) {
      a.socket.emit("pose", { x: 10 + i, z: 0, ry: 0, head, hands });
      await until(() => seen()?.x === 10 + i, `pose ${i}`);
      expect(seen()).toEqual({ x: 10 + i, z: 0, ry: 0 });
    }
    // One good hand keeps its place; the malformed one becomes untracked.
    a.socket.emit("pose", { x: 20, z: 0, ry: 0, hands: [{ x: 0.3, y: 1.1, z: -0.2 }, { x: 1 }] });
    await until(() => seen()?.x === 20, "the one-handed pose");
    expect(seen()).toEqual({ x: 20, z: 0, ry: 0, hands: [{ x: 0.3, y: 1.1, z: -0.2 }, null] });
  });
});
