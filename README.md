<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:15 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:06 UTC | BEGIN]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 20:53 UTC | BEGIN]] -->
# The Long Table — Bid Whist

An authentic VR/MR recreation of Bid Whist centered on deterministic rules,
inhabited table presence, respected house rules, accessible interaction, and
dignified cultural specificity.

The project is currently a **reshaped technical prototype**. A local production
build can complete a deterministic hand from auction through scoring in either
AI Dealer or Human Host presentation. It becomes a `REVIEW_READY` candidate
only after exact-SHA review; final `COMPLETE` remains gated on human acceptance.

## Run the prototype

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

The ChatGPT-synced `sources/` directory and its local `AGENTS.md` are excluded
from this repository and remain read-only reference material.
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 20:53 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:06 UTC | END]] -->
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 21:15 UTC | END]] -->
