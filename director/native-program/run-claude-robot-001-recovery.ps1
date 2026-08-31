# [[OpenAI Director | Codex | 2026-08-31 | 06:43 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:34 UTC | BEGIN]]
[CmdletBinding()]
param(
    [switch]$PreflightOnly,
    [switch]$WaitForReset,
    [datetimeoffset]$ResetAt = [datetimeoffset]'2026-08-31T00:00:05-07:00'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ProviderRoot = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-claude-002-clean'
$ClaudeExe = 'C:\Users\edwar\.local\bin\claude.exe'
$PromptPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-001.sequence-25-recovery.prompt.md'
$OutputPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-001.sequence-25-recovery-cli-output.json'
$ErrorPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-001.sequence-25-recovery-cli-stderr.txt'
$ClaimPath = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-claude-002-clean-recovery.claim'

$Expected = [ordered]@{
    Head = '39087f750c7af361393feb32926ea898f9dccecb'
    Tree = '4085ca20ee26e081e0405d4820f3503c8f595b1c'
    Branch = 'codex/claude-robot-cleanroom-002'
    Status = '?? LongTableRobotDealer/'
    PublicContractSha256 = '56299bb63a352560f2a40fc1115db1eb276e87ada719054959b33498aef80c52'
    ResultSchemaSha256 = 'ebadc5bc45462ffa63ca5e6b28c09d1ccf86086389324a0c88f704bb14208d9c'
    WorkingManifestSha256 = '3fba90f9e9c782da2363272f8515d80eff0530a57e6e3588df5d84f14e8a1989'
    PromptSha256 = 'e5f3872037427d0daa6949e6b46effa88d2739cd761aaae25c81ac52aff66810'
}

function Invoke-Git([string[]]$GitArgs) {
    $output = & git -C $ProviderRoot @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    return ($output -join "`n").Trim()
}

function Assert-Exact([string]$Name, [string]$Actual, [string]$ExpectedValue) {
    if ($Actual -cne $ExpectedValue) {
        throw "$Name mismatch. Expected '$ExpectedValue'; got '$Actual'."
    }
}

function Get-LowerSha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-WorkingManifestSha256 {
    $productRoot = Join-Path $ProviderRoot 'LongTableRobotDealer'
    if (-not (Test-Path -LiteralPath $productRoot -PathType Container)) {
        throw 'Claude product subtree is absent.'
    }

    $rows = foreach ($file in Get-ChildItem -LiteralPath $productRoot -File -Recurse) {
        $relative = [IO.Path]::GetRelativePath($ProviderRoot, $file.FullName).Replace('\', '/')
        "$relative|$($file.Length)|$(Get-LowerSha256 $file.FullName)"
    }
    $manifest = (($rows | Sort-Object) -join "`n") + "`n"
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($manifest)
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Assert-ProviderState {
    if (-not (Test-Path -LiteralPath $ProviderRoot -PathType Container)) {
        throw 'Provider sandbox is unavailable.'
    }
    Assert-Exact 'provider HEAD' (Invoke-Git @('rev-parse', 'HEAD')) $Expected.Head
    Assert-Exact 'provider tree' (Invoke-Git @('rev-parse', 'HEAD^{tree}')) $Expected.Tree
    Assert-Exact 'provider branch' (Invoke-Git @('branch', '--show-current')) $Expected.Branch
    Assert-Exact 'provider working status' (Invoke-Git @('status', '--porcelain')) $Expected.Status
    Assert-Exact 'provider tracked files' (Invoke-Git @('ls-files')) "PUBLIC_CONTRACT.json`nRESULT_SCHEMA.json"
    Assert-Exact 'provider refs' (Invoke-Git @('for-each-ref', '--format=%(refname)')) "refs/heads/$($Expected.Branch)"
    Assert-Exact 'provider remotes' (Invoke-Git @('remote')) ''
    Assert-Exact 'public contract SHA-256' (Get-LowerSha256 (Join-Path $ProviderRoot 'PUBLIC_CONTRACT.json')) $Expected.PublicContractSha256
    Assert-Exact 'result schema SHA-256' (Get-LowerSha256 (Join-Path $ProviderRoot 'RESULT_SCHEMA.json')) $Expected.ResultSchemaSha256
    Assert-Exact 'Claude working manifest SHA-256' (Get-WorkingManifestSha256) $Expected.WorkingManifestSha256
}

function Assert-ClaudeAuth {
    $authRaw = & $ClaudeExe auth status --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw 'Claude authentication status failed.'
    }
    $auth = $authRaw | ConvertFrom-Json
    if (-not $auth.loggedIn -or $auth.authMethod -cne 'claude.ai' -or $auth.apiProvider -cne 'firstParty' -or $auth.subscriptionType -cne 'max') {
        throw 'Claude authentication no longer matches the first-party Max route.'
    }
}

if (-not (Test-Path -LiteralPath $ClaudeExe -PathType Leaf)) {
    throw 'Claude executable is unavailable.'
}
if (-not (Test-Path -LiteralPath $PromptPath -PathType Leaf)) {
    throw 'Frozen recovery prompt is unavailable.'
}
Assert-Exact 'recovery prompt SHA-256' (Get-LowerSha256 $PromptPath) $Expected.PromptSha256
foreach ($path in @($OutputPath, $ErrorPath)) {
    if (Test-Path -LiteralPath $path) {
        throw "Recovery output already exists; refusing duplicate Claude contact: $path"
    }
}

Assert-ProviderState
Assert-ClaudeAuth

$now = [datetimeoffset](Get-Date)
$preflight = [ordered]@{
    status = 'PRECHECK_OK'
    checked_at = $now.ToString('o')
    reset_at = $ResetAt.ToString('o')
    ready_for_recovery = ($now -ge $ResetAt)
    provider_head = $Expected.Head
    provider_tree = $Expected.Tree
    working_manifest_sha256 = $Expected.WorkingManifestSha256
    authenticated_route = 'claude.ai-max'
    model = 'claude-fable-5'
    effort = 'high'
}
if ($PreflightOnly) {
    $preflight | ConvertTo-Json -Compress
    exit 0
}

try {
    $claim = [IO.File]::Open($ClaimPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
}
catch {
    throw "The one-shot Claude recovery claim already exists; refusing a duplicate invocation: $ClaimPath"
}
try {
    $claimRecord = [ordered]@{
        assignment_id = 'LT-NATIVE-CLAUDE-ROBOT-001'
        idempotency_key = 'LT-NATIVE-CLAUDE-ROBOT-001-39087f7-SEQUENCE25'
        process_id = $PID
        claimed_at = ([datetimeoffset](Get-Date)).ToString('o')
        reset_at = $ResetAt.ToString('o')
        prompt_sha256 = $Expected.PromptSha256
    } | ConvertTo-Json -Compress
    $claimBytes = [Text.UTF8Encoding]::new($false).GetBytes($claimRecord + "`n")
    $claim.Write($claimBytes, 0, $claimBytes.Length)
    $claim.Flush($true)
}
finally {
    $claim.Dispose()
}

if ($now -lt $ResetAt) {
    if (-not $WaitForReset) {
        throw "Claude recovery is time-gated until $($ResetAt.ToString('o'))."
    }
    while ([datetimeoffset](Get-Date) -lt $ResetAt) {
        $remaining = [Math]::Ceiling(($ResetAt - [datetimeoffset](Get-Date)).TotalSeconds)
        Start-Sleep -Seconds ([Math]::Max(1, [Math]::Min(30, $remaining)))
    }
}

# Re-verify every bound byte immediately before the sole recovery contact.
Assert-ProviderState
Assert-ClaudeAuth
foreach ($path in @($OutputPath, $ErrorPath)) {
    if (Test-Path -LiteralPath $path) {
        throw "Recovery output appeared while waiting; refusing duplicate Claude contact: $path"
    }
}

$env:CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1'
$env:CLAUDE_CODE_DISABLE_ORG_MEMORY = '1'
$env:GIT_AUTHOR_NAME = 'Claude Code'
$env:GIT_AUTHOR_EMAIL = 'noreply@anthropic.com'
$env:GIT_COMMITTER_NAME = 'Claude Code'
$env:GIT_COMMITTER_EMAIL = 'noreply@anthropic.com'

$prompt = Get-Content -LiteralPath $PromptPath -Raw
$schemaObject = Get-Content -LiteralPath (Join-Path $ProviderRoot 'RESULT_SCHEMA.json') -Raw | ConvertFrom-Json
$schemaObject.PSObject.Properties.Remove('$schema')
$schemaObject.PSObject.Properties.Remove('$id')
$resultSchema = $schemaObject | ConvertTo-Json -Depth 100 -Compress

$system = @'
Act only as the bounded LT-NATIVE-CLAUDE-ROBOT-001 transient-recovery repository writer. Use no memory, prior conversation, browser, connector, MCP, network, web, subagent, unrelated repository or external content. Continue only the exact Claude-authored files already present in LongTableRobotDealer/** under the immutable two-file authority, create exactly one local sole-parent commit, never push, and return only the schema-conforming terminal object. This is the final authorized recovery; do not request another attempt.
'@

$allowedTools = 'Read,Edit,Glob,Grep,Bash(git rev-parse *),Bash(git status *),Bash(git branch --show-current),Bash(git for-each-ref *),Bash(git remote),Bash(git ls-files *),Bash(git diff *),Bash(git show *),Bash(git log *),Bash(git add -- *),Bash(git commit *)'
$arguments = @(
    '--print',
    '--model', 'claude-fable-5',
    '--effort', 'high',
    '--autocompact', 'auto',
    '--safe-mode',
    '--no-chrome',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
    '--disable-slash-commands',
    '--permission-mode', 'dontAsk',
    '--system-prompt', $system,
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
foreach ($argument in $arguments) {
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
[IO.File]::WriteAllText($OutputPath, $stdout, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($ErrorPath, $stderr, [Text.UTF8Encoding]::new($false))
if ($process.ExitCode -ne 0) {
    throw "Claude recovery exited $($process.ExitCode); exact output was frozen and no retry is permitted."
}
$stdout.TrimEnd()
# [[OpenAI Director | Codex | 2026-08-31 | 06:34 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:43 UTC | END]]
