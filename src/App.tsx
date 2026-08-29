import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALPHA_EXCLUSION_NOTICE,
  MANIFEST_DISABLED_NOTICES,
  MANIFEST_ID,
  SUITS,
  legalBids,
  legalCards,
  legalHumanActions,
  newTable,
  togglePause,
  type Bid,
  type Card,
  type ContractMode,
  type GameState,
  type Seat,
} from "./game";
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
import { BUILD_LABEL, BUILD_SHORT_SHA } from "./build-identity";
import type { TableInputSource, TableIntent } from "./table/intent";
import {
  DISCARD_PICK_TARGET,
  createInteractionState,
  dispatchTableInput,
  type TableInteractionState,
} from "./table/interaction";
import { cardRankText } from "./table/labels";
import { buildXrTableProjection } from "./table/projection";
import { readPageCalibration, type XrCalibration } from "./xr/calibration";
import { lifecycleMessageOf } from "./xr/lifecycle";
import { XR_DEALER_LABEL } from "./xr/targets";
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
import {
  queryImmersiveVrSupport,
  startImmersiveTable,
  type XrSessionHandle,
  type XrSupport,
} from "./xr/session";

const INTERNAL_TABLE_SEED = "long-table-001";
const INVITE_CODE = "LT-7K2M";
const MAX_SELECTABLE_BID_LEVEL = 6;
const EXCLUSION_NOTICE_ID = "alpha-exclusion-notice";

type HostMode = "ai-dealer" | "human-host";
type Drawer = "host" | "a11y" | null;

interface AccessibilityPrefs {
  highContrast: boolean;
  reducedMotion: boolean;
  largeCards: boolean;
  captions: boolean;
  effectsOff: boolean;
  musicOff: boolean;
  oneClickPlay: boolean;
}

const MODE_LABELS: Record<ContractMode, string> = {
  high: "High",
  low: "Low",
  "no-trump-high": "No Trump High",
  "no-trump-low": "No Trump Low",
};

const SEAT_LABELS: Record<Seat, string> = {
  south: "South (You)",
  west: "West",
  north: "North",
  east: "East",
};

function bidLabel(bid: Bid): string {
  return `${bid.level} ${MODE_LABELS[bid.mode]}`;
}

function isRedSuit(card: Card): boolean {
  return card.suit === "hearts" || card.suit === "diamonds";
}

function formatContract(state: GameState): string {
  if (!state.contract) return "No contract yet";
  const trump =
    state.contract.trump && !state.contract.mode.startsWith("no-trump")
      ? ` · ${state.contract.trump}`
      : "";
  return `${state.contract.level} ${MODE_LABELS[state.contract.mode]}${trump}`;
}

function betweenHands(state: GameState | null): boolean {
  return !state || state.phase === "summary";
}

function canRequestPause(state: GameState | null): boolean {
  return Boolean(state && state.phase === "summary" && !state.paused);
}

