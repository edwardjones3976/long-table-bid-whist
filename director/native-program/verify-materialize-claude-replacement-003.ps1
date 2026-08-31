[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$RawResultPath,
    [string]$ManifestPath,
    [switch]$VerifyOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ProviderRoot = 'C:\Users\edwar\.codex\worktrees\long-table-claude-replacement-003'
$SchemaRoot = 'C:\Users\edwar\.codex\provider-qa\director-policy-cc791'
$SchemaPath = Join-Path $SchemaRoot 'docs\schemas\model-result-packet-v1.schema.json'
$PacketPath = Join-Path $ControlRoot 'director\native-program\packets\LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003.json'
$BindingPath = Join-Path $ControlRoot 'director\native-program\packets\LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-RESULT-BINDING.json'
$MaterializedBranch = 'codex/claude-foundation-replacement-003-materialized'
$MaterializedRoot = 'C:\Users\edwar\.codex\worktrees\long-table-claude-foundation-replacement-003-materialized'

$Expected = [ordered]@{
    Seed = '623ca52c5679b5348630f86eb88ecd48c9db82a1'
    SeedTree = '746fc5ac7234fa49adaa728262e95745aee52755'
    ProductParent = 'a6742a04a384a88e7342530041a1f0d3ab71db2c'
    ProductParentTree = '0489b183e70da5751c31e9b80ed40a8b631ba55a'
    ProviderBranch = 'codex/claude-foundation-replacement-003'
    PacketSha256 = '85ba252916b6496045e64285a9da1d9cca4de34821bbc333f113f572694f9a80'
    ResultBindingBlob = '6c191d7d050cb5eb1484370c5eb6b4ee66a2a4d8'
    SchemaAuthorityHead = 'cc791364e2f1ff1ac4c72e01c7122296e4ff7362'
    SchemaAuthorityTree = '51f529f07b453ec8e388d5634a569efb8cd2a881'
    SchemaBlob = 'ea3dbdf577b757a492ec4fcd53617a0fd9270800'
    FinalDeltaPathCount = 36
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

function Get-StringSha256 {
    param([Parameter(Mandatory)][string]$Value)
    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
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
    param([AllowEmptyString()][string]$Value)
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
    $actualSorted = @($Actual | Sort-Object -Unique)
    $expectedSorted = @($ExpectedValues | Sort-Object -Unique)
    if ($actualSorted.Count -ne $expectedSorted.Count -or (Compare-Object -CaseSensitive $expectedSorted $actualSorted)) {
        throw "$Name mismatch.`nExpected:`n$($expectedSorted -join "`n")`nActual:`n$($actualSorted -join "`n")"
    }
}

function Get-ResultPacket {
    param([Parameter(Mandatory)][object]$CliObject)

    if ($CliObject.PSObject.Properties['structured_output'] -and $null -ne $CliObject.structured_output) {
        return $CliObject.structured_output
    }
    if ($CliObject.PSObject.Properties['result'] -and $CliObject.result -is [string]) {
        try {
            return ($CliObject.result | ConvertFrom-Json -Depth 100)
        }
        catch {
            throw "Claude CLI result is not a JSON result packet: $($_.Exception.Message)"
        }
    }
    if ($CliObject.PSObject.Properties['schema_version']) {
        return $CliObject
    }
    throw 'Claude CLI output contains neither structured_output, a JSON result string, nor a top-level result packet.'
}

foreach ($requiredPath in @($ProviderRoot, $SchemaPath, $PacketPath, $BindingPath, $RawResultPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Required path is missing: $requiredPath"
    }
}

Assert-Exact -Name 'packet SHA-256' -Actual (Get-Sha256 -Path $PacketPath) -ExpectedValue $Expected.PacketSha256
Assert-Exact -Name 'result binding canonical blob' -Actual (Invoke-Git -Root $ControlRoot -GitArgs @('hash-object', '--path=director/native-program/packets/LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-RESULT-BINDING.json', '--', 'director/native-program/packets/LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003-RESULT-BINDING.json')) -ExpectedValue $Expected.ResultBindingBlob
Assert-Exact -Name 'schema authority HEAD' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $Expected.SchemaAuthorityHead
Assert-Exact -Name 'schema authority tree' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('rev-parse', 'HEAD^{tree}')) -ExpectedValue $Expected.SchemaAuthorityTree
Assert-Exact -Name 'schema authority status' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('status', '--porcelain=v1')) -ExpectedValue ''
Assert-Exact -Name 'schema canonical blob' -Actual (Invoke-Git -Root $SchemaRoot -GitArgs @('hash-object', '--', 'docs/schemas/model-result-packet-v1.schema.json')) -ExpectedValue $Expected.SchemaBlob

