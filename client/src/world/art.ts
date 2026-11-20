/**
 * Framed pieces across the Central Gallery and lounges. All are 100% ORIGINAL
 * PROCEDURAL ART made in code from fixed seeds: stylized geometric woodcuts,
 * silhouettes, architectural studies, and data-art homages. No downloaded image,
 * font, emblem or third-party asset is used.
 *
 * Legally clean gallery curation:
 *  - Public-domain historical figures (Douglass, Tubman, Truth, Biddy Mason,
 *    and W.E.B. Du Bois's 1900 Paris Exposition geometric visual language).
 *  - Architectural homage for Madam C.J. Walker (Villa Lewaro estate).
 *  - Iconic historical environments honoring modern civil-rights movements
 *    without appropriating estate-controlled names or likenesses.
 *  - Preserves the two original house-party abstractions ("gathering", "rhythm").
 *
 * artwork(id) returns a deterministic list of shapes in a unit square
 * (x right, y down); paintArtwork draws that list onto a canvas with an
 * optional museum plaque caption strip at the bottom.
 */
import { FONT_STACK } from "../ui/text";
import { rng } from "./plan";

export type ArtOp =
  | { kind: "rect"; x: number; y: number; w: number; h: number; rot: number; color: string }
  | { kind: "disc"; x: number; y: number; r: number; color: string }
  | { kind: "tri"; points: [number, number, number, number, number, number]; color: string };

export type ArtworkId =
  | "gathering"
  | "rhythm"
  | "douglass"
  | "tubman"
  | "truth"
  | "biddy-mason"
  | "dubois"
  | "villa-lewaro"
  | "selma-dawn"
  | "reflecting-pool"
  | "harlem-dusk"
  | "evening-stop";

export interface ArtworkMeta {
  title: string;
  subtitle: string;
  rightsNote: string;
}

export const ARTWORK_META: Record<ArtworkId, ArtworkMeta> = {
  gathering: {
    title: "The Long Table",
    subtitle: "Original Abstract — Three Generations",
    rightsNote: "Original procedural project artwork",
  },
  rhythm: {
    title: "Rhythm & Corner",
    subtitle: "Original Abstract — Syncopation",
    rightsNote: "Original procedural project artwork",
  },
  douglass: {
    title: "Frederick Douglass (1818–1895)",
    subtitle: "The North Star Study",
    rightsNote: "Original procedural woodcut study of public-domain historical figure",
  },
  tubman: {
    title: "Harriet Tubman (c. 1822–1913)",
    subtitle: "Follow the Drinking Gourd",
    rightsNote: "Original procedural woodcut study of public-domain historical figure",
  },
  truth: {
    title: "Sojourner Truth (c. 1797–1883)",
    subtitle: "Dawn & Unbroken Voice",
    rightsNote: "Original procedural woodcut study of public-domain historical figure",
  },
  "biddy-mason": {
    title: "Bridget 'Biddy' Mason (1818–1891)",
    subtitle: "Sanctuary & Golden Horizon",
    rightsNote: "Original procedural tribute to public-domain historical figure",
  },
  dubois: {
    title: "W.E.B. Du Bois — Exposition Plate",
    subtitle: "1900 Geometric Data-Art Homage",
    rightsNote: "Original procedural homage to 1900 public-domain Exposition plates",
  },
  "villa-lewaro": {
    title: "Villa Lewaro at Golden Hour",
    subtitle: "Architectural Tribute — Irvington",
    rightsNote: "Original procedural architectural study; no commercial trademark used",
  },
  "selma-dawn": {
    title: "Dawn Over the Arch",
    subtitle: "Voting Rights — River Crossing",
    rightsNote: "Original procedural environmental tribute; no individual likeness",
  },
  "reflecting-pool": {
    title: "Morning on the Marble Steps",
    subtitle: "Reflecting Pool — 1963 Gathering",
    rightsNote: "Original procedural environmental tribute; no individual likeness",
  },
  "harlem-dusk": {
    title: "125th Street at Dusk",
    subtitle: "Brownstone Evening & Marquee",
    rightsNote: "Original procedural environmental tribute; no individual likeness",
  },
  "evening-stop": {
    title: "Evening Stop on Cleveland Ave",
    subtitle: "Lantern Light & Quiet Resolve",
    rightsNote: "Original procedural environmental tribute; no individual likeness",
  },
};

