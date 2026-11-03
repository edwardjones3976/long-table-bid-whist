// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Composition root. Owns nothing that adjudicates a rule: it wires the table
 * subsystem (authority connection) to project settings and exposes the
 * Blueprint entry points the presentation layers build on.
 */
#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "LongTableVocabulary.h"
#include "LongTableGameInstance.generated.h"

class ULongTableTableSubsystem;

UCLASS()
class LONGTABLE_API ULongTableGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	virtual void Init() override;

	UFUNCTION(BlueprintPure, Category = "Long Table")
	ULongTableTableSubsystem* GetTable() const;

	/** Joins the configured authority with a participant credential. */
	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void JoinTable(const FString& Token, ELongTableRole Role, const FString& TableId, const FString& DisplayName);

	UFUNCTION(BlueprintPure, Category = "Long Table")
	FString GetAuthorityUrl() const;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