$packet = Get-Content -LiteralPath $PacketPath -Raw | ConvertFrom-Json -Depth 100
$binding = Get-Content -LiteralPath $BindingPath -Raw | ConvertFrom-Json -Depth 100
$rawResult = Get-Content -LiteralPath $RawResultPath -Raw
$cliObject = $rawResult | ConvertFrom-Json -Depth 100
$result = Get-ResultPacket -CliObject $cliObject
$resultJson = $result | ConvertTo-Json -Depth 100 -Compress

$tempResultPath = [IO.Path]::GetTempFileName()
try {
    [IO.File]::WriteAllText($tempResultPath, $resultJson, [Text.UTF8Encoding]::new($false))
    $schemaValidation = & python -c "import json,sys,jsonschema; s=json.load(open(sys.argv[1],encoding='utf-8')); i=json.load(open(sys.argv[2],encoding='utf-8')); jsonschema.Draft202012Validator.check_schema(s); jsonschema.Draft202012Validator(s).validate(i)" $SchemaPath $tempResultPath 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Result packet failed independent Draft-2020-12 validation: $($schemaValidation -join [Environment]::NewLine)"
    }
}
finally {
    Remove-Item -LiteralPath $tempResultPath -Force -ErrorAction SilentlyContinue
}

Assert-Exact -Name 'result schema version' -Actual $result.schema_version -ExpectedValue $binding.schema_version
Assert-Exact -Name 'result task ID' -Actual $result.task_id -ExpectedValue $binding.task_id
Assert-Exact -Name 'result assignment ID' -Actual $result.assignment_id -ExpectedValue $binding.assignment_id
Assert-Exact -Name 'result idempotency key' -Actual $result.idempotency_key -ExpectedValue $binding.idempotency_key
Assert-Exact -Name 'result authority snapshot digest' -Actual $result.authority_snapshot_digest -ExpectedValue $binding.authority_snapshot_digest
Assert-Exact -Name 'result provider' -Actual $result.provider -ExpectedValue $binding.provider
Assert-Exact -Name 'result status' -Actual $result.status -ExpectedValue $binding.required_status
Assert-Exact -Name 'result correlation ID' -Actual $result.correlation.correlation_id -ExpectedValue $binding.correlation.correlation_id
Assert-Exact -Name 'result source event ID' -Actual $result.correlation.source_event_id -ExpectedValue $binding.correlation.source_event_id
if (-not ([string]$result.run_reference).StartsWith([string]$binding.run_reference_prefix, [StringComparison]::Ordinal)) {
    throw "Result run reference must start with '$($binding.run_reference_prefix)'."
}
if (@($result.blockers).Count -ne 0 -or @($result.requested_decisions).Count -ne 0 -or [bool]$result.revision_recommended) {
    throw 'A SUCCEEDED handoff may not contain blockers, requested decisions, or a revision recommendation.'
}
foreach ($sideEffect in @($result.side_effects)) {
    if ($sideEffect.status -cne 'NOT_ATTEMPTED') {
        throw "External side effect is not permitted: $($sideEffect.kind) -> $($sideEffect.target) is $($sideEffect.status)."
    }
}

Assert-Exact -Name 'provider branch' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('branch', '--show-current')) -ExpectedValue $Expected.ProviderBranch
Assert-Exact -Name 'repository shallow state' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', '--is-shallow-repository')) -ExpectedValue 'false'
Assert-Exact -Name 'replace refs' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('for-each-ref', '--format=%(refname)', 'refs/replace')) -ExpectedValue ''
Assert-Exact -Name 'seed tree' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', "$($Expected.Seed)^{tree}")) -ExpectedValue $Expected.SeedTree
Assert-Exact -Name 'product parent tree' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', "$($Expected.ProductParent)^{tree}")) -ExpectedValue $Expected.ProductParentTree
Assert-Exact -Name 'repair-seed parent' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('show', '-s', '--format=%P', $Expected.Seed)) -ExpectedValue $Expected.ProductParent
Assert-Exact -Name 'repair-seed mode summary' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--summary', $Expected.ProductParent, $Expected.Seed, '--')) -ExpectedValue ''

$providerCandidate = Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', 'HEAD')
if ($providerCandidate -ceq $Expected.Seed) {
    throw 'Provider HEAD is still the repair seed; no candidate commit exists.'
}
Assert-Exact -Name 'provider candidate commit count' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('rev-list', '--count', "$($Expected.Seed)..$providerCandidate")) -ExpectedValue '1'
Assert-Exact -Name 'provider candidate sole parent' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('show', '-s', '--format=%P', $providerCandidate)) -ExpectedValue $Expected.Seed
Assert-Exact -Name 'provider worktree status' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('status', '--porcelain=v1')) -ExpectedValue ''