const WARM = ["#b5533c", "#d9a441", "#7a4a2e", "#e7d3a8", "#3f6f6a", "#2f4a6b"];
const pick = (random: () => number, colors: string[]) => colors[Math.floor(random() * colors.length)];

const r = (x: number, y: number, w: number, h: number, color: string, rot = 0): ArtOp => ({ kind: "rect", x, y, w, h, rot, color });
const d = (x: number, y: number, radius: number, color: string): ArtOp => ({ kind: "disc", x, y, r: radius, color });
const t = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: string): ArtOp => ({
  kind: "tri",
  points: [x1, y1, x2, y2, x3, y3],
  color,
});

function gathering(): ArtOp[] {
  const random = rng(1863);
  const ops: ArtOp[] = [{ kind: "rect", x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, color: "#f1e6cf" }];
  // Light radiating from the table.
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    ops.push({ kind: "rect", x: 0.5 + Math.cos(angle) * 0.4, y: 0.5 + Math.sin(angle) * 0.4, w: 0.16, h: 0.018, rot: angle, color: i % 2 ? "#d9a441" : "#b5533c" });
  }
  // Three generations of seats around it.
  [0.33, 0.24, 0.15].forEach((radius, ring) => {
    const count = 16 - ring * 4;
    for (let i = 0; i < count; i++) {
      const angle = ((i + ring / 2) / count) * Math.PI * 2;
      ops.push({ kind: "disc", x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius, r: 0.034 - ring * 0.006, color: pick(random, WARM) });
    }
  });
  ops.push({ kind: "disc", x: 0.5, y: 0.5, r: 0.085, color: "#3f6f6a" }, { kind: "disc", x: 0.5, y: 0.5, r: 0.05, color: "#e7d3a8" }, { kind: "disc", x: 0.5, y: 0.5, r: 0.02, color: "#b5533c" });
  // A border of small triangles.
  for (let i = 0; i < 20; i++) {
    const a = i / 20;
    const color = pick(random, WARM);
    ops.push({ kind: "tri", points: [a, 0, a + 0.05, 0, a + 0.025, 0.045], color }, { kind: "tri", points: [a, 1, a + 0.05, 1, a + 0.025, 0.955], color });
  }
  return ops;
}

function rhythm(): ArtOp[] {
  const random = rng(1920);
  const ops: ArtOp[] = [{ kind: "rect", x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, color: "#2b2a33" }];
  const [columns, rows] = [8, 6];
  const [w, h] = [1 / columns, 1 / rows];
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const [x, y] = [column * w, row * h];
      const [first, second] = [pick(random, WARM), pick(random, WARM)];
      ops.push({ kind: "rect", x: x + w / 2, y: y + h / 2, w: w * 0.94, h: h * 0.94, rot: 0, color: first });
      const style = Math.floor(random() * 3);
      if (style === 0) ops.push({ kind: "tri", points: [x, y, x + w, y, x, y + h], color: second });
      else if (style === 1) for (let i = 0; i < 3; i++) ops.push({ kind: "rect", x: x + w / 2, y: y + h * (0.25 + i * 0.25), w: w * 0.8, h: h * 0.1, rot: 0, color: second });
      else ops.push({ kind: "disc", x: x + w / 2, y: y + h / 2, r: h * 0.3, color: second });
    }
  }
  // The beat: a line of dots that rises and falls across the patchwork.
  for (let i = 0; i < 32; i++) {
    const pos = (i + 0.5) / 32;
    ops.push({ kind: "disc", x: pos, y: 0.5 + Math.sin(pos * Math.PI * 4) * 0.22, r: i % 4 === 0 ? 0.03 : 0.016, color: "#f6efe0" });
  }
  return ops;
}

