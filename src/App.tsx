import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MANIFEST_ID,
  SUITS,
  applyHumanAction,
  applyHumanDiscard,
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
  type Suit,
} from "./game";
import {
  queryImmersiveVrSupport,
  startImmersiveTable,
  type XrSessionHandle,
  type XrSupport,
} from "./xr/session";

const INTERNAL_TABLE_SEED = "long-table-001";
const INVITE_CODE = "LT-7K2M";
const MAX_SELECTABLE_BID_LEVEL = 6;

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

interface PendingBid {
  bid: Bid;
}

interface PendingPlay {
  cardId: string;
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

export default function App() {
  const [started, setStarted] = useState(false);
  const [hostMode, setHostMode] = useState<HostMode | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [pendingBid, setPendingBid] = useState<PendingBid | null>(null);
  const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
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

  const cardScale = a11y.largeCards ? 1.28 : 1;

  const applyAction = useCallback((action: Parameters<typeof applyHumanAction>[1]) => {
    setGame((current) => {
      if (!current) return current;
      const result = applyHumanAction(current, action);
      if (result.error) return current;
      return result.state;
    });
    setPendingBid(null);
    setPendingPlay(null);
  }, []);

  const resetTableSession = useCallback(() => {
    setStarted(false);
    setGame(null);
    setDiscardIds([]);
    setPendingBid(null);
    setPendingPlay(null);
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
    setGame(initial);
    setStarted(true);
    setDiscardIds([]);
    setPendingBid(null);
    setPendingPlay(null);
    setHostNotice(null);
    setBlockedWest(false);
    setSimulatedRemovedSeat(null);
    setAiSubstituteSeat(null);
    setCaption(`Hand ${initial.handNumber} begins. ${SEAT_LABELS[initial.turn]} to act.`);
  }, [hostMode]);

  const handleNextHand = useCallback(() => {
    setGame((current) => {
      if (!current || current.phase !== "summary") return current;
      const result = applyHumanAction(current, { type: "next-hand" });
      return result.state;
    });
    setDiscardIds([]);
    setPendingBid(null);
    setPendingPlay(null);
    setAiSubstituted(false);
    setSimulatedRemovedSeat(null);
  }, []);

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
          ? "Quest/WebXR room preview is available. Gameplay remains on the accessible table surface."
          : "Immersive WebXR is unavailable here. Use a compatible Quest browser for the spatial room preview.",
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

  const toggleDiscard = (cardId: string) => {
    setDiscardIds((current) => {
      if (current.includes(cardId)) return current.filter((id) => id !== cardId);
      if (current.length >= 6) return current;
      return [...current, cardId];
    });
  };

  const confirmDiscard = () => {
    if (!game || discardIds.length !== 6) return;
    setGame((current) => {
      if (!current) return current;
      const result = applyHumanDiscard(current, discardIds);
      if (result.error) return current;
      return result.state;
    });
    setDiscardIds([]);
  };

  const selectCard = (card: Card) => {
    if (!game || game.turn !== "south" || game.phase !== "play") return;
    const legal = southLegalCards.some((candidate) => candidate.id === card.id);
    if (!legal) return;
    if (a11y.oneClickPlay) {
      applyAction({ type: "play", cardId: card.id });
      return;
    }
    setPendingPlay({ cardId: card.id });
  };

  const confirmBid = () => {
    if (!pendingBid) return;
    applyAction({ type: "bid", bid: pendingBid.bid });
  };

  const confirmPlay = () => {
    if (!pendingPlay) return;
    applyAction({ type: "play", cardId: pendingPlay.cardId });
  };

  const handlePause = () => {
    if (!canRequestPause(game)) return;
    setGame((current) => (current ? togglePause(current) : current));
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
    try {
      setXrMessage("Opening the seated WebXR room preview.");
      xrSessionRef.current = await startImmersiveTable(shellRef.current, hostMode, () => {
        xrSessionRef.current = null;
        setXrActive(false);
        setXrMessage("WebXR room preview ended. The table session is still active.");
      });
      setXrActive(true);
      setXrMessage(
        "WebXR room preview active. This shell does not claim Quest controller, hand-input, or Meta Avatar proof.",
      );
    } catch (error) {
      setXrActive(false);
      setXrMessage(error instanceof Error ? error.message : "Unable to start WebXR.");
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
              {MANIFEST_ID} working draft — not a frozen rules manifest. Level 7 contracts are withheld
              pending experienced-player review.
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
                    <strong>AI Dealer</strong> announces, teaches, and paces the table. The rules engine
                    alone owns shuffle, deal, legality, tricks, and score. The dealer never sees concealed
                    hands.
                  </>
                ) : (
                  <>
                    <strong>Human Host</strong> manages invite simulation, mute, between-hand pause, and
                    AI substitution. The host cannot inspect hands, alter cards, bids, tricks, score, force
                    play, or void a committed hand.
                  </>
                )}
              </div>
            )}
            <p className="authority-box">
              Music defaults <strong>Off</strong>. No bundled recordings ship in this prototype. Host
              playback remains external, private-room, unrecorded, and rights-dependent.
            </p>
            <button type="button" className="primary" disabled={!hostMode} onClick={startTable}>
              Enter the table
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const showRobot = hostMode === "ai-dealer";
  const handPaused = game.paused;
  const isSouthAuction = game.phase === "auction" && canAct;
  const isSouthDeclaration = game.phase === "declaration" && canAct;
  const isSouthKitty = game.phase === "kitty" && canAct;
  const isSouthPlay = game.phase === "play" && canAct;
  const isSummary = game.phase === "summary";

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
          <div className="robot-dealer" aria-label="AI dealer robot">
            <div className="robot-head" />
            <span>AI Dealer</span>
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
        {xrActive ? "Quest VR active" : xrSupport === "checking" ? "Checking Quest VR" : "Enter Quest VR"}
      </button>
      <p id="xr-status" className="xr-status" role="status">
        {xrMessage}
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
          onResume={() => setGame((current) => (current ? togglePause(current) : current))}
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

      {(isSouthAuction || isSouthDeclaration || isSouthKitty || isSouthPlay || pendingBid || pendingPlay) && (
        <div className="action-rail panel">
          {isSouthAuction && (
            <>
              <div className="bid-grid" role="group" aria-label="Your bid">
                {legalHumanActions(game).some((action) => action.type === "pass") && (
                  <button type="button" onClick={() => applyAction({ type: "pass" })}>
                    Pass
                  </button>
                )}
                {selectableBids.map((bid) => (
                  <button
                    key={`${bid.level}-${bid.mode}`}
                    type="button"
                    className={pendingBid?.bid.level === bid.level && pendingBid.bid.mode === bid.mode ? "primary" : ""}
                    onClick={() => setPendingBid({ bid })}
                  >
                    {bidLabel(bid)}
                  </button>
                ))}
              </div>
              {pendingBid && (
                <>
                  <span>Preview: {bidLabel(pendingBid.bid)}</span>
                  <button type="button" onClick={() => setPendingBid(null)}>
                    Cancel
                  </button>
                  <button type="button" className="primary" onClick={confirmBid}>
                    Confirm bid
                  </button>
                </>
              )}
            </>
          )}

          {isSouthDeclaration && (
            <>
              {game.contract?.mode.startsWith("no-trump") ? (
                <button type="button" className="primary" onClick={() => applyAction({ type: "declare", trump: null })}>
                  Confirm No Trump
                </button>
              ) : (
                <div className="bid-grid" role="group" aria-label="Declare trump">
                  {SUITS.map((trump) => (
                    <button
                      key={trump}
                      type="button"
                      className="primary"
                      onClick={() => applyAction({ type: "declare", trump })}
                    >
                      {trump}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {isSouthKitty && (
            <>
              <span>Select 6 cards to discard ({discardIds.length}/6)</span>
              <button type="button" disabled={discardIds.length !== 6} className="primary" onClick={confirmDiscard}>
                Close kitty
              </button>
            </>
          )}

          {isSouthPlay && pendingPlay && !a11y.oneClickPlay && (
            <>
              <span>Preview card selected</span>
              <button type="button" onClick={() => setPendingPlay(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={confirmPlay}>
                Play card
              </button>
            </>
          )}

          {isSouthPlay && a11y.oneClickPlay && <span>One-click play: tap a legal card to commit</span>}
        </div>
      )}

      {game.turn === "south" && (game.phase === "play" || game.phase === "kitty") && (
        <div className="player-hand" role="group" aria-label="Your hand">
          {game.hands.south.map((card) => {
            const legal = game.phase === "play" ? southLegalCards.some((candidate) => candidate.id === card.id) : true;
            const selected =
              game.phase === "kitty"
                ? discardIds.includes(card.id)
                : pendingPlay?.cardId === card.id;
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
                onClick={() => (game.phase === "kitty" ? toggleDiscard(card.id) : selectCard(card))}
              >
                <span className="rank">{card.suit === "joker" ? card.joker === "big" ? "BJ" : "LJ" : card.label.replace(/[♣♦♥♠]/g, "")}</span>
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
      <span className="rank">{card.suit === "joker" ? (card.joker === "big" ? "BJ" : "LJ") : card.label.replace(/[♣♦♥♠]/g, "")}</span>
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