$providerTree = Invoke-Git -Root $ProviderRoot -GitArgs @('rev-parse', "$providerCandidate^{tree}")
$ownedPaths = @($packet.owned_paths | ForEach-Object { [string]$_ })
$changedStatusLines = Get-Lines (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--name-status', '--no-renames', $Expected.Seed, $providerCandidate, '--'))
$changedPaths = @()
foreach ($line in $changedStatusLines) {
    $parts = $line -split "`t", 2
    if ($parts.Count -ne 2 -or $parts[0] -cne 'M') {
        throw "Provider delta contains a non-modification entry: $line"
    }
    $changedPaths += $parts[1]
}
Assert-ExactSet -Name 'provider leased path set' -Actual $changedPaths -ExpectedValues $ownedPaths
Assert-Exact -Name 'provider path-mode summary' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--summary', $Expected.Seed, $providerCandidate, '--')) -ExpectedValue ''
foreach ($path in $ownedPaths) {
    $treeLine = Invoke-Git -Root $ProviderRoot -GitArgs @('ls-tree', $providerCandidate, '--', $path)
    if (-not $treeLine.StartsWith('100644 blob ', [StringComparison]::Ordinal)) {
        throw "Leased path is not an ordinary 100644 blob at the provider candidate: $path -> $treeLine"
    }
}

$remoteContainingRefs = Invoke-Git -Root $ProviderRoot -GitArgs @('for-each-ref', "--contains=$providerCandidate", '--format=%(refname)', 'refs/remotes')
Assert-Exact -Name 'remote-containing refs' -Actual $remoteContainingRefs -ExpectedValue ''

$seedDeltaPaths = Get-Lines (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--name-only', $Expected.ProductParent, $Expected.Seed, '--'))
$expectedFinalPaths = @($seedDeltaPaths + $ownedPaths | Sort-Object -Unique)
$actualFinalPaths = Get-Lines (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--name-only', $Expected.ProductParent, $providerCandidate, '--'))
Assert-ExactSet -Name 'final product delta path set' -Actual $actualFinalPaths -ExpectedValues $expectedFinalPaths
Assert-Exact -Name 'final product delta path count' -Actual $actualFinalPaths.Count -ExpectedValue $Expected.FinalDeltaPathCount
Assert-Exact -Name 'final product mode summary' -Actual (Invoke-Git -Root $ProviderRoot -GitArgs @('diff', '--summary', $Expected.ProductParent, $providerCandidate, '--')) -ExpectedValue ''

function Assert-ResultArtifact {
    param(
        [Parameter(Mandatory)][string]$Kind,
        [Parameter(Mandatory)][string]$Location
    )
    $matches = @($result.artifacts | Where-Object { $_.kind -ceq $Kind -and $_.location -ceq $Location })
    if ($matches.Count -ne 1) {
        throw "Result packet must contain exactly one artifact {$Kind, $Location}; found $($matches.Count)."
    }
}

Assert-ResultArtifact -Kind 'base_commit' -Location $Expected.Seed
Assert-ResultArtifact -Kind 'candidate_commit' -Location $providerCandidate
Assert-ResultArtifact -Kind 'candidate_tree' -Location $providerTree

$manifest = [ordered]@{
    schema_version = '1.0'
    status = if ($VerifyOnly) { 'VERIFIED_NOT_MATERIALIZED' } else { 'VERIFIED_FOR_MATERIALIZATION' }
    checked_at = [DateTimeOffset]::Now.ToString('o')
    assignment_id = [string]$result.assignment_id
    run_reference = [string]$result.run_reference
    packet_sha256 = "sha256:$($Expected.PacketSha256)"
    schema_blob = $Expected.SchemaBlob
    result_binding_sha256 = "sha256:$(Get-Sha256 -Path $BindingPath)"
    result_binding_blob = $Expected.ResultBindingBlob
    raw_cli_output_sha256 = "sha256:$(Get-Sha256 -Path $RawResultPath)"
    result_packet_sha256 = "sha256:$(Get-StringSha256 -Value $resultJson)"
    repair_seed = $Expected.Seed
    product_parent = $Expected.ProductParent
    provider_candidate = $providerCandidate
    provider_tree = $providerTree
    materialized_candidate = $null
    materialized_branch = $MaterializedBranch
    materialized_worktree = $MaterializedRoot
    provider_changed_paths = $changedPaths
    final_delta_paths = $actualFinalPaths
}

if (-not $VerifyOnly) {
    $materializedRef = "refs/heads/$MaterializedBranch"
    $existingMaterializedRefs = Invoke-Git -Root $ProviderRoot -GitArgs @('for-each-ref', '--format=%(refname)', $materializedRef, "refs/remotes/origin/$MaterializedBranch")
    Assert-Exact -Name 'reserved materialized refs' -Actual $existingMaterializedRefs -ExpectedValue ''
    if (Test-Path -LiteralPath $MaterializedRoot) {
        throw "Reserved materialized worktree path already exists: $MaterializedRoot"
    }

    $envNames = @('GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_AUTHOR_DATE', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'GIT_COMMITTER_DATE')
    $priorEnv = @{}
    foreach ($name in $envNames) {
        $priorEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    }
    try {
        $env:GIT_AUTHOR_NAME = 'OpenAI Director'
        $env:GIT_AUTHOR_EMAIL = 'director@local.invalid'
        $env:GIT_AUTHOR_DATE = '2026-08-30T19:05:00-07:00'
        $env:GIT_COMMITTER_NAME = 'OpenAI Director'
        $env:GIT_COMMITTER_EMAIL = 'director@local.invalid'
        $env:GIT_COMMITTER_DATE = '2026-08-30T19:05:00-07:00'
        $message = 'LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003: materialize verified provider tree'
        $materializedCandidateOutput = $message | & git -C $ProviderRoot commit-tree $providerTree -p $Expected.ProductParent 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "git commit-tree failed: $($materializedCandidateOutput -join [Environment]::NewLine)"
        }
        $materializedCandidate = ($materializedCandidateOutput -join "`n").Trim()
    }
    finally {
        foreach ($name in $envNames) {
            if ($null -eq $priorEnv[$name]) {
                Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
            }
            else {
                [Environment]::SetEnvironmentVariable($name, [string]$priorEnv[$name], 'Process')
            }
        }
    }

    $zero = '0000000000000000000000000000000000000000'
    $updateRefOutput = & git -C $ProviderRoot update-ref $materializedRef $materializedCandidate $zero 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to reserve $materializedRef with compare-and-swap: $($updateRefOutput -join [Environment]::NewLine)"
    }
    try {
        $worktreeOutput = & git -C $ProviderRoot worktree add $MaterializedRoot $MaterializedBranch 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "git worktree add failed: $($worktreeOutput -join [Environment]::NewLine)"
        }
    }
    catch {
        & git -C $ProviderRoot update-ref -d $materializedRef $materializedCandidate 2>&1 | Out-Null
        throw
    }

    Assert-Exact -Name 'materialized HEAD' -Actual (Invoke-Git -Root $MaterializedRoot -GitArgs @('rev-parse', 'HEAD')) -ExpectedValue $materializedCandidate
    Assert-Exact -Name 'materialized sole parent' -Actual (Invoke-Git -Root $MaterializedRoot -GitArgs @('show', '-s', '--format=%P', 'HEAD')) -ExpectedValue $Expected.ProductParent
    Assert-Exact -Name 'materialized tree' -Actual (Invoke-Git -Root $MaterializedRoot -GitArgs @('rev-parse', 'HEAD^{tree}')) -ExpectedValue $providerTree
    Assert-Exact -Name 'materialized status' -Actual (Invoke-Git -Root $MaterializedRoot -GitArgs @('status', '--porcelain=v1')) -ExpectedValue ''
    & git -C $MaterializedRoot merge-base --is-ancestor $Expected.Seed $materializedCandidate 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 1) {
        throw "Rejected seed ancestry check returned $LASTEXITCODE; expected 1 (not an ancestor)."
    }
    $materializedFinalPaths = Get-Lines (Invoke-Git -Root $MaterializedRoot -GitArgs @('diff', '--name-only', $Expected.ProductParent, $materializedCandidate, '--'))
    Assert-ExactSet -Name 'materialized final delta path set' -Actual $materializedFinalPaths -ExpectedValues $expectedFinalPaths
    $manifest.materialized_candidate = $materializedCandidate
    $manifest.status = 'MATERIALIZED_QA_READY'
}

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    $ManifestPath = "$RawResultPath.materialization.json"
}
$manifestParent = Split-Path -Parent $ManifestPath
if (-not [string]::IsNullOrWhiteSpace($manifestParent) -and -not (Test-Path -LiteralPath $manifestParent)) {
    New-Item -ItemType Directory -Path $manifestParent -Force | Out-Null
}
$manifestJson = $manifest | ConvertTo-Json -Depth 100
[IO.File]::WriteAllText($ManifestPath, $manifestJson + "`n", [Text.UTF8Encoding]::new($false))
$manifest | ConvertTo-Json -Depth 100 -Compress
