# The Long Table — Bid Whist VR Codex

**Version:** codex-v0.2.0 · **Date:** 2026-11-20 · **Rules preset:** `strict-table-v1.0.0`

> **v0.2.0:** owner decided D-01 and D-02 (yes to both); findings F-01–F-06 fixed
> (engine fixes integrated from the single-finding branches for F-01…F-05 and the
> `.gradle` cleanup) and covered by 26 engine tests. **v0.1.0:** initial Codex and
> findings register.

This Codex is the single reference for carrying The Long Table from the shipped
Android build to a seated VR/MR table on Meta Quest. It records what the rules
engine *actually does* today, what the VR table must do, where the two differ,
and which decisions are still open. When this document and the code disagree,
the disagreement is a bug in one of them and is logged in
[Chapter 14](#14-engine-findings-register).

Every requirement carries one status tag:

| Tag | Meaning |
| --- | --- |
| `SHIPPED` | Implemented in the Android app on `main` and covered by a deterministic test or a probe described here |
| `SPECIFIED` | Agreed behaviour; not yet implemented for VR |
| `OPEN` | Needs an owner decision or community/rules-council input before implementation |

---

## Table of contents

1. [Product frame](#1-product-frame)
2. [Strict Table Manifest](#2-strict-table-manifest)
3. [Match flow state machine](#3-match-flow-state-machine)
4. [Information boundaries](#4-information-boundaries)
5. [Roles and permissions](#5-roles-and-permissions)
6. [AI tablemates](#6-ai-tablemates)
7. [VR interaction specification](#7-vr-interaction-specification)
8. [Accessibility and comfort](#8-accessibility-and-comfort)
9. [Audio, captions, and table talk](#9-audio-captions-and-table-talk)
10. [Architecture](#10-architecture)
11. [Networking (deferred)](#11-networking-deferred)
12. [Asset provenance and rights](#12-asset-provenance-and-rights)
13. [Testing and acceptance gates](#13-testing-and-acceptance-gates)
14. [Engine findings register](#14-engine-findings-register)
15. [Open decisions](#15-open-decisions)
16. [Glossary](#16-glossary)

---

## 1. Product frame

The Long Table is a **private-first social gathering with a serious Bid Whist
game inside it**. It is not a casino product, a generic card simulator, or a
nostalgia museum. The first VR experience is deliberately small:

- one contemporary, lived-in room;
- one fully declared rules preset, acknowledged before play;
- one seated human hand (South) with three AI tablemates;
- an AI dealer that announces and teaches but holds no authority;
- an optional human Table Host with sharply bounded powers.

**Primary audience:** Black American adults ages 30–70, with the table legible
to invited family and friends of any age. Culture is the product, not a
cosmetic theme: table talk, teaching, return visits, and belonging are first-
class. Authenticity is never equated with mandatory performance, trash talk,
profanity, or a fixed accent — players choose their table-talk intensity.

**Retention loop:** people, partnerships, reputation within private groups, and
mastery. No grinding, no randomized rewards, no collectible economy.

**Out of scope for the first VR prototype:** MR room placement beyond what is
needed to seat one table, public matchmaking, ranked play, tournaments,
spectator broadcast, generative-AI conversation, collectibles, and shared host
audio transmission.

---

## 2. Strict Table Manifest

The manifest is declared in `app/src/main/java/com/example/engine/BidWhistModels.kt`
(`TableRulesManifest`) and enforced in `BidWhistRulesEngine.kt`. The VR table
ships the **same preset, same version string**, and shows it in plain language
before the first deal. A player who has not acknowledged the manifest cannot
be dealt in.

### 2.1 Deck and deal — `SHIPPED`

| Rule | Value | Source |
| --- | --- | --- |
| Deck | 54 cards: 52 standard + Big Joker + Little Joker | `createStandardDeck()` |
| Hand size | 12 per seat | `dealHand()` |
| Kitty | 6 cards, sealed face-down | `dealHand()` |
| First dealer | East; rotates clockwise each hand | `startNewMatch()`, `dealNextHand()` |
| Seat order | South → West → North → East (clockwise) | `Seat.nextClockwise()` |
| Partnerships | **Us** = South + North · **Them** = West + East | `Seat.partnership` |
| Shuffle | Seeded `kotlin.random.Random(seed)`; deterministic and replayable | `dealHand()` |

### 2.2 Auction — `SHIPPED`

| Rule | Value |
| --- | --- |
| Bidding opens | Seat left of dealer (dealer's `nextClockwise()`) |
| Bid levels | 4, 5, 6, 7 books over six (i.e. 10–13 books). No 3-bids. |
| Each bid declares | level, **Uptown** or **Downtown**, and **Trump** or **No-Trump** |
| Outranking | Higher level wins. At equal level, No-Trump outranks a suit bid. A suit bid never outranks No-Trump at the same level. |
| Forced dealer bid | If the first three seats pass, the dealer **may not pass** and must bid at least 4. Recorded as `forcedByDealerRule = true`. |
| One round | Each seat speaks exactly once; four actions close the auction |

The engine checks every bid with `isBidValid()`; an illegal bid is refused, not
silently corrected.

### 2.3 Naming trump and the kitty — `SHIPPED`

- If the winning bid was **No-Trump**, the contract is fixed immediately and the
  declarer receives the kitty (`KITTY_DISCARD`). `SELECT_TRUMP` is never entered
  and the engine refuses any attempt to enter it.
- If the winning bid was a **suit bid**, the declarer names **only the trump
  suit** (`SELECT_TRUMP`), then receives the kitty. The direction (Uptown /
  Downtown) is taken from the winning bid
  (`directionAndNoTrumpBindingFromAuction = true`, decision D-01): the other
  three seats bid against that declaration, so it cannot change afterwards.
- The declarer sees the six kitty cards (marked `kittyCardIdsInHand`), holds 18
  cards, and must lay down exactly six. Discards are never revealed.
- **Kitty book:** the kitty counts as the declarer's partnership's first book
  (`kittyCountsAsDeclarerBook = true`). Hands therefore total 13 books.

Resolved F-03: `selectTrumpAndPickUpKitty(state, seat, trumpSuit)` takes the
direction from the winning bid and refuses a null suit; a deprecated legacy
overload still accepts a direction argument but ignores it. The UI shows the
declared bid read-only.

### 2.4 Card ranking — `SHIPPED`

| Direction | Ranking (strongest → weakest) |
| --- | --- |
| **Uptown** | A · K · Q · J · 10 · 9 · 8 · 7 · 6 · 5 · 4 · 3 · 2 |
| **Downtown** | A · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · J · Q · K |

Ace is high in both directions (`Rank.downtownOrder`: ACE = 14, TWO = 13 … KING = 2).

| Joker rule | Trump contract | No-Trump contract |
| --- | --- | --- |
| Big Joker | Highest trump (strength 1000) | No suit; strength −1 (below every suited card) |
| Little Joker | Second-highest trump (strength 999) | No suit; strength −1 |
| Effective suit | The trump suit | `null` |
| Led to a trick | Sets trump as the suit to follow | Sets **no** suit; the first suited card played governs the trick (decision D-02) |

**Governing suit.** `governingSuit(trick, contract)` is the effective suit of
the first card in the trick that has one. In a trump contract that is always
the led card. In No-Trump, after a joker lead the second player is
unconstrained; once a suited card is played, later players must follow *that*
suit, and the joker cannot win. Resolved F-02.

### 2.5 Play — `SHIPPED`

- Declarer leads trick 1. Winner of each book leads the next.
- **Follow suit** is mandatory when able (`legalCards()`); a player void in the
  led suit may play anything, including trump.
- Trick winner: highest trump if any trump was played, else highest card of the
  led suit (`cardStrength()`, `determineTrickWinner()`).
- Books are tallied per partnership; 12 tricks plus the kitty book = 13.

### 2.6 Scoring — `SHIPPED`

| Outcome | Points |
| --- | --- |
| Contract made (suit) | `booksOverSix` to declarer's side |
| Contract made (No-Trump) | `booksOverSix × 2` to declarer's side |
| Contract set | The same amount to the opponents |
| **Boston** (declarer's side takes all 13 books) on a **7 bid** | 14 points |
| Boston on a lower bid | Scored as an ordinary made contract (no bonus) |
| Game | First partnership to **7 points** |

Note that a 7 No-Trump Boston also scores 14 (the Boston branch is evaluated
before the No-Trump doubling). Negative scores are not tracked: a set awards
points *to the opponents* rather than subtracting from the declarer. These are
the house rules of this preset, not errors.

### 2.7 Voided hands — `SHIPPED`

A hand may be voided only as an **audited unanimous void**, enforced by the
engine (resolved F-04):

1. `requestVoid(state, seat, reason)` — refused unless `canRequestVoid(state)`
   (the hand is live: `BIDDING` … `TRICK_COMPLETE`), no other request is
   pending, and a reason is given. AI seats consent implicitly at request time.
2. `consentToVoid(state, seat)` — adds a human consent. `withdrawVoidRequest`
   cancels; both are audited.
3. When every human seat has consented, the void applies: concealed hands are
   discarded unrevealed, no points move, `HandOutcome` carries the
   `VoidRequest` with a null contract/award (F-05), the audit event records
   requester, consenting seats and reason, and the deal passes clockwise.

On a local table the host sheet shows "Request" → "Confirm" (South's consent)
→ void, with the pending request and outstanding seats visible in `SeatView`.

---

## 3. Match flow state machine

`TablePhase` in `BidWhistModels.kt`; transitions in `BidWhistRulesEngine.kt`.

```
IDLE
 └─ startNewMatch / dealNextHand ─────────────────────────────▶ BIDDING
BIDDING ── 4 bids recorded ──┬─ winner bid No-Trump ──────────▶ KITTY_DISCARD
                             └─ winner bid a suit ────────────▶ SELECT_TRUMP
SELECT_TRUMP ── declarer names the suit (direction bound) ───▶ KITTY_DISCARD
KITTY_DISCARD ── declarer lays down exactly 6 ───────────────▶ PLAYING_TRICK
PLAYING_TRICK ── 4th card of a trick ────────────────────────▶ TRICK_COMPLETE
TRICK_COMPLETE ── collectCompletedTrick ──┬─ < 12 tricks ────▶ PLAYING_TRICK
                                           ├─ 12 tricks, game not over ▶ HAND_COMPLETE
                                           └─ 12 tricks, ≥ 7 points ──▶ MATCH_COMPLETE
HAND_COMPLETE / VOIDED_HAND ── dealNextHand ─────────────────▶ BIDDING
live phase ── requestVoid / consentToVoid, once unanimous ──▶ VOIDED_HAND
```

**Who acts in each phase**

| Phase | Actor | Human input | AI input |
| --- | --- | --- | --- |
| `BIDDING` | `currentTurn` seat | Bid or Pass via bidding panel | `AiPlayerPolicy.chooseBid` |
| `SELECT_TRUMP` | declarer | Suit panel; declared direction shown read-only | `chooseTrumpSuit` |
| `KITTY_DISCARD` | declarer | Toggle 6 cards → Confirm | `chooseSixDiscards` |
| `PLAYING_TRICK` | `currentTurn` seat | Select → Preview → Commit | `chooseCardToPlay` |
| `TRICK_COMPLETE` | rules service | Optional "collect now" tap | Auto-advance after a pause |
| `HAND_COMPLETE` | rules service / host | "Deal next hand" (blocked while host-paused) | — |
| `MATCH_COMPLETE` | — | "New match" | — |

The VR presentation layer **never** decides a transition. It renders the
projected view and forwards one intent per input. Timing (AI "thinking" delays,
trick-collection pauses) lives in the presentation adapter, as it does today in
`MainViewModel.scheduleAiAdvanceIfNeeded()`.

---

## 4. Information boundaries

Three data shapes exist. Only the first is complete; the other two are
*projections* produced by the rules service, and nothing outside the service
may hold the first.

| Shape | Holder | Contains concealed cards? |
| --- | --- | --- |
| `AuthoritativeState` | Rules service only | Yes — all four hands and the kitty |
| `SeatView` | One human seat's presentation layer | Only that seat's hand (and kitty cards once delivered to it as declarer) |
| `AiSeatObservation` | One AI seat's policy | Only that seat's hand |

### 4.1 What a projection may carry — `SHIPPED`

Both projections carry only **public** table history: bid history, highest bid,
contract, current trick, completed tricks with all four plays, book counts,
scores, dealer, whose turn it is, and the audit log. `SeatView` additionally
carries `seatCardCounts` (how many cards each seat holds — public information at
a real table), captions, legal-play card ids for the local hand, and an
optional coach hint computed from the local hand only.

`concealedBoundary_seatViewAndAiObservationIsolateHiddenCards` in
`BidWhistRulesEngineTest.kt` checks that South's view and West's observation
share no card ids and that South sees no kitty ids before winning the bid.

### 4.2 Seed exposure — `SHIPPED` (resolved F-01)

The shuffle is `createStandardDeck().shuffled(Random(seed))` with fixed deal
offsets, so **any client holding the seed can reconstruct every hand and the
kitty**. The seed therefore lives only in `AuthoritativeState`:

- `SeatView` has no seed property; the deal audit event names deck, hand and
  kitty sizes and the manifest version but not the seed. A test asserts no
  caption or audit string in a fresh view contains the seed.
- Replay files for testing carry the seed; production projections never do.
- `SPECIFIED`: after `HAND_COMPLETE`/`MATCH_COMPLETE` the service *may* publish
  a commitment (e.g. SHA-256 of `seed || handNumber`) announced at deal time,
  so players can verify fairness post-hoc without pre-hoc leakage (D-05).

### 4.3 Boundary rules for every future surface

1. No AI policy, host control, voice feature, or spectator feature receives
   `AuthoritativeState`. If it needs more than a projection offers, the
   projection is extended deliberately and tested.
2. Projections are pure functions of state; they contain no randomness and no
   wall-clock values.
3. Audit entries describe *public* events. A concealed card appears in the
   audit log only after it was legally played.

---

## 5. Roles and permissions

Four roles exist. Role is independent of seat: a human may be a Seated Player
only, or Seated Player **and** Table Host (`RoleMode`). The AI Dealer is a
presentation voice, not an authority. The Rules Service is the only authority.

| Capability | Rules Service | AI Dealer | Table Host | Seated Player |
| --- | :-: | :-: | :-: | :-: |
| Commit shuffle, deal, kitty | ✔ | ✖ | ✖ | ✖ |
| Validate bids, follow-suit, books, score | ✔ | ✖ | ✖ | ✖ |
| Announce turns, teach, pace the deal | supplies state | ✔ | optional | ✖ |
| See any concealed hand other than own | isolated delivery only | ✖ | ✖ | ✖ |
| Lock the rules manifest before the hand | enforces | ✖ | ✔ | acknowledges |
| Seat/reseat, name AI tablemates, add/remove AI | enforces | ✖ | ✔ | ✖ |
| Set table-talk tone | enforces | ✖ | ✔ | own captions |
| Pause **between hands** | enforces | ✖ | ✔ | ✖ |
| Pause or void a committed hand unilaterally | ✖ | ✖ | ✖ | ✖ |
| Request an audited unanimous void | records | may suggest | ✔ | consents |
| Mute, block, remove, report (multiplayer) | enforces | ✖ | ✔ | self-mute, report |
| Control room music / announcements | enforces policy | ✖ | ✔ | ✖ |
| Bid, name trump, discard, play own cards | validates | ✖ | own seat only | ✔ |

Status today: pause-between-hands, tone, AI presets, and the consent-gated
void are `SHIPPED` in `TableHostSheet.kt` / `MainViewModel.kt` /
`BidWhistRulesEngine.kt`. The engine records requester, consents and reason and
refuses voids outside a live hand (F-04). One gap remains `SPECIFIED`:

- **Host authority must be enforced by the service, not the UI.** The engine
  has no notion of who is host; `MainViewModel` checks `roleMode` before
  calling `requestVoid`. In VR/multiplayer the match service verifies the
  caller's role before forwarding host intents (pause, reseat, request void).

---

## 6. AI tablemates

`app/src/main/java/com/example/engine/AiPlayerPolicy.kt` — `SHIPPED`.

- **Deterministic and fair.** The policy receives only `AiSeatObservation`. It
  is not an LLM and never holds privileged state. The same observation always
  produces the same action, which keeps replay tests and cheating analysis
  tractable.
- **Bidding.** Evaluates eight trump plans (4 suits × 2 directions) plus two
  No-Trump plans, estimates expected books, and maps the estimate to a bid
  level (≥ 8.1 → 4, ≥ 9.3 → 5, ≥ 10.6 → 6, ≥ 12.2 → 7). Honors the forced
  dealer bid.
- **Discards.** Keeps jokers, trumps, aces; discards weak side-suit cards.
- **Play.** Leads top trumps/aces; follows with the cheapest winner; ducks when
  partner already holds the book; avoids throwing jokers/aces when it cannot win.
- **Coach hints** (`generateCoachHint`) are computed from the *human's* own
  `SeatView` only and shown as optional guidance in Bid School / guided mode.

**Probe result:** 300 seeded AI-only hands all terminated, each with exactly 13
books and 48 unique cards played; 14 Bostons occurred. The AI is sound enough
for the first VR table.

**Tablemate identity.** Default names are Deacon Ray (West), Ms. Evelyn
(North), Uncle Marcus (East), with "Family Reunion" and "Bid School" presets.
Names, voices, and any future likeness go through the asset ledger
(Chapter 12) and community review. `SPECIFIED`: the VR build adds no scripted
slang lines; every caption string is reviewable in one place and tone-gated
(Chapter 9).

---

## 7. VR interaction specification

All `SPECIFIED` unless noted. Reference platform: Meta Quest via OpenXR; the
design is portable.

### 7.1 Posture and space

- **Seated, stationary.** The player sits at South. No artificial locomotion;
  recenter is always one action away.
- The table surface is at comfortable reach height for a seated adult; the
  player's hand fan floats just above the near edge, angled toward the eyes.
- Opponents' card backs, book piles, and the kitty are visible at their real
  table positions. Card *counts* match `seatCardCounts`.
- MR: only the interactions needed to place the one table on a real surface
  and sit at it. Boundary and passthrough follow Meta health-and-safety
  guidance.

### 7.2 The one core action: Select → Preview → Commit

Every card decision — bid, trump suit, kitty discard, play — uses the same
three-step gesture so a player learns it once.

| Step | What happens | Reversible |
| --- | --- | --- |
| **Select** | Point/touch a card or chip. It rises and enlarges; a caption reads it aloud ("Ace of Spades"). Illegal cards are dimmed and announce *why* ("Must follow ♠ Spades"). | yes |
| **Preview** | The card hovers over the magnetic play zone (or discard tray / bid slot) with a green legal indicator. Partner/opponent reactions do not fire yet. | yes |
| **Commit** | Press the commit button (controller) or pinch-and-hold 300 ms (hands), or tap the large commit pad on the player's dominant side. The service receives one intent. | no |

Two-step confirm is on by default (`twoStepConfirm = true`) and can be turned
off by experienced players for one-step commit; the preview still flashes.

### 7.3 Bidding panel

- Appears only when `phase == BIDDING && currentTurn == SOUTH`.
- Four level chips (4–7), two direction chips (Uptown / Downtown), a Trump /
  No-Trump toggle, and **Pass**. Chips that cannot outrank the current high bid
  are dimmed with a caption ("Must beat 5 Uptown No-Trump").
- When the dealer rule forbids passing, Pass is removed and the panel says
  "You're stuck as dealer — minimum bid 4."
- Voice bidding is optional and never exclusive; the recognized bid lands in
  *Preview* and still requires Commit.

### 7.4 Trump and kitty

- `SELECT_TRUMP`: four suit tiles only; the declared direction is shown as
  read-only text ("Downtown — declared in your bid"). There is no No-Trump
  tile here because a No-Trump winner never enters this step.
- `KITTY_DISCARD`: the six kitty cards slide into the fan with a distinct
  edge mark; the player selects six to lay face-down into the tray. The tray
  shows "6 of 6" and refuses a seventh (`toggleKittyDiscardCard` behaviour).

### 7.5 Trick play

- The play zone is a large magnetic disc at table center. Committed cards snap
  to the seat's quadrant.
- After the fourth card, the winning card lifts briefly, the book slides to the
  winner's pile, and the caption announces the count ("Ms. Evelyn wins Book #4
  (3–2)"). Reduced motion replaces slides with fades.
- "Collect now" lets an impatient player skip the pause (`collectTrickNow`).

### 7.6 Input parity matrix

| Path | Status at launch |
| --- | --- |
| Two controllers | required |
| One controller, either hand (`Handedness`) | required |
| Hand tracking (pinch) | required, never the only path |
| Head-gaze + single confirm button | required |
| Voice for bids | optional, never exclusive |
| Flat 2D fallback (existing Android app) | maintained as the accessibility path |

### 7.7 Between hands

The host (if any) may pause, reseat, rename AI seats, change tone, or request a
void. The AI Dealer summarizes the hand and the score. Nothing here touches a
committed deal.

---

## 8. Accessibility and comfort

**Launch gates** (the build does not ship without them) — carried forward
from the Android `CalibrationScreen` where `SHIPPED`:

| Requirement | Android | VR |
| --- | --- | --- |
| Playable with no audio at all (captions for every meaningful sound) | `SHIPPED` | gate |
| Card scale Standard / Large / Extra Large | `SHIPPED` | gate (world-scale cards + private magnifier) |
| High-contrast four-colour suit badges, suit redundant to colour | `SHIPPED` | gate |
| Handedness: commit control on dominant side | `SHIPPED` | gate |
| Two-step commit on by default | `SHIPPED` | gate |
| Reduced motion | `SHIPPED` | gate — also removes dealing animation |
| Seated / stationary, stable horizon, no forced head turns | n/a | gate |
| Recenter, skip-able and re-openable calibration before any menu | partial | gate |
| Generous hit areas (≥ 2.5 cm at arm's reach) | n/a | gate |
| Visible speaker identity for every caption | `SHIPPED` (`seatCaptions`) | gate |

**Later enhancements** (`OPEN`): private-hand read-aloud on demand, colour-
blind palettes beyond the current badges, adjustable AI pacing, haptic
intensity, and a "table-side helper" mode for a sighted companion.

Older-adult evidence favours training, local champions, and testing actual
preferences over age stereotypes. The first-run calibration therefore asks,
never assumes.

---

## 9. Audio, captions, and table talk

- **Captions are the source of truth.** Every engine transition produces a
  caption string (`latestCaption`, `seatCaptions`). VR voice lines are rendered
  *from* captions, never the other way round. `SHIPPED` in the engine.
- **Tone gate.** `TableTalkTone` — Quiet (essential announcements only), Social
  (warm partnership cues), Lively (expressive but respectful). AI lines are
  authored in triplicate via `toneLine()` and reviewable as one table.
  `SHIPPED`.
- **Sound effects** are procedurally synthesized PCM (`SoundFeedback.kt`):
  card snap and trick chime. No sampled recordings. `SHIPPED`; VR adds spatial
  placement through the Meta XR Audio SDK (not the end-of-life Oculus
  Spatializer).
- **Room tone**: quiet, distant neighbourhood/weather cues, conversation
  intelligibility first. `SPECIFIED`.
- **Music**: see Chapter 12. External venue playback only for the MVP.
- **Voice chat**: deferred with networking. When added, it requires mute, block,
  remove, report, per-source volume, captions or an alternative, consent, and a
  retention decision. Voice never carries a gameplay command exclusively.

---

## 10. Architecture

### 10.1 Layers

```
Versioned Table Rules Manifest           (strict-table-v1.0.0)
            │
Pure deterministic rules engine          (Kotlin today — reference implementation)
            │
Authoritative match service              (holds AuthoritativeState; emits SeatView / AiSeatObservation)
            │
Presentation adapter                     (Android: Compose + MainViewModel · VR: Unity scene adapter)
            │
Platform input/output                    (Android touch · OpenXR + XR Interaction Toolkit + Meta extensions)
```

The Android app already follows the top three layers:
`engine/` has no Android imports, `MainViewModel` is the only holder of
`AuthoritativeState`, and screens consume `SeatView` only.

### 10.2 Engine language decision — recommendation

The foundation research assumed a C# engine for Unity. The engine now exists
in Kotlin with tests. **Recommendation:** keep the Kotlin engine as the
*reference implementation* and port it to C# for the Unity client, bound by a
**golden replay suite**: a corpus of seeded hands (seed + scripted actions)
whose full audit logs must match byte-for-byte across both implementations.
Any divergence fails CI. This is cheaper than a Kotlin/Native bridge inside
Unity and keeps the rules readable in both codebases.

If a networked service is later built, it runs the Kotlin engine on the JVM
(the reference), and the C# port becomes a client-side predictor/validator
that is never authoritative.

### 10.3 Engine API surface to port

| Function | Purpose |
| --- | --- |
| `createStandardDeck`, `dealHand`, `startNewMatch`, `dealNextHand` | deck and deal |
| `isBidValid`, `isBidHigher`, `submitBid` | auction |
| `selectTrumpAndPickUpKitty(state, seat, trumpSuit)`, `submitKittyDiscard` | contract (direction bound to the bid) and kitty |
| `effectiveSuit`, `governingSuit`, `legalCards`, `rankStrength`, `cardStrength`, `determineTrickWinner`, `playCard`, `collectCompletedTrick` | play and scoring |
| `canRequestVoid`, `requestVoid`, `consentToVoid`, `withdrawVoidRequest` | audited unanimous void |
| `sortHand` | presentation ordering (jokers, trump, then ♠ ♥ ♣ ♦) |
| `projectSeatView`, `projectAiObservation` | information boundary |

### 10.4 Toolchain — provisional

Unity LTS (version chosen at the G1 toolchain gate against the then-current
compatibility matrix), Unity OpenXR, Meta OpenXR package only for required
Quest/MR extensions, XR Interaction Toolkit for grab/ray/UI/haptics/stationary
rig/device simulator, Meta XR Audio SDK. `OPEN`, decision D-04.

---

## 11. Networking (deferred)

Not selected until the local VR hand with three AI seats is trusted. Required
properties regardless of vendor:

- authoritative state on a service, never peer trust;
- per-seat redaction at the service boundary (Chapter 4);
- replayable event log with sequence numbers (the existing `AuditEvent.sequence`);
- reconnect to the current projection without replaying concealed events;
- host succession when the host disconnects;
- invite-code private rooms only; no public discovery, profiles beyond
  essentials, DMs, or voice recording in the MVP.

---

## 12. Asset provenance and rights

`app/src/main/java/com/example/data/AssetProvenanceLedger.kt` — `SHIPPED` as a
display ledger; `SPECIFIED` as a build gate.

**Current entries:** Playfair Display, Plus Jakarta Sans, JetBrains Mono (SIL
OFL 1.1); parlor hero and Bid School illustrations and the launcher emblem
(project-generated originals); procedural audio (no samples); host music
policy (external venue only).

**Ledger record schema (target):** creator · source URL · acquisition date ·
composition rights status · recording rights status · licence/contract
snapshot · permitted uses · territory · term · attribution text · file hash ·
reviewer · build eligibility.

**Build gate:** the VR build fails closed when any bundled asset lacks a
complete record. The Android ledger is a hand-maintained list; the VR
pipeline derives the list from the asset manifest and diffs it.

**Music policy:**

1. Prefer commissioned Black jazz/blues composers and musicians with a written
   assignment or licence covering composition *and* recording.
2. CC0 only when the uploader held both rights.
3. Verified public-domain composition **and** recording, with evidence snapshot.
4. Licensed catalogues checked per track.

"Royalty-free", "non-copyrighted", and a safe file format are not rights
tests. Many pre-1972 recordings are protected under the Music Modernization
Act. Host-supplied music is **external venue playback** in the MVP: the host
plays music in their physical room; the game transmits nothing. Any later
in-room transmission is private-room-only, off by default, host-attested, not
retained, individually mutable, excluded from any recorded/spectated session,
and subject to specialist legal review.

**Cultural assets:** every photograph, voice, name, likeness, sign, pattern,
oral history, or archival element needs a documented source and permission
*before* it enters the ledger.

---

## 13. Testing and acceptance gates

### 13.1 Deterministic tests — `SHIPPED` (26) / `SPECIFIED` (rest)

Shipped in `BidWhistRulesEngineTest.kt` (all pass on a plain JVM):

| Area | Shipped test |
| --- | --- |
| Deal | 54 unique cards across four seats and kitty |
| Auction | Forced dealer bid when three pass |
| Ranking | Downtown A·2…K with jokers top in trump; jokers cannot beat a suited card in NT |
| Follow suit | Restriction when the led suit is held |
| Boundary | Seat view and AI observation share no cards; kitty hidden before the bid; **no seed in any projection string across consecutive hands, and `SeatView` has no seed field** (F-01) |
| Contract | Direction taken from the winning bid for Uptown and Downtown; legacy direction argument cannot override it; suit-bid winner cannot declare No-Trump; NT winner never enters `SELECT_TRUMP`; AI names a suit in its declared direction (F-03) |
| Jokers in NT | Led joker loses to the first suited card, even the lowest; both jokers lose; second player unconstrained, later players must follow the governing suit; `playCard` enforces it; AI follows it; trump contracts unchanged (F-02) |
| Void | Refused once the hand is complete and in `MATCH_COMPLETE`/`VOIDED_HAND`/`IDLE`; pending until South consents; audit records requester, consents, reason; scores unchanged and contract preserved; consent without a request refused; duplicate refused; withdraw clears (F-04, F-05) |
| Whole hand | 150 AI-only hands terminate with 13 books, 48 unique cards, contract bound to the bid, contiguous audit sequence; 120 forced-NT hands never let a joker win a book |

Still required before VR acceptance:

| Area | Test |
| --- | --- |
| Auction | NT outranks suit at equal level; suit does not outrank NT; levels outside 4–7 refused; out-of-turn refused |
| Kitty | Exactly 6 discards; discards never appear in any projection; kitty book credited once |
| Scoring | Made/set for every level; NT doubling; Boston only on 7; game ends at 7; no negative scores |
| Replay | Golden audit logs identical across Kotlin and C# engines for ≥ 1 000 seeds |
| Property | For 10 000 random seeds with random legal actions: no duplicate card, no impossible count, no out-of-turn transition, contiguous audit sequence numbers, termination within 60 transitions |

### 13.2 Human evidence

- Experienced-player council confirms the declared manifest matches the table
  they recognise.
- Usability sessions cover every age band 30–70, headset novices and veterans,
  glasses users, and participants with mobility, dexterity, hearing, or vision
  considerations. Measure bid, play, mistake recovery, captions, one-handed
  use, and comfort — not only "did you like it".
- A beginner completes Bid School and then a normal hand with no facilitator
  taking control.
- A host runs a full event without ever gaining concealed-information or
  committed-deal authority.

### 13.3 Stop or reshape if

- experienced players disagree that the manifest matches real play;
- hand tracking stays unreliable and the controller path is not equally good;
- older or novice participants still need staff intervention after Bid School;
- private voice cannot meet mute/remove/report and privacy needs;
- cultural advisors identify caricature, false history, or unlicensed material;
- networking cannot prove per-seat isolation and replay.

---

## 14. Engine findings register

Found by probe tests run against the engine on 2026-11-20 (JVM, Kotlin 2.2.21).
Each was a difference between the declared rules/boundaries and the code.

| ID | Severity | Status | Finding | Evidence at discovery | Resolution |
| --- | --- | --- | --- | --- | --- |
| **F-01** | Critical for VR/multiplayer | **Fixed** | `SeatView.seed` and the deal audit event (`"… seed #<n> …"`) exposed the shuffle seed; with it the West hand and kitty were reconstructed exactly. | `createStandardDeck().shuffled(Random(view.seed))` reproduced `state.hands[WEST]` and `state.kitty`. | `seed` removed from `SeatView`; audit detail names sizes and manifest only; test `seatView_neverCarriesTheShuffleSeed`. Hash commitment remains D-05. |
| **F-02** | Rules conformance | **Fixed** (D-02) | In No-Trump a *led* joker won the book: all cards scored 0 and `maxBy` kept the first; the null led suit also let anyone play anything. | Trick LJ, A♣, K♣, A♥ under NT → winner South (the joker). | `governingSuit()` = first card with an effective suit; NT jokers score −1; `legalCards`, `determineTrickWinner` and the AI policy all use the governing suit. Tests `noTrump_ledJokerLosesToFirstSuitedCard_whichGovernsTheTrick`, `trumpContract_ledJokerIsStillTopTrump_andFollowersMustPlayTrump`, `forcedNoTrumpHands_neverLetAJokerWinABook`. |
| **F-03** | Rules conformance / exploit | **Fixed** (D-01) | `selectTrumpAndPickUpKitty` accepted any `direction` and `trumpSuit = null`, so a declarer could convert "4 Uptown suit" into "4 Downtown No-Trump", changing the ranking the table bid against and doubling the points. | Won with `Bid(4, isNoTrump=false, UPTOWN)`; contract became `4 Downtown · No-Trump`. | Signature is now `(state, seat, trumpSuit: Suit)`; direction comes from the winning bid; NT winners are refused. AI `chooseTrumpSuit` picks a suit for the bid's direction; UI direction chips replaced by read-only text. Tests `selectTrump_usesWinningBidDirection_andOnlyNamesASuit`, `noTrumpWinner_skipsSelectTrump_andCannotEnterIt`. |
| **F-04** | Role boundary | **Fixed** | `voidCurrentHandAsHost` had no phase guard and no consent record; the role check lived only in `MainViewModel`. | Void accepted in `BIDDING` with no consent data. | `VoidRequest` in state; `requestVoid` / `consentToVoid` / `withdrawVoidRequest`; applied only when unanimous among human seats; refused outside live phases; audit records requester, consents, reason. Tests `void_*`. Service-side *role* verification remains `SPECIFIED` (Chapter 5). |
| F-05 | Minor | **Fixed** | The void outcome fabricated a placeholder `Contract(dealer, 4, null, UPTOWN)` when no contract existed, and set `pointsAwardedTo = US` on a voided hand. | Code read. | `HandOutcome.contract` and `pointsAwardedTo` are nullable; a voided outcome carries the agreed contract (or none) and the `VoidRequest`. UI renders "No contract" and no award. |
| F-06 | Hygiene | **Fixed** | `.gradle/` build state (≈1.2 MB of binaries) was committed although `.gitignore` targets build output. | `git ls-files .gradle`. | `.gradle/` added to `.gitignore` and removed from the index. |

Positive results worth keeping: AI-vs-AI hands terminate with 13 books and 48
unique played cards each; the whole suite runs on a plain JVM with no Android
SDK, confirming the engine is genuinely platform-free.

---

## 15. Open decisions

Carried from the foundation research committee packet and refined by the
findings above. Each needs one owner decision; the Codex records the current
recommendation.

| ID | Decision | Recommendation |
| --- | --- | --- |
| D-01 | Are direction and Trump/No-Trump binding from the auction, with only the suit named afterwards? | **Decided yes** (owner, 2026-11-20); implemented, see F-03. Rules council may still confirm against the house tables they know. |
| D-02 | May a joker be led in No-Trump, and what does it do? | **Decided yes** (owner, 2026-11-20): lead allowed, joker loses to any suited card, first suited card sets the suit; implemented, see F-02. |
| D-03 | Which experienced-player council approves `strict-table-v1.0.0`? | Convene a compensated council of 5–7 players across regions and family traditions, separate from the usability panel. |
| D-04 | Unity/OpenXR as provisional toolchain, with Kotlin engine as reference and C# port under golden replay? | **Yes**, pending a compatibility spike at G1. |
| D-05 | Publish a deal commitment hash for post-hand fairness verification? | **Yes, after F-01 is fixed**; cheap and legible to players who ask "was that deal fair?" |
| D-06 | Is external venue music accepted for the MVP, with in-room transmission deferred? | **Yes.** |
| D-07 | Which accessibility paths are launch gates? | The gate rows in Chapter 8; everything else is a later enhancement. |
| D-08 | What evidence advances the project from local VR hand to private multiplayer? | All Chapter 13.1 tests green including replay and boundary tests, plus the Chapter 13.2 human evidence. |
| D-09 | First room and emotional tone? | One contemporary family/community room; warm, lived-in, unhurried. Art direction with community review before any asset is commissioned. |

---

## 16. Glossary

| Term | Meaning |
| --- | --- |
| **Book** | A trick (four cards, one from each seat). Thirteen books per hand including the kitty book. |
| **Boston** | Declarer's partnership takes all 13 books. Scores 14 on a 7 bid in this preset. |
| **Declarer** | The seat that won the auction; names trump, takes the kitty, leads trick 1. |
| **Downtown** | Low-card ranking: Ace, then 2 strongest down to King. |
| **Forced dealer bid** | When the first three seats pass, the dealer must bid at least 4. |
| **Kitty** | Six face-down cards dealt aside; delivered privately to the declarer, who lays down six. |
| **Manifest** | The versioned, plain-language rules preset acknowledged before play. |
| **No-Trump** | Contract with no trump suit; points double; jokers have no suit. |
| **Projection** | A redacted view of the authoritative state for one seat (`SeatView`, `AiSeatObservation`). |
| **Set** | Declarer's side fails to make the contract; the opponents score the bid. |
| **Table Host** | A human with between-hand event controls and no card authority. |
| **Uptown** | High-card ranking: Ace down to 2. |
| **Us / Them** | South + North / West + East. |

---

*Sources for the product frame, accessibility baseline, and rights policy are
recorded in the foundation research packet in the repository history
(`director/research/2026-08-24-foundation-research.md`, commit `c961309`).*
