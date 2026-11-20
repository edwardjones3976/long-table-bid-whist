/**
 * The bots, seen as people are: every seat a bot plays, at every table, and each of the room's walkers is an avatar
 * (world/Avatars.tsx) in a look the server picked at random, under a framed steel blue plate with an antenna, so everyone
 * can tell the bots from the people across the room. A seated bot holds its card backs, glances to the turn and, at the
 * table I sit at, reaches in over its own turn; with the server's bot pacing the reach lands as its card does.
 *
 * The walkers stroll fixed loops through open floor at a calm pace. Each viewer works out where a walker is from the
 * time it set off, so nothing is sent while they walk.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { Look } from "../../../shared/avatar";
import type { Pose, RoomSnapshot, Seat, TableId, Walker } from "../../../shared/protocol";
import { useStore } from "../net/store";
import { Avatar, botId } from "./Avatars";
import { setMovers } from "./ground";
import { seatPose } from "./layout";

export interface BotSeat {
  tableId: TableId;
  seat: Seat;
  name: string;
  look?: Look;
}

/** Every seat a bot plays, at every table: the room summary marks them once a match has started. */
export function botSeats(room: RoomSnapshot | null): BotSeat[] {
  if (!room) return [];
  return room.tables.flatMap((table) =>
    table.seats.flatMap((info, seat) => (info.occupant === "bot" ? [{ tableId: table.id, seat: seat as Seat, name: `Bot ${seat + 1}`, look: info.look }] : [])),
  );
}

/** A walker's pace, m/s: a calm stroll. */
export const WALK_SPEED = 1.1;
/** A walker faces along its loop from this far behind to this far ahead (m), so it turns round a corner instead of snapping. */
const TURN_M = 0.5;

type Loop = readonly (readonly [x: number, z: number])[];

/**
 * One closed loop of waypoints per walker (indexed by Walker.loop), on open floor away from the card tables and from
 * each other: across the foyer in front of the door, down the gallery, and over the lawn between the toss boards.
 * tests/client/bots.test.ts walks each one against the house's own walkable and solid data.
 */
export const WALKER_LOOPS: readonly Loop[] = [
  [
    [-5, 11.8],
    [5, 11.8],
    [5, 14],
    [-5, 14],
  ],
  [
    [-3, 6],
    [3, 6],
    [3, -11],
    [-3, -11],
  ],
  [
    [3, -33],
    [20, -33],
    [20, -37],
    [3, -37],
  ],
];

/** The point `distance` metres round a loop from its first waypoint. */
function along(loop: Loop, distance: number): { x: number; z: number } {
  const next = (i: number) => loop[(i + 1) % loop.length];
  const legs = loop.map(([x, z], i) => Math.hypot(next(i)[0] - x, next(i)[1] - z));
  const total = legs.reduce((sum, leg) => sum + leg, 0);
  let left = ((distance % total) + total) % total;
  let i = 0;
  while (left > legs[i] && i < loop.length - 1) left -= legs[i++];
  const [ax, az] = loop[i];
  const [bx, bz] = next(i);
  const k = legs[i] ? left / legs[i] : 0;
  return { x: ax + (bx - ax) * k, z: az + (bz - az) * k };
}

/** Where a walker is `ms` after it set off round `loop`, facing the way it walks. */
export function walkerAt(loop: Loop, ms: number): Pose {
  const metres = (ms / 1000) * WALK_SPEED;
  const here = along(loop, metres);
  const back = along(loop, metres - TURN_M);
  const ahead = along(loop, metres + TURN_M);
  // Forward is (-sin ry, -cos ry) (world/layout.ts).
  return { x: here.x, z: here.z, ry: Math.atan2(back.x - ahead.x, back.z - ahead.z) };
}

const NO_WALKERS: readonly Walker[] = [];

/** Keeps the walkers solid: their places this frame are what world/ground.ts blocks a player's body with. */
function WalkerBodies({ walkers }: { walkers: readonly Walker[] }) {
  const spots = useMemo(() => walkers.filter((walker) => WALKER_LOOPS[walker.loop]).map(() => ({ x: 0, z: 0 })), [walkers]);
  useEffect(() => {
    setMovers(spots);
    return () => setMovers([]);
  }, [spots]);
  useFrame(() => {
    const now = Date.now();
    let i = 0;
    for (const walker of walkers) {
      if (!WALKER_LOOPS[walker.loop]) continue;
      const at = walkerAt(WALKER_LOOPS[walker.loop], now - walker.since);
      spots[i].x = at.x;
      spots[i].z = at.z;
      i += 1;
    }
  });
  return null;
}

export function Bots() {
  const room = useStore((state) => state.room);
  const mine = useStore((state) => state.table?.tableId ?? null);
  const seats = useMemo(() => botSeats(room), [room]);
  if (!room) return null;
  return (
    <>
      <WalkerBodies walkers={room.walkers ?? NO_WALKERS} />
      {seats.map(({ tableId, seat, name, look }) => {
        const id = botId(tableId, seat);
        const chair = seatPose(tableId, seat);
        const status = room.tables.find((table) => table.id === tableId)?.status;
        return <Avatar key={id} member={{ id, name, look }} seat={{ tableId, seat }} status={status} mine={tableId === mine} bot place={() => chair} />;
      })}
      {/* shortcut: placed by this device's clock against the server's start time, so viewers may differ by a second or so; send the server's time with the room if that ever matters. */}
      {(room.walkers ?? [])
        .filter((walker) => WALKER_LOOPS[walker.loop])
        .map((walker) => (
          <Avatar key={walker.id} member={walker} seat={null} status={undefined} mine={false} bot place={(now) => walkerAt(WALKER_LOOPS[walker.loop], now - walker.since)} />
        ))}
    </>
  );
}
