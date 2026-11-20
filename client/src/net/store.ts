/**
 * The connection to the room server and everything it has told us.
 *
 *   net.getState()                 { connection, room, table, poses, gestures, lastError, me, roomAt, tableAt }
 *   useStore((s) => s.room)        React hook; re-renders only when the selected value changes
 *   net.createRoom(name) ...       every action resolves to the server's Reply and never rejects;
 *                                  a refusal also lands in state.lastError as a sentence for the person
 *   myTable() / myPlace() / mySeat() / amManager()   derived from a state (default: the current one)
 *   net.setLook(look)              saves my look in this browser (state/look.ts) and shows it to the room
 *   net.gesture(kind)              plays a gesture for everyone else in the room
 *
 * lastError is also where the server's notices land: a strike on my turn clock, and why I was taken off a table.
 *
 * A useStore selector must return a state slice or a primitive, never a fresh
 * object (that would re-render forever): select `s.room`, then derive with useMemo.
 * `poses` changes about ten times a second: read it with net.getState() inside
 * a frame loop rather than through useStore. `gestures` holds the last few seconds of other members' gestures.
 */
import { useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import type { GestureId, Look } from "../../../shared/avatar";
import {
  MAX_STRIKES,
  type ClientEvents,
  type Joined,
  type Pose,
  type Poses,
  type Reply,
  type RoomSnapshot,
  type Seat,
  type ServerEvents,
  type TableId,
  type TableSnapshot,
  type TableSummary,
} from "../../../shared/protocol";
import { myLook } from "../state/look";

export type Connection = "connecting" | "online" | "reconnecting" | "offline";

/** A gesture another member played; `at` is Date.now() when it arrived. */
export interface Gesture {
  memberId: string;
  kind: GestureId;
  at: number;
}

export interface NetState {
  connection: Connection;
  room: RoomSnapshot | null;
  /** My table as only I may see it (my hand); null when I am not at a table. */
  table: TableSnapshot | null;
  /** Other members' avatars, by member id. */
  poses: Poses;
  /** Gestures that arrived in the last GESTURE_KEEP_MS, oldest first. */
  gestures: Gesture[];
  lastError: string | null;
  /** My member id while in a room. */
  me: string | null;
  /** Date.now() when the last room and table snapshots arrived: the turn and match clocks count from there. */
  roomAt: number;
  tableAt: number;
}

export type ClientSocket = Socket<ServerEvents, ClientEvents>;
export type GameAction = { type: string; [key: string]: unknown };

type Acked = Exclude<keyof ClientEvents, "pose">;
type PayloadOf<K extends Acked> = Parameters<ClientEvents[K]>[0];
type ReplyOf<K extends Acked> = Parameters<Parameters<ClientEvents[K]>[1]>[0];

const TOKEN_KEY = "mansion.token";
const ANSWER_TIMEOUT_MS = 8000;
// A little under the 100 ms the app ticks at: a tick that comes a few milliseconds early must not be dropped, or every other pose is lost.
const POSE_INTERVAL_MS = 80;
const GESTURE_KEEP_MS = 3000;
/** The server's look rate window: a refused or unanswered look is sent again once it has passed. */
const LOOK_RETRY_MS = 10_000;

// The token lives in sessionStorage so each tab is its own member and a reload keeps its place.
const token = {
  read(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  write(value: string | null): void {
    try {
      if (value === null) sessionStorage.removeItem(TOKEN_KEY);
      else sessionStorage.setItem(TOKEN_KEY, value);
    } catch {
      // Without storage a reload simply cannot resume.
    }
  },
};

export function myTable(state: NetState = net.getState()): TableSummary | null {
  const { room, me } = state;
  const tableId = room?.members.find((member) => member.id === me)?.tableId;
  return room?.tables.find((table) => table.id === tableId) ?? null;
}

/** My table and my seat at it; seat null means I am its host. */
export function myPlace(state: NetState = net.getState()): { table: TableSummary; seat: Seat | null } | null {
  const table = myTable(state);
  if (!table) return null;
  const seat = table.seats.findIndex((info) => info.memberId === state.me);
  return { table, seat: seat < 0 ? null : (seat as Seat) };
}

export function mySeat(state: NetState = net.getState()): Seat | null {
  return myPlace(state)?.seat ?? null;
}

export function amManager(state: NetState = net.getState()): boolean {
  return state.me !== null && myTable(state)?.managerId === state.me;
}

/** `connect` is replaced in tests; the app uses the default, a socket to the page's own origin. */
export function createNet(connect: () => ClientSocket = () => io({ transports: ["websocket", "polling"] })) {
  let state: NetState = {
    connection: "connecting",
    room: null,
    table: null,
    poses: {},
    gestures: [],
    lastError: null,
    me: null,
    roomAt: 0,
    tableAt: 0,
  };
  const listeners = new Set<() => void>();
  let socket: ClientSocket | null = null;
  let everOnline = false;
  let actionCount = 0;
  let lastPoseAt = 0;
  // The room may have an older look than mine: changed while the connection was down, refused for speed, or unanswered.
  let lookUnsent = false;
  // Also kept here: where storage is blocked the token must still survive a reconnect.
  let held = token.read();
  // The member id this tab just left a room as. Snapshots the server had already queued for that membership can still
  // arrive after the local leave; they are stale and are dropped so they cannot bring the room back on screen. A room
  // joined afterwards comes with a fresh member id, so its snapshots are followed whatever order the packets arrive in.
  let leftAs: string | null = null;

  function set(partial: Partial<NetState>): void {
    state = { ...state, ...partial };
    for (const listener of listeners) listener();
  }

  /**
   * True for table, pose and gesture events that belong to the membership just left: between the local leave and the
   * first snapshot of a room joined afterwards, nothing the server says about a table or other members is for this tab.
   */
  function stale(): boolean {
    return leftAs !== null && state.room === null;
  }

  function leaveLocally(message: string | null): void {
    leftAs = state.me ?? leftAs;
    held = null;
    token.write(null);
    set({ room: null, table: null, poses: {}, gestures: [], me: null, lastError: message });
  }

  /** Opens the socket on first use. Safe to call again. */
  function open(): ClientSocket {
    if (socket) return socket;
    const opened = (socket = connect());
    opened.on("connect", () => {
      everOnline = true;
      set({ connection: "online" });
      const saved = held ?? token.read();
      if (saved) void resume(saved);
      // A room on screen with no token (the join answer was lost) cannot be resumed: say so.
      else if (state.room) leaveLocally("Your place in the room was not kept. Join again to come back in.");
    });
    // Socket.IO retries on its own, except after the server closed this socket (the room was resumed elsewhere).
    opened.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        // Leaving first drops the token, so the new connection does not resume and kick the other tab back.
        leaveLocally("This room was opened in another tab.");
        opened.connect();
      } else set({ connection: "reconnecting" });
    });
    opened.on("connect_error", () => set({ connection: everOnline ? "reconnecting" : "offline" }));
    opened.on("room", (room) => {
      if (leftAs !== null && room.you === leftAs) return;
      const atTable = room.members.find((member) => member.id === room.you)?.tableId != null;
      set({ room, roomAt: Date.now(), me: room.you, ...(atTable ? {} : { table: null }) });
    });
    opened.on("table", (table) => {
      if (stale()) return;
      // A strike is told once, as it is given: not on a table's first snapshot (after a reload), nor when a new match clears it.
      const seat = table.you;
      const before = seat !== null && state.table?.tableId === table.tableId ? (state.table.strikes?.[seat] ?? 0) : Infinity;
      const strikes = seat === null ? 0 : (table.strikes?.[seat] ?? 0);
      const notice = `Your time ran out, so a bot played your turn. Strike ${strikes} of ${MAX_STRIKES}: at ${MAX_STRIKES} a bot takes your seat.`;
      set({ table, tableAt: Date.now(), ...(strikes > before ? { lastError: notice } : {}) });
    });
    opened.on("table:left", ({ reason }) => {
      if (stale()) return;
      set({ table: null, ...(reason ? { lastError: reason } : {}) });
    });
    opened.on("poses", (poses) => {
      if (stale()) return;
      set({ poses });
    });
    opened.on("look", ({ memberId, look }) => {
      const room = state.room;
      if (room) set({ room: { ...room, members: room.members.map((member) => (member.id === memberId ? { ...member, look } : member)) } });
    });
    opened.on("gesture", ({ memberId, kind }) => {
      if (stale()) return;
      const at = Date.now();
      set({ gestures: [...state.gestures.filter((gesture) => at - gesture.at < GESTURE_KEEP_MS), { memberId, kind, at }] });
    });
    return opened;
  }

  async function ask<K extends Acked>(event: K, payload: PayloadOf<K>): Promise<ReplyOf<K>> {
    // The typed emitWithAck cannot be called with a generic event name, so the call is made untyped here only.
    const opened = open();
    // A table request or gesture buffered while offline would be replayed before the resume and be refused as "not in a room".
    if (!opened.connected && (event.startsWith("table:") || event === "gesture")) {
      return { ok: false, error: "internal", message: "Reconnecting. Try again in a moment." };
    }
    const sender = opened.timeout(ANSWER_TIMEOUT_MS) as unknown as {
      emitWithAck(event: string, payload: object): Promise<ReplyOf<K>>;
    };
    try {
      return await sender.emitWithAck(event, payload);
    } catch {
      return { ok: false, error: "internal", message: "The server did not answer. Check your connection." };
    }
  }

  /** As `ask`, and records a refusal as the message shown to the person. */
  async function request<K extends Acked>(event: K, payload: PayloadOf<K>): Promise<ReplyOf<K>> {
    const reply = await ask(event, payload);
    set({ lastError: reply.ok ? null : reply.message });
    return reply;
  }

  async function resume(saved: string): Promise<void> {
    const reply = await ask("room:resume", { token: saved });
    if (reply.ok) {
      set({ me: reply.memberId });
      resendLook();
    } else if (reply.error === "bad-token" || reply.error === "no-such-room") {
      leaveLocally("Your place in the room was not kept. Join again to come back in.");
    } else set({ lastError: reply.message });
  }

  /** Sends my latest look once, if the room may not have it. */
  function resendLook(): void {
    if (!lookUnsent || !state.room || !socket?.connected) return;
    lookUnsent = false;
    void ask("look", { look: myLook.get() });
  }

  function entered(reply: Reply<Joined>): Reply<Joined> {
    if (reply.ok) {
      // A fresh membership: whatever was left before is history, and its id can no longer mark anything stale.
      leftAs = null;
      lookUnsent = false;
      held = reply.token;
      token.write(reply.token);
      set({ me: reply.memberId });
    }
    return reply;
  }

  return {
    getState: (): NetState => state,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open,
    clearError: (): void => set({ lastError: null }),

    createRoom: async (name: string) => entered(await request("room:create", { name, look: myLook.get() })),
    joinRoom: async (code: string, name: string) => entered(await request("room:join", { code, name, look: myLook.get() })),
    async leaveRoom(): Promise<Reply> {
      // Gone from this tab at once: the entry page (and the end of a VR session) must not wait for the server, which
      // can take seconds to answer or be reconnecting. Forgetting the token first also means a reconnect while the
      // answer is awaited does not resume the room. Whatever the server then says, this tab is done with the room.
      leaveLocally(null);
      return ask("room:leave", {});
    },
    sit: (tableId: TableId, role: "player" | "host", seat?: Seat) =>
      request("table:sit", seat === undefined ? { tableId, role } : { tableId, role, seat }),
    stand: () => request("table:stand", {}),
    setReady: (ready: boolean) => request("table:ready", { ready }),
    setOptions: (options: unknown) => request("table:options", { options }),
    start: () => request("table:start", {}),
    resetTable: () => request("table:reset", {}),

    /**
     * Saves my look here, then shows it to the room; outside a room the next create or join carries it. A change
     * the server refused for speed, or never answered, is sent again (the latest look) after LOOK_RETRY_MS.
     */
    async setLook(look: Look): Promise<Reply> {
      myLook.set(look);
      if (!state.room) return { ok: true };
      if (!socket?.connected) {
        lookUnsent = true;
        return { ok: true };
      }
      const reply = await request("look", { look: myLook.get() });
      lookUnsent = !reply.ok && (reply.error === "rate-limited" || reply.error === "internal");
      if (lookUnsent) setTimeout(resendLook, LOOK_RETRY_MS);
      return reply;
    },
    async gesture(kind: GestureId): Promise<Reply> {
      const reply = await ask("gesture", { kind });
      // Only a refusal is worth saying: a wave must not wipe a notice still on screen.
      if (!reply.ok) set({ lastError: reply.message });
      return reply;
    },

    /** Sends a game action against the table revision on screen. */
    async act(action: GameAction): Promise<Reply<{ revision: number; duplicate?: true }>> {
      const table = state.table;
      if (!table) {
        const reply = { ok: false, error: "not-at-table", message: "You are not at a table" } as const;
        set({ lastError: reply.message });
        return reply;
      }
      actionCount += 1;
      const actionId = `${Date.now().toString(36)}-${actionCount}-${Math.random().toString(36).slice(2, 10)}`;
      const reply = await ask("table:action", { actionId, expectedRevision: table.revision, action });
      // A stale revision needs no message: the newer snapshot is already on its way and shows what changed.
      if (reply.ok || reply.error !== "stale-revision") set({ lastError: reply.ok ? null : reply.message });
      return reply;
    },

    /** The app calls this ten times a second; a call sooner than POSE_INTERVAL_MS after the last is dropped. */
    sendPose(pose: Pose): void {
      const now = Date.now();
      if (!state.room || !socket?.connected || now - lastPoseAt < POSE_INTERVAL_MS) return;
      lastPoseAt = now;
      // `y` (the feet height) and a VR player's `head` and `hands` are left out by JSON when the pose has none.
      socket.volatile.emit("pose", { x: pose.x, z: pose.z, ry: pose.ry, y: pose.y, head: pose.head, hands: pose.hands });
    },
  };
}

export type Net = ReturnType<typeof createNet>;

export const net: Net = createNet();

export function useStore<T>(selector: (state: NetState) => T): T {
  return useSyncExternalStore(net.subscribe, () => selector(net.getState()));
}
