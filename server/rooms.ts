/**
 * Rooms, their six tables and who sits where, independent of the network.
 * The caller binds members to connections and passes `emit`; a refused
 * request throws Refusal.
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { Card } from "../shared/cards";
import {
  MAX_NAME_LENGTH,
  MAX_ROOM_MEMBERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  SEAT_HOLD_MS,
  TABLES,
  type ErrorCode,
  type GameId,
  type GameView,
  type Joined,
  type Pose,
  type Poses,
  type RoomSnapshot,
  type Seat,
  type SeatInfo,
  type ServerEvents,
  type TableId,
  type TableSnapshot,
  type TableStatus,
  type TableSummary,
} from "../shared/protocol";
import { GAMES } from "./games/index";
import { Match, type ActionReply, type ActionRequest } from "./match";

export class Refusal extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type Emit = <E extends keyof ServerEvents>(memberId: string, event: E, payload: Parameters<ServerEvents[E]>[0]) => void;

interface Member {
  id: string;
  token: string;
  name: string;
  room: Room;
  connected: boolean;
  table: Table | null;
  pose: Pose | null;
  hold: NodeJS.Timeout | null;
}

interface Table {
  id: TableId;
  game: GameId;
  options: unknown;
  seats: ({ member: Member; ready: boolean; since: number } | null)[];
  host: Member | null;
  match: Match | null;
}

interface Room {
  code: string;
  members: Map<string, Member>;
  tables: Table[];
  /** Orders arrivals at tables, to find the longest-seated player. */
  arrivals: number;
  posesChanged: boolean;
}

const SEATS: readonly Seat[] = [0, 1, 2, 3];
const POSE_LIMIT = 200;
// shortcut: a global cap, so about 500 held-open sockets can block new rooms; upgrade to a per-IP room limit if that is abused.
export const MAX_ROOMS = 500;

function cleanName(name: unknown): string {
  const clean = typeof name === "string" ? name.replace(/\p{Cc}/gu, "").trim() : "";
  if (!clean || [...clean].length > MAX_NAME_LENGTH) {
    throw new Refusal("bad-request", `Names are 1 to ${MAX_NAME_LENGTH} characters`);
  }
  return clean;
}

function statusOf(table: Table): TableStatus {
  if (table.match) return table.match.state?.phase === "game-over" ? "results" : "playing";
  return table.host || table.seats.some(Boolean) ? "lobby" : "available";
}

function managerOf(table: Table): Member | null {
  if (table.host) return table.host;
  const seated = table.seats.filter((seat) => seat !== null);
  return seated.length ? seated.reduce((a, b) => (a.since <= b.since ? a : b)).member : null;
}

function summary(table: Table): TableSummary {
  return {
    id: table.id,
    game: table.game,
    status: statusOf(table),
    seats: table.seats.map(
      (seat): SeatInfo =>
        seat
          ? { occupant: "human", memberId: seat.member.id, name: seat.member.name, ready: seat.ready, connected: seat.member.connected }
          : { occupant: table.match ? "bot" : "open", memberId: null, name: null, ready: false, connected: false },
    ) as TableSummary["seats"],
    host: table.host && { memberId: table.host.id, name: table.host.name, connected: table.host.connected },
    managerId: managerOf(table)?.id ?? null,
    options: table.options,
  };
}

export class Rooms {
  readonly rooms = new Map<string, Room>();
  private readonly members = new Map<string, Member>();
  private readonly tokens = new Map<string, Member>();
  private readonly shuffle?: (deck: Card[]) => Card[];
  private readonly holdMs: number;
  private readonly botDelayMs: number;
  private readonly poseTimer: NodeJS.Timeout;
  private closed = false;

  constructor(
    private readonly emit: Emit,
    options: { shuffle?: (deck: Card[]) => Card[]; holdMs?: number; botDelayMs?: number } = {},
  ) {
    this.shuffle = options.shuffle;
    this.holdMs = options.holdMs ?? SEAT_HOLD_MS;
    this.botDelayMs = options.botDelayMs ?? 0;
    this.poseTimer = setInterval(() => this.sendPoses(), 100);
    this.poseTimer.unref();
  }

