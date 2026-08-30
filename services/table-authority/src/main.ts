// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Local development entry point.
 *
 *   node scripts/native/run-ts.mjs services/table-authority/src/main.ts --room fixtures/protocol/dev-room.json [--port 8765]
 *
 * The room file is a typed, closed description of one table and the tokens
 * that may join it. Invitations, room codes and account binding belong to the
 * session gateway (another provider's lane); this harness only seats what the
 * file declares so the Unreal client can be exercised on loopback.
 */
import { readFileSync } from "node:fs";
import { OCCUPANTS, SEATS, schema as s, type Seat } from "../../../packages/protocol/src";
import { AuthoritySessions, staticDirectory, type DirectoryEntry } from "./session";
import { TableAuthority, type SeatBinding } from "./table";
import { startAuthorityServer } from "./websocket-server";
import { handleClose, handleText } from "./wire";

interface RoomSeat {
  occupant: (typeof OCCUPANTS)[number];
  participantId: string | null;
  token: string | null;
  displayName: string;
}

interface RoomFile {
  tableId: string;
  seed: string;
  host: { participantId: string; token: string } | null;
  seats: Record<Seat, RoomSeat>;
  spectators: { participantId: string; token: string }[];
  dealers: { participantId: string; token: string }[];
}

const CREDENTIAL = s.object<{ participantId: string; token: string }>({
  participantId: s.string({ maxLength: 64 }),
  token: s.string({ maxLength: 128 }),
});

const ROOM_SEAT = s.object<RoomSeat>({
  occupant: s.enumOf(OCCUPANTS),
  participantId: s.nullable(s.string({ maxLength: 64 })),
  token: s.nullable(s.string({ maxLength: 128 })),
  displayName: s.string({ maxLength: 32, allowEmpty: true }),
});

const ROOM_FILE = s.object<RoomFile>({
  tableId: s.string({ maxLength: 64 }),
  seed: s.string({ maxLength: 128 }),
  host: s.nullable(CREDENTIAL),
  seats: s.object<Record<Seat, RoomSeat>>({ south: ROOM_SEAT, west: ROOM_SEAT, north: ROOM_SEAT, east: ROOM_SEAT }),
  spectators: s.array(CREDENTIAL, { maxLength: 64 }),
  dealers: s.array(CREDENTIAL, { maxLength: 8 }),
});

function argumentValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}

export function buildRoom(room: RoomFile): { table: TableAuthority; sessions: AuthoritySessions } {
  const directory: Record<string, DirectoryEntry> = {};
  const seats: Partial<Record<Seat, SeatBinding>> = {};
  for (const seat of SEATS) {
    const entry = room.seats[seat];
    if (entry.occupant === "human") {
      if (!entry.participantId || !entry.token) throw new Error(`seat ${seat} needs participantId and token`);
      directory[entry.token] = { participantId: entry.participantId, kind: "participant" };
      seats[seat] = { occupant: "human", participantId: entry.participantId, displayName: entry.displayName, connected: false };
    } else {
      seats[seat] = { occupant: entry.occupant };
    }
  }
  if (room.host) directory[room.host.token] = { participantId: room.host.participantId, kind: "participant" };
  for (const spectator of room.spectators) directory[spectator.token] = { participantId: spectator.participantId, kind: "participant" };
  for (const dealer of room.dealers) directory[dealer.token] = { participantId: dealer.participantId, kind: "dealer" };

  const table = new TableAuthority({
    tableId: room.tableId,
    seed: room.seed,
    hostParticipantId: room.host?.participantId ?? null,
    seats,
  });
  const sessions = new AuthoritySessions({ directory: staticDirectory(directory), tables: new Map([[table.tableId, table]]) });
  return { table, sessions };
}

export async function main(): Promise<void> {
  const roomPath = argumentValue("--room", "fixtures/protocol/dev-room.json");
  const port = Number.parseInt(argumentValue("--port", "8765"), 10);
  const decoded = ROOM_FILE.decode(JSON.parse(readFileSync(roomPath, "utf8")), "room");
  if (!decoded.ok) throw new Error(`room file rejected: ${decoded.rejection.code} at ${decoded.rejection.path}`);
  const { sessions } = buildRoom(decoded.value);

  const server = await startAuthorityServer({
    port,
    handlers: {
      onText: (connectionId, text) => handleText(sessions, connectionId, text),
      onClose: (connectionId) => handleClose(sessions, connectionId),
    },
    log: (line) => process.stdout.write(`${line}\n`),
  });
  process.stdout.write(`table ${decoded.value.tableId} ready at ${server.url}\n`);
  const stop = () => {
    void server.close().then(() => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (process.argv[1] && process.argv[1].replaceAll("\\", "/").endsWith("services/table-authority/src/main.ts")) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
