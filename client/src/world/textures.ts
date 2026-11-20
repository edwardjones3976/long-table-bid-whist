/**
 * Procedural surface & atmospheric canvas textures generated once at runtime.
 * 100% original code-generated graphics (no downloaded image files).
 * Keeps textures <= 512px and neutral-bright so instanced MeshLambertMaterial
 * vertex/instance colors tint cleanly in every theme.
 */
import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from "three";

export type PartTex = "wood" | "stone" | "plaster" | "felt" | "rug";

const surfaceCache = new Map<PartTex, CanvasTexture>();
let shadowTex: CanvasTexture | null = null;
let waterTex: CanvasTexture | null = null;
let haloTex: CanvasTexture | null = null;

function hash2(x: number, y: number, seed: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return [canvas, ctx];
}

function wrapTexture(canvas: HTMLCanvasElement, repeat = true): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  if (repeat) {
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
  }
  return tex;
}

function paintWood(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = "#f2f0ec";
  ctx.fillRect(0, 0, s, s);
  const planks = 10;
  const pw = s / planks;
  for (let i = 0; i < planks; i++) {
    const shade = 236 + Math.round(hash2(i, 1, 7) * 16);
    ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 5})`;
    ctx.fillRect(i * pw, 0, pw, s);
    // Subtle wood grain fibers
    for (let g = 0; g < 6; g++) {
      const gx = i * pw + ((g + 0.5) / 6) * pw;
      const alpha = 0.04 + hash2(i, g, 19) * 0.05;
      ctx.fillStyle = `rgba(80,60,40,${alpha.toFixed(3)})`;
      ctx.fillRect(gx, 0, 1.2, s);
    }
    // Plank seam and staggered end joint
    ctx.fillStyle = "rgba(65,50,35,0.12)";
    ctx.fillRect(i * pw, 0, 1.5, s);
    const jointY = ((i * 89 + 37) % (s - 20)) + 10;
    ctx.fillRect(i * pw, jointY, pw, 1.5);
  }
}

function paintStone(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = "#f4f2ee";
  ctx.fillRect(0, 0, s, s);
  const grid = 8;
  const cell = s / grid;
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const v = 238 + Math.round(hash2(gx, gy, 31) * 15);
      ctx.fillStyle = `rgb(${v},${v - 1},${v - 4})`;
      ctx.fillRect(gx * cell + 1, gy * cell + 1, cell - 2, cell - 2);
      // Soft travertine mineral fleck
      for (let k = 0; k < 4; k++) {
        const fx = gx * cell + hash2(gx + k, gy, 43) * (cell - 4) + 2;
        const fy = gy * cell + hash2(gx, gy + k, 59) * (cell - 4) + 2;
        ctx.fillStyle = k % 2 ? "rgba(255,255,255,0.22)" : "rgba(110,98,82,0.08)";
        ctx.fillRect(fx, fy, 4, 2);
      }
    }
  }
}

function paintPlaster(ctx: CanvasRenderingContext2D, s: number): void {
  // Uniform warm plaster weave so full-height walls, window headers and door arches match seamlessly.
  ctx.fillStyle = "#f2f0ec";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 420; i++) {
    const x = hash2(i, 3, 71) * s;
    const y = hash2(i, 7, 73) * s;
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.08)" : "rgba(70,65,58,0.045)";
    ctx.fillRect(x, y, 5, 3);
  }
}

function paintFelt(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = "#eef0eb";
  ctx.fillRect(0, 0, s, s);
  const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.5);
  grad.addColorStop(0, "rgba(255,255,255,0.12)");
  grad.addColorStop(0.76, "rgba(255,255,255,0.0)");
  grad.addColorStop(1, "rgba(20,25,20,0.18)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  // Fine woven wool crosshatch
  ctx.fillStyle = "rgba(35,45,35,0.05)";
  for (let i = 0; i < s; i += 4) {
    ctx.fillRect(i, 0, 1, s);
    ctx.fillRect(0, i, s, 1);
  }
}

function paintRug(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = "#f2efe9";
  ctx.fillRect(0, 0, s, s);
  const cx = s / 2;
  const cy = s / 2;
  // Concentric woven bands + heritage geometric border ring mapped to cylinder cap UVs
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.43, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(40,30,22,0.14)";
  ctx.lineWidth = s * 0.014;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.37, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.16, 0, Math.PI * 2);
  ctx.stroke();

  // Woven diamond/step ticks along the medallion ring
  const ticks = 24;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const rx = cx + Math.cos(a) * s * 0.4;
    const ry = cy + Math.sin(a) * s * 0.4;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(a);
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,245,220,0.28)" : "rgba(45,32,20,0.14)";
    ctx.fillRect(-s * 0.014, -s * 0.014, s * 0.028, s * 0.028);
    ctx.restore();
  }
  // Subtle textile weave
  ctx.fillStyle = "rgba(35,30,25,0.045)";
  for (let i = 0; i < s; i += 4) {
    ctx.fillRect(i, 0, 1, s);
    ctx.fillRect(0, i, s, 1);
  }
}

export function getSurfaceTexture(kind: PartTex): CanvasTexture | null {
  const existing = surfaceCache.get(kind);
  if (existing) return existing;
  const made = makeCanvas(256);
  if (!made) return null;
  const [canvas, ctx] = made;
  if (kind === "wood") paintWood(ctx, 256);
  else if (kind === "stone") paintStone(ctx, 256);
  else if (kind === "plaster") paintPlaster(ctx, 256);
  else if (kind === "felt") paintFelt(ctx, 256);
  else paintRug(ctx, 256);
  const tex = wrapTexture(canvas, kind !== "plaster" && kind !== "rug" && kind !== "felt");
  surfaceCache.set(kind, tex);
  return tex;
}

export function contactShadowTexture(): CanvasTexture | null {
  if (shadowTex) return shadowTex;
  const made = makeCanvas(64);
  if (!made) return null;
  const [canvas, ctx] = made;
  const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
  grad.addColorStop(0, "rgba(12,10,8,0.34)");
  grad.addColorStop(0.6, "rgba(12,10,8,0.16)");
  grad.addColorStop(1, "rgba(12,10,8,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  shadowTex = wrapTexture(canvas, false);
  return shadowTex;
}

export function waterRippleTexture(): CanvasTexture | null {
  if (waterTex) return waterTex;
  const made = makeCanvas(256);
  if (!made) return null;
  const [canvas, ctx] = made;
  ctx.clearRect(0, 0, 256, 256);
  // Seamless soft caustic ripples
  for (let i = 0; i < 42; i++) {
    const x = hash2(i, 2, 101) * 256;
    const y = hash2(i, 5, 107) * 256;
    const r = 16 + hash2(i, 9, 113) * 24;
    for (const ox of [-256, 0, 256]) {
      for (const oy of [-256, 0, 256]) {
        ctx.strokeStyle = i % 2 ? "rgba(220,248,255,0.22)" : "rgba(255,246,210,0.14)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, r, r * 0.58, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  waterTex = wrapTexture(canvas, true);
  waterTex.repeat.set(3, 2);
  return waterTex;
}

export function glowHaloTexture(): CanvasTexture | null {
  if (haloTex) return haloTex;
  const made = makeCanvas(128);
  if (!made) return null;
  const [canvas, ctx] = made;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, "rgba(255,244,210,0.9)");
  grad.addColorStop(0.35, "rgba(255,220,165,0.38)");
  grad.addColorStop(1, "rgba(255,210,150,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  haloTex = wrapTexture(canvas, false);
  return haloTex;
}
