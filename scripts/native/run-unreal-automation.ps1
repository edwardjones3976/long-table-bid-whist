# [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
<#
.SYNOPSIS
    Runs the LongTable automation tests headless (no RHI, no editor UI).

.DESCRIPTION
    Launches UnrealEditor-Cmd against the project, runs every automation test
    whose name starts with -Filter, exports the report JSON, and exits non-zero
    when any test fails or the report is missing. Requires a prior build of the
    LongTableEditor target (scripts/native/build-unreal.ps1).

.EXAMPLE
    pwsh scripts/native/run-unreal-automation.ps1
    pwsh scripts/native/run-unreal-automation.ps1 -Filter LongTable.Protocol
#>
param(
    [string]$Filter = "LongTable",
    [string]$EngineRoot = "C:\Program Files\Epic Games\UE_5.7"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$project = Join-Path $repoRoot "Unreal\LongTable.uproject"
$editorCmd = Join-Path $EngineRoot "Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
if (-not (Test-Path $editorCmd)) { throw "UnrealEditor-Cmd not found: $editorCmd" }

$logDir = Join-Path $PSScriptRoot "logs"
$reportDir = Join-Path $logDir "automation-report"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$logName = "automation-$($Filter.Replace('.', '-')).log"
$stdoutLog = Join-Path $logDir "automation-stdout.log"

Write-Host "UnrealEditor-Cmd automation: $Filter"
Write-Host "Report: $reportDir"

& $editorCmd "$project" -unattended -nopause -nosplash -nullrhi -NoSound -stdout -FullStdOutLogOutput `
    -ExecCmds="Automation RunTests $Filter; Quit" -TestExit="Automation Test Queue Empty" `
    -ReportExportPath="$reportDir" -log="$logName" 2>&1 | Tee-Object -FilePath $stdoutLog | Out-Null
$editorExit = $LASTEXITCODE

$index = Join-Path $reportDir "index.json"
if (-not (Test-Path $index)) {
    Write-Host "automation report missing ($index); editor exit code $editorExit"
    exit 1
}

$report = Get-Content $index -Raw | ConvertFrom-Json
$succeeded = [int]$report.succeeded
$failed = [int]$report.failed
$notRun = [int]$report.notRun
Write-Host ("automation tests: {0} succeeded, {1} failed, {2} not run" -f $succeeded, $failed, $notRun)
foreach ($test in $report.tests) {
    $line = "  [{0}] {1}" -f $test.state, $test.fullTestPath
    Write-Host $line
    if ($test.state -ne "Success") {
        foreach ($entry in $test.entries) {
            if ($entry.event.type -eq "Error") { Write-Host ("      {0}" -f $entry.event.message) }
        }
    }
}
if ($failed -gt 0 -or $succeeded -eq 0) { exit 1 }
exit 0
# [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
