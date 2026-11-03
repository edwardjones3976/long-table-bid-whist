// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
using UnrealBuildTool;

/// <summary>
/// Closed protocol types and the fail-closed JSON codec. Mirrors
/// packages/protocol exactly; no gameplay, no networking, no presentation.
/// </summary>
public class LongTableProtocol : ModuleRules
{
	public LongTableProtocol(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Json"
		});
	}
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
