/**
 * What a person looks like in the mansion, as plain data the server and the client share (no three.js, no DOM).
 *
 *   Look                     a flat record of option ids, one per field; sent to the room and saved per browser
 *   CATALOG[field]           that field's options in order as { id, label }; colour options also carry `hex`
 *   hexOf(field, id)         the colour of a colour option, or undefined
 *   cleanLook(anything)      the trust-boundary check: always a valid Look, never throws
 *   STARTING_LOOKS           six varied looks, shown side by side as equals
 *   shuffleLook(random)      every option with equal chance, for the whole look or one FIELD_GROUPS group
 *   GESTURES, GESTURE_MS     the friendly emotes and how long each one plays
 *   HEAD_TURN, HAND_REACH, HAND_HEIGHT   limits of a VR player's live head and hands (Pose in protocol.ts)
 *
 * Ids travel over the wire and into browser storage: never rename or reuse one. An option a later
 * release removes falls back field by field in cleanLook, so an old saved look still loads.
 * Avatars never take part in the rules and never show anything a player could not already see.
 */

export const LOOK_VERSION = 1;

export interface Option {
  readonly id: string;
  /** Plain words for the button and for screen readers. */
  readonly label: string;
  readonly hex?: string;
}

type Id<List extends readonly Option[]> = List[number]["id"];

// ---- colours ----

export type PaletteFamily = "greens" | "reds" | "golds" | "neutrals" | "blues";

export const PALETTE_FAMILIES: Record<PaletteFamily, string> = {
  greens: "Greens",
  reds: "Reds and plums",
  golds: "Golds, tans and browns",
  neutrals: "Whites, silvers and greys",
  blues: "Blues and blacks",
};

/** Garment colours: rich on every skin tone, the deepest included, and readable by day and by night. */
export const GARMENT_PALETTE = [
  { id: "forest", label: "Forest green", hex: "#1f5e3b", family: "greens" },
  { id: "emerald", label: "Emerald", hex: "#1d8a5a", family: "greens" },
  { id: "sage", label: "Sage", hex: "#8fae8b", family: "greens" },
  { id: "olive", label: "Olive", hex: "#6b7a2e", family: "greens" },
  { id: "teal", label: "Teal", hex: "#1b7f86", family: "greens" },
  { id: "crimson", label: "Crimson", hex: "#b3203a", family: "reds" },
  { id: "brick", label: "Brick red", hex: "#a8432e", family: "reds" },
  { id: "wine", label: "Wine", hex: "#7a1f34", family: "reds" },
  { id: "plum", label: "Plum", hex: "#6e2a5c", family: "reds" },
  { id: "rose", label: "Rose", hex: "#d0607a", family: "reds" },
  { id: "gold", label: "Gold", hex: "#d6a32b", family: "golds" },
  { id: "copper", label: "Copper", hex: "#b5652d", family: "golds" },
  { id: "tan", label: "Tan", hex: "#c8a07a", family: "golds" },
  { id: "camel", label: "Camel", hex: "#a87445", family: "golds" },
  { id: "chocolate", label: "Chocolate", hex: "#5a3423", family: "golds" },
  { id: "white", label: "White", hex: "#f4f1ea", family: "neutrals" },
  { id: "cream", label: "Cream", hex: "#e9dcc0", family: "neutrals" },
  { id: "silver", label: "Silver", hex: "#b9bec4", family: "neutrals" },
  { id: "grey", label: "Grey", hex: "#7d838b", family: "neutrals" },
  { id: "charcoal", label: "Charcoal", hex: "#3b3f45", family: "neutrals" },
  { id: "navy", label: "Navy", hex: "#1d2b53", family: "blues" },
  { id: "royal", label: "Royal blue", hex: "#2c4fb5", family: "blues" },
  { id: "sky", label: "Sky blue", hex: "#6f9fd8", family: "blues" },
  { id: "denim", label: "Denim", hex: "#3f5f86", family: "blues" },
  { id: "black", label: "Black", hex: "#17181c", family: "blues" },
] as const satisfies readonly (Option & { hex: string; family: PaletteFamily })[];
export type Colour = Id<typeof GARMENT_PALETTE>;