function douglass(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#18233c")];
  // Warm golden radiating backdrop & horizon bands
  ops.push(d(0.5, 0.52, 0.36, "#c98b3c"), d(0.5, 0.52, 0.28, "#e6b963"));
  // North Star rays in upper left
  for (let i = 0; i < 8; i++) ops.push(r(0.18, 0.2, 0.14, 0.014, "#f7efe0", (i * Math.PI) / 4));
  ops.push(d(0.18, 0.2, 0.025, "#fff7e3"));
  // Sculptural silver-white crown of hair and dignified profile/bust silhouette
  ops.push(d(0.45, 0.34, 0.135, "#d8d1c5"), d(0.55, 0.36, 0.125, "#e8e2d7"), d(0.48, 0.29, 0.12, "#dcd5c8"));
  ops.push(d(0.5, 0.42, 0.115, "#4a2c1d"), r(0.5, 0.53, 0.14, 0.12, "#4a2c1d"));
  // Sculpted silver beard & crisp ivory collar
  ops.push(d(0.5, 0.5, 0.095, "#cfc8bc"), t(0.42, 0.54, 0.58, 0.54, 0.5, 0.68, "#e7e1d5"));
  // Coat & shoulders
  ops.push(t(0.24, 0.96, 0.76, 0.96, 0.5, 0.57, "#1e1f26"), r(0.5, 0.82, 0.48, 0.28, "#1e1f26"));
  ops.push(t(0.43, 0.6, 0.57, 0.6, 0.5, 0.76, "#f4ede0"), r(0.5, 0.66, 0.04, 0.16, "#8c3329"));
  // Editorial border lines
  ops.push(r(0.5, 0.06, 0.9, 0.015, "#d9a441"), r(0.5, 0.94, 0.9, 0.015, "#d9a441"));
  return ops;
}

function tubman(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#131c33")];
  // Horizon glow, pines and river
  ops.push(r(0.5, 0.78, 1, 0.44, "#1b2c3b"), t(0.02, 0.76, 0.34, 0.76, 0.18, 0.56, "#1f362c"), t(0.68, 0.78, 0.98, 0.78, 0.85, 0.54, "#1f362c"));
  ops.push(r(0.5, 0.9, 1, 0.2, "#243b4f"), r(0.5, 0.88, 0.92, 0.025, "#749cb8"));
  // Drinking Gourd & bright Polaris
  const stars: [number, number][] = [[0.2, 0.26], [0.27, 0.24], [0.33, 0.27], [0.39, 0.23], [0.43, 0.31], [0.51, 0.31], [0.52, 0.22]];
  for (const [sx, sy] of stars) ops.push(d(sx, sy, 0.013, "#e9edf5"));
  ops.push(d(0.76, 0.16, 0.032, "#ffd972"), r(0.76, 0.16, 0.13, 0.012, "#ffd972"), r(0.76, 0.16, 0.012, 0.13, "#ffd972"));
  // Figure silhouette in warm terracotta headwrap holding golden lantern
  ops.push(d(0.45, 0.42, 0.11, "#3b2217"), d(0.42, 0.37, 0.115, "#b85535"), d(0.48, 0.35, 0.095, "#cf7a38"));
  ops.push(t(0.24, 0.96, 0.66, 0.96, 0.45, 0.53, "#262834"), r(0.45, 0.8, 0.38, 0.32, "#262834"));
  ops.push(d(0.72, 0.56, 0.095, "#704d24"), d(0.72, 0.56, 0.055, "#ffd86b"), r(0.72, 0.49, 0.07, 0.025, "#3a2c1e"), r(0.72, 0.63, 0.07, 0.025, "#3a2c1e"));
  return ops;
}

function truth(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#f0e3ca")];
  // Warm terracotta & indigo architectural arch frame
  ops.push(d(0.5, 0.46, 0.41, "#2b3e58"), r(0.5, 0.72, 0.82, 0.52, "#2b3e58"));
  ops.push(d(0.5, 0.46, 0.36, "#df9c4e"), r(0.5, 0.72, 0.72, 0.5, "#d88a3e"));
  // Sunrise rays behind bust
  for (let i = -3; i <= 3; i++) ops.push(r(0.5, 0.45, 0.68, 0.02, "#f4d182", i * 0.28));
  // Bonnet, face, crisp white shawl, dark dress, open volume
  ops.push(d(0.5, 0.34, 0.125, "#f5efe2"), d(0.5, 0.38, 0.1, "#45281a"));
  ops.push(t(0.28, 0.94, 0.72, 0.94, 0.5, 0.48, "#22242c"), t(0.36, 0.54, 0.64, 0.54, 0.5, 0.72, "#f5efe2"));
  ops.push(r(0.45, 0.78, 0.1, 0.11, "#f4ecd8", -0.15), r(0.55, 0.78, 0.1, 0.11, "#e7dec8", 0.15), r(0.5, 0.78, 0.02, 0.12, "#8f3c2d"));
  return ops;
}

