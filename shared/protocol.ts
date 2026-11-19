/**
 * The wire contract between the browser client and the room server.
 * Every client-to-server event except "pose" is answered through its
 * Socket.IO acknowledgement with a Reply.
 */
import type { View as BidWhistView } from "../server/games/bidwhist";
import type { Seat } from "../server/games/game";
import type { View as SpadesView } from "../server/games/spades";
import type { View as TonkView } from "../server/games/tonk";
import type { GestureId, Hand, Look } from "./avatar";

export type { Seat } from "../server/games/game";

export const GAME_IDS = ["tonk", "spades", "bid-whist"] as const;
export type GameId = (typeof GAME_IDS)[number];

export const GAME_NAMES: Record<GameId, string> = { tonk: "Tonk", spades: "Spades", "bid-whist": "Bid Whist" };

/** Every room has the same six tables. */
export const TABLES = [
  { id: "tonk-1", game: "tonk", label: "Tonk Table 1" },
  { id: "tonk-2", game: "tonk", label: "Tonk Table 2" },
  { id: "spades-1", game: "spades", label: "Spades Table 1" },
  { id: "spades-2", game: "spades", label: "Spades Table 2" },
  { id: "bid-whist-1", game: "bid-whist", label: "Bid Whist Table 1" },
  { id: "bid-whist-2", game: "bid-whist", label: "Bid Whist Table 2" },
] as const satisfies readonly { id: string; game: GameId; label: string }[];
export type TableId = (typeof TABLES)[number]["id"];

export const MAX_ROOM_MEMBERS = 32;
/** Room codes are this many characters from ROOM_CODE_ALPHABET (no look-alike characters). */
export const ROOM_CODE_LENGTH = 8;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_NAME_LENGTH = 20;
/** How long a disconnected member keeps their place before a bot takes their seat and they leave the room. */
export const SEAT_HOLD_MS = 60_000;
/** Turns a person may run out of time on in one match; the last one passes their seat to a bot. */
export const MAX_STRIKES = 3;
/** How long a person removed for time twice in one room may not sit or host at any table. */
export const BENCH_MS = 10 * 60_000;

/**
 * available: nobody is at the table.  lobby: people are seated, no match yet.
 * playing: a match is running.        results: the match is over and its result is shown.
 */
export type TableStatus = "available" | "lobby" | "playing" | "results";

export interface SeatInfo {
  /** "bot" only once a match has started. */
  occupant: "open" | "human" | "bot";
  memberId: string | null;
  name: string | null;
  ready: boolean;
  connected: boolean;
}

export interface TableSummary {
  id: TableId;
  game: GameId;
  status: TableStatus;
  /** Index is the seat number; seats run clockwise and partners sit opposite. */
  seats: [SeatInfo, SeatInfo, SeatInfo, SeatInfo];
  /** The optional fifth, non-playing dealer/host. When null the server deals automatically. */
  host: { memberId: string; name: string; connected: boolean } | null;
  /** Who may change house rules, start the match and reset the table: the host, else the longest-seated player. */
  managerId: string | null;
  /** The table's house rules, shown to everyone before they ready up and fixed once a match starts. */
  options: unknown;
  /**
   * How long the match has run, in ms when this snapshot was sent, and whether it is still running
   * (false from game over: elapsedMs is then the final time). Count up locally from arrival while running.
   * Null with no match; absent from older servers.
   */
  matchTime?: { elapsedMs: number; running: boolean } | null;
}

export interface Pose {
  x: number;
  z: number;
  /** Facing, radians about the vertical axis. */
  ry: number;
  /** Feet height in metres above the house floor (a jump, a bench top, the pool); absent means on the floor. */
  y?: number;
  /** A VR player's head: pitch and yaw (yaw relative to ry) in radians, each within +-HEAD_TURN (shared/avatar.ts). Desktop and phone send none. */
  head?: { pitch: number; yaw: number };
  /** A VR player's hands, left then right, null while untracked: see Hand and its limits in shared/avatar.ts. */
  hands?: [Hand | null, Hand | null];
}

export interface MemberInfo {
  id: string;
  name: string;
  connected: boolean;
  tableId: TableId | null;
  /** How this member looks to everyone else, already through cleanLook. */
  look: Look;
}

/** Sent as "room" to every member whenever anything public changes. */
export interface RoomSnapshot {
  code: string;
  you: string;
  members: MemberInfo[];
  tables: TableSummary[];
}

export type GameView = TonkView | SpadesView | BidWhistView;

/**
 * Sent as "table" to each person at a table, built for that recipient alone:
 * a player gets their own hand, the host gets public state only.
 */
