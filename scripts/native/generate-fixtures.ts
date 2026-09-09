// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Golden protocol fixtures.
 *
 * One deterministic table is driven through the real session layer; every
 * artifact the Unreal `LongTableProtocol` automation tests read is captured
 * from that drive and written to `fixtures/protocol/`. Each projection fixture
 * carries both the pretty value and its canonical text so a decoder in either
 * language can prove byte-equivalent re-encoding.
 *
 *   node scripts/native/run-ts.mjs scripts/native/generate-fixtures.ts          # write
 *   node scripts/native/run-ts.mjs scripts/native/generate-fixtures.ts --check  # verify committed files
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RULES_MANIFEST, SEATS, fnv1a, manifestDigest, type Card, type GameState } from "../../packages/rules-core/src";
import {
  AUTHORITY_MESSAGE,
  CHOICE_KINDS,
  CLIENT_MESSAGE,
  CONTRACT_MODES,
  DEALER_CUES,
  DEALER_CUE_FRAME,
  HOST_ANNOUNCEMENT_CUES,
  HOST_CONTROLS,
  HOST_PROJECTION,
  INTENT_AUTHORITY,
  INTENT_COUNTER_MAX,
  INTENT_COUNTER_MIN,
  INTENT_KINDS,
  INTENT_LANES,
  INTENT_RECEIPT,
  LIMITS,
  MANIFEST_ID,
  OCCUPANTS,
  OUTCOMES,
  PHASES,
  PLAYER_PROJECTION,
  PROTOCOL_VERSION,
  PUBLIC_CORE_KEYS,
  PUBLIC_PROJECTION,
  REJECTION_CODES,
  REJECTION_MESSAGES,
  ROLES,
  SCHEMA_INVENTORIES,
  SEAT_LABELS,
  SELECTION_TYPES,
  SUITS,
  WIRE_ERROR_CODES,
  canonicalJson,
  decodeClientMessage,
  type AuthorityMessage,
  type ClientMessage,
  type DealerCueFrame,
  type IntentLane,
  type IntentReceipt,
  type Role,
  type Seat,
  type TableIntent,
} from "../../packages/protocol/src";
import { AuthoritySessions, staticDirectory, type Outbound } from "../../services/table-authority/src/session";
import { buildHostProjection, buildPlayerProjection, buildPublicProjection, type TableView } from "../../services/table-authority/src/projections";
import { EMPTY_UNCOMMITTED } from "../../services/table-authority/src/seat-interaction";
import { TableAuthority } from "../../services/table-authority/src/table";
import { handleText } from "../../services/table-authority/src/wire";

export const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "protocol");

const TABLE_ID = "table-fixture-1";
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
/** The fixture drive's externally allocated incarnation; every golden grant is `g:fixture-incarnation:<n>`. */
const FIXTURE_INCARNATION = "fixture-incarnation";
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
const TOKENS: Record<Role, string> = {
  player: "fixture-token-south",
  host: "fixture-token-host",
  public: "fixture-token-public",
  dealer: "fixture-token-dealer",
};
const PARTICIPANTS: Record<Role, string> = {
  player: "p-south",
  host: "p-host",
  public: "p-spectator",
  dealer: "robot-dealer",
};

export type FixtureSet = Record<string, unknown>;

interface Drive {
  table: TableAuthority;
  sessions: AuthoritySessions;
  outbound: Outbound[];
  clientMessages: ClientMessage[];
  intentCounter: number;
}

function replacementCards(tag: string, count: number): Card[] {
  return Array.from({ length: count }, (_, index) => ({ id: `other-${tag}-${index}`, suit: "spades" as const, rank: 2, label: "OTHER", glyph: "!" }));
}

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
/**
 * Host/public counterfactual: all four hands, the kitty, the discard pile,
 * the seed and the event log are replaced. The kitty and discard replacements
 * are never empty, so the non-vacuity evidence can never rest on an
 * empty-versus-empty comparison; no pile's cards or length reaches any
 * projection.
 */
