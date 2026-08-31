[CmdletBinding()]
param(
    [switch]$PreflightOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ProviderRoot = 'C:\Users\edwar\.codex\worktrees\long-table-claude-replacement-003'
$ClaudeExe = 'C:\Users\edwar\.local\bin\claude.exe'
$SchemaRoot = 'C:\Users\edwar\.codex\provider-qa\director-policy-cc791'
$SchemaPath = Join-Path $SchemaRoot 'docs\schemas\model-result-packet-v1.schema.json'
$PacketPath = Join-Path $ControlRoot 'director\native-program\packets\LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003.json'
$ResultBindingPath = Join-Path $ControlRoot 'director\native-program\packets\LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-RESULT-BINDING.json'
$ActivationPath = Join-Path $ControlRoot 'artifacts\native-program\coordination\2026-08-30-sequence-16-recovery-activation.md'
$AuditPath = Join-Path $ControlRoot 'artifacts\native-program\qa\2026-08-30-claude-replacement-003-partial-audit.md'
$PostflightPath = Join-Path $ControlRoot 'director\native-program\verify-materialize-claude-replacement-003.ps1'
$RecoveryOutputPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-recovery-cli-output.json'
$RecoveryErrorPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-recovery-cli-stderr.txt'
$MaterializationManifestPath = Join-Path $ControlRoot 'artifacts\native-program\qa\LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-materialization.json'
$DependencyRoot = 'C:\Users\edwar\.codex\worktrees\long-table-claude-foundation-final'
$ResetAt = [DateTimeOffset]::Parse('2026-08-30T19:00:00-07:00')

$Expected = [ordered]@{
    ControlBranch = 'codex/native-first-deal'
    ProviderBranch = 'codex/claude-foundation-replacement-003'
    Seed = '623ca52c5679b5348630f86eb88ecd48c9db82a1'
    SeedTree = '746fc5ac7234fa49adaa728262e95745aee52755'
    SeedParent = 'a6742a04a384a88e7342530041a1f0d3ab71db2c'
    DirtyStatus = 'M services/table-authority/src/table.ts'
    PartialPatchSha256 = '3de9147d2e0d115b2d028ec6825391970b961c8960849e74da3cd6616f455feb'
    PacketSha256 = '85ba252916b6496045e64285a9da1d9cca4de34821bbc333f113f572694f9a80'
    ResultBindingBlob = '6c191d7d050cb5eb1484370c5eb6b4ee66a2a4d8'
    ActivationSha256 = 'de7a94c54574fd40d13e014e7fec2e576e558c251efba309c6081afaf472ce5c'
    AuditSha256 = '6fd4f02f9c8e234cdfdef577909a4332a770325ede481c1da4cb963647170e2d'
    PostflightBlob = '291ecb6a899e3d437a4b73492baf56b26d15926b'
    SchemaAuthorityHead = 'cc791364e2f1ff1ac4c72e01c7122296e4ff7362'
    SchemaAuthorityTree = '51f529f07b453ec8e388d5634a569efb8cd2a881'
    SchemaBlob = 'ea3dbdf577b757a492ec4fcd53617a0fd9270800'
    LockSha256 = '738aa5fe475cd926ad9b15d54fd5d5527b6797080453e5f3e2ef3659080b3fd9'
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string[]]$GitArgs
    )

    $output = & git -C $Root @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed in $Root`: $($output -join [Environment]::NewLine)"
    }
    return ($output -join "`n").Trim()
}

