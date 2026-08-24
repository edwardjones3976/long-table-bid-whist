import { useMemo, useState } from 'react';
import {
  AccessibilityDrawer,
  BidPanel,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  HandSummary,
  HostDrawer,
  PlayerHand,
  PlayingCard,
  ScoreRail,
  TableScene,
  TableSetup,
  TurnBanner,
  type AccessibilitySettings,
  type BidChoice,
  type CardModel,
  type DealerMode,
  type TableSeat,
  type TrickCard,
} from './components';
import {
  autoplayAiTurns,
  bidWhistReducer,
  createHand,
  legalBids,
  legalCardIds,
  nextSeat,
  projectForSeat,
  teamOf,
  type Bid,
  type Card,
  type ContractBid,
  type ContractDeclaration,
  type GameAction,
  type HandState,
  type Seat,
  type Suit,
} from './game';
import './styles/game.css';
import './styles/app.css';

const HUMAN_SEAT: Seat = 0;
const AI_SEATS: readonly Seat[] = [1, 2, 3];
const SEAT_NAMES = ['You', 'West AI', 'North AI', 'East AI'] as const;
const TABLE_SEATS: readonly TableSeat[] = ['south', 'west', 'north', 'east'];
const SUIT_LABELS: Readonly<Record<Suit, string>> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
};

function rankLabel(card: Card): string {
  if (card.kind === 'joker') return card.joker === 'big' ? 'BIG' : 'LIL';
  if (card.rank === 14) return 'A';
  if (card.rank === 13) return 'K';
  if (card.rank === 12) return 'Q';
  if (card.rank === 11) return 'J';
  return String(card.rank);
}

function cardModel(card: Card, legal = true, reason?: string): CardModel {
  return {
    id: card.id,
    rank: rankLabel(card),
    suit: card.kind === 'joker' ? 'joker' : card.suit,
    legal,
    disabled: !legal,
    reason,
  };
}

function contractLabel(bid: ContractBid | null): string {
  if (!bid) return 'Auction open';
  if (bid.mode === 'no-trump') return `${bid.level} No Trump`;
  return `${bid.level} ${bid.mode === 'high' ? 'High' : 'Low'}`;
}

function phaseLabel(state: HandState): string {
  switch (state.phase) {
    case 'bidding':
      return 'Auction';
    case 'declaring':
      return 'Name the contract';
    case 'discarding':
      return 'Choose six for the kitty';
    case 'playing':
      return `Book ${Math.min(12, state.completedTricks.length + 1)} of 12`;
    case 'complete':
      return 'Hand complete';
  }
}

function newPrototypeHand(
  handNumber: number,
  dealer: Seat = 0,
  scores: readonly [number, number] = [0, 0],
): HandState {
  return createHand({ seed: `long-table-prototype-${handNumber}`, dealer, scores });
}

function advanceAi(state: HandState): { state: HandState; actions: readonly GameAction[] } {
  return autoplayAiTurns(state, { aiSeats: AI_SEATS, maxActions: 128 });
}

