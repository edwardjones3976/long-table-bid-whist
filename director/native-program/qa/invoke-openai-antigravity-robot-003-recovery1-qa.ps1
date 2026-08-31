# [[OpenAI Director | Codex | 2026-08-31 | 14:54 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 14:34 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 07:30 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:26 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:23 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:14 UTC | BEGIN]]
<#
.SYNOPSIS
    Fail-closed exact-byte OpenAI QA for LT-NATIVE-ANTIGRAVITY-ROBOT-003.

.DESCRIPTION
    Verifies the fixed synthetic provider authority, a shell-free Antigravity
    working-tree delivery and its exact schema-bound result, then mechanically
    materializes only LongTableRobotDealer/** below
    Unreal/Plugins/LongTableRobotDealer/** in the fixed QA worktree. Provider
    bytes are copied unchanged; this script neither corrects nor authors code.

    -PreflightOnly performs every provider/result/QA-base validation but does
    not copy, commit, build, or run product tests.
#>
[CmdletBinding()]
param(
    [switch]$PreflightOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$ProviderRoot = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean'
$QaRoot = 'C:\Users\edwar\.codex\worktrees\long-table-antigravity-robot-qa-003'
$DirectorValidatorRoot = 'C:\Users\edwar\.codex\provider-qa\director-policy-cc791'
$AgyExePath = 'C:\Users\edwar\AppData\Local\agy\bin\agy.exe'
$RawResultRelativePath = 'artifacts/native-program/providers/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-recovery1-cli-output.json'
$CliLogRelativePath = 'artifacts/native-program/providers/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-recovery1-cli.log'
$TranscriptRelativePath = 'artifacts/native-program/providers/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-recovery1-transcript.jsonl'
$ReceiptRelativePath = 'artifacts/native-program/providers/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-recovery1-launch-receipt.json'
$StderrRelativePath = 'artifacts/native-program/providers/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-recovery1-cli.stderr'
$RawResultPath = Join-Path $ControlRoot ($RawResultRelativePath -replace '/', '\')
$CliLogPath = Join-Path $ControlRoot ($CliLogRelativePath -replace '/', '\')
$TranscriptPath = Join-Path $ControlRoot ($TranscriptRelativePath -replace '/', '\')
$ReceiptPath = Join-Path $ControlRoot ($ReceiptRelativePath -replace '/', '\')
$ClaimPath = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean-recovery1.claim.json'
$StderrPath = Join-Path $ControlRoot ($StderrRelativePath -replace '/', '\')
$TransactionRoot = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean-sequence26-recovery1-settings-rollback'
$PrivateProfileRoot = Join-Path $TransactionRoot 'private-profile'
$IsolatedGeminiRoot = Join-Path $PrivateProfileRoot '.gemini'
$IsolatedGlobalSettingsPath = Join-Path $IsolatedGeminiRoot 'antigravity-cli\settings.json'
$IsolatedProjectSettingsPath = Join-Path $IsolatedGeminiRoot 'config\projects\64ba9d6d-900c-4894-8bc8-b0e0a4f52906.json'
$IsolatedTranscriptRoot = Join-Path $IsolatedGeminiRoot 'antigravity-cli\brain'
$EnvironmentContractPath = Join-Path $TransactionRoot 'environment-contract.json'
$TransactionRecordPath = Join-Path $TransactionRoot 'transaction.json'
$GuardianScriptPath = Join-Path $TransactionRoot 'guardian.ps1'
$GuardianReadyPath = Join-Path $TransactionRoot 'guardian-ready.json'
$GuardianDonePath = Join-Path $TransactionRoot 'guardian-done.json'
$ProviderIdentityPath = Join-Path $TransactionRoot 'provider-identity.json'
$PromptRelativePath = 'artifacts/native-program/providers/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-recovery1.prompt.md'
$PromptPath = Join-Path $ControlRoot ($PromptRelativePath -replace '/', '\')
$OriginalPromptRelativePath = 'artifacts/native-program/providers/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26.prompt.md'
$OriginalPromptPath = Join-Path $ControlRoot ($OriginalPromptRelativePath -replace '/', '\')
$OriginalLauncherRelativePath = 'director/native-program/run-antigravity-robot-003.ps1'
$OriginalLauncherPath = Join-Path $ControlRoot ($OriginalLauncherRelativePath -replace '/', '\')
$PermissionDeltaRelativePath = 'director/native-program/packets/LT-NATIVE-ANTIGRAVITY-ROBOT-003-RECOVERY1-PERMISSION-DELTA.json'
$PermissionDeltaPath = Join-Path $ControlRoot ($PermissionDeltaRelativePath -replace '/', '\')
$LauncherRelativePath = 'director/native-program/run-antigravity-robot-003-recovery1.ps1'
$LauncherPath = Join-Path $ControlRoot ($LauncherRelativePath -replace '/', '\')
$SourceReviewRelativePath = 'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-recovery1-source-security-review.json'
$SourceReviewPath = Join-Path $ControlRoot ($SourceReviewRelativePath -replace '/', '\')
$PrimaryFailureManifestRelativePath = 'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/manifest.json'
$PrimaryFailureManifestPath = Join-Path $ControlRoot ($PrimaryFailureManifestRelativePath -replace '/', '\')
$PrimaryFailureIncidentRelativePath = 'artifacts/native-program/qa/2026-08-31-antigravity-robot-003-primary-prompt-transport-failure.md'
$PrimaryFailureIncidentPath = Join-Path $ControlRoot ($PrimaryFailureIncidentRelativePath -replace '/', '\')
$PrimaryFailureRoot = Split-Path -Parent $PrimaryFailureManifestPath
$TransportSelfTestSummaryRelativePath = 'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.file-stdin-selftest/selftest-summary.json'
$TransportSelfTestChildOutputRelativePath = 'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.file-stdin-selftest/child-output.json'
$TransportSelfTestChildStderrRelativePath = 'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.file-stdin-selftest/child.stderr'
$TransportSelfTestSummaryPath = Join-Path $ControlRoot ($TransportSelfTestSummaryRelativePath -replace '/', '\')
$TransportSelfTestChildOutputPath = Join-Path $ControlRoot ($TransportSelfTestChildOutputRelativePath -replace '/', '\')
$TransportSelfTestChildStderrPath = Join-Path $ControlRoot ($TransportSelfTestChildStderrRelativePath -replace '/', '\')

$ExpectedControlUntrackedRelativePaths = @(
    $RawResultRelativePath,
    $StderrRelativePath,
    $TranscriptRelativePath,
    $ReceiptRelativePath
)

$ControlAuthorityRelativePaths = @(
    '.gitignore',
    'director/native-program/contracts/long-table-robot-dealer-public-v1.json',
    'director/native-program/contracts/model-result-packet-v1.schema.json',
    'director/native-program/packets/LT-NATIVE-ANTIGRAVITY-ROBOT-003.json',
    'director/native-program/packets/LT-NATIVE-ANTIGRAVITY-ROBOT-003-PERMISSION-DELTA.json',
    'director/native-program/packets/LT-NATIVE-ANTIGRAVITY-ROBOT-003-RESULT-BINDING.json',
    $OriginalPromptRelativePath,
    'artifacts/native-program/coordination/2026-08-31-sequence-26-activation.md',
    'artifacts/native-program/qa/2026-08-31-antigravity-robot-003-pre-model-guardian-failure.md',
    $OriginalLauncherRelativePath,
    'director/native-program/qa/invoke-openai-antigravity-robot-003-qa.ps1',
    $PermissionDeltaRelativePath,
    'director/native-program/packets/LT-NATIVE-ANTIGRAVITY-ROBOT-003-RECOVERY1-RESULT-BINDING.json',
    $PromptRelativePath,
    'artifacts/native-program/coordination/2026-08-31-sequence-26-recovery1-activation.md',
    $PrimaryFailureIncidentRelativePath,
    $PrimaryFailureManifestRelativePath,
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/environment-contract.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/guardian-done.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/guardian-ready.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/guardian-stop.signal',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/guardian.ps1.bin',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/primary.claim.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/private-profile/.gemini/antigravity-cli/settings.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/private-profile/.gemini/config/projects/64ba9d6d-900c-4894-8bc8-b0e0a4f52906.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/provider-identity.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/stale-recovery.json',
    'artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.primary-pre-model-failure/transaction.json',
    $TransportSelfTestSummaryRelativePath,
    $TransportSelfTestChildOutputRelativePath,
    $TransportSelfTestChildStderrRelativePath,
    $LauncherRelativePath,
    'director/native-program/qa/invoke-openai-antigravity-robot-003-recovery1-qa.ps1',
    'director/native-program/provider-workload.yaml',
    'director/native-program/roles-and-responsibilities.md',
    'director/native-program/stage-gates.md',
    'artifacts/native-program/coordination/2026-08-31-sequence-25-activation.md',
    'director/native-program/packets/LT-NATIVE-CLAUDE-ROBOT-001.json',
    'director/native-program/packets/LT-NATIVE-CLAUDE-ROBOT-001-REAUTHORIZATION-DELTA.json',
    'artifacts/native-program/providers/LT-NATIVE-CLAUDE-ROBOT-001.sequence-25.prompt.md',
    'artifacts/native-program/providers/LT-NATIVE-CLAUDE-ROBOT-001.sequence-25-recovery.prompt.md',
    'director/native-program/run-claude-robot-001-recovery.ps1',
    'director/native-program/qa/invoke-openai-robot-dealer-qa.ps1',
    'artifacts/native-program/qa/2026-08-31-claude-robot-001-primary-session-limit.md',
    'artifacts/native-program/qa/2026-08-31-claude-robot-001-frozen-static-qa.md',
    'artifacts/native-program/providers/LT-NATIVE-CLAUDE-ROBOT-001.sequence-25-recovery-cli-output.json',
    'artifacts/native-program/qa/2026-08-31-claude-robot-001-terminal-permission-failure.md',
    'artifacts/native-program/providers/LT-NATIVE-CLAUDE-ROBOT-001.sequence-25-owner-recontact.md'
)

$ExpectedEnvironmentContractProperties = @(
    'schema_version',
    'assignment_id',
    'private_profile_root',
    'inheritance_policy',
    'inherited_names',
    'environment_entry_count',
    'environment_key_set_sha256',
    'environment_block_sha256_utf16le',
    'overrides'
)

$ExpectedTransactionRecordProperties = @(
    'schema_version',
    'assignment_id',
    'idempotency_key',
    'director_process_id',
    'director_start_time_utc_ticks',
    'control_head',
    'control_tree',
    'transaction_root',
    'provider_identity_path',
    'provider_executable_path',
    'provider_executable_sha256',
    'canonical_global_settings_path',
    'canonical_global_settings_sha256',
    'canonical_project_settings_path',
    'canonical_project_settings_sha256',
    'canonical_settings_written',
    'private_profile_root',
    'isolated_global_settings_path',
    'isolated_global_settings_sha256',
    'isolated_project_settings_path',
    'isolated_project_settings_sha256',
    'environment_contract_path',
    'environment_contract_sha256',
    'environment_block_sha256_utf16le',
    'environment_key_set_sha256',
    'environment_entry_count',
    'profile_reparse_free',
    'guardian_script_sha256',
    'guardian_deadline_seconds',
    'guardian_deadline_at',
    'job_name',
    'job_kill_on_close',
    'job_created_at',
    'armed_at'
)

$ExpectedGuardianReadyProperties = @(
    'schema_version',
    'assignment_id',
    'guardian_process_id',
    'guardian_start_time_utc_ticks',
    'director_process_id',
    'transaction_record_sha256',
    'canonical_global_settings_sha256',
    'canonical_project_settings_sha256',
    'isolated_global_settings_sha256',
    'isolated_project_settings_sha256',
    'private_profile_root',
    'environment_contract_sha256',
    'provider_identity_path',
    'guardian_deadline_seconds',
    'guardian_deadline_at',
    'job_name',
    'job_kill_on_close',
    'job_active_process_count',
    'job_opened_at',
    'ready_at'
)

$ExpectedProviderIdentityProperties = @(
    'schema_version',
    'assignment_id',
    'idempotency_key',
    'transaction_record_sha256',
    'director_process_id',
    'director_start_time_utc_ticks',
    'provider_process_id',
    'provider_start_time_utc_ticks',
    'provider_executable_path',
    'provider_executable_sha256',
    'provider_started_at',
    'job_name',
    'created_with_job_list_attribute',
    'job_bound_before_resume',
    'job_assignment_confirmed_at',
    'private_profile_root',
    'environment_contract_sha256',
    'environment_block_sha256_utf16le',
    'environment_key_set_sha256',
    'create_unicode_environment',
    'recorded_at'
)

$ExpectedGuardianDoneProperties = @(
    'schema_version',
    'assignment_id',
    'status',
    'transaction_record_sha256',
    'guardian_process_id',
    'guardian_start_time_utc_ticks',
    'director_process_id',
    'guardian_deadline_at',
    'trigger_observed_at',
    'provider_identity_status',
    'provider_identity_sha256',
    'provider_process_id',
    'provider_start_time_utc_ticks',
    'job_name',
    'job_kill_on_close',
    'job_active_processes_before_stop',
    'job_active_processes_after_stop',
    'job_empty_verified_at',
    'provider_process_disposition',
    'process_tree_terminated_at',
    'canonical_global_settings_sha256',
    'canonical_project_settings_sha256',
    'canonical_settings_written',
    'isolated_global_settings_sha256',
    'isolated_project_settings_sha256',
    'private_profile_root',
    'environment_contract_sha256',
    'completed_at',
    'completed_before_guardian_deadline'
)

$ExpectedStaleRecoveryProperties = @(
    'schema_version',
    'assignment_id',
    'transaction_record_sha256',
    'provider_identity_disposition',
    'guardian_identity_disposition',
    'job_disposition',
    'job_active_processes_before',
    'job_active_processes_after',
    'job_empty_verified_at',
    'canonical_global_settings_sha256',
    'canonical_project_settings_sha256',
    'canonical_settings_written',
    'recovered_at'
)

$ExpectedLaunchReceiptProperties = @(
    'schema_version',
    'assignment_id',
    'idempotency_key',
    'project_id',
    'model',
    'effort',
    'agent_mode',
    'control_head',
    'control_tree',
    'provider_head',
    'provider_tree',
    'process_exit_code',
    'outer_status',
    'conversation_id',
    'provider_process_id',
    'provider_start_time_utc_ticks',
    'provider_process_started_at',
    'provider_resumed_at',
    'job_name',
    'job_kill_on_close',
    'created_with_job_list_attribute',
    'job_bound_before_resume',
    'job_assignment_confirmed_at',
    'job_active_process_count_at_completion',
    'job_empty_verified_at',
    'provider_identity_path',
    'provider_identity_sha256',
    'prompt_delivery_timeout_seconds',
    'prompt_delivery_started_at',
    'prompt_delivery_completed_at',
    'prompt_delivery_timed_out',
    'stdin_transport',
    'prompt_file_sha256',
    'prompt_file_byte_length',
    'prompt_file_inheritable',
    'prompt_file_read_only',
    'prompt_file_share_read_only',
    'prompt_file_offset_before_create',
    'prompt_handle_opened_at',
    'prompt_handle_verified_at',
    'prompt_delivery_timeout_applicable',
    'prompt_delivery_completion_semantics',
    'parent_finally_job_disposition',
    'parent_finally_job_error',
    'wrapper_timeout_seconds',
    'wrapper_timeout_triggered',
    'private_profile_root',
    'isolated_gemini_root',
    'isolated_global_settings_path',
    'isolated_global_settings_initial_sha256',
    'isolated_global_settings_final_sha256',
    'isolated_project_settings_path',
    'isolated_project_settings_initial_sha256',
    'isolated_project_settings_final_sha256',
    'isolated_transcript_root',
    'environment_contract_path',
    'environment_contract_sha256',
    'environment_block_sha256_utf16le',
    'environment_key_set_sha256',
    'environment_entry_count',
    'create_unicode_environment',
    'environment_pointer_non_null',
    'profile_reparse_free',
    'canonical_global_settings_path',
    'canonical_global_settings_pre_sha256',
    'canonical_global_settings_post_sha256',
    'canonical_project_settings_path',
    'canonical_project_settings_pre_sha256',
    'canonical_project_settings_post_sha256',
    'canonical_settings_written',
    'isolation_app_data_log_marker_observed',
    'canonical_gemini_path_log_marker_observed',
    'project_permission_grants_loaded',
    'transaction_record_path',
    'transaction_record_sha256',
    'guardian_script_path',
    'guardian_script_sha256',
    'guardian_process_id',
    'guardian_deadline_seconds',
    'guardian_deadline_at',
    'guardian_ready_path',
    'guardian_ready_sha256',
    'guardian_done_path',
    'guardian_done_sha256',
    'guardian_done_status',
    'guardian_done_provider_process_disposition',
    'guardian_done_completed_before_deadline',
    'claim_path',
    'claim_sha256',
    'raw_result_path',
    'raw_result_sha256',
    'stderr_path',
    'stderr_sha256',
    'cli_log_path',
    'cli_log_sha256',
    'authenticated_transcript_source',
    'frozen_transcript_path',
    'frozen_transcript_sha256',
    'terminal_inspection_error',
    'recorded_at'
)

$ExpectedProviderOutcome = 'Source-only LongTableRobotDealer/** files were authored in the synthetic provider sandbox. Independent OpenAI acceptance, target-project build or integration, Android, Quest, device, and human validation are not claimed.'
$ExpectedProviderRisks = @(
    'Independent OpenAI source review, target-project build and integration, Android, Quest, device, and human validation remain pending outside this provider result.'
)
$ExpectedAcceptanceEvidence = [ordered]@{
    'source-only public-contract delivery' = 'Provider-authored source files only; independent OpenAI acceptance is not claimed.'
    'closed source inventory' = 'Created paths are confined to the declared LongTableRobotDealer/** source inventory.'
    'rights-clean original placeholder inventory' = 'Original source only; no music, media, likeness, model, texture, sample, or third-party asset is included.'
    'target-project Unreal builds' = $null
    'target-project automation' = $null
    'device validation' = $null
    'human validation' = $null
}

$ExpectedResultTopLevelProperties = @(
    'schema_version',
    'task_id',
    'assignment_id',
    'idempotency_key',
    'authority_snapshot_digest',
    'correlation',
    'provider',
    'run_reference',
    'status',
    'outcome',
    'artifacts',
    'checks',
    'acceptance',
    'risks',
    'blockers',
    'requested_decisions',
    'side_effects',
    'revision_recommended'
)

$Expected = [ordered]@{
    AssignmentId = 'LT-NATIVE-ANTIGRAVITY-ROBOT-003'
    TaskId = 'LT-NATIVE-PROGRAM-20260830'
    IdempotencyKey = 'LT-NATIVE-ANTIGRAVITY-ROBOT-003-644d1b0-SEQUENCE26'
    TransportIdempotencyKey = 'LT-NATIVE-ANTIGRAVITY-ROBOT-003-644d1b0-SEQUENCE26-RECOVERY1'
    CorrelationId = 'LT-NATIVE-ANTIGRAVITY-ROBOT-003'
    SourceEventId = 'openai-first-deal-robot-cleanroom-antigravity-20260831'
    AuthorityDigest = 'sha256:37608811b0034ba030df68309a18019b826354dec697bfec0beb217b6d4f851f'
    AuthorityParent = '644d1b082347369f5c9665312946c6f5945fa925'
    AuthorityTree = '4085ca20ee26e081e0405d4820f3503c8f595b1c'
    ProviderBranch = 'codex/antigravity-robot-cleanroom-003'
    ProviderProjectId = '64ba9d6d-900c-4894-8bc8-b0e0a4f52906'
    ProviderProjectName = 'lt-robot-dealer-antigravity-003-clean'
    ProviderModel = 'gemini-3.1-pro-high'
    ProviderAgentMode = 'default-non-agent'
    ProviderResultName = 'Gemini Antigravity / gemini-3.1-pro-high'
    ProviderAuthor = 'Gemini Antigravity <antigravity@users.noreply.github.com>'
    OpenAiCommitter = 'OpenAI QA <openai-qa@users.noreply.github.com>'
    PublicContractBlob = '528ce90812d4c452ddc51a0cccc86dd990977abe'
    PublicContractSha256 = '56299bb63a352560f2a40fc1115db1eb276e87ada719054959b33498aef80c52'
    ResultSchemaBlob = '3f68e59136c422ce84d79f874c0343fd5ffc0a9e'
    ResultSchemaSha256 = 'ebadc5bc45462ffa63ca5e6b28c09d1ccf86086389324a0c88f704bb14208d9c'
    AcceptedBase = '4d26680fb99abacb20ecb18807b7c8833646cfa3'
    AcceptedTree = '1e0db56f1e85d66c93ab64bc3dca8c237947c210'
    PackageLockBlob = 'b213128a79ea18700a80fff59ecc82fe3ce4ecc9'
    EngineRoot = 'C:\Program Files\Epic Games\UE_5.7'
    QaBranch = 'codex/antigravity-robot-qa-003'
    ProviderPrefix = 'LongTableRobotDealer/'
    DestinationPrefix = 'Unreal/Plugins/LongTableRobotDealer/'
    DirectorHead = 'cc791364e2f1ff1ac4c72e01c7122296e4ff7362'
    DirectorTree = '51f529f07b453ec8e388d5634a569efb8cd2a881'
    DirectorValidatorBlob = 'a6871c53206e26d3ad72cd6809b92529ddb2cf87'
    TypeScriptTests = 219
    FocusedRobotTests = 15
    FullLongTableTests = 49
    MaximumProviderFiles = 32
    MaximumProviderBytes = 1048576
    GlobalSettingsPath = 'C:\Users\edwar\.gemini\antigravity-cli\settings.json'
    GlobalSettingsSha256 = '5a9aef19fff41049666ff285eeecfd37ee35a9dc016b7c9be19b79dfefade2e3'
    IsolatedGlobalSettingsSha256 = 'e717116d6ee4c11919ddbe29e6b6df4c577158ddc9e74de226dcae122b013f56'
    ProjectSettingsPath = 'C:\Users\edwar\.gemini\config\projects\64ba9d6d-900c-4894-8bc8-b0e0a4f52906.json'
    ProjectSettingsSha256 = '5ce5b3178d47ff3516281a1298dcb7ca589d823c08f3b2545e5f187a5e706f25'
    IsolatedProjectSettingsSha256 = '33f1b2affad9480e02366568f5521e47861819ad1c6ca27c13c5bf7a16c3ec2c'
    AgyExeSha256 = '059b96c1069206158d340ee2a8912894eca5002195e62b8cd281c26c01cd794e'
    LauncherSha256 = '58089f1c51af9bba34cdcda44b3174d90a29632a9c63a7e668651c0b74f42bd4'
    PermissionDeltaSha256 = 'd1ea5906e87203cf6ba6da4465236c9c1d911947c06c9ef7301b7913c37e0a2e'
    PrimaryFailureManifestSha256 = '3b1b114890433125d261abfe107da2159b5772cc46f5dd926169625bf9bc561e'
    PrimaryFailureIncidentSha256 = '2c1c4723bbd02cf180d0df84ab4cc2d57404128ddae5b0a6be8df0231c0ac2a7'
    PrimaryFailureManifestRowsSha256 = '3845f488694706ea1cab8a817368eb22f93eb236dc8d620d167fb9ab27aae533'
    OriginalLauncherSha256 = 'd5b91525a29f428b5011c798a85df129b70f2a2ed87c4f498044008160be033d'
    PromptSha256 = '39eb912cf4481d8a99d673acedff0f10d146d9300bcd0edd4014a3ebcde019d0'
    PromptLengthBytes = 9668
    JobObjectNamePrefix = 'Global\DirectorOrchestrator-LT-NATIVE-ANTIGRAVITY-ROBOT-003-SEQUENCE26-RECOVERY1-'
    PromptDeliveryTimeoutSeconds = 15
    WrapperTimeoutSeconds = 3600
    GuardianDeadlineSeconds = 3660
}

$RequiredRobotTests = @(
    'LongTable.RobotDealer.ClosedSchema',
    'LongTable.RobotDealer.ValidCueEmitsOnce',
    'LongTable.RobotDealer.InvalidCueAtomic',
    'LongTable.RobotDealer.SequenceMonotonic',
    'LongTable.RobotDealer.StaleDuplicateNoMutation',
    'LongTable.RobotDealer.DirectQueuedInterleaveCannotRegress',
    'LongTable.RobotDealer.PauseRequiresExplicitCue',
    'LongTable.RobotDealer.OrdinaryCueCannotResume',
    'LongTable.RobotDealer.PausedQueueOrder',
    'LongTable.RobotDealer.QueueCapacityAtomic',
    'LongTable.RobotDealer.ResetPreservesReplayDefense',
    'LongTable.RobotDealer.ConcealmentCounterfactual',
    'LongTable.RobotDealer.DealerModeAuthorityEquivalence',
    'LongTable.RobotDealer.RightsCleanInventory',
    'LongTable.RobotDealer.ModuleBoundary'
)

$RequiredBaseTests = @(
    'LongTable.Composition.BuildIdentity',
    'LongTable.Composition.Config',
    'LongTable.Composition.RobotDealerPresenter',
    'LongTable.Protocol.Vocabulary',
    'LongTable.Protocol.Fixtures',
    'LongTable.Protocol.Rejections',
    'LongTable.Protocol.Counterfactual',
    'LongTable.Protocol.ClosedTypes',
    'LongTable.Table.IntentIdentity',
    'LongTable.Table.CommitMachine',
    'LongTable.Table.Client.HelloAndWelcome',
    'LongTable.Table.Client.IntentSerialization',
    'LongTable.Table.Client.StaleVersionResync',
    'LongTable.Table.Client.ReconnectAndReplay',
    'LongTable.Table.Client.RetryUsesOriginalExpectedVersion',
    'LongTable.Table.Client.ContextIsolation',
    'LongTable.Table.Client.RejectsIncoherentFrames',
    'LongTable.Table.Client.FailsClosedOnNonSchemaFrame',
    'LongTable.Table.LocalConfirmGate',
    'LongTable.Table.Client.ContextTuplesNeverCollide',
    'LongTable.Table.Client.ReentrantWelcomeCannotContaminateNewContext',
    'LongTable.Table.Client.WelcomeNeverRollsBackwards',
    'LongTable.Table.Client.ResyncFailsClosedUntilCoherentNewerState',
    'LongTable.Table.Client.WelcomeCrossoversFailClosed',
    'LongTable.Table.Client.DealerCueTableCoherence',
    'LongTable.Table.PlayerCounterfactual',
    'LongTable.Table.Client.ContextEpochReentrancyStopsSiblingProjection',
    'LongTable.Table.Client.GrantAndCounterNeverRollBackwards',
    'LongTable.Table.Client.SameConfigTransportReplacementStopsSiblings',
    'LongTable.Table.Client.ReentrantReplacementStopsConnectAndHello',
    'LongTable.Table.Client.StaleCallbackEpochIgnoredAndSchemaRejectStopsWireErrorSibling',
    'LongTable.Table.Client.IdentityRejectionThenFreshWelcomeReusesCounter',
    'LongTable.Table.Client.InFlightRetrySurvivesSameGrantAndDiesOnIncarnationChange',
    'LongTable.Table.Client.IssuanceReservesAndReceiptAdvances'
)
$RequiredFullTests = @($RequiredBaseTests + $RequiredRobotTests)

$RequiredProviderPaths = @(
    'LongTableRobotDealer/LongTableRobotDealer.uplugin',
    'LongTableRobotDealer/README.md',
    'LongTableRobotDealer/Source/LongTableRobotDealer/LongTableRobotDealer.Build.cs',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Public/LongTableRobotDealerCueInterface.h',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Private/LongTableRobotDealerStateMachine.cpp',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Private/Tests/LongTableRobotDealerTests.cpp'
)

function Write-Evidence {
    param(
        [Parameter(Mandatory)][string]$Check,
        [Parameter(Mandatory)][string]$Value
    )
    Write-Host ('[PASS] {0}: {1}' -f $Check, $Value)
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string[]]$GitArgs
    )

    $output = @(& git -C $Root @GitArgs 2>&1 | ForEach-Object { $_.ToString() })
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed in $Root`n$($output -join "`n")"
    }
    return ($output -join "`n").Trim()
}

function Assert-Exact {
    param(
        [Parameter(Mandatory)][string]$Name,
        [AllowNull()][AllowEmptyString()][object]$Actual,
        [AllowNull()][AllowEmptyString()][object]$ExpectedValue
    )

    if ([string]$Actual -cne [string]$ExpectedValue) {
        throw "$Name mismatch. Expected '$ExpectedValue'; found '$Actual'."
    }
}

function Get-Lines {
    param([AllowNull()][AllowEmptyString()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }
    return @($Value -split "`n" | ForEach-Object { $_.TrimEnd("`r") } | Where-Object { $_ -ne '' })
}

function Assert-ExactSet {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string[]]$Actual,
        [Parameter(Mandatory)][string[]]$ExpectedValues
    )

    $actualSorted = @($Actual | Sort-Object -CaseSensitive -Unique)
    $expectedSorted = @($ExpectedValues | Sort-Object -CaseSensitive -Unique)
    $difference = @(Compare-Object -CaseSensitive -ReferenceObject $expectedSorted -DifferenceObject $actualSorted)
    if ($actualSorted.Count -ne $expectedSorted.Count -or $difference.Count -ne 0) {
        throw "$Name mismatch.`nExpected:`n$($expectedSorted -join "`n")`nActual:`n$($actualSorted -join "`n")"
    }
}

function Get-Sha256 {
    param([Parameter(Mandatory)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-StrictChildPath {
    param(
        [Parameter(Mandatory)][string]$Parent,
        [Parameter(Mandatory)][string]$Child,
        [Parameter(Mandatory)][string]$Name
    )

    $parentFull = [IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
    $childFull = [IO.Path]::GetFullPath($Child)
    if (-not $childFull.StartsWith($parentFull, [StringComparison]::OrdinalIgnoreCase)) {
        throw "$Name is not a strict child of its intended parent: $childFull"
    }
}

function Assert-NoReparsePath {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [switch]$RequireLeaf
    )

    $full = [IO.Path]::GetFullPath($Path)
    if ($RequireLeaf -and -not (Test-Path -LiteralPath $full)) {
        throw "$Name is unavailable: $full"
    }
    $cursor = $full
    while (-not [string]::IsNullOrEmpty($cursor) -and (Test-Path -LiteralPath $cursor)) {
        $item = Get-Item -LiteralPath $cursor -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or
            ($item.PSObject.Properties.Name -contains 'LinkType' -and $null -ne $item.LinkType)) {
            throw "$Name traverses a reparse point: $cursor"
        }
        $parent = [IO.Directory]::GetParent($cursor)
        if ($null -eq $parent) {
            break
        }
        $cursor = $parent.FullName
    }
}

function Assert-Sha256String {
    param(
        [Parameter(Mandatory)][string]$Name,
        [AllowNull()][object]$Value
    )

    $text = [string]$Value
    if ($text.Length -ne 64 -or $text -cne $text.ToLowerInvariant() -or
        @($text.ToCharArray() | Where-Object { $_ -notin @('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f') }).Count -ne 0) {
        throw "$Name must be one lowercase SHA-256 hex digest; found '$text'."
    }
}

function Get-EnvironmentKeySetSha256 {
    param([Parameter(Mandatory)][string[]]$Names)

    $keys = [Collections.Generic.SortedSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($name in $Names) {
        if (-not $keys.Add($name)) {
            throw "Environment contract contains a duplicate case-insensitive key: '$name'."
        }
    }
    $keySetText = (($keys | ForEach-Object { $_.ToUpperInvariant() }) -join "`n") + "`n"
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($keySetText)
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Get-CombinedSha256 {
    param([Parameter(Mandatory)][string[]]$Paths)

    $stream = [IO.MemoryStream]::new()
    try {
        foreach ($path in $Paths) {
            $bytes = [IO.File]::ReadAllBytes($path)
            $stream.Write($bytes, 0, $bytes.Length)
        }
        $hash = [Security.Cryptography.SHA256]::HashData($stream.ToArray())
        return [Convert]::ToHexString($hash).ToLowerInvariant()
    }
    finally {
        $stream.Dispose()
    }
}

function Get-ResultPacket {
    param([Parameter(Mandatory)][object]$CliObject)

    if ($CliObject.PSObject.Properties['assignment_id']) {
        return $CliObject
    }
    if ($CliObject.PSObject.Properties['structured_output'] -and $null -ne $CliObject.structured_output) {
        return $CliObject.structured_output
    }
    throw 'Antigravity output must be one result object or one CLI wrapper with a non-null structured_output object.'
}

function Get-ProviderManifest {
    param(
        [Parameter(Mandatory)][string[]]$Paths,
        [Parameter(Mandatory)][string]$Root
    )

    $rows = foreach ($path in $Paths | Sort-Object -CaseSensitive) {
        $physical = Join-Path $Root ($path -replace '/', '\')
        "$path|$((Get-Item -LiteralPath $physical).Length)|$(Get-Sha256 -Path $physical)"
    }
    $text = ($rows -join "`n") + "`n"
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($text)
    return [pscustomobject]@{
        Text = $text
        Sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
    }
}

function Assert-ResultArtifact {
    param(
        [Parameter(Mandatory)][object]$Result,
        [Parameter(Mandatory)][string]$Kind,
        [Parameter(Mandatory)][string]$Location
    )

    $matches = @($Result.artifacts | Where-Object { $_.kind -ceq $Kind -and $_.location -ceq $Location })
    if ($matches.Count -ne 1) {
        throw "Result must contain exactly one artifact {$Kind, $Location}; found $($matches.Count)."
    }
}

function Assert-TextBlob {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$LogicalPath
    )

    $bytes = [IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        throw "$LogicalPath contains a UTF-8 BOM; exact UTF-8 without BOM is required."
    }
    if ($bytes -contains 0) {
        throw "$LogicalPath contains a NUL byte."
    }
    if ($bytes -contains 13) {
        throw "$LogicalPath contains CR/CRLF bytes; exact LF encoding is required."
    }
    try {
        [void][Text.UTF8Encoding]::new($false, $true).GetString($bytes)
    }
    catch {
        throw "$LogicalPath is not valid UTF-8: $($_.Exception.Message)"
    }
}

function Assert-NoDuplicateStrings {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string[]]$Values
    )

    $duplicates = @($Values | Group-Object -CaseSensitive | Where-Object { $_.Count -ne 1 })
    if ($duplicates.Count -ne 0) {
        throw "$Name contains duplicate values: $(@($duplicates.Name) -join ', ')"
    }
}

function Assert-ExactJsonStringSequence {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][object]$Value,
        [Parameter(Mandatory)][string[]]$ExpectedValues
    )

    if ($Value -isnot [array]) {
        throw "$Name must be a JSON array."
    }
    $actual = @($Value)
    foreach ($entry in $actual) {
        if ($entry -isnot [string]) {
            $typeName = if ($null -eq $entry) { 'null' } else { $entry.GetType().FullName }
            throw "$Name entries must be JSON strings; found '$typeName'."
        }
    }
    Assert-NoDuplicateStrings -Name $Name -Values @($actual | ForEach-Object { [string]$_ })
    Assert-Exact -Name $Name -Actual (@($actual) -join "`n") -ExpectedValue ($ExpectedValues -join "`n")
}

function ConvertTo-CanonicalObject {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return $null
    }
    if ($Value -is [string] -or $Value -is [ValueType]) {
        return $Value
    }
    if ($Value -is [Collections.IDictionary]) {
        $ordered = [ordered]@{}
        foreach ($key in @($Value.Keys | ForEach-Object { [string]$_ } | Sort-Object -CaseSensitive)) {
            $ordered[$key] = ConvertTo-CanonicalObject -Value $Value[$key]
        }
        return [pscustomobject]$ordered
    }
    if ($Value -is [pscustomobject]) {
        $ordered = [ordered]@{}
        foreach ($property in @($Value.PSObject.Properties | Sort-Object -Property Name -CaseSensitive)) {
            $ordered[$property.Name] = ConvertTo-CanonicalObject -Value $property.Value
        }
        return [pscustomobject]$ordered
    }
    if ($Value -is [Collections.IEnumerable]) {
        $items = @()
        foreach ($item in $Value) {
            $items += ,(ConvertTo-CanonicalObject -Value $item)
        }
        return ,$items
    }
    return $Value
}

function ConvertTo-CanonicalJson {
    param([Parameter(Mandatory)][AllowNull()][object]$Value)

    $canonical = ConvertTo-CanonicalObject -Value $Value
    return ($canonical | ConvertTo-Json -Depth 100 -Compress)
}

function Assert-ContributionBoundary {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$LogicalPath
    )

    $extension = [IO.Path]::GetExtension($Path).ToLowerInvariant()
    $lines = @(Get-Content -LiteralPath $Path)
    if ($extension -in @('.json', '.uplugin')) {
        $text = Get-Content -LiteralPath $Path -Raw
        if ($text.Contains('[[', [StringComparison]::Ordinal) -or $text.Contains('| BEGIN]]', [StringComparison]::Ordinal) -or $text.Contains('| END]]', [StringComparison]::Ordinal)) {
            throw "$LogicalPath must be contribution-tag-free."
        }
        [void](ConvertFrom-StrictJsonObject -Text $text -Name $LogicalPath)
        return
    }

    if ($extension -notin @('.h', '.cpp', '.cs', '.md')) {
        throw "$LogicalPath has no contribution-boundary policy."
    }
    $openCore = '[[Gemini Antigravity | gemini-3.1-pro-high | 2026-08-31 | 07:27 UTC | BEGIN]]'
    $closeCore = '[[Gemini Antigravity | gemini-3.1-pro-high | 2026-08-31 | 07:27 UTC | END]]'
    $expectedOpen = if ($extension -ceq '.md') { "<!-- $openCore -->" } else { "// $openCore" }
    $expectedClose = if ($extension -ceq '.md') { "<!-- $closeCore -->" } else { "// $closeCore" }
    if ($lines.Count -lt 2 -or $lines[0] -cne $expectedOpen -or $lines[-1] -cne $expectedClose) {
        throw "$LogicalPath does not have the exact outer Gemini contribution pair."
    }
    $markerLines = @($lines | Where-Object { $_.Contains('| BEGIN]]', [StringComparison]::Ordinal) -or $_.Contains('| END]]', [StringComparison]::Ordinal) })
    if ($markerLines.Count -ne 2 -or $markerLines[0] -cne $expectedOpen -or $markerLines[1] -cne $expectedClose) {
        throw "$LogicalPath must contain exactly one Gemini contribution pair and no second identity."
    }
}

function Resolve-TranscriptPath {
    param([Parameter(Mandatory)][string]$Value)

    if ($Value.StartsWith('file:', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Transcript tool path may not use a URI: $Value"
    }
    if ([IO.Path]::IsPathRooted($Value)) {
        return [IO.Path]::GetFullPath($Value)
    }
    return [IO.Path]::GetFullPath((Join-Path $ProviderRoot $Value))
}

function Assert-TranscriptPolicy {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$ConversationId
    )

    $allowedTools = @('view_file', 'write_to_file', 'replace_file_content', 'multi_replace_file_content', 'finish')
    $publicContractFull = [IO.Path]::GetFullPath((Join-Path $ProviderRoot 'PUBLIC_CONTRACT.json'))
    $resultSchemaFull = [IO.Path]::GetFullPath((Join-Path $ProviderRoot 'RESULT_SCHEMA.json'))
    $productRootFull = [IO.Path]::GetFullPath((Join-Path $ProviderRoot 'LongTableRobotDealer')).TrimEnd('\') + '\'
    $toolCount = 0
    $writeCount = 0
    $finishCount = 0
    $publicContractViewCount = 0
    $resultSchemaViewCount = 0
    $firstWriteOrdinal = $null
    $finishOrdinal = $null
    $finishPayload = $null
    $conversationIdExposed = $false
    $lineNumber = 0
    foreach ($line in Get-Content -LiteralPath $Path) {
        ++$lineNumber
        if ([string]::IsNullOrWhiteSpace($line)) {
            throw "Authenticated transcript contains a blank JSONL row at line $lineNumber."
        }
        $entry = ConvertFrom-StrictJsonObject -Text $line -Name "authenticated transcript line $lineNumber"
        if ($line.Contains($ConversationId, [StringComparison]::Ordinal)) {
            $conversationIdExposed = $true
        }
        $entryToolCalls = if ($entry.PSObject.Properties['tool_calls']) { @($entry.tool_calls) } else { @() }
        if ($entryToolCalls.Count -ne 0 -and [string]$entry.status -cne 'DONE') {
            throw "Authenticated transcript tool row is not terminal DONE at line $lineNumber`: '$($entry.status)'."
        }
        foreach ($toolCall in $entryToolCalls) {
            ++$toolCount
            $toolName = [string]$toolCall.name
            if ($allowedTools -cnotcontains $toolName) {
                throw "Authenticated transcript contains forbidden tool '$toolName' at line $lineNumber."
            }
            if ($toolName -ceq 'finish') {
                ++$finishCount
                $finishOrdinal = $toolCount
                if ($finishCount -ne 1) {
                    throw "Authenticated transcript contains more than one finish call at line $lineNumber."
                }
                if ($null -eq $toolCall.args -or $toolCall.args -isnot [pscustomobject]) {
                    throw "Authenticated transcript finish call has no structured argument object at line $lineNumber."
                }
                $payload = [ordered]@{}
                foreach ($property in $toolCall.args.PSObject.Properties) {
                    if ($property.Name -cin @('toolAction', 'toolSummary')) {
                        continue
                    }
                    $payload[$property.Name] = $property.Value
                }
                if ($payload.Count -eq 0) {
                    throw "Authenticated transcript finish call has no result payload at line $lineNumber."
                }
                $finishPayload = [pscustomobject]$payload
                continue
            }
            if ($finishCount -ne 0) {
                throw "Authenticated transcript contains tool '$toolName' after finish at line $lineNumber."
            }
            $pathProperty = if ($toolName -ceq 'view_file') { 'AbsolutePath' } else { 'TargetFile' }
            if (-not $toolCall.args.PSObject.Properties[$pathProperty]) {
                throw "Authenticated transcript tool '$toolName' lacks exact $pathProperty at line $lineNumber."
            }
            $toolPath = Resolve-TranscriptPath -Value ([string]$toolCall.args.$pathProperty)
            if ($toolName -ceq 'view_file') {
                $isAllowedRead = $toolPath -ceq $publicContractFull -or $toolPath -ceq $resultSchemaFull -or $toolPath.StartsWith($productRootFull, [StringComparison]::OrdinalIgnoreCase)
                if (-not $isAllowedRead) {
                    throw "Authenticated transcript contains out-of-bound read '$toolPath'."
                }
                if ($toolPath -ceq $publicContractFull -or $toolPath -ceq $resultSchemaFull) {
                    foreach ($rangeProperty in @('LineRange', 'StartLine', 'EndLine', 'line_range', 'start_line', 'end_line', 'Offset', 'Limit')) {
                        if ($toolCall.args.PSObject.Properties[$rangeProperty] -and $null -ne $toolCall.args.$rangeProperty) {
                            throw "Authority view '$toolPath' is partial because $rangeProperty is present at line $lineNumber."
                        }
                    }
                    if ($null -ne $firstWriteOrdinal) {
                        throw "Authority file '$toolPath' was first viewed after source authoring began."
                    }
                    if ($toolPath -ceq $publicContractFull) {
                        ++$publicContractViewCount
                    }
                    else {
                        ++$resultSchemaViewCount
                    }
                }
            }
            else {
                ++$writeCount
                if ($null -eq $firstWriteOrdinal) {
                    $firstWriteOrdinal = $toolCount
                    if ($publicContractViewCount -ne 1 -or $resultSchemaViewCount -ne 1) {
                        throw 'Both immutable authority files must be viewed exactly once in full before the first source write.'
                    }
                }
                if (-not $toolPath.StartsWith($productRootFull, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Authenticated transcript contains out-of-bound write '$toolPath'."
                }
            }
        }
    }
    if ($writeCount -eq 0) {
        throw 'Authenticated transcript contains no source write; source authorship is unproven.'
    }
    if ($publicContractViewCount -ne 1 -or $resultSchemaViewCount -ne 1) {
        throw "Authenticated transcript must contain exactly one full pre-authoring view of each authority file; found PUBLIC_CONTRACT=$publicContractViewCount RESULT_SCHEMA=$resultSchemaViewCount."
    }
    if ($finishCount -ne 1 -or $finishOrdinal -ne $toolCount) {
        throw 'Authenticated transcript must end its tool-call sequence with exactly one terminal finish call.'
    }
    Write-Evidence -Check 'authenticated transcript tool policy' -Value "calls=$toolCount writes=$writeCount authority_views=2 finish=1 closed_set=true terminal_done=true"
    return [pscustomobject]@{
        FinishPayload = $finishPayload
        ConversationIdExposed = $conversationIdExposed
    }
}

function Assert-SafeProviderPath {
    param([Parameter(Mandatory)][string]$Path)

    if (-not $Path.StartsWith($Expected.ProviderPrefix, [StringComparison]::Ordinal)) {
        throw "Provider path is out of scope: $Path"
    }
    $relative = $Path.Substring($Expected.ProviderPrefix.Length)
    if ([string]::IsNullOrWhiteSpace($relative) -or $relative.Contains('\')) {
        throw "Provider path is malformed: $Path"
    }
    $segments = @($relative -split '/')
    $generatedSegments = @('binaries', 'intermediate', 'saved', 'deriveddatacache', 'logs', 'reports', 'cache', 'caches', 'dist', 'build', 'packaged')
    foreach ($segment in $segments) {
        if ($segment -in @('.', '..') -or $segment.EndsWith('.') -or $segment.EndsWith(' ')) {
            throw "Provider path contains an unsafe segment: $Path"
        }
        if ($generatedSegments -contains $segment.ToLowerInvariant()) {
            throw "Provider path contains a generated-artifact segment '$segment': $Path"
        }
    }
    $leaf = $segments[-1]
    $lowerLeaf = $leaf.ToLowerInvariant()
    $allowed = $lowerLeaf.EndsWith('.h') -or $lowerLeaf.EndsWith('.cpp') -or
        $lowerLeaf.EndsWith('.cs') -or $lowerLeaf.EndsWith('.md') -or
        $lowerLeaf.EndsWith('.json') -or $lowerLeaf.EndsWith('.uplugin')
    if (-not $allowed) {
        throw "Provider path has an unexpected product-file type: $Path"
    }
    foreach ($suffix in @('.log', '.pdb', '.dll', '.exe', '.obj', '.lib', '.zip', '.tar', '.tmp', '.cache')) {
        if ($lowerLeaf.EndsWith($suffix)) {
            throw "Provider path is a generated artifact: $Path"
        }
    }
}

function Get-TreeBlob {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string]$Commit,
        [Parameter(Mandatory)][string]$Path
    )

    $line = Invoke-Git -Root $Root -GitArgs @('ls-tree', $Commit, '--', $Path)
    if ($line -notmatch '^100644 blob ([0-9a-f]{40})\t') {
        throw "$Path has a missing or malformed Git mode at $Commit`: '$line'."
    }
    return $Matches[1]
}

function Get-CandidateManifest {
    param(
        [Parameter(Mandatory)][string[]]$ProviderPaths,
        [Parameter(Mandatory)][string]$CandidateHead
    )

    $rows = foreach ($providerPath in $ProviderPaths | Sort-Object -CaseSensitive) {
        $relative = $providerPath.Substring($Expected.ProviderPrefix.Length)
        $destinationPath = $Expected.DestinationPrefix + $relative
        $physical = Join-Path $QaRoot ($destinationPath -replace '/', '\')
        $candidateBlob = Get-TreeBlob -Root $QaRoot -Commit $CandidateHead -Path $destinationPath
        Assert-Exact -Name "candidate worktree blob $destinationPath" -Actual (Invoke-Git -Root $QaRoot -GitArgs @('hash-object', '--', $physical)) -ExpectedValue $candidateBlob
        "$providerPath|$((Get-Item -LiteralPath $physical).Length)|$(Get-Sha256 -Path $physical)"
    }
    $text = ($rows -join "`n") + "`n"
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($text)
    return [pscustomobject]@{
        Text = $text
        Sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
    }
}

function Invoke-Gate {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Command,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    $output = @(& $Command @Arguments 2>&1 | ForEach-Object { $_.ToString() })
    $exitCode = $LASTEXITCODE
    $text = $output -join "`n"
    if ($exitCode -ne 0) {
        $tail = @($output | Select-Object -Last 30) -join "`n"
        throw "$Name failed with exit code $exitCode.`n$tail"
    }
    Write-Evidence -Check $Name -Value 'exit=0'
    return $text
}

function Assert-NoDuplicateJsonProperties {
    param(
        [Parameter(Mandatory)][Text.Json.JsonElement]$Element,
        [Parameter(Mandatory)][string]$Path
    )

    if ($Element.ValueKind -eq [Text.Json.JsonValueKind]::Object) {
        $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach ($property in $Element.EnumerateObject()) {
            if (-not $names.Add($property.Name)) {
                throw "JSON contains duplicate property '$($property.Name)' at $Path."
            }
            Assert-NoDuplicateJsonProperties -Element $property.Value -Path "$Path.$($property.Name)"
        }
        return
    }
    if ($Element.ValueKind -eq [Text.Json.JsonValueKind]::Array) {
        $index = 0
        foreach ($item in $Element.EnumerateArray()) {
            Assert-NoDuplicateJsonProperties -Element $item -Path "$Path[$index]"
            ++$index
        }
    }
}

function ConvertFrom-StrictJsonObject {
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory)][string]$Name
    )

    try {
        $document = [Text.Json.JsonDocument]::Parse($Text)
        try {
            if ($document.RootElement.ValueKind -ne [Text.Json.JsonValueKind]::Object) {
                throw "$Name must have one JSON object at its root."
            }
            Assert-NoDuplicateJsonProperties -Element $document.RootElement -Path '$'
        }
        finally {
            $document.Dispose()
        }
        return ($Text | ConvertFrom-Json -Depth 100 -DateKind String)
    }
    catch {
        throw "$Name is not valid unambiguous JSON: $($_.Exception.Message)"
    }
}

function Get-RequiredJsonObject {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    return ConvertFrom-StrictJsonObject -Text (Get-Content -LiteralPath $Path -Raw) -Name $Name
}

function Assert-ExactObjectProperties {
    param(
        [Parameter(Mandatory)][object]$Object,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string[]]$ExpectedNames
    )

    if ($Object -isnot [pscustomobject]) {
        throw "$Name must be one JSON object."
    }
    $actualNames = @($Object.PSObject.Properties.Name | ForEach-Object { [string]$_ })
    Assert-NoDuplicateStrings -Name "$Name property names" -Values $actualNames
    Assert-ExactSet -Name "$Name property set" -Actual $actualNames -ExpectedValues $ExpectedNames
}

function Assert-JsonStringProperties {
    param(
        [Parameter(Mandatory)][object]$Object,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string[]]$PropertyNames
    )

    foreach ($propertyName in $PropertyNames) {
        if ($Object.$propertyName -isnot [string]) {
            $typeName = if ($null -eq $Object.$propertyName) { 'null' } else { $Object.$propertyName.GetType().FullName }
            throw "$Name property '$propertyName' must be a JSON string; found '$typeName'."
        }
    }
}

function Assert-JsonBoolean {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][object]$Value,
        [Parameter(Mandatory)][bool]$ExpectedValue
    )

    if ($Value -isnot [bool] -or $Value -ne $ExpectedValue) {
        throw "$Name must be the JSON boolean '$($ExpectedValue.ToString().ToLowerInvariant())'; found '$Value'."
    }
}

function Get-PositiveJsonInteger {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][AllowNull()][object]$Value
    )

    if ($Value -isnot [int] -and $Value -isnot [long]) {
        $typeName = if ($null -eq $Value) { 'null' } else { $Value.GetType().FullName }
        throw "$Name must be a JSON integer; found '$typeName'."
    }
    $integer = [long]$Value
    if ($integer -le 0) {
        throw "$Name must be positive; found '$integer'."
    }
    return $integer
}

function Get-NonNegativeJsonInteger {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][AllowNull()][object]$Value
    )

    if ($Value -isnot [int] -and $Value -isnot [long]) {
        $typeName = if ($null -eq $Value) { 'null' } else { $Value.GetType().FullName }
        throw "$Name must be a JSON integer; found '$typeName'."
    }
    $integer = [long]$Value
    if ($integer -lt 0) {
        throw "$Name must be nonnegative; found '$integer'."
    }
    return $integer
}

function Get-NonNegativeJsonNumber {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][AllowNull()][object]$Value
    )

    if ($Value -isnot [byte] -and $Value -isnot [sbyte] -and
        $Value -isnot [short] -and $Value -isnot [ushort] -and
        $Value -isnot [int] -and $Value -isnot [uint] -and
        $Value -isnot [long] -and $Value -isnot [ulong] -and
        $Value -isnot [float] -and $Value -isnot [double] -and
        $Value -isnot [decimal]) {
        $typeName = if ($null -eq $Value) { 'null' } else { $Value.GetType().FullName }
        throw "$Name must be a JSON number; found '$typeName'."
    }
    $number = [double]$Value
    if ([double]::IsNaN($number) -or [double]::IsInfinity($number) -or $number -lt 0) {
        throw "$Name must be one finite nonnegative JSON number; found '$Value'."
    }
    return $number
}

function Get-ExactTimestamp {
    param(
        [Parameter(Mandatory)][string]$Name,
        [AllowNull()][AllowEmptyString()][object]$Value
    )

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw "$Name must be a nonempty round-trip timestamp."
    }
    try {
        $timestamp = [datetimeoffset]::ParseExact(
            $text,
            'o',
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::None
        )
    }
    catch {
        throw "$Name is not an exact round-trip timestamp: '$text'."
    }
    if ($timestamp.ToString('o', [Globalization.CultureInfo]::InvariantCulture) -cne $text) {
        throw "$Name is not in canonical round-trip form: '$text'."
    }
    return $timestamp
}

function Assert-ControlAuthorityState {
    param(
        [Parameter(Mandatory)][string]$LaunchControlHead,
        [switch]$RequireLaunchHead,
        [switch]$RequireSourceReview
    )

    if ($RequireLaunchHead -and $RequireSourceReview) {
        throw 'Control authority state cannot require both the launch head and the source-review child.'
    }
    if ($LaunchControlHead -notmatch '^[0-9a-f]{40}$') {
        throw "Launch control HEAD is not one lowercase 40-character hash: '$LaunchControlHead'."
    }
    Assert-Exact -Name 'control shallow state' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', '--is-shallow-repository')) -ExpectedValue 'false'
    Assert-Exact -Name 'control replace refs' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('for-each-ref', '--format=%(refname)', 'refs/replace')) -ExpectedValue ''
    $currentControlHead = Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', 'HEAD')
    & git -C $ControlRoot merge-base --is-ancestor $LaunchControlHead $currentControlHead
    if ($LASTEXITCODE -ne 0) {
        throw "Launch control HEAD $LaunchControlHead is not an ancestor of current control HEAD $currentControlHead."
    }
    $postLaunchCommitCount = [int](Invoke-Git -Root $ControlRoot -GitArgs @('rev-list', '--count', "$LaunchControlHead..$currentControlHead"))
    if ($postLaunchCommitCount -notin @(0, 1)) {
        throw "Control history after launch must contain zero commits before review or one review-only commit; found $postLaunchCommitCount."
    }
    if ($RequireSourceReview -and $postLaunchCommitCount -ne 1) {
        throw 'SOURCE_REVIEW_REQUIRED: phase two requires exactly one committed review-only child of the launch control HEAD.'
    }
    if ($RequireLaunchHead -and $postLaunchCommitCount -ne 0) {
        throw 'PREMATURE_SOURCE_REVIEW: phase one requires current control HEAD to equal the launch control HEAD.'
    }

    Assert-Exact -Name 'source review absent at launch control HEAD' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('ls-tree', '-r', '--name-only', $LaunchControlHead, '--', $SourceReviewRelativePath)) -ExpectedValue ''
    $launchToCurrent = Get-Lines (Invoke-Git -Root $ControlRoot -GitArgs @('diff', '--name-status', '--no-renames', $LaunchControlHead, $currentControlHead, '--'))
    if ($postLaunchCommitCount -eq 0) {
        Assert-Exact -Name 'pre-review control HEAD' -Actual $currentControlHead -ExpectedValue $LaunchControlHead
        Assert-Exact -Name 'pre-review committed control delta' -Actual ($launchToCurrent -join "`n") -ExpectedValue ''
        Assert-Exact -Name 'source review absent before review commit' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('ls-tree', '-r', '--name-only', $currentControlHead, '--', $SourceReviewRelativePath)) -ExpectedValue ''
    }
    else {
        Assert-Exact -Name 'review commit sole parent' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('show', '-s', '--format=%P', $currentControlHead)) -ExpectedValue $LaunchControlHead
        Assert-ExactSet -Name 'launch-to-review committed control delta' -Actual $launchToCurrent -ExpectedValues @("A`t$SourceReviewRelativePath")
        [void](Get-TreeBlob -Root $ControlRoot -Commit $currentControlHead -Path $SourceReviewRelativePath)
    }

    Assert-NoDuplicateStrings -Name 'control authority/verifier paths' -Values $ControlAuthorityRelativePaths
    foreach ($relativePath in $ControlAuthorityRelativePaths) {
        $launchBlob = Get-TreeBlob -Root $ControlRoot -Commit $LaunchControlHead -Path $relativePath
        $currentBlob = Get-TreeBlob -Root $ControlRoot -Commit $currentControlHead -Path $relativePath
        Assert-Exact -Name "launch/current control blob $relativePath" -Actual $currentBlob -ExpectedValue $launchBlob
        $physicalPath = Join-Path $ControlRoot ($relativePath -replace '/', '\')
        if (-not (Test-Path -LiteralPath $physicalPath -PathType Leaf)) {
            throw "Control authority/verifier file is unavailable: $relativePath"
        }
        Assert-Exact -Name "current control worktree blob $relativePath" -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object', '--', $physicalPath)) -ExpectedValue $currentBlob
    }

    Assert-Exact -Name 'tracked control worktree status' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=no')) -ExpectedValue ''
    $controlUntrackedPaths = Get-Lines (Invoke-Git -Root $ControlRoot -GitArgs @('ls-files', '--others', '--exclude-standard', '--'))
    Assert-NoDuplicateStrings -Name 'control untracked evidence paths' -Values $controlUntrackedPaths
    Assert-ExactSet -Name 'control untracked evidence path set' -Actual $controlUntrackedPaths -ExpectedValues $ExpectedControlUntrackedRelativePaths
    Assert-Exact -Name 'CLI log is not tracked' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('ls-files', '--', $CliLogRelativePath)) -ExpectedValue ''
    Assert-Exact -Name 'CLI log exact ignore match' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('check-ignore', '--no-index', '--', $CliLogRelativePath)) -ExpectedValue $CliLogRelativePath
    Assert-Exact -Name 'control HEAD stable during authority verification' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $currentControlHead
}

function Assert-RecoveryPrelaunchEvidence {
    param([Parameter(Mandatory)][string]$LaunchControlHead)

    Assert-Exact -Name 'preserved primary failure manifest SHA-256' -Actual (Get-Sha256 -Path $PrimaryFailureManifestPath) -ExpectedValue $Expected.PrimaryFailureManifestSha256
    Assert-Exact -Name 'primary prompt transport incident SHA-256' -Actual (Get-Sha256 -Path $PrimaryFailureIncidentPath) -ExpectedValue $Expected.PrimaryFailureIncidentSha256
    Assert-Exact -Name 'original failed launcher remains byte-exact' -Actual (Get-Sha256 -Path $OriginalLauncherPath) -ExpectedValue $Expected.OriginalLauncherSha256
    Assert-Exact -Name 'original prompt remains byte-exact' -Actual (Get-Sha256 -Path $OriginalPromptPath) -ExpectedValue $Expected.PromptSha256
    Assert-Exact -Name 'original prompt byte length' -Actual (Get-Item -LiteralPath $OriginalPromptPath).Length -ExpectedValue $Expected.PromptLengthBytes
    Assert-Exact -Name 'recovery prompt byte identity with original prompt' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object','--',$PromptPath)) -ExpectedValue (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object','--',$OriginalPromptPath))

    $manifest = Get-RequiredJsonObject -Path $PrimaryFailureManifestPath -Name 'preserved primary failure manifest'
    Assert-ExactObjectProperties -Name 'preserved primary failure manifest' -Object $manifest -ExpectedNames @(
        'schema_version','assignment_id','classification','source_archive',
        'preserved_file_count','manifest_rows_sha256','manifest_rows_method','files'
    )
    Assert-Exact -Name 'primary failure manifest schema' -Actual $manifest.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'primary failure manifest assignment' -Actual $manifest.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'primary failure classification' -Actual $manifest.classification -ExpectedValue 'PRIMARY_PROVIDER_PROCESS_CREATED_PROMPT_BOUNDARY_NOT_COMPLETED'
    Assert-Exact -Name 'primary failure source archive' -Actual $manifest.source_archive -ExpectedValue 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean-sequence26-settings-rollback-recovered-20260831T1445197645303Z-9d4a3fc1b2914828b2e5674c87f52312'
    Assert-Exact -Name 'primary failure preserved file count declaration' -Actual (Get-PositiveJsonInteger -Name 'primary failure preserved file count' -Value $manifest.preserved_file_count) -ExpectedValue 11
    Assert-Exact -Name 'primary failure row digest declaration' -Actual $manifest.manifest_rows_sha256 -ExpectedValue $Expected.PrimaryFailureManifestRowsSha256
    Assert-Exact -Name 'primary failure row method' -Actual $manifest.manifest_rows_method -ExpectedValue 'UTF-8 no-BOM path|byte-length|sha256 rows sorted ordinal by forward-slash relative path, each LF-terminated; this manifest is excluded'
    if ($manifest.files -isnot [array]) { throw 'Preserved primary failure manifest files must be a JSON array.' }
    $expectedPaths = @(
        'environment-contract.json',
        'guardian-done.json',
        'guardian-ready.json',
        'guardian-stop.signal',
        'guardian.ps1.bin',
        'primary.claim.json',
        'private-profile/.gemini/antigravity-cli/settings.json',
        'private-profile/.gemini/config/projects/64ba9d6d-900c-4894-8bc8-b0e0a4f52906.json',
        'provider-identity.json',
        'stale-recovery.json',
        'transaction.json'
    )
    $actualPaths = @($manifest.files | ForEach-Object { [string]$_.path })
    Assert-Exact -Name 'primary failure manifest path order' -Actual ($actualPaths -join "`n") -ExpectedValue ($expectedPaths -join "`n")
    $rows = [Text.StringBuilder]::new()
    foreach ($entry in @($manifest.files)) {
        Assert-ExactObjectProperties -Name "primary failure row $($entry.path)" -Object $entry -ExpectedNames @('path','bytes','sha256')
        $relativePath = [string]$entry.path
        if ([IO.Path]::IsPathRooted($relativePath) -or $relativePath.Contains('\') -or $relativePath.Contains(':') -or @($relativePath.Split('/') | Where-Object { $_ -in @('', '.', '..') }).Count -ne 0) {
            throw "Primary failure manifest path is unsafe: $relativePath"
        }
        $physicalPath = Join-Path $PrimaryFailureRoot ($relativePath -replace '/', '\')
        Assert-StrictChildPath -Parent $PrimaryFailureRoot -Child $physicalPath -Name "primary failure evidence $relativePath"
        Assert-NoReparsePath -Path $physicalPath -Name "primary failure evidence $relativePath" -RequireLeaf
        $length = [long](Get-Item -LiteralPath $physicalPath).Length
        $sha256 = Get-Sha256 -Path $physicalPath
        Assert-Exact -Name "primary failure length $relativePath" -Actual $length -ExpectedValue (Get-PositiveJsonInteger -Name "primary failure length $relativePath" -Value $entry.bytes)
        Assert-Exact -Name "primary failure SHA-256 $relativePath" -Actual $sha256 -ExpectedValue $entry.sha256
        [void]$rows.Append($relativePath).Append('|').Append($length).Append('|').Append($sha256).Append("`n")
    }
    $rowBytes = [Text.UTF8Encoding]::new($false).GetBytes($rows.ToString())
    $rowDigest = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($rowBytes)).ToLowerInvariant()
    Assert-Exact -Name 'primary failure manifest recomputed row digest' -Actual $rowDigest -ExpectedValue $Expected.PrimaryFailureManifestRowsSha256

    foreach ($path in @($TransportSelfTestSummaryPath,$TransportSelfTestChildOutputPath,$TransportSelfTestChildStderrPath)) {
        Assert-NoReparsePath -Path $path -Name 'provider-free prompt transport self-test evidence' -RequireLeaf
    }
    $summary = Get-RequiredJsonObject -Path $TransportSelfTestSummaryPath -Name 'provider-free prompt transport self-test summary'
    $child = Get-RequiredJsonObject -Path $TransportSelfTestChildOutputPath -Name 'provider-free prompt transport child output'
    Assert-ExactObjectProperties -Name 'provider-free prompt transport self-test summary' -Object $summary -ExpectedNames @(
        'schema_version','assignment_id','transport_idempotency_key','status','control_head','control_tree',
        'launcher_path','launcher_blob_sha1','prompt_path','prompt_sha256','prompt_length_bytes','prompt_transport',
        'prompt_inheritable','prompt_read_only','prompt_share_mode','prompt_initial_offset','prompt_offset_before_create',
        'child_executable_path','child_output_sha256','child_stderr_sha256','child_bytes_read','child_prompt_sha256',
        'child_eof_observed','child_exit_code','created_with_job_list_attribute','job_bound_before_resume',
        'job_active_processes_after','provider_executable_launched','provider_identity_present',
        'canonical_global_pre_sha256','canonical_global_post_sha256','canonical_project_pre_sha256',
        'canonical_project_post_sha256','recorded_at'
    )
    Assert-ExactObjectProperties -Name 'provider-free prompt transport child output' -Object $child -ExpectedNames @('schema_version','bytes_read','sha256','eof_observed','reader_process_id')
    Assert-Exact -Name 'self-test schema' -Actual $summary.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'self-test assignment' -Actual $summary.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'self-test transport key' -Actual $summary.transport_idempotency_key -ExpectedValue $Expected.TransportIdempotencyKey
    Assert-Exact -Name 'self-test status' -Actual $summary.status -ExpectedValue 'PASS'
    Assert-Exact -Name 'self-test launcher path' -Actual $summary.launcher_path -ExpectedValue $LauncherRelativePath
    Assert-Exact -Name 'self-test prompt path' -Actual $summary.prompt_path -ExpectedValue $PromptRelativePath
    Assert-Exact -Name 'self-test prompt SHA-256' -Actual $summary.prompt_sha256 -ExpectedValue $Expected.PromptSha256
    Assert-Exact -Name 'self-test prompt length' -Actual (Get-PositiveJsonInteger -Name 'self-test prompt length' -Value $summary.prompt_length_bytes) -ExpectedValue $Expected.PromptLengthBytes
    Assert-Exact -Name 'self-test prompt transport' -Actual $summary.prompt_transport -ExpectedValue 'INHERITED_LOCKED_READ_ONLY_PROMPT_FILE_HANDLE_V1'
    Assert-JsonBoolean -Name 'self-test prompt inheritable' -Value $summary.prompt_inheritable -ExpectedValue $true
    Assert-JsonBoolean -Name 'self-test prompt read only' -Value $summary.prompt_read_only -ExpectedValue $true
    Assert-Exact -Name 'self-test prompt share mode' -Actual $summary.prompt_share_mode -ExpectedValue 'FILE_SHARE_READ_ONLY'
    Assert-Exact -Name 'self-test initial offset' -Actual (Get-NonNegativeJsonInteger -Name 'self-test initial offset' -Value $summary.prompt_initial_offset) -ExpectedValue 0
    Assert-Exact -Name 'self-test pre-create offset' -Actual (Get-NonNegativeJsonInteger -Name 'self-test pre-create offset' -Value $summary.prompt_offset_before_create) -ExpectedValue 0
    Assert-Exact -Name 'self-test child executable' -Actual ([IO.Path]::GetFullPath([string]$summary.child_executable_path)) -ExpectedValue ([IO.Path]::GetFullPath((Join-Path $PSHOME 'pwsh.exe')))
    Assert-Exact -Name 'self-test child output SHA-256' -Actual $summary.child_output_sha256 -ExpectedValue (Get-Sha256 -Path $TransportSelfTestChildOutputPath)
    Assert-Exact -Name 'self-test child stderr SHA-256' -Actual $summary.child_stderr_sha256 -ExpectedValue (Get-Sha256 -Path $TransportSelfTestChildStderrPath)
    Assert-Exact -Name 'self-test child stderr is empty' -Actual (Get-Sha256 -Path $TransportSelfTestChildStderrPath) -ExpectedValue 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    Assert-Exact -Name 'self-test child byte count' -Actual (Get-PositiveJsonInteger -Name 'self-test child byte count' -Value $summary.child_bytes_read) -ExpectedValue $Expected.PromptLengthBytes
    Assert-Exact -Name 'self-test child prompt SHA-256' -Actual $summary.child_prompt_sha256 -ExpectedValue $Expected.PromptSha256
    Assert-JsonBoolean -Name 'self-test child EOF' -Value $summary.child_eof_observed -ExpectedValue $true
    Assert-Exact -Name 'self-test child exit code' -Actual (Get-NonNegativeJsonInteger -Name 'self-test child exit code' -Value $summary.child_exit_code) -ExpectedValue 0
    Assert-JsonBoolean -Name 'self-test Job-list creation' -Value $summary.created_with_job_list_attribute -ExpectedValue $true
    Assert-JsonBoolean -Name 'self-test Job-bound before resume' -Value $summary.job_bound_before_resume -ExpectedValue $true
    Assert-Exact -Name 'self-test final Job process count' -Actual (Get-NonNegativeJsonInteger -Name 'self-test final Job process count' -Value $summary.job_active_processes_after) -ExpectedValue 0
    Assert-JsonBoolean -Name 'self-test provider executable launch state' -Value $summary.provider_executable_launched -ExpectedValue $false
    Assert-JsonBoolean -Name 'self-test provider identity state' -Value $summary.provider_identity_present -ExpectedValue $false
    foreach ($binding in @(
        @('canonical_global_pre_sha256',$Expected.GlobalSettingsSha256),
        @('canonical_global_post_sha256',$Expected.GlobalSettingsSha256),
        @('canonical_project_pre_sha256',$Expected.ProjectSettingsSha256),
        @('canonical_project_post_sha256',$Expected.ProjectSettingsSha256)
    )) { Assert-Exact -Name "self-test $($binding[0])" -Actual $summary.($binding[0]) -ExpectedValue $binding[1] }
    Assert-Exact -Name 'self-test child schema' -Actual $child.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'self-test child bytes' -Actual (Get-PositiveJsonInteger -Name 'self-test child bytes' -Value $child.bytes_read) -ExpectedValue $Expected.PromptLengthBytes
    Assert-Exact -Name 'self-test child SHA-256' -Actual $child.sha256 -ExpectedValue $Expected.PromptSha256
    Assert-JsonBoolean -Name 'self-test child EOF record' -Value $child.eof_observed -ExpectedValue $true
    [void](Get-PositiveJsonInteger -Name 'self-test reader process ID' -Value $child.reader_process_id)
    [void](Get-ExactTimestamp -Name 'self-test recorded_at' -Value $summary.recorded_at)

    $selfTestControlHead = [string]$summary.control_head
    $selfTestControlTree = [string]$summary.control_tree
    if ($selfTestControlHead -notmatch '^[0-9a-f]{40}$' -or $selfTestControlTree -notmatch '^[0-9a-f]{40}$') { throw 'Self-test control identity is malformed.' }
    Assert-Exact -Name 'self-test control tree resolution' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', "$selfTestControlHead^{tree}")) -ExpectedValue $selfTestControlTree
    Assert-Exact -Name 'launch control sole self-test parent' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('show','-s','--format=%P',$LaunchControlHead)) -ExpectedValue $selfTestControlHead
    Assert-Exact -Name 'self-test-to-launch commit count' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('rev-list','--count',"$selfTestControlHead..$LaunchControlHead")) -ExpectedValue '1'
    $selfTestPaths = @($TransportSelfTestChildOutputRelativePath,$TransportSelfTestChildStderrRelativePath,$TransportSelfTestSummaryRelativePath)
    Assert-Exact -Name 'self-test evidence absent from self-test control HEAD' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('ls-tree','-r','--name-only',$selfTestControlHead,'--','artifacts/native-program/qa/LT-NATIVE-ANTIGRAVITY-ROBOT-003.file-stdin-selftest')) -ExpectedValue ''
    $delta = Get-Lines (Invoke-Git -Root $ControlRoot -GitArgs @('diff','--name-status','--no-renames',$selfTestControlHead,$LaunchControlHead,'--'))
    Assert-ExactSet -Name 'self-test-only launch commit delta' -Actual $delta -ExpectedValues @($selfTestPaths | ForEach-Object { "A`t$_" })
    $selfTestLauncherBlob = Get-TreeBlob -Root $ControlRoot -Commit $selfTestControlHead -Path $LauncherRelativePath
    Assert-Exact -Name 'self-test launcher blob declaration' -Actual $summary.launcher_blob_sha1 -ExpectedValue $selfTestLauncherBlob
    Assert-Exact -Name 'launcher blob unchanged at launch' -Actual (Get-TreeBlob -Root $ControlRoot -Commit $LaunchControlHead -Path $LauncherRelativePath) -ExpectedValue $selfTestLauncherBlob
    Assert-Exact -Name 'launcher blob unchanged in current control worktree' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object','--',$LauncherPath)) -ExpectedValue $selfTestLauncherBlob
    Write-Evidence -Check 'recovery prelaunch evidence' -Value "primary_manifest=$($Expected.PrimaryFailureManifestSha256) selftest_parent=$selfTestControlHead launch=$LaunchControlHead provider_contact=false"
}

# PRIVATE_PROFILE_LAUNCH_PROVENANCE_V2
function Assert-LaunchProvenance {
    Assert-Exact -Name 'audited Antigravity launcher SHA-256' -Actual (Get-Sha256 -Path $LauncherPath) -ExpectedValue $Expected.LauncherSha256
    Assert-Exact -Name 'audited permission delta SHA-256' -Actual (Get-Sha256 -Path $PermissionDeltaPath) -ExpectedValue $Expected.PermissionDeltaSha256

    $permissionDelta = Get-RequiredJsonObject -Path $PermissionDeltaPath -Name 'permission delta'
    Assert-Exact -Name 'permission delta schema' -Actual $permissionDelta.schema_version -ExpectedValue '2.0'
    Assert-Exact -Name 'permission delta assignment' -Actual $permissionDelta.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'permission delta status' -Actual $permissionDelta.status -ExpectedValue 'AUTHORIZED_PENDING_SOLE_RECOVERY_FILE_HANDLE_DELTA'
    Assert-JsonBoolean -Name 'permission canonical global write authorization' -Value $permissionDelta.security_change.canonical_global_settings.written_by_launcher -ExpectedValue $false
    Assert-JsonBoolean -Name 'permission canonical project write authorization' -Value $permissionDelta.security_change.canonical_project_settings.written_by_launcher -ExpectedValue $false
    Assert-Exact -Name 'permission canonical global access' -Actual $permissionDelta.security_change.canonical_global_settings.access -ExpectedValue 'READ_ONLY_HASH_INVARIANT'
    Assert-Exact -Name 'permission canonical project access' -Actual $permissionDelta.security_change.canonical_project_settings.access -ExpectedValue 'READ_ONLY_HASH_INVARIANT'
    Assert-Exact -Name 'permission canonical global digest' -Actual $permissionDelta.security_change.canonical_global_settings.required_sha256 -ExpectedValue $Expected.GlobalSettingsSha256
    Assert-Exact -Name 'permission canonical project digest' -Actual $permissionDelta.security_change.canonical_project_settings.required_sha256 -ExpectedValue $Expected.ProjectSettingsSha256
    Assert-Exact -Name 'permission private profile root' -Actual ([IO.Path]::GetFullPath([string]$permissionDelta.private_profile.root)) -ExpectedValue ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact -Name 'permission isolated global digest' -Actual $permissionDelta.private_profile.global_settings_sha256 -ExpectedValue $Expected.IsolatedGlobalSettingsSha256
    Assert-Exact -Name 'permission isolated project digest' -Actual $permissionDelta.private_profile.project_settings_sha256 -ExpectedValue $Expected.IsolatedProjectSettingsSha256

    Assert-ExactObjectProperties -Name 'permission evidence schema fields' -Object $permissionDelta.evidence_schema_fields -ExpectedNames @(
        'environment_contract',
        'transaction_record',
        'guardian_ready',
        'provider_identity',
        'guardian_done',
        'stale_recovery',
        'launch_receipt'
    )
    Assert-ExactJsonStringSequence -Name 'permission environment-contract schema' -Value $permissionDelta.evidence_schema_fields.environment_contract -ExpectedValues $ExpectedEnvironmentContractProperties
    Assert-ExactJsonStringSequence -Name 'permission transaction-record schema' -Value $permissionDelta.evidence_schema_fields.transaction_record -ExpectedValues $ExpectedTransactionRecordProperties
    Assert-ExactJsonStringSequence -Name 'permission guardian-ready schema' -Value $permissionDelta.evidence_schema_fields.guardian_ready -ExpectedValues $ExpectedGuardianReadyProperties
    Assert-ExactJsonStringSequence -Name 'permission provider-identity schema' -Value $permissionDelta.evidence_schema_fields.provider_identity -ExpectedValues $ExpectedProviderIdentityProperties
    Assert-ExactJsonStringSequence -Name 'permission guardian-done schema' -Value $permissionDelta.evidence_schema_fields.guardian_done -ExpectedValues $ExpectedGuardianDoneProperties
    Assert-ExactJsonStringSequence -Name 'permission stale-recovery schema' -Value $permissionDelta.evidence_schema_fields.stale_recovery -ExpectedValues $ExpectedStaleRecoveryProperties
    Assert-ExactJsonStringSequence -Name 'permission launch-receipt schema' -Value $permissionDelta.evidence_schema_fields.launch_receipt -ExpectedValues $ExpectedLaunchReceiptProperties
    Assert-ExactObjectProperties -Name 'permission schema field counts' -Object $permissionDelta.schema_field_counts -ExpectedNames @(
        'environment_contract',
        'transaction_record',
        'guardian_ready',
        'provider_identity',
        'guardian_done',
        'stale_recovery',
        'launch_receipt'
    )
    foreach ($countBinding in @(
        @('environment_contract', 9),
        @('transaction_record', 34),
        @('guardian_ready', 20),
        @('provider_identity', 21),
        @('guardian_done', 29),
        @('stale_recovery', 13),
        @('launch_receipt', 100)
    )) {
        $countValue = $permissionDelta.schema_field_counts.PSObject.Properties[[string]$countBinding[0]].Value
        Assert-Exact -Name "permission $($countBinding[0]) schema field count" -Actual (Get-PositiveJsonInteger -Name "permission $($countBinding[0]) schema field count" -Value $countValue) -ExpectedValue $countBinding[1]
    }
    if ($permissionDelta.one_shot_controls -isnot [array]) {
        throw 'Permission one_shot_controls must be a JSON array.'
    }
    $oneShotControls = @($permissionDelta.one_shot_controls)
    foreach ($control in @(
        'Use one custom double-NUL Unicode environment and one atomic suspended Job-bound CreateProcessW call.',
        'Never kill by executable name and never treat other agy processes as an exclusivity boundary.',
        'Require the exact isolated appDataDir and permission markers and reject canonical Gemini-root log resolution.',
        'Freeze exact stdout, stderr, log, authenticated private-profile transcript, guardian evidence, and a strict success or failure receipt before any terminal throw.'
    )) {
        if (@($oneShotControls | Where-Object { $_ -is [string] -and $_ -ceq $control }).Count -ne 1) {
            throw "Permission delta must contain exactly one audited private-profile control: $control"
        }
    }

    $receipt = Get-RequiredJsonObject -Path $ReceiptPath -Name 'launch receipt'
    $claim = Get-RequiredJsonObject -Path $ClaimPath -Name 'one-shot claim'
    $environmentContract = Get-RequiredJsonObject -Path $EnvironmentContractPath -Name 'environment contract'
    $transactionRecord = Get-RequiredJsonObject -Path $TransactionRecordPath -Name 'transaction record'
    $guardianReady = Get-RequiredJsonObject -Path $GuardianReadyPath -Name 'guardian readiness record'
    $providerIdentity = Get-RequiredJsonObject -Path $ProviderIdentityPath -Name 'provider identity record'
    $guardianDone = Get-RequiredJsonObject -Path $GuardianDonePath -Name 'guardian completion record'

    Assert-ExactObjectProperties -Name 'launch receipt' -Object $receipt -ExpectedNames $ExpectedLaunchReceiptProperties
    Assert-ExactObjectProperties -Name 'one-shot claim' -Object $claim -ExpectedNames @(
        'assignment_id',
        'idempotency_key',
        'project_id',
        'process_id',
        'claimed_at',
        'control_head',
        'control_tree',
        'prompt_sha256',
        'isolation_protocol'
    )
    Assert-ExactObjectProperties -Name 'environment contract' -Object $environmentContract -ExpectedNames $ExpectedEnvironmentContractProperties
    Assert-ExactObjectProperties -Name 'transaction record' -Object $transactionRecord -ExpectedNames $ExpectedTransactionRecordProperties
    Assert-ExactObjectProperties -Name 'guardian readiness record' -Object $guardianReady -ExpectedNames $ExpectedGuardianReadyProperties
    Assert-ExactObjectProperties -Name 'provider identity record' -Object $providerIdentity -ExpectedNames $ExpectedProviderIdentityProperties
    Assert-ExactObjectProperties -Name 'guardian completion record' -Object $guardianDone -ExpectedNames $ExpectedGuardianDoneProperties

    Assert-JsonStringProperties -Name 'launch receipt' -Object $receipt -PropertyNames @(
        'schema_version', 'assignment_id', 'idempotency_key', 'project_id',
        'model', 'effort', 'agent_mode', 'control_head', 'control_tree',
        'provider_head', 'provider_tree', 'outer_status', 'conversation_id',
        'provider_process_started_at', 'provider_resumed_at', 'job_name',
        'job_assignment_confirmed_at', 'job_empty_verified_at',
        'provider_identity_path', 'provider_identity_sha256',
        'prompt_delivery_started_at', 'prompt_delivery_completed_at',
        'stdin_transport', 'prompt_file_sha256', 'prompt_handle_opened_at',
        'prompt_handle_verified_at', 'prompt_delivery_completion_semantics',
        'parent_finally_job_disposition', 'private_profile_root',
        'isolated_gemini_root', 'isolated_global_settings_path',
        'isolated_global_settings_initial_sha256',
        'isolated_global_settings_final_sha256', 'isolated_project_settings_path',
        'isolated_project_settings_initial_sha256',
        'isolated_project_settings_final_sha256', 'isolated_transcript_root',
        'environment_contract_path', 'environment_contract_sha256',
        'environment_block_sha256_utf16le', 'environment_key_set_sha256',
        'canonical_global_settings_path', 'canonical_global_settings_pre_sha256',
        'canonical_global_settings_post_sha256', 'canonical_project_settings_path',
        'canonical_project_settings_pre_sha256', 'canonical_project_settings_post_sha256',
        'transaction_record_path', 'transaction_record_sha256',
        'guardian_script_path', 'guardian_script_sha256', 'guardian_deadline_at',
        'guardian_ready_path', 'guardian_ready_sha256', 'guardian_done_path',
        'guardian_done_sha256', 'guardian_done_status',
        'guardian_done_provider_process_disposition', 'claim_path', 'claim_sha256',
        'raw_result_path', 'raw_result_sha256', 'stderr_path', 'stderr_sha256',
        'cli_log_path', 'cli_log_sha256', 'authenticated_transcript_source',
        'frozen_transcript_path', 'frozen_transcript_sha256', 'recorded_at'
    )
    Assert-JsonStringProperties -Name 'one-shot claim' -Object $claim -PropertyNames @(
        'assignment_id', 'idempotency_key', 'project_id', 'claimed_at',
        'control_head', 'control_tree', 'prompt_sha256', 'isolation_protocol'
    )
    Assert-JsonStringProperties -Name 'environment contract' -Object $environmentContract -PropertyNames @(
        'schema_version', 'assignment_id', 'private_profile_root',
        'inheritance_policy', 'environment_key_set_sha256',
        'environment_block_sha256_utf16le'
    )
    Assert-JsonStringProperties -Name 'transaction record' -Object $transactionRecord -PropertyNames @(
        'schema_version', 'assignment_id', 'idempotency_key', 'control_head',
        'control_tree', 'transaction_root', 'provider_identity_path',
        'provider_executable_path', 'provider_executable_sha256',
        'canonical_global_settings_path', 'canonical_global_settings_sha256',
        'canonical_project_settings_path', 'canonical_project_settings_sha256',
        'private_profile_root', 'isolated_global_settings_path',
        'isolated_global_settings_sha256', 'isolated_project_settings_path',
        'isolated_project_settings_sha256', 'environment_contract_path',
        'environment_contract_sha256', 'environment_block_sha256_utf16le',
        'environment_key_set_sha256', 'guardian_script_sha256',
        'guardian_deadline_at', 'job_name', 'job_created_at', 'armed_at'
    )
    Assert-JsonStringProperties -Name 'guardian readiness record' -Object $guardianReady -PropertyNames @(
        'schema_version', 'assignment_id', 'transaction_record_sha256',
        'canonical_global_settings_sha256', 'canonical_project_settings_sha256',
        'isolated_global_settings_sha256', 'isolated_project_settings_sha256',
        'private_profile_root', 'environment_contract_sha256',
        'provider_identity_path', 'guardian_deadline_at', 'job_name',
        'job_opened_at', 'ready_at'
    )
    Assert-JsonStringProperties -Name 'provider identity record' -Object $providerIdentity -PropertyNames @(
        'schema_version', 'assignment_id', 'idempotency_key',
        'transaction_record_sha256', 'provider_executable_path',
        'provider_executable_sha256', 'provider_started_at', 'job_name',
        'job_assignment_confirmed_at', 'private_profile_root',
        'environment_contract_sha256', 'environment_block_sha256_utf16le',
        'environment_key_set_sha256', 'recorded_at'
    )
    Assert-JsonStringProperties -Name 'guardian completion record' -Object $guardianDone -PropertyNames @(
        'schema_version', 'assignment_id', 'status', 'transaction_record_sha256',
        'guardian_deadline_at', 'trigger_observed_at', 'provider_identity_status',
        'provider_identity_sha256', 'job_name', 'job_empty_verified_at',
        'provider_process_disposition', 'canonical_global_settings_sha256',
        'canonical_project_settings_sha256', 'isolated_global_settings_sha256',
        'isolated_project_settings_sha256', 'private_profile_root',
        'environment_contract_sha256', 'completed_at'
    )

    Assert-Exact -Name 'receipt schema' -Actual $receipt.schema_version -ExpectedValue '2.0'
    Assert-Exact -Name 'receipt assignment' -Actual $receipt.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'receipt transport idempotency key' -Actual $receipt.idempotency_key -ExpectedValue $Expected.TransportIdempotencyKey
    Assert-Exact -Name 'receipt project' -Actual $receipt.project_id -ExpectedValue $Expected.ProviderProjectId
    Assert-Exact -Name 'receipt model' -Actual $receipt.model -ExpectedValue $Expected.ProviderModel
    Assert-Exact -Name 'receipt effort' -Actual $receipt.effort -ExpectedValue 'high'
    Assert-Exact -Name 'receipt agent mode' -Actual $receipt.agent_mode -ExpectedValue $Expected.ProviderAgentMode
    Assert-Exact -Name 'receipt provider head' -Actual $receipt.provider_head -ExpectedValue $Expected.AuthorityParent
    Assert-Exact -Name 'receipt provider tree' -Actual $receipt.provider_tree -ExpectedValue $Expected.AuthorityTree
    if (($receipt.process_exit_code -isnot [int] -and $receipt.process_exit_code -isnot [long]) -or [long]$receipt.process_exit_code -ne 0) {
        throw "Receipt process exit code must be the JSON integer 0; found '$($receipt.process_exit_code)'."
    }
    Assert-Exact -Name 'receipt outer status' -Actual $receipt.outer_status -ExpectedValue 'SUCCESS'
    Assert-Exact -Name 'receipt prompt delivery timeout seconds' -Actual (Get-PositiveJsonInteger -Name 'receipt prompt delivery timeout seconds' -Value $receipt.prompt_delivery_timeout_seconds) -ExpectedValue $Expected.PromptDeliveryTimeoutSeconds
    Assert-JsonBoolean -Name 'receipt prompt delivery timed out' -Value $receipt.prompt_delivery_timed_out -ExpectedValue $false
    Assert-Exact -Name 'receipt stdin transport' -Actual $receipt.stdin_transport -ExpectedValue 'INHERITED_LOCKED_READ_ONLY_PROMPT_FILE_HANDLE_V1'
    Assert-Exact -Name 'receipt prompt file SHA-256' -Actual $receipt.prompt_file_sha256 -ExpectedValue $Expected.PromptSha256
    Assert-Exact -Name 'receipt prompt file byte length' -Actual (Get-PositiveJsonInteger -Name 'receipt prompt file byte length' -Value $receipt.prompt_file_byte_length) -ExpectedValue $Expected.PromptLengthBytes
    Assert-JsonBoolean -Name 'receipt prompt file inheritable' -Value $receipt.prompt_file_inheritable -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt prompt file read-only' -Value $receipt.prompt_file_read_only -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt prompt file share-read-only' -Value $receipt.prompt_file_share_read_only -ExpectedValue $true
    Assert-Exact -Name 'receipt prompt file offset before process creation' -Actual (Get-NonNegativeJsonInteger -Name 'receipt prompt file offset before process creation' -Value $receipt.prompt_file_offset_before_create) -ExpectedValue 0
    Assert-JsonBoolean -Name 'receipt prompt delivery timeout applicable' -Value $receipt.prompt_delivery_timeout_applicable -ExpectedValue $false
    Assert-Exact -Name 'receipt prompt delivery completion semantics' -Actual $receipt.prompt_delivery_completion_semantics -ExpectedValue 'HANDLE_VERIFIED_BOUND_AND_AVAILABLE_AT_RESUME_NOT_CHILD_CONSUMPTION'
    Assert-Exact -Name 'receipt wrapper timeout seconds' -Actual (Get-PositiveJsonInteger -Name 'receipt wrapper timeout seconds' -Value $receipt.wrapper_timeout_seconds) -ExpectedValue $Expected.WrapperTimeoutSeconds
    Assert-JsonBoolean -Name 'receipt wrapper timeout triggered' -Value $receipt.wrapper_timeout_triggered -ExpectedValue $false
    Assert-JsonBoolean -Name 'receipt job kill-on-close' -Value $receipt.job_kill_on_close -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt atomic job-list creation' -Value $receipt.created_with_job_list_attribute -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt job bound before resume' -Value $receipt.job_bound_before_resume -ExpectedValue $true
    Assert-Exact -Name 'receipt completed Job Object active-process count' -Actual (Get-NonNegativeJsonInteger -Name 'receipt completed Job Object active-process count' -Value $receipt.job_active_process_count_at_completion) -ExpectedValue 0
    Assert-Exact -Name 'receipt parent-finally job disposition' -Actual $receipt.parent_finally_job_disposition -ExpectedValue 'JOB_ALREADY_EMPTY'
    if ($null -ne $receipt.parent_finally_job_error) {
        throw "Receipt parent-finally job error must be JSON null; found '$($receipt.parent_finally_job_error)'."
    }
    Assert-JsonBoolean -Name 'receipt Unicode environment' -Value $receipt.create_unicode_environment -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt non-null environment pointer' -Value $receipt.environment_pointer_non_null -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt private-profile reparse-free state' -Value $receipt.profile_reparse_free -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt canonical settings write state' -Value $receipt.canonical_settings_written -ExpectedValue $false
    Assert-JsonBoolean -Name 'receipt isolated appData marker' -Value $receipt.isolation_app_data_log_marker_observed -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt canonical Gemini marker' -Value $receipt.canonical_gemini_path_log_marker_observed -ExpectedValue $false
    Assert-JsonBoolean -Name 'receipt project permission grants loaded' -Value $receipt.project_permission_grants_loaded -ExpectedValue $true
    Assert-JsonBoolean -Name 'receipt guardian completed before deadline' -Value $receipt.guardian_done_completed_before_deadline -ExpectedValue $true
    Assert-Exact -Name 'receipt guardian deadline seconds' -Actual (Get-PositiveJsonInteger -Name 'receipt guardian deadline seconds' -Value $receipt.guardian_deadline_seconds) -ExpectedValue $Expected.GuardianDeadlineSeconds
    if ($null -ne $receipt.terminal_inspection_error) {
        throw "Receipt terminal inspection error must be JSON null; found '$($receipt.terminal_inspection_error)'."
    }

    $conversationId = [string]$receipt.conversation_id
    if ($conversationId -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
        throw "Receipt conversation ID is not one lowercase UUID: '$conversationId'."
    }
    $jobName = [string]$receipt.job_name
    $jobNamePattern = '^' + [regex]::Escape($Expected.JobObjectNamePrefix) + '[0-9a-f]{32}$'
    if ($jobName -notmatch $jobNamePattern) {
        throw "Receipt Job Object name is not the exact transaction-scoped 128-bit form: '$jobName'."
    }

    Assert-StrictChildPath -Parent $TransactionRoot -Child $PrivateProfileRoot -Name 'private profile root'
    foreach ($path in @(
        $TransactionRoot,
        $PrivateProfileRoot,
        $IsolatedGeminiRoot,
        (Split-Path -Parent $IsolatedGlobalSettingsPath),
        (Split-Path -Parent $IsolatedProjectSettingsPath),
        $IsolatedTranscriptRoot,
        $EnvironmentContractPath,
        $TransactionRecordPath,
        $GuardianScriptPath,
        $GuardianReadyPath,
        $GuardianDonePath,
        $ProviderIdentityPath
    )) {
        Assert-NoReparsePath -Path $path -Name 'private-profile launch evidence' -RequireLeaf
    }
    foreach ($path in @(
        $IsolatedGeminiRoot,
        $IsolatedGlobalSettingsPath,
        $IsolatedProjectSettingsPath,
        $IsolatedTranscriptRoot,
        $EnvironmentContractPath,
        $TransactionRecordPath,
        $GuardianScriptPath,
        $GuardianReadyPath,
        $GuardianDonePath,
        $ProviderIdentityPath
    )) {
        Assert-StrictChildPath -Parent $TransactionRoot -Child $path -Name 'transaction-owned path'
    }
    foreach ($path in @($Expected.GlobalSettingsPath, $Expected.ProjectSettingsPath)) {
        Assert-NoReparsePath -Path $path -Name 'canonical read-only settings' -RequireLeaf
    }

    Assert-Exact -Name 'receipt private profile root' -Actual ([IO.Path]::GetFullPath([string]$receipt.private_profile_root)) -ExpectedValue ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact -Name 'receipt isolated Gemini root' -Actual ([IO.Path]::GetFullPath([string]$receipt.isolated_gemini_root)) -ExpectedValue ([IO.Path]::GetFullPath($IsolatedGeminiRoot))
    Assert-Exact -Name 'receipt isolated global settings path' -Actual ([IO.Path]::GetFullPath([string]$receipt.isolated_global_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($IsolatedGlobalSettingsPath))
    Assert-Exact -Name 'receipt isolated project settings path' -Actual ([IO.Path]::GetFullPath([string]$receipt.isolated_project_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($IsolatedProjectSettingsPath))
    Assert-Exact -Name 'receipt isolated transcript root' -Actual ([IO.Path]::GetFullPath([string]$receipt.isolated_transcript_root)) -ExpectedValue ([IO.Path]::GetFullPath($IsolatedTranscriptRoot))
    Assert-Exact -Name 'receipt environment contract path' -Actual ([IO.Path]::GetFullPath([string]$receipt.environment_contract_path)) -ExpectedValue ([IO.Path]::GetFullPath($EnvironmentContractPath))
    Assert-Exact -Name 'receipt transaction record path' -Actual ([IO.Path]::GetFullPath([string]$receipt.transaction_record_path)) -ExpectedValue ([IO.Path]::GetFullPath($TransactionRecordPath))
    Assert-Exact -Name 'receipt guardian script path' -Actual ([IO.Path]::GetFullPath([string]$receipt.guardian_script_path)) -ExpectedValue ([IO.Path]::GetFullPath($GuardianScriptPath))
    Assert-Exact -Name 'receipt guardian ready path' -Actual ([IO.Path]::GetFullPath([string]$receipt.guardian_ready_path)) -ExpectedValue ([IO.Path]::GetFullPath($GuardianReadyPath))
    Assert-Exact -Name 'receipt guardian done path' -Actual ([IO.Path]::GetFullPath([string]$receipt.guardian_done_path)) -ExpectedValue ([IO.Path]::GetFullPath($GuardianDonePath))
    Assert-Exact -Name 'receipt provider identity path' -Actual ([IO.Path]::GetFullPath([string]$receipt.provider_identity_path)) -ExpectedValue ([IO.Path]::GetFullPath($ProviderIdentityPath))
    Assert-Exact -Name 'receipt canonical global path' -Actual ([IO.Path]::GetFullPath([string]$receipt.canonical_global_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($Expected.GlobalSettingsPath))
    Assert-Exact -Name 'receipt canonical project path' -Actual ([IO.Path]::GetFullPath([string]$receipt.canonical_project_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($Expected.ProjectSettingsPath))

    Assert-Exact -Name 'receipt isolated global initial digest' -Actual $receipt.isolated_global_settings_initial_sha256 -ExpectedValue $Expected.IsolatedGlobalSettingsSha256
    Assert-Exact -Name 'receipt isolated global final digest' -Actual $receipt.isolated_global_settings_final_sha256 -ExpectedValue $Expected.IsolatedGlobalSettingsSha256
    Assert-Exact -Name 'receipt isolated project initial digest' -Actual $receipt.isolated_project_settings_initial_sha256 -ExpectedValue $Expected.IsolatedProjectSettingsSha256
    Assert-Exact -Name 'receipt isolated project final digest' -Actual $receipt.isolated_project_settings_final_sha256 -ExpectedValue $Expected.IsolatedProjectSettingsSha256
    Assert-Exact -Name 'isolated global settings file digest' -Actual (Get-Sha256 -Path $IsolatedGlobalSettingsPath) -ExpectedValue $Expected.IsolatedGlobalSettingsSha256
    Assert-Exact -Name 'isolated project settings file digest' -Actual (Get-Sha256 -Path $IsolatedProjectSettingsPath) -ExpectedValue $Expected.IsolatedProjectSettingsSha256
    Assert-Exact -Name 'receipt canonical global pre digest' -Actual $receipt.canonical_global_settings_pre_sha256 -ExpectedValue $Expected.GlobalSettingsSha256
    Assert-Exact -Name 'receipt canonical global post digest' -Actual $receipt.canonical_global_settings_post_sha256 -ExpectedValue $Expected.GlobalSettingsSha256
    Assert-Exact -Name 'receipt canonical project pre digest' -Actual $receipt.canonical_project_settings_pre_sha256 -ExpectedValue $Expected.ProjectSettingsSha256
    Assert-Exact -Name 'receipt canonical project post digest' -Actual $receipt.canonical_project_settings_post_sha256 -ExpectedValue $Expected.ProjectSettingsSha256
    Assert-Exact -Name 'live canonical global read-only digest' -Actual (Get-Sha256 -Path $Expected.GlobalSettingsPath) -ExpectedValue $Expected.GlobalSettingsSha256
    Assert-Exact -Name 'live canonical project read-only digest' -Actual (Get-Sha256 -Path $Expected.ProjectSettingsPath) -ExpectedValue $Expected.ProjectSettingsSha256

    $isolatedGlobal = Get-RequiredJsonObject -Path $IsolatedGlobalSettingsPath -Name 'isolated global settings'
    Assert-ExactObjectProperties -Name 'isolated global settings' -Object $isolatedGlobal -ExpectedNames @('permissions')
    Assert-ExactObjectProperties -Name 'isolated global permissions' -Object $isolatedGlobal.permissions -ExpectedNames @('allow', 'deny')
    Assert-ExactJsonStringSequence -Name 'isolated global allow grants' -Value $isolatedGlobal.permissions.allow -ExpectedValues @(
        'command(git rev-parse)',
        'command(git remote get-url)',
        'command(git branch --show-current)',
        'command(git status)',
        'command(git diff)',
        'command(git show)',
        'command(git log)'
    )
    Assert-ExactJsonStringSequence -Name 'isolated global deny grants' -Value $isolatedGlobal.permissions.deny -ExpectedValues @(
        'unsandboxed(*)',
        'read_url(*)',
        'execute_url(*)',
        'mcp(*)'
    )
    $isolatedProject = Get-RequiredJsonObject -Path $IsolatedProjectSettingsPath -Name 'isolated project settings'
    Assert-ExactObjectProperties -Name 'isolated project settings' -Object $isolatedProject -ExpectedNames @('id', 'name', 'projectResources', 'permissionGrants')
    Assert-Exact -Name 'isolated project ID' -Actual $isolatedProject.id -ExpectedValue $Expected.ProviderProjectId
    Assert-Exact -Name 'isolated project name' -Actual $isolatedProject.name -ExpectedValue $Expected.ProviderProjectName
    Assert-ExactObjectProperties -Name 'isolated project resources' -Object $isolatedProject.projectResources -ExpectedNames @('resources')
    if ($isolatedProject.projectResources.resources -isnot [array] -or @($isolatedProject.projectResources.resources).Count -ne 1) {
        throw 'Isolated project settings must contain exactly one project resource.'
    }
    Assert-ExactObjectProperties -Name 'isolated project resource' -Object $isolatedProject.projectResources.resources[0] -ExpectedNames @('folderUri')
    Assert-Exact -Name 'isolated project resource root' -Actual $isolatedProject.projectResources.resources[0].folderUri -ExpectedValue 'file://C:/Users/edwar/.codex/provider-sandboxes/lt-robot-dealer-antigravity-003-clean'
    Assert-ExactObjectProperties -Name 'isolated project permission wrapper' -Object $isolatedProject.permissionGrants -ExpectedNames @('permissionGrants')
    Assert-ExactObjectProperties -Name 'isolated project permission grants' -Object $isolatedProject.permissionGrants.permissionGrants -ExpectedNames @('allow', 'deny')
    Assert-ExactJsonStringSequence -Name 'isolated project allow grants' -Value $isolatedProject.permissionGrants.permissionGrants.allow -ExpectedValues @('write_file(*)')
    Assert-ExactJsonStringSequence -Name 'isolated project deny grants' -Value $isolatedProject.permissionGrants.permissionGrants.deny -ExpectedValues @(
        'command(*)',
        'write_file(C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean\PUBLIC_CONTRACT.json)',
        'write_file(C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean\RESULT_SCHEMA.json)',
        'unsandboxed(*)',
        'read_url(*)',
        'execute_url(*)',
        'mcp(*)'
    )

    Assert-Exact -Name 'environment contract schema' -Actual $environmentContract.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'environment contract assignment' -Actual $environmentContract.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'environment contract private profile' -Actual ([IO.Path]::GetFullPath([string]$environmentContract.private_profile_root)) -ExpectedValue ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact -Name 'environment inheritance policy' -Actual $environmentContract.inheritance_policy -ExpectedValue 'EXACT_SAFE_OS_RUNTIME_ALLOWLIST'
    if ($environmentContract.inherited_names -isnot [array]) {
        throw 'Environment inherited_names must be a JSON array.'
    }
    $inheritedNames = @($environmentContract.inherited_names | ForEach-Object {
        if ($_ -isnot [string] -or [string]::IsNullOrWhiteSpace([string]$_)) {
            throw 'Every environment inherited_names entry must be one nonblank string.'
        }
        [string]$_
    })
    Assert-NoDuplicateStrings -Name 'environment inherited names' -Values $inheritedNames
    $safeInheritedNames = @(
        'ALLUSERSPROFILE', 'CommonProgramFiles', 'CommonProgramFiles(x86)',
        'CommonProgramW6432', 'ComSpec', 'DriverData', 'LANG', 'LC_ALL',
        'NUMBER_OF_PROCESSORS', 'OS', 'Path', 'PATHEXT',
        'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'PROCESSOR_LEVEL',
        'PROCESSOR_REVISION', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)',
        'ProgramW6432', 'PUBLIC', 'SystemDrive', 'SystemRoot', 'TZ', 'windir'
    )
    foreach ($name in $inheritedNames) {
        if ($safeInheritedNames -cnotcontains $name) {
            throw "Environment contract contains a non-allowlisted inherited key: '$name'."
        }
    }
    Assert-Exact -Name 'environment inherited-name ordering' -Actual ($inheritedNames -join "`n") -ExpectedValue (@($inheritedNames | Sort-Object) -join "`n")
    $overrideNames = @('USERPROFILE', 'HOME', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP', 'AGY_CLI_DISABLE_AUTO_UPDATE')
    Assert-ExactObjectProperties -Name 'environment overrides' -Object $environmentContract.overrides -ExpectedNames $overrideNames
    Assert-JsonStringProperties -Name 'environment overrides' -Object $environmentContract.overrides -PropertyNames $overrideNames
    $privateDrive = [IO.Path]::GetPathRoot($PrivateProfileRoot).TrimEnd('\')
    $privateHomePath = ([IO.Path]::GetFullPath($PrivateProfileRoot)).Substring($privateDrive.Length)
    $expectedOverrides = [ordered]@{
        USERPROFILE = [IO.Path]::GetFullPath($PrivateProfileRoot)
        HOME = [IO.Path]::GetFullPath($PrivateProfileRoot)
        HOMEDRIVE = $privateDrive
        HOMEPATH = $privateHomePath
        APPDATA = Join-Path $PrivateProfileRoot 'AppData\Roaming'
        LOCALAPPDATA = Join-Path $PrivateProfileRoot 'AppData\Local'
        TEMP = Join-Path $PrivateProfileRoot 'AppData\Local\Temp'
        TMP = Join-Path $PrivateProfileRoot 'AppData\Local\Temp'
        AGY_CLI_DISABLE_AUTO_UPDATE = '1'
    }
    foreach ($name in $overrideNames) {
        Assert-Exact -Name "environment override $name" -Actual $environmentContract.overrides.$name -ExpectedValue $expectedOverrides[$name]
    }
    $environmentEntryCount = Get-PositiveJsonInteger -Name 'environment entry count' -Value $environmentContract.environment_entry_count
    Assert-Exact -Name 'environment entry count closure' -Actual $environmentEntryCount -ExpectedValue ($inheritedNames.Count + $overrideNames.Count)
    $environmentKeySetSha256 = Get-EnvironmentKeySetSha256 -Names @($inheritedNames + $overrideNames)
    Assert-Sha256String -Name 'environment key-set digest' -Value $environmentContract.environment_key_set_sha256
    Assert-Sha256String -Name 'environment block digest' -Value $environmentContract.environment_block_sha256_utf16le
    Assert-Exact -Name 'environment key-set recomputation' -Actual $environmentContract.environment_key_set_sha256 -ExpectedValue $environmentKeySetSha256
    Assert-Exact -Name 'receipt environment entry count' -Actual (Get-PositiveJsonInteger -Name 'receipt environment entry count' -Value $receipt.environment_entry_count) -ExpectedValue $environmentEntryCount
    Assert-Exact -Name 'receipt environment key-set digest' -Actual $receipt.environment_key_set_sha256 -ExpectedValue $environmentContract.environment_key_set_sha256
    Assert-Exact -Name 'receipt environment block digest' -Actual $receipt.environment_block_sha256_utf16le -ExpectedValue $environmentContract.environment_block_sha256_utf16le
    Assert-Exact -Name 'receipt environment contract digest' -Actual $receipt.environment_contract_sha256 -ExpectedValue (Get-Sha256 -Path $EnvironmentContractPath)

    Assert-Exact -Name 'claim assignment' -Actual $claim.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'claim transport idempotency key' -Actual $claim.idempotency_key -ExpectedValue $Expected.TransportIdempotencyKey
    Assert-Exact -Name 'claim project' -Actual $claim.project_id -ExpectedValue $Expected.ProviderProjectId
    Assert-Exact -Name 'claim isolation protocol' -Actual $claim.isolation_protocol -ExpectedValue 'PROCESS_PRIVATE_PROFILE_FILE_STDIN_V2'
    Assert-Exact -Name 'receipt claim digest' -Actual $receipt.claim_sha256 -ExpectedValue (Get-Sha256 -Path $ClaimPath)
    Assert-Exact -Name 'receipt raw result digest' -Actual $receipt.raw_result_sha256 -ExpectedValue (Get-Sha256 -Path $RawResultPath)
    Assert-Exact -Name 'receipt stderr digest' -Actual $receipt.stderr_sha256 -ExpectedValue (Get-Sha256 -Path $StderrPath)
    Assert-Exact -Name 'receipt CLI log digest' -Actual $receipt.cli_log_sha256 -ExpectedValue (Get-Sha256 -Path $CliLogPath)
    Assert-Exact -Name 'receipt transcript digest' -Actual $receipt.frozen_transcript_sha256 -ExpectedValue (Get-Sha256 -Path $TranscriptPath)
    Assert-Exact -Name 'receipt environment contract file digest' -Actual $receipt.environment_contract_sha256 -ExpectedValue (Get-Sha256 -Path $EnvironmentContractPath)
    Assert-Exact -Name 'receipt transaction record digest' -Actual $receipt.transaction_record_sha256 -ExpectedValue (Get-Sha256 -Path $TransactionRecordPath)
    Assert-Exact -Name 'receipt guardian script digest' -Actual $receipt.guardian_script_sha256 -ExpectedValue (Get-Sha256 -Path $GuardianScriptPath)
    Assert-Exact -Name 'receipt guardian ready digest' -Actual $receipt.guardian_ready_sha256 -ExpectedValue (Get-Sha256 -Path $GuardianReadyPath)
    Assert-Exact -Name 'receipt guardian done digest' -Actual $receipt.guardian_done_sha256 -ExpectedValue (Get-Sha256 -Path $GuardianDonePath)
    Assert-Exact -Name 'receipt provider identity digest' -Actual $receipt.provider_identity_sha256 -ExpectedValue (Get-Sha256 -Path $ProviderIdentityPath)
    Assert-Exact -Name 'receipt claim path' -Actual ([IO.Path]::GetFullPath([string]$receipt.claim_path)) -ExpectedValue ([IO.Path]::GetFullPath($ClaimPath))
    Assert-Exact -Name 'receipt raw result path' -Actual ([IO.Path]::GetFullPath([string]$receipt.raw_result_path)) -ExpectedValue ([IO.Path]::GetFullPath($RawResultPath))
    Assert-Exact -Name 'receipt stderr path' -Actual ([IO.Path]::GetFullPath([string]$receipt.stderr_path)) -ExpectedValue ([IO.Path]::GetFullPath($StderrPath))
    Assert-Exact -Name 'receipt CLI log path' -Actual ([IO.Path]::GetFullPath([string]$receipt.cli_log_path)) -ExpectedValue ([IO.Path]::GetFullPath($CliLogPath))
    Assert-Exact -Name 'receipt frozen transcript path' -Actual ([IO.Path]::GetFullPath([string]$receipt.frozen_transcript_path)) -ExpectedValue ([IO.Path]::GetFullPath($TranscriptPath))
    $expectedTranscriptSource = Join-Path $IsolatedTranscriptRoot "$conversationId\.system_generated\logs\transcript_full.jsonl"
    Assert-Exact -Name 'receipt private transcript source' -Actual ([IO.Path]::GetFullPath([string]$receipt.authenticated_transcript_source)) -ExpectedValue ([IO.Path]::GetFullPath($expectedTranscriptSource))
    Assert-NoReparsePath -Path $receipt.authenticated_transcript_source -Name 'private transcript source' -RequireLeaf

    $controlHead = [string]$receipt.control_head
    $controlTree = [string]$receipt.control_tree
    if ($controlHead -notmatch '^[0-9a-f]{40}$' -or $controlTree -notmatch '^[0-9a-f]{40}$') {
        throw 'Receipt control HEAD/tree must be exact lowercase 40-character hashes.'
    }
    Assert-Exact -Name 'receipt control tree resolves' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', "$controlHead^{tree}")) -ExpectedValue $controlTree
    Assert-ControlAuthorityState -LaunchControlHead $controlHead
    Assert-RecoveryPrelaunchEvidence -LaunchControlHead $controlHead
    Assert-Exact -Name 'claim control HEAD' -Actual $claim.control_head -ExpectedValue $controlHead
    Assert-Exact -Name 'claim control tree' -Actual $claim.control_tree -ExpectedValue $controlTree
    $directorProcessId = Get-PositiveJsonInteger -Name 'claim Director process ID' -Value $claim.process_id

    Assert-Exact -Name 'transaction schema' -Actual $transactionRecord.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'transaction assignment' -Actual $transactionRecord.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'transaction transport idempotency key' -Actual $transactionRecord.idempotency_key -ExpectedValue $Expected.TransportIdempotencyKey
    Assert-Exact -Name 'transaction Director process ID' -Actual (Get-PositiveJsonInteger -Name 'transaction Director process ID' -Value $transactionRecord.director_process_id) -ExpectedValue $directorProcessId
    $directorStartTicks = Get-PositiveJsonInteger -Name 'transaction Director start ticks' -Value $transactionRecord.director_start_time_utc_ticks
    Assert-Exact -Name 'transaction control HEAD' -Actual $transactionRecord.control_head -ExpectedValue $controlHead
    Assert-Exact -Name 'transaction control tree' -Actual $transactionRecord.control_tree -ExpectedValue $controlTree
    Assert-Exact -Name 'transaction root' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.transaction_root)) -ExpectedValue ([IO.Path]::GetFullPath($TransactionRoot))
    Assert-Exact -Name 'transaction provider identity path' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.provider_identity_path)) -ExpectedValue ([IO.Path]::GetFullPath($ProviderIdentityPath))
    Assert-Exact -Name 'transaction provider executable path' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.provider_executable_path)) -ExpectedValue ([IO.Path]::GetFullPath($AgyExePath))
    Assert-Exact -Name 'transaction provider executable digest' -Actual $transactionRecord.provider_executable_sha256 -ExpectedValue $Expected.AgyExeSha256
    Assert-Exact -Name 'live provider executable digest' -Actual (Get-Sha256 -Path $AgyExePath) -ExpectedValue $Expected.AgyExeSha256
    Assert-Exact -Name 'transaction canonical global path' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.canonical_global_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($Expected.GlobalSettingsPath))
    Assert-Exact -Name 'transaction canonical project path' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.canonical_project_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($Expected.ProjectSettingsPath))
    Assert-Exact -Name 'transaction canonical global digest' -Actual $transactionRecord.canonical_global_settings_sha256 -ExpectedValue $Expected.GlobalSettingsSha256
    Assert-Exact -Name 'transaction canonical project digest' -Actual $transactionRecord.canonical_project_settings_sha256 -ExpectedValue $Expected.ProjectSettingsSha256
    Assert-JsonBoolean -Name 'transaction canonical settings write state' -Value $transactionRecord.canonical_settings_written -ExpectedValue $false
    Assert-JsonBoolean -Name 'transaction profile reparse-free state' -Value $transactionRecord.profile_reparse_free -ExpectedValue $true
    Assert-Exact -Name 'transaction private profile' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.private_profile_root)) -ExpectedValue ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact -Name 'transaction isolated global path' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.isolated_global_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($IsolatedGlobalSettingsPath))
    Assert-Exact -Name 'transaction isolated global digest' -Actual $transactionRecord.isolated_global_settings_sha256 -ExpectedValue $Expected.IsolatedGlobalSettingsSha256
    Assert-Exact -Name 'transaction isolated project path' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.isolated_project_settings_path)) -ExpectedValue ([IO.Path]::GetFullPath($IsolatedProjectSettingsPath))
    Assert-Exact -Name 'transaction isolated project digest' -Actual $transactionRecord.isolated_project_settings_sha256 -ExpectedValue $Expected.IsolatedProjectSettingsSha256
    Assert-Exact -Name 'transaction environment contract path' -Actual ([IO.Path]::GetFullPath([string]$transactionRecord.environment_contract_path)) -ExpectedValue ([IO.Path]::GetFullPath($EnvironmentContractPath))
    Assert-Exact -Name 'transaction environment contract digest' -Actual $transactionRecord.environment_contract_sha256 -ExpectedValue $receipt.environment_contract_sha256
    Assert-Exact -Name 'transaction environment block digest' -Actual $transactionRecord.environment_block_sha256_utf16le -ExpectedValue $receipt.environment_block_sha256_utf16le
    Assert-Exact -Name 'transaction environment key-set digest' -Actual $transactionRecord.environment_key_set_sha256 -ExpectedValue $receipt.environment_key_set_sha256
    Assert-Exact -Name 'transaction environment entry count' -Actual (Get-PositiveJsonInteger -Name 'transaction environment entry count' -Value $transactionRecord.environment_entry_count) -ExpectedValue $environmentEntryCount
    Assert-Exact -Name 'transaction guardian script digest' -Actual $transactionRecord.guardian_script_sha256 -ExpectedValue $receipt.guardian_script_sha256
    Assert-Exact -Name 'transaction guardian deadline seconds' -Actual (Get-PositiveJsonInteger -Name 'transaction guardian deadline seconds' -Value $transactionRecord.guardian_deadline_seconds) -ExpectedValue $Expected.GuardianDeadlineSeconds
    Assert-Exact -Name 'transaction Job Object name' -Actual $transactionRecord.job_name -ExpectedValue $jobName
    Assert-JsonBoolean -Name 'transaction job kill-on-close' -Value $transactionRecord.job_kill_on_close -ExpectedValue $true

    $guardianProcessId = Get-PositiveJsonInteger -Name 'receipt guardian process ID' -Value $receipt.guardian_process_id
    $guardianStartTicks = Get-PositiveJsonInteger -Name 'guardian ready start ticks' -Value $guardianReady.guardian_start_time_utc_ticks
    if ($guardianProcessId -eq $directorProcessId) {
        throw "Guardian process ID '$guardianProcessId' must be distinct from the Director process ID."
    }
    Assert-Exact -Name 'guardian ready schema' -Actual $guardianReady.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'guardian ready assignment' -Actual $guardianReady.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'guardian ready process ID' -Actual (Get-PositiveJsonInteger -Name 'guardian ready process ID' -Value $guardianReady.guardian_process_id) -ExpectedValue $guardianProcessId
    Assert-Exact -Name 'guardian ready Director process ID' -Actual (Get-PositiveJsonInteger -Name 'guardian ready Director process ID' -Value $guardianReady.director_process_id) -ExpectedValue $directorProcessId
    Assert-Exact -Name 'guardian ready transaction digest' -Actual $guardianReady.transaction_record_sha256 -ExpectedValue $receipt.transaction_record_sha256
    Assert-Exact -Name 'guardian ready canonical global digest' -Actual $guardianReady.canonical_global_settings_sha256 -ExpectedValue $Expected.GlobalSettingsSha256
    Assert-Exact -Name 'guardian ready canonical project digest' -Actual $guardianReady.canonical_project_settings_sha256 -ExpectedValue $Expected.ProjectSettingsSha256
    Assert-Exact -Name 'guardian ready isolated global digest' -Actual $guardianReady.isolated_global_settings_sha256 -ExpectedValue $Expected.IsolatedGlobalSettingsSha256
    Assert-Exact -Name 'guardian ready isolated project digest' -Actual $guardianReady.isolated_project_settings_sha256 -ExpectedValue $Expected.IsolatedProjectSettingsSha256
    Assert-Exact -Name 'guardian ready private profile' -Actual ([IO.Path]::GetFullPath([string]$guardianReady.private_profile_root)) -ExpectedValue ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact -Name 'guardian ready environment digest' -Actual $guardianReady.environment_contract_sha256 -ExpectedValue $receipt.environment_contract_sha256
    Assert-Exact -Name 'guardian ready provider identity path' -Actual ([IO.Path]::GetFullPath([string]$guardianReady.provider_identity_path)) -ExpectedValue ([IO.Path]::GetFullPath($ProviderIdentityPath))
    Assert-Exact -Name 'guardian ready deadline seconds' -Actual (Get-PositiveJsonInteger -Name 'guardian ready deadline seconds' -Value $guardianReady.guardian_deadline_seconds) -ExpectedValue $Expected.GuardianDeadlineSeconds
    Assert-Exact -Name 'guardian ready Job Object name' -Actual $guardianReady.job_name -ExpectedValue $jobName
    Assert-JsonBoolean -Name 'guardian ready job kill-on-close' -Value $guardianReady.job_kill_on_close -ExpectedValue $true
    Assert-Exact -Name 'guardian ready empty Job Object' -Actual (Get-NonNegativeJsonInteger -Name 'guardian ready Job Object active-process count' -Value $guardianReady.job_active_process_count) -ExpectedValue 0

    $providerProcessId = Get-PositiveJsonInteger -Name 'receipt provider process ID' -Value $receipt.provider_process_id
    $providerStartTimeUtcTicks = Get-PositiveJsonInteger -Name 'receipt provider start-time ticks' -Value $receipt.provider_start_time_utc_ticks
    if ($providerProcessId -in @($directorProcessId, $guardianProcessId)) {
        throw "Provider process ID '$providerProcessId' must be distinct from the Director and guardian process IDs."
    }
    Assert-Exact -Name 'provider identity schema' -Actual $providerIdentity.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'provider identity assignment' -Actual $providerIdentity.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'provider identity transport idempotency key' -Actual $providerIdentity.idempotency_key -ExpectedValue $Expected.TransportIdempotencyKey
    Assert-Exact -Name 'provider identity transaction digest' -Actual $providerIdentity.transaction_record_sha256 -ExpectedValue $receipt.transaction_record_sha256
    Assert-Exact -Name 'provider identity Director process ID' -Actual (Get-PositiveJsonInteger -Name 'provider identity Director process ID' -Value $providerIdentity.director_process_id) -ExpectedValue $directorProcessId
    Assert-Exact -Name 'provider identity Director start ticks' -Actual (Get-PositiveJsonInteger -Name 'provider identity Director start ticks' -Value $providerIdentity.director_start_time_utc_ticks) -ExpectedValue $directorStartTicks
    Assert-Exact -Name 'provider identity process ID' -Actual (Get-PositiveJsonInteger -Name 'provider identity process ID' -Value $providerIdentity.provider_process_id) -ExpectedValue $providerProcessId
    Assert-Exact -Name 'provider identity start ticks' -Actual (Get-PositiveJsonInteger -Name 'provider identity start ticks' -Value $providerIdentity.provider_start_time_utc_ticks) -ExpectedValue $providerStartTimeUtcTicks
    Assert-Exact -Name 'provider identity executable path' -Actual ([IO.Path]::GetFullPath([string]$providerIdentity.provider_executable_path)) -ExpectedValue ([IO.Path]::GetFullPath($AgyExePath))
    Assert-Exact -Name 'provider identity executable digest' -Actual $providerIdentity.provider_executable_sha256 -ExpectedValue $Expected.AgyExeSha256
    Assert-Exact -Name 'provider identity Job Object name' -Actual $providerIdentity.job_name -ExpectedValue $jobName
    Assert-JsonBoolean -Name 'provider identity atomic job-list creation' -Value $providerIdentity.created_with_job_list_attribute -ExpectedValue $true
    Assert-JsonBoolean -Name 'provider identity job bound before resume' -Value $providerIdentity.job_bound_before_resume -ExpectedValue $true
    Assert-JsonBoolean -Name 'provider identity Unicode environment' -Value $providerIdentity.create_unicode_environment -ExpectedValue $true
    Assert-Exact -Name 'provider identity private profile' -Actual ([IO.Path]::GetFullPath([string]$providerIdentity.private_profile_root)) -ExpectedValue ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact -Name 'provider identity environment contract digest' -Actual $providerIdentity.environment_contract_sha256 -ExpectedValue $receipt.environment_contract_sha256
    Assert-Exact -Name 'provider identity environment block digest' -Actual $providerIdentity.environment_block_sha256_utf16le -ExpectedValue $receipt.environment_block_sha256_utf16le
    Assert-Exact -Name 'provider identity environment key-set digest' -Actual $providerIdentity.environment_key_set_sha256 -ExpectedValue $receipt.environment_key_set_sha256

    Assert-Exact -Name 'guardian done schema' -Actual $guardianDone.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'guardian done assignment' -Actual $guardianDone.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'guardian done status' -Actual $guardianDone.status -ExpectedValue 'DIRECTOR_SIGNAL_JOB_EMPTY'
    Assert-Exact -Name 'receipt guardian done status' -Actual $receipt.guardian_done_status -ExpectedValue $guardianDone.status
    Assert-Exact -Name 'guardian done transaction digest' -Actual $guardianDone.transaction_record_sha256 -ExpectedValue $receipt.transaction_record_sha256
    Assert-Exact -Name 'guardian done process ID' -Actual (Get-PositiveJsonInteger -Name 'guardian done process ID' -Value $guardianDone.guardian_process_id) -ExpectedValue $guardianProcessId
    Assert-Exact -Name 'guardian done start ticks' -Actual (Get-PositiveJsonInteger -Name 'guardian done start ticks' -Value $guardianDone.guardian_start_time_utc_ticks) -ExpectedValue $guardianStartTicks
    Assert-Exact -Name 'guardian done Director process ID' -Actual (Get-PositiveJsonInteger -Name 'guardian done Director process ID' -Value $guardianDone.director_process_id) -ExpectedValue $directorProcessId
    Assert-Exact -Name 'guardian done provider identity status' -Actual $guardianDone.provider_identity_status -ExpectedValue 'PRESENT_HASH_BOUND'
    Assert-Exact -Name 'guardian done provider identity digest' -Actual $guardianDone.provider_identity_sha256 -ExpectedValue $receipt.provider_identity_sha256
    Assert-Exact -Name 'guardian done provider process ID' -Actual (Get-PositiveJsonInteger -Name 'guardian done provider process ID' -Value $guardianDone.provider_process_id) -ExpectedValue $providerProcessId
    Assert-Exact -Name 'guardian done provider start ticks' -Actual (Get-PositiveJsonInteger -Name 'guardian done provider start ticks' -Value $guardianDone.provider_start_time_utc_ticks) -ExpectedValue $providerStartTimeUtcTicks
    Assert-Exact -Name 'guardian done Job Object name' -Actual $guardianDone.job_name -ExpectedValue $jobName
    Assert-JsonBoolean -Name 'guardian done job kill-on-close' -Value $guardianDone.job_kill_on_close -ExpectedValue $true
    Assert-Exact -Name 'guardian done Job Object active processes before stop' -Actual (Get-NonNegativeJsonInteger -Name 'guardian done Job Object active processes before stop' -Value $guardianDone.job_active_processes_before_stop) -ExpectedValue 0
    Assert-Exact -Name 'guardian done Job Object active processes after stop' -Actual (Get-NonNegativeJsonInteger -Name 'guardian done Job Object active processes after stop' -Value $guardianDone.job_active_processes_after_stop) -ExpectedValue 0
    Assert-Exact -Name 'guardian done provider process disposition' -Actual $guardianDone.provider_process_disposition -ExpectedValue 'JOB_ALREADY_EMPTY'
    Assert-Exact -Name 'receipt guardian done provider process disposition' -Actual $receipt.guardian_done_provider_process_disposition -ExpectedValue $guardianDone.provider_process_disposition
    if ($null -ne $guardianDone.process_tree_terminated_at) {
        throw "Guardian completion process_tree_terminated_at must be JSON null when the complete Job Object was already empty; found '$($guardianDone.process_tree_terminated_at)'."
    }
    Assert-Exact -Name 'guardian done canonical global digest' -Actual $guardianDone.canonical_global_settings_sha256 -ExpectedValue $Expected.GlobalSettingsSha256
    Assert-Exact -Name 'guardian done canonical project digest' -Actual $guardianDone.canonical_project_settings_sha256 -ExpectedValue $Expected.ProjectSettingsSha256
    Assert-JsonBoolean -Name 'guardian done canonical settings write state' -Value $guardianDone.canonical_settings_written -ExpectedValue $false
    Assert-Exact -Name 'guardian done isolated global digest' -Actual $guardianDone.isolated_global_settings_sha256 -ExpectedValue $Expected.IsolatedGlobalSettingsSha256
    Assert-Exact -Name 'guardian done isolated project digest' -Actual $guardianDone.isolated_project_settings_sha256 -ExpectedValue $Expected.IsolatedProjectSettingsSha256
    Assert-Exact -Name 'guardian done private profile' -Actual ([IO.Path]::GetFullPath([string]$guardianDone.private_profile_root)) -ExpectedValue ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact -Name 'guardian done environment digest' -Actual $guardianDone.environment_contract_sha256 -ExpectedValue $receipt.environment_contract_sha256
    Assert-JsonBoolean -Name 'guardian done completed before deadline' -Value $guardianDone.completed_before_guardian_deadline -ExpectedValue $true

    $claimedAt = Get-ExactTimestamp -Name 'claim claimed_at' -Value $claim.claimed_at
    $jobCreatedAt = Get-ExactTimestamp -Name 'transaction job_created_at' -Value $transactionRecord.job_created_at
    $promptHandleOpenedAt = Get-ExactTimestamp -Name 'receipt prompt_handle_opened_at' -Value $receipt.prompt_handle_opened_at
    $promptHandleVerifiedAt = Get-ExactTimestamp -Name 'receipt prompt_handle_verified_at' -Value $receipt.prompt_handle_verified_at
    $armedAt = Get-ExactTimestamp -Name 'transaction armed_at' -Value $transactionRecord.armed_at
    $jobOpenedAt = Get-ExactTimestamp -Name 'guardian ready job_opened_at' -Value $guardianReady.job_opened_at
    $readyAt = Get-ExactTimestamp -Name 'guardian ready ready_at' -Value $guardianReady.ready_at
    $providerStartedAt = Get-ExactTimestamp -Name 'receipt provider_process_started_at' -Value $receipt.provider_process_started_at
    $providerIdentityStartedAt = Get-ExactTimestamp -Name 'provider identity provider_started_at' -Value $providerIdentity.provider_started_at
    $jobAssignmentConfirmedAt = Get-ExactTimestamp -Name 'provider identity job_assignment_confirmed_at' -Value $providerIdentity.job_assignment_confirmed_at
    $providerIdentityRecordedAt = Get-ExactTimestamp -Name 'provider identity recorded_at' -Value $providerIdentity.recorded_at
    $providerResumedAt = Get-ExactTimestamp -Name 'receipt provider_resumed_at' -Value $receipt.provider_resumed_at
    $promptDeliveryStartedAt = Get-ExactTimestamp -Name 'receipt prompt_delivery_started_at' -Value $receipt.prompt_delivery_started_at
    $promptDeliveryCompletedAt = Get-ExactTimestamp -Name 'receipt prompt_delivery_completed_at' -Value $receipt.prompt_delivery_completed_at
    $receiptJobEmptyVerifiedAt = Get-ExactTimestamp -Name 'receipt job_empty_verified_at' -Value $receipt.job_empty_verified_at
    $guardianDeadlineAt = Get-ExactTimestamp -Name 'receipt guardian_deadline_at' -Value $receipt.guardian_deadline_at
    $guardianTriggerObservedAt = Get-ExactTimestamp -Name 'guardian done trigger_observed_at' -Value $guardianDone.trigger_observed_at
    $guardianJobEmptyVerifiedAt = Get-ExactTimestamp -Name 'guardian done job_empty_verified_at' -Value $guardianDone.job_empty_verified_at
    $guardianCompletedAt = Get-ExactTimestamp -Name 'guardian done completed_at' -Value $guardianDone.completed_at
    $recordedAt = Get-ExactTimestamp -Name 'receipt recorded_at' -Value $receipt.recorded_at
    Assert-Exact -Name 'provider identity started-at receipt binding' -Actual $providerIdentity.provider_started_at -ExpectedValue $receipt.provider_process_started_at
    Assert-Exact -Name 'provider identity job-assignment receipt binding' -Actual $providerIdentity.job_assignment_confirmed_at -ExpectedValue $receipt.job_assignment_confirmed_at
    Assert-Exact -Name 'transaction guardian deadline binding' -Actual $transactionRecord.guardian_deadline_at -ExpectedValue $receipt.guardian_deadline_at
    Assert-Exact -Name 'guardian ready deadline binding' -Actual $guardianReady.guardian_deadline_at -ExpectedValue $receipt.guardian_deadline_at
    Assert-Exact -Name 'guardian done deadline binding' -Actual $guardianDone.guardian_deadline_at -ExpectedValue $receipt.guardian_deadline_at
    Assert-Exact -Name 'legacy prompt delivery start equals resume' -Actual $receipt.prompt_delivery_started_at -ExpectedValue $receipt.provider_resumed_at
    Assert-Exact -Name 'legacy prompt delivery completion equals resume' -Actual $receipt.prompt_delivery_completed_at -ExpectedValue $receipt.provider_resumed_at
    if ($directorStartTicks -gt $claimedAt.UtcDateTime.Ticks) {
        throw 'Transaction Director start identity begins after the one-shot claim timestamp.'
    }
    if ($providerStartedAt.UtcDateTime.Ticks -ne $providerStartTimeUtcTicks) {
        throw 'Provider start timestamp does not match the exact provider StartTime tick identity.'
    }
    $promptDeliverySeconds = ($promptDeliveryCompletedAt - $promptDeliveryStartedAt).TotalSeconds
    if ($promptDeliverySeconds -ne 0) {
        throw "Inherited-file prompt compatibility timestamps must have zero duration; found '$promptDeliverySeconds'."
    }
    $guardianArmWindowSeconds = ($guardianDeadlineAt - $armedAt).TotalSeconds
    if ($guardianArmWindowSeconds -le 0 -or $guardianArmWindowSeconds -gt $Expected.GuardianDeadlineSeconds) {
        throw "Absolute guardian deadline must be after arming and no more than $($Expected.GuardianDeadlineSeconds) seconds later; found '$guardianArmWindowSeconds'."
    }
    if (($guardianDeadlineAt - $providerStartedAt).TotalSeconds -lt $Expected.WrapperTimeoutSeconds) {
        throw 'Absolute guardian deadline does not fully cover the exact provider wrapper deadline from process start.'
    }
    if ($guardianTriggerObservedAt -ge $guardianDeadlineAt -or $guardianCompletedAt -ge $guardianDeadlineAt) {
        throw 'Director-signal guardian trigger and completion must both precede the absolute guardian deadline.'
    }
    $timeline = @(
        [pscustomobject]@{ Name = 'claim'; Time = $claimedAt },
        [pscustomobject]@{ Name = 'Job Object creation'; Time = $jobCreatedAt },
        [pscustomobject]@{ Name = 'prompt handle open'; Time = $promptHandleOpenedAt },
        [pscustomobject]@{ Name = 'prompt handle verification'; Time = $promptHandleVerifiedAt },
        [pscustomobject]@{ Name = 'transaction arm'; Time = $armedAt },
        [pscustomobject]@{ Name = 'guardian Job Object open'; Time = $jobOpenedAt },
        [pscustomobject]@{ Name = 'guardian ready'; Time = $readyAt },
        [pscustomobject]@{ Name = 'provider start'; Time = $providerStartedAt },
        [pscustomobject]@{ Name = 'provider job assignment confirmation'; Time = $jobAssignmentConfirmedAt },
        [pscustomobject]@{ Name = 'provider identity record'; Time = $providerIdentityRecordedAt },
        [pscustomobject]@{ Name = 'provider resume'; Time = $providerResumedAt },
        [pscustomobject]@{ Name = 'prompt delivery start'; Time = $promptDeliveryStartedAt },
        [pscustomobject]@{ Name = 'prompt delivery completion'; Time = $promptDeliveryCompletedAt },
        [pscustomobject]@{ Name = 'parent Job Object empty'; Time = $receiptJobEmptyVerifiedAt },
        [pscustomobject]@{ Name = 'guardian trigger'; Time = $guardianTriggerObservedAt },
        [pscustomobject]@{ Name = 'guardian Job Object empty'; Time = $guardianJobEmptyVerifiedAt },
        [pscustomobject]@{ Name = 'guardian completion'; Time = $guardianCompletedAt },
        [pscustomobject]@{ Name = 'receipt'; Time = $recordedAt }
    )
    for ($index = 1; $index -lt $timeline.Count; ++$index) {
        if ($timeline[$index].Time -lt $timeline[$index - 1].Time) {
            throw "Launch provenance timeline is inverted between $($timeline[$index - 1].Name) and $($timeline[$index].Name)."
        }
    }

    $launchPromptBlob = Get-TreeBlob -Root $ControlRoot -Commit $controlHead -Path $PromptRelativePath
    $currentPromptBlob = Get-TreeBlob -Root $ControlRoot -Commit 'HEAD' -Path $PromptRelativePath
    Assert-Exact -Name 'prompt blob unchanged since launch' -Actual $currentPromptBlob -ExpectedValue $launchPromptBlob
    Assert-Exact -Name 'current prompt worktree blob' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object', '--', $PromptPath)) -ExpectedValue $currentPromptBlob
    Assert-Exact -Name 'current prompt SHA-256' -Actual (Get-Sha256 -Path $PromptPath) -ExpectedValue $Expected.PromptSha256
    Assert-Exact -Name 'current prompt byte length' -Actual (Get-Item -LiteralPath $PromptPath).Length -ExpectedValue $Expected.PromptLengthBytes
    Assert-Exact -Name 'claim prompt SHA-256' -Actual $claim.prompt_sha256 -ExpectedValue (Get-Sha256 -Path $PromptPath)

    $logText = Get-Content -LiteralPath $CliLogPath -Raw
    $expectedAppDataMarker = 'appDataDir=' + (Split-Path -Parent $IsolatedGlobalSettingsPath)
    foreach ($marker in @(
        'Print mode: starting (',
        $expectedAppDataMarker,
        'CLI settings initialized: permissions=&{Allow:[command(git rev-parse) command(git remote get-url) command(git branch --show-current) command(git status) command(git diff) command(git show) command(git log)] Deny:[unsandboxed(*) read_url(*) execute_url(*) mcp(*)] Ask:[]}, toolPermission=request-review',
        'model="gemini-3.1-pro-high"',
        'Propagating selected model override to backend: label="Gemini 3.1 Pro (High)"',
        'Starting new conversation (agent=false)',
        "Conversation using project ID: $($Expected.ProviderProjectId)",
        'ApplyProjectPermissionGrants: stored 1 allow, 7 deny grants from project "lt-robot-dealer-antigravity-003-clean"'
    )) {
        if (-not $logText.Contains($marker, [StringComparison]::OrdinalIgnoreCase)) {
            throw "CLI log is missing required isolated launch marker: $marker"
        }
    }
    if ($logText.Contains('C:\Users\edwar\.gemini', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'CLI log resolved Antigravity state through the canonical Gemini profile.'
    }
    foreach ($marker in @('Unknown field "permissionGrants"', 'cleared project permissions', '--dangerously-skip-permissions', 'Failed to resolve model flag', 'invalid model selection')) {
        if ($logText.Contains($marker, [StringComparison]::OrdinalIgnoreCase)) {
            throw "CLI log contains forbidden launch marker: $marker"
        }
    }

    $transcriptAudit = Assert-TranscriptPolicy -Path $TranscriptPath -ConversationId $conversationId
    Write-Evidence -Check 'private-profile launch provenance' -Value "profile=$PrivateProfileRoot environment_entries=$environmentEntryCount canonical_settings_written=false job=$jobName"
    return [pscustomobject]@{
        Receipt = $receipt
        TranscriptAudit = $transcriptAudit
    }
}

function Assert-MaterializedCandidate {
    param([Parameter(Mandatory)][string]$CandidateHead)

    Assert-Exact -Name 'QA materialized sole parent' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('show', '-s', '--format=%P', $CandidateHead)) -ExpectedValue $Expected.AcceptedBase
    Assert-Exact -Name 'QA materialized commit identity' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('show', '-s', '--format=%an <%ae>%n%cn <%ce>', $CandidateHead)) -ExpectedValue "$($Expected.ProviderAuthor)`n$($Expected.OpenAiCommitter)"
    Assert-Exact -Name 'QA materialized commit message' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('show', '-s', '--format=%s', $CandidateHead)) -ExpectedValue "$($Expected.AssignmentId): mechanically materialize provider-authored bytes"
    $committedPaths = Get-Lines (Invoke-Git -Root $QaRoot -GitArgs @('diff', '--name-only', $Expected.AcceptedBase, $CandidateHead, '--'))
    Assert-NoDuplicateStrings -Name 'committed destination paths' -Values $committedPaths
    Assert-ExactSet -Name 'committed destination path set' -Actual $committedPaths -ExpectedValues $destinationPaths
    foreach ($providerPath in $providerPaths) {
        $relative = $providerPath.Substring($Expected.ProviderPrefix.Length)
        $destinationPath = $Expected.DestinationPrefix + $relative
        $destinationBlob = Get-TreeBlob -Root $QaRoot -Commit $CandidateHead -Path $destinationPath
        Assert-Exact -Name "committed blob $destinationPath" -Actual $destinationBlob -ExpectedValue $providerBlobs[$providerPath]
    }
    Assert-Exact -Name 'QA candidate status' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')) -ExpectedValue ''
    $candidateManifest = Get-CandidateManifest -ProviderPaths $providerPaths -CandidateHead $CandidateHead
    Assert-Exact -Name 'candidate manifest versus frozen provider manifest' -Actual $candidateManifest.Sha256 -ExpectedValue $providerManifest.Sha256
    Assert-Exact -Name 'QA candidate status after manifest' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')) -ExpectedValue ''
    return (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', "$CandidateHead^{tree}"))
}

function Assert-SourceReview {
    param(
        [Parameter(Mandatory)][string]$CandidateHead,
        [Parameter(Mandatory)][string]$CandidateTree,
        [Parameter(Mandatory)][string]$LaunchControlHead
    )

    Assert-ControlAuthorityState -LaunchControlHead $LaunchControlHead -RequireSourceReview
    if (-not (Test-Path -LiteralPath $SourceReviewPath -PathType Leaf)) {
        throw "SOURCE_REVIEW_REQUIRED: missing pinned review $SourceReviewRelativePath"
    }
    $reviewBlob = Get-TreeBlob -Root $ControlRoot -Commit 'HEAD' -Path $SourceReviewRelativePath
    Assert-Exact -Name 'committed source review blob' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object', '--', $SourceReviewPath)) -ExpectedValue $reviewBlob
    $review = Get-RequiredJsonObject -Path $SourceReviewPath -Name 'source/security review'
    Assert-ExactObjectProperties -Name 'source/security review' -Object $review -ExpectedNames @(
        'schema_version',
        'assignment_id',
        'provider_manifest_sha256',
        'candidate_head',
        'candidate_tree',
        'provider_author',
        'reviewer_provider',
        'reviewer_role',
        'reviewer_is_product_author',
        'reviewer_identity',
        'disposition',
        'reviewed_at',
        'findings',
        'reviewed_paths'
    )
    foreach ($propertyName in @(
        'schema_version',
        'assignment_id',
        'provider_manifest_sha256',
        'candidate_head',
        'candidate_tree',
        'provider_author',
        'reviewer_provider',
        'reviewer_role',
        'reviewer_identity',
        'disposition',
        'reviewed_at'
    )) {
        if ($review.$propertyName -isnot [string]) {
            throw "Source review property '$propertyName' must be a JSON string."
        }
    }
    Assert-Exact -Name 'source review schema' -Actual $review.schema_version -ExpectedValue '1.0'
    Assert-Exact -Name 'source review assignment' -Actual $review.assignment_id -ExpectedValue $Expected.AssignmentId
    Assert-Exact -Name 'source review provider manifest' -Actual $review.provider_manifest_sha256 -ExpectedValue $providerManifest.Sha256
    Assert-Exact -Name 'source review candidate HEAD' -Actual $review.candidate_head -ExpectedValue $CandidateHead
    Assert-Exact -Name 'source review candidate tree' -Actual $review.candidate_tree -ExpectedValue $CandidateTree
    Assert-Exact -Name 'source review provider author' -Actual $review.provider_author -ExpectedValue $Expected.ProviderAuthor
    Assert-Exact -Name 'source review reviewer provider' -Actual $review.reviewer_provider -ExpectedValue 'OpenAI'
    Assert-Exact -Name 'source review reviewer role' -Actual $review.reviewer_role -ExpectedValue 'independent-source-security-review'
    Assert-JsonBoolean -Name 'source review reviewer is product author' -Value $review.reviewer_is_product_author -ExpectedValue $false
    Assert-Exact -Name 'source review disposition' -Actual $review.disposition -ExpectedValue 'ACCEPT'
    if ([string]::IsNullOrWhiteSpace($review.reviewer_identity) -or
        $review.reviewer_identity.Trim() -cne $review.reviewer_identity -or
        $review.reviewer_identity -ceq $Expected.ProviderAuthor) {
        throw 'Source review must name a different non-author reviewer identity.'
    }
    [void](Get-ExactTimestamp -Name 'source review reviewed_at' -Value $review.reviewed_at)
    if ($review.findings -isnot [array]) {
        throw 'Source review findings must be a JSON array.'
    }
    if ($review.findings.Count -ne 0) {
        throw 'An ACCEPT source review must contain zero findings.'
    }
    if ($review.reviewed_paths -isnot [array]) {
        throw 'Source review reviewed_paths must be a JSON array.'
    }
    foreach ($reviewedPath in $review.reviewed_paths) {
        if ($reviewedPath -isnot [string]) {
            throw 'Every source review reviewed_paths item must be a JSON string.'
        }
    }
    $reviewedPaths = @($review.reviewed_paths | ForEach-Object { [string]$_ })
    Assert-NoDuplicateStrings -Name 'source review paths' -Values $reviewedPaths
    Assert-ExactSet -Name 'source review path set' -Actual $reviewedPaths -ExpectedValues $destinationPaths
    Write-Evidence -Check 'independent source/security review' -Value "reviewer=$($review.reviewer_identity) candidate=$CandidateHead tree=$CandidateTree disposition=ACCEPT"
}

foreach ($required in @(
    $ProviderRoot,
    $QaRoot,
    $DirectorValidatorRoot,
    $RawResultPath,
    $StderrPath,
    $CliLogPath,
    $TranscriptPath,
    $ReceiptPath,
    $ClaimPath,
    $TransactionRoot,
    $PrivateProfileRoot,
    $IsolatedGeminiRoot,
    $IsolatedGlobalSettingsPath,
    $IsolatedProjectSettingsPath,
    $IsolatedTranscriptRoot,
    $EnvironmentContractPath,
    $TransactionRecordPath,
    $GuardianScriptPath,
    $GuardianReadyPath,
    $GuardianDonePath,
    $ProviderIdentityPath,
    $AgyExePath,
    $PromptPath,
    $Expected.GlobalSettingsPath,
    $Expected.ProjectSettingsPath
)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required path is missing: $required"
    }
}

$publicContractPath = Join-Path $ProviderRoot 'PUBLIC_CONTRACT.json'
$resultSchemaPath = Join-Path $ProviderRoot 'RESULT_SCHEMA.json'
$validatorPath = Join-Path $DirectorValidatorRoot 'scripts\check_contribution_tags.py'
foreach ($required in @($publicContractPath, $resultSchemaPath, $validatorPath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Required authority file is missing: $required"
    }
}

# Bind the independent Director validator before trusting its verdict.
Assert-Exact -Name 'Director validator HEAD' -Actual (Invoke-Git -Root $DirectorValidatorRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $Expected.DirectorHead
Assert-Exact -Name 'Director validator tree' -Actual (Invoke-Git -Root $DirectorValidatorRoot -GitArgs @('rev-parse', 'HEAD^{tree}')) -ExpectedValue $Expected.DirectorTree
Assert-Exact -Name 'Director validator status' -Actual (Invoke-Git -Root $DirectorValidatorRoot -GitArgs @('status', '--porcelain=v1')) -ExpectedValue ''
Assert-Exact -Name 'Director validator blob' -Actual (Get-TreeBlob -Root $DirectorValidatorRoot -Commit $Expected.DirectorHead -Path 'scripts/check_contribution_tags.py') -ExpectedValue $Expected.DirectorValidatorBlob

# Bind the provider repository, immutable authority and exact uncommitted source delivery.
Assert-Exact -Name 'provider branch' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('branch', '--show-current')) -ExpectedValue $Expected.ProviderBranch
Assert-Exact -Name 'provider shallow state' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', '--is-shallow-repository')) -ExpectedValue 'false'
Assert-Exact -Name 'provider replace refs' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('for-each-ref', '--format=%(refname)', 'refs/replace')) -ExpectedValue ''
Assert-Exact -Name 'provider remotes' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('remote')) -ExpectedValue ''
Assert-Exact -Name 'provider complete ref set' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('for-each-ref', '--format=%(refname)')) -ExpectedValue "refs/heads/$($Expected.ProviderBranch)"
Assert-Exact -Name 'provider authority tree' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', "$($Expected.AuthorityParent)^{tree}")) -ExpectedValue $Expected.AuthorityTree
Assert-Exact -Name 'provider HEAD' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $Expected.AuthorityParent
Assert-Exact -Name 'provider tracked files' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('ls-files')) -ExpectedValue "PUBLIC_CONTRACT.json`nRESULT_SCHEMA.json"
Assert-Exact -Name 'provider core.autocrlf' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('config', '--get', 'core.autocrlf')) -ExpectedValue 'false'

Assert-Exact -Name 'public contract base blob' -Actual (Get-TreeBlob -Root $ProviderRoot -Commit $Expected.AuthorityParent -Path 'PUBLIC_CONTRACT.json') -ExpectedValue $Expected.PublicContractBlob
Assert-Exact -Name 'result schema base blob' -Actual (Get-TreeBlob -Root $ProviderRoot -Commit $Expected.AuthorityParent -Path 'RESULT_SCHEMA.json') -ExpectedValue $Expected.ResultSchemaBlob
Assert-Exact -Name 'public contract SHA-256' -Actual (Get-Sha256 -Path $publicContractPath) -ExpectedValue $Expected.PublicContractSha256
Assert-Exact -Name 'result schema SHA-256' -Actual (Get-Sha256 -Path $resultSchemaPath) -ExpectedValue $Expected.ResultSchemaSha256
$combinedAuthority = 'sha256:' + (Get-CombinedSha256 -Paths @($publicContractPath, $resultSchemaPath))
Assert-Exact -Name 'combined authority digest' -Actual $combinedAuthority -ExpectedValue $Expected.AuthorityDigest
Assert-Exact -Name 'canonical global settings read-only SHA-256' -Actual (Get-Sha256 -Path $Expected.GlobalSettingsPath) -ExpectedValue $Expected.GlobalSettingsSha256
Assert-Exact -Name 'canonical project settings read-only SHA-256' -Actual (Get-Sha256 -Path $Expected.ProjectSettingsPath) -ExpectedValue $Expected.ProjectSettingsSha256
$launchProvenance = Assert-LaunchProvenance
$launchReceipt = $launchProvenance.Receipt
$transcriptAudit = $launchProvenance.TranscriptAudit

$providerProductRoot = Join-Path $ProviderRoot 'LongTableRobotDealer'
if (-not (Test-Path -LiteralPath $providerProductRoot -PathType Container)) {
    throw 'Provider working-tree delivery contains no LongTableRobotDealer subtree.'
}
$reparseEntries = @(Get-ChildItem -LiteralPath $providerProductRoot -Force -Recurse | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
if ($reparseEntries.Count -ne 0 -or ((Get-Item -LiteralPath $providerProductRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Provider delivery contains a symlink, junction or other reparse point.'
}
$providerFiles = @(Get-ChildItem -LiteralPath $providerProductRoot -File -Force -Recurse)
if ($providerFiles.Count -eq 0 -or $providerFiles.Count -gt $Expected.MaximumProviderFiles) {
    throw "Provider file count must be 1-$($Expected.MaximumProviderFiles); found $($providerFiles.Count)."
}
$providerBytes = [long](($providerFiles | Measure-Object -Property Length -Sum).Sum)
if ($providerBytes -gt $Expected.MaximumProviderBytes) {
    throw "Provider delivery exceeds the $($Expected.MaximumProviderBytes)-byte limit: $providerBytes."
}
$providerPaths = @($providerFiles | ForEach-Object {
        [IO.Path]::GetRelativePath($ProviderRoot, $_.FullName).Replace('\', '/')
    } | Sort-Object -CaseSensitive)
$destinationPaths = @($providerPaths | ForEach-Object {
        $Expected.DestinationPrefix + $_.Substring($Expected.ProviderPrefix.Length)
    })
foreach ($path in $providerPaths) {
    Assert-SafeProviderPath -Path $path
}
$caseFoldedPaths = @($providerPaths | ForEach-Object { $_.ToLowerInvariant() } | Sort-Object -Unique)
if ($caseFoldedPaths.Count -ne $providerPaths.Count) {
    throw 'Provider path set contains a Windows case-insensitive collision.'
}
foreach ($requiredPath in $RequiredProviderPaths) {
    if ($providerPaths -cnotcontains $requiredPath) {
        throw "Provider candidate is missing required path: $requiredPath"
    }
}

$providerSnapshotTempRoot = Join-Path ([IO.Path]::GetTempPath()) ("lt-robot-provider-snapshot-{0}" -f [guid]::NewGuid().ToString('N'))
Assert-StrictChildPath -Parent ([IO.Path]::GetTempPath()) -Child $providerSnapshotTempRoot -Name 'provider snapshot temporary root'
$providerSnapshotRoot = Join-Path $providerSnapshotTempRoot 'snapshot'
New-Item -ItemType Directory -Path $providerSnapshotRoot -Force | Out-Null
try {
    foreach ($path in $providerPaths) {
        $providerWorktreePath = Join-Path $ProviderRoot ($path -replace '/', '\')
        $snapshotPath = Join-Path $providerSnapshotRoot ($path -replace '/', '\')
        $snapshotParent = Split-Path -Parent $snapshotPath
        if (-not (Test-Path -LiteralPath $snapshotParent)) {
            New-Item -ItemType Directory -Path $snapshotParent -Force | Out-Null
        }
        [IO.File]::WriteAllBytes($snapshotPath, [IO.File]::ReadAllBytes($providerWorktreePath))
    }

    $snapshotProviderFiles = @(Get-ChildItem -LiteralPath (Join-Path $providerSnapshotRoot 'LongTableRobotDealer') -File -Force -Recurse)
    $snapshotProviderPaths = @($snapshotProviderFiles | ForEach-Object {
            [IO.Path]::GetRelativePath($providerSnapshotRoot, $_.FullName).Replace('\', '/')
        } | Sort-Object -CaseSensitive)
    Assert-NoDuplicateStrings -Name 'frozen provider snapshot paths' -Values $snapshotProviderPaths
    Assert-ExactSet -Name 'frozen provider snapshot path set' -Actual $snapshotProviderPaths -ExpectedValues $providerPaths
    $providerBytes = [long](($snapshotProviderFiles | Measure-Object -Property Length -Sum).Sum)
    if ($providerBytes -gt $Expected.MaximumProviderBytes) {
        throw "Frozen provider delivery exceeds the $($Expected.MaximumProviderBytes)-byte limit: $providerBytes."
    }

    $providerSourceText = ($snapshotProviderFiles | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join "`n"
    foreach ($requiredTest in $RequiredRobotTests) {
        if (-not $providerSourceText.Contains($requiredTest, [StringComparison]::Ordinal)) {
            throw "Provider delivery is missing required automation test ID: $requiredTest"
        }
    }

    $providerBlobs = @{}
    foreach ($path in $providerPaths) {
        $snapshotPath = Join-Path $providerSnapshotRoot ($path -replace '/', '\')
        $providerBlobs[$path] = Invoke-Git -Root $ProviderRoot -GitArgs @('hash-object', '--', $snapshotPath)
        Assert-TextBlob -Path $snapshotPath -LogicalPath $path
        Assert-ContributionBoundary -Path $snapshotPath -LogicalPath $path
    }
    $expectedStatus = @($providerPaths | ForEach-Object { "?? $_" })
    $actualStatus = Get-Lines (Invoke-Git -Root $ProviderRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all'))
    Assert-ExactSet -Name 'provider working status path set' -Actual $actualStatus -ExpectedValues $expectedStatus
    foreach ($path in $providerPaths) {
        $providerWorktreePath = Join-Path $ProviderRoot ($path -replace '/', '\')
        Assert-Exact -Name "provider file stable after snapshot $path" -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('hash-object', '--', $providerWorktreePath)) -ExpectedValue $providerBlobs[$path]
    }
    $providerManifest = Get-ProviderManifest -Paths $providerPaths -Root $providerSnapshotRoot
    Write-Evidence -Check 'provider delivery' -Value "authority=$($Expected.AuthorityParent) files=$($providerPaths.Count) bytes=$providerBytes manifest=$($providerManifest.Sha256) snapshot=immutable"

# Validate the exact provider result and raw-wrapper equivalence against the immutable schema.
$rawText = Get-Content -LiteralPath $RawResultPath -Raw
$rawCli = ConvertFrom-StrictJsonObject -Text $rawText -Name 'raw provider result'
if ($rawCli.PSObject.Properties['permission_denials'] -and @($rawCli.permission_denials).Count -ne 0) {
    throw 'CLI wrapper contains permission denials; provider scope/provenance is not clean.'
}
Assert-Exact -Name 'raw wrapper outer status' -Actual $rawCli.status -ExpectedValue 'SUCCESS'
Assert-Exact -Name 'raw wrapper conversation' -Actual $rawCli.conversation_id -ExpectedValue $launchReceipt.conversation_id
$structuredOutputProperty = $rawCli.PSObject.Properties['structured_output']
if (-not $structuredOutputProperty -or $null -eq $rawCli.structured_output) {
    throw 'Authenticated CLI wrapper lacks the required non-null structured_output object.'
}
$result = $rawCli.structured_output
Assert-ExactObjectProperties -Name 'provider result' -Object $result -ExpectedNames $ExpectedResultTopLevelProperties
$resultJson = $result | ConvertTo-Json -Depth 100 -Compress
$responseProperties = @()
foreach ($name in @('result', 'response', 'output')) {
    $property = $rawCli.PSObject.Properties[$name]
    if (-not $property -or $null -eq $property.Value) {
        continue
    }
    if ($property.Value -is [string] -and [string]::IsNullOrWhiteSpace([string]$property.Value)) {
        continue
    }
    $responseProperties += $name
}
if ($responseProperties.Count -ne 1) {
    throw "Authenticated CLI wrapper must contain exactly one nonempty raw result/response/output serialization; found $($responseProperties.Count)."
}
$responseProperty = $responseProperties[0]
if ($rawCli.$responseProperty -isnot [string]) {
    throw "Authenticated CLI wrapper property '$responseProperty' must be one raw JSON string."
}
$parsedResponse = ConvertFrom-StrictJsonObject -Text ([string]$rawCli.$responseProperty) -Name 'raw assistant response inside the CLI wrapper'
$canonicalResultJson = ConvertTo-CanonicalJson -Value $result
$parsedResponseJson = ConvertTo-CanonicalJson -Value $parsedResponse
$transcriptFinishJson = ConvertTo-CanonicalJson -Value $transcriptAudit.FinishPayload
Assert-Exact -Name 'raw response versus structured output' -Actual $parsedResponseJson -ExpectedValue $canonicalResultJson
Assert-Exact -Name 'authenticated transcript finish versus structured output' -Actual $transcriptFinishJson -ExpectedValue $canonicalResultJson
$tempResultPath = Join-Path ([IO.Path]::GetTempPath()) ("lt-robot-result-{0}.json" -f [guid]::NewGuid().ToString('N'))
try {
    [IO.File]::WriteAllText($tempResultPath, $resultJson, [Text.UTF8Encoding]::new($false))
    $schemaOutput = @(& python -c "import json,sys,jsonschema; s=json.load(open(sys.argv[1],encoding='utf-8')); i=json.load(open(sys.argv[2],encoding='utf-8')); jsonschema.Draft202012Validator.check_schema(s); jsonschema.Draft202012Validator(s).validate(i)" $resultSchemaPath $tempResultPath 2>&1 | ForEach-Object { $_.ToString() })
    if ($LASTEXITCODE -ne 0) {
        throw "Provider result failed Draft-2020-12 schema validation:`n$($schemaOutput -join "`n")"
    }
}
finally {
    Remove-Item -LiteralPath $tempResultPath -Force -ErrorAction SilentlyContinue
}

Assert-Exact -Name 'result task ID' -Actual $result.task_id -ExpectedValue $Expected.TaskId
Assert-Exact -Name 'result assignment ID' -Actual $result.assignment_id -ExpectedValue $Expected.AssignmentId
Assert-Exact -Name 'result idempotency key' -Actual $result.idempotency_key -ExpectedValue $Expected.IdempotencyKey
Assert-Exact -Name 'result authority digest' -Actual $result.authority_snapshot_digest -ExpectedValue $Expected.AuthorityDigest
Assert-ExactObjectProperties -Name 'result correlation' -Object $result.correlation -ExpectedNames @(
    'correlation_id',
    'source_event_id',
    'slack_thread_ts',
    'github_issue',
    'github_pull_request'
)
Assert-Exact -Name 'result correlation ID' -Actual $result.correlation.correlation_id -ExpectedValue $Expected.CorrelationId
Assert-Exact -Name 'result source event ID' -Actual $result.correlation.source_event_id -ExpectedValue $Expected.SourceEventId
Assert-Exact -Name 'result Slack thread' -Actual $result.correlation.slack_thread_ts -ExpectedValue '1788068481.517609'
if ($null -ne $result.correlation.github_issue) {
    throw "Result GitHub issue must be JSON null; found '$($result.correlation.github_issue)'."
}
if ($null -ne $result.correlation.github_pull_request) {
    throw "Result GitHub pull request must be JSON null; found '$($result.correlation.github_pull_request)'."
}
Assert-Exact -Name 'result provider' -Actual $result.provider -ExpectedValue $Expected.ProviderResultName
Assert-Exact -Name 'result status' -Actual $result.status -ExpectedValue 'SUCCEEDED'
Assert-Exact -Name 'result closed source-only outcome' -Actual $result.outcome -ExpectedValue $ExpectedProviderOutcome
$runReference = [string]$result.run_reference
$sessionId = [string]$launchReceipt.conversation_id
$fallbackRunReference = 'agy-cli:LT-NATIVE-ANTIGRAVITY-ROBOT-003:primary'
if ([bool]$transcriptAudit.ConversationIdExposed) {
    if (-not $runReference.Contains($sessionId, [StringComparison]::Ordinal)) {
        throw 'Result run_reference must bind the authenticated conversation ID because that ID was exposed in the transcript.'
    }
}
elseif ($runReference -cne $fallbackRunReference -and -not $runReference.Contains($sessionId, [StringComparison]::Ordinal)) {
    throw 'Result run_reference must be the exact authorized fallback or bind the authenticated Antigravity conversation/session ID.'
}
Assert-JsonBoolean -Name 'result revision recommended' -Value $result.revision_recommended -ExpectedValue $false
if (@($result.blockers).Count -ne 0 -or @($result.requested_decisions).Count -ne 0) {
    throw 'A materializable provider result may not contain blockers, requested decisions, or revision recommendation.'
}
$riskRows = @($result.risks | ForEach-Object { [string]$_ })
Assert-NoDuplicateStrings -Name 'result risks' -Values $riskRows
Assert-ExactSet -Name 'result closed risk set' -Actual $riskRows -ExpectedValues $ExpectedProviderRisks
$acceptanceRows = @($result.acceptance)
$acceptanceNames = @($acceptanceRows | ForEach-Object { [string]$_.check })
Assert-NoDuplicateStrings -Name 'result acceptance checks' -Values $acceptanceNames
$actualAcceptance = @($acceptanceRows | ForEach-Object { '{0}|{1}' -f $_.check, $_.status })
$expectedAcceptance = @(
    'source-only public-contract delivery|PASS',
    'closed source inventory|PASS',
    'rights-clean original placeholder inventory|PASS',
    'target-project Unreal builds|NOT_RUN',
    'target-project automation|NOT_RUN',
    'device validation|NOT_RUN',
    'human validation|NOT_RUN'
)
Assert-ExactSet -Name 'result acceptance rows' -Actual $actualAcceptance -ExpectedValues $expectedAcceptance
foreach ($acceptanceRow in $acceptanceRows) {
    Assert-ExactObjectProperties -Name "result acceptance row '$($acceptanceRow.check)'" -Object $acceptanceRow -ExpectedNames @('check', 'status', 'evidence')
    if ($acceptanceRow.check -isnot [string] -or $acceptanceRow.status -isnot [string]) {
        throw 'Every result acceptance check and status must be a JSON string.'
    }
    $checkName = [string]$acceptanceRow.check
    if (-not $ExpectedAcceptanceEvidence.Contains($checkName)) {
        throw "Result acceptance evidence has no closed policy for '$checkName'."
    }
    $expectedEvidence = $ExpectedAcceptanceEvidence[$checkName]
    if ($null -eq $expectedEvidence) {
        if ($null -ne $acceptanceRow.evidence) {
            throw "NOT_RUN acceptance evidence for '$checkName' must be JSON null."
        }
    }
    else {
        if ($acceptanceRow.evidence -isnot [string]) {
            throw "PASS acceptance evidence for '$checkName' must be one exact safe JSON string."
        }
        Assert-Exact -Name "safe acceptance evidence $checkName" -Actual $acceptanceRow.evidence -ExpectedValue $expectedEvidence
    }
}
$requiredNotRunAcceptance = @(
    'target-project Unreal builds',
    'target-project automation',
    'device validation',
    'human validation'
)
foreach ($checkName in $requiredNotRunAcceptance) {
    $matches = @($acceptanceRows | Where-Object { $_.check -ceq $checkName })
    if ($matches.Count -ne 1 -or $matches[0].status -cne 'NOT_RUN') {
        throw "Result acceptance must contain exactly one NOT_RUN '$checkName' row."
    }
}
$checkRows = @($result.checks)
$actualChecks = @($checkRows | ForEach-Object { '{0}|{1}' -f $_.command, $_.result })
$expectedChecks = @(
    'source inventory review|PASS',
    'git status|NOT_RUN',
    'target-project Unreal builds|NOT_RUN',
    'target-project automation|NOT_RUN'
)
Assert-NoDuplicateStrings -Name 'result check rows' -Values $actualChecks
Assert-ExactSet -Name 'result check row set' -Actual $actualChecks -ExpectedValues $expectedChecks
foreach ($check in $checkRows) {
    Assert-ExactObjectProperties -Name "result check row '$($check.command)'" -Object $check -ExpectedNames @('command', 'result', 'exit_code')
    if ($check.command -isnot [string] -or $check.result -isnot [string]) {
        throw 'Every result check command and result must be a JSON string.'
    }
    $commandText = ([string]$check.command).ToLowerInvariant()
    if (($commandText.Contains('git') -or $commandText.Contains('unreal') -or $commandText.Contains('automation')) -and
        [string]$check.result -cne 'NOT_RUN') {
        throw "Provider result claims a prohibited local Git/build/automation check: $($check.command) => $($check.result)"
    }
    if ($null -ne $check.exit_code) {
        throw "Provider result check must not claim a process exit code while command tools are denied: $($check.command)."
    }
}
$actualSideEffects = @($result.side_effects | ForEach-Object {
    '{0}|{1}|{2}|{3}|{4}' -f $_.kind, $_.target, $_.status, $_.idempotency_key, $(if ($null -eq $_.external_id) { '<null>' } else { [string]$_.external_id })
})
$expectedSideEffects = @(
    "source-file-authoring|LongTableRobotDealer/**|COMPLETED|$($Expected.IdempotencyKey)|<null>",
    "provider-git-commit|provider sandbox|NOT_ATTEMPTED|$($Expected.IdempotencyKey)|<null>",
    "git-push|any remote|NOT_ATTEMPTED|$($Expected.IdempotencyKey)|<null>",
    "external-service|any external service|NOT_ATTEMPTED|$($Expected.IdempotencyKey)|<null>",
    "device|any device|NOT_ATTEMPTED|$($Expected.IdempotencyKey)|<null>",
    "deploy-publish-purchase-permission|any deployment, publication, purchase, or permission action|NOT_ATTEMPTED|$($Expected.IdempotencyKey)|<null>"
)
Assert-NoDuplicateStrings -Name 'result side effects' -Values $actualSideEffects
Assert-ExactSet -Name 'result side-effect rows' -Actual $actualSideEffects -ExpectedValues $expectedSideEffects
foreach ($sideEffect in @($result.side_effects)) {
    Assert-ExactObjectProperties -Name "result side effect '$($sideEffect.kind)'" -Object $sideEffect -ExpectedNames @('kind', 'target', 'status', 'idempotency_key', 'external_id')
    foreach ($propertyName in @('kind', 'target', 'status', 'idempotency_key')) {
        if ($sideEffect.$propertyName -isnot [string]) {
            throw "Result side-effect property '$propertyName' must be a JSON string."
        }
    }
    if ($null -ne $sideEffect.external_id) {
        throw "Result side-effect external_id must be JSON null for '$($sideEffect.kind)'."
    }
}
$artifactLocations = @($result.artifacts | ForEach-Object { [string]$_.location })
if ($artifactLocations.Count -ne $providerPaths.Count) {
    throw "Result artifact row count must equal provider file count; found $($artifactLocations.Count), expected $($providerPaths.Count)."
}
Assert-NoDuplicateStrings -Name 'result artifact locations' -Values $artifactLocations
Assert-ExactSet -Name 'result artifact path set' -Actual $artifactLocations -ExpectedValues $providerPaths
foreach ($artifact in @($result.artifacts)) {
    Assert-ExactObjectProperties -Name "result artifact '$($artifact.location)'" -Object $artifact -ExpectedNames @('kind', 'location', 'digest')
    if ($artifact.kind -isnot [string] -or $artifact.location -isnot [string]) {
        throw 'Every result artifact kind and location must be a JSON string.'
    }
    Assert-Exact -Name "safe artifact kind $($artifact.location)" -Actual $artifact.kind -ExpectedValue 'source-file'
    if ($null -ne $artifact.digest) {
        $physical = Join-Path $providerSnapshotRoot (([string]$artifact.location) -replace '/', '\')
        Assert-Exact -Name "artifact digest $($artifact.location)" -Actual ([string]$artifact.digest) -ExpectedValue ('sha256:' + (Get-Sha256 -Path $physical))
    }
}
Write-Evidence -Check 'provider result' -Value "schema=valid status=$($result.status) authority=$($result.authority_snapshot_digest) manifest=$($providerManifest.Sha256)"

# The reserved QA worktree may be either the untouched exact base (phase one)
# or the exact mechanical provider candidate (phase two).
Assert-Exact -Name 'QA branch' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('branch', '--show-current')) -ExpectedValue $Expected.QaBranch
Assert-Exact -Name 'QA accepted package lock' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD:package-lock.json')) -ExpectedValue $Expected.PackageLockBlob
Assert-Exact -Name 'QA status' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')) -ExpectedValue ''
Assert-Exact -Name 'QA shallow state' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', '--is-shallow-repository')) -ExpectedValue 'false'
Assert-Exact -Name 'QA replace refs' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('for-each-ref', '--format=%(refname)', 'refs/replace')) -ExpectedValue ''
$destinationRoot = Join-Path $QaRoot ($Expected.DestinationPrefix.TrimEnd('/') -replace '/', '\')
Assert-StrictChildPath -Parent $QaRoot -Child $destinationRoot -Name 'QA destination'
Assert-Exact -Name 'QA base destination tree entry' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('ls-tree', '-r', '--name-only', $Expected.AcceptedBase, '--', $Expected.DestinationPrefix.TrimEnd('/'))) -ExpectedValue ''
$currentQaHead = Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD')
$qaState = $null
$materializedCommit = $null
$materializedTree = $null
if ($currentQaHead -ceq $Expected.AcceptedBase) {
    Assert-Exact -Name 'QA accepted tree' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD^{tree}')) -ExpectedValue $Expected.AcceptedTree
    if (Test-Path -LiteralPath $destinationRoot) {
        throw "Fresh QA base already contains the provider destination: $destinationRoot"
    }
    $qaState = 'FRESH_BASE'
    Assert-ControlAuthorityState -LaunchControlHead ([string]$launchReceipt.control_head) -RequireLaunchHead
}
else {
    if (-not (Test-Path -LiteralPath $destinationRoot -PathType Container)) {
        throw 'Non-base QA HEAD has no materialized provider destination.'
    }
    $materializedCommit = $currentQaHead
    $materializedTree = Assert-MaterializedCandidate -CandidateHead $materializedCommit
    $qaState = 'MATERIALIZED_CANDIDATE'
}
$qaNodeModules = Join-Path $QaRoot 'node_modules'
$controlNodeModules = Join-Path $ControlRoot 'node_modules'
if (-not (Test-Path -LiteralPath $qaNodeModules)) {
    if (-not (Test-Path -LiteralPath $controlNodeModules -PathType Container)) {
        throw "Offline JavaScript dependencies are unavailable at both $qaNodeModules and $controlNodeModules."
    }
    Assert-Exact -Name 'offline dependency lock authority' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', 'HEAD:package-lock.json')) -ExpectedValue $Expected.PackageLockBlob
}
Write-Evidence -Check 'QA state' -Value "branch=$($Expected.QaBranch) state=$qaState head=$currentQaHead clean=true"

if ($PreflightOnly) {
    Write-Host ("PREFLIGHT=PASS authority={0} manifest={1} files={2} qa_state={3} qa_head={4}" -f $Expected.AuthorityParent, $providerManifest.Sha256, $providerPaths.Count, $qaState, $currentQaHead)
    exit 0
}

# Phase one freezes exact provider working-tree bytes into one mechanical commit.
# A fresh-base invocation always stops after materialization so no provider-authored
# Build.cs, C++, module, or automation code can execute before an independent review.
if ($qaState -ceq 'FRESH_BASE') {
    $emptyHooksRoot = Join-Path $providerSnapshotTempRoot 'empty-hooks'
    $destinationCreated = $false
    try {
    New-Item -ItemType Directory -Path $emptyHooksRoot -Force | Out-Null

    New-Item -ItemType Directory -Path $destinationRoot | Out-Null
    $destinationCreated = $true
    foreach ($path in $providerPaths) {
        $relative = $path.Substring($Expected.ProviderPrefix.Length)
        $sourcePath = Join-Path $providerSnapshotRoot ($path -replace '/', '\')
        $destinationPath = Join-Path $destinationRoot ($relative -replace '/', '\')
        $parent = Split-Path -Parent $destinationPath
        if (-not (Test-Path -LiteralPath $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
        Assert-Exact -Name "copied blob $relative" -Actual (Invoke-Git -Root $QaRoot -GitArgs @('hash-object', '--', $destinationPath)) -ExpectedValue $providerBlobs[$path]
    }

    $qaStatusLines = Get-Lines (Invoke-Git -Root $QaRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all'))
    $actualUntracked = @()
    foreach ($line in $qaStatusLines) {
        if (-not $line.StartsWith('?? ', [StringComparison]::Ordinal)) {
            throw "QA worktree changed outside a new untracked destination: $line"
        }
        $statusPath = $line.Substring(3).Replace('\', '/')
        if (-not $statusPath.StartsWith($Expected.DestinationPrefix, [StringComparison]::Ordinal)) {
            throw "QA worktree has an out-of-scope untracked path: $statusPath"
        }
        $actualUntracked += $statusPath
    }
    Assert-ExactSet -Name 'materialized untracked path set' -Actual $actualUntracked -ExpectedValues $destinationPaths

    [void](Invoke-Git -Root $QaRoot -GitArgs @('add', '--', $Expected.DestinationPrefix.TrimEnd('/')))
    $stagedLines = Get-Lines (Invoke-Git -Root $QaRoot -GitArgs @('diff', '--cached', '--name-status', '--no-renames', '--'))
    $stagedPaths = @()
    foreach ($line in $stagedLines) {
        $parts = @($line -split "`t")
        if ($parts.Count -ne 2 -or $parts[0] -cne 'A' -or -not $parts[1].StartsWith($Expected.DestinationPrefix, [StringComparison]::Ordinal)) {
            throw "Staged QA delta is not an in-scope addition: $line"
        }
        $stagedPaths += $parts[1]
    }
    Assert-ExactSet -Name 'staged destination path set' -Actual $stagedPaths -ExpectedValues $destinationPaths

    $priorGitEnvironment = @{}
    $gitEnvironmentNames = @('GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL')
    foreach ($name in $gitEnvironmentNames) {
        $priorGitEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    }
    try {
        $env:GIT_AUTHOR_NAME = 'Gemini Antigravity'
        $env:GIT_AUTHOR_EMAIL = 'antigravity@users.noreply.github.com'
        $env:GIT_COMMITTER_NAME = 'OpenAI QA'
        $env:GIT_COMMITTER_EMAIL = 'openai-qa@users.noreply.github.com'
        $commitMessage = "$($Expected.AssignmentId): mechanically materialize provider-authored bytes"
        $commitOutput = @(& git -c "core.hooksPath=$emptyHooksRoot" -c commit.gpgSign=false -C $QaRoot commit --no-gpg-sign -m $commitMessage 2>&1 | ForEach-Object { $_.ToString() })
        if ($LASTEXITCODE -ne 0) {
            throw "QA mechanical materialization commit failed:`n$($commitOutput -join "`n")"
        }
    }
    finally {
        foreach ($name in $gitEnvironmentNames) {
            if ($null -eq $priorGitEnvironment[$name]) {
                Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
            }
            else {
                [Environment]::SetEnvironmentVariable($name, [string]$priorGitEnvironment[$name], 'Process')
            }
        }
    }
    $materializedCommit = Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD')
    $materializedTree = Assert-MaterializedCandidate -CandidateHead $materializedCommit
    Write-Evidence -Check 'mechanical materialization' -Value "candidate=$materializedCommit manifest=$($providerManifest.Sha256) files=$($destinationPaths.Count) blob_identity=exact"
    }
    catch {
        if ($null -eq $materializedCommit -and $destinationCreated) {
            & git -C $QaRoot restore --staged -- $Expected.DestinationPrefix.TrimEnd('/') 2>&1 | Out-Null
            Remove-Item -LiteralPath $destinationRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
        throw
    }

    Write-Host ("SOURCE_REVIEW_REQUIRED assignment={0} provider_manifest={1} qa_candidate={2} qa_tree={3} acceptance=NOT_GRANTED" -f $Expected.AssignmentId, $providerManifest.Sha256, $materializedCommit, $materializedTree)
    exit 2
}

# Phase two begins only from the exact materialized candidate and a committed,
# manifest/head/tree-bound ACCEPT review by a different OpenAI source reviewer.
Assert-SourceReview -CandidateHead $materializedCommit -CandidateTree $materializedTree -LaunchControlHead ([string]$launchReceipt.control_head)

# Run the exact independent acceptance gates against the committed QA SHA.
# The QA worktree deliberately starts without ignored dependencies. Reuse the
# accepted-lock dependency tree locally and remove the junction afterward.
$createdDependencyJunction = $false
if (-not (Test-Path -LiteralPath $qaNodeModules)) {
    New-Item -ItemType Junction -Path $qaNodeModules -Target $controlNodeModules | Out-Null
    $createdDependencyJunction = $true
}
$priorPythonPath = [Environment]::GetEnvironmentVariable('PYTHONPATH', 'Process')
try {
    $env:PYTHONPATH = Join-Path $DirectorValidatorRoot 'src'
    Push-Location $QaRoot
    try {
        [void](Invoke-Gate -Name 'Director contribution validator' -Command 'python' -Arguments @($validatorPath, '--base', $Expected.AcceptedBase, '--head', $materializedCommit))

        $testOutput = Invoke-Gate -Name 'TypeScript baseline tests' -Command 'npm.cmd' -Arguments @('test')
        $plainTestOutput = [Text.RegularExpressions.Regex]::Replace($testOutput, "`e\[[0-9;]*[A-Za-z]", '')
        if ($plainTestOutput -notmatch ("Tests\s+{0} passed" -f $Expected.TypeScriptTests)) {
            throw "TypeScript baseline did not report exactly $($Expected.TypeScriptTests) passed tests."
        }
        Write-Evidence -Check 'TypeScript test count' -Value "$($Expected.TypeScriptTests)/$($Expected.TypeScriptTests)"

        [void](Invoke-Gate -Name 'strict native TypeScript' -Command 'npx.cmd' -Arguments @('--no-install', 'tsc', '-p', 'scripts/native/tsconfig.native.json', '--noEmit'))
        [void](Invoke-Gate -Name 'fixture-current check' -Command 'node' -Arguments @('scripts/native/run-ts.mjs', 'scripts/native/generate-fixtures.ts', '--check'))
        [void](Invoke-Gate -Name 'browser production build' -Command 'npm.cmd' -Arguments @('run', 'build'))

        [void](Invoke-Gate -Name 'UE5.7 LongTableEditor build' -Command 'pwsh' -Arguments @('-NoProfile', '-File', 'scripts/native/build-unreal.ps1', '-Target', 'LongTableEditor', '-Platform', 'Win64', '-Configuration', 'Development', '-EngineRoot', $Expected.EngineRoot, '-BuildSha', $materializedCommit))
        [void](Invoke-Gate -Name 'UE5.7 LongTable build' -Command 'pwsh' -Arguments @('-NoProfile', '-File', 'scripts/native/build-unreal.ps1', '-Target', 'LongTable', '-Platform', 'Win64', '-Configuration', 'Development', '-EngineRoot', $Expected.EngineRoot, '-BuildSha', $materializedCommit))

        $focusedOutput = Invoke-Gate -Name 'focused LongTable.RobotDealer automation' -Command 'pwsh' -Arguments @('-NoProfile', '-File', 'scripts/native/run-unreal-automation.ps1', '-Filter', 'LongTable.RobotDealer', '-EngineRoot', $Expected.EngineRoot)
        if ($focusedOutput -notmatch ("automation tests:\s+{0} succeeded,\s+0 failed,\s+0 not run" -f $Expected.FocusedRobotTests)) {
            throw "Focused automation did not report exactly $($Expected.FocusedRobotTests) succeeded, 0 failed, 0 not run."
        }
        $reportedRobotTests = @([Text.RegularExpressions.Regex]::Matches(
                $focusedOutput,
                '(?m)^\s*\[Success\]\s+(LongTable\.RobotDealer\.[^\r\n]+?)\s*$'
            ) | ForEach-Object { $_.Groups[1].Value })
        Assert-NoDuplicateStrings -Name 'focused robot test IDs' -Values $reportedRobotTests
        Assert-ExactSet -Name 'focused robot test ID set' -Actual $reportedRobotTests -ExpectedValues $RequiredRobotTests
        Write-Evidence -Check 'focused automation count' -Value "$($Expected.FocusedRobotTests) succeeded, 0 failed, 0 not run"

        $fullOutput = Invoke-Gate -Name 'full LongTable automation' -Command 'pwsh' -Arguments @('-NoProfile', '-File', 'scripts/native/run-unreal-automation.ps1', '-Filter', 'LongTable', '-EngineRoot', $Expected.EngineRoot)
        if ($fullOutput -notmatch ("automation tests:\s+{0} succeeded,\s+0 failed,\s+0 not run" -f $Expected.FullLongTableTests)) {
            throw "Full LongTable automation did not report exactly $($Expected.FullLongTableTests) succeeded, 0 failed, 0 not run."
        }
        $reportedFullTests = @([Text.RegularExpressions.Regex]::Matches(
                $fullOutput,
                '(?m)^\s*\[Success\]\s+(LongTable\.[^\r\n]+?)\s*$'
            ) | ForEach-Object { $_.Groups[1].Value })
        Assert-NoDuplicateStrings -Name 'full LongTable test IDs' -Values $reportedFullTests
        Assert-ExactSet -Name 'full LongTable test ID set' -Actual $reportedFullTests -ExpectedValues $RequiredFullTests
        Write-Evidence -Check 'full automation count' -Value "$($Expected.FullLongTableTests) succeeded, 0 failed, 0 not run"
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($null -eq $priorPythonPath) {
        Remove-Item -LiteralPath 'Env:PYTHONPATH' -ErrorAction SilentlyContinue
    }
    else {
        [Environment]::SetEnvironmentVariable('PYTHONPATH', $priorPythonPath, 'Process')
    }
    if ($createdDependencyJunction) {
        Remove-Item -LiteralPath $qaNodeModules -Force
    }
}

Assert-Exact -Name 'QA final HEAD' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $materializedCommit
Assert-Exact -Name 'QA final status' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')) -ExpectedValue ''
$materializedTree = Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', "$materializedCommit^{tree}")
Write-Host ("QA_EXECUTABLE_GATES=PASS authority={0} provider_manifest={1} qa_candidate={2} qa_tree={3} ts={4}/{4} robot={5}/15 full={6}/{6} source_review=ACCEPT standalone_acceptance=GRANTED first_deal=NOT_GRANTED" -f $Expected.AuthorityParent, $providerManifest.Sha256, $materializedCommit, $materializedTree, $Expected.TypeScriptTests, $Expected.FocusedRobotTests, $Expected.FullLongTableTests)
}
finally {
    Remove-Item -LiteralPath $providerSnapshotTempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
# [[OpenAI Director | Codex | 2026-08-31 | 06:14 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:23 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:26 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 07:30 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 14:34 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 14:54 UTC | END]]
