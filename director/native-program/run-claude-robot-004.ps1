# [[OpenAI Director | Codex | 2026-08-31 | SEQUENCE 28 | BEGIN]]
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedControlHead,
    [switch]$PreflightOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ControlRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ProviderRoot = 'C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-claude-004-clean'
$ClaudeExe = 'C:\Users\edwar\.local\bin\claude.exe'
$PacketPath = Join-Path $ControlRoot 'director\native-program\packets\LT-NATIVE-CLAUDE-ROBOT-004.json'
$PromptPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28.prompt.md'
$ContractPath = Join-Path $ProviderRoot 'PUBLIC_CONTRACT.json'
$FixturesPath = Join-Path $ProviderRoot 'PUBLIC_FIXTURES.json'
$SchemaPath = Join-Path $ProviderRoot 'RESULT_SCHEMA.json'
$OutputPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-cli-output.json'
$ErrorPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-cli-stderr.txt'
$StructuredResultPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-structured-result.json'
$SourceManifestPath = Join-Path $ControlRoot 'artifacts\native-program\qa\LT-NATIVE-CLAUDE-ROBOT-004.source-manifest.json'
$ReceiptPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-run-receipt.json'
$ClaimPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-primary-claim.json'
$LaunchIdentityPath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-process-identity.json'
$ResumePath = Join-Path $ControlRoot 'artifacts\native-program\providers\LT-NATIVE-CLAUDE-ROBOT-004.sequence-28-process-resumed.json'
$TimeoutMilliseconds = 5400000

$ExpectedPacketSha256 = '0153c630cc7302965e57743d5316f7a4a0981ede3d0c6dd0339764ad12f874ec'
$ExpectedPromptSha256 = '8e5a00251764a5161ba31b107334e5ae5aebea83048e0c700690ce8d118e3292'
$ExpectedContractSha256 = '3668f7e5bcdb9fc32d06fef76fdbd7eef0f96597f89449607c92ff997dbd34c9'
$ExpectedFixturesSha256 = 'b437a31c6203c6e8f2fa402c836a6c4340d8e739d55d2040c9d1ba9d5b1a3e23'
$ExpectedSchemaSha256 = 'ebadc5bc45462ffa63ca5e6b28c09d1ccf86086389324a0c88f704bb14208d9c'
$ExpectedProviderHead = 'a5ffeb93391c071d76c26a7459e4bc24724538f4'
$RetiredProviderHead = '21f7b2aad3080a733da4f8a7e195d5d008db1a12'
$ExpectedProviderTree = '91710e74f905a21afe56ef3ad4c62af2d6b44dc5'
$ExpectedProviderBranch = 'codex/claude-robot-cleanroom-004'
$ExpectedAuthorityDigest = 'sha256:a171b144d499d289382feec34c108580ba6dca64d7106fb601c31822942dcf7a'
$ExpectedAssignment = 'LT-NATIVE-CLAUDE-ROBOT-004'
$ExpectedTask = 'LT-NATIVE-PROGRAM-20260830'
$ExpectedIdempotency = 'LT-NATIVE-CLAUDE-ROBOT-004-a5ffeb9-SEQUENCE28'
$ExpectedSourceEvent = 'owner-authorized-complete-all-large-chunks-20260831'
$ExpectedRemoteRef = 'refs/heads/codex/native-first-deal'
$Utf8NoBom = [Text.UTF8Encoding]::new($false)
$Utf8Strict = [Text.UTF8Encoding]::new($false, $true)

$ExpectedOutputPaths = @(
    'LongTableRobotDealer/LongTableRobotDealer.uplugin',
    'LongTableRobotDealer/README.md',
    'LongTableRobotDealer/Source/LongTableRobotDealer/LongTableRobotDealer.Build.cs',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Public/LongTableRobotDealerCueInterface.h',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Public/LongTableRobotDealerPresenter.h',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Private/LongTableRobotDealerModule.cpp',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Private/LongTableRobotDealerPresenter.cpp',
    'LongTableRobotDealer/Source/LongTableRobotDealer/Private/Tests/LongTableRobotDealerTests.cpp'
)
$ExpectedTrackedPaths = @('PUBLIC_CONTRACT.json', 'PUBLIC_FIXTURES.json', 'RESULT_SCHEMA.json')
$CodeBeginMarker = '// [[Claude | Fable 5 | 2026-08-31 | LT-NATIVE-CLAUDE-ROBOT-004 | BEGIN]]'
$CodeEndMarker = '// [[Claude | Fable 5 | 2026-08-31 | LT-NATIVE-CLAUDE-ROBOT-004 | END]]'
$ReadmeBeginMarker = '<!-- [[Claude | Fable 5 | 2026-08-31 | LT-NATIVE-CLAUDE-ROBOT-004 | BEGIN]] -->'
$ReadmeEndMarker = '<!-- [[Claude | Fable 5 | 2026-08-31 | LT-NATIVE-CLAUDE-ROBOT-004 | END]] -->'
$CopiedEnvironmentNames = @(
    'SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP',
    'USERPROFILE', 'HOME', 'APPDATA', 'LOCALAPPDATA', 'ProgramData',
    'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'OS',
    'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS'
)
$ForcedEnvironmentNames = @(
    'CLAUDE_CODE_DISABLE_AUTO_MEMORY', 'CLAUDE_CODE_DISABLE_ORG_MEMORY',
    'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'DISABLE_TELEMETRY'
)
$ExpectedEnvironmentNames = $CopiedEnvironmentNames + $ForcedEnvironmentNames

