// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// Game target for The Long Table.
//
// Location note: the assignment packet lists Unreal/LongTable.Target.cs, but
// UnrealBuildTool only discovers target rules beneath <Project>/Source and
// only classifies a project as code-based when a *.Target.cs sits directly in
// that folder (Engine/Source/Programs/UnrealBuildTool/System/RulesCompiler.cs).
// The engine-required location is used; the packet path is not buildable.

using UnrealBuildTool;

public class LongTableTarget : TargetRules
{
	public LongTableTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.V6;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_7;
		ExtraModuleNames.AddRange(new string[] { "LongTableProtocol", "LongTableTable", "LongTable" });
	}
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
