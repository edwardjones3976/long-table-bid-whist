// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Deterministic build identity. LONGTABLE_BUILD_SHA is injected by
 * LongTable.Build.cs from the environment; a build without one reports
 * `local-development` rather than inventing a commit.
 */
#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "LongTableBuildIdentity.generated.h"

#ifndef LONGTABLE_BUILD_SHA
#define LONGTABLE_BUILD_SHA "local-development"
#endif

UCLASS()
class LONGTABLE_API ULongTableBuildIdentity : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** Full injected commit sha, or `local-development`. */
	UFUNCTION(BlueprintPure, Category = "Long Table|Build")
	static FString GetBuildSha();

	/** Seven-character sha for display, or `local-development`. */
	UFUNCTION(BlueprintPure, Category = "Long Table|Build")
	static FString GetBuildShortSha();

	UFUNCTION(BlueprintPure, Category = "Long Table|Build")
	static bool IsLocalDevelopmentBuild();

	UFUNCTION(BlueprintPure, Category = "Long Table|Build")
	static FString GetBuildLabel();

	UFUNCTION(BlueprintPure, Category = "Long Table|Build")
	static FString GetManifestId();

	UFUNCTION(BlueprintPure, Category = "Long Table|Build")
	static FString GetProtocolVersion();
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
