/**
 * The connection to the room server and everything it has told us.
 *
 *   net.getState()                 { connection, room, table, poses, lastError, me }
 *   useStore((s) => s.room)        React hook; re-renders only when the selected value changes
 *   net.createRoom(name) ...       every action resolves to the server's Reply and never rejects;
 *                                  a refusal also lands in state.lastError as a sentence for the person
 *   myTable() / myPlace() / mySeat() / amManager()   derived from a state (default: the current one)
 *
 * A useStore selector must return a state slice or a primitive, never a fresh
 * object (that would re-render forever): select `s.room`, then derive with useMemo.
 * `poses` changes about ten times a second: read it with net.getState() inside
 * a frame loop rather than through useStore.
 */
import { useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientEvents,
  Joined,
  Pose,
  Poses,
  Reply,
  RoomSnapshot,
  Seat,
  ServerEvents,
  TableId,
  TableSnapshot,
  TableSummary,
} from "../../../shared/protocol";

export type Connection = "connecting" | "online" | "reconnecting" | "offline";

export interface NetState {
  connection: Connection;
  room: RoomSnapshot | null;
  /** My table as only I may see it (my hand); null when I am not at a table. */
  table: TableSnapshot | null;
  /** Other members' avatars, by member id. */
  poses: Poses;
  lastError: string | null;
  /** My member id while in a room. */
  me: string | null;
}

export type ClientSocket = Socket<ServerEvents, ClientEvents>;
export type GameAction = { type: string; [key: string]: unknown };

type Acked = Exclude<keyof ClientEvents, "pose">;
type PayloadOf<K extends Acked> = Parameters<ClientEvents[K]>[0];
type ReplyOf<K extends Acked> = Parameters<Parameters<ClientEvents[K]>[1]>[0];

const TOKEN_KEY = "mansion.token";
const ANSWER_TIMEOUT_MS = 8000;
const POSE_INTERVAL_MS = 100;

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
  let state: NetState = { connection: "connecting", room: null, table: null, poses: {}, lastError: null, me: null };
  const listeners = new Set<() => void>();
  let socket: ClientSocket | null = null;
  let everOnline = false;
  let actionCount = 0;
  let lastPoseAt = 0;
  // Also kept here: where storage is blocked the token must still survive a reconnect.
  let held = token.read();

  function set(partial: Partial<NetState>): void {
    state = { ...state, ...partial };
    for (const listener of listeners) listener();
  }

  function leaveLocally(message: string | null): void {
    held = null;
    token.write(null);
    set({ room: null, table: null, poses: {}, me: null, lastError: message });
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
      const atTable = room.members.find((member) => member.id === room.you)?.tableId != null;
      set({ room, me: room.you, ...(atTable ? {} : { table: null }) });
    });
    opened.on("table", (table) => set({ table }));
    opened.on("table:left", () => set({ table: null }));
    opened.on("poses", (poses) => set({ poses }));
    return opened;
  }

  async function ask<K extends Acked>(event: K, payload: PayloadOf<K>): Promise<ReplyOf<K>> {
    // The typed emitWithAck cannot be called with a generic event name, so the call is made untyped here only.
    const opened = open();
    // A table request buffered while offline would be replayed before the resume and be refused as "not in a room".
    if (!opened.connected && event.startsWith("table:")) {
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
    if (reply.ok) set({ me: reply.memberId });
    else if (reply.error === "bad-token" || reply.error === "no-such-room") {
      leaveLocally("Your place in the room was not kept. Join again to come back in.");
    } else set({ lastError: reply.message });
  }

  function entered(reply: Reply<Joined>): Reply<Joined> {
    if (reply.ok) {
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

    createRoom: async (name: string) => entered(await request("room:create", { name })),
    joinRoom: async (code: string, name: string) => entered(await request("room:join", { code, name })),
    async leaveRoom(): Promise<Reply> {
      // Forgotten before asking: a reconnect while the answer is awaited must not resume the room.
      held = null;
      token.write(null);
      const reply = await ask("room:leave", {});
      // Whatever the server said, this tab is done with the room.
      leaveLocally(null);
      return reply;
    },
    sit: (tableId: TableId, role: "player" | "host", seat?: Seat) =>
      request("table:sit", seat === undefined ? { tableId, role } : { tableId, role, seat }),
    stand: () => request("table:stand", {}),
    setReady: (ready: boolean) => request("table:ready", { ready }),
    setOptions: (options: unknown) => request("table:options", { options }),
    start: () => request("table:start", {}),
    resetTable: () => request("table:reset", {}),

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

    /** At most ten a second; extra calls are dropped. */
    sendPose(pose: Pose): void {
      const now = Date.now();
      if (!state.room || !socket?.connected || now - lastPoseAt < POSE_INTERVAL_MS) return;
      lastPoseAt = now;
      socket.volatile.emit("pose", { x: pose.x, z: pose.z, ry: pose.ry });
    },
  };
}

export type Net = ReturnType<typeof createNet>;

export const net: Net = createNet();

export function useStore<T>(selector: (state: NetState) => T): T {
  return useSyncExternalStore(net.subscribe, () => selector(net.getState()));
}
