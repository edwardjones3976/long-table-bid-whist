/**
 * Rooms, their six tables and who sits where, independent of the network.
 * The caller binds members to connections and passes `emit`; a refused
 * request throws Refusal.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { cleanLook, gestureNow, HAND_HEIGHT, HAND_REACH, HEAD_TURN, isGesture, shuffleLook, STARTING_LOOKS, type Hand, type Look } from "../shared/avatar";
import type { Card } from "../shared/cards";
import {
  BENCH_MS,
  MAX_NAME_LENGTH,
  MAX_ROOM_MEMBERS,
  MAX_STRIKES,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  SEAT_HOLD_MS,
  TABLES,
  WALKERS,
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
  type Walker,
} from "../shared/protocol";
import { GAMES } from "./games/index";
import { Match, type ActionReply, type ActionRequest, type Pace } from "./match";

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
  look: Look;
  /** When recent look changes and gestures were allowed (Date.now() times), for their rate limits. */
  lookTimes: number[];
  gestureTimes: number[];
  hold: NodeJS.Timeout | null;
  /** Times this member was taken off a table for running out of time, and when their bench ends (Date.now() time). */
  // shortcut: kept on the member, so leaving and rejoining the room starts both afresh; key them by a stable identity if that is abused.
  removals: number;
  benchedUntil: number;
  /** When the member last came back after a dropped connection (Date.now() time), and the match whose one spared timeout they have used. */
  backAt: number;
  excused: Match | null;
}

interface Table {
  id: TableId;
  game: GameId;
  options: unknown;
  seats: ({ member: Member; ready: boolean; since: number } | null)[];
  host: Member | null;
  match: Match | null;
  /** Timed-out turns per seat in the current match. */
  strikes: [number, number, number, number];
  /** Each seat's look while a bot plays it: new at the match start, and for a seat a person leaves mid-match. */
  botLooks: Look[];
}

interface Room {
  code: string;
  members: Map<string, Member>;
  tables: Table[];
  /** Orders arrivals at tables, to find the longest-seated player. */
  arrivals: number;
  /** Members admitted so far: picks the starting look of anyone who brings none. */
  admitted: number;
  posesChanged: boolean;
  walkers: Walker[];
}

const SEATS: readonly Seat[] = [0, 1, 2, 3];
const POSE_LIMIT = 200;
/** Someone back from a dropped connection for less than this at their deadline counts as away. */
const RETURN_GRACE_MS = 10_000;
// shortcut: a global cap, so about 500 held-open sockets can block new rooms; upgrade to a per-IP room limit if that is abused.
export const MAX_ROOMS = 500;
const LOOK_RATE = { max: 5, ms: 10_000 };
const MAX_LOOK_BYTES = 4096;
const GESTURE_RATE = { max: 3, ms: 4_000 };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** A sliding window: true, and counted, while fewer than `max` were allowed in the last `ms`. */
function allow(times: number[], { max, ms }: { max: number; ms: number }): boolean {
  const now = Date.now();
  while (times.length && now - times[0] >= ms) times.shift();
  if (times.length >= max) return false;
  times.push(now);
  return true;
}

/** Clamped into reach; anything malformed is left out rather than refusing the whole pose. */
function cleanHead(head: unknown): Pose["head"] {
  if (!isRecord(head) || !finite(head.pitch) || !finite(head.yaw)) return undefined;
  return { pitch: clamp(head.pitch, -HEAD_TURN, HEAD_TURN), yaw: clamp(head.yaw, -HEAD_TURN, HEAD_TURN) };
}

function cleanHand(hand: unknown): Hand | null {
  if (!isRecord(hand) || !finite(hand.x) || !finite(hand.y) || !finite(hand.z)) return null;
  return { x: clamp(hand.x, -HAND_REACH, HAND_REACH), y: clamp(hand.y, 0, HAND_HEIGHT), z: clamp(hand.z, -HAND_REACH, HAND_REACH) };
}

function cleanHands(hands: unknown): Pose["hands"] {
  if (!Array.isArray(hands) || hands.length !== 2) return undefined;
  const both: [Hand | null, Hand | null] = [cleanHand(hands[0]), cleanHand(hands[1])];
  return both[0] || both[1] ? both : undefined;
}

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
    seats: table.seats.map((seat, s): SeatInfo => {
      if (seat) return { occupant: "human", memberId: seat.member.id, name: seat.member.name, ready: seat.ready, connected: seat.member.connected };
      const open: SeatInfo = { occupant: "open", memberId: null, name: null, ready: false, connected: false };
      return table.match ? { ...open, occupant: "bot", look: table.botLooks[s] } : open;
    }) as TableSummary["seats"],
    host: table.host && { memberId: table.host.id, name: table.host.name, connected: table.host.connected },
    managerId: managerOf(table)?.id ?? null,
    options: table.options,
    matchTime: table.match?.startedAt == null ? null : { elapsedMs: table.match.elapsedMs()!, running: table.match.endedAt === null },
  };
}

