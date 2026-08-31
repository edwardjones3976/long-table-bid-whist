# [[OpenAI Director | Codex | 2026-08-31 | 03:01 UTC | BEGIN]]
[CmdletBinding()]
param([switch]$PreflightOnly)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ProviderRoot = 'C:\Users\edwar\.codex\worktrees\long-table-claude-provenance-004'
$ClaudeExe = 'C:\Users\edwar\.local\bin\claude.exe'
$SchemaPath = 'C:\Users\edwar\.codex\provider-qa\director-policy-cc791\docs\schemas\model-result-packet-v1.schema.json'
$PacketPath = Join-Path $ControlRoot 'director\native-program\packets\LT-NATIVE-CLAUDE-PROVENANCE-004.json'
$ActivationPath = Join-Path $ControlRoot 'artifacts\native-program\coordination\2026-08-30-sequence-19-activation.md'
$OutputPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-PROVENANCE-004-cli-output.json'
$ErrorPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-PROVENANCE-004-cli-stderr.txt'

function Invoke-Git([string]$Root, [string[]]$GitArgs) {
    $output = & git -C $Root @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git $($GitArgs -join ' ') failed: $($output -join [Environment]::NewLine)" }
    return ($output -join "`n").Trim()
}

if (-not (Test-Path -LiteralPath $ClaudeExe -PathType Leaf)) { throw 'Claude executable is unavailable.' }
if (-not (Test-Path -LiteralPath $SchemaPath -PathType Leaf)) { throw 'Frozen result schema is unavailable.' }
if ((Invoke-Git $ProviderRoot @('rev-parse','HEAD')) -ne 'cb7b49b9a12584fbae6167c4072da3f2286a1cc8') { throw 'Provider HEAD mismatch.' }
if ((Invoke-Git $ProviderRoot @('rev-parse','HEAD^{tree}')) -ne '0c5963cad9da6256489dade2b24d90a4be7d98b2') { throw 'Provider tree mismatch.' }
if ((Invoke-Git $ProviderRoot @('branch','--show-current')) -ne 'codex/claude-provenance-004') { throw 'Provider branch mismatch.' }
if ((Invoke-Git $ProviderRoot @('status','--porcelain')) -ne '') { throw 'Provider worktree is not clean.' }
if ((Test-Path -LiteralPath $OutputPath) -or (Test-Path -LiteralPath $ErrorPath)) { throw 'Sequence-19 output already exists; refusing duplicate contact.' }

Write-Output 'sequence-19 preflight: PASS'
if ($PreflightOnly) { exit 0 }

$env:CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1'
$env:CLAUDE_CODE_DISABLE_ORG_MEMORY = '1'

$packet = Get-Content -LiteralPath $PacketPath -Raw
$activation = Get-Content -LiteralPath $ActivationPath -Raw
$schemaObject = Get-Content -LiteralPath $SchemaPath -Raw | ConvertFrom-Json
$schemaObject.PSObject.Properties.Remove('$schema')
$schemaObject.PSObject.Properties.Remove('$id')
$resultSchema = $schemaObject | ConvertTo-Json -Depth 100 -Compress

$system = 'Act only as the bounded sequence-19 provenance writer. Use no memory, prior conversation, browser, connector, MCP, network, subagent, unrelated path or external effect. Make only the packet-exact comment additions, create one local commit, never push, and return only the schema-conforming terminal object.'
$prompt = "EXACT_IMMUTABLE_PACKET_BEGIN`n$packet`nEXACT_IMMUTABLE_PACKET_END`nEXACT_ACTIVATION_BEGIN`n$activation`nEXACT_ACTIVATION_END"
$allowedTools = 'Read,Edit,Bash(git rev-parse *),Bash(git status *),Bash(git diff *),Bash(git grep *),Bash(git add -- *),Bash(git commit *),Bash(git show *),Bash(git log *)'
$args = @(
    '--print','--model','claude-fable-5','--effort','high','--safe-mode','--no-chrome',
    '--no-session-persistence','--strict-mcp-config','--mcp-config','{"mcpServers":{}}',
    '--disable-slash-commands','--permission-mode','dontAsk','--system-prompt',$system,
    '--tools','Read,Edit,Bash','--allowedTools',$allowedTools,
    '--disallowedTools','Write,WebFetch,WebSearch,Task,NotebookEdit',
    '--json-schema',$resultSchema,'--output-format','json','--prompt-suggestions','false'
)

$psi = [Diagnostics.ProcessStartInfo]::new()
$psi.FileName = $ClaudeExe
$psi.WorkingDirectory = $ProviderRoot
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
foreach ($argument in $args) { $psi.ArgumentList.Add($argument) }

$process = [Diagnostics.Process]::new()
$process.StartInfo = $psi
if (-not $process.Start()) { throw 'Claude process failed to start.' }
$stdoutTask = $process.StandardOutput.ReadToEndAsync()
$stderrTask = $process.StandardError.ReadToEndAsync()
$process.StandardInput.Write($prompt)
$process.StandardInput.Close()
$process.WaitForExit()
$stdout = $stdoutTask.GetAwaiter().GetResult()
$stderr = $stderrTask.GetAwaiter().GetResult()
[IO.File]::WriteAllText($OutputPath, $stdout, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($ErrorPath, $stderr, [Text.UTF8Encoding]::new($false))
if ($process.ExitCode -ne 0) { throw "Claude sequence 19 exited $($process.ExitCode); output frozen without retry." }
Write-Output $stdout.TrimEnd()
# [[OpenAI Director | Codex | 2026-08-31 | 03:01 UTC | END]]
