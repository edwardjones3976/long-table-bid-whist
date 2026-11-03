// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableBuildIdentity.h"
#include "LongTableVocabulary.h"

namespace
{
	const TCHAR* const LocalDevelopmentBuild = TEXT("local-development");
	constexpr int32 ShortShaLength = 7;
}

FString ULongTableBuildIdentity::GetBuildSha()
{
	const FString Sha = FString(TEXT(LONGTABLE_BUILD_SHA)).TrimStartAndEnd();
	return Sha.IsEmpty() ? FString(LocalDevelopmentBuild) : Sha;
}

FString ULongTableBuildIdentity::GetBuildShortSha()
{
	const FString Sha = GetBuildSha();
	if (Sha == LocalDevelopmentBuild)
	{
		return Sha;
	}
	return Sha.Len() > ShortShaLength ? Sha.Left(ShortShaLength) : Sha;
}

bool ULongTableBuildIdentity::IsLocalDevelopmentBuild()
{
	return GetBuildSha() == LocalDevelopmentBuild;
}

FString ULongTableBuildIdentity::GetBuildLabel()
{
	return FString::Printf(TEXT("Build %s"), *GetBuildShortSha());
}

FString ULongTableBuildIdentity::GetManifestId()
{
	return FString(LongTableProtocol::ManifestId);
}

FString ULongTableBuildIdentity::GetProtocolVersion()
{
	return FString(LongTableProtocol::ProtocolVersion);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
