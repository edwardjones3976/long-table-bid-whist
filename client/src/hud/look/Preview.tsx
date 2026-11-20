/**
 * The look editor's live preview: one avatar from buildFigure(look, "near") on a small three.js canvas, breathing and
 * blinking, facing front until turned by the Turn buttons, a drag, the arrow keys or a gamepad's right stick, framed on the face or the full body, and lit by the
 * day or the night theme's light, against a backdrop that lightens toward the floor so the deepest skin reads.
 *
 *   <Preview look={look} label="Your new look: ..." zoom="full" light="july4" still={false} />
 *   <Preview ... wave />   facing front and waving every few seconds (the entry screen); still with Reduce motion
 *
 * Its canvas is a renderer of its own, so its figures use materials of their own (ownMaterials), freed with it.
 * Without WebGL (an old device, or the DOM tests) it shows a line of text instead. Its label always says
 * the look in words, so every choice still works for someone who cannot see the picture.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Group } from "three";
import { GESTURE_MS, type Look } from "../../../../shared/avatar";
import { buildFigure, HEIGHT_M, ownMaterials, type Figure, type OwnMaterials } from "../../avatar/figure";
import { measure } from "../../avatar/measure";
import { animate, blinkAt, newRig } from "../../avatar/motion";
import { applyRig } from "../../avatar/pose";
import { desk, pollGamepad } from "../../controls/input";
import type { Theme } from "../../state/local";
import { LOOKS } from "../../world/theme";

export type Zoom = "face" | "full";

interface Turn {
  angle: number;
}

let webgl: boolean | undefined;
/** Asked once per page; the probe lets its context go at once, so it never holds one of the browser's few. */
function canDraw(): boolean {
  if (webgl === undefined) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      webgl = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

const NoDrawing = () => <p className="look-nodraw">This device cannot draw the preview. Every choice still has its name.</p>;

/** A canvas that fails after the check (a lost context, say) leaves the editor usable. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <NoDrawing /> : this.props.children;
  }
}

/** A wave starts this often (ms) while waving. */
const WAVE_EVERY = 4000;

function Body({ look, own, turn, spin, still, wave }: { look: Look; own: OwnMaterials; turn: RefObject<Turn>; spin: number; still: boolean; wave: boolean }) {
  const holder = useRef<Group>(null);
  const figure = useRef<Figure | null>(null);
  const m = useMemo(() => measure(look), [look]);
  const rig = useMemo(newRig, []);
  // Built in the effect, so React's double run in development adds one figure and takes one away.
  useEffect(() => {
    const built = buildFigure(look, "near", own);
    holder.current?.add(built.root);
    figure.current = built;
    return () => {
      built.dispose();
      figure.current = null;
    };
  }, [look, own]);
  useFrame(({ clock }, delta) => {
    // On the entry screen no room reads the gamepad, so the preview does: the editor's bumpers, A and B work there too.
    if (!desk.rig) pollGamepad();
    // A gamepad's right stick turns it while the editor has the pad.
    turn.current.angle += desk.padSpin * Math.min(delta, 0.1) * 2.5;
    // The figure faces -Z; half a turn shows its front to the camera.
    if (holder.current) holder.current.rotation.y = Math.PI + spin + turn.current.angle;
    const built = figure.current;
    if (!built) return;
    // Alive but calm: the idle sway and blinks always, the wave only on the entry screen; Reduce motion stills both.
    const t = clock.elapsedTime;
    const ms = (t * 1000) % WAVE_EVERY;
    const act = wave && !still && ms < GESTURE_MS.wave ? { kind: "wave" as const, ms } : null;
    animate({ t, m, seed: 0, gait: { phase: 0, speed: 0 }, tuck: 0, floating: false, seated: null, act, calm: still }, rig);
    applyRig(built, rig);
    built.face.setMouth(rig.mouth);
    built.face.setBlink(still ? 0 : blinkAt(0, t));
  });
  return <group ref={holder} />;
}

function Aim({ zoom, height }: { zoom: Zoom; height: number }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    const y = zoom === "face" ? height * 0.9 : 0.95;
    camera.position.set(0, y, zoom === "face" ? 1.1 : 4.2);
    camera.lookAt(0, y, 0);
  }, [camera, zoom, height]);
  return null;
}

export function Preview({
  look,
  label,
  zoom,
  light,
  still,
  wave = false,
  spin = 0,
}: {
  look: Look;
  label: string;
  zoom: Zoom;
  light: Theme;
  still: boolean;
  wave?: boolean;
  /** Turned this far (radians) by the editor's Turn buttons, on top of any drag. */
  spin?: number;
}) {
  const turn = useRef<Turn>({ angle: 0 });
  const dragFrom = useRef<number | null>(null);
  const [drawable] = useState(canDraw);
  const own = useMemo(ownMaterials, []);
  useEffect(() => () => own.dispose(), [own]);
  const sky = LOOKS[light];
  const by = (angle: number) => void (turn.current.angle += angle);
  return (
    <div
      className="look-preview"
      role="img"
      aria-label={label}
      tabIndex={0}
      style={{ background: `linear-gradient(${sky.skyTop}, ${sky.skyHorizon} 45%, color-mix(in srgb, ${sky.skyHorizon} 60%, #b9b4c8))` }}
      onKeyDown={(event) => {
        const step = event.key === "ArrowLeft" ? -0.3 : event.key === "ArrowRight" ? 0.3 : 0;
        if (!step) return;
        event.preventDefault();
        by(step);
      }}
      onPointerDown={(event) => {
        dragFrom.current = event.clientX;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (dragFrom.current === null) return;
        by((event.clientX - dragFrom.current) * 0.012);
        dragFrom.current = event.clientX;
      }}
      onPointerUp={() => (dragFrom.current = null)}
      onPointerCancel={() => (dragFrom.current = null)}
    >
      {drawable ? (
        <Fallback>
          <Canvas camera={{ fov: 30, position: [0, 0.95, 4.2] }}>
            <hemisphereLight color={sky.hemiSky} groundColor={sky.hemiGround} intensity={sky.hemiIntensity} />
            {/* The theme's sun, brought round to the front so it lights the face rather than the back. */}
            <directionalLight position={[sky.sun[0] * 5, sky.sun[1] * 5, Math.abs(sky.sun[2]) * 5]} color={sky.sunColor} intensity={sky.sunIntensity} />
            <mesh rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.55, 40]} />
              <meshStandardMaterial color="#5a3a26" roughness={0.9} />
            </mesh>
            <Body look={look} own={own} turn={turn} spin={spin} still={still} wave={wave} />
            <Aim zoom={zoom} height={HEIGHT_M[look.height]} />
          </Canvas>
        </Fallback>
      ) : (
        <NoDrawing />
      )}
    </div>
  );
}
