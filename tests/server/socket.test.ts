// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAMES } from "../../server/games/index";
import { createGameServer, serveStatic, type GameServer, type GameServerOptions } from "../../server/index";
import { MAX_ROOMS, Rooms } from "../../server/rooms";
import {
  GAME_IDS,
  MAX_ROOM_MEMBERS,
  ROOM_CODE_ALPHABET,
  type Joined,
  type RoomSnapshot,
  type TableId,
  type TableSnapshot,
} from "../../shared/protocol";

type Snap = Omit<TableSnapshot, "view"> & { view: any };

interface Client {
  socket: Socket;
  rooms: RoomSnapshot[];
  tables: Snap[];
  left: { tableId: TableId }[];
  poses: Record<string, unknown>[];
  /** Every reply this client got to a request that was refused. */
  refusals: unknown[];
  joined?: Joined;
  /** The seat this client holds at its table; null for the host. */
  seat?: number | null;
}

let server: GameServer;
let clients: Client[] = [];
let tokens: string[] = [];
let nextId = 0;

// Tests act at bot speed, far faster than the default limit allows a person.
const UNLIMITED = { burst: 1e9, perSecond: 1e9 };

/** The same deals on every run: Fisher-Yates on a seeded generator (mulberry32). */
function seededShuffle(seed: number): <T>(deck: T[]) => T[] {
  const random = (): number => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (deck) => {
    const cards = [...deck];
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };
}

async function boot(options: GameServerOptions = {}): Promise<void> {
  server = createGameServer({ rateLimit: UNLIMITED, holdMs: 60, ...options });
  await new Promise<void>((resolve) => server.http.listen(0, resolve));
}

async function client(): Promise<Client> {
  if (!server) await boot();
  const { port } = server.http.address() as AddressInfo;
  const socket = connect(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true, reconnection: false });
  const made: Client = { socket, rooms: [], tables: [], left: [], poses: [], refusals: [] };
  socket.on("room", (snap) => made.rooms.push(snap));
  socket.on("table", (snap) => made.tables.push(snap));
  socket.on("table:left", (payload) => made.left.push(payload));
  socket.on("poses", (poses) => made.poses.push(poses));
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  clients.push(made);
  return made;
}

afterEach(async () => {
  vi.useRealTimers();
  // The secret token goes to its owner in the Joined reply and nowhere else.
  for (const c of clients) {
    const seen = JSON.stringify([c.rooms, c.tables, c.left, c.poses, c.refusals]);
    for (const token of tokens) expect(seen.includes(token)).toBe(false);
  }
  clients.forEach((c) => c.socket.close());
  clients = [];
  tokens = [];
  await server?.io.close();
  server = undefined as unknown as GameServer;
});

async function send(c: Client, event: string, payload: unknown = {}): Promise<any> {
  const reply = await c.socket.emitWithAck(event, payload);
  if (!reply.ok) c.refusals.push(reply);
  return reply;
}

