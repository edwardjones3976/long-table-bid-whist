/**
 * The mansion and its backyard, drawn from world/layout.ts by way of plan.ts.
 *
 *   <World />     (no props; inside the R3F <Canvas> and <XR>)
 *
 * Follows the local store: theme picks the sky, light, decor and fireworks;
 * comfort.reducedMotion freezes the fireworks and slows the countdown clock.
 * The foyer mirror, and my own reflection in it, is world/Mirror.tsx.
 * Colliders are layout's business: this file only draws.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BackSide, BufferAttribute, BufferGeometry, PointsMaterial, type Points } from "three";
import { useLocal, type Theme } from "../state/local";
import { canvasTexture, FONT_STACK, makeTextTexture, textAspect } from "../ui/text";
import { artwork, paintArtwork } from "./art";
import { useMusic } from "./Music";
import { Parts } from "./Parts";
import { Mirror } from "./Mirror";
import { ARTWORKS, CLOCK, decor, labels, rng, structure, type Artwork, type Label } from "./plan";
import { BURST_LIFE, BURST_POINTS, burstDirections, burstFrame, burstPlan, countdownText, LOOKS, type Look } from "./theme";

const SKY_RADIUS = 150;

function Sky({ look }: { look: Look }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, look.skyTop);
    gradient.addColorStop(0.5, look.skyHorizon);
    gradient.addColorStop(1, look.skyHorizon);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4, 256);
    return canvasTexture(canvas);
  }, [look]);
  const stars = useMemo(() => {
    const random = rng(11);
    const positions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const y = 0.08 + random() * 0.9;
      const around = random() * Math.PI * 2;
      const flat = Math.sqrt(1 - y * y);
      positions.set([Math.cos(around) * flat * 140, y * 140, Math.sin(around) * flat * 140], i * 3);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => stars.dispose(), [stars]);
  const [sx, sy, sz] = look.sun;
  return (
    <>
      <color attach="background" args={[look.skyHorizon]} />
      <hemisphereLight args={[look.hemiSky, look.hemiGround, look.hemiIntensity]} />
      <directionalLight position={[sx * 50, sy * 50, sz * 50]} color={look.sunColor} intensity={look.sunIntensity} />
      <mesh>
        <sphereGeometry args={[SKY_RADIUS, 24, 12]} />
        <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[sx * 130, sy * 130, sz * 130]}>
        <sphereGeometry args={[5, 16, 12]} />
        <meshBasicMaterial color={look.sunColor} toneMapped={false} />
      </mesh>
      {look.stars && (
        <points geometry={stars}>
          <pointsMaterial size={1.1} color="#ffffff" toneMapped={false} />
        </points>
      )}
    </>
  );
}

function SignBoard({ label }: { label: Label }) {
  const texture = useMemo(() => makeTextTexture([label.text], { fontPx: 96 }), [label.text]);
  return (
    <mesh position={[label.x, label.y, label.z]} rotation={[0, label.ry, 0]} scale={[textAspect(texture) * label.height, label.height, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function FramedArt({ art }: { art: Artwork }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 576;
    paintArtwork(canvas, artwork(art.id));
    return canvasTexture(canvas);
  }, [art.id]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[art.x, art.y, art.z]} rotation={[0, art.ry, 0]}>
      <planeGeometry args={[art.w, art.h]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

/** One recycled firework burst. `still` (reduced motion) shows a single frozen burst instead of a show. */
function Burst({ theme, slot, still }: { theme: Theme; slot: number; still: boolean }) {
  const points = useRef<Points>(null);
  const directions = useMemo(() => burstDirections(slot + 1), [slot]);
  const geometry = useMemo(() => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(BURST_POINTS * 3), 3)), []);
  const material = useMemo(() => new PointsMaterial({ size: 0.9, transparent: true, depthWrite: false, toneMapped: false }), []);
  const run = useRef({ age: 0, count: 0, x: 0, y: 0, z: 0 });
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const launch = (count: number) => {
    const plan = burstPlan(theme, slot, count);
    Object.assign(run.current, { age: 0, count, x: plan.x, y: plan.y, z: plan.z });
    material.color.set(plan.color);
  };
  const draw = (age: number) => {
    const attribute = geometry.getAttribute("position") as BufferAttribute;
    burstFrame(attribute.array as Float32Array, directions, run.current.x, run.current.y, run.current.z, age);
    attribute.needsUpdate = true;
    material.opacity = Math.max(0, 1 - age / BURST_LIFE);
  };

  useEffect(() => {
    launch(0);
    if (still) draw(1);
    // Start hidden; the second slot waits half a period longer so the two never go off together.
    else run.current.age = BURST_LIFE + (slot * LOOKS[theme].burstEvery) / 2;
  }, [theme, slot, still]);

  useFrame((_, delta) => {
    if (still || !points.current) return;
    const state = run.current;
    state.age += delta;
    if (state.age > LOOKS[theme].burstEvery) launch(state.count + 1);
    points.current.visible = state.age < BURST_LIFE;
    if (points.current.visible) draw(state.age);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/** The New Year clock: time left until local midnight, redrawn once a second (once a minute with reduced motion). */
function Countdown({ still }: { still: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 624;
    canvas.height = 264;
    return canvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    const draw = () => {
      context.fillStyle = "#10131c";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#ffffff";
      context.font = `700 44px ${FONT_STACK}`;
      context.fillText("Countdown to midnight", canvas.width / 2, 56);
      context.fillStyle = "#ffd76a";
      context.font = `700 120px ${FONT_STACK}`;
      context.fillText(countdownText(new Date(), !still), canvas.width / 2, 170);
      texture.needsUpdate = true;
    };
    draw();
    const timer = setInterval(draw, still ? 60_000 : 1000);
    return () => clearInterval(timer);
  }, [texture, still]);
  return (
    <mesh position={[CLOCK.x, CLOCK.y, CLOCK.z]}>
      <planeGeometry args={[CLOCK.w, CLOCK.h]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

const SIGNS = labels();

export function World() {
  const theme = useLocal((state) => state.theme);
  const still = useLocal((state) => state.comfort.reducedMotion);
  const themed = useMemo(() => decor(theme), [theme]);
  useMusic();
  return (
    <>
      <Sky look={LOOKS[theme]} />
      <Parts parts={structure()} />
      <Parts parts={themed} />
      {SIGNS.map((label) => (
        <SignBoard key={label.key} label={label} />
      ))}
      {ARTWORKS.map((art) => (
        <FramedArt key={art.id} art={art} />
      ))}
      <Mirror />
      <Burst theme={theme} slot={0} still={still} />
      {!still && <Burst theme={theme} slot={1} still={false} />}
      {theme === "newyear" && <Countdown still={still} />}
    </>
  );
}
