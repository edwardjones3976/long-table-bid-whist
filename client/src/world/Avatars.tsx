/**
 * The other people in the room, each drawn from their own look (avatar/figure.ts) and brought to life by
 * avatar/motion.ts: walking and running, a tuck in a jump, floating in the pool, sitting at their seat with a
 * fan of card backs, glancing to whoever has the turn at my table, gestures, end-of-hand reactions
 * (avatar/reactions.ts), and a VR player's own head and hands. Each wears a name plate in their plate
 * colour with their symbol, always turned to the viewer. Bots are drawn the same way (world/Bots.tsx), told apart by a
 * steel blue plate in a dark frame with an antenna, marks no person's plate has.
 *
 * A figure is "near" detail within NEAR_M of the viewer and "far" beyond ("simple" shapes everywhere with the
 * comfort switch); out of view and out of the foyer mirror's reflection it holds still, and beyond PAUSE_M too unless a
 * gesture plays (it is posed once first, so a far seated figure still sits). Hide gestures
 * stops the others' gestures. A look from the server is cleaned again here, so an option this build does not know falls
 * back field by field. Avatars are scenery to pointers, and show nothing a player could not already see:
 * the cards in hand are only ever backs.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CylinderGeometry, DoubleSide, Frustum, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Sphere, SphereGeometry, Vector3, type Group } from "three";
import { cleanLook, hexOf, type Look } from "../../../shared/avatar";
import type { MemberInfo, Pose, Seat, TableId, TableStatus } from "../../../shared/protocol";
import { buildFigure, type Detail, type Figure } from "../avatar/figure";
import { measure } from "../avatar/measure";
import {
  actNow,
  animate,
  bearing,
  blinkAt,
  fanSize,
  gazeAt,
  isFloating,
  MAX_FAN,
  newRig,
  seatedLegs,
  easeLook,
  SEATED_HEAD,
  seatOf,
  seedOf,
  stepAir,
  stepGait,
  tuckOf,
  wrap,
  type Mover,
  type Played,
  type Scene,
  type Seated,
} from "../avatar/motion";
import { applyRig } from "../avatar/pose";
import { reactionsOn, watchHands } from "../avatar/reactions";
import { noRaycast } from "../controls/Hands";
import { net, useStore } from "../net/store";
import { local } from "../state/local";
import { CARD_ASPECT, makeCardBackTexture, SUIT_SYMBOLS } from "../ui/cards";
import { makeTextTexture, releaseTexture, textAspect } from "../ui/text";
import { seatPose } from "./layout";
import { inReflection, mirrorShown } from "./Mirror";

/** Full detail within this many metres of the viewer. */
const NEAR_M = 8;
/** Beyond this many metres a figure stops animating. */
const PAUSE_M = 15;
const PLATE_HEIGHT = 0.22;
/** How long a lean in to play a card takes, s. */
const LEAN_S = 0.8;
/** A little larger than a real card, to match the figures' big hands and to read from across the table. */
const CARD_W = 0.085;

/** Everyone's eased place and speed this frame, mine included: the others' eyes follow whoever is moving. */
const movers = new Map<string, Mover>();
/** End-of-hand reactions started at my table, kept a few seconds. */
const reactionLog: Played[] = [];
const view = { frustum: new Frustum(), matrix: new Matrix4(), eye: new Vector3(), sphere: new Sphere(new Vector3(), 1.1) };

/** What each drawn figure is now, by member id: for the browser tests' debug hook (main.tsx). `animated` is the clock time it was last posed. */
export const drawn = new Map<string, { memberId: string; lookKey: string; detail: Detail; triangles: number; gesture: string | null; animated: number }>();

/**
 * Whether a figure is posed this frame: never out of view; beyond PAUSE_M only while a gesture plays (a wave from
 * the backyard reads across the house), or once after it is built or changes seat, so a far figure is never left in
 * its rest pose.
 */
