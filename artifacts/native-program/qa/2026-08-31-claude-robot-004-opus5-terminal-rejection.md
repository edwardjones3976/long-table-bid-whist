<!-- [[OpenAI Director | Codex | 2026-08-31 | 19:17 UTC | BEGIN]] -->
# Claude RobotDealer sequence 28 — Opus 5 terminal rejection

## Verdict

`OPENAI_CHANGES_REQUIRED_OPUS5_SOURCE_DELIVERED_WRITER_LEASE_CLOSED`

The owner-selected Claude desktop-app route visibly ran as **Opus 5 High** and
returned one source-only ZIP with exactly the frozen eight entries plus a
separate JSON result. OpenAI preserved and mechanically materialized those
exact provider bytes on the accepted foundation without correcting product
source. Static archive, encoding, descriptor, closed-vocabulary, structural
privacy and no-bundled-media gates pass.

The candidate is rejected. UE5.7 fails during header discovery because the
new plugin duplicates the accepted foundation's
`LongTableRobotDealerPresenter.h` name and global
`ULongTableRobotDealerPresenter` class. Independent source review also finds
a reentrant Resume/Reset ordering defect and missing native/dynamic callback
regressions. The returned JSON is generically schema-valid but retains the
earlier app-Recovery-1 idempotency, source-event and `claude-fable-5` fields,
so it does not bind to the final Opus delta. No direct-production point,
integration, product PR, merge or release is accepted.

## Provider and transport evidence

- Claude task: `Director Recovery 1 delivery`
- Input archive:
  `LT-NATIVE-CLAUDE-ROBOT-004-app-recovery1-input.zip`
- Input bytes/SHA-256: `19,988` /
  `835587517fbc26355981c8035edbddccf9f101adfafed0ce1a5fe1f18db50a95`
- Final visible model selection: `Opus 5 High`
- Opus submissions: `1`
- Provider service contacts across sequence 28: `3`
- Completed model requests/inference contacts: `1` / `1`
- CLI provider-process launches: `1`
- Terminal pre-model Fable results: `2`
- Source revisions: `0`
- Further Claude contacts authorized: `0`

The provider result is preserved at
`artifacts/native-program/providers/LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-app-opus5-final-result.json`.
The canonical JSON copied from the UI is 17,412 UTF-8 bytes after LF
normalization with no terminal LF, SHA-256
`78c8b0b91bb2a028c78bf1386e01c471e5e5e1a3a3c98321559ebbe3d797922d`.
The repository evidence copy adds one final LF and is 17,413 bytes, SHA-256
`56453f30e5b407e403d5e3c6b858598439a98431fef8613a1c6a739df6efa480`.

Generic `model-result-packet-v1` schema validation passes. Final-delta binding
does not:

| Field | Final Opus authority | Raw returned value | Result |
| --- | --- | --- | --- |
| Idempotency | `LT-NATIVE-CLAUDE-ROBOT-004-a5ffeb9-SEQUENCE28-APP-OPUS5-FINAL` | `LT-NATIVE-CLAUDE-ROBOT-004-a5ffeb9-SEQUENCE28-APP-RECOVERY1` | mismatch |
| Source event | `owner-explicit-opus5-switch-20260831` | `owner-explicit-claude-app-primary-20260831` | mismatch |
| Model evidence | visible `Opus 5 High` selection | `usage.model=claude-fable-5` | stale/inconsistent |
| Token usage | real terminal inference occurred | null input/output/total fields | unknown, not zero |

The raw fields are not normalized or rewritten. The frozen source contribution
markers intentionally remain `Claude | Fable 5` because those exact bytes are
a public contract fixture; they are source-marker compliance, not proof of the
serving model.

## Exact source archive

- Downloaded ZIP:
  `C:\Users\edwar\Downloads\LT-NATIVE-CLAUDE-ROBOT-004-app-recovery1-delivery.zip`
- Bytes: `25,651`
- SHA-256:
  `7ee20299a02972f2fcca49b0539449499bc384f45a28e972f6ab2bfa78045abc`
- Entry count: exactly `8`
- Manifest:
  `artifacts/native-program/providers/LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-app-opus5-final-delivery-manifest.json`

Every entry is strict UTF-8, no BOM, LF-only and ends in exactly one LF. Paths
are exact, relative and collision-free; no wrapper, directory entry, duplicate,
case collision, traversal, drive prefix, symlink, reparse entry, encryption or
CRC failure exists. The descriptor has exactly the frozen eleven properties,
`EnabledByDefault=true`, one `Runtime/Default` module and only
`Core`, `CoreUObject` and `Engine` dependencies. All fifteen frozen test
IDs exist exactly once.

Structural privacy is positive and closed: the runtime ABI is limited to
numeric, enumeration and Boolean fields. No regex, blacklist, substring
redaction, serialize-then-delete, file, network, account, telemetry, media,
music, voice, URL or third-party capability exists. No jazz, blues or any other
music, voice, image, model, texture, likeness or media asset is bundled.

## Mechanical materialization and reproduced checks