function Get-Sha256 {
    param([Parameter(Mandatory)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-ProviderPatchSha256 {
    param([Parameter(Mandatory)][string]$Root)
    $diff = & git -C $Root diff --binary --no-ext-diff
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to read provider binary diff.'
    }
    $bytes = [Text.Encoding]::UTF8.GetBytes(($diff -join "`n") + "`n")
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Assert-Exact {
    param(
        [Parameter(Mandatory)][string]$Name,
        [AllowEmptyString()][string]$Actual,
        [AllowEmptyString()][string]$ExpectedValue
    )
    if ($Actual -cne $ExpectedValue) {
        throw "$Name mismatch. Expected '$ExpectedValue'; found '$Actual'."
    }
}

foreach ($requiredPath in @($ProviderRoot, $ClaudeExe, $SchemaPath, $PacketPath, $ResultBindingPath, $ActivationPath, $AuditPath, $PostflightPath, $DependencyRoot)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Required path is missing: $requiredPath"
    }
}

$now = [DateTimeOffset]::Now
if (-not $PreflightOnly -and $now -lt $ResetAt) {
    throw "Claude recovery is time-gated until $($ResetAt.ToString('o')); current time is $($now.ToString('o'))."
}

Assert-Exact -Name 'control branch' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('branch', '--show-current')) -ExpectedValue $Expected.ControlBranch
Assert-Exact -Name 'control status' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('status', '--porcelain=v1')) -ExpectedValue ''
$controlHead = Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', 'HEAD')
$controlUpstream = Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', '@{u}')
Assert-Exact -Name 'control upstream alignment' -Actual $controlHead -ExpectedValue $controlUpstream

Assert-Exact -Name 'provider branch' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('branch', '--show-current')) -ExpectedValue $Expected.ProviderBranch
Assert-Exact -Name 'provider HEAD' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $Expected.Seed
Assert-Exact -Name 'provider tree' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', 'HEAD^{tree}')) -ExpectedValue $Expected.SeedTree
Assert-Exact -Name 'provider parent' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('show', '-s', '--format=%P', 'HEAD')) -ExpectedValue $Expected.SeedParent
Assert-Exact -Name 'provider status' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('status', '--porcelain=v1')) -ExpectedValue $Expected.DirtyStatus
Assert-Exact -Name 'provider diff check' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--check')) -ExpectedValue ''
Assert-Exact -Name 'provider partial patch SHA-256' -Actual (Get-ProviderPatchSha256 -Root $ProviderRoot) -ExpectedValue $Expected.PartialPatchSha256

Assert-Exact -Name 'packet SHA-256' -Actual (Get-Sha256 -Path $PacketPath) -ExpectedValue $Expected.PacketSha256
Assert-Exact -Name 'result binding canonical blob' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object', '--path=director/native-program/packets/LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-RESULT-BINDING.json', '--', 'director/native-program/packets/LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-RESULT-BINDING.json')) -ExpectedValue $Expected.ResultBindingBlob
Assert-Exact -Name 'activation SHA-256' -Actual (Get-Sha256 -Path $ActivationPath) -ExpectedValue $Expected.ActivationSha256
Assert-Exact -Name 'partial audit SHA-256' -Actual (Get-Sha256 -Path $AuditPath) -ExpectedValue $Expected.AuditSha256
Assert-Exact -Name 'postflight canonical blob' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object', '--path=director/native-program/verify-materialize-claude-replacement-003.ps1', '--', 'director/native-program/verify-materialize-claude-replacement-003.ps1')) -ExpectedValue $Expected.PostflightBlob
Assert-Exact -Name 'schema authority HEAD' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $Expected.SchemaAuthorityHead
Assert-Exact -Name 'schema authority tree' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('rev-parse', 'HEAD^{tree}')) -ExpectedValue $Expected.SchemaAuthorityTree
Assert-Exact -Name 'schema authority status' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('status', '--porcelain=v1')) -ExpectedValue ''
Assert-Exact -Name 'result schema canonical blob' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('hash-object', '--', 'docs/schemas/model-result-packet-v1.schema.json')) -ExpectedValue $Expected.SchemaBlob