function allHandsCounterfactual(game: GameState): GameState {
  const variant = structuredClone(game);
  variant.seed = "counterfactual-seed";
  SEATS.forEach((seat) => {
    variant.hands[seat] = replacementCards(seat, variant.hands[seat].length);
  });
  variant.kitty = replacementCards("kitty", Math.max(1, variant.kitty.length));
  variant.discardPile = replacementCards("discard", Math.max(1, variant.discardPile.length));
  variant.events = [{ id: 1, text: "private host record" }];
  return variant;
}

/** Player counterfactual: only the entitled seat's hand is retained; every other concealed input is replaced. */
function entitledCounterfactual(game: GameState, entitled: Seat): GameState {
  const variant = allHandsCounterfactual(game);
  variant.hands[entitled] = structuredClone(game.hands[entitled]);
  return variant;
}

/** Digest of every concealed input a projection builder could read. */
function concealedSourceDigest(game: GameState): string {
  return fnv1a(JSON.stringify({ hands: game.hands, kitty: game.kitty, discardPile: game.discardPile, seed: game.seed, events: game.events }));
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

function newDrive(seed: string): Drive {
  const table = new TableAuthority({
    tableId: TABLE_ID,
    seed,
    hostParticipantId: PARTICIPANTS.host,
    seats: {
      south: { occupant: "human", participantId: PARTICIPANTS.player, displayName: "Ada", connected: false },
      west: { occupant: "ai" },
      north: { occupant: "ai" },
      east: { occupant: "ai" },
    },
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
    incarnation: { kind: "new", incarnationId: FIXTURE_INCARNATION },
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
  });
  const sessions = new AuthoritySessions({
    directory: staticDirectory({
      [TOKENS.player]: { participantId: PARTICIPANTS.player, kind: "participant" },
      [TOKENS.host]: { participantId: PARTICIPANTS.host, kind: "participant" },
      [TOKENS.public]: { participantId: PARTICIPANTS.public, kind: "participant" },
      [TOKENS.dealer]: { participantId: PARTICIPANTS.dealer, kind: "dealer" },
    }),
    tables: new Map([[TABLE_ID, table]]),
    sessionIdFor: (connectionId) => `session-${connectionId}`,
  });
  return { table, sessions, outbound: [], clientMessages: [], intentCounter: 0 };
}

function send(drive: Drive, connectionId: string, message: ClientMessage): Outbound[] {
  drive.clientMessages.push(message);
  const out = drive.sessions.handle(connectionId, message);
  drive.outbound.push(...out);
  return out;
}

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/** The connection's lane identity: its current server-issued grant plus the exact next counter. */
function laneIntentId(drive: Drive, connectionId: Role): string {
  const lane: IntentLane = connectionId === "player" ? "south" : "host";
  const next = drive.table.nextIntentCounter(lane);
  if (next === null) throw new Error(`fixture lane ${lane} exhausted`);
  return `${drive.table.laneGrant(lane)}:${next}`;
}

function sendIntent(drive: Drive, connectionId: Role, intent: TableIntent, overrides: { intentId?: string; expectedVersion?: number } = {}): IntentReceipt {
  drive.intentCounter += 1;
  const out = send(drive, connectionId, {
    type: "intent",
    tableId: TABLE_ID,
    intentId: overrides.intentId ?? laneIntentId(drive, connectionId),
    expectedVersion: overrides.expectedVersion ?? drive.table.currentVersion,
    intent,
  });
  const receipt = out.find((item) => item.connectionId === connectionId && item.message.type === "receipt")?.message;
  if (!receipt || receipt.type !== "receipt") throw new Error("no receipt returned");
  return receipt.receipt;
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

function hello(role: Role, lastVersion: number | null = null): ClientMessage {
  return { type: "hello", protocolVersion: PROTOCOL_VERSION, token: TOKENS[role], role, tableId: TABLE_ID, displayName: role === "player" ? "Ada" : "", lastVersion };
}

function southProjection(drive: Drive) {
  const projection = drive.table.snapshot("player", "south", PARTICIPANTS.player);
  if (!projection || projection.role !== "player") throw new Error("no south projection");
  return projection;
}

function southChoice(drive: Drive, kind: "bid" | "first") {
  const choices = southProjection(drive).legalChoices;
  if (kind === "bid") {
    const bids = choices.filter((choice) => choice.kind === "bid");
    return bids.length > 0 ? bids[bids.length - 1] : choices[0];
  }
  return choices[0];
}

/** One South move through preview/confirm or the kitty picks; asserts acceptance. */
function southMove(drive: Drive): void {
  const game = drive.table.committedState();
  if (game.phase === "kitty") {
    game.hands.south.slice(0, 6).forEach((card) => {
      const receipt = sendIntent(drive, "player", { kind: "toggle-discard", cardId: card.id });
      if (receipt.outcome !== "accepted") throw new Error(`toggle rejected: ${receipt.code}`);
    });
    const confirmed = sendIntent(drive, "player", { kind: "confirm" });
    if (!confirmed.committed) throw new Error(`kitty confirm rejected: ${confirmed.code}`);
    return;
  }
  const choice = southChoice(drive, game.phase === "auction" ? "bid" : "first");
  const first = sendIntent(drive, "player", choice.intent);
  if (first.outcome !== "accepted") throw new Error(`choice rejected: ${first.code}`);
  if (choice.intent.kind === "preview") {
    const confirmed = sendIntent(drive, "player", { kind: "confirm" });
    if (!confirmed.committed) throw new Error(`confirm rejected: ${confirmed.code}`);
  }
}

function driveUntil(drive: Drive, predicate: (game: GameState) => boolean): void {
  let guard = 0;
  while (!predicate(drive.table.committedState())) {
    if (drive.table.committedState().phase === "summary") return;
    southMove(drive);
    guard += 1;
    if (guard > 200) throw new Error("fixture drive guard exceeded");
  }
}

/** A seed where South wins the auction, so declaration and the kitty are exercised. */
export function fixtureSeed(): string {
  for (let index = 0; index < 100; index += 1) {
    const seed = `fixture-seed-${index}`;
    const probe = newDrive(seed);
    send(probe, "player", hello("player"));
    driveUntil(probe, (game) => game.phase !== "auction");
    if (probe.table.committedState().contract?.bidder === "south") return seed;
  }
  throw new Error("no fixture seed produced a South contract");
}

function projectionFixture<T>(schema: { canonical(value: T): unknown }, value: T): { canonical: string; value: T } {
  return { canonical: JSON.stringify(schema.canonical(value)), value };
}

export function buildFixtures(): FixtureSet {
  const seed = fixtureSeed();
  const drive = newDrive(seed);

  const welcomes: Record<Role, AuthorityMessage> = {} as Record<Role, AuthorityMessage>;
  (["player", "host", "public", "dealer"] as Role[]).forEach((role) => {
    const out = send(drive, role, hello(role));
    welcomes[role] = out[0].message;
  });

  // Rejections worth pinning before play starts.
  const receipts: Record<string, IntentReceipt> = {};
  receipts.bidOutsideManifest = sendIntent(drive, "player", { kind: "preview", selection: { type: "bid", bid: { level: 7, mode: "high" } } });
  receipts.unauthorizedRole = sendIntent(drive, "host", { kind: "confirm" });
  receipts.nothingToConfirm = sendIntent(drive, "player", { kind: "confirm" });
  receipts.notBetweenHands = sendIntent(drive, "host", { kind: "host-pause" });
  const versionBeforeCommit = drive.table.currentVersion;
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
  // The duplicate example resends the exact identity the accepted preview consumed.
  const previewIdentity = laneIntentId(drive, "player");
  receipts.acceptedPreview = sendIntent(drive, "player", southChoice(drive, "bid").intent, { intentId: previewIdentity });
  receipts.duplicate = sendIntent(drive, "player", southChoice(drive, "bid").intent, { intentId: previewIdentity });
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
  receipts.committedConfirm = sendIntent(drive, "player", { kind: "confirm" });
  // The confirm advanced the shared version; an intent formed against the old view is stale.
  receipts.staleVersion = sendIntent(drive, "player", { kind: "cancel" }, { expectedVersion: versionBeforeCommit });
  receipts.hostAnnounce = sendIntent(drive, "host", { kind: "host-announce", cue: "welcome" });

  driveUntil(drive, (game) => game.phase === "play" && game.completedTricks.length >= 2 && game.currentTrick.length >= 1);
  const midPlayVersion = drive.table.currentVersion;

  const player = southProjection(drive);
  const host = drive.table.snapshot("host", null, PARTICIPANTS.host);
  const pub = drive.table.snapshot("public", null, PARTICIPANTS.public);
  if (!host || host.role !== "host" || !pub || pub.role !== "public") {
    throw new Error("fixture snapshots unavailable");
  }

  const cues: DealerCueFrame[] = drive.outbound
    .filter((item) => item.connectionId === "dealer" && item.message.type === "dealer-cue")
    .map((item) => (item.message.type === "dealer-cue" ? item.message.frame : null))
    .filter((frame): frame is DealerCueFrame => frame !== null);

  // Reconnect: South drops, the host announces, South returns with the last version it applied.
  drive.outbound.push(...drive.sessions.disconnect("player"));
  sendIntent(drive, "host", { kind: "host-announce", cue: "resuming" });
  const resumed = send(drive, "player", hello("player", midPlayVersion));
  const replayMessage = resumed.find((item) => item.message.type === "replay")?.message;
  if (!replayMessage || replayMessage.type !== "replay") throw new Error("no replay message");

  const errorText = handleText(drive.sessions, "stranger", JSON.stringify({ ...hello("player"), hand: [] }))[0].text;
  const errorMessage = JSON.parse(errorText) as AuthorityMessage;

  const game = drive.table.committedState();
  const actualView: TableView = {
    tableId: TABLE_ID,
    version: midPlayVersion,
    game,
    seats: { south: drive.table.seatBinding("south"), west: { occupant: "ai" }, north: { occupant: "ai" }, east: { occupant: "ai" } },
    eventEnded: false,
    lastAnnouncement: "welcome",
  };
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
  const allHandsTwin = allHandsCounterfactual(game);
  const entitledTwin = entitledCounterfactual(game, "south");
  const allHandsView: TableView = { ...actualView, game: allHandsTwin };
  const entitledView: TableView = { ...actualView, game: entitledTwin };
  // Non-vacuity before any equality is asserted anywhere: the concealed source
  // inputs of each counterfactual really differ from the live state, and the
  // entitled counterfactual really retains the entitled hand alone.
  const actualDigest = concealedSourceDigest(game);
  if (concealedSourceDigest(allHandsTwin) === actualDigest) throw new Error("all-hands counterfactual left the concealed inputs unchanged");
  if (concealedSourceDigest(entitledTwin) === actualDigest) throw new Error("entitled counterfactual left the concealed inputs unchanged");
  SEATS.forEach((seat) => {
    if (JSON.stringify(allHandsTwin.hands[seat]) === JSON.stringify(game.hands[seat])) {
      throw new Error(`all-hands counterfactual retained the ${seat} hand`);
    }
    const entitledSame = JSON.stringify(entitledTwin.hands[seat]) === JSON.stringify(game.hands[seat]);
    if (seat === "south" ? !entitledSame : entitledSame) {
      throw new Error(`entitled counterfactual mishandled the ${seat} hand`);
    }
  });
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

  const intentExamples: ClientMessage[] = (
    [
      { kind: "preview", selection: { type: "pass" } },
      { kind: "preview", selection: { type: "bid", bid: { level: 4, mode: "low" } } },
      { kind: "preview", selection: { type: "declaration", trump: "spades" } },
      { kind: "preview", selection: { type: "declaration", trump: null } },
      { kind: "preview", selection: { type: "play", cardId: "hearts-14" } },
      { kind: "toggle-discard", cardId: "clubs-2" },
      { kind: "cancel" },
      { kind: "confirm" },
      { kind: "next-hand" },
      { kind: "host-pause" },
      { kind: "host-resume" },
      { kind: "host-announce", cue: "hand-starting" },
      { kind: "host-substitute", seat: "west" },
      { kind: "host-transfer", participantId: "p-north" },
      { kind: "host-end-event" },
    ] as TableIntent[]
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
    // Every example identity is the drive's south lane grant (`g:<incarnation>:1`) with a canonical counter.
  ).map((intent, index) => ({ type: "intent", tableId: TABLE_ID, intentId: `${drive.table.laneGrant("south")}:${index + 1}`, expectedVersion: 12, intent }));
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

  const clientMessages: ClientMessage[] = [
    hello("player"),
    hello("host"),
    hello("public"),
    hello("dealer"),
    hello("player", 12),
    ...intentExamples,
    { type: "resync", tableId: TABLE_ID, lastVersion: 12 },
  ];

  const authorityMessages: AuthorityMessage[] = [
    welcomes.player,
    welcomes.host,
    welcomes.public,
    welcomes.dealer,
    { type: "projection", tableId: TABLE_ID, version: midPlayVersion, projection: player },
    { type: "receipt", tableId: TABLE_ID, receipt: receipts.committedConfirm },
    replayMessage,
    { type: "dealer-cue", tableId: TABLE_ID, frame: cues[cues.length - 1] },
    errorMessage,
  ];

  const rejections = [
    { name: "host projection with a hand member", schema: "host-projection", payload: { ...host, hand: [] }, code: "unknown-field", path: "host.hand" },
    { name: "public projection with legal choices", schema: "public-projection", payload: { ...pub, legalChoices: [] }, code: "unknown-field", path: "public.legalChoices" },
    { name: "public projection with a seed", schema: "public-projection", payload: { ...pub, seed: "x" }, code: "unknown-field", path: "public.seed" },
    { name: "host projection with an uncommitted revision", schema: "host-projection", payload: { ...host, uncommittedRevision: 1 }, code: "unknown-field", path: "host.uncommittedRevision" },
    { name: "player projection missing its hand", schema: "player-projection", payload: (({ hand: _hand, ...rest }) => rest)(player), code: "missing-field", path: "player.hand" },
    { name: "player projection with a string version", schema: "player-projection", payload: { ...player, version: "7" }, code: "type-mismatch", path: "player.version" },
    { name: "player projection missing its uncommitted revision", schema: "player-projection", payload: (({ uncommittedRevision: _revision, ...rest }) => rest)(player), code: "missing-field", path: "player.uncommittedRevision" },
    { name: "public projection with an unknown phase", schema: "public-projection", payload: { ...pub, phase: "dealing" }, code: "value-out-of-range", path: "public.phase" },
    { name: "public projection with a foreign protocol version", schema: "public-projection", payload: { ...pub, protocolVersion: "long-table-protocol/0" }, code: "value-out-of-range", path: "public.protocolVersion" },
    { name: "client message with an unknown type", schema: "client-message", payload: { type: "steal-cards" }, code: "unknown-variant", path: "client.type" },
    { name: "intent with a level 8 bid", schema: "client-message", payload: { type: "intent", tableId: TABLE_ID, intentId: "x", expectedVersion: 1, intent: { kind: "preview", selection: { type: "bid", bid: { level: 8, mode: "high" } } } }, code: "value-out-of-range", path: "client.intent.selection.bid.level" },
    { name: "hello carrying a seed", schema: "client-message", payload: { ...hello("player"), seed: "x" }, code: "unknown-field", path: "client.seed" },
    { name: "dealer cue with a card id", schema: "dealer-cue", payload: { ...cues[0], cardId: "spades-14" }, code: "unknown-field", path: "cue.cardId" },
    { name: "dealer cue with an unknown cue", schema: "dealer-cue", payload: { ...cues[0], cue: "reveal-hands" }, code: "value-out-of-range", path: "cue.cue" },
    { name: "authority error with an unknown code", schema: "authority-message", payload: { type: "error", code: "leak", detail: "" }, code: "value-out-of-range", path: "authority.code" },
    { name: "welcome carrying a hand beside its projection", schema: "authority-message", payload: { ...welcomes.host, hand: [] }, code: "unknown-field", path: "authority.hand" },
    { name: "receipt with an unknown outcome", schema: "receipt", payload: { ...receipts.committedConfirm, outcome: "maybe" }, code: "value-out-of-range", path: "receipt.outcome" },
    { name: "empty text", schema: "client-message", payload: null, code: "not-an-object", path: "client" },
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
    // Role-discriminated welcome crossovers: every seat/projection crossover
    // fails closed identically in the TypeScript and Unreal decoders.
    { name: "host welcome carrying a seat", schema: "authority-message", payload: { ...welcomes.host, seat: "south" }, code: "value-out-of-range", path: "authority.seat" },
    { name: "public welcome carrying a seat", schema: "authority-message", payload: { ...welcomes.public, seat: "east" }, code: "value-out-of-range", path: "authority.seat" },
    { name: "dealer welcome carrying a seat", schema: "authority-message", payload: { ...welcomes.dealer, seat: "west" }, code: "value-out-of-range", path: "authority.seat" },
    { name: "player welcome without a seat", schema: "authority-message", payload: { ...welcomes.player, seat: null }, code: "type-mismatch", path: "authority.seat" },
    { name: "player welcome with a public projection", schema: "authority-message", payload: { ...welcomes.player, projection: pub }, code: "value-out-of-range", path: "authority.projection.role" },
    { name: "host welcome with a public projection", schema: "authority-message", payload: { ...welcomes.host, projection: pub }, code: "value-out-of-range", path: "authority.projection.role" },
    { name: "public welcome with a player projection", schema: "authority-message", payload: { ...welcomes.public, projection: player }, code: "unknown-field", path: "authority.projection.seat" },
    { name: "dealer welcome carrying a projection", schema: "authority-message", payload: { ...welcomes.dealer, projection: pub }, code: "value-out-of-range", path: "authority.projection" },
    { name: "player welcome with a null projection", schema: "authority-message", payload: { ...welcomes.player, projection: null }, code: "not-an-object", path: "authority.projection" },
    { name: "dealer cue whose inner frame is for another table", schema: "authority-message", payload: { type: "dealer-cue", tableId: TABLE_ID, frame: { ...cues[0], tableId: "table-elsewhere" } }, code: "value-out-of-range", path: "authority.frame.tableId" },
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
    // Intent-counter crossovers: entitled welcomes carry an exact positive
    // safe-integer counter or null; public and dealer welcomes accept null and
    // nothing else. Both decoders reject identically.
    { name: "player welcome with a zero next counter", schema: "authority-message", payload: { ...welcomes.player, nextIntentCounter: 0 }, code: "value-out-of-range", path: "authority.nextIntentCounter" },
    { name: "player welcome with a fractional next counter", schema: "authority-message", payload: { ...welcomes.player, nextIntentCounter: 1.5 }, code: "type-mismatch", path: "authority.nextIntentCounter" },
    { name: "player welcome with a counter past the maximum", schema: "authority-message", payload: { ...welcomes.player, nextIntentCounter: 9007199254740992 }, code: "value-out-of-range", path: "authority.nextIntentCounter" },
    { name: "host welcome with a string next counter", schema: "authority-message", payload: { ...welcomes.host, nextIntentCounter: "7" }, code: "type-mismatch", path: "authority.nextIntentCounter" },
    { name: "public welcome with a next counter", schema: "authority-message", payload: { ...welcomes.public, nextIntentCounter: 4 }, code: "value-out-of-range", path: "authority.nextIntentCounter" },
    { name: "dealer welcome with a next counter", schema: "authority-message", payload: { ...welcomes.dealer, nextIntentCounter: 1 }, code: "value-out-of-range", path: "authority.nextIntentCounter" },
    { name: "welcome missing its next counter", schema: "authority-message", payload: (({ nextIntentCounter: _next, ...rest }) => rest)(welcomes.player as unknown as Record<string, unknown>), code: "missing-field", path: "authority.nextIntentCounter" },
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
  ];

  const inventories = Object.fromEntries(SCHEMA_INVENTORIES.map((entry) => [entry.name, [...entry.inventory]]));

  return {
    "manifest.json": {
      protocolVersion: PROTOCOL_VERSION,
      manifestId: MANIFEST_ID,
      manifestDigest: manifestDigest(),
      rulesManifest: RULES_MANIFEST,
      // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
      intentIdentity: {
        schema: "long-table-intent-idempotency/v2",
        format: "<server-issued-role-grant-sessionId>:<canonical-decimal-counter>",
        counterMin: INTENT_COUNTER_MIN,
        counterMax: INTENT_COUNTER_MAX,
      },
      // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
      vocabulary: {
        seats: SEATS,
        seatLabels: SEAT_LABELS,
        intentLanes: INTENT_LANES,
        suits: SUITS,
        contractModes: CONTRACT_MODES,
        phases: PHASES,
        roles: ROLES,
        occupants: OCCUPANTS,
        choiceKinds: CHOICE_KINDS,
        selectionTypes: SELECTION_TYPES,
        intentKinds: INTENT_KINDS,
        intentAuthority: INTENT_AUTHORITY,
        hostControls: HOST_CONTROLS,
        hostAnnouncementCues: HOST_ANNOUNCEMENT_CUES,
        outcomes: OUTCOMES,
        rejectionCodes: REJECTION_CODES,
        rejectionMessages: REJECTION_MESSAGES,
        dealerCues: DEALER_CUES,
        wireErrorCodes: WIRE_ERROR_CODES,
      },
      keys: {
        publicCore: PUBLIC_CORE_KEYS,
        playerProjection: PLAYER_PROJECTION.keys,
        hostProjection: HOST_PROJECTION.keys,
        publicProjection: PUBLIC_PROJECTION.keys,
        dealerCueFrame: DEALER_CUE_FRAME.keys,
        intentReceipt: INTENT_RECEIPT.keys,
      },
      inventories,
      limits: LIMITS,
    },
    "player-projection.json": projectionFixture(PLAYER_PROJECTION, player),
    "host-projection.json": projectionFixture(HOST_PROJECTION, host),
    "public-projection.json": projectionFixture(PUBLIC_PROJECTION, pub),
    "dealer-cues.json": { canonical: cues.map((cue) => canonicalJson(DEALER_CUE_FRAME, cue)), frames: cues },
    "receipts.json": Object.fromEntries(Object.entries(receipts).map(([name, receipt]) => [name, projectionFixture(INTENT_RECEIPT, receipt)])),
    "client-messages.json": { canonical: clientMessages.map((message) => canonicalJson(CLIENT_MESSAGE, message)), messages: clientMessages },
    "authority-messages.json": { canonical: authorityMessages.map((message) => canonicalJson(AUTHORITY_MESSAGE, message)), messages: authorityMessages },
    "rejections.json": rejections,
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
    "counterfactual.json": {
      description:
        "Every pair is built from the same public facts. The host and public counterfactual replaces all four hands, the kitty, the discard pile, the seed and the event log; the player counterfactual retains only the entitled south hand and replaces every other concealed input. The concealedSourceDigests prove the inputs really differ before any byte equality is asserted. A correct decoder re-encodes each pair to byte-identical canonical text.",
      concealedSourceDigests: {
        actual: actualDigest,
        allHandsCounterfactual: concealedSourceDigest(allHandsTwin),
        entitledCounterfactual: concealedSourceDigest(entitledTwin),
      },
      entitledHandDigests: {
        actual: fnv1a(JSON.stringify(game.hands.south)),
        entitledCounterfactual: fnv1a(JSON.stringify(entitledTwin.hands.south)),
      },
      host: { actual: buildHostProjection(actualView), counterfactual: buildHostProjection(allHandsView) },
      public: { actual: buildPublicProjection(actualView), counterfactual: buildPublicProjection(allHandsView) },
      player: {
        seat: "south",
        actual: buildPlayerProjection(actualView, "south", EMPTY_UNCOMMITTED, 0, null),
        counterfactual: buildPlayerProjection(entitledView, "south", EMPTY_UNCOMMITTED, 0, null),
      },
    },
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
    "dev-room.json": {
      tableId: TABLE_ID,
      seed,
      host: { participantId: PARTICIPANTS.host, token: TOKENS.host },
      seats: {
        south: { occupant: "human", participantId: PARTICIPANTS.player, token: TOKENS.player, displayName: "Ada" },
        west: { occupant: "ai", participantId: null, token: null, displayName: "" },
        north: { occupant: "ai", participantId: null, token: null, displayName: "" },
        east: { occupant: "ai", participantId: null, token: null, displayName: "" },
      },
      spectators: [{ participantId: PARTICIPANTS.public, token: TOKENS.public }],
      dealers: [{ participantId: PARTICIPANTS.dealer, token: TOKENS.dealer }],
    },
  };
}

function normalize(value: unknown): string {
  return JSON.stringify(value);
}

export function readCommittedFixtures(directory = FIXTURE_DIR): FixtureSet {
  const set: FixtureSet = {};
  for (const name of Object.keys(buildFixturesShape())) {
    const path = join(directory, name);
    set[name] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
  }
  return set;
}

let cachedShape: FixtureSet | null = null;
function buildFixturesShape(): FixtureSet {
  if (!cachedShape) cachedShape = buildFixtures();
  return cachedShape;
}

/** Names of fixture files whose committed content differs from a fresh generation. */
export function staleFixtures(directory = FIXTURE_DIR): string[] {
  const generated = buildFixturesShape();
  const committed = readCommittedFixtures(directory);
  return Object.keys(generated).filter((name) => normalize(generated[name]) !== normalize(committed[name]));
}

export function writeFixtures(directory = FIXTURE_DIR): string[] {
  mkdirSync(directory, { recursive: true });
  const generated = buildFixturesShape();
  const written: string[] = [];
  for (const [name, value] of Object.entries(generated)) {
    writeFileSync(join(directory, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
    written.push(name);
  }
  return written;
}

export async function main(args: string[] = []): Promise<number> {
  if (args.includes("--check")) {
    const stale = staleFixtures();
    if (stale.length > 0) {
      process.stderr.write(`stale fixtures: ${stale.join(", ")}\n`);
      return 1;
    }
    process.stdout.write(`fixtures/protocol: ${Object.keys(buildFixturesShape()).length} files current\n`);
    return 0;
  }
  const written = writeFixtures();
  process.stdout.write(`wrote ${written.length} fixtures to ${FIXTURE_DIR}\n`);
  // Sanity: every client example must decode through the closed schema.
  for (const text of (buildFixturesShape()["client-messages.json"] as { canonical: string[] }).canonical) {
    const decoded = decodeClientMessage(text);
    if (!decoded.ok) throw new Error(`client example rejected: ${decoded.rejection.code} at ${decoded.rejection.path}`);
  }
  return 0;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