- Accepted foundation:
  `4d26680fb99abacb20ecb18807b7c8833646cfa3`
- Accepted foundation tree:
  `1e0db56f1e85d66c93ab64bc3dca8c237947c210`
- Isolated QA branch: `codex/claude-robot-qa-004`
- Mechanical candidate:
  `d6389eb393770fd3b28976627a79a9856b9aa95c`
- Candidate tree:
  `e3af3f70bc205ccba806bab9a3cb728875b262c4`
- Candidate parent: exactly the accepted foundation
- Candidate diff: exactly the eight archive paths with byte-for-byte identity
- Candidate status after materialization: clean

Reproduced gates:

- TypeScript/Vitest: `219/219 PASS`
- Strict native TypeScript compile: `PASS`
- Public-fixture current check: `11/11 PASS`
- Production web build with exact candidate SHA: `PASS`
- UE5.7 `LongTableEditor Win64 Development`: `FAIL` during UHT
- UE5.7 game target: `NOT_RUN` after the mandatory editor-build gate failed
- Focused `LongTable.RobotDealer` automation: `NOT_RUN`
- Full `LongTable` automation: `NOT_RUN`
- Android/Quest/device/human tests: `NOT_RUN`

The UBT log is
`C:\Users\edwar\.codex\worktrees\long-table-claude-robot-qa-004\scripts\native\logs\ubt-LongTableEditor-Win64-Development.log`,
1,555 bytes, SHA-256
`64ed75b4a1c221e8764baa8122bdf3baeea2e035bc141c66720bf523cb714408`.
UHT reports two headers with the same name:

- accepted foundation:
  `Unreal/Source/LongTable/Public/LongTableRobotDealerPresenter.h`
- candidate plugin:
  `Unreal/Plugins/LongTableRobotDealer/Source/LongTableRobotDealer/Public/LongTableRobotDealerPresenter.h`

Both surfaces also declare the global reflected class
`ULongTableRobotDealerPresenter`. Renaming only the file would therefore be
insufficient. The frozen clean-room inventory/public API conflicts with the
accepted base and must be revised by Director authority before another provider
can produce an integrable implementation.

## Independent source findings

### P1 — reentrant Resume/Reset ordering

When paused work exists, a native callback can submit Resume and the later
dynamic callback can submit Reset. The pending application order becomes
`[Resume, Reset]`. Resume removes the paused FIFO and appends it after already
pending work, producing `[Reset, queued ordinary]`. Reset emits neutral state,
then the old ordinary cue emits afterward and overwrites that neutral state.
This violates both “Resume then drains” and “Reset clears queued presentation
work.”

The Resume-plus-paused batch must be transferred atomically ahead of later
reentrant controls, or an equivalent ordering design must preserve accepted
FIFO semantics while allowing Reset to clear every still-pending presentation
cue.

### P2 — callback seam is untested

The tests bind only the native delegate. They reflect that the dynamic
`OnCueApplied` property exists but never attach a dynamic UObject/UFUNCTION
receiver, compare native-first/dynamic-second same-copy history, or submit
reentrant work from both callback types. The frozen fifteen-ID inventory needs
real regression scenarios for this seam rather than a property-existence check.

## Workload and closure

This is one real terminal Claude medium/5 execution, so sequence 28 earns five
overall-effort points once and zero direct-production points. Sequence 3
`LT-NATIVE-CLAUDE-001` long/8 rolls out. The current 20-assignment window is
80 points:

| Provider | Points | Share | Normal band | Hard ceiling | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 27 | 33.75% | 33–39% | 41% | normal/hard pass |
| Cursor | 20 | 25.00% | 17–23% | 25% | 2 points above normal; exactly at hard ceiling |
| Grok | 18 | 22.50% | 17–23% | 25% | normal/hard pass |
| OpenAI | 5 | 6.25% | 5–11% | 13% | normal/hard pass; QA only |
| Antigravity | 4 | 5.00% | 8–14% | 16% | 3 points below normal; hard pass |
| Perplexity | 5 | 6.25% | 1–7% | 9% | normal/hard pass; research only |
| GitHub Copilot CLI | 1 | 1.25% | 0–4% | 6% | normal/hard pass |

Every target-plus-five hard ceiling passes, but the window is not fully inside
normal tolerance because Cursor and Antigravity miss normal. The writer lease
and all Claude routes are terminal closed. A further Claude resend is
prohibited. Direct-production remains a one-point warming ledger from accepted
sequence 19 only.

The next implementation assignment requires a revised, non-colliding public
inventory/class contract and a fresh workload preflight. OpenAI will not rename
the provider's product symbols or repair its state machine under QA authority.

## Milestone boundary

Sequence 28 does not complete the standalone RobotDealer gate or First Deal.
Composition, visible robot embodiment, game authority integration, Android,
physical Quest, hands/controllers, Meta avatar/presence, two-device privacy,
performance, accessibility, human, cultural, rights, Store, merge and release
gates all remain open.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 19:17 UTC | END]] -->