export const animates = (distance: number, seen: boolean, acting: boolean, posed: boolean): boolean => seen && (distance <= PAUSE_M || acting || !posed);

/**
 * A VR player's live head and hands to draw. Seated, none: where a hand reaches over the cards in its sorted row would
 * tell the table where a hidden card sat, so the scripted seated pose holds the fan instead.
 */
export const liveParts = (pose: Pick<Pose, "head" | "hands">, seated: boolean): Pick<Scene, "head" | "hands"> =>
  seated ? {} : { head: pose.head, hands: pose.hands };

/** Seated figures sit this far forward of the chair's centre, still on its cushion, so their knees and feet go under the table top. */
const SIT_FORWARD = 0.18;
export function sitPlace(tableId: TableId, seat: Seat): { x: number; z: number; ry: number } {
  const chair = seatPose(tableId, seat);
  return { x: chair.x - Math.sin(chair.ry) * SIT_FORWARD, z: chair.z - Math.cos(chair.ry) * SIT_FORWARD, ry: chair.ry };
}

/** The detail to draw at `distance` metres; the half-metre band either side of NEAR_M keeps the current one, so it never flickers. */
export function detailFor(distance: number, current: Detail, simple: boolean): Detail {
  if (simple) return "simple";
  if (distance < NEAR_M - 0.5) return "near";
  return distance > NEAR_M + 0.5 || current === "far" ? "far" : "near";
}

// ---- the name plate ----

const SYMBOLS: Record<Look["plateSymbol"], string> = {
  spade: SUIT_SYMBOLS.spades,
  heart: SUIT_SYMBOLS.hearts,
  diamond: SUIT_SYMBOLS.diamonds,
  club: SUIT_SYMBOLS.clubs,
  star: "★",
  none: "",
};
/** Pure black, not the house's near-black: with it every plate colour reaches a 4.5 contrast with one ink or the other. */
const DARK_INK = "#000000";

export const plateText = (name: string, symbol: Look["plateSymbol"]): string => `${SYMBOLS[symbol]} ${name}`.trim();

/** The old robots' steel blue: every bot's plate, so bots are told from people across the room. */
export const BOT_PLATE = "#7f9cbf";
export const plateColour = (look: Look, bot: boolean): string => (bot ? BOT_PLATE : (hexOf("plateColor", look.plateColor) ?? "#10131c"));

/**
 * A bot's marks, shared by every bot: the antenna the robots had on its plate, and a dark frame round the plate. No
 * person's plate has either, so a person who picks a blue near the bots' still never reads as one.
 */
const ANTENNA = {
  stick: new CylinderGeometry(0.008, 0.008, 0.09, 6).translate(0, 0.045, 0),
  ball: new SphereGeometry(0.024, 10, 6).translate(0, 0.1, 0),
  frame: new PlaneGeometry(),
  dark: new MeshBasicMaterial({ color: "#3a4a5e" }),
  light: new MeshBasicMaterial({ color: "#ffd166" }),
};
/** The frame's width each side, as a share of the plate's height. */
const FRAME = 0.14;

/** A bot's reach toward the table, 0 to 1: eased in over about a second while `reaching` (its turn at my table), and back after. */
export const reachToward = (reach: number, reaching: boolean, dt: number): number => reach + ((reaching ? 1 : 0) - reach) * Math.min(1, dt * 3);

/** The figure id of the bot in a seat: the seat has no member id, and reactions and the debug hook need one. */
export const botId = (tableId: TableId, seat: Seat): string => `bot-${tableId}-${seat}`;

/**
 * How far above the head a name plate floats, staggered so neighbours' plates never sit on one line: at a table
 * opposite seats a whole plate apart (and all under the table's board), standing one of four levels a whole plate
 * apart, steady from the member's id.
 */
export const plateLift = (id: string, seat: Seat | null): number =>
  seat === null ? 0.32 + (seedOf(id) % 4) * (PLATE_HEIGHT + 0.01) : 0.2 + Math.floor(seat / 2) * PLATE_HEIGHT;

