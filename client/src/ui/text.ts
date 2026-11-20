/**
 * Text for the 3D world, drawn to a canvas with the device's own fonts (nothing
 * is downloaded). Textures are cached by content, so asking twice is free.
 *
 *   const texture = makeTextTexture(["Tonk Lounge"], { fontPx: 96 });
 *   <mesh scale={[textAspect(texture) * height, height, 1]}> <planeGeometry/> <meshBasicMaterial map={texture}/> </mesh>
 *
 * Text that changes (a status board) makes a new texture per distinct content:
 * call releaseTexture(old) when you stop showing one.
 */
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

export const FONT_STACK = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export interface TextOptions {
  /** Height of one line of type in canvas pixels. Default 64. */
  fontPx?: number;
  color?: string;
  /** Fill behind the text; "transparent" for none. Default a near-black panel for contrast. */
  background?: string;
  align?: "left" | "center";
  bold?: boolean;
  /** Fixed canvas width in pixels; lines are not wrapped, so leave unset to fit the longest line. */
  width?: number;
  /** Default half a line. */
  padding?: number;
}

const cache = new Map<string, CanvasTexture>();

/** Shared by the card painter: a canvas texture set up for crisp, correctly coloured 2D art. */
export function canvasTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function makeTextTexture(lines: readonly string[], options: TextOptions = {}): CanvasTexture {
  const key = JSON.stringify([lines, options]);
  const cached = cache.get(key);
  if (cached) return cached;

  const { fontPx = 64, color = "#ffffff", background = "#10131c", align = "center", bold = true } = options;
  const padding = options.padding ?? fontPx / 2;
  const font = `${bold ? "700" : "400"} ${fontPx}px ${FONT_STACK}`;
  const lineHeight = fontPx * 1.3;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  const widest = Math.max(1, ...lines.map((text) => context.measureText(text).width));
  canvas.width = Math.ceil(options.width ?? widest + padding * 2);
  canvas.height = Math.ceil(lines.length * lineHeight + padding * 2);
  // Resizing a canvas resets its state.
  context.font = font;
  context.textBaseline = "middle";
  context.textAlign = align;
  if (background !== "transparent") {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.fillStyle = color;
  const x = align === "center" ? canvas.width / 2 : padding;
  lines.forEach((text, i) => context.fillText(text, x, padding + lineHeight * (i + 0.5)));

  const texture = canvasTexture(canvas);
  cache.set(key, texture);
  return texture;
}

/** Width divided by height, for sizing the plane a texture goes on. */
export function textAspect(texture: CanvasTexture): number {
  const canvas = texture.image as HTMLCanvasElement;
  return canvas.width / canvas.height;
}

/** Frees one text texture and forgets it. */
export function releaseTexture(texture: CanvasTexture): void {
  for (const [key, cached] of cache) if (cached === texture) cache.delete(key);
  texture.dispose();
}

export function disposeTextTextures(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