$providerLock = Join-Path $ProviderRoot 'package-lock.json'
$dependencyLock = Join-Path $DependencyRoot 'package-lock.json'
Assert-Exact -Name 'provider lock SHA-256' -Actual (Get-Sha256 -Path $providerLock) -ExpectedValue $Expected.LockSha256
Assert-Exact -Name 'dependency lock SHA-256' -Actual (Get-Sha256 -Path $dependencyLock) -ExpectedValue $Expected.LockSha256
$nodeModules = Get-Item -LiteralPath (Join-Path $ProviderRoot 'node_modules') -Force
Assert-Exact -Name 'node_modules link type' -Actual ([string]$nodeModules.LinkType) -ExpectedValue 'Junction'

$runningClaude = @(Get-Process claude -ErrorAction SilentlyContinue)
if ($runningClaude.Count -ne 0) {
    throw "A Claude process is already running: $($runningClaude.Id -join ', ')."
}

$authRaw = & $ClaudeExe auth status --json
if ($LASTEXITCODE -ne 0) {
    throw 'Claude authentication status failed.'
}
$auth = $authRaw | ConvertFrom-Json
if (-not $auth.loggedIn -or $auth.authMethod -cne 'claude.ai' -or $auth.apiProvider -cne 'firstParty' -or $auth.subscriptionType -cne 'max') {
    throw 'Claude authentication no longer matches the frozen first-party Max route.'
}

$preflight = [ordered]@{
    status = 'PRECHECK_OK'
    checked_at = $now.ToString('o')
    reset_at = $ResetAt.ToString('o')
    ready_for_full_recovery = ($now -ge $ResetAt)
    control_head = $controlHead
    provider_head = $Expected.Seed
    provider_tree = $Expected.SeedTree
    provider_partial_patch_sha256 = $Expected.PartialPatchSha256
    authenticated_route = 'claude.ai-max'
    model = 'claude-fable-5'
    effort = 'max'
}

if ($PreflightOnly) {
    $preflight | ConvertTo-Json -Compress
    exit 0
}

foreach ($outputPath in @($RecoveryOutputPath, $RecoveryErrorPath, $MaterializationManifestPath)) {
    if (Test-Path -LiteralPath $outputPath) {
        throw "Recovery output already exists; refusing a duplicate provider invocation: $outputPath"
    }
}

$env:CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1'
$env:CLAUDE_CODE_DISABLE_ORG_MEMORY = '1'

$packet = Get-Content -LiteralPath $PacketPath -Raw
$resultBinding = Get-Content -LiteralPath $ResultBindingPath -Raw
$activation = Get-Content -LiteralPath $ActivationPath -Raw
$audit = Get-Content -LiteralPath $AuditPath -Raw
$schemaObject = Get-Content -LiteralPath $SchemaPath -Raw | ConvertFrom-Json
$schemaObject.PSObject.Properties.Remove('$schema')
$schemaObject.PSObject.Properties.Remove('$id')
$resultSchema = $schemaObject | ConvertTo-Json -Depth 100 -Compress

$minimalSystem = @'
Act only as the bounded sequence-16 transient-recovery repository writer. Use no memory, Project knowledge, prior conversation, connector, MCP, browser, network, subagent, unrelated path, or external effect. Continue only the exact quarantined Claude-authored partial in the current worktree, obey the immutable packet and recovery delta, create exactly one local commit, never push, and return only the schema-conforming terminal object.
'@

$recoveryHeader = @"
This is the one packet-authorized transient recovery for LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003. The primary run eb37d2e5-253f-456b-b2cb-63d40a367fbc ended unambiguously on a provider 429 session limit. Do not resume that nonpersistent session and do not start a new assignment. The current table.ts partial is exact Claude-authored primary output with SHA-256 $($Expected.PartialPatchSha256); continue it in place.

All executable, authentication, dependency, Git, Node, npm, Vitest and UE5.7 availability checks are already complete. Do not spend turns on version, identity, directory, marker-census, ls, which, git-config or other environment reconnaissance. Use Read, Glob and Grep for source inspection. Use one command per Bash tool call; do not compose shell commands. Run only the packet's exact evidence, test, build and commit operations. No package install is needed.

