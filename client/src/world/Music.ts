/**
 * The party's music: an original groove synthesised live with WebAudio
 * oscillators and noise. No samples and no existing tune; the patterns below
 * were written for this project. Each theme has its own feel.
 *
 * useMusic() (called by World) starts playing only after the first tap or key
 * press, follows the local store's music switch, volume and theme, and places
 * the sound at the music booth so it gets louder as you walk toward it.
 */
import { useEffect } from "react";
import { local, type Theme } from "../state/local";
import { obstacles } from "./layout";

export interface Groove {
  bpm: number;
  /** How late every second sixteenth is played, as a fraction of a step. */
  swing: number;
  /** Sixteen steps to the bar. */
  kick: number[];
  snap: number[];
  hat: number[];
  /** Steps on which the chord is struck. */
  stabs: number[];
  /** Semitones above the bar's root, or null for a rest. */
  bass: (number | null)[];
  /** Four bars: the bass root and the chord, as MIDI notes. */
  bars: { root: number; chord: number[] }[];
}

const _ = null;

export const GROOVES: Record<Theme, Groove> = {
  // A laid-back, sunny afternoon shuffle.
  july4: {
    bpm: 92,
    swing: 0.14,
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    stabs: [2, 7, 10],
    bass: [0, _, _, 0, _, _, 7, _, 0, _, _, _, 12, _, 10, _],
    bars: [
      { root: 41, chord: [65, 69, 72, 76] },
      { root: 40, chord: [64, 67, 71, 74] },
      { root: 38, chord: [62, 65, 69, 72] },
      { root: 43, chord: [62, 65, 67, 72] },
    ],
  },
  // A brighter late-night four-on-the-floor.
  newyear: {
    bpm: 112,
    swing: 0,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    stabs: [0, 3, 6, 11],
    bass: [0, _, 0, _, _, 0, _, 12, 0, _, 0, _, _, 7, _, 10],
    bars: [
      { root: 45, chord: [60, 64, 67, 71] },
      { root: 41, chord: [60, 64, 65, 69] },
      { root: 38, chord: [60, 64, 65, 69] },
      { root: 40, chord: [62, 64, 69, 71] },
    ],
  },
};

const hertz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** One note with a quick attack and an exponential fall, through an optional filter. */
function note(
  context: AudioContext,
  out: AudioNode,
  at: number,
  length: number,
  level: number,
  source: OscillatorNode | AudioBufferSourceNode,
  filter?: { type: BiquadFilterType; frequency: number },
): void {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  let tail: AudioNode = source;
  if (filter) {
    const node = context.createBiquadFilter();
    node.type = filter.type;
    node.frequency.value = filter.frequency;
    tail.connect(node);
    tail = node;
  }
  tail.connect(gain).connect(out);
  source.start(at);
  source.stop(at + length + 0.05);
}

function playStep(context: AudioContext, out: AudioNode, noise: AudioBuffer, groove: Groove, step: number, at: number, stepLength: number): void {
  const i = step % 16;
  const bar = groove.bars[Math.floor(step / 16) % groove.bars.length];
  const tone = (type: OscillatorType, frequency: number) => {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    return oscillator;
  };
  const hiss = () => {
    const source = context.createBufferSource();
    source.buffer = noise;
    return source;
  };
  if (groove.kick[i]) {
    const kick = tone("sine", 120);
    kick.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    note(context, out, at, 0.25, 0.9, kick);
  }
  if (groove.snap[i]) note(context, out, at, 0.12, 0.3, hiss(), { type: "bandpass", frequency: 1800 });
  if (groove.hat[i]) note(context, out, at, 0.05, 0.12, hiss(), { type: "highpass", frequency: 7000 });
  const bass = groove.bass[i];
  if (bass !== null) note(context, out, at, stepLength * 1.8, 0.5, tone("triangle", hertz(bar.root + bass)), { type: "lowpass", frequency: 500 });
  if (groove.stabs.includes(i)) {
    for (const midi of bar.chord) note(context, out, at, stepLength * 2.5, 0.07, tone("triangle", hertz(midi)), { type: "lowpass", frequency: 1400 });
  }
}

export function useMusic(): void {
  useEffect(() => {
    if (typeof AudioContext === "undefined") return;
    const booth = obstacles.find((o) => o.kind === "dj-booth")!.rect;
    let context: AudioContext | null = null;
    let master: GainNode | null = null;
    let noise: AudioBuffer | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let step = 0;
    let nextAt = 0;
    let woken = false;

    const pump = () => {
      if (!context || !master || !noise) return;
      const groove = GROOVES[local.getState().theme];
      const stepLength = 60 / groove.bpm / 4;
      // Schedule a little ahead of the clock so timer jitter is not heard.
      while (nextAt < context.currentTime + 0.25) {
        playStep(context, master, noise, groove, step, nextAt + (step % 2 ? groove.swing * stepLength : 0), stepLength);
        step = (step + 1) % 64;
        nextAt += stepLength;
      }
    };

    const apply = () => {
      const { comfort, playerPose } = local.getState();
      if (!woken) return;
      if (!comfort.music) {
        if (timer) clearInterval(timer);
        timer = null;
        void context?.suspend();
        return;
      }
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        const panner = context.createPanner();
        panner.panningModel = "equalpower";
        panner.refDistance = 6;
        panner.rolloffFactor = 0.7;
        panner.positionX.value = (booth.x0 + booth.x1) / 2;
        panner.positionY.value = 1.2;
        panner.positionZ.value = (booth.z0 + booth.z1) / 2;
        master.connect(panner).connect(context.destination);
        noise = context.createBuffer(1, context.sampleRate / 4, context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      master!.gain.value = comfort.musicVolume * 0.6;
      if (playerPose) {
        const { listener } = context;
        // Older Firefox has only the method form.
        if (listener.positionX) {
          listener.positionX.value = playerPose.x;
          listener.positionY.value = 1.6;
          listener.positionZ.value = playerPose.z;
          listener.forwardX.value = -Math.sin(playerPose.ry);
          listener.forwardZ.value = -Math.cos(playerPose.ry);
        } else {
          listener.setPosition(playerPose.x, 1.6, playerPose.z);
          listener.setOrientation(-Math.sin(playerPose.ry), 0, -Math.cos(playerPose.ry), 0, 1, 0);
        }
      }
      if (!timer) {
        void context.resume();
        nextAt = context.currentTime + 0.1;
        timer = setInterval(pump, 100);
      }
    };

    // Browsers only allow sound after the person has touched the page.
    const wake = () => {
      woken = true;
      apply();
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    const unsubscribe = local.subscribe(apply);
    // Joining the room was already a tap, so the music can usually start at once.
    if (navigator.userActivation?.hasBeenActive) wake();
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      unsubscribe();
      if (timer) clearInterval(timer);
      void context?.close();
    };
  }, []);
}
