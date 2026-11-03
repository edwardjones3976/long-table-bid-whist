// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "LongTableGameMode.generated.h"

/**
 * Minimal game mode. The table is not a networked Unreal game: the
 * authoritative state lives in the TypeScript service, so this mode hosts
 * presentation only and never replicates play.
 */
UCLASS()
class LONGTABLE_API ALongTableGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ALongTableGameMode();
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
