/**
 * The wire contract between the browser client and the room server.
 * Every client-to-server event except "pose" is answered through its
 * Socket.IO acknowledgement with a Reply.
 */
import type { View as BidWhistView } from "../server/games/bidwhist";
import type { Seat } from "../server/games/game";
import type { View as SpadesView } from "../server/games/spades";
import type { View as TonkView } from "../server/games/tonk";

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
}

export interface Pose {
  x: number;
  z: number;
  /** Facing, radians about the vertical axis. */
  ry: number;
  /** Feet height in metres above the house floor (a jump, a bench top, the pool); absent means on the floor. */
  y?: number;
}

export interface MemberInfo {
  id: string;
  name: string;
  connected: boolean;
  tableId: TableId | null;
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
  | "internal";

export type Reply<T = object> = ({ ok: true } & T) | { ok: false; error: ErrorCode; message: string };

/** `token` is a secret for this browser tab; send it back with "room:resume" after a dropped connection. */
export type Joined = { code: string; memberId: string; token: string };

export interface ClientEvents {
  "room:create": (payload: { name: string }, ack: (reply: Reply<Joined>) => void) => void;
  "room:join": (payload: { code: string; name: string }, ack: (reply: Reply<Joined>) => void) => void;
  "room:resume": (payload: { token: string }, ack: (reply: Reply<Joined>) => void) => void;
  "room:leave": (payload: object, ack: (reply: Reply) => void) => void;
  /** Not acknowledged. */
  pose: (payload: Pose) => void;
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
  /** You are no longer at a table (you stood, or the table was cleared). */
  "table:left": (payload: { tableId: TableId }) => void;
  poses: (poses: Poses) => void;
}