Complete all 17 leased paths, not merely the partial TypeScript declaration work. Stop after exactly one local commit and one terminal result. There is no second recovery or revision.
"@

$prompt = $recoveryHeader + "`nEXACT_IMMUTABLE_PACKET_BEGIN`n" + $packet + "`nEXACT_IMMUTABLE_PACKET_END`n" +
    "EXACT_RESULT_ENVELOPE_BINDING_BEGIN`n" + $resultBinding + "`nEXACT_RESULT_ENVELOPE_BINDING_END`n" +
    "EXACT_RECOVERY_ACTIVATION_BEGIN`n" + $activation + "`nEXACT_RECOVERY_ACTIVATION_END`n" +
    "EXACT_OPENAI_PARTIAL_AUDIT_BEGIN`n" + $audit + "`nEXACT_OPENAI_PARTIAL_AUDIT_END"

$allowedTools = 'Read,Edit,Glob,Grep,Bash(git rev-parse *),Bash(git status *),Bash(git log *),Bash(git diff *),Bash(git show *),Bash(git ls-files *),Bash(git add -- *),Bash(git commit *),Bash(node .\scripts\native\run-ts.mjs *),Bash(npx.cmd vitest run *),Bash(npx.cmd tsc *),Bash(npm.cmd test),Bash(npm.cmd run build),Bash(pwsh .\scripts\native\build-unreal.ps1 *),Bash(pwsh .\scripts\native\run-unreal-automation.ps1 *)'
$claudeArgs = @(
    '--print',
    '--model', 'claude-fable-5',
    '--effort', 'max',
    '--autocompact', 'auto',
    '--safe-mode',
    '--no-chrome',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
    '--disable-slash-commands',
    '--permission-mode', 'dontAsk',
    '--system-prompt', $minimalSystem,
    '--tools', 'Read,Edit,Glob,Grep,Bash',
    '--allowedTools', $allowedTools,
    '--disallowedTools', 'Write,WebFetch,WebSearch,Task,NotebookEdit',
    '--json-schema', $resultSchema,
    '--output-format', 'json',
    '--prompt-suggestions', 'false'
)

$processInfo = [Diagnostics.ProcessStartInfo]::new()
$processInfo.FileName = $ClaudeExe
$processInfo.WorkingDirectory = $ProviderRoot
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.CreateNoWindow = $true
foreach ($argument in $claudeArgs) {
    $processInfo.ArgumentList.Add($argument)
}

$process = [Diagnostics.Process]::new()
$process.StartInfo = $processInfo
if (-not $process.Start()) {
    throw 'Claude recovery process failed to start.'
}
$stdoutTask = $process.StandardOutput.ReadToEndAsync()
$stderrTask = $process.StandardError.ReadToEndAsync()
$process.StandardInput.Write($prompt)
$process.StandardInput.Close()
$process.WaitForExit()
$stdout = $stdoutTask.GetAwaiter().GetResult()
$stderr = $stderrTask.GetAwaiter().GetResult()
$providerExit = $process.ExitCode

[IO.File]::WriteAllText($RecoveryOutputPath, $stdout, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($RecoveryErrorPath, $stderr, [Text.UTF8Encoding]::new($false))
if (-not [string]::IsNullOrWhiteSpace($stdout)) {
    $stdout.TrimEnd() | Write-Output
}
if ($providerExit -ne 0) {
    throw "Claude recovery exited $providerExit. Raw output and stderr were frozen without retry."
}

& $PostflightPath -RawResultPath $RecoveryOutputPath -ManifestPath $MaterializationManifestPath
if ($LASTEXITCODE -ne 0) {
    throw "Claude recovery returned exit 0, but the independent postflight rejected the handoff with exit $LASTEXITCODE."
}
