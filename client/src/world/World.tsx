/**
 * The mansion and its backyard, drawn from world/layout.ts by way of plan.ts.
 *
 *   <World />     (no props; inside the R3F <Canvas> and <XR>)
 *
 * Follows the local store: theme picks the sky, light, decor and fireworks;
 * comfort.reducedMotion freezes the fireworks, stars, atmospheric motion and
 * slows the countdown clock. The foyer mirror is world/Mirror.tsx.
 * Colliders are layout's business: this file only draws.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, LineBasicMaterial, PointsMaterial, type Mesh, type Points } from "three";
import { noRaycast } from "../controls/Hands";
import { useLocal, type Theme } from "../state/local";
import { canvasTexture, FONT_STACK, makeTextTexture, textAspect } from "../ui/text";
import { ARTWORK_META, artwork, paintArtwork } from "./art";
import { Atmosphere } from "./Atmosphere";
import { Mirror } from "./Mirror";
import { useMusic } from "./Music";
import { Parts } from "./Parts";
import { ARTWORKS, CLOCK, decor, labels, rng, structure, type Artwork, type Label } from "./plan";
import { glowHaloTexture } from "./textures";
import {
  BURST_LIFE,
  BURST_POINTS,
  burstDirections,
  burstFrame,
  burstPlan,
  burstStyle,
  countdownText,
  DRINKING_GOURD_EDGES,
  DRINKING_GOURD_STARS,
  LOOKS,
  type Look,
} from "./theme";

const SKY_RADIUS = 150;

function Sky({ look, still }: { look: Look; still: boolean }) {
  const starMat = useMemo(() => new PointsMaterial({ size: 1.05, color: "#f6f8ff", transparent: true, opacity: 0.9, toneMapped: false }), []);
  const brightMat = useMemo(() => new PointsMaterial({ size: 1.8, color: "#ffecc8", transparent: true, opacity: 0.95, toneMapped: false }), []);
  const streakRef = useRef<Mesh>(null);
  const haloTex = useMemo(glowHaloTexture, []);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, look.skyTop);
    if (look.skyMid) gradient.addColorStop(0.32, look.skyMid);
    gradient.addColorStop(0.5, look.skyHorizon);
    gradient.addColorStop(1, look.skyHorizon);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4, 256);
    return canvasTexture(canvas);
  }, [look]);

  const { stars, brightStars, milkyWay, gourdStars, gourdLines, gourdLineMat } = useMemo(() => {
    const random = rng(11);
    const makeField = (count: number, minY: number) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const y = minY + random() * (0.94 - minY);
        const around = random() * Math.PI * 2;
        const flat = Math.sqrt(1 - y * y);
        positions.set([Math.cos(around) * flat * 140, y * 140, Math.sin(around) * flat * 140], i * 3);
      }
      return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
    };

    // Subtle Milky Way ribbon arching across the sky dome
    const mwPos = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const u = (i / 180) * Math.PI - Math.PI / 2;
      const spread = (random() - 0.5) * 0.28;
      const x = Math.sin(u) * 0.9 + spread * 0.5;
      const y = Math.cos(u) * 0.85 + 0.14 + (random() - 0.5) * 0.08;
      const z = Math.sin(u * 0.6) * 0.5 - 0.35 + spread;
      const len = Math.hypot(x, y, z) || 1;
      mwPos.set([(x / len) * 141, Math.max(12, (y / len) * 141), (z / len) * 141], i * 3);
    }

    // Drinking Gourd (Big Dipper) + Polaris constellation on the northern dome (-z)
    const gsPos = new Float32Array(DRINKING_GOURD_STARS.length * 3);
    DRINKING_GOURD_STARS.forEach((s, i) => {
      gsPos.set([s.dir[0] * 137, s.dir[1] * 137, s.dir[2] * 137], i * 3);
    });
    const glPos = new Float32Array(DRINKING_GOURD_EDGES.length * 6);
    DRINKING_GOURD_EDGES.forEach(([a, b], i) => {
      const sa = DRINKING_GOURD_STARS[a].dir;
      const sb = DRINKING_GOURD_STARS[b].dir;
      glPos.set([sa[0] * 137, sa[1] * 137, sa[2] * 137, sb[0] * 137, sb[1] * 137, sb[2] * 137], i * 6);
    });

    return {
      stars: makeField(260, 0.08),
      brightStars: makeField(64, 0.16),
      milkyWay: new BufferGeometry().setAttribute("position", new BufferAttribute(mwPos, 3)),
      gourdStars: new BufferGeometry().setAttribute("position", new BufferAttribute(gsPos, 3)),
      gourdLines: new BufferGeometry().setAttribute("position", new BufferAttribute(glPos, 3)),
      gourdLineMat: new LineBasicMaterial({ color: "#b6ccf5", transparent: true, opacity: 0.34, toneMapped: false }),
    };
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(
    () => () => {
      stars.dispose();
      brightStars.dispose();
      milkyWay.dispose();
      gourdStars.dispose();
      gourdLines.dispose();
      gourdLineMat.dispose();
      starMat.dispose();
      brightMat.dispose();
    },
    [stars, brightStars, milkyWay, gourdStars, gourdLines, gourdLineMat, starMat, brightMat],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!still && look.stars) {
      brightMat.opacity = 0.78 + Math.sin(t * 2.1) * 0.18;
      starMat.opacity = 0.84 + Math.cos(t * 1.3) * 0.1;
    }
    if (streakRef.current) {
      if (!still && look.shootingStars) {
        const cycle = t % 9.5;
        const active = cycle < 0.7;
        streakRef.current.visible = active;
        if (active) {
          const p = cycle / 0.7;
          streakRef.current.position.set(28 - p * 46, 86 - p * 18, -110 + p * 8);
        }
      } else {
        streakRef.current.visible = false;
      }
    }
  });

  const [sx, sy, sz] = look.sun;
  const moonPos: [number, number, number] = look.moon === "crescent" ? [52, 74, -88] : [sx * 128, sy * 128, sz * 128];

  return (
    <>
      <color attach="background" args={[look.skyHorizon]} />
      <fog attach="fog" args={[look.skyHorizon, 68, 165]} />
      <hemisphereLight args={[look.hemiSky, look.hemiGround, look.hemiIntensity]} />
      <directionalLight position={[sx * 50, sy * 50, sz * 50]} color={look.sunColor} intensity={look.sunIntensity} />
      <mesh raycast={noRaycast}>
        <sphereGeometry args={[SKY_RADIUS, 24, 12]} />
        <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[sx * 130, sy * 130, sz * 130]} raycast={noRaycast}>
        <sphereGeometry args={[5, 16, 12]} />
        <meshBasicMaterial color={look.sunColor} toneMapped={false} />
      </mesh>
      {haloTex && (
        <mesh position={[sx * 126, sy * 126, sz * 126]} raycast={noRaycast}>
          <planeGeometry args={[28, 28]} />
          <meshBasicMaterial map={haloTex} color={look.sunColor} transparent opacity={0.42} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      {look.moon === "crescent" && (
        <group position={moonPos}>
          <mesh raycast={noRaycast}>
            <sphereGeometry args={[3.4, 16, 12]} />
            <meshBasicMaterial color="#fff3d2" toneMapped={false} />
          </mesh>
          <mesh position={[1.25, 0.55, 0.8]} raycast={noRaycast}>
            <sphereGeometry args={[3.15, 16, 12]} />
            <meshBasicMaterial color={look.skyTop} toneMapped={false} />
          </mesh>
        </group>
      )}
      {look.stars && (
        <>
          <points geometry={stars} material={starMat} raycast={noRaycast} />
          <points geometry={brightStars} material={brightMat} raycast={noRaycast} />
          {look.milkyWay && (
            <points geometry={milkyWay} raycast={noRaycast}>
              <pointsMaterial size={1.6} color="#9bb2e6" transparent opacity={0.25} depthWrite={false} toneMapped={false} />
            </points>
          )}
          {look.constellations && (
            <>
              <points geometry={gourdStars} raycast={noRaycast}>
                <pointsMaterial size={2.2} color="#ffe9b5" toneMapped={false} />
              </points>
              <lineSegments geometry={gourdLines} material={gourdLineMat} raycast={noRaycast} />
            </>
          )}
          <mesh ref={streakRef} visible={false} rotation={[0, 0, 0.36]} raycast={noRaycast}>
            <planeGeometry args={[5.5, 0.22]} />
            <meshBasicMaterial color="#fff7dc" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
    </>
  );
}

function SignBoard({ label }: { label: Label }) {
  const texture = useMemo(
    () =>
      makeTextTexture([label.text], {
        fontPx: 96,
        color: "#f7f0df",
        background: "#16120e",
        border: "#c9a24a",
        radius: 18,
      }),
    [label.text],
  );
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
    paintArtwork(canvas, artwork(art.id), ARTWORK_META[art.id]);
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
  const material = useMemo(() => new PointsMaterial({ size: 0.95, transparent: true, depthWrite: false, toneMapped: false }), []);
  const run = useRef({ age: 0, count: 0, x: 0, y: 0, z: 0, style: burstStyle(theme, slot, 0) });
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const launch = (count: number) => {
    const plan = burstPlan(theme, slot, count);
    Object.assign(run.current, { age: 0, count, x: plan.x, y: plan.y, z: plan.z, style: burstStyle(theme, slot, count) });
    material.color.set(plan.color);
  };
  const draw = (age: number) => {
    const attribute = geometry.getAttribute("position") as BufferAttribute;
    burstFrame(attribute.array as Float32Array, directions, run.current.x, run.current.y, run.current.z, age, run.current.style);
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
      context.fillStyle = "#16120e";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#c9a24a";
      context.lineWidth = 4;
      context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#f7f0df";
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
      <Sky look={LOOKS[theme]} still={still} />
      <Parts parts={structure()} />
      <Parts parts={themed} />
      {SIGNS.map((label) => (
        <SignBoard key={label.key} label={label} />
      ))}
      {ARTWORKS.map((art) => (
        <FramedArt key={art.id} art={art} />
      ))}
      <Mirror />
      <Atmosphere theme={theme} still={still} />
      <Burst theme={theme} slot={0} still={still} />
      {!still && <Burst theme={theme} slot={1} still={false} />}
      {theme === "newyear" && <Countdown still={still} />}
    </>
  );
}
