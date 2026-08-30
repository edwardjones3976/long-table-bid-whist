// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Robot dealer presenter.
 *
 * The robot is a presenter only. This component receives allowlisted dealer
 * cue frames and hands each one to Blueprint choreography. It holds no
 * projection, no hand, no legality and no score: LongTable.Composition
 * verifies by reflection that no such member exists on this class.
 */
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "LongTableProjections.h"
#include "LongTableRobotDealerPresenter.generated.h"

class ULongTableAuthorityClient;

UCLASS(ClassGroup = (LongTable), meta = (BlueprintSpawnableComponent))
class LONGTABLE_API ULongTableRobotDealerPresenter : public UActorComponent
{
	GENERATED_BODY()

public:
	ULongTableRobotDealerPresenter();

	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

	/** Blueprint choreography for one cue: animation curves, voice-free gesture, spatial audio placeholder. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Long Table|Dealer")
	void PresentCue(const FLongTableDealerCueFrame& Frame);

	/** Presents a cue frame. Bound to the authority client; also usable directly. */
	UFUNCTION(BlueprintCallable, Category = "Long Table|Dealer")
	void ReceiveCue(const FLongTableDealerCueFrame& Frame);

	UPROPERTY(BlueprintReadOnly, Category = "Long Table|Dealer")
	bool bHasLastCue = false;

	UPROPERTY(BlueprintReadOnly, Category = "Long Table|Dealer")
	FLongTableDealerCueFrame LastCue;

	UPROPERTY(BlueprintReadOnly, Category = "Long Table|Dealer")
	int32 CuesPresented = 0;

private:
	UFUNCTION()
	void HandleDealerCue(const FLongTableDealerCueFrame& Frame);

	TWeakObjectPtr<ULongTableAuthorityClient> BoundClient;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