/**
 * 14 tones from very light to very deep, each warm, neutral and cool: 42 in all, tone by tone.
 * Made in OKLCH with lightness evenly spaced from 0.93 to 0.30 (the same for all three undertones),
 * chroma rising to the middle and kept up at the deep end so it stays rich, never grey or ashy;
 * warm leans golden, cool leans rosy.
 */
export const SKIN_TONES: readonly string[] = [
  "#fae4cc", "#fde2ce", "#ffe1d3",
  "#efd2b6", "#f2d0b9", "#f5cebe",
  "#e3c1a1", "#e7bfa4", "#eabdaa",
  "#d7b18c", "#dbae91", "#dfac97",
  "#cba079", "#cf9d7e", "#d29b86",
  "#be9067", "#c28d6d", "#c58a75",
  "#b08157", "#b47e5d", "#b77b66",
  "#a27249", "#a56f4f", "#a86c59",
  "#93633c", "#966143", "#995e4c",
  "#835631", "#865338", "#885141",
  "#734928", "#76462e", "#784437",
  "#633c1f", "#653a25", "#67382d",
  "#533118", "#552f1d", "#562d24",
  "#432511", "#442416", "#45231c",
];
const UNDERTONES = [
  ["w", "warm"],
  ["n", "neutral"],
  ["c", "cool"],
] as const;
type Tone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
/** Tone number then undertone: "1w" is the lightest warm tone, "14c" the deepest cool one. */
export type SkinId = `${Tone}${(typeof UNDERTONES)[number][0]}`;
const SKIN: readonly Option[] = SKIN_TONES.map((hex, i) => {
  const [code, name] = UNDERTONES[i % 3];
  const tone = Math.floor(i / 3) + 1;
  return { id: `${tone}${code}`, label: `Tone ${tone} of 14, ${name}`, hex };
});

const NATURAL_HAIR = [
  { id: "black", label: "Black", hex: "#17120f" },
  { id: "dark-brown", label: "Dark brown", hex: "#2e1c13" },
  { id: "brown", label: "Brown", hex: "#4a2d1b" },
  { id: "light-brown", label: "Light brown", hex: "#7a5234" },
  { id: "auburn", label: "Auburn", hex: "#7c2f1c" },
  { id: "dark-blond", label: "Dark blond", hex: "#8e6a3c" },
  { id: "blond", label: "Blond", hex: "#c8a160" },
  { id: "salt-pepper", label: "Salt and pepper", hex: "#5d5a57" },
  { id: "grey", label: "Grey", hex: "#9b9893" },
  { id: "white", label: "White", hex: "#e6e2da" },
] as const;

const HAIR_COLOURS = [
  ...NATURAL_HAIR,
  { id: "red", label: "Bright red", hex: "#c3263b" },
  { id: "orange", label: "Orange", hex: "#e06c26" },
  { id: "pink", label: "Pink", hex: "#e2689f" },
  { id: "purple", label: "Purple", hex: "#7b3fb3" },
  { id: "lilac", label: "Lilac", hex: "#b39ae0" },
  { id: "blue", label: "Blue", hex: "#2f61cf" },
  { id: "teal", label: "Teal", hex: "#17999a" },
  { id: "green", label: "Green", hex: "#3c9f4a" },
] as const;

// ---- shapes ----

const BUILDS = [
  { id: "slender", label: "Slender" },
  { id: "medium", label: "Medium" },
  { id: "broad", label: "Broad" },
  { id: "round", label: "Round" },
] as const;

/** Only how others see you: the player's own view in VR never moves. */
const HEIGHTS = [
  { id: "shortest", label: "Shortest" },
  { id: "short", label: "Short" },
  { id: "middle", label: "Middle" },
  { id: "tall", label: "Tall" },
  { id: "tallest", label: "Tallest" },
] as const;

