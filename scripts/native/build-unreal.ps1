# [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
<#
.SYNOPSIS
    Compiles the Long Table Unreal project with UnrealBuildTool.

.DESCRIPTION
    Injects the deterministic build identity (LONGTABLE_BUILD_SHA) from the
    current commit unless -BuildSha is supplied, then runs Build.bat for the
    requested target. Output is echoed and written to scripts/native/logs.

.EXAMPLE
    pwsh scripts/native/build-unreal.ps1
    pwsh scripts/native/build-unreal.ps1 -Target LongTable -Configuration Development
#>
param(
    [string]$Target = "LongTableEditor",
    [string]$Platform = "Win64",
    [string]$Configuration = "Development",
    [string]$EngineRoot = "C:\Program Files\Epic Games\UE_5.7",
    [string]$BuildSha = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$project = Join-Path $repoRoot "Unreal\LongTable.uproject"
$buildBat = Join-Path $EngineRoot "Engine\Build\BatchFiles\Build.bat"

if (-not (Test-Path $project)) { throw "project not found: $project" }
if (-not (Test-Path $buildBat)) { throw "UnrealBuildTool launcher not found: $buildBat" }

if ([string]::IsNullOrWhiteSpace($BuildSha)) {
    $BuildSha = (& git -C $repoRoot rev-parse HEAD).Trim()
}
$env:LONGTABLE_BUILD_SHA = $BuildSha

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "ubt-$Target-$Platform-$Configuration.log"

Write-Host "UnrealBuildTool: $Target $Platform $Configuration"
Write-Host "Project:         $project"
Write-Host "Build identity:  $BuildSha"
Write-Host "Log:             $log"

& $buildBat $Target $Platform $Configuration -Project="$project" -WaitMutex -NoHotReload 2>&1 | Tee-Object -FilePath $log
$exit = $LASTEXITCODE
Write-Host "UnrealBuildTool exit code: $exit"
exit $exit
# [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
