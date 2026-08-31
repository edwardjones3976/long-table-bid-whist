<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:31 UTC | BEGIN]] -->
# Claude XR-test correction — terminal OpenAI rejection

## Disposition

`OPENAI_CHANGES_REQUIRED_PROTOCOL_AND_TEST_ORACLE_FAILED`

Claude was contacted again under `LT-NATIVE-CLAUDE-XRTEST-002`. The final
transport reached authenticated Claude Fable 5 and produced one exact local
commit, but the immutable candidate fails the packet and the authoritative XR
automation gate. The commit is provenance-frozen and receives simple/1 overall
effort, zero direct-production credit and no product acceptance.

## Transport and provider identity

- Worktree: `C:\Users\edwar\.codex\worktrees\long-table-claude-xrtest-002`
- Branch: `codex/claude-xrtest-002`
- Claude CLI: `2.1.251`, first-party authenticated Max subscription
- Model: `claude-fable-5`, high effort
- Provider session: `cdb43d40-825a-48d8-ba92-6be0829a927e`
- Result UUID: `14f222c1-10ea-40a3-a949-37622c1b1730`
- Final assistant record UUID: `e3722285-a223-4b56-b105-c53850885858`
- Final assistant text: 8,079 UTF-8 bytes, SHA-256
  `e55478c482c2bd56c51a97272e0fa79b2f6b8ba86ad636c7ef0f7f27e61d5c20`
- Local session JSONL SHA-256:
  `ad8b65a1d59b99d0647315cca653e639d0e6b9478a769ebfd5edaa3e424d1566`
- Provider-reported duration/cost: 93.444 seconds / USD 1.583186

The primary stopped locally before model execution because the explicit empty
MCP object lacked the required `mcpServers` record. The single recovery also
stopped before provider execution because the local CLI validator does not
support the authority contract's JSON Schema draft. The global third-attempt
rule permits a materially different route when new transport information is
available, so the same assignment was sent through Claude's normal JSON
envelope with the frozen result contract retained in the prompt. That request
reached the provider and completed. There was no ambiguous duplicate paid
dispatch. However, the sequence-22 packet itself authorized only one primary
and one transient recovery, and no materially-different-transport delta was
committed before the third launch. This is a control-binding defect and is part
of the terminal rejection; it is not repaired retroactively here.

## Exact candidate

- Base and sole parent: `33aca6106603342efcf43fb813482cb18fd4b18c`
- Base tree: `04f65bc3c72202977312cb38bc039460545daeec`
- Candidate: `0d397d51deef9784400b9e6f90132309bedb71d4`
- Candidate tree: `dbe19eaa3575327848ff3d8f64c8ae53b0e39207`
- Changed path: only
  `Unreal/Plugins/LongTableXR/Source/LongTableXR/Private/Tests/LongTableXRTests.cpp`
- Diff: 10 insertions, 0 deletions
- Mode: `100644` to `100644`
- Blob: `a17ff010bfae135be5f27796fcdd34b76f1601c7` to
  `0249b2c49cc86097e7c49f68383191f653032899`
- Line endings: LF preserved; `git diff --check` passed
- Candidate worktree was clean before OpenAI build/test. The ignored/untracked
  UE build outputs created afterward are not candidate bytes.

## OpenAI findings

1. The required stale `DecodeOut == Baseline` assertion after the exact-maximum
   `InteractionId` decode remains in the file. Claude added a correct immediate
   snapshot assertion next to it, but the stale assertion still deterministically
   fails because the accepted exact-maximum decode already changed
   `DecodeOut.InteractionId`.
2. The same defect remains after the exact-maximum `TargetHandle` decode. The
   newly added immediate-snapshot assertion does not remove the preceding stale
   baseline failure.
3. The new above-maximum `ConfirmGeneration` rejection and immediate-snapshot
   unchanged-output check are correct.
4. The provider result is not one standalone schema-valid
   `model-result-packet-v1` object. It contains prose and a fenced object, uses a
   non-authoritative top-level shape/status and omits required contract fields.
5. The provider explicitly reports reading
   `LongTableXRValidation.h`, outside the sole readable/writable test file. The
   packet prohibited that repository read. No production byte was edited.

Independent static review reached `CHANGES_REQUIRED` before executable
acceptance. OpenAI nevertheless ran the exact focused gates to bind the terminal
decision to real UE evidence.

## Authoritative gates

- UE 5.7.4 `LongTableEditor Win64 Development` build at candidate SHA:
  **PASS**, exit 0. Build-log SHA-256:
  `95b677ae22ae6f83b45ecb7a153cdec99c6a3634e6c6c9a8364bf40be26ded70`.
- `Automation RunTests LongTable.XR`: **FAIL**, 9 succeeded, 1 failed,
  0 not run. Report SHA-256:
  `33481ce50c166e3d8971f66a09e96e0bb89db515f58312fc8b78166c91017606`.
- Captured automation stdout SHA-256:
  `77b9ad23a102a8ff24bc31c2544435c374e5c59939a8f189d9f5fd8ba70e2b66`.
- Failed test: `LongTable.XR.SemanticParity`.
- Exact errors:
  - `Expected 'out unchanged after above max interaction id' to be true.`
  - `Expected 'out unchanged after above max target handle' to be true.`

## Workload and next route

Terminal provider execution records sequence 22 once at simple/1. The completed
window becomes 18 of 20 and 87 points: Claude 33, Cursor 20, Grok 18, OpenAI 5,
Gemini/Antigravity 11 and Perplexity 0. Claude is 37.93%, inside its 33-39%
normal band. Direct-production credit remains zero.

No fourth Claude contact, same-assignment revision or OpenAI source edit is
permitted. A new Antigravity simple/1 fallback may remove only the two proven
stale assertions in a disposable one-file worktree. If it executes terminally,
Antigravity projects to 12/88 = 13.64%, inside its 8-14% normal band and below
its 16% hard ceiling. OpenAI retains exact-diff, build, automation and
acceptance authority.

This result proves neither a combined product candidate nor Android, Quest
device, two-device, human, accessibility, cultural, rights, store, merge or
release acceptance.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:31 UTC | END]] -->