if (-not ('LongTable.Sequence28NativeMethods' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace LongTable {
    public static class Sequence28NativeMethods {
        public const uint CREATE_SUSPENDED = 0x00000004;
        public const uint CREATE_NO_WINDOW = 0x08000000;
        public const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
        public const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
        public const uint STARTF_USESTDHANDLES = 0x00000100;
        public const uint HANDLE_FLAG_INHERIT = 0x00000001;
        public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
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
        public static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetInformationJobObject(IntPtr job, int infoClass,
            ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint length);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool QueryInformationJobObject(IntPtr job, int infoClass,
            ref JOBOBJECT_BASIC_ACCOUNTING_INFORMATION info, uint length, IntPtr returnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool QueryInformationJobObject(IntPtr job, int infoClass,
            ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint length, IntPtr returnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool TerminateJobObject(IntPtr job, uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool CloseHandle(IntPtr handle);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool CreatePipe(out IntPtr readPipe, out IntPtr writePipe,
            ref SECURITY_ATTRIBUTES attributes, uint size);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool CreateProcessW(string applicationName, StringBuilder commandLine,
            IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles,
            uint creationFlags, IntPtr environment, string currentDirectory,
            ref STARTUPINFOEX startupInfo, out PROCESS_INFORMATION processInformation);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool InitializeProcThreadAttributeList(IntPtr attributeList,
            int attributeCount, int flags, ref IntPtr size);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool UpdateProcThreadAttribute(IntPtr attributeList, uint flags,
            IntPtr attribute, IntPtr value, IntPtr size, IntPtr previousValue, IntPtr returnSize);

        [DllImport("kernel32.dll")]
        public static extern void DeleteProcThreadAttributeList(IntPtr attributeList);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern uint ResumeThread(IntPtr thread);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsProcessInJob(IntPtr process, IntPtr job,
            [MarshalAs(UnmanagedType.Bool)] out bool result);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetProcessTimes(IntPtr process, out NATIVE_FILETIME creation,
            out NATIVE_FILETIME exit, out NATIVE_FILETIME kernel, out NATIVE_FILETIME user);
    }
}
'@
}

function Invoke-Git([string]$Root, [string[]]$GitArgs) {
    $output = & git -C $Root @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    return ($output -join "`n").Trim()
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Get-TextSha256([string]$Value) {
    $hasher = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($hasher.ComputeHash($Utf8NoBom.GetBytes($Value)))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $hasher.Dispose()
    }
}

function Assert-Sha256([string]$Path, [string]$Expected) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is unavailable: $Path"
    }
    $actual = Get-Sha256 $Path
    if ($actual -cne $Expected) {
        throw "SHA-256 mismatch for $Path. Expected $Expected, received $actual."
    }
}

function Assert-OrderedStrings([string[]]$Actual, [string[]]$Expected, [string]$Label) {
    if ($Actual.Count -ne $Expected.Count) {
        throw "$Label count mismatch."
    }
    for ($index = 0; $index -lt $Expected.Count; $index++) {
        if ($Actual[$index] -cne $Expected[$index]) {
            throw "$Label mismatch at index $index."
        }
    }
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
    Write-NewBytes -Path $Path -Bytes $Utf8NoBom.GetBytes($Text)
}

function Get-NativeError([string]$Operation) {
    $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    return "$Operation failed with Win32 error $code ($([ComponentModel.Win32Exception]::new($code).Message))."
}

function Close-NativeHandle([IntPtr]$Handle) {
    if ($Handle -ne [IntPtr]::Zero -and $Handle -ne [IntPtr](-1)) {
        [void][LongTable.Sequence28NativeMethods]::CloseHandle($Handle)
    }
}

function Get-JobActiveProcessCount([IntPtr]$JobHandle) {
    $accounting = [LongTable.Sequence28NativeMethods+JOBOBJECT_BASIC_ACCOUNTING_INFORMATION]::new()
    $size = [uint32][Runtime.InteropServices.Marshal]::SizeOf($accounting)
    if (-not [LongTable.Sequence28NativeMethods]::QueryInformationJobObject(
        $JobHandle,
        [LongTable.Sequence28NativeMethods]::JobObjectBasicAccountingInformation,
        [ref]$accounting,
        $size,
        [IntPtr]::Zero
    )) { throw (Get-NativeError 'QueryInformationJobObject(accounting)') }
    return [int]$accounting.ActiveProcesses
}

function New-KillOnCloseJob {
    $handle = [LongTable.Sequence28NativeMethods]::CreateJobObjectW([IntPtr]::Zero, $null)
    if ($handle -eq [IntPtr]::Zero) { throw (Get-NativeError 'CreateJobObjectW') }
    try {
        $limits = [LongTable.Sequence28NativeMethods+JOBOBJECT_EXTENDED_LIMIT_INFORMATION]::new()
        $basic = $limits.BasicLimitInformation
        $basic.LimitFlags = [LongTable.Sequence28NativeMethods]::JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        $limits.BasicLimitInformation = $basic
        $size = [uint32][Runtime.InteropServices.Marshal]::SizeOf($limits)
        if (-not [LongTable.Sequence28NativeMethods]::SetInformationJobObject(
            $handle,
            [LongTable.Sequence28NativeMethods]::JobObjectExtendedLimitInformation,
            [ref]$limits,
            $size
        )) { throw (Get-NativeError 'SetInformationJobObject(KILL_ON_JOB_CLOSE)') }
        $verified = [LongTable.Sequence28NativeMethods+JOBOBJECT_EXTENDED_LIMIT_INFORMATION]::new()
        if (-not [LongTable.Sequence28NativeMethods]::QueryInformationJobObject(
            $handle,
            [LongTable.Sequence28NativeMethods]::JobObjectExtendedLimitInformation,
            [ref]$verified,
            [uint32][Runtime.InteropServices.Marshal]::SizeOf($verified),
            [IntPtr]::Zero
        )) { throw (Get-NativeError 'QueryInformationJobObject(limits)') }
        if (($verified.BasicLimitInformation.LimitFlags -band [LongTable.Sequence28NativeMethods]::JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE) -eq 0) {
            throw 'Provider job did not retain KILL_ON_JOB_CLOSE.'
        }
        if ((Get-JobActiveProcessCount $handle) -ne 0) { throw 'Fresh provider job is not empty.' }
        return $handle
    }
    catch {
        Close-NativeHandle $handle
        throw
    }
}

function ConvertTo-WindowsCommandLineArgument([string]$Value) {
    if ($null -eq $Value -or $Value.Length -eq 0) { return '""' }
    $requiresQuotes = $Value.Contains('"')
    foreach ($character in $Value.ToCharArray()) {
        if ([char]::IsWhiteSpace($character)) { $requiresQuotes = $true; break }
    }
    if (-not $requiresQuotes) { return $Value }
    $builder = [Text.StringBuilder]::new()
    [void]$builder.Append('"')
    $slashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') { $slashes++; continue }
        if ($character -eq '"') {
            [void]$builder.Append(('\' * (($slashes * 2) + 1)))
            [void]$builder.Append('"')
        }
        else {
            if ($slashes -gt 0) { [void]$builder.Append(('\' * $slashes)) }
            [void]$builder.Append($character)
        }
        $slashes = 0
    }
    if ($slashes -gt 0) { [void]$builder.Append(('\' * ($slashes * 2))) }
    [void]$builder.Append('"')
    return $builder.ToString()
}

function New-NativePipePair([bool]$ParentReads) {
    $attributes = [LongTable.Sequence28NativeMethods+SECURITY_ATTRIBUTES]::new()
    $attributes.nLength = [Runtime.InteropServices.Marshal]::SizeOf($attributes)
    $attributes.bInheritHandle = $true
    $readHandle = [IntPtr]::Zero
    $writeHandle = [IntPtr]::Zero
    if (-not [LongTable.Sequence28NativeMethods]::CreatePipe([ref]$readHandle, [ref]$writeHandle, [ref]$attributes, 0)) {
        throw (Get-NativeError 'CreatePipe')
    }
    $parentHandle = if ($ParentReads) { $readHandle } else { $writeHandle }
    if (-not [LongTable.Sequence28NativeMethods]::SetHandleInformation(
        $parentHandle,
        [LongTable.Sequence28NativeMethods]::HANDLE_FLAG_INHERIT,
        0
    )) {
        $error = Get-NativeError 'SetHandleInformation(parent pipe)'
        Close-NativeHandle $readHandle
        Close-NativeHandle $writeHandle
        throw $error
    }
    return [pscustomobject][ordered]@{
        parent_handle = $parentHandle
        child_handle = if ($ParentReads) { $writeHandle } else { $readHandle }
    }
}

function New-ProviderEnvironmentBlock {
    $environment = [Collections.Generic.SortedDictionary[string,string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($name in $CopiedEnvironmentNames) {
        $value = [Environment]::GetEnvironmentVariable($name, [EnvironmentVariableTarget]::Process)
        if ($null -ne $value) { $environment[$name] = $value }
    }
    $environment['CLAUDE_CODE_DISABLE_AUTO_MEMORY'] = '1'
    $environment['CLAUDE_CODE_DISABLE_ORG_MEMORY'] = '1'
    $environment['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'] = '1'
    $environment['DISABLE_TELEMETRY'] = '1'
    $rows = @($environment.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" })
    foreach ($row in $rows) {
        if ($row.Contains([char]0)) { throw 'Provider environment row contains a null character.' }
    }
    $bytes = [Text.Encoding]::Unicode.GetBytes(([string]::Join([char]0, $rows)) + [char]0 + [char]0)
    $pointer = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pointer, $bytes.Length)
    return $pointer
}

function New-NativeLaunchContext([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [IntPtr]$JobHandle) {
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
        $context.environment_block = New-ProviderEnvironmentBlock
        $stdin = New-NativePipePair $false
        $stdout = New-NativePipePair $true
        $stderr = New-NativePipePair $true
        $context.stdin_child_handle = $stdin.child_handle
        $context.stdin_parent_handle = $stdin.parent_handle
        $context.stdout_child_handle = $stdout.child_handle
        $context.stdout_parent_handle = $stdout.parent_handle
        $context.stderr_child_handle = $stderr.child_handle
        $context.stderr_parent_handle = $stderr.parent_handle
        $context.command_line = ((@($FilePath) + @($Arguments)) | ForEach-Object { ConvertTo-WindowsCommandLineArgument $_ }) -join ' '

        $attributeBytes = [IntPtr]::Zero
        [void][LongTable.Sequence28NativeMethods]::InitializeProcThreadAttributeList([IntPtr]::Zero, 2, 0, [ref]$attributeBytes)
        if ($attributeBytes -eq [IntPtr]::Zero) { throw (Get-NativeError 'InitializeProcThreadAttributeList(size)') }
        $context.attribute_list = [Runtime.InteropServices.Marshal]::AllocHGlobal($attributeBytes)
        if (-not [LongTable.Sequence28NativeMethods]::InitializeProcThreadAttributeList($context.attribute_list, 2, 0, [ref]$attributeBytes)) {
            throw (Get-NativeError 'InitializeProcThreadAttributeList')
        }
        $context.attribute_list_initialized = $true
        $context.job_attribute_value = [Runtime.InteropServices.Marshal]::AllocHGlobal([IntPtr]::Size)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.job_attribute_value, $JobHandle)
        if (-not [LongTable.Sequence28NativeMethods]::UpdateProcThreadAttribute(
            $context.attribute_list, 0,
            [IntPtr][LongTable.Sequence28NativeMethods]::PROC_THREAD_ATTRIBUTE_JOB_LIST,
            $context.job_attribute_value, [IntPtr][IntPtr]::Size,
            [IntPtr]::Zero, [IntPtr]::Zero
        )) { throw (Get-NativeError 'UpdateProcThreadAttribute(JOB_LIST)') }
        $context.handle_list_attribute_value = [Runtime.InteropServices.Marshal]::AllocHGlobal([IntPtr]::Size * 3)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.handle_list_attribute_value, 0, $context.stdin_child_handle)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.handle_list_attribute_value, [IntPtr]::Size, $context.stdout_child_handle)
        [Runtime.InteropServices.Marshal]::WriteIntPtr($context.handle_list_attribute_value, [IntPtr]::Size * 2, $context.stderr_child_handle)
        if (-not [LongTable.Sequence28NativeMethods]::UpdateProcThreadAttribute(
            $context.attribute_list, 0,
            [IntPtr][LongTable.Sequence28NativeMethods]::PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
            $context.handle_list_attribute_value, [IntPtr]([IntPtr]::Size * 3),
            [IntPtr]::Zero, [IntPtr]::Zero
        )) { throw (Get-NativeError 'UpdateProcThreadAttribute(HANDLE_LIST)') }
        return $context
    }
    catch {
        Close-NativeLaunchContext $context
        throw
    }
}

function Close-NativeLaunchContext([object]$Context) {
    if ($null -eq $Context) { return }
    foreach ($name in @('stdin_writer', 'stdout_reader', 'stderr_reader')) {
        if ($null -ne $Context.$name) { try { $Context.$name.Dispose() } catch { }; $Context.$name = $null }
    }
    foreach ($name in @(
        'stdin_child_handle', 'stdin_parent_handle', 'stdout_child_handle',
        'stdout_parent_handle', 'stderr_child_handle', 'stderr_parent_handle',
        'primary_thread_handle'
    )) {
        $handle = [IntPtr]$Context.$name
        if ($handle -ne [IntPtr]::Zero) { Close-NativeHandle $handle; $Context.$name = [IntPtr]::Zero }
    }
    if ([bool]$Context.attribute_list_initialized -and $Context.attribute_list -ne [IntPtr]::Zero) {
        [LongTable.Sequence28NativeMethods]::DeleteProcThreadAttributeList($Context.attribute_list)
        $Context.attribute_list_initialized = $false
    }
    foreach ($name in @('attribute_list', 'job_attribute_value', 'handle_list_attribute_value', 'environment_block')) {
        $pointer = [IntPtr]$Context.$name
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::FreeHGlobal($pointer); $Context.$name = [IntPtr]::Zero }
    }
}

function Start-SuspendedJobBoundProcess([object]$Context, [IntPtr]$JobHandle) {
    $startupInfo = [LongTable.Sequence28NativeMethods+STARTUPINFO]::new()
    $startupInfo.dwFlags = [LongTable.Sequence28NativeMethods]::STARTF_USESTDHANDLES
    $startupInfo.hStdInput = $Context.stdin_child_handle
    $startupInfo.hStdOutput = $Context.stdout_child_handle
    $startupInfo.hStdError = $Context.stderr_child_handle
    $startup = [LongTable.Sequence28NativeMethods+STARTUPINFOEX]::new()
    $startupInfo.cb = [Runtime.InteropServices.Marshal]::SizeOf($startup)
    $startup.StartupInfo = $startupInfo
    $startup.lpAttributeList = $Context.attribute_list
    $processInfo = [LongTable.Sequence28NativeMethods+PROCESS_INFORMATION]::new()
    $commandLine = [Text.StringBuilder]::new([string]$Context.command_line)
    $flags = [LongTable.Sequence28NativeMethods]::CREATE_SUSPENDED -bor
        [LongTable.Sequence28NativeMethods]::CREATE_NO_WINDOW -bor
        [LongTable.Sequence28NativeMethods]::EXTENDED_STARTUPINFO_PRESENT -bor
        [LongTable.Sequence28NativeMethods]::CREATE_UNICODE_ENVIRONMENT
    $created = [LongTable.Sequence28NativeMethods]::CreateProcessW(
        [string]$Context.file_path, $commandLine,
        [IntPtr]::Zero, [IntPtr]::Zero, $true, $flags,
        $Context.environment_block, [string]$Context.working_directory,
        [ref]$startup, [ref]$processInfo
    )
    foreach ($name in @('stdin_child_handle', 'stdout_child_handle', 'stderr_child_handle')) {
        Close-NativeHandle ([IntPtr]$Context.$name)
        $Context.$name = [IntPtr]::Zero
    }
    if (-not $created) { throw (Get-NativeError 'CreateProcessW(CREATE_SUSPENDED)') }
    try {
        $isInJob = $false
        if (-not [LongTable.Sequence28NativeMethods]::IsProcessInJob($processInfo.hProcess, $JobHandle, [ref]$isInJob) -or -not $isInJob) {
            throw 'Suspended provider is not bound to the kill-on-close job.'
        }
        $creation = [LongTable.Sequence28NativeMethods+NATIVE_FILETIME]::new()
        $exit = [LongTable.Sequence28NativeMethods+NATIVE_FILETIME]::new()
        $kernel = [LongTable.Sequence28NativeMethods+NATIVE_FILETIME]::new()
        $user = [LongTable.Sequence28NativeMethods+NATIVE_FILETIME]::new()
        if (-not [LongTable.Sequence28NativeMethods]::GetProcessTimes($processInfo.hProcess, [ref]$creation, [ref]$exit, [ref]$kernel, [ref]$user)) {
            throw (Get-NativeError 'GetProcessTimes(provider)')
        }
        $fileTime = ([long]$creation.dwHighDateTime -shl 32) -bor [uint32]$creation.dwLowDateTime
        $createdAt = [datetime]::FromFileTimeUtc($fileTime)
        $process = [Diagnostics.Process]::GetProcessById([int]$processInfo.dwProcessId)
        $null = $process.Handle

        $stdinSafe = [Microsoft.Win32.SafeHandles.SafeFileHandle]::new($Context.stdin_parent_handle, $true)
        $Context.stdin_parent_handle = [IntPtr]::Zero
        $Context.stdin_writer = [IO.StreamWriter]::new([IO.FileStream]::new($stdinSafe, [IO.FileAccess]::Write, 4096, $false), $Utf8NoBom, 4096, $false)
        $stdoutSafe = [Microsoft.Win32.SafeHandles.SafeFileHandle]::new($Context.stdout_parent_handle, $true)
        $Context.stdout_parent_handle = [IntPtr]::Zero
        $Context.stdout_reader = [IO.StreamReader]::new([IO.FileStream]::new($stdoutSafe, [IO.FileAccess]::Read, 4096, $false), $Utf8NoBom, $true, 4096, $false)
        $stderrSafe = [Microsoft.Win32.SafeHandles.SafeFileHandle]::new($Context.stderr_parent_handle, $true)
        $Context.stderr_parent_handle = [IntPtr]::Zero
        $Context.stderr_reader = [IO.StreamReader]::new([IO.FileStream]::new($stderrSafe, [IO.FileAccess]::Read, 4096, $false), $Utf8NoBom, $true, 4096, $false)
        $Context.primary_thread_handle = $processInfo.hThread
        $processInfo.hThread = [IntPtr]::Zero
        return [pscustomobject][ordered]@{
            process = $process
            process_id = [int]$processInfo.dwProcessId
            started_at = ([datetimeoffset]$createdAt).ToString('o')
            start_time_utc_ticks = $createdAt.Ticks
            job_bound_before_resume = $true
        }
    }
    catch {
        [void][LongTable.Sequence28NativeMethods]::TerminateJobObject($JobHandle, [uint32]::MaxValue)
        throw
    }
    finally {
        Close-NativeHandle $processInfo.hProcess
        Close-NativeHandle $processInfo.hThread
    }
}

function Resume-NativeProcess([object]$Context) {
    $result = [LongTable.Sequence28NativeMethods]::ResumeThread($Context.primary_thread_handle)
    if ($result -eq [uint32]::MaxValue) { throw (Get-NativeError 'ResumeThread(provider)') }
    Close-NativeHandle $Context.primary_thread_handle
    $Context.primary_thread_handle = [IntPtr]::Zero
}

function Assert-ProviderAuthority([pscustomobject]$Packet) {
    if ((Invoke-Git $ProviderRoot @('rev-parse', 'HEAD')) -cne $ExpectedProviderHead) {
        throw 'Provider HEAD mismatch.'
    }
    if ((Invoke-Git $ProviderRoot @('rev-parse', 'HEAD^{tree}')) -cne $ExpectedProviderTree) {
        throw 'Provider tree mismatch.'
    }
    if ((Invoke-Git $ProviderRoot @('branch', '--show-current')) -cne $ExpectedProviderBranch) {
        throw 'Provider branch mismatch.'
    }
    if ((Invoke-Git $ProviderRoot @('remote')) -cne '') {
        throw 'Provider sandbox unexpectedly has a remote.'
    }
    if ((Invoke-Git $ProviderRoot @('rev-list', '--parents', '--max-count=1', 'HEAD')) -cne $ExpectedProviderHead) {
        throw 'Provider authority commit is not the expected root commit.'
    }
    $identityLines = @((Invoke-Git $ProviderRoot @('show', '-s', '--format=%an%n%ae%n%cn%n%ce', 'HEAD')) -split "`n")
    Assert-OrderedStrings $identityLines @('OpenAI Director', 'director@local.invalid', 'OpenAI Director', 'director@local.invalid') 'Provider commit identity'
    $configLines = @((Invoke-Git $ProviderRoot @('config', '--local', '--list')) -split "`n")
    $expectedConfigLines = @(
        'core.repositoryformatversion=0',
        'core.filemode=false',
        'core.bare=false',
        'core.logallrefupdates=true',
        'core.symlinks=false',
        'core.ignorecase=true',
        'user.name=OpenAI Director',
        'user.email=director@local.invalid'
    )
    Assert-OrderedStrings $configLines $expectedConfigLines 'Provider local Git configuration'
    if ((Invoke-Git $ProviderRoot @('reflog', 'show', '--all')) -cne '') {
        throw 'Provider reflog must remain empty.'
    }
    if ((Invoke-Git $ProviderRoot @('fsck', '--full', '--no-reflogs', '--unreachable')) -cne '') {
        throw 'Provider Git object store contains unreachable history.'
    }
    & git -C $ProviderRoot cat-file -e "$RetiredProviderHead^{commit}" 2>$null
    if ($LASTEXITCODE -eq 0) { throw 'Retired pre-sanitization provider object is still reachable in the object store.' }

    $tracked = @((Invoke-Git $ProviderRoot @('ls-files')) -split "`n" | Where-Object { $_ -cne '' })
    Assert-OrderedStrings $tracked $ExpectedTrackedPaths 'Provider tracked authority inventory'

    Assert-Sha256 $ContractPath $ExpectedContractSha256
    Assert-Sha256 $FixturesPath $ExpectedFixturesSha256
    Assert-Sha256 $SchemaPath $ExpectedSchemaSha256

    $actualRows = @(
        "PUBLIC_CONTRACT.json|sha256:$ExpectedContractSha256|blob:$((Invoke-Git $ProviderRoot @('rev-parse', 'HEAD:PUBLIC_CONTRACT.json')))",
        "PUBLIC_FIXTURES.json|sha256:$ExpectedFixturesSha256|blob:$((Invoke-Git $ProviderRoot @('rev-parse', 'HEAD:PUBLIC_FIXTURES.json')))",
        "RESULT_SCHEMA.json|sha256:$ExpectedSchemaSha256|blob:$((Invoke-Git $ProviderRoot @('rev-parse', 'HEAD:RESULT_SCHEMA.json')))"
    )
    $actualCanonicalLines = @(
        "branch=$ExpectedProviderBranch",
        "head=$ExpectedProviderHead",
        "tree=$ExpectedProviderTree"
    ) + $actualRows
    $packetCanonicalLines = @($Packet.authority_snapshot.canonical_lines | ForEach-Object { [string]$_ })
    Assert-OrderedStrings $packetCanonicalLines $actualCanonicalLines 'Authority canonical lines'
    $actualDigest = 'sha256:' + (Get-TextSha256 ([string]::Join([string][char]10, $actualCanonicalLines)))
    if ($actualDigest -cne $ExpectedAuthorityDigest -or $Packet.authority_snapshot.digest -cne $actualDigest) {
        throw 'Authority canonical digest mismatch.'
    }

    $packetRows = @($Packet.authority_snapshot.files)
    if ($packetRows.Count -ne 3) { throw 'Packet authority row count mismatch.' }
    $expectedByteCounts = @(8592L, 17128L, 4148L)
    $expectedShas = @($ExpectedContractSha256, $ExpectedFixturesSha256, $ExpectedSchemaSha256)
    $expectedBlobs = @(
        (Invoke-Git $ProviderRoot @('rev-parse', 'HEAD:PUBLIC_CONTRACT.json')),
        (Invoke-Git $ProviderRoot @('rev-parse', 'HEAD:PUBLIC_FIXTURES.json')),
        (Invoke-Git $ProviderRoot @('rev-parse', 'HEAD:RESULT_SCHEMA.json'))
    )
    for ($index = 0; $index -lt 3; $index++) {
        if ($packetRows[$index].path -cne $ExpectedTrackedPaths[$index] -or
            [int64]$packetRows[$index].bytes -ne $expectedByteCounts[$index] -or
            $packetRows[$index].sha256 -cne ('sha256:' + $expectedShas[$index]) -or
            $packetRows[$index].git_blob -cne $expectedBlobs[$index]) {
            throw "Packet authority row mismatch at index $index."
        }
    }
}

function Get-OutputInventory {
    $outputRoot = Join-Path $ProviderRoot 'LongTableRobotDealer'
    if (-not (Test-Path -LiteralPath $outputRoot)) { return @() }
    if (-not (Test-Path -LiteralPath $outputRoot -PathType Container)) {
        throw 'Provider output root is not a directory.'
    }
    $entries = @(Get-ChildItem -LiteralPath $outputRoot -Force -Recurse)
    foreach ($entry in $entries) {
        if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Reparse point is prohibited in provider output: $($entry.FullName)"
        }
    }
    return @($entries | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
        [IO.Path]::GetRelativePath($ProviderRoot, $_.FullName).Replace('\', '/')
    } | Sort-Object)
}

function Assert-Descriptor([string]$Path) {
    $text = $Utf8Strict.GetString([IO.File]::ReadAllBytes($Path))
    $document = [Text.Json.JsonDocument]::Parse($text)
    try {
        $root = $document.RootElement
        if ($root.ValueKind -ne [Text.Json.JsonValueKind]::Object) { throw 'Plugin descriptor must be an object.' }
        $properties = @($root.EnumerateObject())
        $expectedProperties = @('FileVersion', 'Version', 'VersionName', 'FriendlyName', 'Description', 'Category', 'CanContainContent', 'IsBetaVersion', 'Installed', 'EnabledByDefault', 'Modules')
        $actualProperties = @($properties | ForEach-Object { $_.Name })
        Assert-OrderedStrings (@($actualProperties | Sort-Object)) (@($expectedProperties | Sort-Object)) 'Plugin descriptor properties'
        if ($root.GetProperty('FileVersion').GetInt32() -ne 3) { throw 'Descriptor FileVersion mismatch.' }
        if ($root.GetProperty('Version').GetInt32() -ne 1) { throw 'Descriptor Version mismatch.' }
        if ($root.GetProperty('VersionName').GetString() -cne '1.0.0') { throw 'Descriptor VersionName mismatch.' }
        if ($root.GetProperty('FriendlyName').GetString() -cne 'Long Table Robot Dealer') { throw 'Descriptor FriendlyName mismatch.' }
        if ($root.GetProperty('Description').GetString() -cne 'Original rights-clean presentation-only robot dealer for The Long Table.') { throw 'Descriptor Description mismatch.' }
        if ($root.GetProperty('Category').GetString() -cne 'Long Table') { throw 'Descriptor Category mismatch.' }
        foreach ($falseProperty in @('CanContainContent', 'IsBetaVersion', 'Installed')) {
            if ($root.GetProperty($falseProperty).GetBoolean()) { throw "Descriptor $falseProperty mismatch." }
        }
        if (-not $root.GetProperty('EnabledByDefault').GetBoolean()) { throw 'Descriptor EnabledByDefault mismatch.' }
        $modules = $root.GetProperty('Modules')
        if ($modules.ValueKind -ne [Text.Json.JsonValueKind]::Array -or $modules.GetArrayLength() -ne 1) {
            throw 'Descriptor module inventory mismatch.'
        }
        $module = $modules[0]
        $moduleProperties = @($module.EnumerateObject() | ForEach-Object { $_.Name })
        Assert-OrderedStrings (@($moduleProperties | Sort-Object)) (@('LoadingPhase', 'Name', 'Type')) 'Descriptor module properties'
        if ($module.GetProperty('Name').GetString() -cne 'LongTableRobotDealer' -or
            $module.GetProperty('Type').GetString() -cne 'Runtime' -or
            $module.GetProperty('LoadingPhase').GetString() -cne 'Default') {
            throw 'Descriptor module row mismatch.'
        }
    }
    finally {
        $document.Dispose()
    }
}

function Get-ValidatedSourceManifestEntry([string]$RelativePath) {
    $path = Join-Path $ProviderRoot $RelativePath.Replace('/', '\')
    $bytes = [IO.File]::ReadAllBytes($path)
    if ($bytes.Length -lt 2) { throw "Output file is empty or too short: $RelativePath" }
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        throw "UTF-8 BOM is prohibited: $RelativePath"
    }
    if ([Array]::IndexOf($bytes, [byte]0x0D) -ge 0) { throw "CR byte is prohibited: $RelativePath" }
    if ($bytes[$bytes.Length - 1] -ne 0x0A -or $bytes[$bytes.Length - 2] -eq 0x0A) {
        throw "Exactly one final LF is required: $RelativePath"
    }
    try { $text = $Utf8Strict.GetString($bytes) }
    catch { throw "Strict UTF-8 decoding failed: $RelativePath" }

    $provenance = 'descriptor-no-comment'
    if ($RelativePath -cne 'LongTableRobotDealer/LongTableRobotDealer.uplugin') {
        $content = $text.Substring(0, $text.Length - 1)
        $lines = @($content.Split("`n", [StringSplitOptions]::None))
        $isReadme = $RelativePath -ceq 'LongTableRobotDealer/README.md'
        $beginMarker = if ($isReadme) { $ReadmeBeginMarker } else { $CodeBeginMarker }
        $endMarker = if ($isReadme) { $ReadmeEndMarker } else { $CodeEndMarker }
        $beginCount = @($lines | Where-Object { $_ -ceq $beginMarker }).Count
        $endCount = @($lines | Where-Object { $_ -ceq $endMarker }).Count
        if ($lines[0] -cne $beginMarker -or $lines[$lines.Count - 1] -cne $endMarker -or $beginCount -ne 1 -or $endCount -ne 1) {
            throw "Provenance marker boundary or count mismatch: $RelativePath"
        }
        $provenance = 'exact-boundary-marker-pair'
    }
    else {
        Assert-Descriptor $path
    }

    return [ordered]@{
        path = $RelativePath
        bytes = $bytes.Length
        sha256 = 'sha256:' + (Get-Sha256 $path)
        encoding = 'utf-8-no-bom'
        line_endings = 'lf-only'
        final_lf_count = 1
        provenance = $provenance
    }
}

function Assert-ResultIdentity([pscustomobject]$Result) {
    if ($Result.schema_version -cne '1.0' -or
        $Result.task_id -cne $ExpectedTask -or
        $Result.assignment_id -cne $ExpectedAssignment -or
        $Result.idempotency_key -cne $ExpectedIdempotency -or
        $Result.authority_snapshot_digest -cne $ExpectedAuthorityDigest -or
        $Result.provider -cne 'Claude') {
        throw 'Structured result identity mismatch.'
    }
    $allowedStatuses = @('SUCCEEDED', 'FAILED', 'CANCELLED', 'OWNER_DECISION_REQUIRED', 'REVISION_REQUIRED')
    if (-not $allowedStatuses.Contains([string]$Result.status)) { throw 'Structured result terminal status mismatch.' }
    $correlationProperties = @($Result.correlation.PSObject.Properties.Name | Sort-Object)
    $expectedCorrelationProperties = @('correlation_id', 'github_issue', 'github_pull_request', 'slack_thread_ts', 'source_event_id')
    Assert-OrderedStrings $correlationProperties $expectedCorrelationProperties 'Structured result correlation properties'
    if ($Result.correlation.correlation_id -cne $ExpectedAssignment -or
        $Result.correlation.source_event_id -cne $ExpectedSourceEvent -or
        $null -ne $Result.correlation.slack_thread_ts -or
        $null -ne $Result.correlation.github_issue -or
        $null -ne $Result.correlation.github_pull_request) {
        throw 'Structured result correlation mismatch.'
    }
}

if ($ExpectedControlHead.Length -ne 40) { throw 'Expected control HEAD must be forty lowercase hexadecimal characters.' }
try { [void][Convert]::FromHexString($ExpectedControlHead) }
catch { throw 'Expected control HEAD is not hexadecimal.' }
if ($ExpectedControlHead -cne $ExpectedControlHead.ToLowerInvariant()) { throw 'Expected control HEAD must be lowercase.' }

if (-not (Test-Path -LiteralPath $ClaudeExe -PathType Leaf)) { throw 'Claude executable is unavailable.' }
$PythonExe = (Get-Command python.exe -ErrorAction Stop).Source
if ((Invoke-Git $ControlRoot @('rev-parse', 'HEAD')) -cne $ExpectedControlHead) { throw 'Control HEAD mismatch.' }
if ((Invoke-Git $ControlRoot @('rev-parse', '@{u}')) -cne $ExpectedControlHead) { throw 'Control upstream mismatch.' }
if ((Invoke-Git $ControlRoot @('status', '--porcelain=v1', '--untracked-files=all')) -cne '') { throw 'Control worktree is not clean.' }
$remoteRow = Invoke-Git $ControlRoot @('ls-remote', '--exit-code', 'origin', $ExpectedRemoteRef)
$remoteHead = @($remoteRow.Split([char[]]@("`t", ' '), [StringSplitOptions]::RemoveEmptyEntries))[0]
if ($remoteHead -cne $ExpectedControlHead) { throw 'Remote control ref mismatch.' }

Assert-Sha256 $PacketPath $ExpectedPacketSha256
Assert-Sha256 $PromptPath $ExpectedPromptSha256
$packet = Get-Content -LiteralPath $PacketPath -Raw | ConvertFrom-Json -DateKind String
if ($packet.task_id -cne $ExpectedTask -or $packet.assignment_id -cne $ExpectedAssignment -or
    $packet.idempotency_key -cne $ExpectedIdempotency -or $packet.status -cne 'AUTHORIZED_PENDING_PRIMARY') {
    throw 'Packet identity or status mismatch.'
}
Assert-OrderedStrings @($packet.transport.environment_allowlist | ForEach-Object { [string]$_ }) $ExpectedEnvironmentNames 'Packet provider environment allowlist'
Assert-OrderedStrings @($packet.closed_output_inventory | ForEach-Object { [string]$_ }) $ExpectedOutputPaths 'Packet closed output inventory'
Assert-ProviderAuthority $packet
if ((Invoke-Git $ProviderRoot @('status', '--porcelain=v1', '--untracked-files=all')) -cne '') { throw 'Provider sandbox is not clean.' }
if (Test-Path -LiteralPath (Join-Path $ProviderRoot 'LongTableRobotDealer')) { throw 'Provider output root already exists; refusing ambiguous duplicate dispatch.' }
foreach ($resultPath in @(
    $OutputPath, $ErrorPath, $StructuredResultPath, $SourceManifestPath,
    $ReceiptPath, $ClaimPath, $LaunchIdentityPath, $ResumePath
)) {
    if (Test-Path -LiteralPath $resultPath) { throw 'Sequence 28 result evidence already exists; refusing ambiguous duplicate dispatch.' }
}

$version = (& $ClaudeExe --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $version -notlike '2.1.251*') { throw "Claude version mismatch: $version" }
$pythonProbe = (& $PythonExe -c 'import jsonschema; print("READY")' 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $pythonProbe -cne 'READY') { throw 'Local JSON Schema validator is unavailable.' }

if ($PreflightOnly) {
    Write-Output 'sequence-28 preflight: PASS'
    exit 0
}

$schemaObject = Get-Content -LiteralPath $SchemaPath -Raw | ConvertFrom-Json -DateKind String
$schemaObject.PSObject.Properties.Remove('$schema')
$schemaObject.PSObject.Properties.Remove('$id')
$resultSchema = $schemaObject | ConvertTo-Json -Depth 100 -Compress
$packetText = Get-Content -LiteralPath $PacketPath -Raw
$workOrder = Get-Content -LiteralPath $PromptPath -Raw
$prompt = "EXACT_IMMUTABLE_PACKET_BEGIN`n$packetText`nEXACT_IMMUTABLE_PACKET_END`nEXACT_WORK_ORDER_BEGIN`n$workOrder`nEXACT_WORK_ORDER_END"
$system = 'Act only as the bounded Sequence 28 clean-room RobotDealer source writer. Use only the current sandbox, the three immutable public authority files, and the exact packet/work order. Do not use memory, prior conversation, browser, network, MCP, subagent, Bash, unrelated path, external effect, private context, or hidden state. Create exactly the eight authorized source files, leave Git and authority files unchanged, and return one schema-conforming terminal object with provider exactly Claude and every correlation property from the packet.'
$allowedTools = 'Read,Write,Edit,Glob'
$args = @(
    '--print',
    '--model', 'claude-fable-5',
    '--effort', 'high',
    '--restricted',
    '--safe-mode',
    '--no-chrome',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
    '--disable-slash-commands',
    '--permission-mode', 'dontAsk',
    '--system-prompt', $system,
    '--tools', $allowedTools,
    '--allowedTools', $allowedTools,
    '--disallowedTools', 'Bash,PowerShell,WebFetch,WebSearch,Task,NotebookEdit',
    '--json-schema', $resultSchema,
    '--output-format', 'json',
    '--prompt-suggestions', 'false'
)

$claimCreatedAt = [DateTimeOffset]::UtcNow
$claim = [ordered]@{
    schema_version = '1.0'
    state = 'CREATED'
    task_id = $ExpectedTask
    assignment_id = $ExpectedAssignment
    idempotency_key = $ExpectedIdempotency
    primary_attempt = 1
    control_head = $ExpectedControlHead
    provider_base_head = $ExpectedProviderHead
    provider_base_tree = $ExpectedProviderTree
    authority_snapshot_digest = $ExpectedAuthorityDigest
    packet_sha256 = 'sha256:' + $ExpectedPacketSha256
    prompt_sha256 = 'sha256:' + $ExpectedPromptSha256
    created_at = $claimCreatedAt.ToString('o')
}
Write-NewUtf8 $ClaimPath (($claim | ConvertTo-Json -Depth 10) + "`n")
$claimSha256 = 'sha256:' + (Get-Sha256 $ClaimPath)

$startedAt = $claimCreatedAt
$completedAt = $claimCreatedAt
$providerPid = $null
$timedOut = $false
$exitCode = -1
$stdout = ''
$stderr = ''
$launchFailure = $null
$jobHandle = [IntPtr]::Zero
$launchContext = $null
$nativeProcess = $null
$stdoutTask = $null
$stderrTask = $null
try {
    $jobHandle = New-KillOnCloseJob
    $launchContext = New-NativeLaunchContext -FilePath $ClaudeExe -Arguments $args -WorkingDirectory $ProviderRoot -JobHandle $jobHandle
    $nativeProcess = Start-SuspendedJobBoundProcess -Context $launchContext -JobHandle $jobHandle
    $providerPid = $nativeProcess.process_id
    $startedAt = [DateTimeOffset]::Parse($nativeProcess.started_at, [Globalization.CultureInfo]::InvariantCulture)
    $launchIdentity = [ordered]@{
        schema_version = '1.0'
        state = 'SUSPENDED_JOB_BOUND'
        assignment_id = $ExpectedAssignment
        idempotency_key = $ExpectedIdempotency
        claim_sha256 = $claimSha256
        process_id = $providerPid
        process_start_time_utc_ticks = $nativeProcess.start_time_utc_ticks
        started_at = $nativeProcess.started_at
        job_bound_before_resume = $nativeProcess.job_bound_before_resume
        recorded_at = ([DateTimeOffset]::UtcNow).ToString('o')
    }
    Write-NewUtf8 $LaunchIdentityPath (($launchIdentity | ConvertTo-Json -Depth 10) + "`n")

    $stdoutTask = $launchContext.stdout_reader.ReadToEndAsync()
    $stderrTask = $launchContext.stderr_reader.ReadToEndAsync()
    Resume-NativeProcess $launchContext
    $resume = [ordered]@{
        schema_version = '1.0'
        state = 'RESUMED'
        assignment_id = $ExpectedAssignment
        idempotency_key = $ExpectedIdempotency
        claim_sha256 = $claimSha256
        process_identity_sha256 = 'sha256:' + (Get-Sha256 $LaunchIdentityPath)
        process_id = $providerPid
        resumed_at = ([DateTimeOffset]::UtcNow).ToString('o')
    }
    Write-NewUtf8 $ResumePath (($resume | ConvertTo-Json -Depth 10) + "`n")

    $launchContext.stdin_writer.Write($prompt)
    $launchContext.stdin_writer.Flush()
    $launchContext.stdin_writer.Dispose()
    $launchContext.stdin_writer = $null

    $timedOut = -not $nativeProcess.process.WaitForExit($TimeoutMilliseconds)
    if ($timedOut) {
        if (-not [LongTable.Sequence28NativeMethods]::TerminateJobObject($jobHandle, [uint32]::MaxValue)) {
            throw (Get-NativeError 'TerminateJobObject(timeout)')
        }
        if (-not $nativeProcess.process.WaitForExit(10000)) { throw 'Provider did not exit within ten seconds of job termination.' }
    }
    $exitCode = $nativeProcess.process.ExitCode
    $jobDeadline = [DateTimeOffset]::UtcNow.AddSeconds(10)
    while ((Get-JobActiveProcessCount $jobHandle) -ne 0 -and [DateTimeOffset]::UtcNow -lt $jobDeadline) {
        Start-Sleep -Milliseconds 25
    }
    if ((Get-JobActiveProcessCount $jobHandle) -ne 0) {
        [void][LongTable.Sequence28NativeMethods]::TerminateJobObject($jobHandle, [uint32]::MaxValue)
        throw 'Provider job retained a process after the main process exited.'
    }
}
catch {
    $launchFailure = $_.Exception.Message
    if ($jobHandle -ne [IntPtr]::Zero) {
        try { [void][LongTable.Sequence28NativeMethods]::TerminateJobObject($jobHandle, [uint32]::MaxValue) } catch { }
    }
}
finally {
    if ($null -ne $stdoutTask) { try { $stdout = $stdoutTask.GetAwaiter().GetResult() } catch { if ($null -eq $launchFailure) { $launchFailure = $_.Exception.Message } } }
    if ($null -ne $stderrTask) { try { $stderr = $stderrTask.GetAwaiter().GetResult() } catch { if ($null -eq $launchFailure) { $launchFailure = $_.Exception.Message } } }
    $completedAt = [DateTimeOffset]::UtcNow
    Close-NativeLaunchContext $launchContext
    if ($null -ne $nativeProcess -and $null -ne $nativeProcess.process) { $nativeProcess.process.Dispose() }
    if ($jobHandle -ne [IntPtr]::Zero) { Close-NativeHandle $jobHandle }
}

[IO.File]::WriteAllText($OutputPath, $stdout, $Utf8NoBom)
[IO.File]::WriteAllText($ErrorPath, $stderr, $Utf8NoBom)

$terminalStatus = $null
$structuredJson = $null
$validationStatus = 'FAILED'
$postflightStatus = 'NOT_RUN'
$failure = $null
try {
    if ($null -ne $launchFailure) { throw "Claude Sequence 28 launch/isolation failure: $launchFailure" }
    if ($timedOut) { throw 'Claude Sequence 28 timed out; evidence frozen without resend.' }
    if ($exitCode -ne 0) { throw "Claude Sequence 28 exited $exitCode; evidence frozen without resend." }

    $wrapper = $stdout | ConvertFrom-Json -DateKind String
    if ($wrapper.type -cne 'result' -or $wrapper.subtype -cne 'success' -or
        $wrapper.is_error -isnot [bool] -or $wrapper.is_error -ne $false -or
        $null -eq $wrapper.structured_output -or $wrapper.result -isnot [string]) {
        throw 'Claude wrapper is not one successful structured result.'
    }

    $pythonValidation = @'
import json
import sys
from jsonschema import Draft202012Validator

def unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError(f"duplicate JSON property: {key}")
        value[key] = item
    return value

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    schema = json.load(handle, object_pairs_hook=unique_object)
with open(sys.argv[2], "r", encoding="utf-8") as handle:
    wrapper = json.load(handle, object_pairs_hook=unique_object)
structured = wrapper.get("structured_output")
result_text = wrapper.get("result")
if not isinstance(structured, dict) or not isinstance(result_text, str):
    raise ValueError("wrapper result shape mismatch")
result = json.loads(result_text, object_pairs_hook=unique_object)
Draft202012Validator.check_schema(schema)
Draft202012Validator(schema).validate(structured)
Draft202012Validator(schema).validate(result)
if structured != result:
    raise ValueError("wrapper result and structured_output differ")
print(json.dumps(structured, ensure_ascii=False, indent=2))
'@
    $validationOutput = & $PythonExe -c $pythonValidation $SchemaPath $OutputPath 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Structured result schema/equality validation failed: $($validationOutput -join [Environment]::NewLine)" }
    $structuredJson = ($validationOutput -join "`n").TrimEnd() + "`n"
    [IO.File]::WriteAllText($StructuredResultPath, $structuredJson, $Utf8NoBom)
    $result = $structuredJson | ConvertFrom-Json -DateKind String
    Assert-ResultIdentity $result
    $terminalStatus = [string]$result.status
    $validationStatus = 'PASS'

    Assert-ProviderAuthority $packet
    if ((Invoke-Git $ProviderRoot @('diff', '--name-only')) -cne '' -or
        (Invoke-Git $ProviderRoot @('diff', '--cached', '--name-only')) -cne '') {
        throw 'Provider changed tracked authority or staged content.'
    }
    $allowedTopLevel = @('.git', 'PUBLIC_CONTRACT.json', 'PUBLIC_FIXTURES.json', 'RESULT_SCHEMA.json', 'LongTableRobotDealer')
    $unexpectedTopLevel = @(Get-ChildItem -LiteralPath $ProviderRoot -Force | Where-Object { $_.Name -notin $allowedTopLevel })
    if ($unexpectedTopLevel.Count -ne 0) { throw 'Provider created an unauthorized top-level path.' }

    $actualOutputPaths = @(Get-OutputInventory)
    $unexpectedOutputs = @($actualOutputPaths | Where-Object { $_ -notin $ExpectedOutputPaths })
    if ($unexpectedOutputs.Count -ne 0) { throw 'Provider created an output outside the closed eight-file inventory.' }
    if ($terminalStatus -ceq 'SUCCEEDED') {
        Assert-OrderedStrings $actualOutputPaths (@($ExpectedOutputPaths | Sort-Object)) 'Successful provider output inventory'
    }

    $expectedStatusLines = @($actualOutputPaths | ForEach-Object { "?? $_" } | Sort-Object)
    $actualStatusLines = @((Invoke-Git $ProviderRoot @('status', '--porcelain=v1', '--untracked-files=all')) -split "`n" | Where-Object { $_ -cne '' } | Sort-Object)
    Assert-OrderedStrings $actualStatusLines $expectedStatusLines 'Provider Git status'

    $manifestEntries = @($actualOutputPaths | ForEach-Object { Get-ValidatedSourceManifestEntry $_ })
    $manifest = [ordered]@{
        schema_version = '1.0'
        task_id = $ExpectedTask
        assignment_id = $ExpectedAssignment
        idempotency_key = $ExpectedIdempotency
        authority_snapshot_digest = $ExpectedAuthorityDigest
        provider_base_head = $ExpectedProviderHead
        provider_base_tree = $ExpectedProviderTree
        terminal_status = $terminalStatus
        complete_inventory = ($actualOutputPaths.Count -eq $ExpectedOutputPaths.Count)
        files = $manifestEntries
    }
    [IO.File]::WriteAllText($SourceManifestPath, ($manifest | ConvertTo-Json -Depth 20) + "`n", $Utf8NoBom)
    $postflightStatus = 'PASS'
}
catch {
    $failure = $_.Exception.Message
}

$receipt = [ordered]@{
    schema_version = '1.0'
    assignment_id = $ExpectedAssignment
    idempotency_key = $ExpectedIdempotency
    control_head = $ExpectedControlHead
    provider_base_head = $ExpectedProviderHead
    provider_base_tree = $ExpectedProviderTree
    authority_snapshot_digest = $ExpectedAuthorityDigest
    provider_executable = $ClaudeExe
    provider_version = $version
    model_requested = 'claude-fable-5'
    effort_requested = 'high'
    restricted_mode = true
    provider_environment_allowlist = $ExpectedEnvironmentNames
    primary_claim_status = 'CONSUMED_PRIMARY'
    primary_claim_sha256 = $claimSha256
    process_identity_status = if (Test-Path -LiteralPath $LaunchIdentityPath) { 'RECORDED_SUSPENDED_JOB_BOUND' } else { 'NOT_REACHED' }
    process_identity_sha256 = if (Test-Path -LiteralPath $LaunchIdentityPath) { 'sha256:' + (Get-Sha256 $LaunchIdentityPath) } else { $null }
    process_resume_status = if (Test-Path -LiteralPath $ResumePath) { 'RECORDED_RESUMED' } else { 'NOT_REACHED' }
    process_resume_sha256 = if (Test-Path -LiteralPath $ResumePath) { 'sha256:' + (Get-Sha256 $ResumePath) } else { $null }
    kill_on_close_job = true
    process_id = $providerPid
    started_at = $startedAt.ToString('o')
    completed_at = $completedAt.ToString('o')
    timed_out = $timedOut
    exit_code = $exitCode
    stdout_bytes = ([Text.Encoding]::UTF8.GetByteCount($stdout))
    stdout_sha256 = 'sha256:' + (Get-Sha256 $OutputPath)
    stderr_bytes = ([Text.Encoding]::UTF8.GetByteCount($stderr))
    stderr_sha256 = 'sha256:' + (Get-Sha256 $ErrorPath)
    terminal_status = $terminalStatus
    structured_result_validation = $validationStatus
    structured_result_sha256 = if (Test-Path -LiteralPath $StructuredResultPath) { 'sha256:' + (Get-Sha256 $StructuredResultPath) } else { $null }
    source_postflight = $postflightStatus
    source_manifest_sha256 = if (Test-Path -LiteralPath $SourceManifestPath) { 'sha256:' + (Get-Sha256 $SourceManifestPath) } else { $null }
    failure = $failure
    primary_attempts = 1
    recovery_attempts = 0
    revisions = 0
}
[IO.File]::WriteAllText($ReceiptPath, ($receipt | ConvertTo-Json -Depth 20) + "`n", $Utf8NoBom)

if ($null -ne $failure) { throw $failure }
Write-Output $structuredJson.TrimEnd()
# [[OpenAI Director | Codex | 2026-08-31 | SEQUENCE 28 | END]]