async function until(condition: () => boolean, what = "the server"): Promise<void> {
  for (let i = 0; i < 5000; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error(`Timed out waiting for ${what}`);
}

const lastRoom = (c: Client): RoomSnapshot => c.rooms[c.rooms.length - 1];
const lastTable = (c: Client): Snap => c.tables[c.tables.length - 1];
const summaryOf = (c: Client, tableId: TableId) => lastRoom(c).tables.find((t) => t.id === tableId)!;

/** A new connection that creates a room (no code) or joins one. */
async function enter(name: string, code?: string): Promise<Client> {
  const c = await client();
  const reply = code ? await send(c, "room:join", { code, name }) : await send(c, "room:create", { name });
  expect(reply).toMatchObject({ ok: true });
  c.joined = reply;
  tokens.push(reply.token);
  return c;
}

const serverMatch = (code: string, tableId: TableId) => server.rooms.rooms.get(code)!.tables.find((t) => t.id === tableId)!.match;
const revision = (code: string, tableId: TableId) => serverMatch(code, tableId)!.revision;
const settled = (all: Client[], code: string, tableId: TableId) =>
  until(() => all.every((c) => lastTable(c)?.revision === revision(code, tableId) && lastTable(c).view), "table snapshots");

/** A room whose first table of `game` has `humans` seated players and, optionally, a host; not yet started. */
async function table(humans: number, withHost = false, game: string = "bid-whist") {
  const tableId = `${game}-1` as TableId;
  const players: Client[] = [];
  for (let i = 0; i < humans; i += 1) players.push(await enter(`P${i}`, players[0]?.joined!.code));
  const code = players[0].joined!.code;
  for (const [seat, player] of players.entries()) {
    expect(await send(player, "table:sit", { tableId, role: "player", seat })).toEqual({ ok: true, seat });
    player.seat = seat;
  }
  const host = withHost ? await enter("Host", code) : null;
  if (host) expect(await send(host, "table:sit", { tableId, role: "host" })).toEqual({ ok: true, seat: null });
  if (host) host.seat = null;
  const all = host ? [...players, host] : players;
  return { code, tableId, players, host, all };
}

type Table = Awaited<ReturnType<typeof table>>;

async function begin({ code, tableId, players, host, all }: Table): Promise<void> {
  for (const player of players) expect(await send(player, "table:ready", { ready: true })).toEqual({ ok: true });
  expect(await send(host ?? players[0], "table:start")).toEqual({ ok: true });
  await settled(all, code, tableId);
}

const act = (c: Client, action: unknown, expectedRevision = lastTable(c).revision) =>
  send(c, "table:action", { actionId: `t${(nextId += 1)}`, expectedRevision, action });

/** People act from what their own snapshot tells them, until `done` or the game is over. */
async function play(
  { code, tableId, game }: { code: string; tableId: TableId; game: string },
  players: Client[],
  all: Client[],
  done: (view: any) => boolean = () => false,
): Promise<void> {
  for (let guard = 0; guard < 20000; guard += 1) {
    const view = lastTable(players[0]).view;
    if (view.phase === "game-over" || done(view)) return;
    const actor = view.phase === "hand-over" ? players[0] : players.find((p) => lastTable(p).view.legal)!;
    const action = view.phase === "hand-over" ? { type: "next-hand" } : GAMES[game].chooseAction(lastTable(actor).view);
    expect(await act(actor, action)).toMatchObject({ ok: true });
    await settled(all, code, tableId);
  }
  throw new Error("Game did not finish");
}

const CARD = /"((?:clubs|diamonds|hearts|spades)-\d+|joker-(?:little|big))"/g;
const cardIds = (value: unknown): string[] => [...JSON.stringify(value ?? null).matchAll(CARD)].map((m) => m[1]);

/** At every revision of a live hand, nobody's snapshot contains a card from someone else's hand. */
function expectHandsPrivate(all: Client[]): void {
  const byRevision = new Map<number, Snap[]>();
  for (const c of all) {
    for (const snap of c.tables) {
      if (!snap.view) continue;
      // Each connection only ever gets its own seat's view.
      expect(snap.you).toBe(c.seat);
      if (snap.you === null) {
        expect(snap.view.hand).toBeNull();
        expect(snap.view.legal).toBeNull();
      }
      if (snap.view.phase === "hand-over" || snap.view.phase === "game-over") continue;
      byRevision.set(snap.revision, [...(byRevision.get(snap.revision) ?? []), snap]);
    }
  }
  let compared = 0;
  for (const snaps of byRevision.values()) {
    for (const owner of snaps) {
      if (owner.you === null) continue;
      const held = new Set(cardIds(owner.view.hand));
      for (const other of snaps) {
        // The same seat's snapshot can arrive twice for one revision.
        if (other.you === owner.you) continue;
        expect(cardIds(other.view).filter((id) => held.has(id))).toEqual([]);
        compared += 1;
      }
    }
  }
  expect(compared).toBeGreaterThan(0);
}

/** Card faces never travel in the public room snapshot. */
function expectRoomsPublic(all: Client[]): void {
  // Table ids such as "spades-2" look like card ids, so they are left out of the search.
  const rooms = all.flatMap((c) => c.rooms).map((room) => room.tables.map(({ seats, host, options }) => [seats, host, options]));
  expect(cardIds(rooms)).toEqual([]);
}

describe("rooms", () => {
  it("creates a room with a code and lets others join by it in any letter case", async () => {
    const a = await enter("  Ada\u0007  ");
    const { code, memberId, token } = a.joined!;
    expect(code).toHaveLength(8);
    expect([...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch))).toBe(true);
    expect(token.length).toBeGreaterThanOrEqual(22); // 128 bits in base64url
    const b = await enter("Bo", `  ${code.toLowerCase()} `);
    expect(b.joined!.code).toBe(code);
    expect(b.joined!.memberId).not.toBe(memberId);
    await until(() => lastRoom(a)?.members.length === 2 && lastRoom(b)?.members.length === 2);
    expect(lastRoom(a)).toMatchObject({ code, you: memberId });
    expect(lastRoom(b).you).toBe(b.joined!.memberId);
    expect(lastRoom(a).members).toEqual([
      { id: memberId, name: "Ada", connected: true, tableId: null },
      { id: b.joined!.memberId, name: "Bo", connected: true, tableId: null },
    ]);
    expect(lastRoom(a).tables.map((t) => [t.id, t.game, t.status])).toEqual([
      ["tonk-1", "tonk", "available"],
      ["tonk-2", "tonk", "available"],
      ["spades-1", "spades", "available"],
      ["spades-2", "spades", "available"],
      ["bid-whist-1", "bid-whist", "available"],
      ["bid-whist-2", "bid-whist", "available"],
    ]);
  });

  it("refuses bad codes, bad names and requests from outside a room", async () => {
    const a = await enter("Ada");
    const c = await client();
    for (const code of ["ZZZZZZZZ", "", 7, null, undefined]) {
      expect(await send(c, "room:join", { code, name: "Cy" })).toMatchObject({ ok: false, error: "no-such-room" });
    }
    for (const name of ["", "   ", "\u0000\u0007", "x".repeat(21), 5, null, undefined, { a: 1 }]) {
      expect(await send(c, "room:create", { name })).toMatchObject({ ok: false, error: "bad-request" });
      expect(await send(c, "room:join", { code: a.joined!.code, name })).toMatchObject({ ok: false, error: "bad-request" });
    }
    for (const event of ["room:leave", "table:stand", "table:start", "table:reset", "table:action", "table:sit"]) {
      expect(await send(c, event, { tableId: "tonk-1", role: "player" })).toMatchObject({ ok: false, error: "not-in-room" });
    }
    expect(await send(c, "room:resume", { token: "nope" })).toMatchObject({ ok: false, error: "bad-token" });
    expect(await send(c, "room:resume", { token: a.joined!.memberId })).toMatchObject({ ok: false, error: "bad-token" });
    expect(await send(a, "room:create", { name: "Again" })).toMatchObject({ ok: false, error: "bad-request" });
    expect(server.rooms.rooms.size).toBe(1);
  });

  it("refuses the 33rd member", async () => {
    const first = await enter("M0");
    for (let i = 1; i < MAX_ROOM_MEMBERS; i += 1) await enter(`M${i}`, first.joined!.code);
    const extra = await client();
    expect(await send(extra, "room:join", { code: first.joined!.code, name: "Late" })).toMatchObject({ ok: false, error: "room-full" });
    await until(() => lastRoom(first).members.length === MAX_ROOM_MEMBERS);
  });

  it("deletes a room when its last member leaves or times out", async () => {
    const a = await enter("Ada");
    const b = await enter("Bo", a.joined!.code);
    expect(await send(a, "room:leave")).toEqual({ ok: true });
    await until(() => lastRoom(b).members.length === 1);
    expect(server.rooms.rooms.size).toBe(1);
    expect(await send(a, "room:resume", { token: a.joined!.token })).toMatchObject({ ok: false, error: "bad-token" });
    b.socket.close();
    await until(() => server.rooms.rooms.size === 0, "the hold to expire");
  });

  it("answers an event sent with no payload, a non-object payload or extra arguments", async () => {
    const c = await client();
    const reply = (...args: unknown[]) => new Promise((resolve) => c.socket.emit("table:stand", ...args, resolve));
    for (const args of [[], [{}, "extra"], ["text"], [null], [[1, 2]]]) {
      expect(await reply(...args)).toMatchObject({ ok: false, error: "not-in-room" });
    }
    c.socket.emit("room:create"); // no ack at all
    c.socket.emit("pose");
    c.socket.emit("pose", "text");
    const joined = await send(c, "room:create", { name: "Still here" });
    expect(joined).toMatchObject({ ok: true });
    tokens.push(joined.token);
  });

  it("throttles a socket that sends too fast and lets it back in at the refill rate", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); // the clock only moves when the test moves it
    await boot({ rateLimit: { burst: 2, perSecond: 2 } });
    const c = await enter("Ada");
    expect(await send(c, "table:sit", { tableId: "tonk-1", role: "player" })).toMatchObject({ ok: true });
    expect(await send(c, "table:ready", { ready: true })).toMatchObject({ ok: false, error: "rate-limited" });
    vi.setSystemTime(Date.now() + 500); // half a second at 2 per second is one more event
    expect(await send(c, "table:ready", { ready: true })).toMatchObject({ ok: true });
    expect(await send(c, "table:start")).toMatchObject({ ok: false, error: "rate-limited" });
    expect(lastRoom(c).tables[0].status).toBe("lobby");
  });

  it("refuses a new room once the server holds MAX_ROOMS", () => {
    const rooms = new Rooms(() => {});
    try {
      for (let i = 0; i < MAX_ROOMS; i += 1) rooms.create("Ada");
      expect(() => rooms.create("Ada")).toThrow("The server is full");
      expect(rooms.rooms.size).toBe(MAX_ROOMS);
    } finally {
      rooms.close();
    }
  });

  it("accepts a handshake only from its own or an allowed Origin", async () => {
    process.env.ALLOWED_ORIGINS = "https://play.example";
    try {
      await boot();
      const { port } = server.http.address() as AddressInfo;
      const connects = (origin: string) =>
        new Promise<boolean>((resolve) => {
          const socket = connect(`http://localhost:${port}`, {
            transports: ["websocket"],
            forceNew: true,
            reconnection: false,
            extraHeaders: { Origin: origin },
          });
          socket.once("connect", () => (socket.close(), resolve(true)));
          socket.once("connect_error", () => (socket.close(), resolve(false)));
        });
      expect(await connects("https://evil.example")).toBe(false);
      expect(await connects("null")).toBe(false);
      expect(await connects("https://play.example")).toBe(true);
      expect(await connects(`http://localhost:${port}`)).toBe(true);
    } finally {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  it("shares valid poses about ten times a second and drops invalid ones", async () => {
    const a = await enter("Ada");
    const b = await enter("Bo", a.joined!.code);
    a.socket.emit("pose", { x: 1, z: -2, ry: 0.5, extra: "dropped" });
    await until(() => a.joined!.memberId in (b.poses.at(-1) ?? {}), "poses");
    expect(b.poses.at(-1)).toEqual({ [a.joined!.memberId]: { x: 1, z: -2, ry: 0.5 } });
    for (const bad of [{ x: 201, z: 0, ry: 0 }, { x: 0, z: "1", ry: 0 }, { x: 0, z: 0 }, { x: null, z: 0, ry: 0 }, { x: 0, z: 0, ry: -1e9 }]) {
      a.socket.emit("pose", bad);
    }
    b.socket.emit("pose", { x: 3, z: 4, ry: 0 });
    await until(() => Object.keys(a.poses.at(-1) ?? {}).length === 2, "both poses");
    expect(a.poses.at(-1)).toEqual({ [a.joined!.memberId]: { x: 1, z: -2, ry: 0.5 }, [b.joined!.memberId]: { x: 3, z: 4, ry: 0 } });
    const sent = a.poses.length;
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(a.poses.length).toBe(sent); // nothing changed, nothing sent
  });

  it("shares a pose's feet height when it is sent and in range, and drops the whole pose when it is not", async () => {
    const a = await enter("Ada");
    const b = await enter("Bo", a.joined!.code);
    const seen = () => b.poses.at(-1)?.[a.joined!.memberId] as { x: number; y?: number } | undefined;
    a.socket.emit("pose", { x: 1, z: -2, ry: 0.5, y: 0.75 });
    await until(() => seen() !== undefined, "the pose");
    expect(seen()).toEqual({ x: 1, z: -2, ry: 0.5, y: 0.75 });
    // The limits themselves are allowed: below the bottom of the pool, and well above any jump.
    for (const y of [-3, 5, 0]) {
      a.socket.emit("pose", { x: 2, z: -2, ry: 0.5, y });
      await until(() => seen()?.x === 2 && seen()?.y === y, `the pose at height ${y}`);
    }
    // No height at all is a pose on the floor, which is what an older client sends.
    a.socket.emit("pose", { x: 3, z: -2, ry: 0.5 });
    await until(() => seen()?.x === 3, "the pose with no height");
    expect(seen()).toEqual({ x: 3, z: -2, ry: 0.5 });
    // A bad height drops the whole pose, its position included.
    const sent = b.poses.length;
    for (const y of [5.01, -3.01, "1", null, true, [1], {}]) a.socket.emit("pose", { x: 9, z: 9, ry: 0, y });
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(b.poses.length).toBe(sent);
    expect(seen()).toEqual({ x: 3, z: -2, ry: 0.5 });
  });
});

describe("tables", () => {
  it("seats four players and a host and turns a sixth person away", async () => {
    const { code, tableId, players, host } = await table(4, true);
    const extra = await enter("Extra", code);
    const sit = (payload: object) => send(extra, "table:sit", { tableId, role: "player", ...payload });
    expect(await sit({})).toMatchObject({ ok: false, error: "table-full" });
    expect(await sit({ seat: 2 })).toMatchObject({ ok: false, error: "seat-taken" });
    expect(await sit({ role: "host" })).toMatchObject({ ok: false, error: "host-taken" });
    expect(await sit({ tableId: "poker-1" })).toMatchObject({ ok: false, error: "no-such-table" });
    expect(await sit({ tableId: "toString" })).toMatchObject({ ok: false, error: "no-such-table" });
    expect(await sit({ role: "dealer" })).toMatchObject({ ok: false, error: "bad-request" });
    for (const seat of [4, -1, 1.5, "0", null]) expect(await sit({ seat })).toMatchObject({ ok: false, error: "bad-request" });
    for (const event of ["table:stand", "table:ready", "table:options", "table:start", "table:action", "table:reset"]) {
      expect(await send(extra, event, { ready: true })).toMatchObject({ ok: false, error: "not-at-table" });
    }
    expect(await send(players[0], "table:sit", { tableId: "bid-whist-2", role: "player" })).toMatchObject({ ok: false, error: "already-seated" });
    expect(await send(host!, "table:sit", { tableId: "tonk-1", role: "host" })).toMatchObject({ ok: false, error: "already-seated" });
    expect(await send(host!, "table:ready", { ready: true })).toMatchObject({ ok: false, error: "not-a-player" });

    await until(() => lastRoom(extra).members.length === 6);
    const summary = summaryOf(extra, tableId);
    expect(summary.status).toBe("lobby");
    expect(summary.seats.map((s) => [s.occupant, s.memberId, s.ready])).toEqual(players.map((p) => ["human", p.joined!.memberId, false]));
    expect(summary.host).toEqual({ memberId: host!.joined!.memberId, name: "Host", connected: true });
    expect(summary.managerId).toBe(host!.joined!.memberId);
    for (const [seat, player] of players.entries()) expect(lastTable(player)).toEqual({ tableId, game: "bid-whist", revision: 0, you: seat, view: null });
    expect(lastTable(host!)).toMatchObject({ you: null, view: null });
    expect(extra.tables).toEqual([]);
  });

  it("lets only the manager set house rules and start, and only when everyone is ready", async () => {
    const a = await enter("Ada");
    const code = a.joined!.code;
    const b = await enter("Bo", code);
    const tableId: TableId = "spades-1";
    expect(await send(a, "table:sit", { tableId, role: "player", seat: 2 })).toEqual({ ok: true, seat: 2 });
    expect(await send(b, "table:sit", { tableId, role: "player" })).toEqual({ ok: true, seat: 0 });
    [a.seat, b.seat] = [2, 0];
    await until(() => summaryOf(a, tableId).seats[0].occupant === "human");
    expect(summaryOf(a, tableId).managerId).toBe(a.joined!.memberId); // seated longest

    const rules = { preset: "jokers", target: 100, nil: true, bagPenalty: false };
    expect(await send(b, "table:options", { options: rules })).toMatchObject({ ok: false, error: "not-manager" });
    expect(await send(b, "table:start")).toMatchObject({ ok: false, error: "not-manager" });
    expect(await send(a, "table:options", { options: { ...rules, target: 7 } })).toMatchObject({ ok: false, error: "illegal" });
    expect(await send(a, "table:options", { options: "house" })).toMatchObject({ ok: false, error: "illegal" });
    expect(await send(a, "table:ready", { ready: "yes" })).toMatchObject({ ok: false, error: "bad-request" });
    expect(await send(a, "table:ready", { ready: true })).toEqual({ ok: true });
    expect(await send(b, "table:ready", { ready: true })).toEqual({ ok: true });
    expect(await send(a, "table:options", { options: { ...rules, sneaky: 1 } })).toEqual({ ok: true });
    await until(() => (summaryOf(b, tableId).options as any).preset === "jokers");
    expect(summaryOf(b, tableId).options).toEqual(rules);
    expect(summaryOf(b, tableId).seats.map((s) => s.ready)).toEqual([false, false, false, false]);

    expect(await send(a, "table:start")).toMatchObject({ ok: false, error: "not-ready" });
    expect(await send(a, "table:ready", { ready: true })).toEqual({ ok: true });
    expect(await send(a, "table:start")).toMatchObject({ ok: false, error: "not-ready" });
    expect(await send(a, "table:reset")).toMatchObject({ ok: false, error: "not-started" });
    expect(await send(a, "table:action", { actionId: "x", expectedRevision: 0, action: {} })).toMatchObject({ ok: false, error: "not-started" });
    expect(await send(b, "table:ready", { ready: true })).toEqual({ ok: true });
    expect(await send(a, "table:start")).toEqual({ ok: true });
    await settled([a, b], code, tableId);
    expect(lastTable(a).view.options).toEqual(rules);
    await until(() => summaryOf(b, tableId).status === "playing");
    expect(summaryOf(b, tableId).seats.map((s) => s.occupant)).toEqual(["human", "bot", "human", "bot"]);

    // Mid-match: no new players, no rule changes, no second start; a host may still arrive and go.
    const late = await enter("Late", code);
    expect(await send(late, "table:sit", { tableId, role: "player" })).toMatchObject({ ok: false, error: "in-play" });
    expect(await send(late, "table:sit", { tableId, role: "player", seat: 1 })).toMatchObject({ ok: false, error: "in-play" });
    expect(await send(a, "table:options", { options: rules })).toMatchObject({ ok: false, error: "in-play" });
    expect(await send(a, "table:start")).toMatchObject({ ok: false, error: "in-play" });
    expect(await send(a, "table:ready", { ready: false })).toMatchObject({ ok: false, error: "in-play" });
    const before = revision(code, tableId);
    expect(await send(late, "table:sit", { tableId, role: "host" })).toEqual({ ok: true, seat: null });
    late.seat = null;
    await until(() => lastTable(late)?.view);
    expect(lastTable(late)).toMatchObject({ you: null, revision: before });
    expect(lastTable(late).view.hand).toBeNull();
    expect(lastTable(late).view.legal).toBeNull();
    await until(() => summaryOf(a, tableId).managerId === late.joined!.memberId);
    expect(await send(late, "table:stand")).toEqual({ ok: true });
    expect(late.left).toEqual([{ tableId }]);
    await until(() => summaryOf(a, tableId).managerId === a.joined!.memberId);
    expect(revision(code, tableId)).toBe(before);
    expectHandsPrivate([a, b, late]);
  });

  it("clears the match when its last player leaves, keeping the lobby for a host", async () => {
    const t = await table(1, true, "tonk");
    await begin(t);
    const [player] = t.players;
    expect(await send(player, "table:stand")).toEqual({ ok: true });
    expect(player.left).toEqual([{ tableId: t.tableId }]);
    await until(() => lastTable(t.host!).view === null && summaryOf(t.host!, t.tableId).status === "lobby");
    expect(serverMatch(t.code, t.tableId)).toBeNull();
    expect(summaryOf(t.host!, t.tableId).seats.map((s) => s.occupant)).toEqual(["open", "open", "open", "open"]);
    expect(t.host!.left).toEqual([]);
    expect(await send(player, "table:sit", { tableId: t.tableId, role: "player", seat: 3 })).toEqual({ ok: true, seat: 3 });
    expect(await send(t.host!, "table:stand")).toEqual({ ok: true });
    expect(await send(player, "table:stand")).toEqual({ ok: true });
    await until(() => summaryOf(t.host!, t.tableId).status === "available");
    expect(lastRoom(player).members.map((m) => m.tableId)).toEqual([null, null]);
  });
});

describe("abandoning a match", () => {
  it("lets the manager clear a live match, which takes every other player off the table", async () => {
    const t = await table(2, true, "spades");
    const [a, b] = t.players;
    await begin(t);
    expect(await send(a, "table:reset")).toMatchObject({ ok: false, error: "not-manager" });
    expect(await send(t.host!, "table:stand")).toEqual({ ok: true });
    await until(() => summaryOf(a, t.tableId).managerId === a.joined!.memberId);
    expect(await send(a, "table:reset")).toEqual({ ok: true });
    await until(() => summaryOf(b, t.tableId).status === "lobby" && lastTable(a).view === null);
    expect(serverMatch(t.code, t.tableId)).toBeNull();
    expect(b.left).toEqual([{ tableId: t.tableId }]);
    expect(a.left).toEqual([]);
    expect(summaryOf(b, t.tableId).seats.map((s) => [s.occupant, s.ready])).toEqual([["human", false], ["open", false], ["open", false], ["open", false]]);
    // The player who was removed can sit again and a new match can start.
    expect(await send(b, "table:sit", { tableId: t.tableId, role: "player" })).toEqual({ ok: true, seat: 1 });
    await begin({ ...t, host: null, all: t.players });
  });
});

describe("actions", () => {
  it("lets the host deal the next hand and nothing else", async () => {
    await boot({ shuffle: seededShuffle(1) });
    const t = await table(1, true, "tonk");
    const { code, tableId, players, host, all } = t;
    await begin(t);
    await play({ ...t, game: "tonk" }, players, all, (view) => view.phase === "hand-over");
    expect(lastTable(host!).view.phase).toBe("hand-over");
    const before = revision(code, tableId);
    expect(await act(host!, { type: "pass" })).toMatchObject({ ok: false, error: "not-a-player" });
    // Seat 0 reusing the host's action id is a different action, not a repeat.
    const request = { actionId: "deal", expectedRevision: before, action: { type: "next-hand" } };
    expect(await send(host!, "table:action", request)).toMatchObject({ ok: true, revision: before + 1 });
    expect(await send(players[0], "table:action", request)).toMatchObject({ ok: false, error: "stale-revision" });
    await settled(all, code, tableId);
    expect(lastTable(players[0]).view.phase).not.toBe("hand-over");
  });

  it("applies a repeat once and refuses reused ids, stale revisions, out-of-turn, host and malformed actions", async () => {
    const t = await table(4, true);
    const { code, tableId, players, host, all } = t;
    await begin(t);
    const outsider = await enter("Out", code);
    const start = revision(code, tableId);
    const replies: unknown[] = [];
    const keep = <T>(reply: T): T => (replies.push(reply), reply);

    // Seat 1 opens. The same request sent twice lands once.
    const request = { actionId: "open", expectedRevision: start, action: GAMES["bid-whist"].chooseAction(lastTable(players[1]).view) };
    const [first, second] = await Promise.all([send(players[1], "table:action", request), send(players[1], "table:action", request)]);
    expect(keep(first)).toEqual({ ok: true, revision: start + 1 });
    expect(keep(second)).toEqual({ ok: true, revision: start + 1, duplicate: true });
    expect(revision(code, tableId)).toBe(start + 1);
    await settled(all, code, tableId);
    expect(lastTable(players[0]).view.auction).toHaveLength(1);

    const pass = { type: "bid", bid: null };
    const good = { actionId: "x", expectedRevision: start + 1, action: pass };
    const rejected = [
      [await send(players[1], "table:action", { ...request, action: { ...pass, again: 1 } }), "action-id-reused"],
      [await act(players[2], pass, start), "stale-revision"],
      [await act(players[0], pass), "illegal"],
      [await act(players[2], { type: "play", cardId: lastTable(players[2]).view.hand[0].id }), "illegal"],
      [await send(players[2], "table:action", { ...good, actionId: "" }), "bad-request"],
      [await send(players[2], "table:action", { ...good, expectedRevision: "1" }), "bad-request"],
      [await send(players[2], "table:action", { ...good, action: "pass" }), "bad-request"],
      [await send(players[2], "table:action", null), "bad-request"],
      [await act(players[2], { type: "bid", bid: null, pad: "x".repeat(3000) }), "bad-request"],
      [await act(host!, pass), "not-a-player"],
      [await send(outsider, "table:action", good), "not-at-table"],
    ] as const;
    for (const [reply, error] of rejected) expect(keep(reply)).toMatchObject({ ok: false, error });
    expect(revision(code, tableId)).toBe(start + 1);

    // Two seats act on the same revision at once: only the seat on turn gets through.
    const race = await Promise.all([act(players[3], pass), act(players[2], pass)]);
    race.forEach(keep);
    expect(race.map((r) => r.ok)).toEqual([false, true]);
    expect(revision(code, tableId)).toBe(start + 2);

    expect(cardIds(replies)).toEqual([]);
    await settled(all, code, tableId);
    expectHandsPrivate(all);
    expectRoomsPublic([...all, outsider]);
  });
});

describe("full games", () => {
  for (const game of GAME_IDS) {
    it(`${game}: four players and a host play to results, no hand is ever visible to another, then reset`, async () => {
      await boot({ shuffle: seededShuffle(1) });
      const t = await table(4, true, game);
      const { tableId, players, host, all } = t;
      await begin(t);
      for (const c of all) expect(lastTable(c)).toMatchObject({ tableId, game });
      await play({ ...t, game }, players, all);
      for (const c of all) expect(lastTable(c).view.phase).toBe("game-over");
      await until(() => all.every((c) => summaryOf(c, tableId).status === "results"));
      expectHandsPrivate(all);
      expectRoomsPublic(all);

      expect(await act(players[0], { type: "next-hand" })).toMatchObject({ ok: false, error: "illegal" });
      expect(await send(players[0], "table:reset")).toMatchObject({ ok: false, error: "not-manager" });
      expect(await send(host!, "table:reset")).toEqual({ ok: true });
      await until(() => all.every((c) => summaryOf(c, tableId).status === "lobby" && lastTable(c).view === null));
      expect(summaryOf(host!, tableId).seats.map((s) => [s.occupant, s.ready])).toEqual(Array(4).fill(["human", false]));
      // The creator saw every status the table went through, in order.
      const statuses = players[0].rooms.map((room) => room.tables.find((x) => x.id === tableId)!.status);
      expect(statuses.filter((status, i) => status !== statuses[i - 1])).toEqual(["available", "lobby", "playing", "results", "lobby"]);
    }, 120_000); // a whole game over real sockets, one round trip per move

    it(`${game}: one player and three bots play to results`, async () => {
      await boot({ shuffle: seededShuffle(1) });
      const t = await table(1, false, game);
      await begin(t);
      expect(summaryOf(t.players[0], t.tableId).seats.map((s) => s.occupant)).toEqual(["human", "bot", "bot", "bot"]);
      await play({ ...t, game }, t.players, t.all);
      expect(lastTable(t.players[0]).view.phase).toBe("game-over");
      await until(() => summaryOf(t.players[0], t.tableId).status === "results");
      expect(await send(t.players[0], "table:reset")).toEqual({ ok: true });
      await until(() => summaryOf(t.players[0], t.tableId).seats[1].occupant === "open");
    }, 120_000);
  }
});

describe("reconnecting", () => {
  it("gives a player who resumes within the hold the same seat, fresh snapshots and an unchanged match", async () => {
    await boot({ holdMs: 30_000 });
    const t = await table(4, true);
    const { code, tableId, players, all } = t;
    await begin(t);
    const dropped = players[1];
    const { memberId, token } = dropped.joined!;
    const before = lastTable(dropped);
    dropped.socket.close();
    await until(() => summaryOf(players[0], tableId).seats[1].connected === false);
    expect(summaryOf(players[0], tableId).seats[1]).toMatchObject({ occupant: "human", memberId });
    expect(lastRoom(players[0]).members.find((m) => m.id === memberId)).toMatchObject({ connected: false, tableId });

    const stranger = await client();
    expect(await send(stranger, "room:resume", { token: `${token}x` })).toMatchObject({ ok: false, error: "bad-token" });
    expect(await send(stranger, "room:resume", { token: 12 })).toMatchObject({ ok: false, error: "bad-token" });
    expect(await send(stranger, "room:resume", {})).toMatchObject({ ok: false, error: "bad-token" });
    // A connection that already speaks for one member cannot take over another.
    expect(await send(players[0], "room:resume", { token })).toMatchObject({ ok: false, error: "bad-request" });

    const back = await client();
    expect(await send(back, "room:resume", { token })).toEqual({ ok: true, code, memberId, token });
    back.seat = dropped.seat;
    await until(() => back.rooms.length > 0 && back.tables.length > 0);
    expect(lastTable(back)).toEqual(before);
    expect(lastRoom(back).you).toBe(memberId);
    await until(() => summaryOf(players[0], tableId).seats[1].connected === true);
    expect(revision(code, tableId)).toBe(before.revision);

    // The resumed connection plays on: seat 1 opens the auction.
    expect(await act(back, GAMES["bid-whist"].chooseAction(lastTable(back).view))).toMatchObject({ ok: true });
    await settled([...all.filter((c) => c !== dropped), back], code, tableId);
    expectHandsPrivate([...all, back]);
  });

  it("lets a second connection take over from the first", async () => {
    await boot({ holdMs: 30_000 });
    const t = await table(2);
    const [a, first] = t.players;
    const { memberId, token } = first.joined!;
    const second = await client();
    expect(await send(second, "room:resume", { token })).toMatchObject({ ok: true, memberId });
    await until(() => first.socket.disconnected && second.tables.length > 0);
    expect(lastTable(second)).toMatchObject({ tableId: t.tableId, you: 1 });
    // The first connection closing must not mark the member as gone.
    expect(await send(second, "table:ready", { ready: true })).toEqual({ ok: true });
    await until(() => summaryOf(a, t.tableId).seats[1].ready);
    expect(summaryOf(a, t.tableId).seats[1]).toMatchObject({ memberId, connected: true });
    expect(lastRoom(a).members).toHaveLength(2);
  });

  it("hands the seat to a bot when the hold expires, and the others finish the hand", async () => {
    const t = await table(4);
    const { code, tableId, players } = t;
    await begin(t);
    const gone = players[1]; // seat 1 is on turn
    gone.socket.close();
    const rest = players.filter((p) => p !== gone);
    await until(() => summaryOf(rest[0], tableId).seats[1].occupant === "bot", "the hold to expire");
    expect(lastRoom(rest[0]).members).toHaveLength(3);
    await settled(rest, code, tableId);
    expect(lastTable(rest[0]).view.auction.length).toBeGreaterThanOrEqual(1);
    await play({ ...t, game: "bid-whist" }, rest, rest, (view) => view.phase === "hand-over");
    expect(["hand-over", "game-over"]).toContain(lastTable(rest[0]).view.phase);
    expectHandsPrivate(players);

    const late = await client();
    expect(await send(late, "room:resume", { token: gone.joined!.token })).toMatchObject({ ok: false, error: "bad-token" });
  });

  it("opens a lobby seat when its player's hold expires", async () => {
    const t = await table(2);
    t.players[1].socket.close();
    await until(() => summaryOf(t.players[0], t.tableId).seats[1].occupant === "open", "the hold to expire");
    expect(lastRoom(t.players[0]).members).toHaveLength(1);
  });
});

describe("static files", () => {
  const fetchPath = (path: string, method = "GET") =>
    new Promise<{ status: number; type: string | undefined; body: string }>((resolve, reject) => {
      const { port } = server.http.address() as AddressInfo;
      // http.get sends the path exactly as written; fetch would normalise ".." away.
      get({ port, path, method }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode!, type: res.headers["content-type"], body }));
      }).on("error", reject);
    });

  it("serves the built client, falls back to index.html and refuses to leave its folder", async () => {
    const outer = mkdtempSync(join(tmpdir(), "room-static-"));
    const root = join(outer, "dist");
    mkdirSync(join(root, "assets"), { recursive: true });
    writeFileSync(join(outer, "secret.txt"), "SECRET");
    writeFileSync(join(root, "index.html"), "<!doctype html><title>home</title>");
    writeFileSync(join(root, "assets", "app.js"), "console.log(1)");
    await boot();
    server.http.on("request", serveStatic(root));

    expect(await fetchPath("/")).toMatchObject({ status: 200, type: "text/html; charset=utf-8", body: expect.stringContaining("home") });
    expect(await fetchPath("/assets/app.js?v=1")).toEqual({ status: 200, type: "text/javascript; charset=utf-8", body: "console.log(1)" });
    expect(await fetchPath("/some/client/route")).toMatchObject({ status: 200, body: expect.stringContaining("home") });
    expect(await fetchPath("/assets/app.js", "HEAD")).toMatchObject({ status: 200, body: "" });
    for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt", "/..%5csecret.txt", "/assets/../../secret.txt"]) {
      const reply = await fetchPath(path);
      expect(reply.body).not.toContain("SECRET");
      expect([200, 403]).toContain(reply.status);
    }
    expect((await fetchPath("/..%2fsecret.txt")).status).toBe(403);
    expect((await fetchPath("/%E0%A4%A")).status).toBe(400);
    expect((await fetchPath("/", "POST")).status).toBe(405);
    // Socket.IO still answers its own paths.
    const c = await enter("Ada");
    expect(c.joined!.code).toHaveLength(8);
  });
});
