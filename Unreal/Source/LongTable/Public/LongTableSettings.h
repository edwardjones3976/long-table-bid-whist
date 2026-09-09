// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "LongTableSettings.generated.h"

/** Project settings for the authority connection. Stored in DefaultGame.ini. */
UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "The Long Table"))
class LONGTABLE_API ULongTableSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	ULongTableSettings();

	virtual FName GetCategoryName() const override { return TEXT("Game"); }

	/** WebSocket URL of the TypeScript table authority. Loopback by default; no external endpoint is assumed. */
	UPROPERTY(Config, EditAnywhere, Category = "Authority")
	FString AuthorityUrl;

	/** Table joined by the development harness. */
	UPROPERTY(Config, EditAnywhere, Category = "Authority")
	FString DefaultTableId;

	UPROPERTY(Config, EditAnywhere, Category = "Authority", meta = (ClampMin = "1.0", ClampMax = "60.0"))
	float ConnectTimeoutSeconds;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
