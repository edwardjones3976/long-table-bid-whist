/**
 * What changes with the celebration besides the decor parts: the sky and
 * light, the firework show, and the New Year countdown text. Pure data and
 * maths, no three.js.
 */
import type { Theme } from "../state/local";
import { YARD } from "./layout";
import { rng } from "./plan";

export interface Look {
  skyTop: string;
  skyHorizon: string;
  stars: boolean;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  /** Direction to the sun or moon; its disc is drawn far along it. */
  sun: [number, number, number];
  /** Seconds between firework bursts in each of the two slots. */
  burstEvery: number;
  burstColors: string[];
}

export const LOOKS: Record<Theme, Look> = {
  july4: {
    skyTop: "#5d8fc9",
    skyHorizon: "#f4c98f",
    stars: false,
    hemiSky: "#fff2dc",
    hemiGround: "#8a8272",
    hemiIntensity: 2.2,
    sunColor: "#ffd9a0",
    sunIntensity: 1.6,
    sun: [-0.55, 0.45, -0.7],
    burstEvery: 11,
    burstColors: ["#ff6b5e", "#ffffff", "#6f9bff"],
  },
  newyear: {
    skyTop: "#070b1a",
    skyHorizon: "#27304f",
    stars: true,
    // Night outside, but the open-roofed rooms still have to be bright enough to read cards.
    hemiSky: "#ffe6bf",
    hemiGround: "#4a4658",
    hemiIntensity: 1.5,
    sunColor: "#aebcff",
    sunIntensity: 0.5,
    sun: [0.4, 0.7, -0.6],
    burstEvery: 5,
    burstColors: ["#ffd76a", "#e8ecf2", "#ff9d5c"],
  },
};

export const BURST_POINTS = 70;
/** Seconds a burst stays visible. */
export const BURST_LIFE = 2.4;

/** Unit directions for one burst's sparks, as x,y,z triples. */
export function burstDirections(seed: number, count = BURST_POINTS): Float32Array {
  const random = rng(seed);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = random() * 2 - 1;
    const around = random() * Math.PI * 2;
    const flat = Math.sqrt(1 - y * y);
    out.set([Math.cos(around) * flat, y, Math.sin(around) * flat], i * 3);
  }
  return out;
}

/** Where burst number `n` of a slot goes off, above and beyond the back fence, and its colour. */
export function burstPlan(theme: Theme, slot: number, n: number): { x: number; y: number; z: number; color: string } {
  const random = rng(slot * 7919 + n * 104729 + (theme === "july4" ? 1 : 2));
  const colors = LOOKS[theme].burstColors;
  return {
    x: YARD.x0 + random() * (YARD.x1 - YARD.x0),
    y: 16 + random() * 8,
    z: YARD.z0 - 4 - random() * 14,
    color: colors[Math.floor(random() * colors.length)],
  };
}

/** Writes the spark positions `age` seconds into a burst into `out` (no allocation: called every frame). */
export function burstFrame(out: Float32Array, directions: Float32Array, x: number, y: number, z: number, age: number): void {
  // Fast at first, easing out, then drooping a little.
  const reach = 6 * (1 - Math.exp(-2.2 * age));
  const droop = 0.7 * age * age;
  for (let i = 0; i < directions.length; i += 3) {
    out[i] = x + directions[i] * reach;
    out[i + 1] = y + directions[i + 1] * reach - droop;
    out[i + 2] = z + directions[i + 2] * reach;
  }
}

/** Time left until the coming local midnight, as "HH:MM:SS" (or "HH:MM" when `seconds` is false). */
export function countdownText(now: Date, seconds: boolean): string {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const left = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  const text = `${two(Math.floor(left / 3600))}:${two(Math.floor(left / 60) % 60)}`;
  return seconds ? `${text}:${two(left % 60)}` : text;
}