function calibrationSummary(calibration: XrCalibration): string {
  return `Seated calibration: table ${Math.round(calibration.heightMeters * 100)} cm high, ${Math.round(
    calibration.distanceMeters * 100,
  )} cm forward. Held for this page, not just this session.`;
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [hostMode, setHostMode] = useState<HostMode | null>(null);
  // [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
  // The desktop surface holds the same interaction state the XR room drives.
  // Preview, discard picks, and idempotent input ids live in one place.
  const [table, setTable] = useState<TableInteractionState | null>(null);
  const inputCounter = useRef(0);
  const [calibration, setCalibration] = useState<XrCalibration>(() => readPageCalibration());
  // [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [tableMuted, setTableMuted] = useState(false);
  const [reconnectStatus, setReconnectStatus] = useState<"connected" | "reconnecting">("connected");
  const [a11y, setA11y] = useState<AccessibilityPrefs>({
    highContrast: false,
    reducedMotion: false,
    largeCards: false,
    captions: false,
    effectsOff: false,
    musicOff: true,
    oneClickPlay: false,
  });
  const [caption, setCaption] = useState("");
  const [hostNotice, setHostNotice] = useState<string | null>(null);
  const [blockedWest, setBlockedWest] = useState(false);
  const [simulatedRemovedSeat, setSimulatedRemovedSeat] = useState<Seat | null>(null);
  const [aiSubstituteSeat, setAiSubstituteSeat] = useState<Seat | null>(null);
  const [aiSubstituted, setAiSubstituted] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [xrSupport, setXrSupport] = useState<XrSupport>("checking");
  const [xrActive, setXrActive] = useState(false);
  const [xrMessage, setXrMessage] = useState("Checking for immersive WebXR support.");
  const shellRef = useRef<HTMLDivElement>(null);
  const xrSessionRef = useRef<XrSessionHandle | null>(null);

  const game = table?.game ?? null;
  const cardScale = a11y.largeCards ? 1.28 : 1;

  // [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
  /**
   * The single semantic port. Every desktop control and every XR controller
   * select becomes one typed envelope with a fresh idempotency key, so a
   * double-fired click or a repeated controller event can never commit twice.
   */
  const dispatch = useCallback((intent: TableIntent, source: TableInputSource = "desktop") => {
    inputCounter.current += 1;
    const inputId = `${source}:${inputCounter.current}`;
    setTable((current) =>
      current ? dispatchTableInput(current, { inputId, source, intent }).state : current,
    );
  }, []);

  const projection = useMemo(
    () =>
      table
        ? buildXrTableProjection(table, {
            manifestId: MANIFEST_ID,
            buildShortSha: BUILD_SHORT_SHA,
          })
        : null,
    [table],
  );
  const projectionRef = useRef(projection);
  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);
  // [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]

  const resetTableSession = useCallback(() => {
    setStarted(false);
    setTable(null);
    setDrawer(null);
    setTableMuted(false);
    setReconnectStatus("connected");
    setAiSubstituted(false);
    setHostNotice(null);
    setBlockedWest(false);
    setSimulatedRemovedSeat(null);
    setAiSubstituteSeat(null);
    setCaption("");
  }, []);

  const startTable = useCallback(() => {
    if (!hostMode) return;
    const initial = newTable(INTERNAL_TABLE_SEED);
    setTable(createInteractionState(initial));
    setStarted(true);
    setHostNotice(null);
    setBlockedWest(false);
    setSimulatedRemovedSeat(null);
    setAiSubstituteSeat(null);
    setCaption(`Hand ${initial.handNumber} begins. ${SEAT_LABELS[initial.turn]} to act.`);
  }, [hostMode]);

  const handleNextHand = useCallback(() => {
    dispatch({ kind: "next-hand" });
    setAiSubstituted(false);
    setSimulatedRemovedSeat(null);
  }, [dispatch]);

  const selectableBids = useMemo(() => {
    if (!game) return [];
    return legalBids(game).filter((bid) => bid.level <= MAX_SELECTABLE_BID_LEVEL);
  }, [game]);

  const southLegalCards = useMemo(() => {
    if (!game || game.phase !== "play" || game.turn !== "south") return [];
    return legalCards(game, "south");
  }, [game]);

  const canAct = Boolean(game && game.turn === "south" && !game.paused);

  useEffect(() => {
    if (!game || !a11y.captions) return;
    setCaption(game.status);
  }, [game, a11y.captions]);

  useEffect(() => {
    if (a11y.reducedMotion || a11y.effectsOff) {
      setParallax({ x: 0, y: 0 });
    }
  }, [a11y.reducedMotion, a11y.effectsOff]);

  useEffect(() => {
    let cancelled = false;
    void queryImmersiveVrSupport().then((support) => {
      if (cancelled) return;
      setXrSupport(support);
      setXrMessage(
        support === "supported"
          ? "Immersive WebXR is available here. The room shares this table's preview, Cancel, and Confirm path."
          : "Immersive WebXR is unavailable here. Use a compatible WebXR browser for the seated room.",
      );
    });
    return () => {
      cancelled = true;
      if (xrSessionRef.current) void xrSessionRef.current.end();
    };
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (a11y.reducedMotion || a11y.effectsOff || !shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x: nx * 6, y: ny * 6 });
    },
    [a11y.reducedMotion, a11y.effectsOff],
  );

  const selectCard = (card: Card) => {
    if (!game || game.turn !== "south") return;
    if (game.phase === "kitty") {
      dispatch({ kind: "toggle-discard", cardId: card.id });
      return;
    }
    if (game.phase !== "play") return;
    dispatch({ kind: "preview", selection: { type: "play", cardId: card.id } });
    // One-click play still travels the shared path; it simply confirms at once.
    if (a11y.oneClickPlay) dispatch({ kind: "confirm" });
  };

  const handlePause = () => {
    if (!canRequestPause(game)) return;
    setTable((current) => (current ? { ...current, game: togglePause(current.game) } : current));
  };

  const handleResume = () => {
    setTable((current) => (current ? { ...current, game: togglePause(current.game) } : current));
  };

  const handleBlock = () => {
    setBlockedWest(true);
    setHostNotice(
      "West marked as blocked in this local prototype. This marker changes no game state and sends nothing externally.",
    );
  };

  const handleReport = () => {
    setHostNotice("Report recorded locally only. It was NOT filed or sent externally.");
  };

  const handleRemovePlayer = () => {
    if (!betweenHands(game) || !game) return;
    setSimulatedRemovedSeat("west");
    setHostNotice(
      "West marked for between-hand removal (simulated). Cards, bids, tricks, and score are unchanged.",
    );
  };

  const handleAiSubstitution = () => {
    if (!betweenHands(game)) return;
    if (simulatedRemovedSeat) {
      setAiSubstituteSeat(simulatedRemovedSeat);
      setHostNotice(
        `${SEAT_LABELS[simulatedRemovedSeat]} AI substitute ready for the next hand (simulated). Game state unchanged.`,
      );
      return;
    }
    setAiSubstituted(true);
    setCaption("Between-hand AI substitution enabled for the next seated player.");
  };

  const handleEnterXr = async () => {
    if (!shellRef.current || !hostMode || xrSupport !== "supported" || xrActive) return;
    if (!projectionRef.current) return;
    try {
      setXrMessage("Opening the seated WebXR room.");
      xrSessionRef.current = await startImmersiveTable({
        overlayRoot: shellRef.current,
        dealerMode: hostMode,
        getProjection: () => projectionRef.current!,
        onTableIntent: (intent) => dispatch(intent, "xr"),
        onCalibration: (next) => setCalibration(next),
        onEnded: () => {
          xrSessionRef.current = null;
          setXrActive(false);
          setXrMessage("WebXR room ended. The table session is still active.");
        },
      });
      setXrActive(true);
      setXrMessage(
        "WebXR room active. Controller ray select drives the same preview, Cancel, and Confirm path as this table. No physical-headset verification is claimed here.",
      );
    } catch (error) {
      setXrActive(false);
      // Closed lifecycle vocabulary: no raw device or browser text is shown.
      setXrMessage(lifecycleMessageOf(error));
    }
  };

  const addAiDisabled =
    !betweenHands(game) ||
    Boolean(aiSubstituteSeat) ||
    (simulatedRemovedSeat ? aiSubstituteSeat === simulatedRemovedSeat : aiSubstituted);

  const shellClass = [
    "app-shell",
    a11y.highContrast ? "high-contrast" : "",
    a11y.reducedMotion ? "reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!started) {
    return (
      <div className={shellClass} ref={shellRef}>
        <div className="room-layer">
          <div className="room-vignette" />
          <div className="room-back-wall" />
          <div className="table-surface">
            <div className="table-rail" />
          </div>
        </div>
        <div className="setup-screen">
          <div className="setup-panel panel">
            <h1>THE LONG TABLE</h1>
            <p className="subtitle">Seated four-place Bid Whist · working browser prototype</p>
            <p className="manifest-notice" role="note">
              {MANIFEST_ID} working draft — not a frozen rules manifest. Levels 3–6 in High or Low
              only. Level 7 and No Trump: {ALPHA_EXCLUSION_NOTICE}
            </p>
            <p className="build-identity" role="note">
              {BUILD_LABEL}
            </p>
            <div className="mode-choice" role="group" aria-label="Table authority mode">
              <button
                type="button"
                className={hostMode === "ai-dealer" ? "selected" : ""}
                aria-pressed={hostMode === "ai-dealer"}
                onClick={() => setHostMode("ai-dealer")}
              >
                AI Dealer
              </button>
              <button
                type="button"
                className={hostMode === "human-host" ? "selected" : ""}
                aria-pressed={hostMode === "human-host"}
                onClick={() => setHostMode("human-host")}
              >
                Human Host
              </button>
            </div>
            {hostMode && (
              <div className="authority-box">
                {hostMode === "ai-dealer" ? (
                  <>
                    <strong>{XR_DEALER_LABEL}</strong> announces, teaches, and paces the table. The
                    rules engine alone owns shuffle, deal, legality, tricks, and score. The dealer
                    never sees concealed hands.
                  </>
                ) : (
                  <>
                    <strong>Human Host</strong> manages invite simulation, mute, between-hand pause, and
                    AI substitution. The host cannot inspect hands, alter cards, bids, tricks, score, force
                    play, or void a committed hand. Every host control is a local, non-network demo.
                  </>
                )}
              </div>
            )}
            <p className="authority-box">
              Music defaults <strong>Off</strong>. No music path ships in this prototype: no bundled
              recordings, no player, and no playback controls. Host playback remains external,
              private-room, unrecorded, and rights-dependent.
            </p>
            <button type="button" className="primary" disabled={!hostMode} onClick={startTable}>
              Enter the table
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!table || !game) return null;

  const showRobot = hostMode === "ai-dealer";
  const handPaused = game.paused;
  const isSouthAuction = game.phase === "auction" && canAct;
  const isSouthDeclaration = game.phase === "declaration" && canAct;
  const isSouthKitty = game.phase === "kitty" && canAct;
  const isSouthPlay = game.phase === "play" && canAct;
  const isSummary = game.phase === "summary";
  const discardIds = table.discardIds;
  const preview = table.preview;
  const feedback =
    table.lastReceipt && table.lastReceipt.outcome !== "accepted" ? table.lastReceipt.message : null;
  const confirmReady =
    canAct &&
    !isSummary &&
    (isSouthKitty ? discardIds.length === DISCARD_PICK_TARGET : Boolean(preview));
  const cancelReady = Boolean(preview) || discardIds.length > 0;
  const showActionRail = isSouthAuction || isSouthDeclaration || isSouthKitty || isSouthPlay;

  return (
    <div
      className={shellClass}
      ref={shellRef}
      onPointerMove={onPointerMove}
      style={
        {
          "--card-scale": cardScale,
          "--parallax-x": `${parallax.x}px`,
          "--parallax-y": `${parallax.y}px`,
        } as React.CSSProperties
      }
    >
      <div className="room-layer" aria-hidden="true">
        <div className="room-vignette" />
        <div className="room-back-wall" />
        <div className="table-surface">
          <div className="table-rail" />
          <div className="trick-center" aria-label="Current trick">
            {game.currentTrick.map((played) => (
              <PlayingCardView key={`${played.seat}-${played.card.id}`} card={played.card} />
            ))}
          </div>
        </div>
        {(["north", "west", "east"] as Seat[]).map((seat) => (
          <OpponentSeat
            key={seat}
            seat={seat}
            count={game.hands[seat].length}
            removed={simulatedRemovedSeat === seat && aiSubstituteSeat !== seat}
            blocked={seat === "west" && blockedWest}
            aiSubstitute={aiSubstituteSeat === seat}
          />
        ))}
        {showRobot && (
          <div className="robot-dealer" aria-label={`${XR_DEALER_LABEL} robot`}>
            <div className="robot-head" />
            <span>{XR_DEALER_LABEL}</span>
          </div>
        )}
      </div>

      <aside className="score-rail panel" aria-label="Score and contract">
        <h1>THE LONG TABLE</h1>
        <div className="manifest-tag">{MANIFEST_ID} working draft</div>
        <div className="team-line">
          <span>North &amp; South</span>
          <span>{game.scores["north-south"]}</span>
        </div>
        <div className="team-line">
          <span>East &amp; West</span>
          <span>{game.scores["east-west"]}</span>
        </div>
        <div className="team-line">
          <span>Hand</span>
          <span>{game.handNumber}</span>
        </div>
        <div className="team-line">
          <span>Dealer</span>
          <span>{SEAT_LABELS[game.dealer]}</span>
        </div>
        <div className="team-line">
          <span>Contract</span>
          <span>{formatContract(game)}</span>
        </div>
        <div className="team-line">
          <span>Books</span>
          <span>
            NS {game.tricksWon.south + game.tricksWon.north} · EW{" "}
            {game.tricksWon.east + game.tricksWon.west}
          </span>
        </div>
        <div className="team-line">
          <span>Build</span>
          <span>{BUILD_SHORT_SHA}</span>
        </div>
      </aside>

      <div className="turn-banner panel" role="status" aria-live="polite">
        {handPaused ? "Table paused" : game.turn === "south" ? "Your turn" : `${SEAT_LABELS[game.turn]} turn`}
        {" · "}
        {game.phase}
        {tableMuted ? " · Muted" : ""}
        {aiSubstituted || aiSubstituteSeat ? " · AI seat ready" : ""}
        {blockedWest ? " · West blocked locally" : ""}
      </div>

      <div className="status-live" role="status" aria-live="polite" aria-atomic="true">
        {game.status}
      </div>

      {a11y.captions && caption && <div className="caption-bar">{caption}</div>}

      <button
        type="button"
        className="host-trigger"
        aria-expanded={drawer === "host"}
        onClick={() => setDrawer(drawer === "host" ? null : "host")}
      >
        Host
      </button>
      <button
        type="button"
        className="a11y-trigger"
        aria-expanded={drawer === "a11y"}
        onClick={() => setDrawer(drawer === "a11y" ? null : "a11y")}
      >
        Accessibility
      </button>
      <button
        type="button"
        className="xr-trigger"
        disabled={xrSupport !== "supported" || xrActive}
        aria-describedby="xr-status"
        onClick={() => void handleEnterXr()}
      >
        {xrActive ? "WebXR room active" : xrSupport === "checking" ? "Checking WebXR" : "Enter WebXR room"}
      </button>
      <p id="xr-status" className="xr-status" role="status">
        {xrMessage} {calibrationSummary(calibration)}
      </p>

      {drawer === "host" && (
        <HostDrawer
          hostMode={hostMode}
          muted={tableMuted}
          paused={handPaused}
          reconnectStatus={reconnectStatus}
          betweenHands={betweenHands(game)}
          inHand={!betweenHands(game)}
          canRequestPause={canRequestPause(game)}
          hostNotice={hostNotice}
          addAiDisabled={addAiDisabled}
          musicOff={a11y.musicOff}
          onClose={() => setDrawer(null)}
          onMute={() => setTableMuted((value) => !value)}
          onPause={handlePause}
          onResume={handleResume}
          onSubstitute={handleAiSubstitution}
          onReconnect={() =>
            setReconnectStatus((status) => (status === "connected" ? "reconnecting" : "connected"))
          }
          onBlock={handleBlock}
          onReport={handleReport}
          onLeave={resetTableSession}
          onRemovePlayer={handleRemovePlayer}
        />
      )}

      {drawer === "a11y" && (
        <AccessibilityDrawer
          prefs={a11y}
          onClose={() => setDrawer(null)}
          onChange={(patch) => setA11y((current) => ({ ...current, ...patch }))}
        />
      )}

      {isSummary && game.summary && (
        <div className="summary-panel panel" role="region" aria-label="Hand summary">
          <p>{game.summary}</p>
          <button type="button" className="primary" onClick={handleNextHand}>
            Next hand
          </button>
        </div>
      )}

      {showActionRail && (
        <div className="action-rail panel">
          {isSouthAuction && (
            <>
              <div className="bid-grid" role="group" aria-label="Your bid">
                {legalHumanActions(game).some((action) => action.type === "pass") && (
                  <button
                    type="button"
                    className={preview?.selection.type === "pass" ? "primary" : ""}
                    onClick={() => dispatch({ kind: "preview", selection: { type: "pass" } })}
                  >
                    Pass
                  </button>
                )}
                {selectableBids.map((bid) => (
                  <button
                    key={`${bid.level}-${bid.mode}`}
                    type="button"
                    className={
                      preview?.selection.type === "bid" &&
                      preview.selection.bid.level === bid.level &&
                      preview.selection.bid.mode === bid.mode
                        ? "primary"
                        : ""
                    }
                    onClick={() => dispatch({ kind: "preview", selection: { type: "bid", bid } })}
                  >
                    {bidLabel(bid)}
                  </button>
                ))}
              </div>
              {/*
                Withheld Alpha 0.1 contracts stay visible and permanently
                disabled, each carrying the one published explanation.
              */}
              <div className="bid-grid withheld" role="group" aria-label="Withheld contracts">
                {MANIFEST_DISABLED_NOTICES.map((notice) => (
                  <button
                    key={notice.id}
                    type="button"
                    disabled
                    aria-describedby={EXCLUSION_NOTICE_ID}
                  >
                    {notice.label}
                  </button>
                ))}
              </div>
              <p id={EXCLUSION_NOTICE_ID} className="control-hint">
                {ALPHA_EXCLUSION_NOTICE}
              </p>
            </>
          )}

          {isSouthDeclaration && (
            <div className="bid-grid" role="group" aria-label="Declare trump">
              {SUITS.map((trump) => (
                <button
                  key={trump}
                  type="button"
                  className={
                    preview?.selection.type === "declaration" && preview.selection.trump === trump
                      ? "primary"
                      : ""
                  }
                  onClick={() =>
                    dispatch({ kind: "preview", selection: { type: "declaration", trump } })
                  }
                >
                  {trump}
                </button>
              ))}
            </div>
          )}

          {isSouthKitty && (
            <span>
              Select {DISCARD_PICK_TARGET} cards to discard ({discardIds.length}/
              {DISCARD_PICK_TARGET})
            </span>
          )}

          {isSouthPlay && a11y.oneClickPlay && (
            <span>One-click play: tap a legal card to commit</span>
          )}

          <span className="preview-line">Preview: {preview ? preview.label : "none"}</span>
          <button type="button" disabled={!cancelReady} onClick={() => dispatch({ kind: "cancel" })}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={!confirmReady}
            onClick={() => dispatch({ kind: "confirm" })}
          >
            Confirm
          </button>
        </div>
      )}

      {feedback && (
        <p className="table-feedback" role="status">
          {feedback}
        </p>
      )}

      {game.turn === "south" && (game.phase === "play" || game.phase === "kitty") && (
        <div className="player-hand" role="group" aria-label="Your hand">
          {game.hands.south.map((card) => {
            const legal =
              game.phase === "play"
                ? southLegalCards.some((candidate) => candidate.id === card.id)
                : true;
            const selected =
              game.phase === "kitty"
                ? discardIds.includes(card.id)
                : preview?.selection.type === "play" && preview.selection.cardId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                className={[
                  "playing-card",
                  isRedSuit(card) ? "red" : "",
                  card.suit === "joker" ? "joker" : "",
                  game.phase === "play" ? "selectable" : "",
                  game.phase === "play" && !legal ? "illegal" : "",
                  selected ? (game.phase === "kitty" ? "discard-pick" : "selected") : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={card.label}
                disabled={game.phase === "play" && !legal}
                onClick={() => selectCard(card)}
              >
                <span className="rank">{cardRankText(card)}</span>
                <span className="suit" aria-hidden="true">
                  {card.glyph}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayingCardView({ card }: { card: Card }) {
  return (
    <div
      className={["playing-card", "trick-card", isRedSuit(card) ? "red" : "", card.suit === "joker" ? "joker" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label={card.label}
    >
      <span className="rank">{cardRankText(card)}</span>
      <span className="suit" aria-hidden="true">
        {card.glyph}
      </span>
    </div>
  );
}

function OpponentSeat({
  seat,
  count,
  removed,
  blocked,
  aiSubstitute,
}: {
  seat: Seat;
  count: number;
  removed?: boolean;
  blocked?: boolean;
  aiSubstitute?: boolean;
}) {
  const position = seat === "north" ? "seat-north" : seat === "west" ? "seat-west" : "seat-east";
  const statusSuffix = aiSubstitute
    ? " AI substitute ready for next hand"
    : blocked
      ? " blocked locally"
      : removed
        ? " marked for between-hand removal"
        : "";
  return (
    <div
      className={[
        "seat-anchor",
        position,
        removed ? "seat-removed" : "",
        blocked ? "seat-blocked" : "",
        aiSubstitute ? "seat-ai-substitute" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${SEAT_LABELS[seat]} open avatar anchor${statusSuffix}`}
    >
      <span>{SEAT_LABELS[seat]}</span>
      {blocked && <span className="seat-status">Blocked locally</span>}
      {aiSubstitute && <span className="seat-status">AI substitute</span>}
      <div className="opponent-stack" aria-hidden="true">
        {Array.from({ length: Math.min(count, 4) }).map((_, index) => (
          <div key={index} className="card-back" />
        ))}
      </div>
      <span className="card-back-count">{count} cards</span>
    </div>
  );
}

function HostDrawer({
  hostMode,
  muted,
  paused,
  reconnectStatus,
  betweenHands,
  inHand,
  canRequestPause,
  hostNotice,
  addAiDisabled,
  musicOff,
  onClose,
  onMute,
  onPause,
  onResume,
  onSubstitute,
  onReconnect,
  onBlock,
  onReport,
  onLeave,
  onRemovePlayer,
}: {
  hostMode: HostMode | null;
  muted: boolean;
  paused: boolean;
  reconnectStatus: "connected" | "reconnecting";
  betweenHands: boolean;
  inHand: boolean;
  canRequestPause: boolean;
  hostNotice: string | null;
  addAiDisabled: boolean;
  musicOff: boolean;
  onClose: () => void;
  onMute: () => void;
  onPause: () => void;
  onResume: () => void;
  onSubstitute: () => void;
  onReconnect: () => void;
  onBlock: () => void;
  onReport: () => void;
  onLeave: () => void;
  onRemovePlayer: () => void;
}) {
  const [pendingRemove, setPendingRemove] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(false);
  const pauseHintId = "pause-between-hands-hint";

  useEffect(() => {
    if (!betweenHands) setPendingRemove(false);
  }, [betweenHands]);

  const requestLeave = () => {
    if (inHand) {
      setPendingLeave(true);
      return;
    }
    onLeave();
  };

  return (
    <aside className="drawer panel open" aria-label="Host controls">
      <h2>Host</h2>
      <section>
        <p>
          Mode: <strong>{hostMode === "human-host" ? "Human Host" : "AI Dealer presentation"}</strong>
        </p>
        <p className="invite-code" aria-label="Invite code">
          Invite: {INVITE_CODE}
        </p>
        <p>Private invite simulation only — no network delivery in this prototype.</p>
      </section>
      <section>
        <div className="control-row">
          <button type="button" className={muted ? "toggle-on" : ""} onClick={onMute}>
            {muted ? "Unmute table" : "Mute"}
          </button>
          {paused ? (
            <button type="button" className="primary" onClick={onResume}>
              Resume
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onPause}
                disabled={!canRequestPause}
                aria-describedby={!canRequestPause ? pauseHintId : undefined}
              >
                Pause Between Hands
              </button>
              {!canRequestPause && (
                <p id={pauseHintId} className="control-hint">
                  Pause Between Hands becomes available only after the hand summary.
                </p>
              )}
            </>
          )}
          <button type="button" onClick={onSubstitute} disabled={addAiDisabled}>
            Add AI
          </button>
        </div>
        <p>Reconnect: {reconnectStatus === "connected" ? "Connected" : "Reconnecting…"}</p>
        <button type="button" onClick={onReconnect}>
          Simulate reconnect
        </button>
      </section>
      <section>
        <div className="control-row">
          <button type="button" onClick={onBlock}>
            Block
          </button>
          <button type="button" onClick={onReport}>
            Report
          </button>
          {!pendingLeave ? (
            <button type="button" onClick={requestLeave}>
              Leave
            </button>
          ) : (
            <>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  onLeave();
                  setPendingLeave(false);
                }}
              >
                Confirm leave
              </button>
              <button type="button" onClick={() => setPendingLeave(false)}>
                Cancel
              </button>
            </>
          )}
          {!pendingRemove ? (
            <button type="button" onClick={() => setPendingRemove(true)} disabled={!betweenHands}>
              Remove player
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => { onRemovePlayer(); setPendingRemove(false); }}>
              Confirm removal
            </button>
          )}
        </div>
        {hostNotice && (
          <p className="host-notice" role="status">
            {hostNotice}
          </p>
        )}
        <p>Block, leave, report, and constrained remove are simulated locally. Remove is only available between hands.</p>
      </section>
      <section>
        <p>
          Music: <strong>{musicOff ? "Off" : "Off (default)"}</strong>
        </p>
        <p>
          Host playback stays external, private-room, unrecorded, and rights-dependent. No upload, cache,
          stream, or recording controls are provided.
        </p>
      </section>
      <section>
        <p className="denied-list">
          <strong>Host cannot:</strong> inspect hands, alter cards/bids/tricks/score, force play, or void a
          committed hand.
        </p>
      </section>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </aside>
  );
}

function AccessibilityDrawer({
  prefs,
  onClose,
  onChange,
}: {
  prefs: AccessibilityPrefs;
  onClose: () => void;
  onChange: (patch: Partial<AccessibilityPrefs>) => void;
}) {
  return (
    <aside className="drawer panel open" aria-label="Accessibility controls">
      <h2>Accessibility</h2>
      <div className="control-row">
        <button
          type="button"
          className={prefs.highContrast ? "toggle-on" : ""}
          aria-pressed={prefs.highContrast}
          onClick={() => onChange({ highContrast: !prefs.highContrast })}
        >
          High contrast
        </button>
        <button
          type="button"
          className={prefs.reducedMotion ? "toggle-on" : ""}
          aria-pressed={prefs.reducedMotion}
          onClick={() => onChange({ reducedMotion: !prefs.reducedMotion })}
        >
          Reduced motion
        </button>
        <button
          type="button"
          className={prefs.largeCards ? "toggle-on" : ""}
          aria-pressed={prefs.largeCards}
          onClick={() => onChange({ largeCards: !prefs.largeCards })}
        >
          Large cards
        </button>
        <button
          type="button"
          className={prefs.captions ? "toggle-on" : ""}
          aria-pressed={prefs.captions}
          onClick={() => onChange({ captions: !prefs.captions })}
        >
          Captions
        </button>
        <button
          type="button"
          className={prefs.effectsOff ? "toggle-on" : ""}
          aria-pressed={prefs.effectsOff}
          onClick={() => onChange({ effectsOff: !prefs.effectsOff })}
        >
          Effects Off
        </button>
        <button type="button" className="toggle-on" aria-pressed={prefs.musicOff} disabled>
          Music Off
        </button>
        <button
          type="button"
          className={prefs.oneClickPlay ? "toggle-on" : ""}
          aria-pressed={prefs.oneClickPlay}
          onClick={() => onChange({ oneClickPlay: !prefs.oneClickPlay })}
        >
          One-click play
        </button>
      </div>
      <p>Keyboard focus reaches every control. Suits use rank labels and glyphs, not color alone.</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </aside>
  );
}
