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

import { RULES_MANIFEST, SEATS, manifestDigest, type Card, type GameState } from "../../packages/rules-core/src";
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
  INTENT_KINDS,
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
  type IntentReceipt,
  type Role,
  type Seat,
  type TableIntent,
} from "../../packages/protocol/src";
import { AuthoritySessions, staticDirectory, type Outbound } from "../../services/table-authority/src/session";
import { buildHostProjection, buildPublicProjection, type TableView } from "../../services/table-authority/src/projections";
import { TableAuthority } from "../../services/table-authority/src/table";
import { handleText } from "../../services/table-authority/src/wire";

export const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "protocol");

const TABLE_ID = "table-fixture-1";
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

function concealedCounterfactual(game: GameState): GameState {
  const variant = structuredClone(game);
  variant.seed = "counterfactual-seed";
  SEATS.filter((seat) => seat !== "south").forEach((seat) => {
    variant.hands[seat] = replacementCards(seat, variant.hands[seat].length);
  });
  variant.kitty = replacementCards("kitty", variant.kitty.length);
  variant.discardPile = replacementCards("discard", variant.discardPile.length);
  variant.events = [{ id: 1, text: "private host record" }];
  return variant;
}

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

function sendIntent(drive: Drive, connectionId: Role, intent: TableIntent, overrides: { intentId?: string; expectedVersion?: number } = {}): IntentReceipt {
  drive.intentCounter += 1;
  const out = send(drive, connectionId, {
    type: "intent",
    tableId: TABLE_ID,
    intentId: overrides.intentId ?? `fixture-intent-${drive.intentCounter}`,
    expectedVersion: overrides.expectedVersion ?? drive.table.currentVersion,
    intent,
  });
  const receipt = out.find((item) => item.connectionId === connectionId && item.message.type === "receipt")?.message;
  if (!receipt || receipt.type !== "receipt") throw new Error("no receipt returned");
  return receipt.receipt;
}

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
  receipts.acceptedPreview = sendIntent(drive, "player", southChoice(drive, "bid").intent, { intentId: "fixture-preview-1" });
  receipts.duplicate = sendIntent(drive, "player", southChoice(drive, "bid").intent, { intentId: "fixture-preview-1" });
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
  const counterfactualView: TableView = { ...actualView, game: concealedCounterfactual(game) };

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
  ).map((intent, index) => ({ type: "intent", tableId: TABLE_ID, intentId: `example-${index + 1}`, expectedVersion: 12, intent }));

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
  ];

  const inventories = Object.fromEntries(SCHEMA_INVENTORIES.map((entry) => [entry.name, [...entry.inventory]]));

  return {
    "manifest.json": {
      protocolVersion: PROTOCOL_VERSION,
      manifestId: MANIFEST_ID,
      manifestDigest: manifestDigest(),
      rulesManifest: RULES_MANIFEST,
      vocabulary: {
        seats: SEATS,
        seatLabels: SEAT_LABELS,
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
    "counterfactual.json": {
      description:
        "Both pairs are built from the same public facts; the counterfactual replaces every concealed card, the kitty, the discard pile, the seed and the event log. A correct decoder re-encodes each pair to byte-identical canonical text.",
      host: { actual: buildHostProjection(actualView), counterfactual: buildHostProjection(counterfactualView) },
      public: { actual: buildPublicProjection(actualView), counterfactual: buildPublicProjection(counterfactualView) },
    },
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
