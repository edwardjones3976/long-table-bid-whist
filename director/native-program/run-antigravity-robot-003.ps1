# [[OpenAI Director | Codex | 2026-08-31 | 14:34 UTC | BEGIN]]
# [[OpenAI Director | Codex | 2026-08-31 | 07:30 UTC | BEGIN]]
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$AuthorityControlHead,

    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$AuthorityControlTree,

    [switch]$PreflightOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ProviderRoot = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean'
$AgyExe = 'C:\Users\edwar\AppData\Local\agy\bin\agy.exe'
$ProjectId = '64ba9d6d-900c-4894-8bc8-b0e0a4f52906'
$CanonicalGlobalSettingsPath = 'C:\Users\edwar\.gemini\antigravity-cli\settings.json'
$CanonicalProjectSettingsPath = "C:\Users\edwar\.gemini\config\projects\$ProjectId.json"
$PromptPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26.prompt.md'
$SchemaPath = Join-Path $ProviderRoot 'RESULT_SCHEMA.json'
$OutputPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-primary-cli-output.json'
$ErrorPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-primary-cli.stderr'
$LogPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-primary-cli.log'
$TranscriptPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-primary-transcript.jsonl'
$ReceiptPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26-primary-launch-receipt.json'
$ClaimPath = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean-primary.claim.json'
$CanonicalGeminiRoot = 'C:\Users\edwar\.gemini'
$JobObjectNamePrefix = 'Global\DirectorOrchestrator-LT-NATIVE-ANTIGRAVITY-ROBOT-003-SEQUENCE26-'
$JobObjectName = $null
$RollbackRoot = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean-sequence26-settings-rollback'
$PrivateProfileRoot = Join-Path $RollbackRoot 'private-profile'
$IsolatedGeminiRoot = Join-Path $PrivateProfileRoot '.gemini'
$IsolatedGlobalSettingsPath = Join-Path $IsolatedGeminiRoot 'antigravity-cli\settings.json'
$IsolatedProjectSettingsPath = Join-Path $IsolatedGeminiRoot "config\projects\$ProjectId.json"
$TranscriptRoot = Join-Path $IsolatedGeminiRoot 'antigravity-cli\brain'
$PrivateAppDataPath = Join-Path $PrivateProfileRoot 'AppData\Roaming'
$PrivateLocalAppDataPath = Join-Path $PrivateProfileRoot 'AppData\Local'
$PrivateTempPath = Join-Path $PrivateLocalAppDataPath 'Temp'
$EnvironmentContractPath = Join-Path $RollbackRoot 'environment-contract.json'
$RollbackRecordPath = Join-Path $RollbackRoot 'transaction.json'
$GuardianScriptPath = Join-Path $RollbackRoot 'guardian.ps1'
$GuardianReadyPath = Join-Path $RollbackRoot 'guardian-ready.json'
$GuardianStopPath = Join-Path $RollbackRoot 'guardian-stop.signal'
$GuardianDonePath = Join-Path $RollbackRoot 'guardian-done.json'
$ProviderIdentityPath = Join-Path $RollbackRoot 'provider-identity.json'
$ProviderIdentityStagingPath = Join-Path $RollbackRoot 'provider-identity.staging.json'
$GuardianPollMilliseconds = 25
$SupervisorPollMilliseconds = 25
$PromptDeliveryTimeoutSeconds = 15
$WrapperTimeoutSeconds = 3600
$GuardianDeadlineSeconds = $WrapperTimeoutSeconds + 60
$ExpectedGlobalPermissionLogMarker = 'CLI settings initialized: permissions=&{Allow:[command(git rev-parse) command(git remote get-url) command(git branch --show-current) command(git status) command(git diff) command(git show) command(git log)] Deny:[unsandboxed(*) read_url(*) execute_url(*) mcp(*)] Ask:[]}, toolPermission=request-review'
$ExpectedProjectPermissionLogMarker = 'ApplyProjectPermissionGrants: stored 1 allow, 7 deny grants from project "lt-robot-dealer-antigravity-003-clean"'