/** sRGB relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** White or near-black text, whichever stands out more on the plate colour. */
export const plateInk = (background: string): string => (contrast(background, "#ffffff") >= contrast(background, DARK_INK) ? "#ffffff" : DARK_INK);

// ---- the fan of card backs ----

let fanParts: { geometry: PlaneGeometry; material: MeshBasicMaterial } | null = null;
/** One card shape and one back for every fan, made on first use (the texture needs a canvas). Backs on both sides: never a face. */
function fanPartsOnce() {
  if (!fanParts) {
    const height = CARD_W / CARD_ASPECT;
    // The fan turns about a point low on the cards, where the hand holds them.
    const geometry = new PlaneGeometry(CARD_W, height).translate(0, height * 0.4, 0);
    fanParts = { geometry, material: new MeshBasicMaterial({ map: makeCardBackTexture(), side: DoubleSide }) };
  }
  return fanParts;
}

const dummy = new Object3D();
function layFan(mesh: InstancedMesh, count: number): void {
  const spread = Math.min(0.14, 1.1 / Math.max(1, count));
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(0, 0, i * 0.0015);
    dummy.rotation.set(0, 0, ((count - 1) / 2 - i) * spread);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.visible = count > 0;
  // Measured again from the cards now held, so the fan is skipped out of view.
  mesh.boundingSphere = null;
}

// ---- one person ----

interface AvatarProps {
  /** A bot's look may be missing (an older server): it then wears the fallback. */
  member: Pick<MemberInfo, "id" | "name"> & { look?: Look };
  /** Where they play, or null standing (the non-playing host stands at their corner). */
  seat: { tableId: TableId; seat: Seat } | null;
  /** Their table's match status, for the fan of card backs. */
  status: TableStatus | undefined;
  /** They sit at my table, where I see the hand counts and the turn. */
  mine: boolean;
  /** A bot: a framed steel plate with an antenna, and at my table it reaches in over its whole turn. */
  bot?: boolean;
  /** Where a figure that sends no pose is at a Date.now() time: a bot's chair, a walker on its loop. */
  place?: (now: number) => Pose;
}