const EYES = [
  { id: "almond", label: "Almond" },
  { id: "round", label: "Round" },
  { id: "hooded", label: "Hooded" },
  { id: "monolid", label: "Monolid" },
  { id: "upturned", label: "Upturned" },
  { id: "downturned", label: "Downturned" },
] as const;

const EYE_COLOURS = [
  { id: "deep", label: "Very dark brown", hex: "#24170f" },
  { id: "dark-brown", label: "Dark brown", hex: "#3d2516" },
  { id: "brown", label: "Brown", hex: "#5e3a1f" },
  { id: "amber", label: "Amber", hex: "#9a6a26" },
  { id: "hazel", label: "Hazel", hex: "#7a6a3a" },
  { id: "green", label: "Green", hex: "#4d7a4f" },
  { id: "grey", label: "Grey", hex: "#7a8590" },
  { id: "blue", label: "Blue", hex: "#3f6fa6" },
] as const;

const BROWS = [
  { id: "straight", label: "Straight" },
  { id: "soft-arch", label: "Soft arch" },
  { id: "high-arch", label: "High arch" },
  { id: "rounded", label: "Rounded" },
  { id: "angled", label: "Angled" },
  { id: "thick", label: "Thick" },
  { id: "thin", label: "Thin" },
  { id: "bushy", label: "Bushy" },
] as const;

const NOSES = [
  { id: "button", label: "Button" },
  { id: "rounded", label: "Rounded" },
  { id: "broad", label: "Broad" },
  { id: "straight", label: "Straight" },
  { id: "narrow", label: "Narrow" },
  { id: "upturned", label: "Upturned" },
] as const;

const MOUTHS = [
  { id: "full", label: "Full lips" },
  { id: "medium", label: "Medium lips" },
  { id: "thin", label: "Thin lips" },
  { id: "wide", label: "Wide mouth" },
  { id: "bow", label: "Bow-shaped lips" },
  { id: "small", label: "Small mouth" },
] as const;

const EARS = [
  { id: "round", label: "Round" },
  { id: "small", label: "Small" },
  { id: "large", label: "Large" },
  { id: "close", label: "Close to the head" },
] as const;

const MARKS = [
  { id: "freckles", label: "Freckles" },
  { id: "beauty-mark", label: "Beauty mark" },
  { id: "vitiligo", label: "Vitiligo pattern" },
  { id: "laugh-lines", label: "Laugh lines" },
] as const;

const FACIAL_HAIR = [
  { id: "none", label: "None" },
  { id: "stubble", label: "Stubble" },
  { id: "mustache", label: "Mustache" },
  { id: "goatee", label: "Goatee" },
  { id: "circle", label: "Circle beard" },
  { id: "chin-strap", label: "Chin strap" },
  { id: "short-beard", label: "Short beard" },
  { id: "full-beard", label: "Full beard" },
  { id: "long-beard", label: "Long beard" },
  { id: "sideburns", label: "Sideburns" },
  { id: "soul-patch", label: "Soul patch" },
] as const;

const LINERS = [
  { id: "none", label: "No liner" },
  { id: "thin", label: "Thin liner" },
  { id: "wing", label: "Winged liner" },
  { id: "bold", label: "Bold liner" },
] as const;

const LIP_COLOURS = [
  { id: "none", label: "No lip colour" },
  { id: "gloss", label: "Clear gloss", hex: "#e9c9c0" },
  { id: "rose", label: "Rose", hex: "#b8566a" },
  { id: "berry", label: "Berry", hex: "#8a2a4a" },
  { id: "plum", label: "Plum", hex: "#5e2440" },
  { id: "red", label: "Red", hex: "#b0202e" },
  { id: "brown", label: "Brown", hex: "#6e3a2a" },
  { id: "gold", label: "Gold shimmer", hex: "#c8963e" },
] as const;