function biddyMason(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#ebba72")];
  // California sunset & mountain ridge
  ops.push(r(0.5, 0.62, 1, 0.35, "#c96a42"), t(0.0, 0.72, 0.55, 0.72, 0.25, 0.55, "#6b4f4a"), t(0.42, 0.72, 1.0, 0.72, 0.74, 0.52, "#59413d"));
  ops.push(r(0.5, 0.85, 1, 0.3, "#3b5949"));
  // Sanctuary adobe arch & botanical citrus sprigs
  ops.push(d(0.5, 0.38, 0.27, "#f5ead6"), r(0.5, 0.62, 0.54, 0.48, "#f5ead6"));
  ops.push(d(0.5, 0.38, 0.23, "#e6ad5a"), r(0.5, 0.62, 0.46, 0.46, "#d98d4c"));
  ops.push(d(0.5, 0.4, 0.095, "#45281a"), d(0.5, 0.32, 0.085, "#f2eadb"), t(0.32, 0.86, 0.68, 0.86, 0.5, 0.5, "#2b303a"));
  for (const sx of [0.16, 0.84]) {
    ops.push(r(sx, 0.55, 0.025, 0.46, "#3a5a46"), d(sx - 0.04, 0.44, 0.04, "#547a56"), d(sx + 0.04, 0.52, 0.04, "#547a56"), d(sx, 0.36, 0.032, "#e89c31"));
  }
  return ops;
}

function dubois(): ArtOp[] {
  // Homage to the 1900 Paris Exposition geometric chart aesthetic
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#efe3cb")];
  const palette = ["#c73a32", "#d9a434", "#2a4b7c", "#2b5e43", "#1b1a18"];
  // Top title rule & stacked geometric proportional bands
  ops.push(r(0.5, 0.1, 0.78, 0.035, "#1b1a18"), r(0.5, 0.145, 0.52, 0.014, "#c73a32"));
  const widths = [0.76, 0.64, 0.52, 0.42, 0.3];
  widths.forEach((w, idx) => {
    const y = 0.25 + idx * 0.075;
    ops.push(r(0.12 + w / 2, y, w, 0.048, palette[idx % palette.length]));
  });
  // Signature concentric stepped arc/spiral block in lower half
  const radii = [0.24, 0.195, 0.15, 0.105, 0.06];
  radii.forEach((rad, i) => ops.push(d(0.62, 0.74, rad, palette[i % palette.length])));
  ops.push(d(0.62, 0.74, 0.025, "#efe3cb"));
  // Vertical ledger column on lower left
  for (let i = 0; i < 6; i++) ops.push(r(0.22, 0.63 + i * 0.05, 0.18, 0.03, i % 2 ? "#c73a32" : "#2a4b7c"));
  return ops;
}

function villaLewaro(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#2a3354")];
  // Twilight bands + cypress trees + lawn
  ops.push(r(0.5, 0.42, 1, 0.28, "#8c5158"), r(0.5, 0.64, 1, 0.24, "#eba758"), r(0.5, 0.88, 1, 0.24, "#35533e"));
  for (const cx of [0.1, 0.18, 0.82, 0.9]) ops.push(t(cx - 0.05, 0.82, cx + 0.05, 0.82, cx, 0.42, "#22382b"));
  // Villa facade, terracotta roof, arched portico and warm glowing windows
  ops.push(r(0.5, 0.66, 0.56, 0.26, "#f0e4cd"), r(0.5, 0.53, 0.6, 0.05, "#a34a35"), r(0.5, 0.49, 0.34, 0.04, "#8a3d2b"));
  for (const wx of [0.29, 0.37, 0.63, 0.71]) ops.push(r(wx, 0.61, 0.04, 0.07, "#ffd272"), r(wx, 0.72, 0.04, 0.07, "#ffd272"));
  // Portico columns & center arch
  ops.push(r(0.5, 0.69, 0.16, 0.2, "#e2d3b8"), d(0.5, 0.7, 0.05, "#ffcf70"), r(0.5, 0.75, 0.1, 0.1, "#ffcf70"));
  for (const px of [0.43, 0.57]) ops.push(r(px, 0.69, 0.02, 0.2, "#fbf4e6"));
  return ops;
}

