# Pre-stage and rules of engagement — Technical Candidate

## Frozen contracts

1. **Launch Rules Manifest v0:** `STRICT_TABLE_RULES`, a Pagat-derived 54-card
   preset with four fixed seats, twelve cards each, six-card kitty, one-round
   3–7 High/Low/No-Trump auction, forced dealer, explicit declaration, follow
   suit, twelve tricks, kitty book, deterministic scoring, and seeded replay.
2. **Role permissions:** The rules engine owns shuffle, deal, legality, trick
   winner, and score. AI players receive only their hands plus public state. AI
   Dealer announces and paces. Human Host manages invite simulation, mute,
   between-hand pause, and external music guidance—never concealed or committed
   game state.
3. **Identity/presentation:** Human seats use participant-owned Meta avatars in
   the target Quest runtime. The browser candidate leaves them open. A visible
   AI dealer is non-human/robotic. Cultural influence is environmental only.
4. **Rights:** Generated room art is original project material. Cards and UI are
   code-native. No music or voice recording ships. Host audio is off/external;
   virtual upload, streaming, recording, and rebroadcast are deferred.

## Technical and authority boundary

- Repository/worktree/branch/base: `edwardjones3976/long-table-bid-whist` /
  current explicit Windows worktree / `main` /
  `c9613093af704fdd3e4bedf87bdf375e15d03f00`.
- One writer per surface; completed same-provider subagents relinquish their
  leases before integration. `sources/` and `AGENTS.md` remain read-only.
- No secrets, tokens, cookies, private browser state, or unrelated project data
  enter prompts, artifacts, logs, or the repository.
- Provider attempts: one bounded run, one deterministic minimal-fix retry only,
  `$0` incremental spend, no login/credential changes, no duplicate ambiguous
  dispatch.
- No assignment grants merge, deployment, publication, public-room, purchase,
  permissions, shared-audio, or final-acceptance authority.

## Match and audit model

The current browser candidate is a local deterministic simulation. Its seat
projection and DOM prove logical redaction intent, not adversarial client or
server security. Production multiplayer must move root state, deck authority,
event ordering, reconnect, and AI substitution to a server-controlled process.

## Testing and acceptance

- Automated: full rules/AI invariants, replay, 64 seeded hands, component and
  integration flows, TypeScript compilation, and production bundle.
- Manual browser: fresh setup, AI Dealer/Human Host, bid/confirm, declaration,
  six-card kitty, legal play, two complete hands, terminal scoring, desktop and
  390×844 responsive checks, DOM/accessibility tree, and console review.
- Any candidate change invalidates candidate-bound review and screenshot
  evidence. Rebuild and rerun the affected gate.
- The technical candidate may become `REVIEW_READY` but never `COMPLETE` before
  different-provider review and human acceptance.

## Rollback and serious safety stop

The candidate remains a Git-bound, local-only artifact with no deployment.
Rollback is a new reviewed commit that restores the last accepted exact SHA;
never rewrite unrelated user work. Stop immediately on card leakage, scoring or
replay divergence, host control of committed play, unlicensed content, fixed
human casting, credential ambiguity, unexpected cost, or cultural harm.
