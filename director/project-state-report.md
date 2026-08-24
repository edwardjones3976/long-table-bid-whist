<!-- [[Codex | GPT-5.6 | 2026-08-24 | 23:13 UTC | BEGIN]] -->
# Project state report

- **Project:** The Long Table — Bid Whist
- **Lifecycle state:** Technical Candidate binding
- **Maximum current verdict:** `REVIEW_READY`
- **Final verdict:** not `COMPLETE`; human testing and owner acceptance remain required
- **Repository:** `edwardjones3976/long-table-bid-whist`
- **Branch:** `main`
- **Base SHA:** `c9613093af704fdd3e4bedf87bdf375e15d03f00`
- **Candidate SHA:** pending the immutable implementation commit

## Delivered candidate

The local React/TypeScript prototype now completes a deterministic four-seat
Bid Whist hand from auction through declaration, kitty/discard, twelve tricks,
scoring, summary, pause/resume, and the next-hand boundary. It supports AI
Dealer and Human Host presentation without granting either role hidden-card,
deal-edit, bid-edit, trick-edit, or score-edit authority.

The room contains three open seats and no built-in human cast. The target Quest
product will use each participant's own Meta avatar; Meta Avatar SDK integration
is explicitly not present in this browser candidate. The AI Dealer uses a small,
clearly non-human robot marker. Foundational Black American influence remains
light and environmental through hospitality, social energy, wood, felt, brass,
and restrained room tone rather than assigned bodies, dialect, or stereotype.

No music, recording, sample, voice, upload, stream, or rebroadcast path ships.
Host music stays off inside the prototype and points physical events to
independently rights-cleared external playback. File format is not treated as
rights clearance.

## Heavy-test evidence

- `npm.cmd test`: 46 of 46 tests passed across 11 files.
- `npm.cmd run build`: TypeScript and Vite production build passed.
- Live Browser run: bid preview/cancel, 5 High, Spades, exactly six kitty cards,
  twelve player turns, six-book set result, score transition, pause/resume, and
  next-hand enablement completed with no console warning or error.
- Responsive evidence: native 1672 × 941 desktop and 390 × 844 mobile captures;
  1280 × 720 live flow completed after the Host-drawer action-clearance fix.
- Production build and room hashes are recorded in
  `artifacts/technical-candidate-build.sha256`.

## Provider participation and workload

The canonical direct-production target remains Claude/Cursor/Gemini/
Perplexity/external OpenAI `60/28/7/4/1`. Actual completed direct production for
this owner-accelerated cycle is `0/0/0/0/100`. Claude failed before a model
response because its OAuth token was expired; Cursor required authentication;
Gemini/Antigravity was absent; Perplexity CLI had no approved credential. No
failed lane receives position, vote, rebuttal, research, review, cost, or
production credit. OpenAI Director/control-plane work remains excluded.

## Open gates and handoff

1. Bind the implementation commit, artifact digest, and evidence-only head.
2. Obtain a different authenticated provider's exact-candidate review; a same-
   provider subagent audit is useful QA but not independent acceptance.
3. Run experienced Bid Whist, beginner, accessibility, event-host, and
   Foundational Black American community/advisor human sessions.
4. Kick back any rules, concealed-information, host-authority, rights, cultural,
   severe accessibility, or safety failure. Otherwise record owner acceptance
   before issuing `COMPLETE`.

No public deployment, shared-audio transmission, provider login, credential
change, purchase, or paid provider run was performed.
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 23:13 UTC | END]] -->
