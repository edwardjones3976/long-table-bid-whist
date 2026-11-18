/**
 * Playing-card names and procedurally painted card faces (original art, drawn
 * to a canvas; nothing is downloaded). A face shows a large rank, the suit
 * symbol and the suit's initial letter, so a suit is never told by colour alone.
 *
 *   cardLabel(card)        "A of Spades", "10 of Hearts", "Big Joker"
 *   makeCardTexture(card)  cached face texture, 5:7
 *   makeCardBackTexture()  cached back texture, 5:7
 */
import type { CanvasTexture } from "three";
import type { Card, Suit } from "../../../shared/cards";
import { canvasTexture, FONT_STACK } from "./text";

/** Width divided by height of a card. */
export const CARD_ASPECT = 5 / 7;

export const SUIT_NAMES: Record<Suit, string> = { clubs: "Clubs", diamonds: "Diamonds", hearts: "Hearts", spades: "Spades" };
export const SUIT_SYMBOLS: Record<Suit, string> = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };
/** Four distinct inks; the symbol and initial carry the meaning, the colour only helps. */
const SUIT_INKS: Record<Suit, string> = { clubs: "#0a5c2a", diamonds: "#0b4a9e", hearts: "#b00020", spades: "#111111" };
const FACE_RANKS: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

export function rankLabel(card: Card): string {
  return FACE_RANKS[card.rank] ?? String(card.rank);
}

export function cardLabel(card: Card): string {
  if (card.suit === "joker") return card.rank === 16 ? "Big Joker" : "Little Joker";
  return `${rankLabel(card)} of ${SUIT_NAMES[card.suit]}`;
}

const WIDTH = 250;
const HEIGHT = 350;
const cache = new Map<string, CanvasTexture>();

function blank(fill: string): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#1b1b1b";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = fill;
  context.fillRect(5, 5, WIDTH - 10, HEIGHT - 10);
  context.textAlign = "center";
  context.textBaseline = "middle";
  return { canvas, context };
}

export function makeCardTexture(card: Card): CanvasTexture {
  const cached = cache.get(card.id);
  if (cached) return cached;
  const { canvas, context } = blank("#fbf8ef");
  const text = (value: string, px: number, x: number, y: number) => {
    context.font = `700 ${px}px ${FONT_STACK}`;
    context.fillText(value, x, y);
  };
  if (card.suit === "joker") {
    const big = card.rank === 16;
    context.fillStyle = big ? "#5a1a8a" : "#1b1b1b";
    text(big ? "BIG" : "LITTLE", 44, WIDTH / 2, 70);
    text("JOKER", 52, WIDTH / 2, 125);
    // The big joker is two stars, the little joker one: told apart without reading or colour.
    text(big ? "★★" : "★", 110, WIDTH / 2, 240);
  } else {
    context.fillStyle = SUIT_INKS[card.suit];
    const rank = rankLabel(card);
    const initial = SUIT_NAMES[card.suit][0];
    text(rank, 120, WIDTH / 2, 90);
    text(SUIT_SYMBOLS[card.suit], 150, WIDTH / 2, 225);
    // Corner index so a fanned, overlapped card can still be read.
    text(rank, 40, 34, 34);
    text(`${SUIT_SYMBOLS[card.suit]}${initial}`, 30, 38, 72);
    text(SUIT_NAMES[card.suit].toUpperCase(), 26, WIDTH / 2, 318);
  }
  const texture = canvasTexture(canvas);
  cache.set(card.id, texture);
  return texture;
}

export function makeCardBackTexture(): CanvasTexture {
  const cached = cache.get("back");
  if (cached) return cached;
  const { canvas, context } = blank("#14306b");
  context.strokeStyle = "#e9d9a6";
  context.lineWidth = 3;
  context.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);
  context.lineWidth = 2;
  // A lattice of diagonals clipped to the inner frame.
  context.beginPath();
  context.rect(22, 22, WIDTH - 44, HEIGHT - 44);
  context.clip();
  context.beginPath();
  for (let offset = -HEIGHT; offset < WIDTH + HEIGHT; offset += 28) {
    context.moveTo(offset, 0);
    context.lineTo(offset + HEIGHT, HEIGHT);
    context.moveTo(offset, 0);
    context.lineTo(offset - HEIGHT, HEIGHT);
  }
  context.stroke();
  const texture = canvasTexture(canvas);
  cache.set("back", texture);
  return texture;
}

export function disposeCardTextures(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