if (-not ('LongTable.Sequence26NativeMethods' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace LongTable {
    public static class Sequence26NativeMethods {
        public const uint CREATE_SUSPENDED = 0x00000004;
        public const uint CREATE_NO_WINDOW = 0x08000000;
        public const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
        public const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
        public const uint STARTF_USESTDHANDLES = 0x00000100;
        public const uint HANDLE_FLAG_INHERIT = 0x00000001;
        public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
        public const uint JOB_OBJECT_LIMIT_BREAKAWAY_OK = 0x00000800;
        public const uint JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK = 0x00001000;
        public const uint JOB_OBJECT_ASSIGN_PROCESS = 0x0001;
        public const uint JOB_OBJECT_QUERY = 0x0004;
        public const uint JOB_OBJECT_TERMINATE = 0x0008;
        public const int JobObjectBasicAccountingInformation = 1;
        public const int JobObjectExtendedLimitInformation = 9;
        public const long PROC_THREAD_ATTRIBUTE_HANDLE_LIST = 0x00020002;
        public const long PROC_THREAD_ATTRIBUTE_JOB_LIST = 0x0002000D;

        [StructLayout(LayoutKind.Sequential)]
        public struct SECURITY_ATTRIBUTES {
            public int nLength;
            public IntPtr lpSecurityDescriptor;
            [MarshalAs(UnmanagedType.Bool)] public bool bInheritHandle;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct STARTUPINFO {
            public int cb;
            public IntPtr lpReserved;
            public IntPtr lpDesktop;
            public IntPtr lpTitle;
            public uint dwX;
            public uint dwY;
            public uint dwXSize;
            public uint dwYSize;
            public uint dwXCountChars;
            public uint dwYCountChars;
            public uint dwFillAttribute;
            public uint dwFlags;
            public ushort wShowWindow;
            public ushort cbReserved2;
            public IntPtr lpReserved2;
            public IntPtr hStdInput;
            public IntPtr hStdOutput;
            public IntPtr hStdError;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct STARTUPINFOEX {
            public STARTUPINFO StartupInfo;
            public IntPtr lpAttributeList;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct PROCESS_INFORMATION {
            public IntPtr hProcess;
            public IntPtr hThread;
            public uint dwProcessId;
            public uint dwThreadId;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct NATIVE_FILETIME {
            public uint dwLowDateTime;
            public uint dwHighDateTime;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION {
            public long TotalUserTime;
            public long TotalKernelTime;
            public long ThisPeriodTotalUserTime;
            public long ThisPeriodTotalKernelTime;
            public uint TotalPageFaultCount;
            public uint TotalProcesses;
            public uint ActiveProcesses;
            public uint TotalTerminatedProcesses;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct IO_COUNTERS {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern IntPtr CreateJobObjectW(IntPtr lpJobAttributes, string lpName);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern IntPtr OpenJobObjectW(uint dwDesiredAccess, bool bInheritHandle, string lpName);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetInformationJobObject(IntPtr hJob, int infoClass,
            ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION lpJobObjectInfo, uint cbJobObjectInfoLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool QueryInformationJobObject(IntPtr hJob, int infoClass,
            ref JOBOBJECT_BASIC_ACCOUNTING_INFORMATION lpJobObjectInfo, uint cbJobObjectInfoLength,
            IntPtr lpReturnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool QueryInformationJobObject(IntPtr hJob, int infoClass,
            ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION lpJobObjectInfo, uint cbJobObjectInfoLength,
            IntPtr lpReturnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsProcessInJob(IntPtr hProcess, IntPtr hJob,
            [MarshalAs(UnmanagedType.Bool)] out bool result);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool TerminateProcess(IntPtr hProcess, uint uExitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool CloseHandle(IntPtr hObject);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool CreatePipe(out IntPtr hReadPipe, out IntPtr hWritePipe,
            ref SECURITY_ATTRIBUTES lpPipeAttributes, uint nSize);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetHandleInformation(IntPtr hObject, uint dwMask, uint dwFlags);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool CreateProcessW(string lpApplicationName, StringBuilder lpCommandLine,
            IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, bool bInheritHandles,
            uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory,
            ref STARTUPINFOEX lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool InitializeProcThreadAttributeList(IntPtr lpAttributeList,
            int dwAttributeCount, int dwFlags, ref IntPtr lpSize);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool UpdateProcThreadAttribute(IntPtr lpAttributeList, uint dwFlags,
            IntPtr attribute, IntPtr lpValue, IntPtr cbSize, IntPtr lpPreviousValue,
            IntPtr lpReturnSize);

        [DllImport("kernel32.dll")]
        public static extern void DeleteProcThreadAttributeList(IntPtr lpAttributeList);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern uint ResumeThread(IntPtr hThread);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetProcessTimes(IntPtr hProcess, out NATIVE_FILETIME creation,
            out NATIVE_FILETIME exit, out NATIVE_FILETIME kernel, out NATIVE_FILETIME user);
    }
}
'@
}

$Expected = [ordered]@{
    ControlBranch = 'codex/native-first-deal'
    ProviderHead = '644d1b082347369f5c9665312946c6f5945fa925'
    ProviderTree = '4085ca20ee26e081e0405d4820f3503c8f595b1c'
    ProviderBranch = 'codex/antigravity-robot-cleanroom-003'
    PublicContractSha256 = '56299bb63a352560f2a40fc1115db1eb276e87ada719054959b33498aef80c52'
    ResultSchemaSha256 = 'ebadc5bc45462ffa63ca5e6b28c09d1ccf86086389324a0c88f704bb14208d9c'
    AuthorityDigest = '37608811b0034ba030df68309a18019b826354dec697bfec0beb217b6d4f851f'
    AgyExeSha256 = '059b96c1069206158d340ee2a8912894eca5002195e62b8cd281c26c01cd794e'
    GlobalSettingsSha256 = '5a9aef19fff41049666ff285eeecfd37ee35a9dc016b7c9be19b79dfefade2e3'
    TemporaryGlobalSettingsSha256 = 'e717116d6ee4c11919ddbe29e6b6df4c577158ddc9e74de226dcae122b013f56'
    ProjectSettingsSha256 = '5ce5b3178d47ff3516281a1298dcb7ca589d823c08f3b2545e5f187a5e706f25'
    TemporaryProjectSettingsSha256 = '33f1b2affad9480e02366568f5521e47861819ad1c6ca27c13c5bf7a16c3ec2c'
    MainPacketSha256 = 'd4903468bcc4be006933c5ce6895ac76e6d7079ca622257d4c1a497ecd1616d2'
    PermissionDeltaSha256 = '52150e86c67faae07f3b13a7d02894206520b56617c43b4c303a96e19b4f1688'
    ResultBindingSha256 = 'aead3b2806d593f5505597d60fd5116ce4f461eba55336788093ad51aaf5585f'
    PromptSha256 = '39eb912cf4481d8a99d673acedff0f10d146d9300bcd0edd4014a3ebcde019d0'
    ActivationSha256 = '58724bf93b12ee27609d46c2c204596f0ece29881d6d9a6a3a2ed6e19a262720'
}

function Invoke-GitAt([string]$Root, [string[]]$GitArgs) {
    $output = & git -C $Root @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git -C $Root $($GitArgs -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    return ($output -join "`n").Trim()
}

function Assert-Exact([string]$Name, [string]$Actual, [string]$ExpectedValue) {
    if ($Actual -cne $ExpectedValue) {
        throw "$Name mismatch. Expected '$ExpectedValue'; got '$Actual'."
    }
}

function Assert-ExactPropertySet([object]$Value, [string[]]$ExpectedNames, [string]$Name) {
    $actual = @($Value.PSObject.Properties.Name | Sort-Object)
    $expected = @($ExpectedNames | Sort-Object)
    Assert-Exact "$Name property count" ([string]$actual.Count) ([string]$expected.Count)
    Assert-Exact "$Name properties" ($actual -join "`n") ($expected -join "`n")
}

function Get-LowerSha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Write-NewBytes([string]$Path, [byte[]]$Bytes) {
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
        $stream.Write($Bytes, 0, $Bytes.Length)
        $stream.Flush($true)
    }
    finally {
        $stream.Dispose()
    }
}

function Write-NewUtf8([string]$Path, [string]$Text) {
    Write-NewBytes -Path $Path -Bytes ([Text.UTF8Encoding]::new($false).GetBytes($Text))
}

function Get-Utf8Sha256([string]$Text) {
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($Text)
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Assert-PathWithin([string]$Candidate, [string]$RequiredRoot, [string]$Name) {
    $root = [IO.Path]::GetFullPath($RequiredRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $path = [IO.Path]::GetFullPath($Candidate)
    $prefix = $root + [IO.Path]::DirectorySeparatorChar
    if (-not $path.Equals($root, [StringComparison]::OrdinalIgnoreCase) -and
        -not $path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "$Name escapes its required private root. Root='$root'; path='$path'."
    }
    return $path
}

function Assert-NoReparsePath([string]$Path, [string]$Name, [switch]$RequireLeaf) {
    $full = [IO.Path]::GetFullPath($Path)
    if ($RequireLeaf -and -not (Test-Path -LiteralPath $full)) {
        throw "$Name is unavailable: $full"
    }
    $cursor = $full
    $existing = [Collections.Generic.List[string]]::new()
    while (-not [string]::IsNullOrEmpty($cursor) -and (Test-Path -LiteralPath $cursor)) {
        $existing.Add($cursor)
        $parent = [IO.Directory]::GetParent($cursor)
        if ($null -eq $parent) { break }
        $cursor = $parent.FullName
    }
    foreach ($candidate in $existing) {
        $item = Get-Item -LiteralPath $candidate -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or
            ($item.PSObject.Properties.Name -contains 'LinkType' -and $null -ne $item.LinkType)) {
            throw "$Name traverses a reparse point: $candidate"
        }
    }
    return $full
}

function New-PrivateDirectory([string]$Path, [string]$RequiredRoot, [string]$Name) {
    $full = Assert-PathWithin -Candidate $Path -RequiredRoot $RequiredRoot -Name $Name
    if (Test-Path -LiteralPath $full) {
        throw "$Name must be absent before creation: $full"
    }
    [IO.Directory]::CreateDirectory($full) | Out-Null
    Assert-NoReparsePath -Path $full -Name $Name -RequireLeaf | Out-Null
    return $full
}

function New-PrivateEnvironmentContext {
    $profile = Assert-PathWithin -Candidate $PrivateProfileRoot -RequiredRoot $RollbackRoot -Name 'private profile'
    $drive = [IO.Path]::GetPathRoot($profile).TrimEnd([IO.Path]::DirectorySeparatorChar)
    if ($drive -notmatch '^[A-Za-z]:$') {
        throw "Private profile must resolve to an absolute local drive path: $profile"
    }
    $homePath = $profile.Substring($drive.Length)
    if (-not $homePath.StartsWith('\', [StringComparison]::Ordinal)) {
        throw "Private HOMEPATH is not rooted: $homePath"
    }
    $overrides = [ordered]@{
        USERPROFILE = $profile
        HOME = $profile
        HOMEDRIVE = $drive
        HOMEPATH = $homePath
        APPDATA = (Assert-PathWithin -Candidate $PrivateAppDataPath -RequiredRoot $profile -Name 'private APPDATA')
        LOCALAPPDATA = (Assert-PathWithin -Candidate $PrivateLocalAppDataPath -RequiredRoot $profile -Name 'private LOCALAPPDATA')
        TEMP = (Assert-PathWithin -Candidate $PrivateTempPath -RequiredRoot $profile -Name 'private TEMP')
        TMP = (Assert-PathWithin -Candidate $PrivateTempPath -RequiredRoot $profile -Name 'private TMP')
        AGY_CLI_DISABLE_AUTO_UPDATE = '1'
    }
    $environment = [Collections.Generic.SortedDictionary[string,string]]::new([StringComparer]::OrdinalIgnoreCase)
    $parentEnvironment = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::Process)
    $safeInheritedNames = @(
        'ALLUSERSPROFILE', 'CommonProgramFiles', 'CommonProgramFiles(x86)',
        'CommonProgramW6432', 'ComSpec', 'DriverData', 'LANG', 'LC_ALL',
        'NUMBER_OF_PROCESSORS', 'OS', 'Path', 'PATHEXT',
        'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'PROCESSOR_LEVEL',
        'PROCESSOR_REVISION', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)',
        'ProgramW6432', 'PUBLIC', 'SystemDrive', 'SystemRoot',
        'TZ', 'windir'
    )
    $preservedNames = [Collections.Generic.List[string]]::new()
    foreach ($key in $safeInheritedNames) {
        if ($parentEnvironment.Contains($key)) {
            $value = [string]$parentEnvironment[$key]
            if ($key.Contains([char]0) -or $value.Contains([char]0)) {
                throw "Safe inherited process environment contains an invalid entry: '$key'."
            }
            $environment[$key] = $value
            $preservedNames.Add($key)
        }
    }
    foreach ($entry in $overrides.GetEnumerator()) {
        $environment[[string]$entry.Key] = [string]$entry.Value
    }
    foreach ($required in $overrides.Keys) {
        Assert-Exact "private child environment $required" ([string]$environment[$required]) ([string]$overrides[$required])
    }
    $environmentText = (($environment.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join [char]0) + [char]0 + [char]0
    $environmentBytes = [Text.Encoding]::Unicode.GetBytes($environmentText)
    $environmentBlockSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($environmentBytes)).ToLowerInvariant()
    $keySetText = (($environment.Keys | ForEach-Object { $_.ToUpperInvariant() }) -join "`n") + "`n"
    $keySetSha256 = Get-Utf8Sha256 $keySetText
    $contractText = ([ordered]@{
        schema_version = '1.0'
        assignment_id = 'LT-NATIVE-ANTIGRAVITY-ROBOT-003'
        private_profile_root = $profile
        inheritance_policy = 'EXACT_SAFE_OS_RUNTIME_ALLOWLIST'
        inherited_names = @($preservedNames | Sort-Object)
        environment_entry_count = $environment.Count
        environment_key_set_sha256 = $keySetSha256
        environment_block_sha256_utf16le = $environmentBlockSha256
        overrides = $overrides
    } | ConvertTo-Json -Compress) + "`n"
    $environmentPointer = [Runtime.InteropServices.Marshal]::AllocHGlobal($environmentBytes.Length)
    [Runtime.InteropServices.Marshal]::Copy($environmentBytes, 0, $environmentPointer, $environmentBytes.Length)
    return [pscustomobject][ordered]@{
        environment_block = $environmentPointer
        inherited_entry_count = $preservedNames.Count
        inherited_names = @($preservedNames | Sort-Object)
        total_entry_count = $environment.Count
        key_set_sha256 = $keySetSha256
        block_sha256_utf16le = $environmentBlockSha256
        contract_text = $contractText
        contract_sha256 = Get-Utf8Sha256 $contractText
        overrides = [pscustomobject]$overrides
    }
}

function Close-PrivateEnvironmentContext([object]$Context) {
    if ($null -ne $Context -and [IntPtr]$Context.environment_block -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::FreeHGlobal([IntPtr]$Context.environment_block)
        $Context.environment_block = [IntPtr]::Zero
    }
}

function Test-ExactProcessIdentity([int]$ProcessId, [long]$StartTimeUtcTicks) {
    try {
        $candidate = Get-Process -Id $ProcessId -ErrorAction Stop
        return $candidate.StartTime.ToUniversalTime().Ticks -eq $StartTimeUtcTicks
    }
    catch {
        return $false
    }
}

function Stop-ProcessTreeBounded(
    [Diagnostics.Process]$Process,
    [string]$Reason,
    [scriptblock]$Observation = $null
) {
    $observationError = $null
    if (-not $Process.HasExited) {
        try {
            $Process.Kill($true)
        }
        catch {
            if (-not $Process.HasExited) {
                throw
            }
        }
    }
    $stopDeadline = [datetime]::UtcNow.AddSeconds(10)
    while (-not $Process.HasExited -and [datetime]::UtcNow -lt $stopDeadline) {
        if ($null -ne $Observation) {
            try {
                $null = & $Observation
            }
            catch {
                if ($null -eq $observationError) {
                    $observationError = $_
                }
            }
        }
        [void]$Process.WaitForExit($SupervisorPollMilliseconds)
    }
    if (-not $Process.HasExited) {
        throw "$Reason Process tree did not terminate within 10 seconds after Kill(true)."
    }
    if ($null -ne $observationError) {
        throw "$Reason Process tree terminated, but temporary-permission observation failed: $($observationError.Exception.Message)"
    }
}

function Get-NativeError([string]$Operation) {
    $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    return "$Operation failed with Win32 error $code ($([ComponentModel.Win32Exception]::new($code).Message))."
}

function Close-NativeHandle([IntPtr]$Handle) {
    if ($Handle -ne [IntPtr]::Zero -and $Handle -ne [IntPtr](-1)) {
        [void][LongTable.Sequence26NativeMethods]::CloseHandle($Handle)
    }
}

function Get-JobActiveProcessCount([IntPtr]$JobHandle) {
    if ($JobHandle -eq [IntPtr]::Zero) {
        throw 'A valid job-object handle is required.'
    }
    $accounting = [LongTable.Sequence26NativeMethods+JOBOBJECT_BASIC_ACCOUNTING_INFORMATION]::new()
    $size = [uint32][Runtime.InteropServices.Marshal]::SizeOf($accounting)
    if (-not [LongTable.Sequence26NativeMethods]::QueryInformationJobObject(
        $JobHandle,
        [LongTable.Sequence26NativeMethods]::JobObjectBasicAccountingInformation,
        [ref]$accounting,
        $size,
        [IntPtr]::Zero
    )) {
        throw (Get-NativeError 'QueryInformationJobObject(accounting)')
    }
    return [int]$accounting.ActiveProcesses
}

function Test-JobKillOnClose([IntPtr]$JobHandle) {
    $limits = [LongTable.Sequence26NativeMethods+JOBOBJECT_EXTENDED_LIMIT_INFORMATION]::new()
    $size = [uint32][Runtime.InteropServices.Marshal]::SizeOf($limits)
    if (-not [LongTable.Sequence26NativeMethods]::QueryInformationJobObject(
        $JobHandle,
        [LongTable.Sequence26NativeMethods]::JobObjectExtendedLimitInformation,
        [ref]$limits,
        $size,
        [IntPtr]::Zero
    )) {
        throw (Get-NativeError 'QueryInformationJobObject(limits)')
    }
    $flags = $limits.BasicLimitInformation.LimitFlags
    $breakawayMask = [LongTable.Sequence26NativeMethods]::JOB_OBJECT_LIMIT_BREAKAWAY_OK -bor
        [LongTable.Sequence26NativeMethods]::JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK
    return (($flags -band [LongTable.Sequence26NativeMethods]::JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE) -ne 0 -and
        ($flags -band $breakawayMask) -eq 0)
}

function New-SecretJobObjectName {
    $random = [byte[]]::new(16)
    [Security.Cryptography.RandomNumberGenerator]::Fill($random)
    return $JobObjectNamePrefix + [Convert]::ToHexString($random).ToLowerInvariant()
}

function Assert-SecretJobObjectName([string]$Name) {
    $pattern = '^' + [regex]::Escape($JobObjectNamePrefix) + '[0-9a-f]{32}$'
    if ($Name -cnotmatch $pattern) {
        throw 'Provider job name is not the exact random transaction-scoped form.'
    }
}

function New-KillOnCloseJob {
    Assert-SecretJobObjectName $JobObjectName
    $handle = [LongTable.Sequence26NativeMethods]::CreateJobObjectW([IntPtr]::Zero, $JobObjectName)
    $createError = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    if ($handle -eq [IntPtr]::Zero) {
        throw (Get-NativeError "CreateJobObjectW('$JobObjectName')")
    }
    if ($createError -eq 183) {
        Close-NativeHandle $handle
        throw "Named provider job '$JobObjectName' already exists; stale recovery did not establish a fresh kernel boundary."
    }
    try {
        $limits = [LongTable.Sequence26NativeMethods+JOBOBJECT_EXTENDED_LIMIT_INFORMATION]::new()
        $basicLimits = $limits.BasicLimitInformation
        $basicLimits.LimitFlags = [LongTable.Sequence26NativeMethods]::JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        $limits.BasicLimitInformation = $basicLimits
        $size = [uint32][Runtime.InteropServices.Marshal]::SizeOf($limits)
        if (-not [LongTable.Sequence26NativeMethods]::SetInformationJobObject(
            $handle,
            [LongTable.Sequence26NativeMethods]::JobObjectExtendedLimitInformation,
            [ref]$limits,
            $size
        )) {
            throw (Get-NativeError 'SetInformationJobObject(KILL_ON_JOB_CLOSE)')
        }
        if (-not (Test-JobKillOnClose $handle)) {
            throw 'The provider job did not retain JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE.'
        }
        Assert-Exact 'new provider job active-process count' ([string](Get-JobActiveProcessCount $handle)) '0'
        return $handle
    }
    catch {
        Close-NativeHandle $handle
        throw
    }
}

function Open-ExistingProviderJob {
    $access = [LongTable.Sequence26NativeMethods]::JOB_OBJECT_ASSIGN_PROCESS -bor
        [LongTable.Sequence26NativeMethods]::JOB_OBJECT_QUERY -bor
        [LongTable.Sequence26NativeMethods]::JOB_OBJECT_TERMINATE
    $handle = [LongTable.Sequence26NativeMethods]::OpenJobObjectW($access, $false, $JobObjectName)
    if ($handle -eq [IntPtr]::Zero) {
        $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        if ($code -eq 2) {
            return [IntPtr]::Zero
        }
        throw (Get-NativeError "OpenJobObjectW('$JobObjectName')")
    }
    if (-not (Test-JobKillOnClose $handle)) {
        Close-NativeHandle $handle
        throw "Existing provider job '$JobObjectName' lacks KILL_ON_JOB_CLOSE."
    }
    return $handle
}

function Stop-JobObjectBounded(
    [IntPtr]$JobHandle,
    [string]$Reason,
    [scriptblock]$Observation = $null
) {
    $before = Get-JobActiveProcessCount $JobHandle
    $terminatedAt = $null
    if ($before -gt 0) {
        if (-not [LongTable.Sequence26NativeMethods]::TerminateJobObject($JobHandle, [uint32]::MaxValue)) {
            throw (Get-NativeError "$Reason TerminateJobObject")
        }
        $terminatedAt = ([datetimeoffset]::UtcNow).ToString('o')
    }
    $observationError = $null
    $deadline = [datetimeoffset]::UtcNow.AddSeconds(10)
    $after = Get-JobActiveProcessCount $JobHandle
    while ($after -ne 0 -and [datetimeoffset]::UtcNow -lt $deadline) {
        if ($null -ne $Observation) {
            try {
                $null = & $Observation
            }
            catch {
                if ($null -eq $observationError) {
                    $observationError = $_
                }
            }
        }
        Start-Sleep -Milliseconds $SupervisorPollMilliseconds
        $after = Get-JobActiveProcessCount $JobHandle
    }
    if ($after -ne 0) {
        throw "$Reason Job retained $after process(es) after its 10-second termination deadline."
    }
    if ($null -ne $observationError) {
        throw "$Reason Job is empty, but temporary-permission observation failed: $($observationError.Exception.Message)"
    }
    return [pscustomobject][ordered]@{
        active_processes_before = $before
        active_processes_after = $after
        disposition = if ($before -eq 0) { 'JOB_ALREADY_EMPTY' } else { 'JOB_TERMINATED_EMPTY' }
        terminated_at = $terminatedAt
        empty_verified_at = ([datetimeoffset]::UtcNow).ToString('o')
    }
}

function ConvertTo-WindowsCommandLineArgument([string]$Value) {
    if ($null -eq $Value) {
        return '""'
    }
    if ($Value.Length -gt 0 -and $Value -notmatch '[\s"]') {
        return $Value
    }
    $builder = [Text.StringBuilder]::new()
    [void]$builder.Append('"')
    $slashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') {
            $slashes++
            continue
        }
        if ($character -eq '"') {
            [void]$builder.Append(('\' * (($slashes * 2) + 1)))
            [void]$builder.Append('"')
        }
        else {
            if ($slashes -gt 0) {
                [void]$builder.Append(('\' * $slashes))
            }
            [void]$builder.Append($character)
        }
        $slashes = 0
    }
    if ($slashes -gt 0) {
        [void]$builder.Append(('\' * ($slashes * 2)))
    }
    [void]$builder.Append('"')
    return $builder.ToString()
}

function New-NativePipePair([bool]$ParentReads) {
    $attributes = [LongTable.Sequence26NativeMethods+SECURITY_ATTRIBUTES]::new()
    $attributes.nLength = [Runtime.InteropServices.Marshal]::SizeOf($attributes)
    $attributes.bInheritHandle = $true
    $readHandle = [IntPtr]::Zero
    $writeHandle = [IntPtr]::Zero
    if (-not [LongTable.Sequence26NativeMethods]::CreatePipe([ref]$readHandle, [ref]$writeHandle, [ref]$attributes, 0)) {
        throw (Get-NativeError 'CreatePipe')
    }
    $parentHandle = if ($ParentReads) { $readHandle } else { $writeHandle }
    if (-not [LongTable.Sequence26NativeMethods]::SetHandleInformation(
        $parentHandle,
        [LongTable.Sequence26NativeMethods]::HANDLE_FLAG_INHERIT,
        0
    )) {
        $error = Get-NativeError 'SetHandleInformation(non-inheritable parent pipe)'
        Close-NativeHandle $readHandle
        Close-NativeHandle $writeHandle
        throw $error
    }
    return [pscustomobject][ordered]@{
        read_handle = $readHandle
        write_handle = $writeHandle
        parent_handle = $parentHandle
        child_handle = if ($ParentReads) { $writeHandle } else { $readHandle }
    }
}

function New-NativeLaunchContext(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory,
    [IntPtr]$JobHandle,
    [object]$EnvironmentContext
) {
    $context = [pscustomobject][ordered]@{
        file_path = $FilePath
        command_line = $null
        working_directory = $WorkingDirectory
        stdin_child_handle = [IntPtr]::Zero
        stdin_parent_handle = [IntPtr]::Zero
        stdout_child_handle = [IntPtr]::Zero
        stdout_parent_handle = [IntPtr]::Zero
        stderr_child_handle = [IntPtr]::Zero
        stderr_parent_handle = [IntPtr]::Zero
        primary_thread_handle = [IntPtr]::Zero
        attribute_list = [IntPtr]::Zero
        attribute_list_initialized = $false
        job_attribute_value = [IntPtr]::Zero
        handle_list_attribute_value = [IntPtr]::Zero
        environment_block = [IntPtr]::Zero
        stdin_writer = $null
        stdout_reader = $null
        stderr_reader = $null
    }
    try {
        if ($null -eq $EnvironmentContext -or [IntPtr]$EnvironmentContext.environment_block -eq [IntPtr]::Zero) {
            throw 'A prepared process-private Unicode environment block is required.'
        }
        $context.environment_block = [IntPtr]$EnvironmentContext.environment_block
        $EnvironmentContext.environment_block = [IntPtr]::Zero
        $stdin = New-NativePipePair -ParentReads $false
        $stdout = New-NativePipePair -ParentReads $true
        $stderr = New-NativePipePair -ParentReads $true
        $context.stdin_child_handle = $stdin.child_handle
        $context.stdin_parent_handle = $stdin.parent_handle
        $context.stdout_child_handle = $stdout.child_handle
        $context.stdout_parent_handle = $stdout.parent_handle
        $context.stderr_child_handle = $stderr.child_handle
        $context.stderr_parent_handle = $stderr.parent_handle
        $allArguments = @($FilePath) + @($Arguments)
        $context.command_line = ($allArguments | ForEach-Object { ConvertTo-WindowsCommandLineArgument $_ }) -join ' '

        $attributeBytes = [IntPtr]::Zero
        [void][LongTable.Sequence26NativeMethods]::InitializeProcThreadAttributeList(
            [IntPtr]::Zero,
            2,
            0,
            [ref]$attributeBytes
        )
        if ($attributeBytes -eq [IntPtr]::Zero) {
            throw (Get-NativeError 'InitializeProcThreadAttributeList(size)')
        }
        $context.attribute_list = [Runtime.InteropServices.Marshal]::AllocHGlobal($attributeBytes)
        if (-not [LongTable.Sequence26NativeMethods]::InitializeProcThreadAttributeList(
            $context.attribute_list,
            2,
            0,
            [ref]$attributeBytes
        )) {
            throw (Get-NativeError 'InitializeProcThreadAttributeList')
        }
        $context.attribute_list_initialized = $true
        $context.job_attribute_value = [Runtime.InteropServices.Marshal]::AllocHGlobal([IntPtr]::Size)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.job_attribute_value, $JobHandle)
        if (-not [LongTable.Sequence26NativeMethods]::UpdateProcThreadAttribute(
            $context.attribute_list,
            0,
            [IntPtr][LongTable.Sequence26NativeMethods]::PROC_THREAD_ATTRIBUTE_JOB_LIST,
            $context.job_attribute_value,
            [IntPtr][IntPtr]::Size,
            [IntPtr]::Zero,
            [IntPtr]::Zero
        )) {
            throw (Get-NativeError 'UpdateProcThreadAttribute(JOB_LIST)')
        }
        $context.handle_list_attribute_value = [Runtime.InteropServices.Marshal]::AllocHGlobal([IntPtr]::Size * 3)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.handle_list_attribute_value, 0 * [IntPtr]::Size, $context.stdin_child_handle)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.handle_list_attribute_value, 1 * [IntPtr]::Size, $context.stdout_child_handle)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.handle_list_attribute_value, 2 * [IntPtr]::Size, $context.stderr_child_handle)
        if (-not [LongTable.Sequence26NativeMethods]::UpdateProcThreadAttribute(
            $context.attribute_list,
            0,
            [IntPtr][LongTable.Sequence26NativeMethods]::PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
            $context.handle_list_attribute_value,
            [IntPtr]([IntPtr]::Size * 3),
            [IntPtr]::Zero,
            [IntPtr]::Zero
        )) {
            throw (Get-NativeError 'UpdateProcThreadAttribute(HANDLE_LIST)')
        }
        return $context
    }
    catch {
        Close-NativeLaunchContext $context
        throw
    }
}

function Close-NativeLaunchContext([object]$Context) {
    if ($null -eq $Context) {
        return
    }
    foreach ($name in @('stdin_writer', 'stdout_reader', 'stderr_reader')) {
        $value = $Context.$name
        if ($null -ne $value) {
            try { $value.Dispose() } catch { }
            $Context.$name = $null
        }
    }
    foreach ($name in @(
        'stdin_child_handle', 'stdin_parent_handle',
        'stdout_child_handle', 'stdout_parent_handle',
        'stderr_child_handle', 'stderr_parent_handle',
        'primary_thread_handle'
    )) {
        $handle = [IntPtr]$Context.$name
        if ($handle -ne [IntPtr]::Zero) {
            Close-NativeHandle $handle
            $Context.$name = [IntPtr]::Zero
        }
    }
    if ([bool]$Context.attribute_list_initialized -and $Context.attribute_list -ne [IntPtr]::Zero) {
        [LongTable.Sequence26NativeMethods]::DeleteProcThreadAttributeList($Context.attribute_list)
        $Context.attribute_list_initialized = $false
    }
    foreach ($name in @('attribute_list', 'job_attribute_value', 'handle_list_attribute_value', 'environment_block')) {
        $pointer = [IntPtr]$Context.$name
        if ($pointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::FreeHGlobal($pointer)
            $Context.$name = [IntPtr]::Zero
        }
    }
}

function Start-SuspendedJobBoundProcess([object]$Context, [IntPtr]$JobHandle) {
    $startupInfo = [LongTable.Sequence26NativeMethods+STARTUPINFO]::new()
    $startupInfo.dwFlags = [LongTable.Sequence26NativeMethods]::STARTF_USESTDHANDLES
    $startupInfo.hStdInput = $Context.stdin_child_handle
    $startupInfo.hStdOutput = $Context.stdout_child_handle
    $startupInfo.hStdError = $Context.stderr_child_handle
    $startup = [LongTable.Sequence26NativeMethods+STARTUPINFOEX]::new()
    $startupInfo.cb = [Runtime.InteropServices.Marshal]::SizeOf($startup)
    $startup.StartupInfo = $startupInfo
    $startup.lpAttributeList = $Context.attribute_list
    $processInfo = [LongTable.Sequence26NativeMethods+PROCESS_INFORMATION]::new()
    $commandLine = [Text.StringBuilder]::new([string]$Context.command_line)
    $flags = [LongTable.Sequence26NativeMethods]::CREATE_SUSPENDED -bor
        [LongTable.Sequence26NativeMethods]::CREATE_NO_WINDOW -bor
        [LongTable.Sequence26NativeMethods]::EXTENDED_STARTUPINFO_PRESENT -bor
        [LongTable.Sequence26NativeMethods]::CREATE_UNICODE_ENVIRONMENT
    if (-not [bool]$Context.attribute_list_initialized -or $Context.attribute_list -eq [IntPtr]::Zero) {
        throw 'The prebuilt process attribute list is unavailable before CreateProcessW.'
    }
    if ($Context.environment_block -eq [IntPtr]::Zero) {
        throw 'The process-private Unicode environment block is unavailable before CreateProcessW.'
    }
    $created = [LongTable.Sequence26NativeMethods]::CreateProcessW(
        [string]$Context.file_path,
        $commandLine,
        [IntPtr]::Zero,
        [IntPtr]::Zero,
        $true,
        $flags,
        $Context.environment_block,
        [string]$Context.working_directory,
        [ref]$startup,
        [ref]$processInfo
    )
    foreach ($name in @('stdin_child_handle', 'stdout_child_handle', 'stderr_child_handle')) {
        Close-NativeHandle ([IntPtr]$Context.$name)
        $Context.$name = [IntPtr]::Zero
    }
    if (-not $created) {
        throw (Get-NativeError 'CreateProcessW(CREATE_SUSPENDED)')
    }
    $assigned = $created
    try {
        $isInJob = $false
        if (-not [LongTable.Sequence26NativeMethods]::IsProcessInJob($processInfo.hProcess, $JobHandle, [ref]$isInJob)) {
            throw (Get-NativeError 'IsProcessInJob before resume')
        }
        if (-not $isInJob) {
            throw 'The suspended provider process is not bound to the kill-on-close job.'
        }
        $creation = [LongTable.Sequence26NativeMethods+NATIVE_FILETIME]::new()
        $exit = [LongTable.Sequence26NativeMethods+NATIVE_FILETIME]::new()
        $kernel = [LongTable.Sequence26NativeMethods+NATIVE_FILETIME]::new()
        $user = [LongTable.Sequence26NativeMethods+NATIVE_FILETIME]::new()
        if (-not [LongTable.Sequence26NativeMethods]::GetProcessTimes(
            $processInfo.hProcess,
            [ref]$creation,
            [ref]$exit,
            [ref]$kernel,
            [ref]$user
        )) {
            throw (Get-NativeError 'GetProcessTimes(suspended provider)')
        }
        $fileTime = ([long]$creation.dwHighDateTime -shl 32) -bor [uint32]$creation.dwLowDateTime
        $createdAt = [datetime]::FromFileTimeUtc($fileTime)
        $process = [Diagnostics.Process]::GetProcessById([int]$processInfo.dwProcessId)
        $null = $process.Handle

        $utf8NoBom = [Text.UTF8Encoding]::new($false)
        $stdinSafe = [Microsoft.Win32.SafeHandles.SafeFileHandle]::new($Context.stdin_parent_handle, $true)
        $Context.stdin_parent_handle = [IntPtr]::Zero
        $stdinStream = [IO.FileStream]::new($stdinSafe, [IO.FileAccess]::Write, 4096, $false)
        $Context.stdin_writer = [IO.StreamWriter]::new($stdinStream, $utf8NoBom, 4096, $false)

        $stdoutSafe = [Microsoft.Win32.SafeHandles.SafeFileHandle]::new($Context.stdout_parent_handle, $true)
        $Context.stdout_parent_handle = [IntPtr]::Zero
        $stdoutStream = [IO.FileStream]::new($stdoutSafe, [IO.FileAccess]::Read, 4096, $false)
        $Context.stdout_reader = [IO.StreamReader]::new($stdoutStream, $utf8NoBom, $true, 4096, $false)

        $stderrSafe = [Microsoft.Win32.SafeHandles.SafeFileHandle]::new($Context.stderr_parent_handle, $true)
        $Context.stderr_parent_handle = [IntPtr]::Zero
        $stderrStream = [IO.FileStream]::new($stderrSafe, [IO.FileAccess]::Read, 4096, $false)
        $Context.stderr_reader = [IO.StreamReader]::new($stderrStream, $utf8NoBom, $true, 4096, $false)

        $Context.primary_thread_handle = $processInfo.hThread
        $processInfo.hThread = [IntPtr]::Zero
        return [pscustomobject][ordered]@{
            process = $process
            process_id = [int]$processInfo.dwProcessId
            start_time_utc_ticks = $createdAt.Ticks
            started_at = ([datetimeoffset]$createdAt).ToString('o')
            created_with_job_list_attribute = $true
            job_bound_before_resume = $true
            job_assignment_confirmed_at = ([datetimeoffset]::UtcNow).ToString('o')
        }
    }
    catch {
        if ($assigned) {
            try { $null = Stop-JobObjectBounded -JobHandle $JobHandle -Reason 'Suspended-launch failure safety stop.' } catch { }
        }
        else {
            [void][LongTable.Sequence26NativeMethods]::TerminateProcess($processInfo.hProcess, [uint32]::MaxValue)
        }
        throw
    }
    finally {
        Close-NativeHandle $processInfo.hProcess
        Close-NativeHandle $processInfo.hThread
    }
}

function Assert-IsolationGuardianLive([Diagnostics.Process]$GuardianProcess, [string]$Boundary) {
    if ($null -eq $GuardianProcess) {
        throw "Process-isolation guardian is unavailable at boundary '$Boundary'."
    }
    $GuardianProcess.Refresh()
    if ($GuardianProcess.HasExited) {
        throw "Process-isolation guardian exited $($GuardianProcess.ExitCode) before verified job completion at boundary '$Boundary'."
    }
    if (Test-Path -LiteralPath $GuardianDonePath -PathType Leaf) {
        throw "Process-isolation guardian produced premature completion evidence at boundary '$Boundary'."
    }
}

function Assert-ControlState {
    Assert-Exact 'control branch' (Invoke-GitAt $ControlRoot @('branch', '--show-current')) $Expected.ControlBranch
    Assert-Exact 'control status' (Invoke-GitAt $ControlRoot @('status', '--porcelain=v1')) ''
    Assert-Exact 'control HEAD' (Invoke-GitAt $ControlRoot @('rev-parse', 'HEAD')) $AuthorityControlHead
    Assert-Exact 'control tree' (Invoke-GitAt $ControlRoot @('rev-parse', 'HEAD^{tree}')) $AuthorityControlTree
    $boundFiles = [ordered]@{
        'director\native-program\packets\LT-NATIVE-ANTIGRAVITY-ROBOT-003.json' = $Expected.MainPacketSha256
        'director\native-program\packets\LT-NATIVE-ANTIGRAVITY-ROBOT-003-PERMISSION-DELTA.json' = $Expected.PermissionDeltaSha256
        'director\native-program\packets\LT-NATIVE-ANTIGRAVITY-ROBOT-003-RESULT-BINDING.json' = $Expected.ResultBindingSha256
        'artifacts\native-program\providers\LT-NATIVE-ANTIGRAVITY-ROBOT-003.sequence-26.prompt.md' = $Expected.PromptSha256
        'artifacts\native-program\coordination\2026-08-31-sequence-26-activation.md' = $Expected.ActivationSha256
    }
    foreach ($entry in $boundFiles.GetEnumerator()) {
        $path = Join-Path $ControlRoot $entry.Key
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Bound control file is unavailable: $path"
        }
        Assert-Exact "control SHA-256 $($entry.Key)" (Get-LowerSha256 $path) $entry.Value
    }
}

function Assert-ProviderState {
    if (-not (Test-Path -LiteralPath $ProviderRoot -PathType Container)) {
        throw 'Antigravity provider sandbox is unavailable.'
    }
    Assert-Exact 'provider HEAD' (Invoke-GitAt $ProviderRoot @('rev-parse', 'HEAD')) $Expected.ProviderHead
    Assert-Exact 'provider tree' (Invoke-GitAt $ProviderRoot @('rev-parse', 'HEAD^{tree}')) $Expected.ProviderTree
    Assert-Exact 'provider branch' (Invoke-GitAt $ProviderRoot @('branch', '--show-current')) $Expected.ProviderBranch
    Assert-Exact 'provider working status' (Invoke-GitAt $ProviderRoot @('status', '--porcelain=v1')) ''
    Assert-Exact 'provider tracked files' (Invoke-GitAt $ProviderRoot @('ls-files')) "PUBLIC_CONTRACT.json`nRESULT_SCHEMA.json"
    Assert-Exact 'provider refs' (Invoke-GitAt $ProviderRoot @('for-each-ref', '--format=%(refname)')) "refs/heads/$($Expected.ProviderBranch)"
    Assert-Exact 'provider remotes' (Invoke-GitAt $ProviderRoot @('remote')) ''
    Assert-Exact 'provider replace refs' (Invoke-GitAt $ProviderRoot @('replace', '-l')) ''
    Assert-Exact 'provider core.autocrlf' (Invoke-GitAt $ProviderRoot @('config', '--get', 'core.autocrlf')) 'false'
    Assert-Exact 'public contract SHA-256' (Get-LowerSha256 (Join-Path $ProviderRoot 'PUBLIC_CONTRACT.json')) $Expected.PublicContractSha256
    Assert-Exact 'result schema SHA-256' (Get-LowerSha256 $SchemaPath) $Expected.ResultSchemaSha256
    $combined = [IO.File]::ReadAllBytes((Join-Path $ProviderRoot 'PUBLIC_CONTRACT.json')) + [IO.File]::ReadAllBytes($SchemaPath)
    $digest = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($combined)).ToLowerInvariant()
    Assert-Exact 'two-file authority digest' $digest $Expected.AuthorityDigest
}

function Assert-CanonicalSettingsState {
    foreach ($path in @($CanonicalGlobalSettingsPath, $CanonicalProjectSettingsPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Required canonical Antigravity settings file is unavailable: $path"
        }
        Assert-NoReparsePath -Path $path -Name 'canonical settings path' -RequireLeaf | Out-Null
    }
    Assert-Exact 'canonical global settings SHA-256' (Get-LowerSha256 $CanonicalGlobalSettingsPath) $Expected.GlobalSettingsSha256
    Assert-Exact 'canonical project settings SHA-256' (Get-LowerSha256 $CanonicalProjectSettingsPath) $Expected.ProjectSettingsSha256
    $project = Get-Content -LiteralPath $CanonicalProjectSettingsPath -Raw | ConvertFrom-Json -DateKind String
    Assert-Exact 'canonical saved project id' ([string]$project.id) $ProjectId
    $resources = @($project.projectResources.resources)
    Assert-Exact 'canonical saved project resource count' ([string]$resources.Count) '1'
    Assert-Exact 'canonical saved project root' ([string]$resources[0].folderUri) 'file://C:/Users/edwar/.codex/provider-sandboxes/lt-robot-dealer-antigravity-003-clean'
}

function Assert-PrivateTree {
    Assert-PathWithin -Candidate $PrivateProfileRoot -RequiredRoot $RollbackRoot -Name 'private profile root' | Out-Null
    foreach ($path in @(
        $RollbackRoot, $PrivateProfileRoot, $IsolatedGeminiRoot,
        (Split-Path -Parent $IsolatedGlobalSettingsPath),
        (Split-Path -Parent $IsolatedProjectSettingsPath),
        $TranscriptRoot, $PrivateAppDataPath, $PrivateLocalAppDataPath,
        $PrivateTempPath
    )) {
        Assert-NoReparsePath -Path $path -Name 'private profile tree' -RequireLeaf | Out-Null
    }
}

function Assert-IsolatedSettingsState {
    Assert-PrivateTree
    foreach ($path in @($IsolatedGlobalSettingsPath, $IsolatedProjectSettingsPath, $EnvironmentContractPath)) {
        Assert-PathWithin -Candidate $path -RequiredRoot $RollbackRoot -Name 'isolated evidence' | Out-Null
        Assert-NoReparsePath -Path $path -Name 'isolated evidence' -RequireLeaf | Out-Null
    }
    Assert-Exact 'isolated global settings SHA-256' (Get-LowerSha256 $IsolatedGlobalSettingsPath) $Expected.TemporaryGlobalSettingsSha256
    Assert-Exact 'isolated project settings SHA-256' (Get-LowerSha256 $IsolatedProjectSettingsPath) $Expected.TemporaryProjectSettingsSha256
    Assert-Exact 'isolated environment contract SHA-256' (Get-LowerSha256 $EnvironmentContractPath) $script:EnvironmentContractSha256
    $global = Get-Content -LiteralPath $IsolatedGlobalSettingsPath -Raw | ConvertFrom-Json -DateKind String
    Assert-Exact 'isolated global top-level fields' (@($global.PSObject.Properties.Name | Sort-Object) -join "`n") 'permissions'
    Assert-Exact 'isolated global permission allow' (@($global.permissions.allow) -join "`n") "command(git rev-parse)`ncommand(git remote get-url)`ncommand(git branch --show-current)`ncommand(git status)`ncommand(git diff)`ncommand(git show)`ncommand(git log)"
    Assert-Exact 'isolated global permission deny' (@($global.permissions.deny) -join "`n") "unsandboxed(*)`nread_url(*)`nexecute_url(*)`nmcp(*)"
    $project = Get-Content -LiteralPath $IsolatedProjectSettingsPath -Raw | ConvertFrom-Json -DateKind String
    Assert-Exact 'isolated project id' ([string]$project.id) $ProjectId
    Assert-Exact 'isolated project root' ([string]@($project.projectResources.resources)[0].folderUri) 'file://C:/Users/edwar/.codex/provider-sandboxes/lt-robot-dealer-antigravity-003-clean'
    Assert-Exact 'isolated project allow' (@($project.permissionGrants.permissionGrants.allow) -join "`n") 'write_file(*)'
    Assert-Exact 'isolated project deny' (@($project.permissionGrants.permissionGrants.deny) -join "`n") "command(*)`nwrite_file(C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean\PUBLIC_CONTRACT.json)`nwrite_file(C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean\RESULT_SCHEMA.json)`nunsandboxed(*)`nread_url(*)`nexecute_url(*)`nmcp(*)"
}

function Read-ValidatedProviderIdentity([object]$Record, [switch]$AllowAbsent) {
    if (-not (Test-Path -LiteralPath $ProviderIdentityPath -PathType Leaf)) {
        if ($AllowAbsent) { return $null }
        throw 'Durable provider identity is unavailable.'
    }
    Assert-NoReparsePath -Path $ProviderIdentityPath -Name 'provider identity' -RequireLeaf | Out-Null
    $identity = Get-Content -LiteralPath $ProviderIdentityPath -Raw | ConvertFrom-Json -DateKind String
    Assert-ExactPropertySet $identity @(
        'schema_version','assignment_id','idempotency_key',
        'transaction_record_sha256','director_process_id',
        'director_start_time_utc_ticks','provider_process_id',
        'provider_start_time_utc_ticks','provider_executable_path',
        'provider_executable_sha256','provider_started_at','job_name',
        'created_with_job_list_attribute','job_bound_before_resume',
        'job_assignment_confirmed_at','private_profile_root',
        'environment_contract_sha256','environment_block_sha256_utf16le',
        'environment_key_set_sha256','create_unicode_environment','recorded_at'
    ) 'provider identity'
    Assert-Exact 'provider identity assignment' ([string]$identity.assignment_id) 'LT-NATIVE-ANTIGRAVITY-ROBOT-003'
    Assert-Exact 'provider identity transaction SHA-256' ([string]$identity.transaction_record_sha256) (Get-LowerSha256 $RollbackRecordPath)
    Assert-Exact 'provider identity job' ([string]$identity.job_name) ([string]$Record.job_name)
    Assert-Exact 'provider identity executable path' ([IO.Path]::GetFullPath([string]$identity.provider_executable_path)) ([IO.Path]::GetFullPath($AgyExe))
    Assert-Exact 'provider identity executable hash' ([string]$identity.provider_executable_sha256) $Expected.AgyExeSha256
    Assert-Exact 'provider identity private profile' ([IO.Path]::GetFullPath([string]$identity.private_profile_root)) ([IO.Path]::GetFullPath($PrivateProfileRoot))
    Assert-Exact 'provider identity environment contract' ([string]$identity.environment_contract_sha256) ([string]$Record.environment_contract_sha256)
    Assert-Exact 'provider identity environment block' ([string]$identity.environment_block_sha256_utf16le) ([string]$Record.environment_block_sha256_utf16le)
    Assert-Exact 'provider identity environment key set' ([string]$identity.environment_key_set_sha256) ([string]$Record.environment_key_set_sha256)
    Assert-Exact 'provider identity Unicode environment' ([string]$identity.create_unicode_environment) 'True'
    if ([int]$identity.provider_process_id -le 0 -or [long]$identity.provider_start_time_utc_ticks -le 0) {
        throw 'Provider identity lacks a positive PID/start identity.'
    }
    return $identity
}

function Stop-ExactProcessIdentity([int]$ProcessId, [long]$StartTimeUtcTicks, [string]$Reason) {
    if (-not (Test-ExactProcessIdentity -ProcessId $ProcessId -StartTimeUtcTicks $StartTimeUtcTicks)) {
        return 'EXACT_IDENTITY_ALREADY_ABSENT'
    }
    $target = Get-Process -Id $ProcessId -ErrorAction Stop
    try { Stop-ProcessTreeBounded -Process $target -Reason $Reason }
    finally { $target.Dispose() }
    if (Test-ExactProcessIdentity -ProcessId $ProcessId -StartTimeUtcTicks $StartTimeUtcTicks) {
        throw "$Reason Exact process identity remains live."
    }
    return 'EXACT_IDENTITY_TERMINATED'
}

function Recover-StaleIsolationTransaction {
    $script:RecoveredTransactionArchive = $null
    if (-not (Test-Path -LiteralPath $RollbackRoot)) { return }
    Assert-NoReparsePath -Path $RollbackRoot -Name 'stale transaction root' -RequireLeaf | Out-Null
    Assert-CanonicalSettingsState
    $record = $null
    $jobResult = [pscustomobject][ordered]@{
        active_processes_before = 0
        active_processes_after = 0
        disposition = 'PRELAUNCH_NO_JOB'
        terminated_at = $null
        empty_verified_at = ([datetimeoffset]::UtcNow).ToString('o')
    }
    $identityStatus = 'ABSENT'
    $guardianStatus = 'ABSENT'
    if (Test-Path -LiteralPath $RollbackRecordPath -PathType Leaf) {
        Assert-NoReparsePath -Path $RollbackRecordPath -Name 'stale transaction record' -RequireLeaf | Out-Null
        $record = Get-Content -LiteralPath $RollbackRecordPath -Raw | ConvertFrom-Json -DateKind String
        Assert-ExactPropertySet $record @(
            'schema_version','assignment_id','idempotency_key',
            'director_process_id','director_start_time_utc_ticks',
            'control_head','control_tree','transaction_root',
            'provider_identity_path','provider_executable_path',
            'provider_executable_sha256','canonical_global_settings_path',
            'canonical_global_settings_sha256','canonical_project_settings_path',
            'canonical_project_settings_sha256','canonical_settings_written',
            'private_profile_root','isolated_global_settings_path',
            'isolated_global_settings_sha256','isolated_project_settings_path',
            'isolated_project_settings_sha256','environment_contract_path',
            'environment_contract_sha256','environment_block_sha256_utf16le',
            'environment_key_set_sha256','environment_entry_count',
            'profile_reparse_free','guardian_script_sha256',
            'guardian_deadline_seconds','guardian_deadline_at','job_name',
            'job_kill_on_close','job_created_at','armed_at'
        ) 'stale transaction record'
        Assert-Exact 'stale assignment' ([string]$record.assignment_id) 'LT-NATIVE-ANTIGRAVITY-ROBOT-003'
        Assert-Exact 'stale transaction root' ([IO.Path]::GetFullPath([string]$record.transaction_root)) ([IO.Path]::GetFullPath($RollbackRoot))
        Assert-Exact 'stale canonical global path' ([IO.Path]::GetFullPath([string]$record.canonical_global_settings_path)) ([IO.Path]::GetFullPath($CanonicalGlobalSettingsPath))
        Assert-Exact 'stale canonical project path' ([IO.Path]::GetFullPath([string]$record.canonical_project_settings_path)) ([IO.Path]::GetFullPath($CanonicalProjectSettingsPath))
        Assert-Exact 'stale canonical global hash' ([string]$record.canonical_global_settings_sha256) $Expected.GlobalSettingsSha256
        Assert-Exact 'stale canonical project hash' ([string]$record.canonical_project_settings_sha256) $Expected.ProjectSettingsSha256
        Assert-Exact 'stale canonical writes' ([string]$record.canonical_settings_written) 'False'
        Assert-Exact 'stale isolated global hash' ([string]$record.isolated_global_settings_sha256) $Expected.TemporaryGlobalSettingsSha256
        Assert-Exact 'stale isolated project hash' ([string]$record.isolated_project_settings_sha256) $Expected.TemporaryProjectSettingsSha256
        Assert-Exact 'stale profile reparse check' ([string]$record.profile_reparse_free) 'True'
        Assert-SecretJobObjectName ([string]$record.job_name)
        $script:JobObjectName = [string]$record.job_name
        if (Test-ExactProcessIdentity -ProcessId ([int]$record.director_process_id) -StartTimeUtcTicks ([long]$record.director_start_time_utc_ticks)) {
            throw 'A live exact Director identity owns the existing isolation transaction.'
        }
        $script:EnvironmentContractSha256 = [string]$record.environment_contract_sha256
        Assert-IsolatedSettingsState
        $jobHandle = Open-ExistingProviderJob
        try {
            if ($jobHandle -ne [IntPtr]::Zero) {
                $jobResult = Stop-JobObjectBounded -JobHandle $jobHandle -Reason 'Stale isolation transaction job stop.'
            }
            else {
                $jobResult = [pscustomobject][ordered]@{
                    active_processes_before = 0
                    active_processes_after = 0
                    disposition = 'JOB_OBJECT_ABSENT_KERNEL_CLOSED'
                    terminated_at = $null
                    empty_verified_at = ([datetimeoffset]::UtcNow).ToString('o')
                }
            }
        }
        finally { Close-NativeHandle $jobHandle }
        $identity = Read-ValidatedProviderIdentity -Record $record -AllowAbsent
        if ($null -ne $identity) {
            $identityStatus = Stop-ExactProcessIdentity -ProcessId ([int]$identity.provider_process_id) -StartTimeUtcTicks ([long]$identity.provider_start_time_utc_ticks) -Reason 'Stale exact provider identity stop.'
        }
        if (Test-Path -LiteralPath $GuardianReadyPath -PathType Leaf) {
            Assert-NoReparsePath -Path $GuardianReadyPath -Name 'stale guardian readiness' -RequireLeaf | Out-Null
            $ready = Get-Content -LiteralPath $GuardianReadyPath -Raw | ConvertFrom-Json -DateKind String
            Assert-ExactPropertySet $ready @(
                'schema_version','assignment_id','guardian_process_id',
                'guardian_start_time_utc_ticks','director_process_id',
                'transaction_record_sha256','canonical_global_settings_sha256',
                'canonical_project_settings_sha256','isolated_global_settings_sha256',
                'isolated_project_settings_sha256','private_profile_root',
                'environment_contract_sha256','provider_identity_path',
                'guardian_deadline_seconds','guardian_deadline_at','job_name',
                'job_kill_on_close','job_active_process_count','job_opened_at','ready_at'
            ) 'stale guardian readiness'
            Assert-Exact 'stale guardian transaction hash' ([string]$ready.transaction_record_sha256) (Get-LowerSha256 $RollbackRecordPath)
            Assert-Exact 'stale guardian job' ([string]$ready.job_name) $JobObjectName
            $guardianStatus = Stop-ExactProcessIdentity -ProcessId ([int]$ready.guardian_process_id) -StartTimeUtcTicks ([long]$ready.guardian_start_time_utc_ticks) -Reason 'Stale exact guardian identity stop.'
        }
        Assert-Exact 'stale job empty' ([string]$jobResult.active_processes_after) '0'
        Assert-CanonicalSettingsState
        Assert-IsolatedSettingsState
    }
    $recoveredAt = [datetimeoffset]::UtcNow
    $recovery = [ordered]@{
        schema_version = '1.0'
        assignment_id = 'LT-NATIVE-ANTIGRAVITY-ROBOT-003'
        transaction_record_sha256 = if ($null -ne $record) { Get-LowerSha256 $RollbackRecordPath } else { $null }
        provider_identity_disposition = $identityStatus
        guardian_identity_disposition = $guardianStatus
        job_disposition = [string]$jobResult.disposition
        job_active_processes_before = [int]$jobResult.active_processes_before
        job_active_processes_after = [int]$jobResult.active_processes_after
        job_empty_verified_at = [string]$jobResult.empty_verified_at
        canonical_global_settings_sha256 = Get-LowerSha256 $CanonicalGlobalSettingsPath
        canonical_project_settings_sha256 = Get-LowerSha256 $CanonicalProjectSettingsPath
        canonical_settings_written = $false
        recovered_at = $recoveredAt.ToString('o')
    } | ConvertTo-Json -Compress
    $staleRecoveryPath = Join-Path $RollbackRoot 'stale-recovery.json'
    if (-not (Test-Path -LiteralPath $staleRecoveryPath)) {
        Write-NewUtf8 -Path $staleRecoveryPath -Text ($recovery + "`n")
    }
    $archive = $RollbackRoot + '-recovered-' + $recoveredAt.ToString('yyyyMMddTHHmmssfffffffZ') + '-' + [Guid]::NewGuid().ToString('N')
    if (Test-Path -LiteralPath $archive) { throw "Stale transaction archive collision: $archive" }
    [IO.Directory]::Move($RollbackRoot, $archive)
    $script:RecoveredTransactionArchive = $archive
}

$GuardianScriptText = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not ('LongTable.Sequence26GuardianNativeMethods' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
namespace LongTable {
    public static class Sequence26GuardianNativeMethods {
        public const uint JOB_OBJECT_QUERY=0x0004, JOB_OBJECT_TERMINATE=0x0008;
        public const uint KILL_ON_CLOSE=0x00002000, BREAKAWAY=0x00000800, SILENT_BREAKAWAY=0x00001000;
        [StructLayout(LayoutKind.Sequential)] public struct BASIC_ACCOUNTING {
            public long a,b,c,d; public uint e,f,ActiveProcesses,g;
        }
        [StructLayout(LayoutKind.Sequential)] public struct BASIC_LIMITS {
            public long a,b; public uint LimitFlags; public UIntPtr c,d; public uint e; public UIntPtr f; public uint g,h;
        }
        [StructLayout(LayoutKind.Sequential)] public struct IO_COUNTERS { public ulong a,b,c,d,e,f; }
        [StructLayout(LayoutKind.Sequential)] public struct EXTENDED_LIMITS {
            public BASIC_LIMITS BasicLimitInformation; public IO_COUNTERS b;
            public UIntPtr c,d,e,f;
        }
        [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern IntPtr OpenJobObjectW(uint a,bool b,string c);
        [DllImport("kernel32.dll",SetLastError=true)] [return:MarshalAs(UnmanagedType.Bool)]
        public static extern bool QueryInformationJobObject(IntPtr a,int b,ref BASIC_ACCOUNTING c,uint d,IntPtr e);
        [DllImport("kernel32.dll",SetLastError=true)] [return:MarshalAs(UnmanagedType.Bool)]
        public static extern bool QueryInformationJobObject(IntPtr a,int b,ref EXTENDED_LIMITS c,uint d,IntPtr e);
        [DllImport("kernel32.dll",SetLastError=true)] [return:MarshalAs(UnmanagedType.Bool)]
        public static extern bool TerminateJobObject(IntPtr a,uint b);
        [DllImport("kernel32.dll",SetLastError=true)] [return:MarshalAs(UnmanagedType.Bool)]
        public static extern bool CloseHandle(IntPtr a);
    }
}
"@
}
function Hash([string]$p){(Get-FileHash -Algorithm SHA256 -LiteralPath $p).Hash.ToLowerInvariant()}
function Eq([string]$n,[string]$a,[string]$e){if($a-cne$e){throw "$n mismatch. Expected '$e'; got '$a'."}}
function Fields([object]$v,[string[]]$n,[string]$l){Eq "$l count" ([string]@($v.PSObject.Properties.Name).Count) ([string]$n.Count);Eq "$l fields" (@($v.PSObject.Properties.Name|Sort-Object)-join"`n") (@($n|Sort-Object)-join"`n")}
function Count([IntPtr]$j){$v=[LongTable.Sequence26GuardianNativeMethods+BASIC_ACCOUNTING]::new();$s=[uint32][Runtime.InteropServices.Marshal]::SizeOf($v);if(-not[LongTable.Sequence26GuardianNativeMethods]::QueryInformationJobObject($j,1,[ref]$v,$s,[IntPtr]::Zero)){throw 'guardian accounting query failed'};[int]$v.ActiveProcesses}
function ExactParent([int]$p,[long]$t){try{(Get-Process -Id $p -ErrorAction Stop).StartTime.ToUniversalTime().Ticks-eq$t}catch{$false}}
function StopJob([IntPtr]$j){$b=Count $j;$t=$null;if($b-gt 0){if(-not[LongTable.Sequence26GuardianNativeMethods]::TerminateJobObject($j,[uint32]::MaxValue)){throw 'guardian job termination failed'};$t=[datetimeoffset]::UtcNow.ToString('o')};$d=[datetimeoffset]::UtcNow.AddSeconds(10);$a=Count $j;while($a-ne 0-and[datetimeoffset]::UtcNow-lt$d){Start-Sleep -Milliseconds 25;$a=Count $j};if($a-ne 0){throw 'guardian job not empty'};[pscustomobject]@{before=$b;after=$a;terminated_at=$t;empty_at=[datetimeoffset]::UtcNow.ToString('o');disposition=if($b-eq 0){'JOB_ALREADY_EMPTY'}else{'JOB_TERMINATED_EMPTY'}}}
function NewFile([string]$p,[string]$t){$b=[Text.UTF8Encoding]::new($false).GetBytes($t);$s=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);try{$s.Write($b,0,$b.Length);$s.Flush($true)}finally{$s.Dispose()}}
$rp=$env:LT_S26_TRANSACTION_RECORD;$readyPath=$env:LT_S26_GUARDIAN_READY;$stopPath=$env:LT_S26_GUARDIAN_STOP;$donePath=$env:LT_S26_GUARDIAN_DONE;$identityPath=$env:LT_S26_PROVIDER_IDENTITY
$recordHash=$env:LT_S26_EXPECTED_TRANSACTION_SHA256;$guardianHash=$env:LT_S26_EXPECTED_GUARDIAN_SHA256
$cg=$env:LT_S26_EXPECTED_CANONICAL_GLOBAL_SHA256;$cp=$env:LT_S26_EXPECTED_CANONICAL_PROJECT_SHA256;$ig=$env:LT_S26_EXPECTED_ISOLATED_GLOBAL_SHA256;$ip=$env:LT_S26_EXPECTED_ISOLATED_PROJECT_SHA256;$ec=$env:LT_S26_EXPECTED_ENVIRONMENT_SHA256
$deadline=[datetimeoffset]::Parse($env:LT_S26_GUARDIAN_DEADLINE_AT,[Globalization.CultureInfo]::InvariantCulture)
$r=Get-Content -LiteralPath $rp -Raw|ConvertFrom-Json -DateKind String
Fields $r @('schema_version','assignment_id','idempotency_key','director_process_id','director_start_time_utc_ticks','control_head','control_tree','transaction_root','provider_identity_path','provider_executable_path','provider_executable_sha256','canonical_global_settings_path','canonical_global_settings_sha256','canonical_project_settings_path','canonical_project_settings_sha256','canonical_settings_written','private_profile_root','isolated_global_settings_path','isolated_global_settings_sha256','isolated_project_settings_path','isolated_project_settings_sha256','environment_contract_path','environment_contract_sha256','environment_block_sha256_utf16le','environment_key_set_sha256','environment_entry_count','profile_reparse_free','guardian_script_sha256','guardian_deadline_seconds','guardian_deadline_at','job_name','job_kill_on_close','job_created_at','armed_at') 'transaction'
Eq 'transaction hash' (Hash $rp) $recordHash;Eq 'guardian hash' (Hash $MyInvocation.MyCommand.Path) $guardianHash;Eq 'record guardian hash' ([string]$r.guardian_script_sha256) $guardianHash;Eq 'deadline' ([string]$r.guardian_deadline_at) $deadline.ToString('o');Eq 'canonical writes' ([string]$r.canonical_settings_written) 'False'
Eq 'canonical global' (Hash ([string]$r.canonical_global_settings_path)) $cg;Eq 'canonical project' (Hash ([string]$r.canonical_project_settings_path)) $cp;Eq 'isolated global' (Hash ([string]$r.isolated_global_settings_path)) $ig;Eq 'isolated project' (Hash ([string]$r.isolated_project_settings_path)) $ip;Eq 'environment' (Hash ([string]$r.environment_contract_path)) $ec
$j=[LongTable.Sequence26GuardianNativeMethods]::OpenJobObjectW(12,$false,[string]$r.job_name);if($j-eq[IntPtr]::Zero){throw 'guardian could not open job'}
try{
    $lim=[LongTable.Sequence26GuardianNativeMethods+EXTENDED_LIMITS]::new();$sz=[uint32][Runtime.InteropServices.Marshal]::SizeOf($lim);if(-not[LongTable.Sequence26GuardianNativeMethods]::QueryInformationJobObject($j,9,[ref]$lim,$sz,[IntPtr]::Zero)){throw 'guardian limits query failed'};$flags=$lim.BasicLimitInformation.LimitFlags;if(($flags-band[LongTable.Sequence26GuardianNativeMethods]::KILL_ON_CLOSE)-eq 0-or($flags-band([LongTable.Sequence26GuardianNativeMethods]::BREAKAWAY-bor[LongTable.Sequence26GuardianNativeMethods]::SILENT_BREAKAWAY))-ne 0){throw 'guardian job limits invalid'};Eq 'initial job count' ([string](Count $j)) '0'
    $gp=Get-Process -Id $PID -ErrorAction Stop;$now=[datetimeoffset]::UtcNow
    $ready=[ordered]@{schema_version='1.0';assignment_id='LT-NATIVE-ANTIGRAVITY-ROBOT-003';guardian_process_id=$PID;guardian_start_time_utc_ticks=$gp.StartTime.ToUniversalTime().Ticks;director_process_id=[int]$r.director_process_id;transaction_record_sha256=$recordHash;canonical_global_settings_sha256=$cg;canonical_project_settings_sha256=$cp;isolated_global_settings_sha256=$ig;isolated_project_settings_sha256=$ip;private_profile_root=[string]$r.private_profile_root;environment_contract_sha256=$ec;provider_identity_path=$identityPath;guardian_deadline_seconds=[int]$r.guardian_deadline_seconds;guardian_deadline_at=$deadline.ToString('o');job_name=[string]$r.job_name;job_kill_on_close=$true;job_active_process_count=0;job_opened_at=$now.ToString('o');ready_at=$now.ToString('o')}|ConvertTo-Json -Compress
    NewFile $readyPath ($ready+"`n");$status=$null;$trigger=$null
    while($null-eq$status){$now=[datetimeoffset]::UtcNow;if($now-ge$deadline){$status='GUARDIAN_DEADLINE_JOB_EMPTY';$trigger=$now;break};if(-not(ExactParent ([int]$r.director_process_id) ([long]$r.director_start_time_utc_ticks))){$status='PARENT_EXIT_JOB_EMPTY';$trigger=$now;break};if(Test-Path -LiteralPath $stopPath -PathType Leaf){$now=[datetimeoffset]::UtcNow;$status=if($now-ge$deadline){'GUARDIAN_DEADLINE_JOB_EMPTY'}else{'DIRECTOR_SIGNAL_JOB_EMPTY'};$trigger=$now;break};Start-Sleep -Milliseconds 25}
    $jr=StopJob $j;$completed=[datetimeoffset]::UtcNow;if($status-ceq'DIRECTOR_SIGNAL_JOB_EMPTY'-and$completed-ge$deadline){$status='GUARDIAN_DEADLINE_JOB_EMPTY'}
    Eq 'completion canonical global' (Hash ([string]$r.canonical_global_settings_path)) $cg;Eq 'completion canonical project' (Hash ([string]$r.canonical_project_settings_path)) $cp;Eq 'completion isolated global' (Hash ([string]$r.isolated_global_settings_path)) $ig;Eq 'completion isolated project' (Hash ([string]$r.isolated_project_settings_path)) $ip;Eq 'completion environment' (Hash ([string]$r.environment_contract_path)) $ec
    $is='ABSENT';$ish=$null;$providerPid=$null;$ticks=$null;if(Test-Path -LiteralPath $identityPath -PathType Leaf){$is='PRESENT_HASH_BOUND';$ish=Hash $identityPath;$id=Get-Content -LiteralPath $identityPath -Raw|ConvertFrom-Json -DateKind String;Eq 'identity transaction' ([string]$id.transaction_record_sha256) $recordHash;Eq 'identity job' ([string]$id.job_name) ([string]$r.job_name);$providerPid=[int]$id.provider_process_id;$ticks=[long]$id.provider_start_time_utc_ticks}
    $done=[ordered]@{schema_version='1.0';assignment_id='LT-NATIVE-ANTIGRAVITY-ROBOT-003';status=$status;transaction_record_sha256=$recordHash;guardian_process_id=$PID;guardian_start_time_utc_ticks=$gp.StartTime.ToUniversalTime().Ticks;director_process_id=[int]$r.director_process_id;guardian_deadline_at=$deadline.ToString('o');trigger_observed_at=$trigger.ToString('o');provider_identity_status=$is;provider_identity_sha256=$ish;provider_process_id=$providerPid;provider_start_time_utc_ticks=$ticks;job_name=[string]$r.job_name;job_kill_on_close=$true;job_active_processes_before_stop=[int]$jr.before;job_active_processes_after_stop=[int]$jr.after;job_empty_verified_at=[string]$jr.empty_at;provider_process_disposition=[string]$jr.disposition;process_tree_terminated_at=[string]$jr.terminated_at;canonical_global_settings_sha256=$cg;canonical_project_settings_sha256=$cp;canonical_settings_written=$false;isolated_global_settings_sha256=$ig;isolated_project_settings_sha256=$ip;private_profile_root=[string]$r.private_profile_root;environment_contract_sha256=$ec;completed_at=$completed.ToString('o');completed_before_guardian_deadline=($completed-lt$deadline)}|ConvertTo-Json -Compress
    NewFile $donePath ($done+"`n")
}finally{if($j-ne[IntPtr]::Zero){[void][LongTable.Sequence26GuardianNativeMethods]::CloseHandle($j)}}
'@

function Start-IsolationGuardian([datetimeoffset]$GuardianDeadlineAt) {
    Write-NewUtf8 -Path $GuardianScriptPath -Text ($GuardianScriptText + "`n")
    $guardianSha = Get-LowerSha256 $GuardianScriptPath
    Assert-Exact 'guardian script frozen SHA-256' $guardianSha $script:GuardianScriptSha256
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = (Get-Command pwsh -ErrorAction Stop).Source
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $parentEnvironment = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::Process)
    $guardianInheritedNames = @(
        'ALLUSERSPROFILE','CommonProgramFiles','CommonProgramFiles(x86)',
        'CommonProgramW6432','ComSpec','DriverData','LANG','LC_ALL',
        'NUMBER_OF_PROCESSORS','OS','Path','PATHEXT','PROCESSOR_ARCHITECTURE',
        'PROCESSOR_IDENTIFIER','PROCESSOR_LEVEL','PROCESSOR_REVISION',
        'ProgramData','ProgramFiles','ProgramFiles(x86)','ProgramW6432','PUBLIC',
        'SystemDrive','SystemRoot','TEMP','TMP','TZ','windir'
    )
    $info.Environment.Clear()
    foreach($name in $guardianInheritedNames){
        if($parentEnvironment.Contains($name)){$info.Environment[$name]=[string]$parentEnvironment[$name]}
    }
    foreach($arg in @('-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$GuardianScriptPath)){$info.ArgumentList.Add($arg)}
    $info.Environment['LT_S26_TRANSACTION_RECORD']=$RollbackRecordPath
    $info.Environment['LT_S26_GUARDIAN_READY']=$GuardianReadyPath
    $info.Environment['LT_S26_GUARDIAN_STOP']=$GuardianStopPath
    $info.Environment['LT_S26_GUARDIAN_DONE']=$GuardianDonePath
    $info.Environment['LT_S26_PROVIDER_IDENTITY']=$ProviderIdentityPath
    $info.Environment['LT_S26_EXPECTED_TRANSACTION_SHA256']=$script:TransactionRecordSha256
    $info.Environment['LT_S26_EXPECTED_GUARDIAN_SHA256']=$guardianSha
    $info.Environment['LT_S26_EXPECTED_CANONICAL_GLOBAL_SHA256']=$Expected.GlobalSettingsSha256
    $info.Environment['LT_S26_EXPECTED_CANONICAL_PROJECT_SHA256']=$Expected.ProjectSettingsSha256
    $info.Environment['LT_S26_EXPECTED_ISOLATED_GLOBAL_SHA256']=$Expected.TemporaryGlobalSettingsSha256
    $info.Environment['LT_S26_EXPECTED_ISOLATED_PROJECT_SHA256']=$Expected.TemporaryProjectSettingsSha256
    $info.Environment['LT_S26_EXPECTED_ENVIRONMENT_SHA256']=$script:EnvironmentContractSha256
    $info.Environment['LT_S26_GUARDIAN_DEADLINE_AT']=$GuardianDeadlineAt.ToString('o')
    $guardian=[Diagnostics.Process]::Start($info)
    if($null-eq$guardian){throw 'Failed to start isolation guardian.'}
    $deadline=[datetimeoffset]::UtcNow.AddSeconds(10)
    while(-not(Test-Path -LiteralPath $GuardianReadyPath -PathType Leaf)-and[datetimeoffset]::UtcNow-lt$deadline){$guardian.Refresh();if($guardian.HasExited){throw "Isolation guardian exited $($guardian.ExitCode) before readiness."};Start-Sleep -Milliseconds $GuardianPollMilliseconds}
    if(-not(Test-Path -LiteralPath $GuardianReadyPath -PathType Leaf)){throw 'Isolation guardian readiness timed out.'}
    $ready=Get-Content -LiteralPath $GuardianReadyPath -Raw|ConvertFrom-Json -DateKind String
    Assert-ExactPropertySet $ready @('schema_version','assignment_id','guardian_process_id','guardian_start_time_utc_ticks','director_process_id','transaction_record_sha256','canonical_global_settings_sha256','canonical_project_settings_sha256','isolated_global_settings_sha256','isolated_project_settings_sha256','private_profile_root','environment_contract_sha256','provider_identity_path','guardian_deadline_seconds','guardian_deadline_at','job_name','job_kill_on_close','job_active_process_count','job_opened_at','ready_at') 'guardian readiness'
    Assert-Exact 'guardian PID' ([string]$ready.guardian_process_id) ([string]$guardian.Id)
    Assert-Exact 'guardian transaction' ([string]$ready.transaction_record_sha256) $script:TransactionRecordSha256
    Assert-Exact 'guardian job' ([string]$ready.job_name) $JobObjectName
    Assert-Exact 'guardian job empty' ([string]$ready.job_active_process_count) '0'
    [pscustomobject][ordered]@{process=$guardian;ready=$ready;ready_sha256=Get-LowerSha256 $GuardianReadyPath}
}

function Complete-IsolationGuardian([Diagnostics.Process]$GuardianProcess,[datetimeoffset]$GuardianDeadlineAt) {
    if(-not(Test-Path -LiteralPath $GuardianStopPath)){Write-NewUtf8 -Path $GuardianStopPath -Text "stop-job-and-complete`n"}
    $deadline=$GuardianDeadlineAt.AddSeconds(10)
    while(-not(Test-Path -LiteralPath $GuardianDonePath -PathType Leaf)-and[datetimeoffset]::UtcNow-lt$deadline){$GuardianProcess.Refresh();if($GuardianProcess.HasExited-and-not(Test-Path -LiteralPath $GuardianDonePath -PathType Leaf)){throw "Isolation guardian exited $($GuardianProcess.ExitCode) without completion."};Start-Sleep -Milliseconds $GuardianPollMilliseconds}
    if(-not(Test-Path -LiteralPath $GuardianDonePath -PathType Leaf)){throw 'Isolation guardian completion timed out.'}
    $done=Get-Content -LiteralPath $GuardianDonePath -Raw|ConvertFrom-Json -DateKind String
    Assert-ExactPropertySet $done @('schema_version','assignment_id','status','transaction_record_sha256','guardian_process_id','guardian_start_time_utc_ticks','director_process_id','guardian_deadline_at','trigger_observed_at','provider_identity_status','provider_identity_sha256','provider_process_id','provider_start_time_utc_ticks','job_name','job_kill_on_close','job_active_processes_before_stop','job_active_processes_after_stop','job_empty_verified_at','provider_process_disposition','process_tree_terminated_at','canonical_global_settings_sha256','canonical_project_settings_sha256','canonical_settings_written','isolated_global_settings_sha256','isolated_project_settings_sha256','private_profile_root','environment_contract_sha256','completed_at','completed_before_guardian_deadline') 'guardian completion'
    Assert-Exact 'guardian status' ([string]$done.status) 'DIRECTOR_SIGNAL_JOB_EMPTY'
    Assert-Exact 'guardian completion transaction' ([string]$done.transaction_record_sha256) $script:TransactionRecordSha256
    Assert-Exact 'guardian completion empty' ([string]$done.job_active_processes_after_stop) '0'
    Assert-Exact 'guardian canonical writes' ([string]$done.canonical_settings_written) 'False'
    Assert-Exact 'guardian before deadline' ([string]$done.completed_before_guardian_deadline) 'True'
    if($null -ne $providerProcessId){
        Assert-Exact 'guardian provider identity status' ([string]$done.provider_identity_status) 'PRESENT_HASH_BOUND'
        Assert-Exact 'guardian provider identity hash' ([string]$done.provider_identity_sha256) ([string]$providerIdentitySha256)
        Assert-Exact 'guardian provider PID' ([string]$done.provider_process_id) ([string]$providerProcessId)
        Assert-Exact 'guardian provider start identity' ([string]$done.provider_start_time_utc_ticks) ([string]$providerStartTimeUtcTicks)
        Assert-Exact 'guardian normal provider disposition' ([string]$done.provider_process_disposition) 'JOB_ALREADY_EMPTY'
    }
    Assert-CanonicalSettingsState;Assert-IsolatedSettingsState;$done
}

function New-IsolatedConfiguration {
    $parentRoot=Split-Path -Parent $RollbackRoot
    Assert-NoReparsePath -Path $parentRoot -Name 'transaction parent' -RequireLeaf|Out-Null
    New-PrivateDirectory -Path $RollbackRoot -RequiredRoot $parentRoot -Name 'transaction root'|Out-Null
    New-PrivateDirectory -Path $PrivateProfileRoot -RequiredRoot $RollbackRoot -Name 'private profile root'|Out-Null
    New-PrivateDirectory -Path $IsolatedGeminiRoot -RequiredRoot $PrivateProfileRoot -Name 'isolated Gemini root'|Out-Null
    New-PrivateDirectory -Path (Split-Path -Parent $IsolatedGlobalSettingsPath) -RequiredRoot $IsolatedGeminiRoot -Name 'isolated CLI directory'|Out-Null
    New-PrivateDirectory -Path (Join-Path $IsolatedGeminiRoot 'config') -RequiredRoot $IsolatedGeminiRoot -Name 'isolated config directory'|Out-Null
    New-PrivateDirectory -Path (Join-Path $IsolatedGeminiRoot 'config\projects') -RequiredRoot $IsolatedGeminiRoot -Name 'isolated projects directory'|Out-Null
    New-PrivateDirectory -Path $TranscriptRoot -RequiredRoot $IsolatedGeminiRoot -Name 'isolated transcript root'|Out-Null
    New-PrivateDirectory -Path (Join-Path $PrivateProfileRoot 'AppData') -RequiredRoot $PrivateProfileRoot -Name 'private AppData'|Out-Null
    New-PrivateDirectory -Path $PrivateAppDataPath -RequiredRoot $PrivateProfileRoot -Name 'private roaming AppData'|Out-Null
    New-PrivateDirectory -Path $PrivateLocalAppDataPath -RequiredRoot $PrivateProfileRoot -Name 'private local AppData'|Out-Null
    New-PrivateDirectory -Path $PrivateTempPath -RequiredRoot $PrivateProfileRoot -Name 'private TEMP'|Out-Null
    $global=[ordered]@{permissions=[ordered]@{allow=@('command(git rev-parse)','command(git remote get-url)','command(git branch --show-current)','command(git status)','command(git diff)','command(git show)','command(git log)');deny=@('unsandboxed(*)','read_url(*)','execute_url(*)','mcp(*)')}}
    $project=[ordered]@{id=$ProjectId;name='lt-robot-dealer-antigravity-003-clean';projectResources=[ordered]@{resources=@([ordered]@{folderUri='file://C:/Users/edwar/.codex/provider-sandboxes/lt-robot-dealer-antigravity-003-clean'})};permissionGrants=[ordered]@{permissionGrants=[ordered]@{allow=@('write_file(*)');deny=@('command(*)','write_file(C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean\PUBLIC_CONTRACT.json)','write_file(C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-antigravity-003-clean\RESULT_SCHEMA.json)','unsandboxed(*)','read_url(*)','execute_url(*)','mcp(*)')}}}
    $gt=($global|ConvertTo-Json -Depth 100)+[Environment]::NewLine;$pt=($project|ConvertTo-Json -Depth 100)+[Environment]::NewLine
    Assert-Exact 'prepared isolated global hash' (Get-Utf8Sha256 $gt) $Expected.TemporaryGlobalSettingsSha256
    Assert-Exact 'prepared isolated project hash' (Get-Utf8Sha256 $pt) $Expected.TemporaryProjectSettingsSha256
    Assert-PrivateTree;Write-NewUtf8 -Path $IsolatedGlobalSettingsPath -Text $gt;Write-NewUtf8 -Path $IsolatedProjectSettingsPath -Text $pt;Assert-PrivateTree
}

Recover-StaleIsolationTransaction
foreach($path in @($AgyExe,$PromptPath,$SchemaPath,$CanonicalGlobalSettingsPath,$CanonicalProjectSettingsPath)){if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Required preflight file unavailable: $path"}}
Assert-Exact 'Antigravity executable SHA-256' (Get-LowerSha256 $AgyExe) $Expected.AgyExeSha256
foreach($path in @($OutputPath,$ErrorPath,$LogPath,$TranscriptPath,$ReceiptPath,$ClaimPath)){if(Test-Path -LiteralPath $path){throw "Sequence-26 primary artifact exists; refusing duplicate contact: $path"}}
Assert-ControlState;Assert-ProviderState;Assert-CanonicalSettingsState
$preflight=[ordered]@{status='PRECHECK_OK';checked_at=([datetimeoffset]::UtcNow).ToString('o');control_head=$AuthorityControlHead;control_tree=$AuthorityControlTree;provider_head=$Expected.ProviderHead;provider_tree=$Expected.ProviderTree;project_id=$ProjectId;model='gemini-3.1-pro-high';effort='high';sandbox=$ProviderRoot;private_profile_root=$PrivateProfileRoot;canonical_settings_written=$false;recovered_transaction_archive=$script:RecoveredTransactionArchive;output_path=$OutputPath;transcript_path=$TranscriptPath;receipt_path=$ReceiptPath}
if($PreflightOnly){$preflight|ConvertTo-Json -Compress;exit 0}
if($null -ne $script:RecoveredTransactionArchive){
    throw "A stale isolation transaction was recovered and archived at '$($script:RecoveredTransactionArchive)'. This invocation is recovery-only; rerun a clean preflight before any provider contact."
}
try{$claim=[IO.File]::Open($ClaimPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)}catch{throw "The one-shot primary claim exists: $ClaimPath"}
try{$cr=[ordered]@{assignment_id='LT-NATIVE-ANTIGRAVITY-ROBOT-003';idempotency_key='LT-NATIVE-ANTIGRAVITY-ROBOT-003-644d1b0-SEQUENCE26';project_id=$ProjectId;process_id=$PID;claimed_at=([datetimeoffset]::UtcNow).ToString('o');control_head=$AuthorityControlHead;control_tree=$AuthorityControlTree;prompt_sha256=$Expected.PromptSha256;isolation_protocol='PROCESS_PRIVATE_PROFILE_V1'}|ConvertTo-Json -Compress;$b=[Text.UTF8Encoding]::new($false).GetBytes($cr+"`n");$claim.Write($b,0,$b.Length);$claim.Flush($true)}finally{$claim.Dispose()}

$stdout='';$stderr='';$processExitCode=$null;$outerStatus=$null;$conversationId=$null;$transcriptSourcePath=$null;$transcriptSha256=$null;$terminalInspectionError=$null;$projectPermissionGrantsLoaded=$false;$isolationLogMarkerObserved=$false;$canonicalPathMarkerObserved=$false
$guardianProcess=$null;$guardianDone=$null;$guardianDeadlineAt=$null;$jobHandle=[IntPtr]::Zero;$jobCreatedAt=$null;$nativeLaunchContext=$null;$privateEnvironmentContext=$null;$nativeLaunch=$null;$process=$null;$providerProcessId=$null;$providerStartTimeUtcTicks=$null;$providerProcessStartedAt=$null;$providerResumedAt=$null;$providerIdentitySha256=$null;$jobAssignmentConfirmedAt=$null;$jobEmptyVerifiedAt=$null;$jobActiveProcessCountAtCompletion=$null;$jobKillOnClose=$false
$parentFinallyJobDisposition='NOT_CREATED';$parentFinallyJobError=$null;$wrapperTimeoutTriggered=$false;$promptDeliveryStartedAt=$null;$promptDeliveryCompletedAt=$null;$promptDeliveryTimedOut=$false;$environmentBlockSha256=$null;$environmentKeySetSha256=$null;$environmentEntryCount=$null;$profileReparseFree=$false;$providerError=$null;$stdoutTask=$null;$stderrTask=$null
try{
    Assert-ControlState;Assert-ProviderState;Assert-CanonicalSettingsState;New-IsolatedConfiguration
    $privateEnvironmentContext=New-PrivateEnvironmentContext;$environmentBlockSha256=[string]$privateEnvironmentContext.block_sha256_utf16le;$environmentKeySetSha256=[string]$privateEnvironmentContext.key_set_sha256;$environmentEntryCount=[int]$privateEnvironmentContext.total_entry_count
    Write-NewUtf8 -Path $EnvironmentContractPath -Text ([string]$privateEnvironmentContext.contract_text);$script:EnvironmentContractSha256=Get-LowerSha256 $EnvironmentContractPath;Assert-IsolatedSettingsState;$profileReparseFree=$true
    $promptText=[IO.File]::ReadAllText($PromptPath);$args=@('--print','--project',$ProjectId,'--sandbox','--mode','accept-edits','--model','gemini-3.1-pro-high','--effort','high','--output-format','json','--json-schema',$SchemaPath,'--disable-slash-commands','--print-timeout','30m','--log-file',$LogPath)
    $script:JobObjectName=New-SecretJobObjectName;$jobHandle=New-KillOnCloseJob;$jobKillOnClose=Test-JobKillOnClose $jobHandle;$jobCreatedAt=[datetimeoffset]::UtcNow
    $nativeLaunchContext=New-NativeLaunchContext -FilePath $AgyExe -Arguments $args -WorkingDirectory $ProviderRoot -JobHandle $jobHandle -EnvironmentContext $privateEnvironmentContext
    $guardianDeadlineAt=[datetimeoffset]::UtcNow.AddSeconds($GuardianDeadlineSeconds);$script:GuardianScriptSha256=Get-Utf8Sha256 ($GuardianScriptText+"`n");$dp=Get-Process -Id $PID -ErrorAction Stop
    $transaction=[ordered]@{schema_version='1.0';assignment_id='LT-NATIVE-ANTIGRAVITY-ROBOT-003';idempotency_key='LT-NATIVE-ANTIGRAVITY-ROBOT-003-644d1b0-SEQUENCE26';director_process_id=$PID;director_start_time_utc_ticks=$dp.StartTime.ToUniversalTime().Ticks;control_head=$AuthorityControlHead;control_tree=$AuthorityControlTree;transaction_root=$RollbackRoot;provider_identity_path=$ProviderIdentityPath;provider_executable_path=$AgyExe;provider_executable_sha256=$Expected.AgyExeSha256;canonical_global_settings_path=$CanonicalGlobalSettingsPath;canonical_global_settings_sha256=$Expected.GlobalSettingsSha256;canonical_project_settings_path=$CanonicalProjectSettingsPath;canonical_project_settings_sha256=$Expected.ProjectSettingsSha256;canonical_settings_written=$false;private_profile_root=$PrivateProfileRoot;isolated_global_settings_path=$IsolatedGlobalSettingsPath;isolated_global_settings_sha256=$Expected.TemporaryGlobalSettingsSha256;isolated_project_settings_path=$IsolatedProjectSettingsPath;isolated_project_settings_sha256=$Expected.TemporaryProjectSettingsSha256;environment_contract_path=$EnvironmentContractPath;environment_contract_sha256=$script:EnvironmentContractSha256;environment_block_sha256_utf16le=$environmentBlockSha256;environment_key_set_sha256=$environmentKeySetSha256;environment_entry_count=$environmentEntryCount;profile_reparse_free=$true;guardian_script_sha256=$script:GuardianScriptSha256;guardian_deadline_seconds=$GuardianDeadlineSeconds;guardian_deadline_at=$guardianDeadlineAt.ToString('o');job_name=$JobObjectName;job_kill_on_close=$jobKillOnClose;job_created_at=$jobCreatedAt.ToString('o');armed_at=([datetimeoffset]::UtcNow).ToString('o')}|ConvertTo-Json -Compress
    Write-NewUtf8 -Path $RollbackRecordPath -Text ($transaction+"`n");$script:TransactionRecordSha256=Get-LowerSha256 $RollbackRecordPath
    $gc=Start-IsolationGuardian -GuardianDeadlineAt $guardianDeadlineAt;$guardianProcess=$gc.process
    Assert-IsolationGuardianLive $guardianProcess 'before suspended provider creation';Assert-CanonicalSettingsState;Assert-IsolatedSettingsState
    $nativeLaunch=Start-SuspendedJobBoundProcess -Context $nativeLaunchContext -JobHandle $jobHandle;$process=$nativeLaunch.process;$providerProcessId=[int]$nativeLaunch.process_id;$providerStartTimeUtcTicks=[long]$nativeLaunch.start_time_utc_ticks;$providerProcessStartedAt=[string]$nativeLaunch.started_at;$jobAssignmentConfirmedAt=[string]$nativeLaunch.job_assignment_confirmed_at
    Assert-Exact 'suspended job count' ([string](Get-JobActiveProcessCount $jobHandle)) '1'
    $identity=[ordered]@{schema_version='1.0';assignment_id='LT-NATIVE-ANTIGRAVITY-ROBOT-003';idempotency_key='LT-NATIVE-ANTIGRAVITY-ROBOT-003-644d1b0-SEQUENCE26';transaction_record_sha256=$script:TransactionRecordSha256;director_process_id=$PID;director_start_time_utc_ticks=$dp.StartTime.ToUniversalTime().Ticks;provider_process_id=$providerProcessId;provider_start_time_utc_ticks=$providerStartTimeUtcTicks;provider_executable_path=$AgyExe;provider_executable_sha256=$Expected.AgyExeSha256;provider_started_at=$providerProcessStartedAt;job_name=$JobObjectName;created_with_job_list_attribute=[bool]$nativeLaunch.created_with_job_list_attribute;job_bound_before_resume=[bool]$nativeLaunch.job_bound_before_resume;job_assignment_confirmed_at=$jobAssignmentConfirmedAt;private_profile_root=$PrivateProfileRoot;environment_contract_sha256=$script:EnvironmentContractSha256;environment_block_sha256_utf16le=$environmentBlockSha256;environment_key_set_sha256=$environmentKeySetSha256;create_unicode_environment=$true;recorded_at=([datetimeoffset]::UtcNow).ToString('o')}|ConvertTo-Json -Compress
    Write-NewUtf8 -Path $ProviderIdentityStagingPath -Text ($identity+"`n");[IO.File]::Move($ProviderIdentityStagingPath,$ProviderIdentityPath);$providerIdentitySha256=Get-LowerSha256 $ProviderIdentityPath;$id=Read-ValidatedProviderIdentity -Record (Get-Content -LiteralPath $RollbackRecordPath -Raw|ConvertFrom-Json -DateKind String)
    Assert-Exact 'identity PID' ([string]$id.provider_process_id) ([string]$providerProcessId);Assert-Exact 'identity ticks' ([string]$id.provider_start_time_utc_ticks) ([string]$providerStartTimeUtcTicks)
    $stdoutTask=$nativeLaunchContext.stdout_reader.ReadToEndAsync();$stderrTask=$nativeLaunchContext.stderr_reader.ReadToEndAsync();$nativeLaunchContext.stdin_writer.AutoFlush=$true
    Assert-IsolationGuardianLive $guardianProcess 'immediately before ResumeThread';Assert-CanonicalSettingsState;Assert-IsolatedSettingsState
    $sc=[LongTable.Sequence26NativeMethods]::ResumeThread($nativeLaunchContext.primary_thread_handle);Close-NativeHandle $nativeLaunchContext.primary_thread_handle;$nativeLaunchContext.primary_thread_handle=[IntPtr]::Zero;if($sc-ne 1){throw "ResumeThread returned $sc, expected 1"}
    $providerResumedAt=([datetimeoffset]::UtcNow).ToString('o');$providerDeadline=[datetimeoffset]::UtcNow.AddSeconds($WrapperTimeoutSeconds);$promptDeliveryStartedAt=([datetimeoffset]::UtcNow).ToString('o');$promptDeadline=[datetimeoffset]::UtcNow.AddSeconds($PromptDeliveryTimeoutSeconds);if($promptDeadline-gt$providerDeadline){$promptDeadline=$providerDeadline};if($promptDeadline-gt$guardianDeadlineAt){$promptDeadline=$guardianDeadlineAt}
    $wt=$nativeLaunchContext.stdin_writer.WriteAsync($promptText);while(-not$wt.IsCompleted-and[datetimeoffset]::UtcNow-lt$promptDeadline){Assert-IsolationGuardianLive $guardianProcess 'asynchronous prompt write';Start-Sleep -Milliseconds $SupervisorPollMilliseconds};if(-not$wt.IsCompleted){$promptDeliveryTimedOut=$true;throw 'Prompt write timed out'};$wt.GetAwaiter().GetResult()
    $ft=$nativeLaunchContext.stdin_writer.FlushAsync();while(-not$ft.IsCompleted-and[datetimeoffset]::UtcNow-lt$promptDeadline){Assert-IsolationGuardianLive $guardianProcess 'asynchronous prompt flush';Start-Sleep -Milliseconds $SupervisorPollMilliseconds};if(-not$ft.IsCompleted){$promptDeliveryTimedOut=$true;throw 'Prompt flush timed out'};$ft.GetAwaiter().GetResult()
    $dt=$nativeLaunchContext.stdin_writer.DisposeAsync().AsTask();while(-not$dt.IsCompleted-and[datetimeoffset]::UtcNow-lt$promptDeadline){Assert-IsolationGuardianLive $guardianProcess 'asynchronous stdin close';Start-Sleep -Milliseconds $SupervisorPollMilliseconds};if(-not$dt.IsCompleted){$promptDeliveryTimedOut=$true;throw 'Stdin close timed out'};$dt.GetAwaiter().GetResult();$nativeLaunchContext.stdin_writer=$null;$promptDeliveryCompletedAt=([datetimeoffset]::UtcNow).ToString('o')
    $audit=[datetimeoffset]::UtcNow
    while((Get-JobActiveProcessCount $jobHandle)-ne 0-and[datetimeoffset]::UtcNow-lt$providerDeadline){Assert-IsolationGuardianLive $guardianProcess 'provider completion wait';if([datetimeoffset]::UtcNow-ge$audit){Assert-CanonicalSettingsState;Assert-IsolatedSettingsState;$audit=[datetimeoffset]::UtcNow.AddSeconds(1)};Start-Sleep -Milliseconds $SupervisorPollMilliseconds}
    if((Get-JobActiveProcessCount $jobHandle)-ne 0){$wrapperTimeoutTriggered=$true;throw 'Provider wrapper deadline exceeded'}
    $jobActiveProcessCountAtCompletion=0;$jobEmptyVerifiedAt=([datetimeoffset]::UtcNow).ToString('o');$process.Refresh();if(-not$process.HasExited){throw 'Root process live after job empty'};$processExitCode=$process.ExitCode
    $od=[datetimeoffset]::UtcNow.AddSeconds(10);while((-not$stdoutTask.IsCompleted-or-not$stderrTask.IsCompleted)-and[datetimeoffset]::UtcNow-lt$od){Assert-IsolationGuardianLive $guardianProcess 'output drain';Start-Sleep -Milliseconds $SupervisorPollMilliseconds};if(-not$stdoutTask.IsCompleted-or-not$stderrTask.IsCompleted){throw 'Output drain timeout'};$stdout=$stdoutTask.GetAwaiter().GetResult();$stderr=$stderrTask.GetAwaiter().GetResult()
}catch{$providerError=$_}finally{
    if($jobHandle-ne[IntPtr]::Zero){try{$js=Stop-JobObjectBounded -JobHandle $jobHandle -Reason 'Parent operational-finally assignment stop.';$parentFinallyJobDisposition=[string]$js.disposition;$jobActiveProcessCountAtCompletion=[int]$js.active_processes_after;$jobEmptyVerifiedAt=[string]$js.empty_verified_at}catch{$parentFinallyJobError=$_.Exception.Message}}
    if($null-eq$parentFinallyJobError-and$null-ne$guardianProcess){try{$guardianDone=Complete-IsolationGuardian $guardianProcess $guardianDeadlineAt}catch{if($null-eq$providerError){$providerError=$_}else{$providerError=[System.Management.Automation.ErrorRecord]::new([InvalidOperationException]::new("$($providerError.Exception.Message) | Guardian: $($_.Exception.Message)"),'CombinedIsolationFailure',[System.Management.Automation.ErrorCategory]::InvalidResult,$null)}}}
    try{Assert-CanonicalSettingsState;if(Test-Path -LiteralPath $PrivateProfileRoot){Assert-IsolatedSettingsState}}catch{if($null-eq$providerError){$providerError=$_}}
    Close-NativeLaunchContext $nativeLaunchContext;$nativeLaunchContext=$null;Close-PrivateEnvironmentContext $privateEnvironmentContext;if($jobHandle-ne[IntPtr]::Zero){Close-NativeHandle $jobHandle;$jobHandle=[IntPtr]::Zero};if($null-ne$process){$process.Dispose()}
}
if($null-ne$parentFinallyJobError){throw "Assignment job could not be verified empty: $parentFinallyJobError"}
if($null-ne$providerError){throw "Antigravity isolated assignment failed closed: $($providerError.Exception.Message)"}
$utf8NoBom=[Text.UTF8Encoding]::new($false);[IO.File]::WriteAllText($OutputPath,$stdout,$utf8NoBom);[IO.File]::WriteAllText($ErrorPath,$stderr,$utf8NoBom)
if($processExitCode-eq 0){try{$outer=$stdout.Trim()|ConvertFrom-Json -Depth 100 -DateKind String;$outerStatus=[string]$outer.status;$conversationId=[string]$outer.conversation_id;if($outerStatus-cne'SUCCESS'){throw "Outer status is '$outerStatus'"};if($conversationId-cnotmatch'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'){throw 'Conversation ID is not lowercase UUID'};if($null-eq$outer.structured_output){throw 'Missing structured output'};$transcriptSourcePath=Join-Path $TranscriptRoot "$conversationId\.system_generated\logs\transcript_full.jsonl";Assert-PathWithin $transcriptSourcePath $TranscriptRoot 'transcript source'|Out-Null;for($i=0;$i-lt 10-and-not(Test-Path -LiteralPath $transcriptSourcePath -PathType Leaf);$i++){Start-Sleep -Milliseconds 200};Assert-NoReparsePath $transcriptSourcePath 'transcript source' -RequireLeaf|Out-Null;Assert-IsolatedSettingsState;$tb=[IO.File]::ReadAllBytes($transcriptSourcePath);if($tb.Length-eq 0){throw 'Empty transcript'};[IO.File]::WriteAllBytes($TranscriptPath,$tb);Assert-Exact 'transcript hash' (Get-LowerSha256 $TranscriptPath) (Get-LowerSha256 $transcriptSourcePath);$transcriptSha256=Get-LowerSha256 $TranscriptPath}catch{$terminalInspectionError=$_.Exception.Message}}
$logSha256=$null;if(Test-Path -LiteralPath $LogPath -PathType Leaf){$logSha256=Get-LowerSha256 $LogPath;$lt=Get-Content -LiteralPath $LogPath -Raw;$expectedAppData='appDataDir='+(Split-Path -Parent $IsolatedGlobalSettingsPath);$isolationLogMarkerObserved=$lt.Contains($expectedAppData,[StringComparison]::OrdinalIgnoreCase);$canonicalPathMarkerObserved=$lt.Contains($CanonicalGeminiRoot,[StringComparison]::OrdinalIgnoreCase);$le=$null;foreach($m in @($expectedAppData,$ExpectedGlobalPermissionLogMarker,'model="gemini-3.1-pro-high"','Propagating selected model override to backend: label="Gemini 3.1 Pro (High)"','Starting new conversation (agent=false)',"Conversation using project ID: $ProjectId",$ExpectedProjectPermissionLogMarker)){if(-not$lt.Contains($m,[StringComparison]::OrdinalIgnoreCase)){$le="Missing isolated log marker: $m";break}};if($canonicalPathMarkerObserved){$le="Canonical Gemini state path observed: $CanonicalGeminiRoot"};foreach($m in @('Unknown field "permissionGrants"','cleared project permissions','Failed to resolve model flag','invalid model selection')){if($lt.Contains($m,[StringComparison]::OrdinalIgnoreCase)){$le="Forbidden log marker: $m";break}};if($null-eq$le){$projectPermissionGrantsLoaded=$true}elseif($null-eq$terminalInspectionError){$terminalInspectionError=$le}else{$terminalInspectionError="$terminalInspectionError | $le"}}
Assert-CanonicalSettingsState;Assert-IsolatedSettingsState
$receipt=[ordered]@{schema_version='2.0';assignment_id='LT-NATIVE-ANTIGRAVITY-ROBOT-003';idempotency_key='LT-NATIVE-ANTIGRAVITY-ROBOT-003-644d1b0-SEQUENCE26';project_id=$ProjectId;model='gemini-3.1-pro-high';effort='high';agent_mode='default-non-agent';control_head=$AuthorityControlHead;control_tree=$AuthorityControlTree;provider_head=$Expected.ProviderHead;provider_tree=$Expected.ProviderTree;process_exit_code=$processExitCode;outer_status=$outerStatus;conversation_id=$conversationId;provider_process_id=$providerProcessId;provider_start_time_utc_ticks=$providerStartTimeUtcTicks;provider_process_started_at=$providerProcessStartedAt;provider_resumed_at=$providerResumedAt;job_name=$JobObjectName;job_kill_on_close=$jobKillOnClose;created_with_job_list_attribute=[bool]$nativeLaunch.created_with_job_list_attribute;job_bound_before_resume=[bool]$nativeLaunch.job_bound_before_resume;job_assignment_confirmed_at=$jobAssignmentConfirmedAt;job_active_process_count_at_completion=$jobActiveProcessCountAtCompletion;job_empty_verified_at=$jobEmptyVerifiedAt;provider_identity_path=$ProviderIdentityPath;provider_identity_sha256=$providerIdentitySha256;prompt_delivery_timeout_seconds=$PromptDeliveryTimeoutSeconds;prompt_delivery_started_at=$promptDeliveryStartedAt;prompt_delivery_completed_at=$promptDeliveryCompletedAt;prompt_delivery_timed_out=$promptDeliveryTimedOut;parent_finally_job_disposition=$parentFinallyJobDisposition;parent_finally_job_error=$parentFinallyJobError;wrapper_timeout_seconds=$WrapperTimeoutSeconds;wrapper_timeout_triggered=$wrapperTimeoutTriggered;private_profile_root=$PrivateProfileRoot;isolated_gemini_root=$IsolatedGeminiRoot;isolated_global_settings_path=$IsolatedGlobalSettingsPath;isolated_global_settings_initial_sha256=$Expected.TemporaryGlobalSettingsSha256;isolated_global_settings_final_sha256=Get-LowerSha256 $IsolatedGlobalSettingsPath;isolated_project_settings_path=$IsolatedProjectSettingsPath;isolated_project_settings_initial_sha256=$Expected.TemporaryProjectSettingsSha256;isolated_project_settings_final_sha256=Get-LowerSha256 $IsolatedProjectSettingsPath;isolated_transcript_root=$TranscriptRoot;environment_contract_path=$EnvironmentContractPath;environment_contract_sha256=$script:EnvironmentContractSha256;environment_block_sha256_utf16le=$environmentBlockSha256;environment_key_set_sha256=$environmentKeySetSha256;environment_entry_count=$environmentEntryCount;create_unicode_environment=$true;environment_pointer_non_null=$true;profile_reparse_free=$profileReparseFree;canonical_global_settings_path=$CanonicalGlobalSettingsPath;canonical_global_settings_pre_sha256=$Expected.GlobalSettingsSha256;canonical_global_settings_post_sha256=Get-LowerSha256 $CanonicalGlobalSettingsPath;canonical_project_settings_path=$CanonicalProjectSettingsPath;canonical_project_settings_pre_sha256=$Expected.ProjectSettingsSha256;canonical_project_settings_post_sha256=Get-LowerSha256 $CanonicalProjectSettingsPath;canonical_settings_written=$false;isolation_app_data_log_marker_observed=$isolationLogMarkerObserved;canonical_gemini_path_log_marker_observed=$canonicalPathMarkerObserved;project_permission_grants_loaded=$projectPermissionGrantsLoaded;transaction_record_path=$RollbackRecordPath;transaction_record_sha256=$script:TransactionRecordSha256;guardian_script_path=$GuardianScriptPath;guardian_script_sha256=Get-LowerSha256 $GuardianScriptPath;guardian_process_id=$guardianProcess.Id;guardian_deadline_seconds=$GuardianDeadlineSeconds;guardian_deadline_at=$guardianDeadlineAt.ToString('o');guardian_ready_path=$GuardianReadyPath;guardian_ready_sha256=Get-LowerSha256 $GuardianReadyPath;guardian_done_path=$GuardianDonePath;guardian_done_sha256=Get-LowerSha256 $GuardianDonePath;guardian_done_status=$guardianDone.status;guardian_done_provider_process_disposition=$guardianDone.provider_process_disposition;guardian_done_completed_before_deadline=$guardianDone.completed_before_guardian_deadline;claim_path=$ClaimPath;claim_sha256=Get-LowerSha256 $ClaimPath;raw_result_path=$OutputPath;raw_result_sha256=Get-LowerSha256 $OutputPath;stderr_path=$ErrorPath;stderr_sha256=Get-LowerSha256 $ErrorPath;cli_log_path=$LogPath;cli_log_sha256=$logSha256;authenticated_transcript_source=$transcriptSourcePath;frozen_transcript_path=$TranscriptPath;frozen_transcript_sha256=$transcriptSha256;terminal_inspection_error=$terminalInspectionError;recorded_at=([datetimeoffset]::UtcNow).ToString('o')}|ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($ReceiptPath,($receipt+"`n"),$utf8NoBom);$re=Get-Content -LiteralPath $ReceiptPath -Raw|ConvertFrom-Json -Depth 100 -DateKind String
Assert-ExactPropertySet $re @('schema_version','assignment_id','idempotency_key','project_id','model','effort','agent_mode','control_head','control_tree','provider_head','provider_tree','process_exit_code','outer_status','conversation_id','provider_process_id','provider_start_time_utc_ticks','provider_process_started_at','provider_resumed_at','job_name','job_kill_on_close','created_with_job_list_attribute','job_bound_before_resume','job_assignment_confirmed_at','job_active_process_count_at_completion','job_empty_verified_at','provider_identity_path','provider_identity_sha256','prompt_delivery_timeout_seconds','prompt_delivery_started_at','prompt_delivery_completed_at','prompt_delivery_timed_out','parent_finally_job_disposition','parent_finally_job_error','wrapper_timeout_seconds','wrapper_timeout_triggered','private_profile_root','isolated_gemini_root','isolated_global_settings_path','isolated_global_settings_initial_sha256','isolated_global_settings_final_sha256','isolated_project_settings_path','isolated_project_settings_initial_sha256','isolated_project_settings_final_sha256','isolated_transcript_root','environment_contract_path','environment_contract_sha256','environment_block_sha256_utf16le','environment_key_set_sha256','environment_entry_count','create_unicode_environment','environment_pointer_non_null','profile_reparse_free','canonical_global_settings_path','canonical_global_settings_pre_sha256','canonical_global_settings_post_sha256','canonical_project_settings_path','canonical_project_settings_pre_sha256','canonical_project_settings_post_sha256','canonical_settings_written','isolation_app_data_log_marker_observed','canonical_gemini_path_log_marker_observed','project_permission_grants_loaded','transaction_record_path','transaction_record_sha256','guardian_script_path','guardian_script_sha256','guardian_process_id','guardian_deadline_seconds','guardian_deadline_at','guardian_ready_path','guardian_ready_sha256','guardian_done_path','guardian_done_sha256','guardian_done_status','guardian_done_provider_process_disposition','guardian_done_completed_before_deadline','claim_path','claim_sha256','raw_result_path','raw_result_sha256','stderr_path','stderr_sha256','cli_log_path','cli_log_sha256','authenticated_transcript_source','frozen_transcript_path','frozen_transcript_sha256','terminal_inspection_error','recorded_at') 'launch receipt'
Assert-Exact 'receipt canonical global' ([string]$re.canonical_global_settings_pre_sha256) ([string]$re.canonical_global_settings_post_sha256);Assert-Exact 'receipt canonical project' ([string]$re.canonical_project_settings_pre_sha256) ([string]$re.canonical_project_settings_post_sha256);Assert-Exact 'receipt canonical writes' ([string]$re.canonical_settings_written) 'False';Assert-Exact 'receipt Unicode env' ([string]$re.create_unicode_environment) 'True';Assert-Exact 'receipt env pointer' ([string]$re.environment_pointer_non_null) 'True';Assert-Exact 'receipt reparse-free' ([string]$re.profile_reparse_free) 'True';Assert-Exact 'receipt isolated appData' ([string]$re.isolation_app_data_log_marker_observed) 'True';Assert-Exact 'receipt canonical marker' ([string]$re.canonical_gemini_path_log_marker_observed) 'False';Assert-Exact 'receipt job empty' ([string]$re.job_active_process_count_at_completion) '0';Assert-Exact 'receipt guardian deadline' ([string]$re.guardian_done_completed_before_deadline) 'True'
Assert-Exact 'receipt guardian disposition' ([string]$re.guardian_done_provider_process_disposition) 'JOB_ALREADY_EMPTY'
if($processExitCode-ne 0){throw "Antigravity primary exited $processExitCode; isolated evidence frozen"};if($null-ne$terminalInspectionError){throw "Antigravity provenance failed closed: $terminalInspectionError"};if($null-eq$logSha256){throw 'Antigravity log unavailable'};$stdout.TrimEnd()
# [[OpenAI Director | Codex | 2026-08-31 | 07:30 UTC | END]]
# [[OpenAI Director | Codex | 2026-08-31 | 14:34 UTC | END]]
