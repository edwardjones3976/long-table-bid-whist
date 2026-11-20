// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CATALOG,
  cleanLook,
  FIELD_GROUPS,
  FIELDS,
  GARMENT_PALETTE,
  GESTURE_MS,
  gestureNow,
  GESTURES,
  hexOf,
  MAX_ACCESSORIES,
  SET_FIELDS,
  shuffleLook,
  SKIN_TONES,
  STARTING_LOOKS,
  type Field,
  type Look,
} from "../../shared/avatar";

const base = STARTING_LOOKS[0];
const isSet = (field: Field) => field in SET_FIELDS;

/** mulberry32: the same draws on every run. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Machado, Oliveira and Fernandes (2009) at full severity, on linear RGB. */
const DEFICIENCIES: Record<string, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** OKLab [L, a, b] of a #rrggbb colour, seen through a colour-vision `matrix` when given. */
function lab(hex: string, matrix?: number[][]): [number, number, number] {
  let rgb = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  if (matrix) rgb = matrix.map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
  const [r, g, b] = rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** OKLab lightness and chroma of a #rrggbb colour. */
function oklab(hex: string): { L: number; C: number } {
  const [L, a, b] = lab(hex);
  return { L, C: Math.hypot(a, b) };
}

/** OKLab distance times 100: about 1 is just noticeable side by side. */
const apart = (p: readonly number[], q: readonly number[]) => 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

describe("the catalog", () => {
  it("has every baseline option of the design, each with a unique id and a label", () => {
    const counts: Partial<Record<Field, number>> = {
      build: 4,
      height: 5,
      skin: 42,
      eyes: 6,
      eyeColor: 8,
      brows: 8,
      browColor: 10,
      nose: 6,
      mouth: 6,
      ears: 4,
      marks: 4,
      facialHair: 11,
      hair: 24,
      hairColor: 18,
      headwear: 7,
      top: 12,
      bottom: 7,
      onePiece: 4,
      shoes: 6,
      assistive: 2,
      plateSymbol: 6,
    };
    for (const [field, count] of Object.entries(counts)) expect(CATALOG[field as Field], field).toHaveLength(count);
    for (const field of FIELDS) {
      const ids = CATALOG[field].map((option) => option.id);
      expect(new Set(ids).size, field).toBe(ids.length);
      for (const option of CATALOG[field]) expect(option.label.trim().length, `${field} ${option.id}`).toBeGreaterThan(0);
    }
  });

  it("gives every colour option a hex value, except the choice of none", () => {
    for (const field of ["skin", "eyeColor", "browColor", "lipColor", "cheekColor", "hairColor", "topColor", "shoeColor", "plateColor"] as Field[]) {
      for (const { id, hex } of CATALOG[field]) {
        if (id === "none") expect(hex).toBeUndefined();
        else expect(hex, `${field} ${id}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
    expect(hexOf("skin", "14c")).toBe(SKIN_TONES[41]);
    expect(hexOf("skin", "nope")).toBeUndefined();
  });

  it("balances the garment palette across five colour families", () => {
    const families = new Map<string, number>();
    for (const colour of GARMENT_PALETTE) families.set(colour.family, (families.get(colour.family) ?? 0) + 1);
    expect([...families.keys()].sort()).toEqual(["blues", "golds", "greens", "neutrals", "reds"]);
    for (const count of families.values()) expect(count).toBeGreaterThanOrEqual(4);
    expect(GARMENT_PALETTE.length).toBeGreaterThanOrEqual(20);
    expect(new Set(GARMENT_PALETTE.map((colour) => colour.hex)).size).toBe(GARMENT_PALETTE.length);
    // The starting looks draw on every family, so a full table feels balanced.
    const worn = new Set(STARTING_LOOKS.flatMap((look) => [look.topColor, look.topTrim, look.bottomColor, look.headwearColor, look.shoeColor]));
    expect(new Set(GARMENT_PALETTE.filter((colour) => worn.has(colour.id)).map((colour) => colour.family)).size).toBe(5);
  });

  it("keeps every garment colour off the skin ramp, so no outfit reads as bare skin", () => {
    const tones = SKIN_TONES.map((hex) => lab(hex));
    for (const colour of GARMENT_PALETTE) {
      const nearest = Math.min(...tones.map((tone) => apart(lab(colour.hex), tone)));
      expect(nearest, colour.id).toBeGreaterThanOrEqual(4);
    }
    // The darkest garment colour stays well clear of the deepest tones (13w to 14c), the ones it could pass for.
    const deep = SKIN_TONES.slice(-6).map((hex) => lab(hex));
    expect(Math.min(...deep.map((tone) => apart(lab(hexOf("topColor", "chocolate")!), tone)))).toBeGreaterThanOrEqual(8);
  });

  it("keeps every two garment colours apart under protanopia, deuteranopia and tritanopia", () => {
    // White stays white through every simulation.
    for (const matrix of Object.values(DEFICIENCIES)) expect(apart(lab("#ffffff", matrix), lab("#ffffff"))).toBeLessThan(0.1);
    const close: string[] = [];
    for (const [name, matrix] of Object.entries(DEFICIENCIES)) {
      for (const [i, a] of GARMENT_PALETTE.entries()) {
        for (const b of GARMENT_PALETTE.slice(i + 1)) {
          const gap = apart(lab(a.hex, matrix), lab(b.hex, matrix));
          if (gap < 3) close.push(`${name}: ${a.id} / ${b.id} ${gap.toFixed(1)}`);
        }
      }
    }
    expect(close).toEqual([]);
    // And with normal colour vision, wider still.
    for (const [i, a] of GARMENT_PALETTE.entries()) for (const b of GARMENT_PALETTE.slice(i + 1)) expect(apart(lab(a.hex), lab(b.hex)), `${a.id} / ${b.id}`).toBeGreaterThanOrEqual(4);
  });

  it("spaces the 42 skin tones evenly in lightness, the deep end as rich as the light end", () => {
    expect(SKIN_TONES).toHaveLength(42);
    expect(new Set(SKIN_TONES).size).toBe(42);
    const tones = SKIN_TONES.map(oklab);
    const step = (tones[0].L - tones[39].L) / 13;
    for (let undertone = 0; undertone < 3; undertone += 1) {
      for (let tone = 1; tone < 14; tone += 1) {
        const gap = tones[(tone - 1) * 3 + undertone].L - tones[tone * 3 + undertone].L;
        expect(Math.abs(gap - step), `tone ${tone + 1}, undertone ${undertone}`).toBeLessThan(0.006);
      }
    }
    // Undertone changes the hue, never the lightness.
    for (let tone = 0; tone < 14; tone += 1) {
      const row = tones.slice(tone * 3, tone * 3 + 3).map((t) => t.L);
      expect(Math.max(...row) - Math.min(...row)).toBeLessThan(0.006);
    }
    expect(tones[0].L).toBeGreaterThan(0.9);
    expect(tones[41].L).toBeLessThan(0.32);
    // Never grey or ashy: the deepest tones keep their colour.
    for (const { C } of tones.slice(-3)) expect(C).toBeGreaterThan(0.04);
  });

  it("has seven short friendly gestures", () => {
    expect(GESTURES.map((gesture) => gesture.id)).toEqual(["wave", "clap", "laugh", "bow", "slap", "boston", "shake"]);
    for (const { id } of GESTURES) {
      expect(GESTURE_MS[id]).toBeGreaterThan(0);
      expect(GESTURE_MS[id]).toBeLessThan(2000);
    }
  });
});

describe("cleanLook", () => {
  it("keeps every option of every field", () => {
    for (const field of FIELDS) {
      for (const { id } of CATALOG[field]) {
        const look = cleanLook({ ...base, [field]: isSet(field) ? [id] : id });
        expect(look[field], `${field} ${id}`).toEqual(isSet(field) ? [id] : id);
      }
    }
  });

  it("lets every starting look through unchanged, and returns a copy", () => {
    expect(STARTING_LOOKS).toHaveLength(6);
    for (const look of STARTING_LOOKS) {
      const cleaned = cleanLook(look);
      expect(cleaned).toEqual(look);
      expect(cleaned).not.toBe(look);
      expect(cleaned.accessories).not.toBe(look.accessories);
    }
    // Varied: no two share a skin tone, and all four builds appear.
    expect(new Set(STARTING_LOOKS.map((look) => look.skin)).size).toBe(6);
    expect(new Set(STARTING_LOOKS.map((look) => look.build)).size).toBe(4);
    expect(new Set(STARTING_LOOKS.map((look) => look.hair)).size).toBe(6);
  });

  it("drops unknown ids and fields, filling them from the fallback", () => {
    const look = cleanLook({ skin: "99x", hair: "box-braids", top: 3, extra: "kept?", marks: ["freckles", "tattoo", 7, "freckles"] });
    expect(look.hair).toBe("box-braids");
    expect(look.skin).toBe(base.skin);
    expect(look.top).toBe(base.top);
    expect(look.marks).toEqual(["freckles"]);
    expect(Object.keys(look).sort()).toEqual([...FIELDS].sort());
    // A list field given a single id, or a single field given a list, falls back.
    expect(cleanLook({ ...base, marks: "freckles", hair: ["bun"] })).toMatchObject({ marks: base.marks, hair: base.hair });
  });

  it("caps accessories at three, one pair of glasses, one pair of earrings and one hat, none over a head covering", () => {
    const many = ["glasses-round", "glasses-cat", "hoops", "studs", "necklace", "watch", "cap", "fedora", "bracelets"];
    expect(cleanLook({ ...base, accessories: many }).accessories).toEqual(["glasses-round", "hoops", "necklace"]);
    expect(cleanLook({ ...base, accessories: ["cap", "cap", "bucket", "watch"] }).accessories).toEqual(["cap", "watch"]);
    expect(cleanLook({ ...base, headwear: "hijab", accessories: ["fedora", "studs"] }).accessories).toEqual(["studs"]);
    expect(cleanLook({ ...base, headwear: "durag", accessories: ["cap"] }).accessories).toEqual(["cap"]);
    expect(MAX_ACCESSORIES).toBe(3);
  });

  it("never throws and never lets a planted prototype through", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const trap = { get skin(): string { throw new Error("boom"); } };
    const garbage: unknown[] = [
      null,
      undefined,
      0,
      NaN,
      "x".repeat(1_000_000),
      true,
      [],
      [base],
      () => base,
      Symbol("look"),
      revoked.proxy,
      trap,
      Object.create({ skin: "2n", hair: "bun" }),
      { hair: "x".repeat(1_000_000), accessories: Array(100_000).fill("hoops") },
      JSON.parse('{"__proto__": {"polluted": true, "skin": "2n"}, "constructor": {"prototype": {"polluted": true}}, "hair": "bun"}'),
    ];
    for (const input of garbage) {
      const look = cleanLook(input);
      expect(cleanLook(look)).toEqual(look);
      expect(Object.keys(look).sort()).toEqual([...FIELDS].sort());
      expect(Object.getPrototypeOf(look)).toBe(Object.prototype);
    }
    expect(cleanLook(null)).toEqual(base);
    expect(cleanLook(Object.create({ skin: "2n" })).skin).toBe(base.skin);
    expect(cleanLook(garbage.at(-1)).hair).toBe("bun");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("gestureNow", () => {
  it("keeps bow and applause for the end of a hand at a table; every other gesture, and any gesture away from a match, goes", () => {
    for (const kind of ["bow", "clap"] as const) {
      for (const phase of ["play", "bidding", "kitty", "draw"]) expect(gestureNow(kind, phase), `${kind} ${phase}`).toBe(false);
      for (const phase of ["hand-over", "game-over", null, undefined]) expect(gestureNow(kind, phase), `${kind} ${phase}`).toBe(true);
    }
    for (const kind of ["wave", "laugh", "slap", "boston", "shake"] as const) expect(gestureNow(kind, "play"), kind).toBe(true);
  });
});

describe("shuffleLook", () => {
  it("reaches every option of every field over many draws, and every result is valid", () => {
    const random = seeded(7);
    const seen = Object.fromEntries(FIELDS.map((field) => [field, new Set<string>()])) as Record<Field, Set<string>>;
    for (let i = 0; i < 3000; i += 1) {
      const look = shuffleLook(random);
      expect(cleanLook(look)).toEqual(look);
      for (const field of FIELDS) for (const id of ([] as string[]).concat(look[field])) seen[field].add(id);
    }
    for (const field of FIELDS) expect(seen[field].size, field).toBe(CATALOG[field].length);
  });

  it("changes only the fields of the group it is given", () => {
    const random = seeded(11);
    for (const [group, fields] of Object.entries(FIELD_GROUPS) as [keyof typeof FIELD_GROUPS, readonly Field[]][]) {
      let changed = false;
      for (let i = 0; i < 20; i += 1) {
        const look = shuffleLook(random, base, group);
        for (const field of FIELDS) {
          if (!fields.includes(field)) expect(look[field], `${group} changed ${field}`).toEqual(base[field]);
          else changed ||= JSON.stringify(look[field]) !== JSON.stringify(base[field]);
        }
      }
      expect(changed, group).toBe(true);
    }
    // The groups cover every field exactly once.
    expect(Object.values(FIELD_GROUPS).flat().sort()).toEqual([...FIELDS].sort());
  });

  it("keeps a worn hat when shuffling the Hair tab, drawing only coverings a hat sits over", () => {
    const random = seeded(13);
    const hatted: Look = { ...base, accessories: ["cap", "watch"] };
    expect(cleanLook(hatted)).toEqual(hatted);
    const coverings = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const look = shuffleLook(random, hatted, "hair");
      expect(look.accessories).toEqual(["cap", "watch"]);
      coverings.add(look.headwear);
    }
    expect([...coverings].sort()).toEqual(["durag", "none"]);
  });

  it("draws only accessories that can be worn together, so no, one, two and three are equally likely and every item comes up", () => {
    const random = seeded(17);
    const counts = [0, 0, 0, 0];
    const items = new Map<string, number>();
    const draws = 20000;
    for (let i = 0; i < draws; i += 1) {
      const look = shuffleLook(random, { ...base, headwear: "none" }, "extras");
      counts[look.accessories.length] += 1;
      for (const id of look.accessories) items.set(id, (items.get(id) ?? 0) + 1);
    }
    for (const count of counts) expect(Math.abs(count / draws - 0.25)).toBeLessThan(0.02);
    expect(items.size).toBe(CATALOG.accessories.length);
    // One from each group at most means a grouped item cannot come up quite as often as a lone one; none falls far behind.
    const shares = [...items.values()];
    expect(Math.max(...shares) / Math.min(...shares)).toBeLessThan(1.5);
    // Under a covering a hat cannot sit over, no hat is drawn at all.
    for (let i = 0; i < 300; i += 1) expect(shuffleLook(random, { ...base, headwear: "turban" }, "extras").accessories).not.toContain("cap");
  });

  it("survives a random source that returns 1 or nonsense", () => {
    for (const random of [() => 1, () => 0, () => NaN, () => -5]) {
      const look: Look = shuffleLook(random);
      expect(cleanLook(look)).toEqual(look);
    }
  });
});