export function Avatar({ member, seat, status, mine, bot = false, place: placeAt }: AvatarProps) {
  const { id, name } = member;
  // A new room snapshot brings a new look object each time: rebuild only when the look itself changes.
  const lookKey = JSON.stringify(member.look);
  const look = useMemo(() => cleanLook(JSON.parse(lookKey ?? "null")), [lookKey]);
  const m = useMemo(() => measure(look), [look]);
  // Null until the first frame measures the distance, so nobody is built twice on arrival.
  const [detail, setDetail] = useState<Detail | null>(null);
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const plate = useRef<Mesh>(null);
  const antenna = useRef<Group>(null);
  const figure = useRef<(Figure & { detail: Detail }) | null>(null);
  const fan = useMemo(() => {
    const { geometry, material } = fanPartsOnce();
    const mesh = new InstancedMesh(geometry, material, MAX_FAN);
    mesh.name = "fan";
    mesh.count = 0;
    mesh.visible = false;
    mesh.raycast = noRaycast;
    return mesh;
  }, []);
  // The card slapped down in the card slap: one back, held flat along the right hand, shown only while it plays.
  const slapped = useMemo(() => {
    const { geometry, material } = fanPartsOnce();
    return Object.assign(new Mesh(geometry, material), { name: "slap-card", visible: false, raycast: noRaycast });
  }, []);
  const motion = useRef({
    gait: { phase: 0, speed: 0 },
    air: { ground: 0, settled: 0 },
    rig: newRig(),
    seed: seedOf(id),
    cards: -1,
    leanAt: -Infinity,
    reach: 0,
    fan: 0,
    mouth: "",
    look: { yaw: 0, pitch: SEATED_HEAD },
    posed: "",
    animated: -1,
  });

  useEffect(() => () => void fan.dispose(), [fan]);
  useEffect(
    () => () => {
      movers.delete(id);
      drawn.delete(id);
    },
    [id],
  );

  useEffect(() => {
    if (!detail) return;
    const built = buildFigure(look, detail);
    built.root.traverse((object) => (object.raycast = noRaycast));
    fan.position.set(0, -m.hand * 0.45, 0);
    built.joints.handL.add(fan);
    // In the palm's plane, reaching down past the fingers: the hand brings it down onto the table.
    slapped.position.set(0, -m.hand * 0.3, 0);
    slapped.rotation.set(0, Math.PI / 2, Math.PI);
    built.joints.handR.add(slapped);
    body.current?.add(built.root);
    figure.current = Object.assign(built, { detail });
    motion.current.mouth = "";
    motion.current.posed = "";
    return () => {
      fan.removeFromParent();
      slapped.removeFromParent();
      built.dispose();
      figure.current = null;
    };
  }, [look, detail, fan, slapped, m]);

  const hex = plateColour(look, bot);
  const symbol = bot ? "none" : look.plateSymbol;
  const texture = useMemo(() => makeTextTexture([plateText(name, symbol)], { fontPx: 56, background: hex, color: plateInk(hex) }), [name, symbol, hex]);
  useEffect(() => () => releaseTexture(texture), [texture]);
  const plateY = (seat ? m.height - (m.joints.pelvis[1] - seatedLegs(m).pelvisY) : m.height) + plateLift(id, seat?.seat ?? null);

  useFrame(({ camera, clock }, delta) => {
    const root = group.current;
    if (!root || !body.current || !plate.current) return;
    const state = net.getState();
    const now = Date.now();
    const pose = placeAt ? placeAt(now) : state.poses[id];
    root.visible = pose !== undefined;
    if (!pose) return void drawn.delete(id);
    const st = motion.current;
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    // At a table they sit in their own chair, whatever their head is doing.
    const place = seat ? sitPlace(seat.tableId, seat.seat) : pose;
    // The feet height: a jump, a bench top, the pool. Older clients send none, which is the floor.
    const y = seat ? 0 : (pose.y ?? 0);
    const { position } = root;
    const [x0, y0, z0] = [position.x, position.y, position.z];
    // Poses arrive ten times a second; easing toward the latest one hides the steps. Far off is a teleport.
    const teleport = Math.hypot(place.x - x0, place.z - z0) > 3;
    const ease = teleport ? 1 : Math.min(1, dt * 10);
    position.set(x0 + (place.x - x0) * ease, y0 + (y - y0) * ease, z0 + (place.z - z0) * ease);
    body.current.rotation.y = place.ry;
    st.gait = stepGait(st.gait, teleport || seat ? 0 : Math.hypot(position.x - x0, position.z - z0), dt, m);
    st.air = teleport ? { ground: position.y, settled: 0 } : stepAir(st.air, position.y, dt > 0 ? (position.y - y0) / dt : 0, dt);
    movers.set(id, { x: position.x, z: position.z, speed: st.gait.speed });
    // The world turn: in VR the camera sits inside the rig, which is itself turned. The plate has no turned parent.
    camera.getWorldQuaternion(plate.current.quaternion);

    let seated: Seated | null = null;
    if (seat) {
      const game = mine ? (state.table?.view ?? null) : null;
      const count = game?.handCounts[seat.seat] ?? null;
      const cards = fanSize(status, mine, count);
      if (cards !== st.fan) layFan(fan, (st.fan = cards));
      // Their public card count went down: they played, so they lean in.
      if (count !== null && st.cards >= 0 && count < st.cards) st.leanAt = t;
      st.cards = count ?? -1;
      const since = t - st.leanAt;
      // At my table they glance to whoever has the turn (down at their own cards on theirs); elsewhere they idle.
      let glance: Seated["look"] = null;
      const live = game && game.phase !== "hand-over" && game.phase !== "game-over";
      if (live) {
        const at = seatPose(seat.tableId, game.turn);
        glance = game.turn === seat.seat ? { yaw: 0, pitch: -0.3 } : { yaw: Math.max(-1, Math.min(1, wrap(bearing(place.x, place.z, at.x, at.z) - place.ry))), pitch: -0.08 };
      }
      // The head turns to the new turn over a moment, and back to the idle after the hand, never in one frame.
      easeLook(st.look, glance, dt);
      // A bot reaches in over its whole turn, as the robots' arm did; eased over about a second, close to its pause before playing.
      st.reach = reachToward(st.reach, !!(bot && live && game.turn === seat.seat), dt);
      const played = since >= 0 && since < LEAN_S ? Math.sin((Math.PI * since) / LEAN_S) : 0;
      seated = { holding: cards > 0, lean: Math.max(played, st.reach), look: st.look };
    } else if (st.fan) layFan(fan, (st.fan = 0));

    camera.getWorldPosition(view.eye);
    const distance = view.eye.distanceTo(position);
    const { comfort } = local.getState();
    const want = detailFor(distance, detail ?? "far", comfort.simpleShapes);
    if (want !== detail) setDetail(want);
    // Standing, past NEAR_M the plate grows with distance (up to twice), so a name still reads across a lounge or the yard;
    // it grows upward, off the head. Seated plates keep their size under the table's board; a bot's antenna grows anyway.
    const far = Math.min(2, Math.max(1, distance / NEAR_M));
    const grow = seat ? 1 : far;
    plate.current.scale.set(textAspect(texture) * PLATE_HEIGHT * grow, PLATE_HEIGHT * grow, 1);
    plate.current.position.y = plateY + ((grow - 1) * PLATE_HEIGHT) / 2;
    if (antenna.current) {
      antenna.current.position.y = plate.current.position.y + (PLATE_HEIGHT * grow) / 2;
      antenna.current.scale.setScalar(far);
    }
    const built = figure.current;
    const act = actNow(id, now, comfort.hideGestures ? [] : state.gestures, reactionLog);
    slapped.visible = act?.kind === "slap";
    const info = built && { memberId: id, lookKey, detail: built.detail, triangles: built.triangles, gesture: act?.kind ?? null, animated: st.animated };
    if (info) drawn.set(id, info);
    view.sphere.center.set(position.x, position.y + 0.9, position.z);
    // The mirror draws the scene again, so someone behind me but in its reflection keeps moving there.
    const seen = view.frustum.intersectsSphere(view.sphere) || (mirrorShown.rendered && inReflection(view.eye.x, view.eye.z, position.x, position.z));
    const seatKey = seat ? `${seat.tableId}:${seat.seat}` : "standing";
    if (!built || !animates(distance, seen, act !== null, st.posed === seatKey)) return;
    st.posed = seatKey;
    st.animated = t;
    if (info) info.animated = t;

    const rig = animate(
      {
        t,
        m,
        seed: st.seed,
        gait: st.gait,
        tuck: seat ? 0 : tuckOf(st.air, position.y),
        floating: !seat && isFloating(position.x, position.z, position.y),
        seated,
        act,
        ...liveParts(pose, seat !== null),
        calm: comfort.reducedMotion,
      },
      st.rig,
    );
    applyRig(built, rig);
    if (rig.mouth !== st.mouth) built.face.setMouth((st.mouth = rig.mouth));
    built.face.setBlink(blinkAt(st.seed, t));
    built.face.setGaze(gazeAt(position.x, position.z, place.ry + rig.joints.head[1], movers.values()), 0);
    // The fan stands up in the hand, tipped back toward its holder: its backs face the table.
    if (st.fan) fan.rotation.x = 0.3 - rig.joints.upperArmL[0] - rig.joints.foreArmL[0];
  });

  return (
    <group ref={group} visible={false} name={`avatar-${id}`}>
      <group ref={body} />
      <mesh ref={plate} name="plate" position={[0, plateY, 0]} scale={[textAspect(texture) * PLATE_HEIGHT, PLATE_HEIGHT, 1]} raycast={noRaycast}>
        <planeGeometry />
        {/* Not tone mapped: drawn in exactly the colours whose 4.5 contrast is checked. */}
        <meshBasicMaterial map={texture} toneMapped={false} />
        {/* Behind the plate (it faces the viewer along +z), larger by the frame each side; it scales with the plate. */}
        {bot && (
          <mesh
            name="frame"
            geometry={ANTENNA.frame}
            material={ANTENNA.dark}
            position={[0, 0, -0.005]}
            scale={[1 + (2 * FRAME) / textAspect(texture), 1 + 2 * FRAME, 1]}
            raycast={noRaycast}
          />
        )}
      </mesh>
      {bot && (
        <group ref={antenna} name="antenna" position={[0, plateY + PLATE_HEIGHT / 2, 0]}>
          <mesh geometry={ANTENNA.stick} material={ANTENNA.dark} raycast={noRaycast} />
          <mesh geometry={ANTENNA.ball} material={ANTENNA.light} raycast={noRaycast} />
        </group>
      )}
    </group>
  );
}