function selmaDawn(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#2f3859")];
  // Sunrise sky + river reflections
  ops.push(r(0.5, 0.38, 1, 0.24, "#b55a45"), r(0.5, 0.56, 1, 0.2, "#f0b863"), d(0.5, 0.58, 0.13, "#ffe49e"));
  ops.push(r(0.5, 0.82, 1, 0.36, "#2c455c"));
  for (let i = 0; i < 6; i++) ops.push(r(0.5, 0.69 + i * 0.05, 0.24 - i * 0.03, 0.022, "#f6c978"));
  // Iconic steel arch bridge across the water
  ops.push(d(0.5, 0.58, 0.28, "#252b36"), d(0.5, 0.58, 0.245, "#f0b863"));
  ops.push(r(0.5, 0.74, 0.6, 0.28, "#2c455c"));
  for (let i = 0; i < 6; i++) ops.push(r(0.5, 0.69 + i * 0.05, 0.22 - i * 0.03, 0.02, "#f6c978"));
  // Bridge deck & piers
  ops.push(r(0.5, 0.61, 1, 0.045, "#1f242e"), r(0.22, 0.6, 0.045, 0.28, "#252b36"), r(0.78, 0.6, 0.045, 0.28, "#252b36"));
  for (const sx of [0.32, 0.4, 0.5, 0.6, 0.68]) ops.push(r(sx, 0.49, 0.012, 0.22, "#252b36"));
  return ops;
}

function reflectingPool(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#334366")];
  // Warm sunlit dawn horizon
  ops.push(r(0.5, 0.42, 1, 0.28, "#df9c4c"), r(0.5, 0.55, 1, 0.14, "#f5d79b"));
  // Classical portico & columns
  ops.push(r(0.5, 0.38, 0.48, 0.2, "#ebe3d4"), t(0.24, 0.28, 0.76, 0.28, 0.5, 0.19, "#dfd5c3"));
  for (let i = 0; i < 7; i++) ops.push(r(0.32 + i * 0.06, 0.39, 0.022, 0.17, "#d1c5b2"));
  // Sunlit steps & long reflecting pool with sky reflections
  ops.push(r(0.5, 0.54, 1, 0.1, "#dad0bd"), r(0.5, 0.8, 1, 0.4, "#4b6e3f"));
  ops.push(t(0.18, 0.98, 0.82, 0.98, 0.62, 0.6, "#4d748c"), t(0.18, 0.98, 0.62, 0.6, 0.38, 0.6, "#4d748c"));
  for (let i = 0; i < 5; i++) ops.push(r(0.5, 0.65 + i * 0.06, 0.16 + i * 0.04, 0.018, "#f7dfa8"));
  // Stylized gathering figures along left & right lawns
  for (let i = 0; i < 16; i++) ops.push(d(0.1 + (i % 4) * 0.05, 0.65 + Math.floor(i / 4) * 0.06, 0.016, "#2c2a30"), d(0.75 + (i % 4) * 0.05, 0.65 + Math.floor(i / 4) * 0.06, 0.016, "#2c2a30"));
  return ops;
}

function harlemDusk(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#22203c")];
  ops.push(r(0.5, 0.45, 1, 0.32, "#8f4e4d"), r(0.5, 0.65, 1, 0.22, "#e6a45b"));
  // Rhythmic brownstones with warm windows & stoops
  const browns = ["#6a3c2e", "#824c38", "#573127", "#794534"];
  for (let i = 0; i < 4; i++) {
    const bx = 0.14 + i * 0.24;
    ops.push(r(bx, 0.56, 0.22, 0.48, browns[i]), r(bx, 0.32, 0.24, 0.035, "#3a231c"));
    for (const wy of [0.42, 0.54]) {
      ops.push(r(bx - 0.05, wy, 0.04, 0.065, "#ffd479"), r(bx + 0.05, wy, 0.04, 0.065, "#ffd479"));
    }
    ops.push(r(bx, 0.77, 0.1, 0.08, "#4a2c22"));
  }
  // Glowing theater marquee on avenue right & streetlamps
  ops.push(r(0.76, 0.62, 0.22, 0.09, "#291c22"), r(0.76, 0.62, 0.19, 0.055, "#ffd875"));
  ops.push(r(0.5, 0.89, 1, 0.22, "#24242b"));
  for (const lx of [0.25, 0.52, 0.9]) ops.push(r(lx, 0.74, 0.015, 0.24, "#191920"), d(lx, 0.62, 0.032, "#ffe596"));
  return ops;
}

