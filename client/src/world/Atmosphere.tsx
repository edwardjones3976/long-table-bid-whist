/**
 * Living atmosphere & estate horizon for the mansion:
 *   - Distant tree ring & warm evening horizon lights outside PROPERTY
 *   - Soft baked contact shadows under tables, chairs, sofas & centerpiece
 *   - Beat-synced DJ booth turntables, speaker pulse & reactive dance floor
 *   - Living smoker wisps, potluck steam, Bid Whist hearth & pool caustics
 *   - Floating pool water lanterns & twilight/night fireflies
 *
 * Purely visual (every mesh uses noRaycast) and respects `still` (reducedMotion).
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
  type Group,
  type Mesh,
  type Points,
} from "three";
import { noRaycast } from "../controls/Hands";
import { local, type Theme } from "../state/local";
import { HOUSE, obstacles, pool, PROPERTY, rooms, tableSpots } from "./layout";
import { musicPulse } from "./Music";
import { rng } from "./plan";
import { contactShadowTexture, glowHaloTexture, waterRippleTexture } from "./textures";

const DANCE_FLOOR = { x0: 10, z0: -27.5, x1: 18, z1: -22.5 };

/** Distant stylized tree ring outside the 48x60 property boundary. */
function HorizonTrees({ theme }: { theme: Theme }) {
  const trees = useMemo(() => {
    const random = rng(1977);
    const items: { x: number; z: number; h: number; w: number; shade: string }[] = [];
    const shades = theme === "july4" ? ["#365838", "#426a41", "#2e4d33"] : theme === "golden" ? ["#293b32", "#34493b", "#22312a"] : ["#162228", "#1c2b30", "#131c22"];
    // North horizon behind backyard (z < -45), east/west edges, and south front approach
    for (let i = 0; i < 36; i++) {
      const side = i % 4;
      let x = 0;
      let z = 0;
      if (side === 0 || side === 1) {
        x = -44 + ((i / 2) * 88) / 18 + (random() - 0.5) * 4;
        z = side === 0 ? -47 - random() * 14 : 24 + random() * 12;
      } else {
        x = side === 2 ? -29 - random() * 14 : 29 + random() * 14;
        z = -46 + random() * 72;
      }
      if (x > PROPERTY.x0 - 3 && x < PROPERTY.x1 + 3 && z > PROPERTY.z0 - 3 && z < PROPERTY.z1 + 3) continue;
      items.push({ x, z, h: 4.5 + random() * 4.5, w: 2.6 + random() * 2.2, shade: shades[i % shades.length] });
    }
    return items;
  }, [theme]);

  const { trunks, crowns } = useMemo(() => {
    const tGeo = new CylinderGeometry(0.24, 0.36, 1, 10);
    const cGeo = new SphereGeometry(0.5, 12, 10);
    const tMat = new MeshBasicMaterial({ color: theme === "newyear" ? "#211d1b" : "#4a3728" });
    const cMat = new MeshBasicMaterial();
    const tMesh = new InstancedMesh(tGeo, tMat, trees.length);
    const cMesh = new InstancedMesh(cGeo, cMat, trees.length);
    tMesh.raycast = noRaycast;
    cMesh.raycast = noRaycast;
    tMesh.frustumCulled = false;
    cMesh.frustumCulled = false;

    const placer = new Object3D();
    const color = new Color();
    trees.forEach((tr, i) => {
      const trunkH = tr.h * 0.42;
      placer.position.set(tr.x, trunkH / 2 - 0.1, tr.z);
      placer.scale.set(1, trunkH, 1);
      placer.rotation.set(0, 0, 0);
      placer.updateMatrix();
      tMesh.setMatrixAt(i, placer.matrix);

      placer.position.set(tr.x, trunkH + tr.w * 0.35, tr.z);
      placer.scale.set(tr.w, tr.w * 0.92, tr.w);
      placer.updateMatrix();
      cMesh.setMatrixAt(i, placer.matrix);
      cMesh.setColorAt(i, color.set(tr.shade));
    });
    return { trunks: tMesh, crowns: cMesh };
  }, [trees, theme]);

  useEffect(
    () => () => {
      trunks.geometry.dispose();
      (trunks.material as MeshBasicMaterial).dispose();
      trunks.dispose();
      crowns.geometry.dispose();
      (crowns.material as MeshBasicMaterial).dispose();
      crowns.dispose();
    },
    [trunks, crowns],
  );

  return (
    <>
      <primitive object={trunks} />
      <primitive object={crowns} />
    </>
  );
}