/** "9 minutes 5 seconds", rounded up so it never reads 0 while time is left. */
function minutesAndSeconds(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? "" : "s"}`;
  return `${unit(Math.floor(total / 60), "minute")} ${unit(total % 60, "second")}`;
}

export class Rooms {
  readonly rooms = new Map<string, Room>();
  private readonly members = new Map<string, Member>();
  private readonly tokens = new Map<string, Member>();
  private readonly shuffle?: (deck: Card[]) => Card[];
  private readonly holdMs: number;
  private readonly benchMs: number;
  private readonly pace: Pace;
  private readonly poseTimer: NodeJS.Timeout;
  private closed = false;

  constructor(
    private readonly emit: Emit,
    options: {
      shuffle?: (deck: Card[]) => Card[];
      holdMs?: number;
      botDelayMs?: number;
      trickPauseMs?: number;
      turnMs?: number;
      benchMs?: number;
    } = {},
  ) {
    this.shuffle = options.shuffle;
    this.holdMs = options.holdMs ?? SEAT_HOLD_MS;
    this.benchMs = options.benchMs ?? BENCH_MS;
    this.pace = { botMs: options.botDelayMs ?? 0, settleMs: options.trickPauseMs, turnMs: options.turnMs ?? 0 };
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

  /** `look` is cleaned; anything but an object gets a starting look by arrival order. */
  create(name: unknown, look?: unknown): Joined {
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
        strikes: [0, 0, 0, 0],
        botLooks: [],
      })),
      arrivals: 0,
      admitted: 0,
      posesChanged: false,
      walkers: Array.from({ length: WALKERS }, (_, loop) => ({
        id: `walker-${loop + 1}`,
        name: `Walker ${loop + 1}`,
        look: shuffleLook(Math.random),
        loop,
        since: Date.now(),
      })),
    };
    this.rooms.set(code, room);
    return this.admit(room, clean, look);
  }

  join(code: unknown, name: unknown, look?: unknown): Joined {
    const clean = cleanName(name);
    const room = typeof code === "string" ? this.rooms.get(code.trim().toUpperCase()) : undefined;
    if (!room) throw new Refusal("no-such-room", "No room has that code");
    if (room.members.size >= MAX_ROOM_MEMBERS) throw new Refusal("room-full", "That room is full");
    return this.admit(room, clean, look);
  }

  private admit(room: Room, name: string, look: unknown): Joined {
    const order = room.admitted++;
    const member: Member = {
      id: randomUUID(),
      token: randomBytes(32).toString("base64url"),
      name,
      room,
      connected: false,
      table: null,
      pose: null,
      // Nobody is a default person: without a look of their own, arrivals take turns through the starting looks.
      look: isRecord(look) ? cleanLook(look) : STARTING_LOOKS[order % STARTING_LOOKS.length],
      lookTimes: [],
      gestureTimes: [],
      hold: null,
      removals: 0,
      benchedUntil: 0,
      backAt: 0,
      excused: null,
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
    if (member.hold) {
      // Only a member on the hold is coming back from a drop; a first connection or a replaced socket is not.
      clearTimeout(member.hold);
      member.backAt = Date.now();
    }
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
    const bench = member.benchedUntil - Date.now();
    if (bench > 0) {
      throw new Refusal("benched", `You ran out of time on too many turns. You can take a seat again in ${minutesAndSeconds(bench)}.`);
    }
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

  /** `reason` tells a person the server removed why it did. */
  private vacate(member: Member, reason?: string): void {
    const table = member.table!;
    member.table = null;
    this.emit(member.id, "table:left", reason === undefined ? { tableId: table.id } : { tableId: table.id, reason });
    if (table.host === member) {
      table.host = null;
    } else {
      const seat = table.seats.findIndex((s) => s?.member === member) as Seat;
      table.seats[seat] = null;
      // Strikes belong to the person, not to the bot that takes the seat.
      table.strikes[seat] = 0;
      if (table.match) {
        if (table.seats.some(Boolean)) {
          table.match.leave(seat);
          table.botLooks[seat] = shuffleLook(Math.random);
        } else {
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
      { ...this.pace, onTimeout: (seat) => this.timedOut(table, match, seat) },
    );
    for (const s of SEATS) match.humans[s] = table.seats[s] !== null;
    table.match = match;
    table.strikes = [0, 0, 0, 0];
    // Only the seats bots play show theirs.
    table.botLooks = SEATS.map(() => shuffleLook(Math.random));
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

  /** A bot just played a person's whole turn because their time ran out. */
  private timedOut(table: Table, match: Match, seat: Seat): void {
    // Called from the match's timer, where nothing above could catch an error.
    try {
      const member = table.seats[seat]?.member;
      // A finished match (the bot played the last card) or one no longer at this table: no strike, no removal.
      if (table.match !== match || !member || match.endedAt !== null) return;
      // Away at the deadline (offline, or back for under RETURN_GRACE_MS): covered by the bot without a strike, but
      // only once a match, so a planned drop or a reload before every deadline cannot dodge every strike.
      const away = !member.connected || Date.now() - member.backAt < RETURN_GRACE_MS;
      if (away && member.excused !== match) {
        member.excused = match;
        return;
      }
      table.strikes[seat] += 1;
      if (table.strikes[seat] < MAX_STRIKES) return this.sendTable(table);
      member.removals += 1;
      let reason = `Time ran out on ${MAX_STRIKES} of your turns, so a bot took your seat.`;
      if (member.removals >= 2) {
        member.benchedUntil = Date.now() + this.benchMs;
        reason += ` You can take a seat again in ${minutesAndSeconds(this.benchMs)}.`;
      }
      try {
        this.vacate(member, reason);
      } finally {
        this.sendRoom(member.room);
      }
    } catch (error) {
      console.error("turn timeout failed:", error instanceof Error ? error.message : "unknown error");
    }
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

  // ---- looks and gestures ----

  /** Cleans and keeps a new look, then sends just that look to the room. */
  look(memberId: string | undefined, payload: { look?: unknown }): void {
    const member = this.need(memberId);
    let bytes = Infinity;
    try {
      bytes = Buffer.byteLength(JSON.stringify(payload));
    } catch {
      // unmeasurable counts as too large
    }
    if (bytes > MAX_LOOK_BYTES) throw new Refusal("bad-request", "That look is too large");
    if (!isRecord(payload.look)) throw new Refusal("bad-request", "Malformed request");
    if (!allow(member.lookTimes, LOOK_RATE)) throw new Refusal("rate-limited", "Too many look changes; wait a moment");
    member.look = cleanLook(payload.look);
    for (const other of member.room.members.values()) if (other.connected) this.emit(other.id, "look", { memberId: member.id, look: member.look });
  }

  /** Shows a gesture to everyone else in the room, never back to the sender. */
  gesture(memberId: string | undefined, kind: unknown): void {
    const member = this.need(memberId);
    if (!isGesture(kind)) throw new Refusal("bad-request", "There is no such gesture");
    // At a table a bow or applause waits for the end of the hand, so it can never answer someone's play mid-hand.
    if (!gestureNow(kind, member.table?.match?.state?.phase)) throw new Refusal("in-play", "Bow and applause wait for the end of the hand");
    if (!allow(member.gestureTimes, GESTURE_RATE)) throw new Refusal("rate-limited", "Too many gestures; wait a moment");
    for (const other of member.room.members.values()) {
      if (other !== member && other.connected) this.emit(other.id, "gesture", { memberId: member.id, kind });
    }
  }

  // ---- poses ----

  /**
   * Unacknowledged, so a bad pose is dropped silently. The feet height `y` may be left out; given, it must be from -3 to 5.
   * A VR player's `head` and `hands` are clamped into reach, and left out of the pose when malformed.
   */
  pose(
    memberId: string | undefined,
    payload: { x?: unknown; z?: unknown; ry?: unknown; y?: unknown; head?: unknown; hands?: unknown },
  ): void {
    const member = memberId === undefined ? undefined : this.members.get(memberId);
    const values = [payload.x, payload.z, payload.ry];
    const { y } = payload;
    if (!member || !values.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= POSE_LIMIT)) return;
    if (y !== undefined && !(typeof y === "number" && y >= -3 && y <= 5)) return;
    const [x, z, ry] = values as number[];
    const pose: Pose = y === undefined ? { x, z, ry } : { x, z, ry, y };
    const head = cleanHead(payload.head);
    const hands = cleanHands(payload.hands);
    if (head) pose.head = head;
    if (hands) pose.hands = hands;
    member.pose = pose;
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
      members: members.map((m) => ({ id: m.id, name: m.name, connected: m.connected, tableId: m.table?.id ?? null, look: m.look })),
      tables: room.tables.map(summary),
      walkers: room.walkers,
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
    const { match } = table;
    const clock = match?.clock;
    const snapshot: TableSnapshot = {
      tableId: table.id,
      game: table.game,
      revision: match?.revision ?? 0,
      you,
      view: (match?.view(you) ?? null) as GameView | null,
      // Remaining rather than a deadline, so no client clock has to agree with this one.
      // shortcut: hidden grace of up to 1 s so a press made in time on screen beats the server timer; covers a round trip up to that size, measure on Quest Wi-Fi if strikes still feel unfair.
      ...(match && {
        clock: clock
          ? { seat: clock.seat, remainingMs: Math.max(0, clock.endsAt - Date.now() - Math.min(1000, this.pace.turnMs! / 10)), totalMs: this.pace.turnMs! }
          : null,
        strikes: [...table.strikes],
      }),
    };
    this.emit(member.id, "table", snapshot);
  }
}