  /** Stops every timer; nothing is held or sent afterwards. */
  close(): void {
    this.closed = true;
    clearInterval(this.poseTimer);
    for (const member of this.members.values()) if (member.hold) clearTimeout(member.hold);
    for (const room of this.rooms.values()) for (const table of room.tables) table.match?.stop();
  }

  // ---- membership ----

  create(name: unknown): Joined {
    const clean = cleanName(name);
    if (this.rooms.size >= MAX_ROOMS) throw new Refusal("room-full", "The server is full; try again later");
    let code: string;
    do code = Array.from(randomBytes(ROOM_CODE_LENGTH), (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join("");
    while (this.rooms.has(code));
    const room: Room = {
      code,
      members: new Map(),
      tables: TABLES.map(({ id, game }) => ({
        id,
        game,
        options: GAMES[game].checkOptions(undefined),
        seats: [null, null, null, null],
        host: null,
        match: null,
      })),
      arrivals: 0,
      posesChanged: false,
    };
    this.rooms.set(code, room);
    return this.admit(room, clean);
  }

  join(code: unknown, name: unknown): Joined {
    const clean = cleanName(name);
    const room = typeof code === "string" ? this.rooms.get(code.trim().toUpperCase()) : undefined;
    if (!room) throw new Refusal("no-such-room", "No room has that code");
    if (room.members.size >= MAX_ROOM_MEMBERS) throw new Refusal("room-full", "That room is full");
    return this.admit(room, clean);
  }

  private admit(room: Room, name: string): Joined {
    const member: Member = {
      id: randomUUID(),
      token: randomBytes(32).toString("base64url"),
      name,
      room,
      connected: false,
      table: null,
      pose: null,
      hold: null,
    };
    room.members.set(member.id, member);
    this.members.set(member.id, member);
    this.tokens.set(member.token, member);
    return { code: room.code, memberId: member.id, token: member.token };
  }

  /** Who a resume token belongs to. The caller binds the connection, then calls connected(). */
  resume(token: unknown): Joined {
    const member = typeof token === "string" ? this.tokens.get(token) : undefined;
    if (!member) throw new Refusal("bad-token", "That session has ended; join the room again");
    return { code: member.room.code, memberId: member.id, token: member.token };
  }

  /** The member's connection is bound: mark them present and send them fresh snapshots. */
  connected(memberId: string): void {
    const member = this.members.get(memberId);
    if (!member) return;
    if (member.hold) clearTimeout(member.hold);
    member.hold = null;
    member.connected = true;
    member.room.posesChanged = true;
    this.sendRoom(member.room);
    if (member.table) this.sendTableTo(member.table, member);
  }

  /** The member's connection dropped: hold their place for a while, then remove them. */
  disconnected(memberId: string): void {
    const member = this.members.get(memberId);
    if (!member || this.closed) return;
    member.connected = false;
    member.room.posesChanged = true;
    if (member.hold) clearTimeout(member.hold);
    member.hold = setTimeout(() => {
      try {
        this.remove(member);
      } catch (error) {
        console.error("hold expiry failed:", error instanceof Error ? error.message : "unknown error");
      }
    }, this.holdMs);
    member.hold.unref();
    this.sendRoom(member.room);
  }

  leave(memberId: string | undefined): void {
    this.remove(this.need(memberId));
  }

  private remove(member: Member): void {
    const room = member.room;
    if (member.hold) clearTimeout(member.hold);
    // Forget the member first so they are gone even if handing their seat to a bot fails.
    room.members.delete(member.id);
    this.members.delete(member.id);
    this.tokens.delete(member.token);
    room.posesChanged = true;
    if (room.members.size === 0) {
      for (const table of room.tables) table.match?.stop();
      this.rooms.delete(room.code);
      return;
    }
    try {
      if (member.table) this.vacate(member);
    } finally {
      this.sendRoom(room);
    }
  }

  private need(memberId: string | undefined): Member {
    const member = memberId === undefined ? undefined : this.members.get(memberId);
    if (!member) throw new Refusal("not-in-room", "Join a room first");
    return member;
  }

  // ---- tables ----

  sit(memberId: string | undefined, payload: { tableId?: unknown; role?: unknown; seat?: unknown }): { seat: Seat | null } {
    const member = this.need(memberId);
    const { tableId, role, seat } = payload;
    if ((role !== "player" && role !== "host") || (seat !== undefined && !SEATS.includes(seat as Seat))) {
      throw new Refusal("bad-request", "Malformed request");
    }
    const table = member.room.tables.find((t) => t.id === tableId);
    if (!table) throw new Refusal("no-such-table", "There is no such table");
    if (member.table) throw new Refusal("already-seated", "Leave your table first");
    let taken: Seat | null = null;
    if (role === "host") {
      if (table.host) throw new Refusal("host-taken", "This table already has a host");
      table.host = member;
    } else {
      if (table.match) throw new Refusal("in-play", "Wait for this match to finish");
      if (seat !== undefined && table.seats[seat as Seat]) throw new Refusal("seat-taken", "That seat is taken");
      const open = (seat as Seat | undefined) ?? SEATS.find((s) => !table.seats[s]);
      if (open === undefined) throw new Refusal("table-full", "All four seats are taken");
      table.seats[open] = { member, ready: false, since: (member.room.arrivals += 1) };
      taken = open;
    }
    member.table = table;
    this.sendTable(table);
    this.sendRoom(member.room);
    return { seat: taken };
  }

  stand(memberId: string | undefined): void {
    const member = this.need(memberId);
    this.at(member);
    try {
      this.vacate(member);
    } finally {
      this.sendRoom(member.room);
    }
  }

  private vacate(member: Member): void {
    const table = member.table!;
    member.table = null;
    this.emit(member.id, "table:left", { tableId: table.id });
    if (table.host === member) {
      table.host = null;
    } else {
      const seat = table.seats.findIndex((s) => s?.member === member) as Seat;
      table.seats[seat] = null;
      if (table.match) {
        if (table.seats.some(Boolean)) table.match.leave(seat);
        else {
          // A match with no people left to play it is over.
          table.match.stop();
          table.match = null;
        }
      }
    }
    this.sendTable(table);
  }

  ready(memberId: string | undefined, ready: unknown): void {
    const member = this.need(memberId);
    const table = this.at(member);
    const seat = table.seats.find((s) => s?.member === member);
    if (!seat) throw new Refusal("not-a-player", "The host does not ready up");
    if (typeof ready !== "boolean") throw new Refusal("bad-request", "Malformed request");
    if (table.match) throw new Refusal("in-play", "The match has already started");
    seat.ready = ready;
    this.sendRoom(member.room);
  }

  options(memberId: string | undefined, options: unknown): void {
    const { member, table } = this.manager(memberId);
    if (table.match) throw new Refusal("in-play", "House rules are fixed once the match starts");
    table.options = GAMES[table.game].checkOptions(options);
    for (const seat of table.seats) if (seat) seat.ready = false;
    this.sendRoom(member.room);
  }

  start(memberId: string | undefined): void {
    const { member, table } = this.manager(memberId);
    if (table.match) throw new Refusal("in-play", "The match has already started");
    const seated = table.seats.filter((seat) => seat !== null);
    if (!seated.length) throw new Refusal("not-ready", "Seat at least one player first");
    if (!seated.every((seat) => seat.ready)) throw new Refusal("not-ready", "Every seated player must be ready");
    const match: Match = new Match(
      GAMES[table.game],
      table.options,
      this.shuffle,
      () => {
        if (table.match !== match) return;
        this.sendTable(table);
        if (statusOf(table) === "results") this.sendRoom(member.room);
      },
      this.botDelayMs,
    );
    for (const s of SEATS) match.humans[s] = table.seats[s] !== null;
    table.match = match;
    try {
      match.start();
    } catch (error) {
      match.stop();
      table.match = null;
      throw error;
    }
    this.sendRoom(member.room);
  }

  action(memberId: string | undefined, request: ActionRequest): ActionReply {
    const table = this.at(this.need(memberId));
    const seat = table.seats.findIndex((s) => s?.member.id === memberId);
    if (seat < 0) {
      // The host deals the next hand and does nothing else in play.
      const actionId = request?.actionId;
      if (table.host?.id !== memberId || !table.match || request?.action?.type !== "next-hand") {
        throw new Refusal("not-a-player", "The host does not play");
      }
      // The "h" prefix keeps the host's ids apart from seat 0's in the match's repeat check.
      return table.match.act(0, { ...request, actionId: typeof actionId === "string" ? `h${actionId}` : actionId });
    }
    if (!table.match) throw new Refusal("not-started", "The match has not started");
    return table.match.act(seat as Seat, request);
  }

  reset(memberId: string | undefined): void {
    const { member, table } = this.manager(memberId);
    if (!table.match) throw new Refusal("not-started", "There is no finished match to clear");
    if (statusOf(table) !== "results") {
      // Abandoning a live match: everyone else leaves the table, so an idle player cannot block the next start.
      for (const s of SEATS) {
        const other = table.seats[s]?.member;
        if (!other || other === member) continue;
        other.table = null;
        this.emit(other.id, "table:left", { tableId: table.id });
        table.seats[s] = null;
      }
    }
    table.match.stop();
    table.match = null;
    for (const seat of table.seats) if (seat) seat.ready = false;
    this.sendTable(table);
    this.sendRoom(member.room);
  }

  private at(member: Member): Table {
    if (!member.table) throw new Refusal("not-at-table", "You are not at a table");
    return member.table;
  }

  private manager(memberId: string | undefined): { member: Member; table: Table } {
    const member = this.need(memberId);
    const table = this.at(member);
    if (managerOf(table) !== member) throw new Refusal("not-manager", "Only the table's manager may do that");
    return { member, table };
  }

  // ---- poses ----

  /** Unacknowledged, so a bad pose is dropped silently. */
  pose(memberId: string | undefined, payload: { x?: unknown; z?: unknown; ry?: unknown }): void {
    const member = memberId === undefined ? undefined : this.members.get(memberId);
    const values = [payload.x, payload.z, payload.ry];
    if (!member || !values.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= POSE_LIMIT)) return;
    const [x, z, ry] = values as number[];
    member.pose = { x, z, ry };
    member.room.posesChanged = true;
  }

  private sendPoses(): void {
    for (const room of this.rooms.values()) {
      if (!room.posesChanged) continue;
      room.posesChanged = false;
      const present = [...room.members.values()].filter((member) => member.connected);
      const poses: Poses = {};
      for (const member of present) if (member.pose) poses[member.id] = member.pose;
      for (const member of present) this.emit(member.id, "poses", poses);
    }
  }

  // ---- snapshots ----

  private sendRoom(room: Room): void {
    const members = [...room.members.values()];
    const shared = {
      code: room.code,
      members: members.map((m) => ({ id: m.id, name: m.name, connected: m.connected, tableId: m.table?.id ?? null })),
      tables: room.tables.map(summary),
    };
    for (const member of members) {
      if (member.connected) this.emit(member.id, "room", { ...shared, you: member.id } satisfies RoomSnapshot);
    }
  }

  private sendTable(table: Table): void {
    for (const seat of table.seats) if (seat) this.sendTableTo(table, seat.member);
    if (table.host) this.sendTableTo(table, table.host);
  }

  /** Built for this recipient alone: their own seat's view, or the public view for the host. */
  private sendTableTo(table: Table, member: Member): void {
    if (!member.connected) return;
    const seat = table.seats.findIndex((s) => s?.member === member);
    const you = seat < 0 ? null : (seat as Seat);
    const snapshot: TableSnapshot = {
      tableId: table.id,
      game: table.game,
      revision: table.match?.revision ?? 0,
      you,
      view: (table.match?.view(you) ?? null) as GameView | null,
    };
    this.emit(member.id, "table", snapshot);
  }
}
