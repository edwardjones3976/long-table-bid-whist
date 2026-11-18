/**
 * The card tables as people meet them in the 3D room (inside <Canvas> and <XR>):
 *
 *   every table        a status board overhead that turns to the viewer
 *   the table I am near "Sit here" / "Join as host" markers at the open places
 *   the table I am at   my hand, a panel of status and buttons either side of
 *                       my view, and the public cards, all turned toward my seat
 *
 * Everything shown and every button comes from describeTable (ui/actions.ts)
 * through useTableActions. Each interactive mesh takes R3F pointer events
 * (mouse and XR rays) and carries the same handler as userData.onActivate.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CircleGeometry,
  ConeGeometry,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
} from "three";
import type { Card } from "../../../shared/cards";
import type { TableId, TableStatus, TableSummary } from "../../../shared/protocol";
import { useStore } from "../net/store";
import { useLocal } from "../state/local";
import { useActiveTableId } from "../state/table";
import type { HandCard, TableButton, TableDescription } from "../ui/actions";
import { CARD_ASPECT, cardLabel, disposeCardTextures, makeCardBackTexture, makeCardTexture } from "../ui/cards";
import { makeTextTexture, releaseTexture, textAspect, type TextOptions } from "../ui/text";
import { TABLE_HEIGHT, tableSpot, tableSpots, type TableSpot } from "../world/layout";
import { boardLines, buttonGrid, fanLayout, resultSummary, seatLines, STATUS_WORDS, tableWords, wrap } from "./helpers";
import { useTableActions, type TableActions } from "./useTableActions";

type Vec3 = [number, number, number];

// Shared by every mesh here; passed as a prop, so React never disposes them.
const PLANE = new PlaneGeometry(1, 1);
const TURN_CONE = new ConeGeometry(0.025, 0.05, 3);
/** A different outline per status, so the board never relies on its colour. */
const STATUS_ICONS: Record<TableStatus, BufferGeometry> = {
  available: new RingGeometry(0.3, 0.5, 32),
  lobby: new CircleGeometry(0.5, 3),
  playing: new CircleGeometry(0.5, 32),
  results: new CircleGeometry(0.5, 4),
};
const STATUS_COLOURS: Record<TableStatus, string> = {
  available: "#5fd38d",
  lobby: "#ffd24a",
  playing: "#ff9a6b",
  results: "#d4b3ff",
};

const BUTTON_ON = "#14408f";
const BUTTON_OFF = "#2b2f3a";
const HAND_CARD_WIDTH = 0.064;
const HAND_RADIUS = 0.45;
const PANEL_RADIUS = 0.95;
/** How far public face cards lean back from upright, so a seated viewer reads them. */
const LEAN = -0.9;
const MAX_BACKS = 80;

/** A spot `radius` in front of the viewer, `angle` to their right, turned to face them. */
export const arc = (angle: number, radius: number, y: number): { position: Vec3; rotation: Vec3 } => ({
  position: [Math.sin(angle) * radius, y, -Math.cos(angle) * radius],
  rotation: [0, -angle, 0],
});

