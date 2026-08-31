<!-- [[OpenAI Director | Codex | 2026-08-31 | 14:34 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 14:04 UTC | BEGIN]] -->
# Antigravity RobotDealer sequence 26 — pre-model guardian failure

## Disposition

The first Sequence 26 launcher invocation stopped before Antigravity process
creation. It is a local control-plane configuration failure, not a provider
attempt, model request, paid dispatch, ambiguous contact, source delivery, or
workload-credit event. Sequence 26 therefore remains pending with provider
attempts and contacts at zero. One corrected primary remains available after
the exact control head is refrozen and independently accepted.

## Exact failed control state

- Control HEAD: `9932b2701d8eba453047cd455825e54733588b51`
- Control tree: `88e31819516a81825c83807c60ce2846cf20befc`
- Terminal launcher error:
  `Isolation guardian exited 1 before readiness.`
- Provider identity: absent
- Provider stdout, stderr, CLI log, transcript, and launch receipt: absent
- `agy` process count after the stop: `0`
- Provider sandbox HEAD/tree remained
  `644d1b082347369f5c9665312946c6f5945fa925` /
  `4085ca20ee26e081e0405d4820f3503c8f595b1c`
- Canonical global settings remained
  `5a9aef19fff41049666ff285eeecfd37ee35a9dc016b7c9be19b79dfefade2e3`
- Canonical project settings remained
  `5ce5b3178d47ff3516281a1298dcb7ca589d823c08f3b2545e5f187a5e706f25`

## Root cause

PowerShell 7.6.4 `ConvertFrom-Json` automatically converted the ISO
`guardian_deadline_at` token into `System.DateTime`. The guardian then cast
that value to a locale-formatted string and compared it with the exact
round-tripped `DateTimeOffset` representation. The representations differed,
so the guardian failed closed before opening the Job Object or writing its
readiness record. A bounded, read-only prefix replay reproduced the exact
deadline mismatch.

The correction is to deserialize control evidence with
`ConvertFrom-Json -DateKind String`, matching the already-frozen QA rule that
timestamp tokens remain strings for exact validation.

A provider-free Job Object self-test then reached readiness and exposed one
second latent guardian-only defect before any provider launch: assigning local
`$pid` collided case-insensitively with PowerShell's read-only `$PID` automatic
variable during completion. The refrozen guardian uses `$providerPid` instead.
The repeated self-test passed exact deadline preservation, guardian readiness,
`DIRECTOR_SIGNAL_JOB_EMPTY`, final active-process count `0`, and completion
before deadline. It created no provider process.

The exact-head review then rejected the narrative-only self-test record because
its disposable guardian had a CRLF final terminator while the committed
launcher writes one LF final terminator. The corrected proof therefore
extracted the single-quoted `$GuardianScriptText` expression from launcher
SHA-256
`a3a97ac21a73bf4ed90290068da340da384d9299115bd12182ccde839b19d134`,
evaluated only that inert string expression, appended the launcher's exact LF,
and wrote the resulting UTF-8/no-BOM bytes. The preserved byte-for-byte export
`guardian.ps1.bin` has SHA-256
`0a19d6b890ae97300171a7ebbb6c0169793622487949bbd90693338b6fb37bb0`,
which is the exact guardian the launcher will generate.

That exact guardian ran provider-free against a fresh empty kill-on-close Job
Object. Its raw transaction, readiness, stop signal, completion, isolated
placeholder inputs, and hash manifest are preserved under
`artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.guardian-selftest/`:

- Transaction SHA-256:
  `24798fd258e673cd5b01ec70da47db8da59ecb327530dec063c3bdf041459dd7`
- Environment-contract SHA-256:
  `f37785cc2f95272d62f6d53b2c7f6cb92611930cb2a7ec55e932ec56869058b9`
- Isolated-global placeholder SHA-256:
  `f495a5ef0b21a5e6cbf80059cc34635570c2cc93b53218a7be01ffb989972e5d`
- Isolated-project placeholder SHA-256:
  `55bff5a11b2d71dbdb943ce030f56afe51b7ae7aa42f5a20af2c76d527133518`
- Guardian-ready SHA-256:
  `98f688b8333ba6d72be27e658d1bfe5be8cfe3c57eebc6c1f918ee02f7bfbf34`
- Guardian-stop SHA-256:
  `bfb78e250301f1dafd77ca9b1103c488053c54e601bc4565a23386aded39e95e`
- Guardian-done SHA-256:
  `672eda4ea18c74ed4fabceb0091dd425d4925f06bc52b2014c01cecfe7c5416a`
- Self-test summary SHA-256:
  `814bf6830be89fe7eef37f3b300f9ffa55008a779697dae4165e7f0948c1b79b`

The raw readiness record binds the exact transaction, deadline token, empty
Job Object, and canonical/isolated hashes. The raw completion record reports
`provider_identity_status=ABSENT`, `DIRECTOR_SIGNAL_JOB_EMPTY`, active-process
counts `0 -> 0`, `JOB_ALREADY_EMPTY`, and completion before deadline. The
summary records `provider_process_created=false`,
`provider_identity_present=false`, and `provider_contact_count=0`. Canonical
settings hashes remained unchanged. This provider-free proof consumed no
provider/model attempt, retry, contact, or workload credit.

## Preserved recovery evidence

The exact pre-model claim was moved into the still-private transaction before
the existing recovery-only path archived it. No evidence was deleted or
overwritten. The archive is:

`C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean-sequence26-settings-rollback-recovered-20260831T1404326982153Z-9714563b068542d0b55f528e491cd7d8`

- Pre-model claim SHA-256:
  `0d2dc0d233f9531911aa797055efdd8e9954903ad992c8d2d6152f1758734c17`
- Transaction SHA-256:
  `d133ab4e9c799f7503f1b1d946e6f175196ce571c5427f1090e74bd960fb8c85`
- Failing guardian SHA-256:
  `fa3d26c5eb21561ff693ec0b6d0c7bfee668200bc8ee840b637fe292092a281f`
- Environment-contract SHA-256:
  `95709f7fa781b993e92a790d0a706ac94acc2ac5fec71e474a08de19b6a34a02`
- Stale-recovery SHA-256:
  `048a0c48dc52e4a9aac27758e6dd95a0e866813447ef69a43d3f52cfa70a9d5f`
- Recovery record: provider identity `ABSENT`, guardian identity `ABSENT`,
  Job Object `JOB_OBJECT_ABSENT_KERNEL_CLOSED`, active processes `0 -> 0`,
  `canonical_settings_written=false`

The recovery-only invocation created no workload or retry credit. The next
provider launch is still the one primary because no provider process or model
contact occurred.
<!-- [[OpenAI Director | Codex | 2026-08-31 | 14:04 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 14:34 UTC | END]] -->
