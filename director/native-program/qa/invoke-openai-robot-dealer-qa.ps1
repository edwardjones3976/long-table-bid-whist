# [[OpenAI Director | Codex | 2026-08-31 | 06:26 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:23 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:14 UTC | BEGIN]]
<#
.SYNOPSIS
    Fail-closed exact-byte OpenAI QA for LT-NATIVE-CLAUDE-ROBOT-001.

.DESCRIPTION
    Verifies the fixed synthetic provider authority, a single exact Claude
    provider commit and its schema-bound result, then mechanically materializes
    only LongTableRobotDealer/** below Unreal/Plugins/LongTableRobotDealer/** in
    the fixed QA worktree. The provider blobs are copied unchanged; this script
    neither corrects nor authors product code.

    -PreflightOnly performs every provider/result/QA-base validation but does
    not copy, commit, build, or run product tests.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$ProviderCommit,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$RawResultPath,

    [string]$ProviderRoot = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-claude-002-clean',
    [string]$QaRoot = 'C:\Users\edwar\.codex\worktrees\long-table-claude-robot-qa-002',
    [string]$DirectorValidatorRoot = 'C:\Users\edwar\.codex\provider-qa\director-policy-cc791',
    [switch]$PreflightOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path

$Expected = [ordered]@{
    AssignmentId = 'LT-NATIVE-CLAUDE-ROBOT-001'
    TaskId = 'LT-NATIVE-PROGRAM-20260830'
    IdempotencyKey = 'LT-NATIVE-CLAUDE-ROBOT-001-39087f7-SEQUENCE25'
    CorrelationId = 'LT-NATIVE-CLAUDE-ROBOT-001'
    SourceEventId = 'openai-first-deal-robot-cleanroom-reauthorization-20260831'
    AuthorityDigest = 'sha256:37608811b0034ba030df68309a18019b826354dec697bfec0beb217b6d4f851f'
    AuthorityParent = '39087f750c7af361393feb32926ea898f9dccecb'
    AuthorityTree = '4085ca20ee26e081e0405d4820f3503c8f595b1c'
    ProviderBranch = 'codex/claude-robot-cleanroom-002'
    ProviderAuthor = 'Claude Code <noreply@anthropic.com>'
    PublicContractBlob = '528ce90812d4c452ddc51a0cccc86dd990977abe'
    PublicContractSha256 = '56299bb63a352560f2a40fc1115db1eb276e87ada719054959b33498aef80c52'
    ResultSchemaBlob = '3f68e59136c422ce84d79f874c0343fd5ffc0a9e'
    ResultSchemaSha256 = 'ebadc5bc45462ffa63ca5e6b28c09d1ccf86086389324a0c88f704bb14208d9c'
    AcceptedBase = '4d26680fb99abacb20ecb18807b7c8833646cfa3'
    AcceptedTree = '1e0db56f1e85d66c93ab64bc3dca8c237947c210'
    PackageLockBlob = 'b213128a79ea18700a80fff59ecc82fe3ce4ecc9'
    EngineRoot = 'C:\Program Files\Epic Games\UE_5.7'
    QaBranch = 'codex/claude-robot-qa-002'
    ProviderPrefix = 'LongTableRobotDealer/'
    DestinationPrefix = 'Unreal/Plugins/LongTableRobotDealer/'
    DirectorHead = 'cc791364e2f1ff1ac4c72e01c7122296e4ff7362'
    DirectorTree = '51f529f07b453ec8e388d5634a569efb8cd2a881'
    DirectorValidatorBlob = 'a6871c53206e26d3ad72cd6809b92529ddb2cf87'
    TypeScriptTests = 219
    FocusedRobotTests = 15
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

    if ($CliObject.PSObject.Properties['structured_output'] -and $null -ne $CliObject.structured_output) {
        return $CliObject.structured_output
    }
    throw 'Claude output must be one CLI JSON wrapper with a non-null structured_output object.'
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

foreach ($required in @($ProviderRoot, $QaRoot, $DirectorValidatorRoot, $RawResultPath)) {
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

# Bind the provider repository, authority commit and exact terminal candidate.
Assert-Exact -Name 'provider branch' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('branch', '--show-current')) -ExpectedValue $Expected.ProviderBranch
Assert-Exact -Name 'provider shallow state' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', '--is-shallow-repository')) -ExpectedValue 'false'
Assert-Exact -Name 'provider replace refs' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('for-each-ref', '--format=%(refname)', 'refs/replace')) -ExpectedValue ''
Assert-Exact -Name 'provider remotes' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('remote')) -ExpectedValue ''
Assert-Exact -Name 'provider complete ref set' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('for-each-ref', '--format=%(refname)')) -ExpectedValue "refs/heads/$($Expected.ProviderBranch)"
Assert-Exact -Name 'provider authority tree' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', "$($Expected.AuthorityParent)^{tree}")) -ExpectedValue $Expected.AuthorityTree
Assert-Exact -Name 'provider HEAD' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $ProviderCommit
Assert-Exact -Name 'provider status' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')) -ExpectedValue ''
Assert-Exact -Name 'provider candidate count' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-list', '--count', "$($Expected.AuthorityParent)..$ProviderCommit")) -ExpectedValue '1'
Assert-Exact -Name 'provider sole parent' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('show', '-s', '--format=%P', $ProviderCommit)) -ExpectedValue $Expected.AuthorityParent
$providerIdentity = Get-Lines (Invoke-Git -Root $ProviderRoot -GitArgs @('show', '-s', '--format=%an <%ae>%n%cn <%ce>', $ProviderCommit))
Assert-Exact -Name 'provider author line' -Actual $providerIdentity[0] -ExpectedValue $Expected.ProviderAuthor
Assert-Exact -Name 'provider committer line' -Actual $providerIdentity[1] -ExpectedValue $Expected.ProviderAuthor

Assert-Exact -Name 'public contract base blob' -Actual (Get-TreeBlob -Root $ProviderRoot -Commit $Expected.AuthorityParent -Path 'PUBLIC_CONTRACT.json') -ExpectedValue $Expected.PublicContractBlob
Assert-Exact -Name 'public contract candidate blob' -Actual (Get-TreeBlob -Root $ProviderRoot -Commit $ProviderCommit -Path 'PUBLIC_CONTRACT.json') -ExpectedValue $Expected.PublicContractBlob
Assert-Exact -Name 'result schema base blob' -Actual (Get-TreeBlob -Root $ProviderRoot -Commit $Expected.AuthorityParent -Path 'RESULT_SCHEMA.json') -ExpectedValue $Expected.ResultSchemaBlob
Assert-Exact -Name 'result schema candidate blob' -Actual (Get-TreeBlob -Root $ProviderRoot -Commit $ProviderCommit -Path 'RESULT_SCHEMA.json') -ExpectedValue $Expected.ResultSchemaBlob
Assert-Exact -Name 'public contract SHA-256' -Actual (Get-Sha256 -Path $publicContractPath) -ExpectedValue $Expected.PublicContractSha256
Assert-Exact -Name 'result schema SHA-256' -Actual (Get-Sha256 -Path $resultSchemaPath) -ExpectedValue $Expected.ResultSchemaSha256
$combinedAuthority = 'sha256:' + (Get-CombinedSha256 -Paths @($publicContractPath, $resultSchemaPath))
Assert-Exact -Name 'combined authority digest' -Actual $combinedAuthority -ExpectedValue $Expected.AuthorityDigest

$providerTree = Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', "$ProviderCommit^{tree}")
$statusLines = Get-Lines (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--name-status', '--no-renames', $Expected.AuthorityParent, $ProviderCommit, '--'))
if ($statusLines.Count -eq 0) {
    throw 'Provider candidate contains no product files.'
}
$providerPaths = @()
foreach ($line in $statusLines) {
    $parts = @($line -split "`t")
    if ($parts.Count -ne 2 -or $parts[0] -cne 'A') {
        throw "Provider delta contains a non-addition or malformed entry: $line"
    }
    Assert-SafeProviderPath -Path $parts[1]
    $providerPaths += $parts[1]
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

$providerBlobs = @{}
foreach ($path in $providerPaths) {
    $providerBlobs[$path] = Get-TreeBlob -Root $ProviderRoot -Commit $ProviderCommit -Path $path
    $providerWorktreePath = Join-Path $ProviderRoot ($path -replace '/', '\')
    Assert-Exact -Name "provider worktree blob $path" -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('hash-object', '--', $providerWorktreePath)) -ExpectedValue $providerBlobs[$path]
    Assert-TextBlob -Path $providerWorktreePath -LogicalPath $path
}
Write-Evidence -Check 'provider candidate' -Value "commit=$ProviderCommit tree=$providerTree files=$($providerPaths.Count)"

# Validate the exact provider result against the immutable provider schema.
try {
    $rawCli = Get-Content -LiteralPath $RawResultPath -Raw | ConvertFrom-Json -Depth 100
}
catch {
    throw "Raw provider result is not valid JSON: $($_.Exception.Message)"
}
Assert-Exact -Name 'CLI wrapper type' -Actual $rawCli.type -ExpectedValue 'result'
Assert-Exact -Name 'CLI terminal reason' -Actual $rawCli.terminal_reason -ExpectedValue 'completed'
Assert-Exact -Name 'CLI error flag' -Actual ([bool]$rawCli.is_error) -ExpectedValue $false
Assert-Exact -Name 'CLI API error status' -Actual $rawCli.api_error_status -ExpectedValue $null
if ([string]::IsNullOrWhiteSpace([string]$rawCli.session_id)) {
    throw 'CLI wrapper is missing its authenticated session ID.'
}
if (-not $rawCli.modelUsage -or -not $rawCli.modelUsage.PSObject.Properties['claude-fable-5']) {
    throw 'CLI wrapper does not bind claude-fable-5 model usage.'
}
Assert-Exact -Name 'CLI web searches' -Actual $rawCli.usage.server_tool_use.web_search_requests -ExpectedValue 0
Assert-Exact -Name 'CLI web fetches' -Actual $rawCli.usage.server_tool_use.web_fetch_requests -ExpectedValue 0
Assert-Exact -Name 'CLI spawned subagents' -Actual $rawCli.subagent_stats.spawned -ExpectedValue 0
if (@($rawCli.permission_denials).Count -ne 0) {
    throw 'CLI wrapper contains permission denials; provider scope/provenance is not clean.'
}
$result = Get-ResultPacket -CliObject $rawCli
$resultJson = $result | ConvertTo-Json -Depth 100 -Compress
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
Assert-Exact -Name 'result correlation ID' -Actual $result.correlation.correlation_id -ExpectedValue $Expected.CorrelationId
Assert-Exact -Name 'result source event ID' -Actual $result.correlation.source_event_id -ExpectedValue $Expected.SourceEventId
Assert-Exact -Name 'result provider' -Actual $result.provider -ExpectedValue 'Claude'
Assert-Exact -Name 'result status' -Actual $result.status -ExpectedValue 'SUCCEEDED'
if (-not ([string]$result.run_reference).Contains([string]$rawCli.session_id, [StringComparison]::Ordinal)) {
    throw 'Result run_reference does not bind the authenticated CLI session ID.'
}
if (@($result.blockers).Count -ne 0 -or @($result.requested_decisions).Count -ne 0 -or [bool]$result.revision_recommended) {
    throw 'A materializable provider result may not contain blockers, requested decisions, or revision recommendation.'
}
if (@($result.acceptance | Where-Object { $_.status -in @('FAIL', 'BLOCKED') }).Count -ne 0) {
    throw 'A materializable provider result may not contain failed or blocked acceptance rows.'
}
foreach ($sideEffect in @($result.side_effects)) {
    if ($sideEffect.status -ceq 'NOT_ATTEMPTED') {
        continue
    }
    $isExactLocalCommit = $sideEffect.status -ceq 'COMPLETED' -and
        ([string]$sideEffect.kind).ToLowerInvariant().Contains('commit') -and
        [string]$sideEffect.external_id -ceq $ProviderCommit -and
        (([string]$sideEffect.target).Contains($ProviderRoot, [StringComparison]::OrdinalIgnoreCase) -or
            ([string]$sideEffect.target).Contains($Expected.ProviderBranch, [StringComparison]::Ordinal))
    if (-not $isExactLocalCommit) {
        throw "Provider result reports a prohibited or unbound side effect: $($sideEffect.kind) $($sideEffect.target) $($sideEffect.status)."
    }
}
Assert-ResultArtifact -Result $result -Kind 'base_commit' -Location $Expected.AuthorityParent
Assert-ResultArtifact -Result $result -Kind 'candidate_commit' -Location $ProviderCommit
Assert-ResultArtifact -Result $result -Kind 'candidate_tree' -Location $providerTree
Write-Evidence -Check 'provider result' -Value "schema=valid status=$($result.status) authority=$($result.authority_snapshot_digest)"

# The reserved QA worktree must already be an untouched exact-base checkout.
Assert-Exact -Name 'QA branch' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('branch', '--show-current')) -ExpectedValue $Expected.QaBranch
Assert-Exact -Name 'QA HEAD' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $Expected.AcceptedBase
Assert-Exact -Name 'QA accepted tree' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD^{tree}')) -ExpectedValue $Expected.AcceptedTree
Assert-Exact -Name 'QA accepted package lock' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', 'HEAD:package-lock.json')) -ExpectedValue $Expected.PackageLockBlob
Assert-Exact -Name 'QA status' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')) -ExpectedValue ''
Assert-Exact -Name 'QA shallow state' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('rev-parse', '--is-shallow-repository')) -ExpectedValue 'false'
Assert-Exact -Name 'QA replace refs' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('for-each-ref', '--format=%(refname)', 'refs/replace')) -ExpectedValue ''
$destinationRoot = Join-Path $QaRoot ($Expected.DestinationPrefix.TrimEnd('/') -replace '/', '\')
Assert-StrictChildPath -Parent $QaRoot -Child $destinationRoot -Name 'QA destination'
if (Test-Path -LiteralPath $destinationRoot) {
    throw "QA destination already exists: $destinationRoot"
}
Assert-Exact -Name 'QA base destination tree entry' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('ls-tree', '-r', '--name-only', $Expected.AcceptedBase, '--', $Expected.DestinationPrefix.TrimEnd('/'))) -ExpectedValue ''
$qaNodeModules = Join-Path $QaRoot 'node_modules'
$controlNodeModules = Join-Path $ControlRoot 'node_modules'
if (-not (Test-Path -LiteralPath $qaNodeModules)) {
    if (-not (Test-Path -LiteralPath $controlNodeModules -PathType Container)) {
        throw "Offline JavaScript dependencies are unavailable at both $qaNodeModules and $controlNodeModules."
    }
    Assert-Exact -Name 'offline dependency lock authority' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('rev-parse', 'HEAD:package-lock.json')) -ExpectedValue $Expected.PackageLockBlob
}
Write-Evidence -Check 'QA base' -Value "branch=$($Expected.QaBranch) head=$($Expected.AcceptedBase) clean=true destination=absent"

if ($PreflightOnly) {
    Write-Host ("PREFLIGHT=PASS provider={0} tree={1} files={2} qa_base={3}" -f $ProviderCommit, $providerTree, $providerPaths.Count, $Expected.AcceptedBase)
    exit 0
}

# Export committed provider objects, then copy and verify exact blob identities.
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("lt-robot-materialize-{0}" -f [guid]::NewGuid().ToString('N'))
Assert-StrictChildPath -Parent ([IO.Path]::GetTempPath()) -Child $tempRoot -Name 'temporary materialization root'
$archivePath = Join-Path $tempRoot 'provider.zip'
$extractRoot = Join-Path $tempRoot 'extract'
$emptyHooksRoot = Join-Path $tempRoot 'empty-hooks'
$destinationCreated = $false
$materializedCommit = $null
try {
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $emptyHooksRoot -Force | Out-Null
    $archiveOutput = @(& git -C $ProviderRoot archive --format=zip --output=$archivePath $ProviderCommit -- $Expected.ProviderPrefix.TrimEnd('/') 2>&1 | ForEach-Object { $_.ToString() })
    if ($LASTEXITCODE -ne 0) {
        throw "git archive failed:`n$($archiveOutput -join "`n")"
    }
    Expand-Archive -LiteralPath $archivePath -DestinationPath $extractRoot

    foreach ($path in $providerPaths) {
        $sourcePath = Join-Path $extractRoot ($path -replace '/', '\')
        Assert-Exact -Name "archived blob $path" -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('hash-object', '--', $sourcePath)) -ExpectedValue $providerBlobs[$path]
        Assert-TextBlob -Path $sourcePath -LogicalPath $path
    }

    New-Item -ItemType Directory -Path $destinationRoot | Out-Null
    $destinationCreated = $true
    $destinationPaths = @()
    foreach ($path in $providerPaths) {
        $relative = $path.Substring($Expected.ProviderPrefix.Length)
        $sourcePath = Join-Path $extractRoot ($path -replace '/', '\')
        $destinationPath = Join-Path $destinationRoot ($relative -replace '/', '\')
        $parent = Split-Path -Parent $destinationPath
        if (-not (Test-Path -LiteralPath $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
        Assert-Exact -Name "copied blob $relative" -Actual (Invoke-Git -Root $QaRoot -GitArgs @('hash-object', '--', $destinationPath)) -ExpectedValue $providerBlobs[$path]
        $destinationPaths += $Expected.DestinationPrefix + $relative
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
        $env:GIT_AUTHOR_NAME = 'OpenAI Director'
        $env:GIT_AUTHOR_EMAIL = 'director@local.invalid'
        $env:GIT_COMMITTER_NAME = 'OpenAI Director'
        $env:GIT_COMMITTER_EMAIL = 'director@local.invalid'
        $commitMessage = "$($Expected.AssignmentId): OpenAI mechanical materialization of provider $ProviderCommit"
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
    Assert-Exact -Name 'QA materialized sole parent' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('show', '-s', '--format=%P', $materializedCommit)) -ExpectedValue $Expected.AcceptedBase
    Assert-Exact -Name 'QA materialized commit identity' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('show', '-s', '--format=%an <%ae>%n%cn <%ce>', $materializedCommit)) -ExpectedValue "OpenAI Director <director@local.invalid>`nOpenAI Director <director@local.invalid>"
    Assert-Exact -Name 'QA materialized commit message' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('show', '-s', '--format=%s', $materializedCommit)) -ExpectedValue "$($Expected.AssignmentId): OpenAI mechanical materialization of provider $ProviderCommit"
    $committedPaths = Get-Lines (Invoke-Git -Root $QaRoot -GitArgs @('diff', '--name-only', $Expected.AcceptedBase, $materializedCommit, '--'))
    Assert-ExactSet -Name 'committed destination path set' -Actual $committedPaths -ExpectedValues $destinationPaths
    foreach ($providerPath in $providerPaths) {
        $relative = $providerPath.Substring($Expected.ProviderPrefix.Length)
        $destinationPath = $Expected.DestinationPrefix + $relative
        $destinationBlob = Get-TreeBlob -Root $QaRoot -Commit $materializedCommit -Path $destinationPath
        Assert-Exact -Name "committed blob $destinationPath" -Actual $destinationBlob -ExpectedValue $providerBlobs[$providerPath]
    }
    Assert-Exact -Name 'QA post-commit status' -Actual (Invoke-Git -Root $QaRoot -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')) -ExpectedValue ''
    Write-Evidence -Check 'mechanical materialization' -Value "candidate=$materializedCommit files=$($destinationPaths.Count) blob_identity=exact"
}
catch {
    if ($null -eq $materializedCommit -and $destinationCreated) {
        & git -C $QaRoot restore --staged -- $Expected.DestinationPrefix.TrimEnd('/') 2>&1 | Out-Null
        Remove-Item -LiteralPath $destinationRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    throw
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

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
        Assert-ExactSet -Name 'focused robot test ID set' -Actual $reportedRobotTests -ExpectedValues $RequiredRobotTests
        Write-Evidence -Check 'focused automation count' -Value "$($Expected.FocusedRobotTests) succeeded, 0 failed, 0 not run"

        $fullOutput = Invoke-Gate -Name 'full LongTable automation' -Command 'pwsh' -Arguments @('-NoProfile', '-File', 'scripts/native/run-unreal-automation.ps1', '-Filter', 'LongTable', '-EngineRoot', $Expected.EngineRoot)
        if ($fullOutput -notmatch 'automation tests:\s+[1-9][0-9]* succeeded,\s+0 failed,\s+0 not run') {
            throw 'Full LongTable automation did not report a nonzero success count with 0 failed and 0 not run.'
        }
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
Write-Host ("QA_EXECUTABLE_GATES=PASS provider={0} provider_tree={1} qa_candidate={2} qa_tree={3} ts={4}/{4} robot={5}/15 full=PASS source_review=REQUIRED acceptance=NOT_GRANTED" -f $ProviderCommit, $providerTree, $materializedCommit, $materializedTree, $Expected.TypeScriptTests, $Expected.FocusedRobotTests)
# [[OpenAI Director | Codex | 2026-08-31 | 06:14 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:23 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 06:26 UTC | END]]