/** Single instanced batch of soft floor contact shadows beneath major furniture. */
function ContactShadows() {
  const mesh = useMemo(() => {
    const tex = contactShadowTexture();
    if (!tex) return null;
    const spots: { x: number; y: number; z: number; d: number }[] = [];
    for (const spot of tableSpots) {
      spots.push({ x: spot.x, y: 0.023, z: spot.z, d: 1.55 });
      for (const s of spot.seats) spots.push({ x: s.x, y: 0.023, z: s.z, d: 0.72 });
      const hx = spot.x + (spot.host.x - spot.x) * 0.72;
      const hz = spot.z + (spot.host.z - spot.z) * 0.72;
      spots.push({ x: hx, y: 0.023, z: hz, d: 0.56 });
    }
    const center = obstacles.find((o) => o.kind === "centerpiece");
    if (center) {
      spots.push({ x: (center.rect.x0 + center.rect.x1) / 2, y: 0.004, z: (center.rect.z0 + center.rect.z1) / 2, d: 3.35 });
    }
    for (const r of rooms.filter((rm) => rm.kind === "lounge")) {
      const west = r.rect.x0 === HOUSE.x0;
      const dir = west ? 1 : -1;
      const wallX = west ? r.rect.x0 : r.rect.x1;
      const cz = (r.rect.z0 + r.rect.z1) / 2;
      spots.push({ x: wallX + dir * 1.9, y: 0.004, z: cz, d: 1.15 });
      spots.push({ x: wallX + dir * 2.6, y: 0.004, z: cz - 0.9, d: 0.85 });
      spots.push({ x: wallX + dir * 2.6, y: 0.004, z: cz + 0.9, d: 0.85 });
    }
    const geo = new PlaneGeometry(1, 1);
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.65 });
    const inst = new InstancedMesh(geo, mat, spots.length);
    inst.raycast = noRaycast;
    inst.frustumCulled = false;
    const placer = new Object3D();
    spots.forEach((sp, i) => {
      placer.position.set(sp.x, sp.y, sp.z);
      placer.rotation.set(-Math.PI / 2, 0, 0);
      placer.scale.set(sp.d, sp.d, 1);
      placer.updateMatrix();
      inst.setMatrixAt(i, placer.matrix);
    });
    return inst;
  }, []);

  useEffect(
    () => () => {
      if (!mesh) return;
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );

  return mesh ? <primitive object={mesh} /> : null;
}

