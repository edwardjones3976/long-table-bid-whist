// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableRobotDealerPresenter.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "LongTableAuthorityClient.h"
#include "LongTableTableSubsystem.h"

ULongTableRobotDealerPresenter::ULongTableRobotDealerPresenter()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void ULongTableRobotDealerPresenter::BeginPlay()
{
	Super::BeginPlay();
	const UWorld* World = GetWorld();
	const UGameInstance* GameInstance = World ? World->GetGameInstance() : nullptr;
	ULongTableTableSubsystem* Table = GameInstance ? GameInstance->GetSubsystem<ULongTableTableSubsystem>() : nullptr;
	ULongTableAuthorityClient* Client = Table ? Table->GetClient() : nullptr;
	if (Client)
	{
		Client->OnDealerCue.AddDynamic(this, &ULongTableRobotDealerPresenter::HandleDealerCue);
		BoundClient = Client;
	}
}

void ULongTableRobotDealerPresenter::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (ULongTableAuthorityClient* Client = BoundClient.Get())
	{
		Client->OnDealerCue.RemoveDynamic(this, &ULongTableRobotDealerPresenter::HandleDealerCue);
	}
	BoundClient.Reset();
	Super::EndPlay(EndPlayReason);
}

void ULongTableRobotDealerPresenter::HandleDealerCue(const FLongTableDealerCueFrame& Frame)
{
	ReceiveCue(Frame);
}

void ULongTableRobotDealerPresenter::ReceiveCue(const FLongTableDealerCueFrame& Frame)
{
	LastCue = Frame;
	bHasLastCue = true;
	++CuesPresented;
	PresentCue(Frame);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
