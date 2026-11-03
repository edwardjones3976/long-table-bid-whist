// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
using UnrealBuildTool;

/// <summary>
/// Table runtime: authority connection, intent identity, commit state machine,
/// projection application. Presentation stays in Blueprint on top of the
/// subsystem; rule adjudication never happens here.
/// </summary>
public class LongTableTable : ModuleRules
{
	public LongTableTable(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"Json",
			"WebSockets",
			"LongTableProtocol"
		});
	}
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