/** Beat-synced DJ booth vinyl platters, speaker pulses, and reactive dance-floor lights. */
function MusicAtmosphere({ theme, still }: { theme: Theme; still: boolean }) {
  const booth = useMemo(() => obstacles.find((o) => o.kind === "dj-booth")!.rect, []);
  const bx = (booth.x0 + booth.x1) / 2;
  const bz = (booth.z0 + booth.z1) / 2;
  const deckL = useRef<Group>(null);
  const deckR = useRef<Group>(null);
  const pulseL = useRef<Mesh>(null);
  const pulseR = useRef<Mesh>(null);

  const tiles = useMemo(() => {
    const list: { x: number; z: number }[] = [];
    for (let x = DANCE_FLOOR.x0; x < DANCE_FLOOR.x1; x++) {
      for (let z = DANCE_FLOOR.z0; z < DANCE_FLOOR.z1; z++) {
        list.push({ x: x + 0.5, z: z + 0.5 });
      }
    }
    return list;
  }, []);

  const floorMesh = useMemo(() => {
    const geo = new PlaneGeometry(0.88, 0.88);
    const mat = new MeshBasicMaterial({ transparent: true, opacity: 0.24, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
    const inst = new InstancedMesh(geo, mat, tiles.length);
    inst.raycast = noRaycast;
    inst.frustumCulled = false;
    const placer = new Object3D();
    const color = new Color();
    const palette = theme === "july4" ? ["#4f78c4", "#f0dec0", "#c9504a"] : theme === "newyear" ? ["#e6c05c", "#9ab2ff", "#fff0c8"] : ["#f2b25c", "#c96a42", "#e8c87a"];
    tiles.forEach((tile, i) => {
      placer.position.set(tile.x, 0.023, tile.z);
      placer.rotation.set(-Math.PI / 2, 0, 0);
      placer.scale.set(1, 1, 1);
      placer.updateMatrix();
      inst.setMatrixAt(i, placer.matrix);
      inst.setColorAt(i, color.set(palette[i % palette.length]));
    });
    return inst;
  }, [tiles, theme]);

  useEffect(
    () => () => {
      floorMesh.geometry.dispose();
      (floorMesh.material as MeshBasicMaterial).dispose();
      floorMesh.dispose();
    },
    [floorMesh],
  );

  const colorHelper = useMemo(() => new Color(), []);
  const placer = useMemo(() => new Object3D(), []);

  useFrame(({ clock }, delta) => {
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const kickAge = musicPulse.playing ? (nowMs - musicPulse.kickAt) / 1000 : 1;
    const pulse = !still && musicPulse.playing && kickAge < 0.35 ? Math.max(0, 1 - kickAge / 0.35) : 0;

    if (!still && musicPulse.playing) {
      if (deckL.current) deckL.current.rotation.y += delta * 2.1;
      if (deckR.current) deckR.current.rotation.y -= delta * 1.8;
    }
    const ringScale = 1 + pulse * 0.26;
    if (pulseL.current) pulseL.current.scale.setScalar(ringScale);
    if (pulseR.current) pulseR.current.scale.setScalar(ringScale);

    const player = local.getState().playerPose;
    const beat = musicPulse.playing ? musicPulse.beat : Math.floor(clock.elapsedTime * 1.4) % 4;
    const baseHex = theme === "july4" ? "#7aa2eb" : theme === "newyear" ? "#e8c56b" : "#f2b25c";
    const hotHex = theme === "july4" ? "#ffe9b8" : "#ffe69e";
    const t = clock.elapsedTime;
    let dirty = false;

    tiles.forEach((tile, i) => {
      const nearPlayer = player !== null && Math.hypot(player.x - tile.x, player.z - tile.z) < 0.85;
      const checkerActive = !still && ((Math.floor(tile.x) + Math.floor(tile.z) + beat) % 4 === 0);
      const lift = nearPlayer ? 1.0 : checkerActive ? 0.65 + pulse * 0.35 : 0.28 + (still ? 0 : 0.08 * Math.sin(t * 2 + i));
      colorHelper.set(nearPlayer ? hotHex : baseHex).multiplyScalar(lift);
      floorMesh.setColorAt(i, colorHelper);
      if (nearPlayer || !still) {
        const s = nearPlayer ? 0.98 : checkerActive ? 0.92 + pulse * 0.06 : 0.84;
        placer.position.set(tile.x, 0.023, tile.z);
        placer.rotation.set(-Math.PI / 2, 0, 0);
        placer.scale.set(s, s, 1);
        placer.updateMatrix();
        floorMesh.setMatrixAt(i, placer.matrix);
        dirty = true;
      }
    });
    if (floorMesh.instanceColor) floorMesh.instanceColor.needsUpdate = true;
    if (dirty) floorMesh.instanceMatrix.needsUpdate = true;
  });

  const speakerX = booth.x0 - 0.83;
  return (
    <>
      <primitive object={floorMesh} />
      {[
        { ref: deckL, x: bx - 0.7 },
        { ref: deckR, x: bx + 0.7 },
      ].map(({ ref, x }, idx) => (
        <group key={idx} ref={ref} position={[x, 1.045, bz]}>
          <mesh raycast={noRaycast}>
            <cylinderGeometry args={[0.19, 0.19, 0.014, 20]} />
            <meshBasicMaterial color="#18191e" />
          </mesh>
          <mesh position={[0.08, 0.01, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.09, 0.005, 0.025]} />
            <meshBasicMaterial color="#d9a84e" />
          </mesh>
        </group>
      ))}
      {[
        { ref: pulseL, z: booth.z0 - 0.7 },
        { ref: pulseR, z: booth.z1 + 0.7 },
      ].map(({ ref, z }, idx) => (
        <mesh key={idx} ref={ref} position={[speakerX, 1.0, z]} rotation={[0, -Math.PI / 2, 0]} raycast={noRaycast}>
          <ringGeometry args={[0.17, 0.21, 24]} />
          <meshBasicMaterial color="#ffca74" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/** Rising smoker smoke, potluck steam, Bid Whist hearth embers, and table ceiling light halos. */
function WarmthEffects({ theme, still }: { theme: Theme; still: boolean }) {
  const grill = useMemo(() => obstacles.find((o) => o.kind === "grill")!.rect, []);
  const potluck = useMemo(() => obstacles.find((o) => o.kind === "potluck-counter")!.rect, []);
  const smokeMesh = useRef<InstancedMesh>(null);
  const steamMesh = useRef<InstancedMesh>(null);
  const flameRef = useRef<Mesh>(null);
  const haloTex = useMemo(glowHaloTexture, []);
  const ringGeo = useMemo(() => new RingGeometry(0.55, 0.62, 32), []);
  const puffGeo = useMemo(() => new SphereGeometry(0.5, 10, 8), []);
  const smokeMat = useMemo(() => new MeshBasicMaterial({ color: "#d6d1ca", transparent: true, opacity: 0.24, depthWrite: false }), []);
  const steamMat = useMemo(() => new MeshBasicMaterial({ color: "#fff8ee", transparent: true, opacity: 0.22, depthWrite: false }), []);

  useEffect(
    () => () => {
      ringGeo.dispose();
      puffGeo.dispose();
      smokeMat.dispose();
      steamMat.dispose();
    },
    [ringGeo, puffGeo, smokeMat, steamMat],
  );

  const placer = useMemo(() => new Object3D(), []);
  const gx = (grill.x0 + grill.x1) / 2 + 0.35;
  const gz = (grill.z0 + grill.z1) / 2 - 0.15;

  useFrame(({ clock }) => {
    const t = still ? 0.5 : clock.elapsedTime;
    if (smokeMesh.current) {
      for (let i = 0; i < 10; i++) {
        const phase = (t * 0.28 + i / 10) % 1;
        placer.position.set(gx + Math.sin(phase * 4 + i) * 0.16, 1.08 + phase * 1.65, gz + Math.cos(phase * 3 + i) * 0.12);
        const s = 0.14 + phase * 0.34;
        placer.scale.set(s, s * 0.85, s);
        placer.updateMatrix();
        smokeMesh.current.setMatrixAt(i, placer.matrix);
      }
      smokeMesh.current.instanceMatrix.needsUpdate = true;
    }
    if (steamMesh.current) {
      for (let i = 0; i < 8; i++) {
        const dishX = potluck.x0 + 1.2 + (i * (potluck.x1 - potluck.x0 - 2.4)) / 7;
        const dishZ = (potluck.z0 + potluck.z1) / 2 + (i % 2 ? 0.15 : -0.15);
        const phase = (t * 0.35 + i * 0.19) % 1;
        placer.position.set(dishX + Math.sin(phase * 5 + i) * 0.06, 1.15 + phase * 0.65, dishZ);
        const s = 0.08 + (1 - Math.abs(phase - 0.5) * 2) * 0.12;
        placer.scale.set(s, s * 1.2, s);
        placer.updateMatrix();
        steamMesh.current.setMatrixAt(i, placer.matrix);
      }
      steamMesh.current.instanceMatrix.needsUpdate = true;
    }
    if (flameRef.current) {
      const flicker = still ? 1 : 0.92 + Math.sin(t * 7.5) * 0.1 + Math.sin(t * 13.1) * 0.06;
      flameRef.current.scale.set(1, flicker, 1);
    }
  });

  const haloColor = theme === "july4" ? "#fff0cf" : "#ffd28a";
  return (
    <>
      <instancedMesh ref={smokeMesh} args={[puffGeo, smokeMat, 10]} raycast={noRaycast} frustumCulled={false} />
      <instancedMesh ref={steamMesh} args={[puffGeo, steamMat, 8]} raycast={noRaycast} frustumCulled={false} />
      {/* Warm ember flame strip inside the Bid Whist hearth */}
      <mesh ref={flameRef} position={[23.72, 0.58, 14.5]} raycast={noRaycast}>
        <boxGeometry args={[0.08, 0.24, 0.65]} />
        <meshBasicMaterial color="#ffb44c" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* Subtle overhead light rings above StatusBoards (y = 3.12, completely clear of cards & boards) */}
      {tableSpots.map((spot) => (
        <group key={spot.id} position={[spot.x, 3.12, spot.z]}>
          <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
            <meshBasicMaterial color={haloColor} transparent opacity={0.45} toneMapped={false} />
          </mesh>
          {haloTex && (
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
              <planeGeometry args={[1.9, 1.9]} />
              <meshBasicMaterial map={haloTex} color={haloColor} transparent opacity={theme === "july4" ? 0.18 : 0.34} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

/** Animated pool caustic shimmer, centerpiece water sheen, floating lanterns & night fireflies. */
function WaterAndFireflies({ theme, still }: { theme: Theme; still: boolean }) {
  const rippleTex = useMemo(waterRippleTexture, []);
  const haloTex = useMemo(glowHaloTexture, []);
  const poolW = pool.water.x1 - pool.water.x0;
  const poolD = pool.water.z1 - pool.water.z0;
  const poolCx = (pool.water.x0 + pool.water.x1) / 2;
  const poolCz = (pool.water.z0 + pool.water.z1) / 2;
  const lanternsRef = useRef<Group>(null);
  const firefliesRef = useRef<Points>(null);

  const lanterns = useMemo(
    () => [
      { x: pool.water.x0 + 3.5, z: pool.water.z0 + 2.5 },
      { x: pool.water.x0 + 8.5, z: pool.water.z1 - 2.2 },
      { x: pool.water.x0 + 13.5, z: pool.water.z0 + 3.2 },
      { x: pool.water.x1 - 3.5, z: pool.water.z1 - 2.6 },
      { x: pool.water.x1 - 5.2, z: pool.water.z0 + 5.2 },
    ],
    [],
  );

  const { ffGeo, ffBase, ffMat } = useMemo(() => {
    const random = rng(8842);
    const count = 36;
    const base = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = -22 + random() * 44;
      const y = 0.7 + random() * 1.6;
      const z = -41 + random() * 22;
      base.set([x, y, z], i * 3);
      pos.set([x, y, z], i * 3);
    }
    const geo = new BufferGeometry().setAttribute("position", new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({ size: 0.16, color: "#ffe184", transparent: true, opacity: 0.78, depthWrite: false, toneMapped: false });
    return { ffGeo: geo, ffBase: base, ffMat: mat };
  }, []);

  useEffect(
    () => () => {
      ffGeo.dispose();
      ffMat.dispose();
    },
    [ffGeo, ffMat],
  );

  useFrame(({ clock }, delta) => {
    if (still) return;
    if (rippleTex) {
      rippleTex.offset.x = (rippleTex.offset.x + delta * 0.025) % 1;
      rippleTex.offset.y = (rippleTex.offset.y + delta * 0.015) % 1;
    }
    const t = clock.elapsedTime;
    if (lanternsRef.current) {
      lanternsRef.current.children.forEach((child, i) => {
        child.position.y = -0.095 + Math.sin(t * 1.4 + i * 1.7) * 0.016;
      });
    }
    if (firefliesRef.current && theme !== "july4") {
      const attr = ffGeo.getAttribute("position") as BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < ffBase.length; i += 3) {
        const idx = i / 3;
        arr[i] = ffBase[i] + Math.sin(t * 0.55 + idx * 1.3) * 0.55;
        arr[i + 1] = ffBase[i + 1] + Math.sin(t * 0.8 + idx * 0.9) * 0.25;
        arr[i + 2] = ffBase[i + 2] + Math.cos(t * 0.5 + idx * 1.1) * 0.55;
      }
      attr.needsUpdate = true;
    }
  });

  const evening = theme !== "july4";
  return (
    <>
      {rippleTex && (
        <mesh position={[poolCx, -0.114, poolCz]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[poolW - 0.1, poolD - 0.1]} />
          <meshBasicMaterial map={rippleTex} transparent opacity={evening ? 0.55 : 0.42} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      )}
      {evening && (
        <mesh position={[poolCx, -0.135, poolCz]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[poolW - 0.6, poolD - 0.6]} />
          <meshBasicMaterial color="#4fd1e6" transparent opacity={0.14} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      {/* Centerpiece water basin subtle sheen */}
      {haloTex && (
        <mesh position={[0, 0.723, -4]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[1.45, 1.45]} />
          <meshBasicMaterial map={haloTex} color="#ffdfa3" transparent opacity={0.35} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      {evening && (
        <>
          <group ref={lanternsRef}>
            {lanterns.map((l, i) => (
              <group key={i} position={[l.x, -0.095, l.z]}>
                <mesh raycast={noRaycast}>
                  <cylinderGeometry args={[0.16, 0.14, 0.03, 12]} />
                  <meshBasicMaterial color="#6e4e32" />
                </mesh>
                <mesh position={[0, 0.06, 0]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.09, 0.09, 0.1, 12]} />
                  <meshBasicMaterial color="#ffd885" toneMapped={false} />
                </mesh>
              </group>
            ))}
          </group>
          <points ref={firefliesRef} geometry={ffGeo} material={ffMat} raycast={noRaycast} frustumCulled={false} />
        </>
      )}
    </>
  );
}

export function Atmosphere({ theme, still }: { theme: Theme; still: boolean }) {
  return (
    <>
      <HorizonTrees theme={theme} />
      <ContactShadows />
      <MusicAtmosphere theme={theme} still={still} />
      <WarmthEffects theme={theme} still={still} />
      <WaterAndFireflies theme={theme} still={still} />
    </>
  );
}