export function App() {
  const [started, setStarted] = useState(false);
  const [dealerMode, setDealerMode] = useState<DealerMode>('ai');
  const [handNumber, setHandNumber] = useState(1);
  const [game, setGame] = useState<HandState>(() => newPrototypeHand(1));
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const [hostOpen, setHostOpen] = useState(true);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(
    DEFAULT_ACCESSIBILITY_SETTINGS,
  );
  const [muted, setMuted] = useState(false);
  const [pausedBetweenHands, setPausedBetweenHands] = useState(false);
  const [status, setStatus] = useState('Choose who is running the table, then take your seat.');

  const humanView = useMemo(() => projectForSeat(game, HUMAN_SEAT), [game]);
  const currentLegalBids = useMemo(
    () => (game.turn === HUMAN_SEAT ? legalBids(humanView) : []),
    [game.turn, humanView],
  );
  const bidChoices = useMemo<BidChoice[]>(
    () =>
      currentLegalBids
        .filter((bid): bid is ContractBid => bid.kind === 'contract')
        .map((bid) => ({
          id: `${bid.level}-${bid.mode}`,
          level: bid.level,
          kind: bid.mode,
        })),
    [currentLegalBids],
  );
  const passIsLegal = currentLegalBids.some((bid) => bid.kind === 'pass');

  const playableIds = useMemo(() => {
    if (game.phase !== 'playing' || !game.declaration) return new Set<string>();
    return new Set(legalCardIds(humanView.hand, game.currentTrick, game.declaration));
  }, [game.currentTrick, game.declaration, game.phase, humanView.hand]);

  const handCards = useMemo(
    () =>
      humanView.hand.map((card) => {
        const legal = game.phase === 'playing' && playableIds.has(card.id);
        return cardModel(
          card,
          legal,
          game.phase === 'playing' && !legal ? 'Follow the led suit when able.' : undefined,
        );
      }),
    [game.phase, humanView.hand, playableIds],
  );

  const trickCards = useMemo<TrickCard[]>(
    () =>
      game.currentTrick.map((play) => ({
        card: cardModel(play.card),
        seat: TABLE_SEATS[play.seat],
        playerName: SEAT_NAMES[play.seat],
      })),
    [game.currentTrick],
  );

  function commitAction(action: GameAction, humanMessage: string) {
    const reduced = bidWhistReducer(game, action);
    if (reduced.lastError) {
      setStatus(reduced.lastError);
      setGame(reduced);
      return;
    }
    const advanced = advanceAi(reduced);
    setGame(advanced.state);
    setSelectedBidId(null);
    setSelectedCardId(null);
    setDiscardIds([]);
    const aiSuffix = advanced.actions.length
      ? ` ${advanced.actions.length} AI action${advanced.actions.length === 1 ? '' : 's'} followed.`
      : '';
    setStatus(`${humanMessage}${aiSuffix}`);
  }

  function startTable() {
    const opening = advanceAi(newPrototypeHand(1));
    setGame(opening.state);
    setHandNumber(1);
    setStarted(true);
    setStatus(
      `${dealerMode === 'ai' ? 'AI Dealer' : 'Human Host'} table ready. Strict Table rules are locked.`,
    );
  }

  function handleBidSelect(choice: BidChoice) {
    setSelectedBidId(choice.id);
    setStatus(`${contractLabel({ kind: 'contract', level: choice.level, mode: choice.kind })} selected. Confirm to commit.`);
  }

  function handleBidConfirm(choice: BidChoice) {
    commitAction(
      {
        type: 'BID',
        seat: HUMAN_SEAT,
        bid: { kind: 'contract', level: choice.level, mode: choice.kind },
      },
      `${choice.level} ${choice.kind === 'no-trump' ? 'No Trump' : choice.kind} committed.`,
    );
  }

  function handlePass() {
    const bid: Bid = { kind: 'pass' };
    commitAction(
      { type: 'BID', seat: HUMAN_SEAT, bid },
      passIsLegal ? 'You passed.' : 'Dealer was forced to bid 3 High.',
    );
  }

  function handleDeclare(declaration: ContractDeclaration) {
    const declarationName = declaration.trump
      ? `${SUIT_LABELS[declaration.trump]} ${declaration.direction}`
      : `No Trump ${declaration.direction}`;
    commitAction(
      { type: 'DECLARE', seat: HUMAN_SEAT, declaration },
      `${declarationName} declared. Choose six cards for the kitty.`,
    );
  }

  function toggleDiscard(cardId: string) {
    setDiscardIds((current) => {
      if (current.includes(cardId)) return current.filter((id) => id !== cardId);
      if (current.length >= 6) {
        setStatus('Exactly six cards may be returned to the kitty.');
        return current;
      }
      return [...current, cardId];
    });
  }

  function confirmDiscard() {
    if (discardIds.length !== 6) {
      setStatus(`Choose ${6 - discardIds.length} more card${6 - discardIds.length === 1 ? '' : 's'}.`);
      return;
    }
    commitAction(
      { type: 'DISCARD', seat: HUMAN_SEAT, cardIds: discardIds },
      'Six cards returned to the kitty. You lead the first book.',
    );
  }

  function playCard(model: CardModel) {
    commitAction(
      { type: 'PLAY', seat: HUMAN_SEAT, cardId: model.id },
      `${model.rank} ${model.suit === 'joker' ? 'Joker' : `of ${model.suit}`} played.`,
    );
  }

  function beginNextHand() {
    if (pausedBetweenHands) {
      setStatus('The host paused the table between hands. Resume before dealing.');
      return;
    }
    const nextNumber = handNumber + 1;
    const nextScores = game.summary?.scoreAfter ?? game.scoresBefore;
    const nextDealer = nextSeat(game.dealer);
    const opening = advanceAi(newPrototypeHand(nextNumber, nextDealer, nextScores));
    setHandNumber(nextNumber);
    setGame(opening.state);
    setStatus(`Hand ${nextNumber} dealt. Strict Table rules remain locked.`);
  }

  function newTable() {
    setStarted(false);
    setHandNumber(1);
    setGame(newPrototypeHand(1));
    setDiscardIds([]);
    setSelectedCardId(null);
    setSelectedBidId(null);
    setPausedBetweenHands(false);
    setStatus('Choose who is running the table, then take your seat.');
  }

  async function invite() {
    const code = 'LONG-72';
    try {
      await navigator.clipboard?.writeText(code);
      setStatus(`Private table code ${code} copied. Invite simulation only; no network room was created.`);
    } catch {
      setStatus(`Private table code: ${code}. Invite simulation only; no network room was created.`);
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setStatus('Fullscreen was not available in this browser.');
    }
  }

  const contract = contractLabel(game.highBid);
  const bidderTeam = game.bidder === null ? null : teamOf(game.bidder);
  const playerBooks = game.trickBooks[0] + (bidderTeam === 0 && game.phase !== 'bidding' ? 1 : 0);
  const actionRail = (() => {
    if (!started || game.phase === 'complete' || game.turn !== HUMAN_SEAT) return null;
    if (game.phase === 'bidding') {
      return (
        <BidPanel
          bids={bidChoices}
          selectedBidId={selectedBidId}
          onSelect={handleBidSelect}
          onConfirm={handleBidConfirm}
          onPass={handlePass}
          onCancel={() => {
            setSelectedBidId(null);
            setStatus('Bid selection canceled. Auction unchanged.');
          }}
        />
      );
    }
    if (game.phase === 'declaring' && game.highBid) {
      return (
        <section className="decision-panel glass-surface" aria-label="Declare the contract">
          <strong>Name the contract</strong>
          <div className="decision-panel__choices">
            {game.highBid.mode === 'no-trump' ? (
              (['high', 'low'] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className="game-button game-button--primary"
                  onClick={() => handleDeclare({ direction, trump: null })}
                >
                  No Trump {direction === 'high' ? 'High' : 'Low'}
                </button>
              ))
            ) : (
              (Object.keys(SUIT_LABELS) as Suit[]).map((suit) => (
                <button
                  key={suit}
                  type="button"
                  className="game-button game-button--primary"
                  onClick={() =>
                    handleDeclare({
                      direction: game.highBid!.mode === 'low' ? 'low' : 'high',
                      trump: suit,
                    })
                  }
                >
                  {SUIT_LABELS[suit]}
                </button>
              ))
            )}
          </div>
        </section>
      );
    }
    if (game.phase === 'discarding') {
      return (
        <button
          type="button"
          className="game-button game-button--primary discard-confirm"
          disabled={discardIds.length !== 6}
          onClick={confirmDiscard}
        >
          Return {discardIds.length}/6 to kitty
        </button>
      );
    }
    return null;
  })();

  const playerHand = game.phase === 'discarding' && game.turn === HUMAN_SEAT ? (
    <section className="discard-picker" aria-label="Choose six cards for the kitty">
      <div className="discard-picker__cards">
        {humanView.hand.map((card) => (
          <PlayingCard
            key={card.id}
            card={cardModel(card)}
            selected={discardIds.includes(card.id)}
            onActivate={() => toggleDiscard(card.id)}
            onCommit={() => toggleDiscard(card.id)}
          />
        ))}
      </div>
      <p>{discardIds.length} of 6 selected</p>
    </section>
  ) : game.phase === 'playing' ? (
    <PlayerHand
      cards={handCards}
      selectedCardId={selectedCardId}
      onSelect={(card) => setSelectedCardId(card.id)}
      onCommit={playCard}
      disabled={game.turn !== HUMAN_SEAT}
      cardScale={settings.cardScale}
      oneClickPlay={settings.oneClickPlay}
      showCommitButton={game.turn === HUMAN_SEAT}
    />
  ) : null;

  const summary = game.summary;
  const summaryBooks = summary ? summary.books[summary.biddingTeam] : 0;

  return (
    <TableScene
      phase={game.phase}
      reducedMotion={settings.reducedMotion}
      highContrast={settings.highContrast}
      centerTrick={trickCards}
      scoreRail={
        <ScoreRail
          contract={contract}
          northSouth={summary?.scoreAfter[0] ?? game.scoresBefore[0]}
          eastWest={summary?.scoreAfter[1] ?? game.scoresBefore[1]}
          books={playerBooks}
        />
      }
      turnBanner={
        <TurnBanner
          currentActor={SEAT_NAMES[game.turn]}
          isLocalTurn={game.turn === HUMAN_SEAT && game.phase !== 'complete'}
          mode={dealerMode}
          seatLabel={TABLE_SEATS[game.turn][0].toUpperCase()}
          phaseLabel={phaseLabel(game)}
        />
      }
      playerHand={playerHand}
      actionRail={actionRail}
      rightDrawer={
        <HostDrawer
          open={hostOpen}
          onOpenChange={setHostOpen}
          pausedBetweenHands={pausedBetweenHands}
          muted={muted}
          musicOff
          canAddAI={false}
          onInvite={invite}
          onTogglePause={() => {
            if (game.phase !== 'complete') {
              setStatus('The host may pause only between hands; the committed hand is unchanged.');
              return;
            }
            setPausedBetweenHands((value) => !value);
          }}
          onToggleMute={() => setMuted((value) => !value)}
          onAddAI={() => setStatus('All three non-player seats already use deterministic AI.')}
          onToggleMusic={() =>
            setStatus('Host music stays off here. Use rights-cleared external venue playback.')
          }
        />
      }
      utilityControls={
        <div className="utility-controls glass-surface" aria-label="Table utilities">
          <button type="button" aria-label="Show Strict Table rule summary" onClick={() => setStatus(game.rules.name)}>
            ?
          </button>
          <button type="button" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>
            ⛶
          </button>
          <AccessibilityDrawer
            open={accessibilityOpen}
            settings={settings}
            onOpenChange={setAccessibilityOpen}
            onSettingsChange={setSettings}
          />
        </div>
      }
      overlays={
        <>
          <TableSetup
            open={!started}
            mode={dealerMode}
            onModeChange={setDealerMode}
            onStart={startTable}
            rulesName={game.rules.name}
          />
          {summary ? (
            <HandSummary
              open={game.phase === 'complete'}
              result={summary.made ? 'made' : 'set'}
              contract={contract}
              books={summaryBooks}
              northSouthBefore={summary.scoreBefore[0]}
              northSouthAfter={summary.scoreAfter[0]}
              eastWestBefore={summary.scoreBefore[1]}
              eastWestAfter={summary.scoreAfter[1]}
              pausedBetweenHands={pausedBetweenHands}
              onTogglePause={() => {
                setPausedBetweenHands((value) => !value);
                setStatus(
                  pausedBetweenHands
                    ? 'The table resumed. The next hand may be dealt.'
                    : 'The host paused the table between hands.',
                );
              }}
              onNextHand={beginNextHand}
              onNewTable={newTable}
            />
          ) : null}
          {settings.captions ? (
            <div className="caption-bar" role="status" aria-live="polite">
              {muted ? '[Voice muted] ' : ''}{status}
            </div>
          ) : (
            <span className="sr-only" role="status" aria-live="polite">{status}</span>
          )}
        </>
      }
    />
  );
}
