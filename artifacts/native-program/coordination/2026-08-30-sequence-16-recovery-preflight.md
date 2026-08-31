# Sequence 16 recovery launcher preflight

- Checked at: `2026-08-30T17:47:01.9610887-07:00`
- Launcher: `director/native-program/run-claude-replacement-003-recovery.ps1`
- Launcher SHA-256: `62a7b41886007cf446b159cd6dc0fcfbbf1bcc24dc98c7fb4c19d86205786ab2`
- Control HEAD at check: `e32de2892238608b6c2127cb3f7b46d1d03d6553`
- Provider HEAD: `623ca52c5679b5348630f86eb88ecd48c9db82a1`
- Provider tree: `746fc5ac7234fa49adaa728262e95745aee52755`
- Provider partial SHA-256: `3de9147d2e0d115b2d028ec6825391970b961c8960849e74da3cd6616f455feb`
- Result-schema authority: Director commit
  `cc791364e2f1ff1ac4c72e01c7122296e4ff7362`, canonical blob
  `ea3dbdf577b757a492ec4fcd53617a0fd9270800`
- Authenticated route: first-party `claude.ai` Max
- Required model/effort: `claude-fable-5` / `max`
- Preflight result: `PRECHECK_OK`
- Recovery reset: `2026-08-30T19:00:00-07:00`
- `ready_for_full_recovery`: `false` only because the check preceded the reset

Two earlier dry runs failed closed before provider contact:

1. The launcher normalized `git status` whitespace but its expectation did not;
   the comparison was corrected without changing the provider state.
2. A clean exact-commit schema checkout used CRLF worktree bytes while the
   earlier frozen SHA described LF bytes. Both normalized to the same canonical
   Git blob. The launcher now verifies the exact Director HEAD/tree, clean
   status and canonical schema blob instead of accepting either raw working-tree
   byte form silently.

Neither dry-run failure contacted Claude, consumed provider quota, changed the
provider worktree, or counted as an assignment attempt. The successful
preflight independently verified the clean/pushed control branch; exact dirty
provider state; packet, activation and audit hashes; matching dependency locks;
ignored dependency junction; absent Claude process; and first-party Max
authentication.

The full launcher still refuses to contact Claude before the reset and will
repeat every check at action time. Any drift fails closed. Exactly one full
execution is permitted.