// ---- everyone ----

/** Watches my table's snapshots for the end of a hand and starts the others' reactions (avatar/reactions.ts). */
function useHandReactions(): void {
  const table = useStore((state) => state.table);
  const seen = useRef<{ tableId: TableId | null; key: string | null }>({ tableId: null, key: null });
  useEffect(() => {
    const tableId = table?.tableId ?? null;
    if (seen.current.tableId !== tableId) seen.current = { tableId, key: null };
    if (!table) return;
    const { seen: key, bySeat } = watchHands(seen.current.key, table, reactionsOn(local.getState().comfort));
    seen.current.key = key;
    if (!bySeat) return;
    const { room, me } = net.getState();
    const seats = room?.tables.find((summary) => summary.id === table.tableId)?.seats;
    const at = Date.now();
    reactionLog.splice(0, reactionLog.length, ...reactionLog.filter((played) => at - played.at < 2000));
    bySeat.forEach((kind, i) => {
      const memberId = seats?.[i].occupant === "bot" ? botId(table.tableId, i as Seat) : seats?.[i].memberId;
      if (kind && memberId && memberId !== me) reactionLog.push({ memberId, kind, at });
    });
  }, [table]);
}

export function Avatars() {
  const room = useStore((state) => state.room);
  const myTableId = useStore((state) => state.table?.tableId ?? null);
  const mine = useRef({ x: 0, z: 0, speed: 0 });
  useHandReactions();

  // Before the avatars' own frames: what the camera sees, and how fast I am moving.
  useFrame(({ camera }, delta) => {
    view.frustum.setFromProjectionMatrix(view.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const pose = local.getState().playerPose;
    const me = net.getState().me;
    if (!pose || !me || !(delta > 0)) return;
    const now = mine.current;
    const moved = Math.hypot(pose.x - now.x, pose.z - now.z);
    // My pose steps ten times a second; easing the speed smooths the steps into a walk.
    now.speed = moved > 3 ? 0 : now.speed + (moved / delta - now.speed) * Math.min(1, delta * 4);
    [now.x, now.z] = [pose.x, pose.z];
    movers.set(me, { x: now.x, z: now.z, speed: now.speed });
  }, -1);

  if (!room) return null;
  return (
    <>
      {room.members
        .filter((member) => member.id !== room.you && member.connected)
        .map((member) => {
          const seat = seatOf(room, member.id);
          const status = seat ? room.tables.find((table) => table.id === seat.tableId)?.status : undefined;
          return <Avatar key={member.id} member={member} seat={seat} status={status} mine={seat !== null && seat.tableId === myTableId} />;
        })}
    </>
  );
}