const CHEEK_COLOURS = [
  { id: "none", label: "No cheek colour" },
  { id: "peach", label: "Peach", hex: "#e89a7a" },
  { id: "rose", label: "Rose", hex: "#d0707f" },
  { id: "berry", label: "Berry", hex: "#a8445e" },
  { id: "bronze", label: "Bronze", hex: "#a8673a" },
  { id: "gold", label: "Gold glow", hex: "#d0a24a" },
] as const;

/** Every style also has a tucked version that sits under a hat or a head covering. */
const HAIR = [
  { id: "coils", label: "Short coils" },
  { id: "afro-s", label: "Small afro" },
  { id: "afro-m", label: "Medium afro" },
  { id: "afro-l", label: "Large afro" },
  { id: "twist-out", label: "Twist-out" },
  { id: "locs-short", label: "Short locs" },
  { id: "locs-long", label: "Long locs" },
  { id: "locs-updo", label: "Locs updo" },
  { id: "box-braids", label: "Box braids" },
  { id: "cornrows", label: "Cornrows" },
  { id: "knots", label: "Knot buns" },
  { id: "buzz", label: "Buzz cut" },
  { id: "fade-low", label: "Low fade with a part" },
  { id: "fade-high", label: "High-top fade" },
  { id: "waves", label: "360 waves" },
  { id: "finger-waves", label: "Finger waves" },
  { id: "silk-press", label: "Silk press with laid edges" },
  { id: "curly-bob", label: "Curly bob" },
  { id: "pixie", label: "Pixie cut" },
  { id: "long-straight", label: "Long and straight" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun", label: "Bun" },
  { id: "mohawk", label: "Mohawk" },
  { id: "bald", label: "Bald" },
] as const;

const HEADWEAR = [
  { id: "none", label: "None" },
  { id: "hijab", label: "Hijab" },
  { id: "turban", label: "Turban" },
  { id: "headwrap", label: "Headwrap" },
  { id: "durag", label: "Durag" },
  { id: "crown-hat", label: "Crown hat" },
  { id: "beanie", label: "Beanie" },
] as const;

const TOPS = [
  { id: "tee", label: "T-shirt" },
  { id: "polo", label: "Polo" },
  { id: "button-up", label: "Button-up shirt" },
  { id: "patterned", label: "Patterned shirt" },
  { id: "blouse", label: "Blouse" },
  { id: "sweater", label: "Sweater" },
  { id: "cardigan", label: "Cardigan" },
  { id: "hoodie", label: "Hoodie" },
  { id: "jersey", label: "Sports jersey" },
  { id: "vest", label: "Vest" },
  { id: "jacket", label: "Jacket" },
  { id: "turtleneck", label: "Turtleneck" },
] as const;

const BOTTOMS = [
  { id: "jeans", label: "Jeans" },
  { id: "chinos", label: "Chinos" },
  { id: "wide-leg", label: "Wide-leg trousers" },
  { id: "shorts", label: "Shorts" },
  { id: "track", label: "Track pants" },
  { id: "midi", label: "Midi skirt" },
  { id: "maxi", label: "Maxi skirt" },
] as const;

/** "none" wears the top and the bottom; a one-piece takes their place and wears the top's two colours. */
const ONE_PIECES = [
  { id: "none", label: "Top and bottom" },
  { id: "dress", label: "Dress" },
  { id: "jumpsuit", label: "Jumpsuit" },
  { id: "suit", label: "Suit" },
] as const;

const SHOES = [
  { id: "sneakers", label: "Sneakers" },
  { id: "high-tops", label: "High-tops" },
  { id: "loafers", label: "Loafers" },
  { id: "boots", label: "Boots" },
  { id: "sandals", label: "Sandals" },
  { id: "heels", label: "Low block heels" },
] as const;

const ACCESSORIES = [
  { id: "glasses-round", label: "Round glasses" },
  { id: "glasses-square", label: "Square glasses" },
  { id: "glasses-cat", label: "Cat-eye glasses" },
  { id: "glasses-rect", label: "Rectangular glasses" },
  { id: "glasses-wire", label: "Thin wire glasses" },
  { id: "studs", label: "Stud earrings" },
  { id: "hoops", label: "Hoop earrings" },
  { id: "drops", label: "Drop earrings" },
  { id: "necklace", label: "Necklace" },
  { id: "watch", label: "Watch" },
  { id: "bracelets", label: "Bracelets" },
  { id: "cap", label: "Cap" },
  { id: "bucket", label: "Bucket hat" },
  { id: "fedora", label: "Fedora" },
] as const;
export const MAX_ACCESSORIES = 3;
/** At most one from each of these at once. */
const ACCESSORY_GROUPS: readonly (readonly string[])[] = [
  ["glasses-round", "glasses-square", "glasses-cat", "glasses-rect", "glasses-wire"],
  ["studs", "hoops", "drops"],
  ["cap", "bucket", "fedora"],
];
const HATS = ACCESSORY_GROUPS[2];
/** Head coverings a hat may sit over without the two passing through each other. */
const HAT_OVER: readonly string[] = ["none", "durag"];

const ASSISTIVE = [
  { id: "hearing-aids", label: "Hearing aids" },
  { id: "implant", label: "Cochlear-implant processor" },
] as const;

const PLATE_SYMBOLS = [
  { id: "spade", label: "Spade" },
  { id: "heart", label: "Heart" },
  { id: "diamond", label: "Diamond" },
  { id: "club", label: "Club" },
  { id: "star", label: "Star" },
  { id: "none", label: "No symbol" },
] as const;

// ---- the look ----

export interface Look {
  build: Id<typeof BUILDS>;
  height: Id<typeof HEIGHTS>;
  skin: SkinId;
  eyes: Id<typeof EYES>;
  eyeColor: Id<typeof EYE_COLOURS>;
  brows: Id<typeof BROWS>;
  /** Brows and facial hair. */
  browColor: Id<typeof NATURAL_HAIR>;
  nose: Id<typeof NOSES>;
  mouth: Id<typeof MOUTHS>;
  ears: Id<typeof EARS>;
  /** Any of them, each at most once. */
  marks: Id<typeof MARKS>[];
  facialHair: Id<typeof FACIAL_HAIR>;
  liner: Id<typeof LINERS>;
  lipColor: Id<typeof LIP_COLOURS>;
  cheekColor: Id<typeof CHEEK_COLOURS>;
  hair: Id<typeof HAIR>;
  hairColor: Id<typeof HAIR_COLOURS>;
  headwear: Id<typeof HEADWEAR>;
  headwearColor: Colour;
  top: Id<typeof TOPS>;
  topColor: Colour;
  topTrim: Colour;
  bottom: Id<typeof BOTTOMS>;
  bottomColor: Colour;
  bottomTrim: Colour;
  onePiece: Id<typeof ONE_PIECES>;
  shoes: Id<typeof SHOES>;
  shoeColor: Colour;
  /** Up to MAX_ACCESSORIES, one pair of glasses, one pair of earrings and one hat. */
  accessories: Id<typeof ACCESSORIES>[];
  assistive: Id<typeof ASSISTIVE>[];
  plateColor: Colour;
  plateSymbol: Id<typeof PLATE_SYMBOLS>;
}

export type Field = keyof Look;

export const CATALOG: { readonly [F in Field]: readonly Option[] } = {
  build: BUILDS,
  height: HEIGHTS,
  skin: SKIN,
  eyes: EYES,
  eyeColor: EYE_COLOURS,
  brows: BROWS,
  browColor: NATURAL_HAIR,
  nose: NOSES,
  mouth: MOUTHS,
  ears: EARS,
  marks: MARKS,
  facialHair: FACIAL_HAIR,
  liner: LINERS,
  lipColor: LIP_COLOURS,
  cheekColor: CHEEK_COLOURS,
  hair: HAIR,
  hairColor: HAIR_COLOURS,
  headwear: HEADWEAR,
  headwearColor: GARMENT_PALETTE,
  top: TOPS,
  topColor: GARMENT_PALETTE,
  topTrim: GARMENT_PALETTE,
  bottom: BOTTOMS,
  bottomColor: GARMENT_PALETTE,
  bottomTrim: GARMENT_PALETTE,
  onePiece: ONE_PIECES,
  shoes: SHOES,
  shoeColor: GARMENT_PALETTE,
  accessories: ACCESSORIES,
  assistive: ASSISTIVE,
  plateColor: GARMENT_PALETTE,
  plateSymbol: PLATE_SYMBOLS,
};

export const FIELDS = Object.keys(CATALOG) as Field[];

/** Fields that hold a list of option ids rather than one, with the most each may hold. */
export const SET_FIELDS = { marks: MARKS.length, accessories: MAX_ACCESSORIES, assistive: ASSISTIVE.length } as const;
type SetField = keyof typeof SET_FIELDS;
const isSet = (field: Field): field is SetField => field in SET_FIELDS;

/** The editor's tabs; shuffleLook can try ideas within one of them. */
export const FIELD_GROUPS = {
  body: ["build", "height", "skin"],
  face: ["eyes", "eyeColor", "brows", "browColor", "nose", "mouth", "ears", "marks", "facialHair", "liner", "lipColor", "cheekColor"],
  hair: ["hair", "hairColor", "headwear", "headwearColor"],
  outfit: ["top", "topColor", "topTrim", "bottom", "bottomColor", "bottomTrim", "onePiece"],
  shoes: ["shoes", "shoeColor"],
  extras: ["accessories", "assistive", "plateColor", "plateSymbol"],
} as const satisfies Record<string, readonly Field[]>;
export type FieldGroup = keyof typeof FIELD_GROUPS;

export function hexOf(field: Field, id: string): string | undefined {
  return CATALOG[field].find((option) => option.id === id)?.hex;
}

/** Six looks across skin tones, builds, hair textures and outfit styles, none of them a default person. */
export const STARTING_LOOKS: readonly Look[] = [
  {
    // Game-night host.
    build: "broad", height: "tall", skin: "11w",
    eyes: "almond", eyeColor: "dark-brown", brows: "thick", browColor: "salt-pepper", nose: "broad", mouth: "full", ears: "round",
    marks: ["laugh-lines"], facialHair: "short-beard", liner: "none", lipColor: "none", cheekColor: "none",
    hair: "fade-low", hairColor: "black", headwear: "none", headwearColor: "gold",
    top: "patterned", topColor: "olive", topTrim: "gold", bottom: "chinos", bottomColor: "tan", bottomTrim: "chocolate", onePiece: "none",
    shoes: "loafers", shoeColor: "chocolate",
    accessories: ["glasses-round", "watch"], assistive: [], plateColor: "forest", plateSymbol: "spade",
  },
  {
    // Backyard regular.
    build: "slender", height: "middle", skin: "7n",
    eyes: "round", eyeColor: "brown", brows: "soft-arch", browColor: "dark-brown", nose: "rounded", mouth: "medium", ears: "small",
    marks: [], facialHair: "none", liner: "thin", lipColor: "gloss", cheekColor: "none",
    hair: "box-braids", hairColor: "dark-brown", headwear: "none", headwearColor: "royal",
    top: "jersey", topColor: "royal", topTrim: "white", bottom: "shorts", bottomColor: "navy", bottomTrim: "white", onePiece: "none",
    shoes: "high-tops", shoeColor: "white",
    accessories: ["hoops"], assistive: [], plateColor: "royal", plateSymbol: "none",
  },
  {
    // Bright and bold.
    build: "medium", height: "short", skin: "1c",
    eyes: "upturned", eyeColor: "green", brows: "high-arch", browColor: "auburn", nose: "narrow", mouth: "small", ears: "large",
    marks: ["freckles"], facialHair: "none", liner: "wing", lipColor: "berry", cheekColor: "rose",
    hair: "curly-bob", hairColor: "teal", headwear: "none", headwearColor: "teal",
    top: "hoodie", topColor: "crimson", topTrim: "gold", bottom: "wide-leg", bottomColor: "sage", bottomTrim: "forest", onePiece: "none",
    shoes: "boots", shoeColor: "black",
    accessories: ["glasses-cat"], assistive: ["hearing-aids"], plateColor: "crimson", plateSymbol: "diamond",
  },
  {
    // Sunday best.
    build: "round", height: "tallest", skin: "14c",
    eyes: "hooded", eyeColor: "deep", brows: "rounded", browColor: "black", nose: "button", mouth: "bow", ears: "close",
    marks: ["beauty-mark"], facialHair: "none", liner: "bold", lipColor: "plum", cheekColor: "gold",
    hair: "silk-press", hairColor: "black", headwear: "crown-hat", headwearColor: "plum",
    top: "blouse", topColor: "plum", topTrim: "gold", bottom: "midi", bottomColor: "plum", bottomTrim: "gold", onePiece: "dress",
    shoes: "heels", shoeColor: "gold",
    accessories: ["drops"], assistive: [], plateColor: "gold", plateSymbol: "heart",
  },
  {
    // Quiet strategist.
    build: "medium", height: "shortest", skin: "4w",
    eyes: "monolid", eyeColor: "hazel", brows: "straight", browColor: "brown", nose: "straight", mouth: "thin", ears: "round",
    marks: [], facialHair: "none", liner: "none", lipColor: "rose", cheekColor: "peach",
    hair: "bun", hairColor: "brown", headwear: "hijab", headwearColor: "plum",
    top: "cardigan", topColor: "cream", topTrim: "plum", bottom: "maxi", bottomColor: "charcoal", bottomTrim: "silver", onePiece: "none",
    shoes: "sneakers", shoeColor: "white",
    accessories: ["glasses-rect"], assistive: [], plateColor: "sage", plateSymbol: "star",
  },
  {
    // Cookout fit.
    build: "broad", height: "middle", skin: "9w",
    eyes: "downturned", eyeColor: "amber", brows: "angled", browColor: "black", nose: "upturned", mouth: "wide", ears: "small",
    marks: [], facialHair: "goatee", liner: "none", lipColor: "none", cheekColor: "none",
    hair: "waves", hairColor: "black", headwear: "durag", headwearColor: "gold",
    top: "tee", topColor: "emerald", topTrim: "gold", bottom: "shorts", bottomColor: "cream", bottomTrim: "tan", onePiece: "none",
    shoes: "sandals", shoeColor: "black",
    accessories: ["necklace"], assistive: [], plateColor: "emerald", plateSymbol: "club",
  },
];

/** Fills any field that is missing or unknown; only ever reached through a broken or old record. */
const FALLBACK: Look = STARTING_LOOKS[0];

const KNOWN = {} as Record<Field, ReadonlySet<string>>;
for (const field of FIELDS) KNOWN[field] = new Set(CATALOG[field].map((option) => option.id));

function copy(look: Look): Look {
  return { ...look, marks: [...look.marks], accessories: [...look.accessories], assistive: [...look.assistive] };
}

/** Known ids, each once, in the order given (so no list outgrows its catalog); accessories are capped after their rules. */
function cleanSet(field: SetField, value: unknown[]): string[] {
  const kept: string[] = [];
  // A list longer than the catalog can only hold repeats or junk.
  for (const id of value.slice(0, 64)) if (typeof id === "string" && KNOWN[field].has(id) && !kept.includes(id)) kept.push(id);
  return kept;
}

/** One of each group, no hat over a covering it would pass through, and at most MAX_ACCESSORIES. */
function fitAccessories(look: Look): void {
  const worn: string[] = [];
  for (const id of look.accessories) {
    const group = ACCESSORY_GROUPS.find((members) => members.includes(id));
    if (group && worn.some((other) => group.includes(other))) continue;
    if (HATS.includes(id) && !HAT_OVER.includes(look.headwear)) continue;
    worn.push(id);
  }
  look.accessories = worn.slice(0, MAX_ACCESSORIES) as Look["accessories"];
}

/**
 * The check at every trust boundary (the server on each look it receives, the client on each look it
 * loads): keeps known fields with known option ids, fills the rest from a fixed fallback, ignores
 * extra fields, and never throws.
 */
export function cleanLook(input: unknown): Look {
  const look = copy(FALLBACK);
  const out = look as unknown as Record<Field, unknown>;
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return look;
    const given = input as Record<string, unknown>;
    for (const field of FIELDS) {
      // Own fields only, so nothing inherited (or planted on a prototype) is read.
      if (!Object.hasOwn(given, field)) continue;
      const value = given[field];
      if (isSet(field)) {
        if (Array.isArray(value)) out[field] = cleanSet(field, value);
      } else if (typeof value === "string" && KNOWN[field].has(value)) out[field] = value;
    }
  } catch {
    // A getter that throws or a revoked proxy: nothing from it can be trusted.
    return copy(FALLBACK);
  }
  fitAccessories(look);
  return look;
}