/** Text on a plane, as large as fits in `box` (width, height in metres). The texture is remade only when the words change. */
export function Label({
  lines,
  box,
  options,
  position,
  rotation,
  onActivate,
}: {
  lines: string[];
  box: [number, number];
  options?: TextOptions;
  position?: Vec3;
  rotation?: Vec3;
  onActivate?: () => void;
}) {
  const key = JSON.stringify([lines, options]);
  const texture = useMemo(() => makeTextTexture(lines, options), [key]);
  useEffect(() => () => releaseTexture(texture), [texture]);
  const aspect = textAspect(texture);
  const width = Math.min(box[0], box[1] * aspect);
  return (
    <mesh geometry={PLANE} position={position} rotation={rotation} scale={[width, width / aspect, 1]} userData={{ onActivate }}>
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

/** Turns its children about the vertical axis to face the viewer. Its position is in world space. */
function Facing({ x, y, z, children }: { x: number; y: number; z: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    // The world matrix, because in VR the camera sits inside the moving rig.
    const world = camera.matrixWorld.elements;
    if (ref.current) ref.current.rotation.y = Math.atan2(world[12] - x, world[14] - z);
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      {children}
    </group>
  );
}

/** A pressable panel button, named by its button id. Hover grows it and adds a white frame; a disabled one is flat and says why. */
export function Pressable({
  name,
  lines,
  size,
  disabled = false,
  onPress,
  position,
  rotation,
}: {
  name: string;
  lines: string[];
  size: [number, number];
  disabled?: boolean;
  onPress: () => void;
  position?: Vec3;
  rotation?: Vec3;
}) {
  const [hover, setHover] = useState(false);
  const lit = hover && !disabled;
  const background = disabled ? BUTTON_OFF : BUTTON_ON;
  const [width, height] = size;
  return (
    <group position={position} rotation={rotation} scale={lit ? 1.08 : 1}>
      {lit && (
        <mesh geometry={PLANE} position={[0, 0, -0.002]} scale={[width + 0.014, height + 0.014, 1]}>
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      <mesh
        name={name}
        geometry={PLANE}
        scale={[width, height, 1]}
        userData={{ onActivate: onPress }}
        onClick={(event) => {
          event.stopPropagation();
          onPress();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <meshBasicMaterial color={background} />
      </mesh>
      <Label
        lines={lines}
        box={[width * 0.94, Math.min(height * 0.9, lines.length * height * 0.36)]}
        options={{ background, color: disabled ? "#d0d4dc" : "#ffffff", fontPx: 44, padding: 6 }}
        position={[0, 0, 0.002]}
        onActivate={onPress}
      />
    </group>
  );
}

function CardFace({ card, width, position, rotation }: { card: Card; width: number; position: Vec3; rotation?: Vec3 }) {
  return (
    <mesh geometry={PLANE} position={position} rotation={rotation} scale={[width, width / CARD_ASPECT, 1]}>
      <meshBasicMaterial map={makeCardTexture(card)} />
    </mesh>
  );
}

/**
 * One card of my hand. A card I may pick grows under the pointer; a picked card
 * rises, gains a white frame and a pointer above it; a card I may not pick sits
 * lower and greyed.
 */
function HandCardMesh({ held, onPress, position, rotation }: { held: HandCard; onPress: () => void; position: Vec3; rotation: [number, number, number, "YXZ"] }) {
  const [hover, setHover] = useState(false);
  const { card, selectable, selected } = held;
  const height = HAND_CARD_WIDTH / CARD_ASPECT;
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, selected ? 0.025 : selectable ? 0 : -0.012, 0]} scale={hover && selectable ? 1.12 : 1}>
        {selected && (
          <>
            <mesh geometry={PLANE} position={[0, 0, -0.001]} scale={[HAND_CARD_WIDTH + 0.01, height + 0.01, 1]}>
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh geometry={TURN_CONE} position={[0, height / 2 + 0.03, 0]} rotation={[Math.PI, 0, 0]}>
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </>
        )}
        <mesh
          name={`card-${card.id}`}
          geometry={PLANE}
          scale={[HAND_CARD_WIDTH, height, 1]}
          userData={{ onActivate: onPress, label: cardLabel(card) }}
          onClick={(event) => {
            event.stopPropagation();
            onPress();
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHover(true);
          }}
          onPointerOut={() => setHover(false)}
        >
          <meshBasicMaterial map={makeCardTexture(card)} color={selectable || selected ? "#ffffff" : "#9a9a9a"} />
        </mesh>
      </group>
    </group>
  );
}

const dummy = new Object3D();
dummy.rotation.order = "YXZ";

/** Every face-down card on the table in one draw call. `items` is x, y, z, turn, width per card. */
function CardBacks({ items }: { items: number[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const count = Math.min(MAX_BACKS, items.length / 5);
    for (let i = 0; i < count; i += 1) {
      const width = items[i * 5 + 4];
      dummy.position.set(items[i * 5], items[i * 5 + 1], items[i * 5 + 2]);
      dummy.rotation.set(-Math.PI / 2, items[i * 5 + 3], 0);
      dummy.scale.set(width, width / CARD_ASPECT, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    // Not culled: the bounding sphere of an instanced mesh knows nothing of where its instances are.
    <instancedMesh ref={ref} args={[PLANE, undefined, MAX_BACKS]} frustumCulled={false}>
      <meshBasicMaterial map={makeCardBackTexture()} />
    </instancedMesh>
  );
}

function StatusBoard({ spot, summary }: { spot: TableSpot; summary: TableSummary }) {
  return (
    <Facing x={spot.x} y={0} z={spot.z}>
      <Label lines={[spot.label]} box={[1.7, 0.26]} options={{ fontPx: 96 }} position={[0, 2.7, 0]} />
      <mesh geometry={STATUS_ICONS[summary.status]} position={[-0.62, 2.43, 0]} scale={0.2}>
        <meshBasicMaterial color={STATUS_COLOURS[summary.status]} />
      </mesh>
      <Label lines={[STATUS_WORDS[summary.status]]} box={[1, 0.2]} options={{ fontPx: 80 }} position={[0.1, 2.43, 0]} />
      <Label lines={boardLines(summary)} box={[1.7, 0.42]} position={[0, 2.1, 0]} />
    </Facing>
  );
}

/** Shown to someone standing at a table they have not joined: one marker per place they may take. */
function SeatMarkers({ spot, actions }: { spot: TableSpot; actions: TableActions & { description: TableDescription } }) {
  const { description, error, press } = actions;
  return (
    <>
      {description.buttons
        .filter((button) => button.id.startsWith("sit-") && !button.disabled)
        .map((button) => {
          const host = button.id === "sit-host";
          const pose = host ? spot.host : spot.seats[Number(button.id.slice(4))];
          return (
            <Facing key={button.id} x={pose.x} y={host ? 1.45 : 1.15} z={pose.z}>
              <Pressable
                name={button.id}
                lines={host ? ["Join as host / dealer", "(does not play)"] : ["Sit here", `Seat ${Number(button.id.slice(4)) + 1}`]}
                size={[0.4, 0.15]}
                onPress={() => void press(button)}
              />
            </Facing>
          );
        })}
      {error && (
        <Facing x={spot.x} y={1.55} z={spot.z}>
          <Label lines={wrap(`Problem: ${error}`, 36)} box={[0.9, 0.3]} />
        </Facing>
      )}
    </>
  );
}

function ButtonPanel({ buttons, side, top, scale, press }: { buttons: TableButton[]; side: 1 | -1; top: number; scale: number; press: (button: TableButton) => void }) {
  const { columns, cells } = buttonGrid(buttons.length);
  const width = (columns === 3 ? 0.17 : 0.21) * scale;
  const height = 0.07 * scale;
  const step = (width + 0.012) / PANEL_RADIUS;
  return (
    <>
      {buttons.map((button, i) => {
        const { column, row } = cells[i];
        const words = wrap(button.label, columns === 3 ? 20 : 25);
        if (button.disabled && button.reason) words.push(...wrap(`(${button.reason})`, columns === 3 ? 20 : 25));
        return (
          <Pressable
            key={button.id}
            name={button.id}
            lines={words}
            size={[width, height]}
            disabled={button.disabled}
            onPress={() => press(button)}
            {...arc(side * (0.3 + (column + 0.5) * step), PANEL_RADIUS, top - row * (height + 0.01))}
          />
        );
      })}
    </>
  );
}

/** My own table: drawn in my seat's frame (I am at the origin looking along -z, the table centre is `reach` ahead). */
function AtTable({ spot, actions }: { spot: TableSpot; actions: TableActions & { description: TableDescription } }) {
  const { description, error, press, activateCard } = actions;
  const phase = useStore((state) => state.table?.view?.phase ?? null);
  const connection = useStore((state) => state.connection);
  const dominant = useLocal((state) => state.comfort.dominantHand);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const { tableCards, seats } = description;
  const me = seats.find((seat) => seat.isYou) ?? null;
  const viewer = me ? spot.seats[me.seat] : spot.host;
  const reach = Math.hypot(viewer.x - spot.x, viewer.z - spot.z);
  const side = dominant === "right" ? 1 : -1;
  const result = resultSummary(description, phase);

  /** A point on the table `radius` from its centre toward a seat. */
  const toward = (seat: number, radius: number, y: number): Vec3 => {
    const angle = spot.seats[seat].ry - viewer.ry;
    return [Math.sin(angle) * radius, y, Math.cos(angle) * radius - reach];
  };
  const top = TABLE_HEIGHT + 0.004;

  const backs = useMemo(() => {
    const items: number[] = [];
    for (const seat of seats) {
      if (seat.isYou || !seat.cardCount) continue;
      const angle = spot.seats[seat.seat].ry - viewer.ry;
      const [x, , z] = [Math.sin(angle) * 0.44, 0, Math.cos(angle) * 0.44 - reach];
      for (let i = 0; i < seat.cardCount; i += 1) {
        const along = (i - (seat.cardCount - 1) / 2) * 0.02;
        // Each card a hair higher than the last so the overlapped fan does not flicker.
        items.push(x + Math.cos(angle) * along, top + i * 0.0006, z - Math.sin(angle) * along, angle, 0.05);
      }
    }
    if (tableCards.stockCount) items.push(-0.09, top, -reach, 0, 0.07);
    if (tableCards.kittyCount) items.push(0, top, -reach, 0, 0.07);
    return items;
  }, [seats, tableCards.stockCount, tableCards.kittyCount, spot, viewer, reach, top]);

  const fan = fanLayout(description.hand.length);
  const rows = fan.length ? fan[fan.length - 1].row + 1 : 0;
  const publicY = (width: number): number => TABLE_HEIGHT + 0.01 + (width / CARD_ASPECT / 2) * Math.cos(LEAN);
  const meldsBySeat = [0, 1, 2, 3].map((seat) => tableCards.melds.filter((meld) => meld.seat === seat));

  const status = [
    // The page's connection badge cannot be seen in a headset, so a lost connection is said here too.
    ...(connection === "online" ? [] : [connection === "offline" ? "Offline: cannot reach the server" : "Reconnecting to the server..."]),
    ...(error ? wrap(`Problem: ${error}`, 44) : []),
    ...[...description.statusLines, ...tableWords(tableCards)].flatMap((line) => wrap(line, 44)),
  ];

  return (
    <group position={[viewer.x, 0, viewer.z]} rotation={[0, viewer.ry, 0]}>
      <Label lines={[description.title]} box={[0.6 * uiScale, 0.06 * uiScale]} {...arc(-side * 0.62, PANEL_RADIUS, 1.58)} />
      <Label
        lines={status}
        box={[0.6 * uiScale, 0.5 * uiScale]}
        options={{ align: "left", fontPx: 36 }}
        {...arc(-side * 0.62, PANEL_RADIUS, 1.28)}
      />
      <ButtonPanel buttons={description.buttons} side={side} top={1.5} scale={uiScale} press={(button) => void press(button)} />

      {description.hand.map((held, i) => {
        const { row, offset } = fan[i];
        const back = rows - 1 - row;
        const radius = HAND_RADIUS + back * 0.04;
        const angle = (offset * (HAND_CARD_WIDTH - 0.002)) / radius;
        return (
          <HandCardMesh
            key={held.card.id}
            held={held}
            onPress={() => activateCard(held.card.id)}
            position={[Math.sin(angle) * radius, 0.84 + back * 0.105, -Math.cos(angle) * radius]}
            rotation={[-0.45, -angle, 0, "YXZ"]}
          />
        );
      })}
      {me?.isTurn && (
        // Above the back row of my hand, where the cards cannot hide it.
        <group position={[0, 0.84 + Math.max(rows, 1) * 0.105 + 0.02, -HAND_RADIUS - Math.max(rows - 1, 0) * 0.04]} rotation={[-0.45, 0, 0]}>
          <mesh geometry={TURN_CONE} position={[-0.11, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <meshBasicMaterial color="#ffd24a" />
          </mesh>
          <Label lines={["YOUR TURN"]} box={[0.18, 0.04]} />
        </group>
      )}

      <CardBacks items={backs} />
      {seats.map((seat) => {
        if (seat.isYou) return null;
        const [x, , z] = toward(seat.seat, 0.54, 0);
        return (
          <group key={seat.seat} position={[x, TABLE_HEIGHT + 0.12, z]} rotation={[-0.3, 0, 0]}>
            <Label lines={seatLines(seat)} box={[0.3, 0.14]} options={{ fontPx: 48 }} />
            {seat.isTurn && (
              <mesh geometry={TURN_CONE} position={[0, 0.11, 0]} rotation={[Math.PI, 0, 0]}>
                <meshBasicMaterial color="#ffd24a" />
              </mesh>
            )}
          </group>
        );
      })}
      {tableCards.trick.map((play) => (
        <CardFace key={play.card.id} card={play.card} width={0.1} position={toward(play.seat, 0.2, publicY(0.1))} rotation={[LEAN, 0, 0]} />
      ))}
      {meldsBySeat.flatMap((melds, seat) => {
        // Rows run across my view whoever owns them, so no meld is seen edge-on.
        const widths = melds.map((meld) => (meld.cards.length - 1) * 0.033 + 0.06);
        const total = widths.reduce((sum, width) => sum + width + 0.02, -0.02);
        const [cx, , cz] = toward(seat, 0.3, 0);
        let left = cx - total / 2;
        return melds.flatMap((meld, m) => {
          const start = left + 0.03;
          left += widths[m] + 0.02;
          return meld.cards.map((card, i) => (
            <CardFace key={card.id} card={card} width={0.06} position={[start + i * 0.033, publicY(0.06), cz + i * 0.001]} rotation={[LEAN, 0, 0]} />
          ));
        });
      })}
      {tableCards.discardTop && (
        <CardFace card={tableCards.discardTop} width={0.07} position={[0.09, publicY(0.07), -reach]} rotation={[LEAN, 0, 0]} />
      )}
      {tableCards.stockCount !== null && (
        <Label
          lines={[`Stock: ${tableCards.stockCount}`, tableCards.discardTop ? `Discard: ${cardLabel(tableCards.discardTop)}` : "Discard pile empty"]}
          box={[0.3, 0.06]}
          position={[0, TABLE_HEIGHT + 0.03, -reach + 0.13]}
          rotation={[-1, 0, 0]}
        />
      )}
      {!!tableCards.kittyCount && (
        <Label lines={[`Kitty: ${tableCards.kittyCount} cards`]} box={[0.3, 0.04]} position={[0, TABLE_HEIGHT + 0.03, -reach + 0.13]} rotation={[-1, 0, 0]} />
      )}
      {result && (
        <Label
          lines={["GAME OVER", ...wrap(result.headline, 40), ...result.lines.flatMap((line) => wrap(line, 56))]}
          box={[1.1, 0.5]}
          position={[0, 1.55, -reach]}
        />
      )}
    </group>
  );
}

function ActiveTable({ tableId }: { tableId: TableId }) {
  const actions = useTableActions(tableId);
  const { description } = actions;
  if (!description) return null;
  const spot = tableSpot(tableId);
  const props = { spot, actions: { ...actions, description } };
  return description.role === "visitor" ? <SeatMarkers {...props} /> : <AtTable {...props} />;
}

export function Tables() {
  const tables = useStore((state) => state.room?.tables ?? null);
  const activeId = useActiveTableId();
  // Card faces are only drawn here, so their textures go when the tables do.
  useEffect(() => disposeCardTextures, []);
  if (!tables) return null;
  return (
    <>
      {tableSpots.map((spot) => {
        const summary = tables.find((table) => table.id === spot.id);
        return summary && <StatusBoard key={spot.id} spot={spot} summary={summary} />;
      })}
      {activeId && <ActiveTable key={activeId} tableId={activeId} />}
    </>
  );
}
