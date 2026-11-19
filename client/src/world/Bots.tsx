/**
 * The bots, seen: a seated robot in every chair a bot plays, at every table, so
 * everyone can tell which seats are bots without walking up to read the plates.
 * At the table I sit at, the bot whose turn it is lights its antenna and reaches
 * for the table; with the server's bot pacing the reach lands as its card does.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { RoomSnapshot, Seat, TableId } from "../../../shared/protocol";
import { noRaycast } from "../controls/Hands";
import { net, useStore } from "../net/store";
import { makeTextTexture, textAspect } from "../ui/text";
import { seatPose } from "./layout";

/** Same sitting height as a seated person's avatar (world/Avatars.tsx). */
const SEATED_DROP = 0.4;
const PLATE_HEIGHT = 0.18;
/** How far the arm swings forward (radians) while it is the bot's turn: from hanging down to over the table edge. */
const REACH = 1.25;
const STEEL = "#7f9cbf";
const DARK = "#3a4a5e";

export interface BotSeat {
  tableId: TableId;
  seat: Seat;
  name: string;
}

/** Every seat a bot plays, at every table: the room summary marks them once a match has started. */
export function botSeats(room: RoomSnapshot | null): BotSeat[] {
  if (!room) return [];
  return room.tables.flatMap((table) =>
    table.seats.flatMap((info, seat) => (info.occupant === "bot" ? [{ tableId: table.id, seat: seat as Seat, name: `Bot ${seat + 1}` }] : [])),
  );
}

function Bot({ tableId, seat, name, mine }: BotSeat & { mine: boolean }) {
  const pose = seatPose(tableId, seat);
  const root = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const light = useRef<MeshStandardMaterial>(null);
  const plate = useRef<Mesh>(null);
  const texture = useMemo(() => makeTextTexture([name], { fontPx: 56 }), [name]);

  // A bot is scenery to pointers: a mouse or controller ray passing a neighbouring bot still reaches the cards behind it.
  useEffect(() => root.current?.traverse((object) => (object.raycast = noRaycast)), []);

  useFrame(({ camera }, delta) => {
    // Only my own table sends turns; elsewhere a bot simply sits.
    const view = mine ? net.getState().table?.view : null;
    const turn = !!view && view.turn === seat && view.phase !== "hand-over" && view.phase !== "game-over";
    if (arm.current) {
      const goal = turn ? -REACH : 0;
      // Eased so the reach takes about a second, close to the pause before a bot plays.
      arm.current.rotation.x += (goal - arm.current.rotation.x) * Math.min(1, delta * 3);
    }
    if (light.current) light.current.emissiveIntensity = turn ? 1.6 : 0.15;
    if (plate.current) camera.getWorldQuaternion(plate.current.quaternion);
  });

  return (
    <group ref={root} position={[pose.x, 0, pose.z]} rotation={[0, pose.ry, 0]} name={`bot-${tableId}-${seat}`}>
      <group position={[0, -SEATED_DROP, 0]}>
        <mesh position={[0, 0.75, 0]}>
          <capsuleGeometry args={[0.2, 1.1, 4, 12]} />
          <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.4} />
        </mesh>
        {/* A square head, so nobody takes a bot for a person. Its face looks along -z, toward the table. */}
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[0.3, 0.26, 0.28]} />
          <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-0.07, 1.62, -0.145]}>
          <boxGeometry args={[0.06, 0.04, 0.01]} />
          <meshStandardMaterial color="#9be7ff" emissive="#9be7ff" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.07, 1.62, -0.145]}>
          <boxGeometry args={[0.06, 0.04, 0.01]} />
          <meshStandardMaterial color="#9be7ff" emissive="#9be7ff" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.14, 6]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        <mesh position={[0, 1.89, 0]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshStandardMaterial ref={light} color="#ffd166" emissive="#ffd166" emissiveIntensity={0.15} />
        </mesh>
        {/* The right arm hangs from the shoulder and swings forward over the table on the bot's turn. */}
        <group ref={arm} position={[0.25, 1.3, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.055, 0.45, 4, 8]} />
            <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      </group>
      {!mine && (
        <mesh ref={plate} position={[0, 1.65 - SEATED_DROP + 0.5, 0]} scale={[textAspect(texture) * PLATE_HEIGHT, PLATE_HEIGHT, 1]} raycast={noRaycast}>
          <planeGeometry />
          <meshBasicMaterial map={texture} />
        </mesh>
      )}
    </group>
  );
}

export function Bots() {
  const room = useStore((state) => state.room);
  const mine = useStore((state) => state.table?.tableId ?? null);
  const seats = useMemo(() => botSeats(room), [room]);
  return (
    <>
      {seats.map((bot) => (
        <Bot key={`${bot.tableId}-${bot.seat}`} {...bot} mine={bot.tableId === mine} />
      ))}
    </>
  );
}