/**
 * A random look: each single-choice field picks any of its options with equal chance; a list field
 * picks how many (up to its cap) and then which, with equal chance. With `group`, only that tab's
 * fields change from `base`. The result has passed cleanLook.
 */
export function shuffleLook(random: () => number, base: Look = FALLBACK, group?: FieldGroup): Look {
  const draw = (n: number): number => Math.min(n - 1, Math.floor(random() * n));
  const out: Record<string, unknown> = { ...base };
  for (const field of group ? FIELD_GROUPS[group] : FIELDS) {
    let ids: string[] = CATALOG[field].map((option) => option.id);
    // A tab's shuffle never takes a hat off on the Extras tab: only a covering the hat sits over.
    if (group && field === "headwear" && base.accessories.some((id) => HATS.includes(id))) ids = ids.filter((id) => HAT_OVER.includes(id));
    if (isSet(field)) {
      const chosen: string[] = [];
      for (let count = draw(SET_FIELDS[field] + 1); count > 0; count -= 1) chosen.push(ids.splice(draw(ids.length), 1)[0]);
      out[field] = chosen;
    } else out[field] = ids[draw(ids.length)];
  }
  return cleanLook(out);
}

// ---- gestures ----

/** Friendly only, and never about anyone's cards. */
export const GESTURES = [
  { id: "wave", label: "Wave" },
  { id: "clap", label: "Clap" },
  { id: "laugh", label: "Laugh" },
  { id: "bow", label: "Bow" },
  { id: "slap", label: "Card slap" },
  { id: "boston", label: "Boston celebration" },
  { id: "shake", label: "Head shake" },
] as const satisfies readonly Option[];
export type GestureId = Id<typeof GESTURES>;

/** How long each gesture plays, in ms; every one is under two seconds. */
export const GESTURE_MS: Record<GestureId, number> = {
  wave: 1600,
  clap: 1500,
  laugh: 1600,
  bow: 1400,
  slap: 900,
  boston: 1900,
  shake: 1200,
};

export const isGesture = (kind: unknown): kind is GestureId => GESTURES.some((gesture) => gesture.id === kind);

// ---- a VR player's live head and hands ----

/** Head pitch and yaw (yaw relative to the body's facing), in radians, each within +-HEAD_TURN. */
export const HEAD_TURN = 1.2;
/** A hand's reach in metres from the feet point, sideways and forward, each within +-HAND_REACH. */
export const HAND_REACH = 1.2;
/** A hand's height in metres above the feet point, from 0 to HAND_HEIGHT. */
export const HAND_HEIGHT = 2.4;

/** Metres from the feet point, turned with the body: x to the body's right, y up, z toward its back (it faces -Z). */
export interface Hand {
  x: number;
  y: number;
  z: number;
}
