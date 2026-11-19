/**
 * Small physical cues for the moments that matter: a controller buzz and a
 * short synthesized sound. Both follow the comfort settings and never throw:
 * a controller with no actuator, or a page that has not been clicked yet,
 * simply stays quiet.
 *
 *   cue("grab", event.pointerState?.inputSource)   buzz that controller and play the sound
 *   cue("land")                                    sound only: no controller named
 *
 * Cues: hover, grab, place and refuse for things in the hand; land for feet
 * reaching a surface (a jump, a drop, a teleport); splash for going into the pool;
 * tick for each of my last ten seconds on the turn clock (its buzz goes once, as they begin).
 */
import { local } from "../state/local";

export type Cue = "hover" | "grab" | "place" | "refuse" | "land" | "splash" | "tick";

/** Buzz strength (0 to 1) and length in milliseconds. */
export const BUZZ: Record<Cue, readonly [number, number]> = {
  hover: [0.15, 12],
  grab: [0.5, 25],
  place: [0.8, 35],
  refuse: [0.4, 90],
  land: [0.6, 40],
  splash: [0.7, 70],
  tick: [0.9, 150],
};

/** Start pitch in Hz, length in seconds and loudness. Hovering is silent, or it would chatter. */
const TONE: Record<Cue, readonly [number, number, number] | null> = {
  hover: null,
  grab: [520, 0.05, 0.06],
  place: [180, 0.09, 0.12],
  refuse: [140, 0.16, 0.08],
  land: [110, 0.1, 0.1],
  splash: [90, 0.28, 0.14],
  tick: [1200, 0.035, 0.05],
};

interface Buzzable {
  gamepad?: { hapticActuators?: readonly { pulse?: (value: number, duration: number) => unknown }[] } | null;
}

/** Buzzes one controller. `source` is its XRInputSource (a pointer event's pointerState.inputSource); anything else is ignored. */
export function buzz(name: Cue, source: unknown): void {
  if (!local.getState().comfort.haptics) return;
  try {
    const [strength, ms] = BUZZ[name];
    const actuator = (source as Buzzable | null | undefined)?.gamepad?.hapticActuators?.[0];
    // Some browsers answer with a promise that rejects when the controller has just gone to sleep.
    void Promise.resolve(actuator?.pulse?.(strength, ms)).catch(() => {});
  } catch {
    // No actuator, or the browser refused: stay quiet.
  }
}

let audio: AudioContext | null = null;

export function sound(name: Cue): void {
  const tone = TONE[name];
  if (!tone || !local.getState().comfort.sounds || typeof AudioContext === "undefined") return;
  try {
    audio ??= new AudioContext();
    // Browsers keep audio paused until the page has been clicked; the first cue after that starts it.
    if (audio.state === "suspended") void audio.resume().catch(() => {});
    const [pitch, length, loudness] = tone;
    const at = audio.currentTime;
    const voice = audio.createOscillator();
    const level = audio.createGain();
    voice.type = "triangle";
    voice.frequency.setValueAtTime(pitch, at);
    voice.frequency.exponentialRampToValueAtTime(pitch * 0.6, at + length);
    level.gain.setValueAtTime(loudness, at);
    level.gain.exponentialRampToValueAtTime(0.0001, at + length);
    voice.connect(level).connect(audio.destination);
    voice.start(at);
    voice.stop(at + length);
  } catch {
    // Audio is a nicety; never let it break a card play.
  }
}

/**
 * The last cues given and the hand each went to, oldest first ("none": no controller was named, or it is not a left
 * or right one). For browser tests, which cannot feel a buzz: window.__mansion.cues() hands out a copy.
 */
export const cueLog: { cue: Cue; hand: "left" | "right" | "none"; at: number }[] = [];
const LOG_LENGTH = 200;

/** The buzz (when a controller is named) and the sound for one moment. */
export function cue(name: Cue, source?: unknown): void {
  const side = (source as { handedness?: unknown } | null | undefined)?.handedness;
  cueLog.push({ cue: name, hand: side === "left" || side === "right" ? side : "none", at: Date.now() });
  if (cueLog.length > LOG_LENGTH) cueLog.shift();
  buzz(name, source);
  sound(name);
}
