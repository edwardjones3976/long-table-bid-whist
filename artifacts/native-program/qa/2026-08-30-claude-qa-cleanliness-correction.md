<!-- [[OpenAI QA | Codex | 2026-08-30 | 08:11 UTC | BEGIN]] -->
# Claude `af199d0` QA-worktree cleanliness correction

## Finding

The provider source worktree remained clean at exact candidate
`af199d0d492a8ec8db63a013877af5c4349a30dd`, tree
`ef09e38a72e11993d269653a9ae55f5215d8ae70`. A later read-only audit found that
the detached OpenAI QA worktree contained one untracked generated file:
`Unreal/Config/DefaultInput.ini`.

- Created and last written: `2026-08-30T06:42:36Z`
- Size: 9,106 bytes
- SHA-256:
  `05CC777EAF15BFC20F234C39196737B098102583CC05C35912E05A39BE8CF919`

The file predated the `06:55 UTC` QA report and was in a runtime-loaded Unreal
configuration path. The earlier Unreal build and automation results are
therefore retained only as useful diagnostic evidence; they are not treated as
independently clean exact-candidate acceptance evidence. This does not alter the
existing `CHANGES_REQUIRED` verdict or award any production credit.

## Recoverable correction

OpenAI verified that the resolved source was inside the exact detached QA
worktree, then moved the untracked file—without deleting it—to:

`C:\Users\edwar\.codex\provider-qa\quarantine\lt-claude-af199d0-DefaultInput-20260830T081115Z\DefaultInput.ini`

After the move, the detached QA worktree reported no tracked or untracked
change and remained at the exact head/tree above. Claude R1 will require a new
clean frozen QA checkout and fresh cumulative validation; no prior Unreal run
may substitute for that gate.

<!-- [[OpenAI QA | Codex | 2026-08-30 | 08:11 UTC | END]] -->
