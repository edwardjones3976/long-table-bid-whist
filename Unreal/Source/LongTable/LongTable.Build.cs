// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
using System;
using UnrealBuildTool;

/// <summary>
/// Primary game module and composition root. Carries the deterministic build
/// identity: LONGTABLE_BUILD_SHA is injected from the environment by
/// scripts/native/build-unreal.ps1 and CI; a build without one says so plainly.
/// </summary>
public class LongTable : ModuleRules
{
	public LongTable(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"Json",
			"LongTableProtocol",
			"LongTableTable"
		});

		string BuildSha = Environment.GetEnvironmentVariable("LONGTABLE_BUILD_SHA");
		if (string.IsNullOrWhiteSpace(BuildSha))
		{
			BuildSha = "local-development";
		}
		PublicDefinitions.Add("LONGTABLE_BUILD_SHA=\"" + BuildSha.Trim() + "\"");
	}
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
