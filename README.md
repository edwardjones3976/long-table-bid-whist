<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:15 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:06 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 20:53 UTC | BEGIN]] -->
# The Long Table — Bid Whist

An authentic VR/MR recreation of Bid Whist centered on deterministic rules,
inhabited table presence, respected house rules, accessible interaction, and
dignified cultural specificity.

This repository holds three pieces of that work:

- the **mansion multiplayer app**, a browser and VR card room (`client/`, `server/`, `shared/`);
- the **browser prototype**, the single-player rules and interaction proof it grew from (`src/`);
- the **Android app**, a four-seat Bid Whist table in Kotlin and Jetpack Compose (`app/`).

## Mansion multiplayer app

A browser and VR multiplayer card app (Tonk, Spades, Bid Whist) in a walkable
mansion, with a server that deals and checks every move. The single-player
prototype described below is kept unchanged. Full guide:
[docs/mansion-app.html](docs/mansion-app.html).

AI coding agents that work on this app start with [AGENTS.md](AGENTS.md); the
longer workspace guide is [docs/workspace.html](docs/workspace.html).

```
npm ci
npm run dev:server    # terminal 1: http://localhost:3000
npm run dev:client    # terminal 2: open http://localhost:5173
npm run build && npm start    # one process: open http://localhost:3000
npm run dev:xr        # headset on the LAN, with dev:server: https://<PC LAN IP>:5173
npm run typecheck && npm test
npx playwright install chromium-headless-shell   # once
npm run test:e2e
```

## Browser prototype

The prototype is a **reshaped technical prototype**. A local production
build can complete a deterministic hand from auction through scoring in either
AI Dealer or Human Host presentation. It becomes a `REVIEW_READY` candidate
only after exact-SHA review; final `COMPLETE` remains gated on human acceptance.

```powershell
npm install
npm test
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/`. The current candidate includes the Strict Table
54-card rules kernel, seeded replay, legal-information AI, bid/declaration/
kitty/play/score interactions, responsive seated-room UI, AI Dealer and Human
Host modes, captions, reduced motion, high contrast, card scaling, and explicit
commit controls.

This is a browser interaction and rules proof—not a native Quest build, real
multiplayer room, production concealed-state security boundary, Meta Avatar SDK
integration, or completed cultural/human acceptance study.

## Android app

An authentic, accessible four-seat **Bid Whist** Android application built with **Kotlin** and **Jetpack Compose (Material 3)**.

### Features

- **Deterministic Strict Table Rules Engine (`strict-table-v1.0.0`)**:
  - 54-card deck (52 standard cards + Big Joker and Little Joker), 12 cards per seat, and a 6-card Kitty.
  - Full auction (`4–7` books, `Uptown` / `Downtown` direction, `No-Trump` outranking suit bids at the same level, forced minimum dealer bid of 4).
  - Exact Downtown ranking (Ace high, 2 second strongest down to King), Joker behavior in Trump vs. No-Trump, Kitty 13th-book credit, and Boston (`+14`) / No-Trump (`2×`) scoring.
- **Concealed-Information Isolation & Role Separation**:
  - Authoritative rules engine projects strictly redacted `SeatView` (South) and `AiSeatObservation` (West, North, East) states.
  - Distinct **Seated Player** and **Seated Player + Table Host** modes with between-hand pause, AI tablemate presets, table-talk tone (`Quiet`, `Social`, `Lively`), and audited unanimous voids — without exposing concealed hands.
- **Bid School Interactive Trainer**:
  - 4 guided lessons covering tricks/books, Uptown vs. Downtown & Joker order, bidding & Kitty discards, and guided table play.
- **Accessibility & Comfort Calibration**:
  - One-handed commit button alignment (`Left-Handed` / `Right-Handed`), scalable cards (`Standard`, `Large`, `Extra Large`), Two-Step Card Commit (`Select → Preview → Commit`), 4-color high-contrast suit badges, live table captions (100% playable without audio), reduced motion, and procedural sound taps.
- **Rights & Asset Provenance Ledger**:
  - Transparent asset registry for bundled fonts, original illustrations, procedural PCM audio, and an external venue music policy.

### Build & Test

- Compile APK: `gradle assembleDebug`
- Run deterministic rules tests: `gradle :app:testDebugUnitTest`

## VR Codex

[`docs/BID_WHIST_VR_CODEX.md`](docs/BID_WHIST_VR_CODEX.md) is the reference for carrying the table to a seated VR/MR experience: the enforced Strict Table rules, state machine, information boundaries, role permissions, VR interaction spec, accessibility gates, rights policy, acceptance tests, a register of engine findings, and the open decisions. [`docs/VR_TOOLCHAIN.md`](docs/VR_TOOLCHAIN.md) pins the Unity 6.3 LTS / OpenXR / Meta Quest toolchain with verified sources and the compatibility-spike checklist. [`docs/RULES_COUNCIL_BRIEF.md`](docs/RULES_COUNCIL_BRIEF.md) is the brief for the experienced-player Rules Council that reviews the Strict Table rules. [`docs/ACCESSIBILITY_GATES.md`](docs/ACCESSIBILITY_GATES.md) defines the thirteen accessibility and comfort launch gates with their pass/fail criteria and verified sources.

## Avatar and cultural direction

The Long Table has no built-in human cast. In the target Meta runtime, every
occupied human seat is represented by that participant's own Meta avatar; the
game does not substitute a stock demographic character or culturally coded
body. The AI dealer may be embodied as an unmistakably non-human robot.

Foundational Black American influence should be felt lightly through the
gathering itself: warm hospitality, lively social energy, tactile room
materials, and original or documented rights-clean ambience. It is never
assigned to bodies, costumes, dialect caricatures, gestures, or stereotypes.

The current local browser prototype is a gameplay and room-composition study.
It does not integrate the Meta Avatar SDK and intentionally renders the other
seat positions open. Both shipped room images now contain open seats only. They
establish layout, lighting, and mood while leaving participant identity to the
future Meta-avatar runtime.

## Director workflow

Project coordination is defined in [`director/`](director/README.md) using the
modular bootstrap protocol from
[`edwardjones3976/director-orchestrator`](https://github.com/edwardjones3976/director-orchestrator),
pinned to commit `ed02458d5c425115e49b330ed1f6cdc1d9af1ce6`.

The current Codex project task is the coordination surface. No Slack dependency
is required. External provider spending remains disabled; local project work and
pushes to this private repository are authorized.

### Workload contract

OpenAI owns the full Director/control-plane function; that continuous work is
not counted as direct production. Direct-production routing follows the
canonical target: Claude 60%, Cursor 28%, Gemini/Antigravity 7%, Perplexity 4%,
and a separately owner-authorized external OpenAI/Codex lane at 1%. The Director
must never emit itself as a specialist assignment target.

Coordination capacity targets 95% productive work with a 5% reserve for checks,
drift, evidence gaps, recovery, and infrastructure variance.

The complete eight-area responsibility standard, provider boundaries, debate
separation, research provenance requirements, and review-independence rules are
defined in [`director/roles-and-responsibilities.md`](director/roles-and-responsibilities.md).

## Content policy

No unlicensed third-party content may ship. Music, including jazz- and
blues-influenced material, must have documented authority for both the musical
composition and sound recording. Host-supplied audio is not considered safe
merely because it uses a supported file format.

## Local project boundary

The ChatGPT-synced `sources/` directory is excluded from this repository and is
read-only reference material. `AGENTS.md` is tracked and holds the rules for AI
agents; if a sync replaces it, restore it with `git restore AGENTS.md` before
committing.
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 20:53 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:06 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:15 UTC | END]] -->