export interface TableSnapshot {
  tableId: TableId;
  game: GameId;
  revision: number;
  /** Your seat, or null if you are the host. */
  you: Seat | null;
  /** Null until the match starts. */
  view: GameView | null;
  /**
   * The person on the turn clock, present while a match runs: remainingMs is measured when this
   * snapshot was sent (count down locally from arrival), totalMs is the full time per decision.
   * Null when nobody is on the clock: a bot's turn, between hands, game over, or the clock is off.
   */
  clock?: { seat: Seat; remainingMs: number; totalMs: number } | null;
  /** Turns each seat has run out of time on in this match (MAX_STRIKES removes the player); present while a match runs. */
  strikes?: [number, number, number, number];
}

/** Sent as "poses" about ten times a second: where other members' avatars are. */
export type Poses = Record<string, Pose>;

export type ErrorCode =
  | "bad-request"
  | "rate-limited"
  | "no-such-room"
  | "room-full"
  | "bad-token"
  | "not-in-room"
  | "no-such-table"
  | "already-seated"
  | "seat-taken"
  | "table-full"
  | "host-taken"
  | "in-play"
  | "not-at-table"
  | "not-manager"
  | "not-ready"
  | "not-a-player"
  | "not-started"
  | "action-id-reused"
  | "stale-revision"
  | "illegal"
  /** Removed for time twice in this room: no seat or host place until the bench ends; the message gives the time left. */
  | "benched"
  | "internal";

export type Reply<T = object> = ({ ok: true } & T) | { ok: false; error: ErrorCode; message: string };

/** `token` is a secret for this browser tab; send it back with "room:resume" after a dropped connection. */
export type Joined = { code: string; memberId: string; token: string };

export interface ClientEvents {
  /** `look` is cleaned; without one the server picks a starting look by arrival order. */
  "room:create": (payload: { name: string; look?: Look }, ack: (reply: Reply<Joined>) => void) => void;
  "room:join": (payload: { code: string; name: string; look?: Look }, ack: (reply: Reply<Joined>) => void) => void;
  "room:resume": (payload: { token: string }, ack: (reply: Reply<Joined>) => void) => void;
  "room:leave": (payload: object, ack: (reply: Reply) => void) => void;
  /** Not acknowledged. */
  pose: (payload: Pose) => void;
  /** Change my look: cleaned, then everyone (me too) gets the "look" event. At most 5 in 10 seconds and 4 KB of JSON. */
  look: (payload: { look: unknown }, ack: (reply: Reply) => void) => void;
  /** Play a gesture for everyone else in the room. At most 3 in 4 seconds; unknown kinds are refused. */
  gesture: (payload: { kind: string }, ack: (reply: Reply) => void) => void;
  /** Sit as a player (in `seat`, or the first open seat) or as the host. Only one table at a time. */
  "table:sit": (
    payload: { tableId: TableId; role: "player" | "host"; seat?: Seat },
    ack: (reply: Reply<{ seat: Seat | null }>) => void,
  ) => void;
  /** Leave the table. In a running match a player's seat is taken over by a bot. */
  "table:stand": (payload: object, ack: (reply: Reply) => void) => void;
  "table:ready": (payload: { ready: boolean }, ack: (reply: Reply) => void) => void;
  /** Manager only, before the match starts. Clears everyone's ready flag. */
  "table:options": (payload: { options: unknown }, ack: (reply: Reply) => void) => void;
  /** Manager only. Needs at least one seated player and every seated player ready; open seats become bots. */
  "table:start": (payload: object, ack: (reply: Reply) => void) => void;
  /** A game action, or { type: "next-hand" } once a hand is over. The host may send only "next-hand". */
  "table:action": (
    payload: { actionId: string; expectedRevision: number; action: { type: string; [key: string]: unknown } },
    ack: (reply: Reply<{ revision: number; duplicate?: true }>) => void,
  ) => void;
  /**
   * Manager only: clears the match so the table returns to "lobby". Before "results" this abandons
   * a live match and every other seated player gets "table:left"; the host stays.
   */
  "table:reset": (payload: object, ack: (reply: Reply) => void) => void;
}

export interface ServerEvents {
  room: (snapshot: RoomSnapshot) => void;
  table: (snapshot: TableSnapshot) => void;
  /**
   * You are no longer at a table (you stood, or the table was cleared). `reason` is a sentence to show
   * when the server removed you, such as for running out of time on MAX_STRIKES turns; absent otherwise.
   */
  "table:left": (payload: { tableId: TableId; reason?: string }) => void;
  poses: (poses: Poses) => void;
  /** Another member of the room played a gesture; never sent back to the one who played it. */
  gesture: (payload: { memberId: string; kind: GestureId }) => void;
  /** A member changed their look (already cleaned): only that one look, since a room snapshot carries everyone's. */
  look: (payload: { memberId: string; look: Look }) => void;
}