function eveningStop(): ArtOp[] {
  const ops: ArtOp[] = [r(0.5, 0.5, 1, 1, "#1b2440")];
  // Calm twilight horizon & avenue pavement
  ops.push(r(0.5, 0.48, 1, 0.3, "#5e4c64"), r(0.5, 0.64, 1, 0.14, "#d49862"), r(0.5, 0.84, 1, 0.32, "#242730"));
  // Distant building silhouettes & golden streetlamp pools
  for (const [bx, bh] of [[0.14, 0.3], [0.35, 0.24], [0.68, 0.28], [0.88, 0.22]] as const) ops.push(r(bx, 0.68 - bh / 2, 0.18, bh, "#24293a"));
  for (const lx of [0.22, 0.76]) {
    ops.push(d(lx, 0.48, 0.08, "#8c6d3e"), d(lx, 0.48, 0.036, "#ffe494"), r(lx, 0.64, 0.018, 0.32, "#191c24"));
  }
  // Quiet illuminated stone curb & wooden bench silhouette
  ops.push(r(0.5, 0.78, 0.9, 0.03, "#78746d"));
  ops.push(r(0.5, 0.68, 0.36, 0.06, "#7a5338"), r(0.5, 0.73, 0.38, 0.035, "#8f6242"));
  for (const px of [0.35, 0.65]) ops.push(r(px, 0.74, 0.025, 0.09, "#22242c"));
  return ops;
}

const BUILDERS: Record<ArtworkId, () => ArtOp[]> = {
  gathering,
  rhythm,
  douglass,
  tubman,
  truth,
  "biddy-mason": biddyMason,
  dubois,
  "villa-lewaro": villaLewaro,
  "selma-dawn": selmaDawn,
  "reflecting-pool": reflectingPool,
  "harlem-dusk": harlemDusk,
  "evening-stop": eveningStop,
};

export function artwork(id: ArtworkId): ArtOp[] {
  return BUILDERS[id]();
}

export function paintArtwork(canvas: HTMLCanvasElement, ops: readonly ArtOp[], meta?: ArtworkMeta): void {
  const context = canvas.getContext("2d")!;
  const { width: W, height: H } = canvas;
  const artH = meta ? Math.round(H * 0.87) : H;

  for (const op of ops) {
    context.fillStyle = op.color;
    context.beginPath();
    if (op.kind === "disc") {
      context.arc(op.x * W, op.y * artH, op.r * artH, 0, Math.PI * 2);
    } else if (op.kind === "tri") {
      const p = op.points;
      context.moveTo(p[0] * W, p[1] * artH);
      context.lineTo(p[2] * W, p[3] * artH);
      context.lineTo(p[4] * W, p[5] * artH);
    } else {
      context.save();
      context.translate(op.x * W, op.y * artH);
      // On a canvas that is not square, a bar pointing away from the centre has to turn with the stretch.
      context.rotate(Math.atan2(Math.sin(op.rot) * artH, Math.cos(op.rot) * W));
      context.rect((-op.w * W) / 2, (-op.h * artH) / 2, op.w * W, op.h * artH);
      context.restore();
    }
    context.fill();
  }

  if (!meta) return;
  // Subtle cream inner mat hairline & museum brass plaque strip at the bottom
  context.strokeStyle = "#c9a24a";
  context.lineWidth = 4;
  context.strokeRect(4, 4, W - 8, artH - 8);

  context.fillStyle = "#16120e";
  context.fillRect(0, artH, W, H - artH);
  context.fillStyle = "#c9a24a";
  context.fillRect(0, artH, W, 3);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#f7f0df";
  context.font = `700 26px ${FONT_STACK}`;
  context.fillText(meta.title, W / 2, artH + (H - artH) * 0.38, W - 28);
  context.fillStyle = "#d5b87a";
  context.font = `400 18px ${FONT_STACK}`;
  context.fillText(meta.subtitle, W / 2, artH + (H - artH) * 0.74, W - 28);
}
